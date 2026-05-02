/**
 * Bzzt — automated screen recorder + video stitcher
 *
 * 1. Starts the Next.js dev server
 * 2. Uses Playwright to navigate the app in sync with each audio section
 * 3. Records video via Playwright (webm per section)
 * 4. Uses ffmpeg to combine each video + audio section
 * 5. Concatenates all sections into final bzzt-demo.mp4
 *
 * Run: node scripts/record-and-stitch.mjs
 * Requires: ffmpeg in PATH (brew install ffmpeg)
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR  = path.join(__dirname, 'audio');
const VIDEO_DIR  = path.join(__dirname, 'video');
const OUTPUT_DIR = path.join(__dirname, 'output');
const APP_URL    = 'http://localhost:3000';

for (const d of [VIDEO_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Each section: how long to record (seconds) + what to do in the browser
const SECTIONS = [
  {
    id: '01_problem',
    duration: 32,
    async run(page) {
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      // Slow scroll down the landing page
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(8000);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(8000);
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(8000);
    },
  },
  {
    id: '02_solution',
    duration: 30,
    async run(page) {
      // Stay on landing, highlight enrollment widget
      await page.waitForTimeout(5000);
      await page.mouse.move(640, 500);
      await page.waitForTimeout(5000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(10000);
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(5000);
    },
  },
  {
    id: '03_demo_map',
    duration: 35,
    async run(page) {
      await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(12000); // wait for map + scan to load
      // Click a HIGH-risk city alert button if visible
      const alertBtn = page.locator('button:has-text("⚡")').first();
      if (await alertBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await alertBtn.click();
        await page.waitForTimeout(4000);
      }
      // Switch to Alerts tab
      const alertsTab = page.locator('button[role="tab"]:has-text("Alerts")').first();
      if (await alertsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await alertsTab.click();
        await page.waitForTimeout(8000);
      }
    },
  },
  {
    id: '04_demo_intelligence',
    duration: 38,
    async run(page) {
      // Switch to Intelligence tab
      const intelTab = page.locator('button[role="tab"]:has-text("Intelligence")').first();
      if (await intelTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await intelTab.click();
      }
      await page.waitForTimeout(6000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(5000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(5000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(5000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(8000);
    },
  },
  {
    id: '05_openmetadata',
    duration: 42,
    async run(page) {
      await page.mouse.wheel(0, -2000);
      await page.waitForTimeout(3000);
      // Switch back to map tab
      const mapTab = page.locator('button[role="tab"]:has-text("Live Map")').first();
      if (await mapTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await mapTab.click();
        await page.waitForTimeout(2000);
      }
      // Switch to Lineage sub-tab
      const lineageTab = page.locator('button[role="tab"]:has-text("Lineage")').first();
      if (await lineageTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lineageTab.click();
        await page.waitForTimeout(6000);
      }
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(6000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(6000);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(8000);
    },
  },
  {
    id: '06_close',
    duration: 27,
    async run(page) {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(8000);
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(10000);
    },
  },
];

function getAudioDuration(file) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
      { encoding: 'utf8' }
    ).trim();
    return parseFloat(out);
  } catch {
    return null;
  }
}

async function recordSection(page, section, context) {
  console.log(`\n[${section.id}] Recording ${section.duration}s...`);
  // Playwright records video for the whole context; we snapshot per section via timing
  const start = Date.now();
  await section.run(page);
  const elapsed = (Date.now() - start) / 1000;
  // If section finished early, wait out the remainder
  const remaining = section.duration - elapsed;
  if (remaining > 0) await page.waitForTimeout(remaining * 1000);
  console.log(`  ✓ Done (${section.duration}s)`);
}

async function main() {
  // Verify ffmpeg
  try { execSync('which ffmpeg', { stdio: 'ignore' }); }
  catch { console.error('ffmpeg not found. Run: brew install ffmpeg'); process.exit(1); }

  // Verify audio files
  for (const s of SECTIONS) {
    const f = path.join(AUDIO_DIR, `${s.id}.mp3`);
    if (!fs.existsSync(f)) { console.error(`Missing audio: ${f}`); process.exit(1); }
    // Use actual audio duration if available
    const dur = getAudioDuration(f);
    if (dur) { s.duration = Math.ceil(dur) + 1; }
  }

  // Kill anything already on port 3000 so we get bzzt, not some other project
  try { execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' }); } catch { /* nothing running */ }
  await new Promise(r => setTimeout(r, 1000));

  console.log('Starting Bzzt dev server on port 3000...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'), // ensure we start bzzt, not another project
    stdio: 'ignore',
    detached: false,
  });

  // Wait until port 3000 is actually accepting connections
  console.log('Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      execSync('curl -s -o /dev/null http://localhost:3000', { stdio: 'ignore' });
      console.log('Server ready.');
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const browser = await chromium.launch({ headless: false }); // headless:false so it's visible
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  // Record all sections back-to-back in one video
  console.log('\nRecording all sections...');
  const sectionStartTimes = [];
  let elapsed = 0;
  for (const section of SECTIONS) {
    sectionStartTimes.push(elapsed);
    await recordSection(page, section, context);
    elapsed += section.duration;
  }

  console.log('\nClosing browser and saving video...');
  await page.close();
  await context.close();
  await browser.close();
  server.kill();

  // Find the recorded webm
  const webmFiles = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
  if (webmFiles.length === 0) { console.error('No video recorded.'); process.exit(1); }
  const fullVideo = path.join(VIDEO_DIR, webmFiles[webmFiles.length - 1]);
  console.log(`\nVideo: ${fullVideo}`);

  // Combine audio sections with video sections using ffmpeg
  console.log('\nStitching sections with ffmpeg...');
  const segmentPaths = [];

  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];
    const startTime = sectionStartTimes[i];
    const audioDur  = getAudioDuration(path.join(AUDIO_DIR, `${section.id}.mp3`)) || section.duration;
    const segVideo  = path.join(OUTPUT_DIR, `seg_${section.id}.mp4`);
    const segFinal  = path.join(OUTPUT_DIR, `final_${section.id}.mp4`);

    // Trim the video to this section's window
    execSync(
      `ffmpeg -y -ss ${startTime} -t ${audioDur} -i "${fullVideo}" ` +
      `-vf "scale=1280:800" -c:v libx264 -preset fast -crf 18 "${segVideo}"`,
      { stdio: 'inherit' }
    );

    // Combine with audio
    execSync(
      `ffmpeg -y -i "${segVideo}" -i "${path.join(AUDIO_DIR, `${section.id}.mp3`)}" ` +
      `-c:v copy -c:a aac -shortest "${segFinal}"`,
      { stdio: 'inherit' }
    );

    segmentPaths.push(segFinal);
    console.log(`  ✓ Segment ${section.id}`);
  }

  // Concatenate all segments
  const concatList = path.join(OUTPUT_DIR, 'concat.txt');
  fs.writeFileSync(concatList, segmentPaths.map(p => `file '${p}'`).join('\n'));
  const finalOutput = path.join(OUTPUT_DIR, 'bzzt-demo.mp4');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${finalOutput}"`,
    { stdio: 'inherit' }
  );

  console.log(`\n✓ Final video: ${finalOutput}`);
  console.log('Upload to YouTube → paste the link into your submission.\n');

  // Cleanup temp files
  segmentPaths.forEach(f => fs.unlinkSync(f));
  webmFiles.forEach(f => fs.unlinkSync(path.join(VIDEO_DIR, f)));
}

main().catch(err => { console.error(err); process.exit(1); });
