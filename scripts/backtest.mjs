/**
 * Bzzt Historical Backtest
 *
 * For each city, fetches 10 years of historical climate data from Open-Meteo Archive API,
 * runs Bzzt's risk model month by month, then fetches actual WHO disease case data
 * and computes correlation between model predictions and real outbreaks.
 *
 * Run: node scripts/backtest.mjs
 * Output: scripts/backtest-results.json + printed summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Cities to backtest (subset with best WHO data coverage) ─────────────────
const CITIES = [
  { id: 'jakarta',       name: 'Jakarta',          country: 'Indonesia',    iso3: 'IDN', lat: -6.2088,  lng: 106.8456 },
  { id: 'bangkok',       name: 'Bangkok',           country: 'Thailand',     iso3: 'THA', lat: 13.7563,  lng: 100.5018 },
  { id: 'manila',        name: 'Manila',            country: 'Philippines',  iso3: 'PHL', lat: 14.5995,  lng: 120.9842 },
  { id: 'dhaka',         name: 'Dhaka',             country: 'Bangladesh',   iso3: 'BGD', lat: 23.8103,  lng: 90.4125  },
  { id: 'mumbai',        name: 'Mumbai',            country: 'India',        iso3: 'IND', lat: 18.9388,  lng: 72.8354  },
  { id: 'lagos',         name: 'Lagos',             country: 'Nigeria',      iso3: 'NGA', lat: 6.5244,   lng: 3.3792   },
  { id: 'nairobi',       name: 'Nairobi',           country: 'Kenya',        iso3: 'KEN', lat: -1.2921,  lng: 36.8219  },
  { id: 'sao-paulo',     name: 'São Paulo',         country: 'Brazil',       iso3: 'BRA', lat: -23.5505, lng: -46.6333 },
  { id: 'ho-chi-minh',   name: 'Ho Chi Minh City',  country: 'Vietnam',      iso3: 'VNM', lat: 10.8231,  lng: 106.6297 },
  { id: 'karachi',       name: 'Karachi',           country: 'Pakistan',     iso3: 'PAK', lat: 24.8607,  lng: 67.0011  },
];

const START_YEAR = 2014;
const END_YEAR   = 2023; // last full year with WHO data
const WHO_BASE   = 'https://ghoapi.azureedge.net/api';

// ── Risk model (identical to lib/scan/route.ts) ──────────────────────────────
function scoreDengue(temp, rain, laggedRain, humidity) {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met >= 3) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

function scoreMalaria(temp, rain, laggedRain, humidity) {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met >= 3) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

// ── Open-Meteo Archive API ───────────────────────────────────────────────────
async function fetchHistoricalClimate(lat, lng, year) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      dates: data.daily?.time ?? [],
      temps: data.daily?.temperature_2m_max ?? [],
      rains: data.daily?.precipitation_sum ?? [],
      hums:  data.daily?.relative_humidity_2m_max ?? [],
    };
  } catch {
    return null;
  }
}

// ── Monthly risk scores from daily climate data ───────────────────────────────
function computeMonthlyRisk(climate) {
  const months = {};

  climate.dates.forEach((dateStr, i) => {
    const month = dateStr.slice(0, 7); // "YYYY-MM"
    if (!months[month]) months[month] = { temps: [], rains: [], hums: [] };
    if (climate.temps[i] != null) months[month].temps.push(climate.temps[i]);
    if (climate.rains[i] != null) months[month].rains.push(climate.rains[i]);
    if (climate.hums[i]  != null) months[month].hums.push(climate.hums[i]);
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return Object.entries(months).map(([month, d]) => {
    const temp     = avg(d.temps);
    const rain     = avg(d.rains);
    const laggedRain = avg(d.rains.slice(-14)); // last 14 days of month as proxy
    const humidity = avg(d.hums);
    return {
      month,
      temp, rain, laggedRain, humidity,
      dengue:  scoreDengue(temp, rain, laggedRain, humidity),
      malaria: scoreMalaria(temp, rain, laggedRain, humidity),
    };
  });
}

// ── WHO GHO historical data ───────────────────────────────────────────────────
async function fetchWhoAnnual(indicator, iso3) {
  try {
    const url = `${WHO_BASE}/${indicator}?$filter=SpatialDim eq '${iso3}' and TimeDimType eq 'YEAR'&$orderby=TimeDim desc&$top=15`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const result = {};
    for (const row of (data.value || [])) {
      if (row.NumericValue != null) result[row.TimeDim] = row.NumericValue;
    }
    return result;
  } catch {
    return {};
  }
}

// ── Correlation: % HIGH months in model vs actual cases ──────────────────────
function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? null : +(num / den).toFixed(3);
}

// ── Known major outbreak years (for qualitative validation) ──────────────────
// Source: WHO, CDC, published literature
const KNOWN_OUTBREAKS = {
  IDN: { dengue: [2016, 2019, 2022], malaria: [2014, 2015, 2016] },
  THA: { dengue: [2015, 2019, 2022], malaria: [] },
  PHL: { dengue: [2016, 2019, 2022], malaria: [] },
  BGD: { dengue: [2019, 2021, 2023], malaria: [] },
  IND: { dengue: [2015, 2017, 2021], malaria: [2014, 2015, 2016] },
  NGA: { dengue: [],                 malaria: [2014, 2016, 2017, 2018, 2021] },
  KEN: { dengue: [2019, 2022],       malaria: [2015, 2016, 2018, 2021] },
  BRA: { dengue: [2015, 2019, 2022, 2023], malaria: [2016, 2017] },
  VNM: { dengue: [2015, 2017, 2019, 2022], malaria: [] },
  PAK: { dengue: [2017, 2019, 2021, 2022], malaria: [2014, 2015, 2021] },
};

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Bzzt Historical Backtest — ${START_YEAR} to ${END_YEAR}\n`);
  const results = [];

  for (const city of CITIES) {
    console.log(`\n── ${city.name}, ${city.country} ──`);

    // Fetch WHO annual data
    const [dengueByYear, malariaByYear] = await Promise.all([
      fetchWhoAnnual('DENGUE_0000000001', city.iso3),
      fetchWhoAnnual('MALARIA_EST_INCIDENCE', city.iso3),
    ]);

    const yearlyData = [];

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      process.stdout.write(`  ${year}...`);
      const climate = await fetchHistoricalClimate(city.lat, city.lng, year);
      if (!climate) { console.log(' (no climate data)'); continue; }

      const monthly = computeMonthlyRisk(climate);
      const highDenguePct  = monthly.filter(m => m.dengue  === 'HIGH').length / monthly.length;
      const highMalariaPct = monthly.filter(m => m.malaria === 'HIGH').length / monthly.length;
      const watchOrHighDenguePct  = monthly.filter(m => m.dengue  !== 'LOW').length / monthly.length;
      const watchOrHighMalariaPct = monthly.filter(m => m.malaria !== 'LOW').length / monthly.length;

      yearlyData.push({
        year,
        highDenguePct:  +highDenguePct.toFixed(2),
        highMalariaPct: +highMalariaPct.toFixed(2),
        watchOrHighDenguePct:  +watchOrHighDenguePct.toFixed(2),
        watchOrHighMalariaPct: +watchOrHighMalariaPct.toFixed(2),
        actualDengueCases:   dengueByYear[year]  ?? null,
        actualMalariaRate:   malariaByYear[year] ?? null,
        knownDengueOutbreak: KNOWN_OUTBREAKS[city.iso3]?.dengue.includes(year)  ?? false,
        knownMalariaOutbreak:KNOWN_OUTBREAKS[city.iso3]?.malaria.includes(year) ?? false,
        monthly,
      });
      console.log(` D:${(highDenguePct*100).toFixed(0)}%HIGH M:${(highMalariaPct*100).toFixed(0)}%HIGH`);
    }

    // Correlation analysis
    const withDengueCases  = yearlyData.filter(d => d.actualDengueCases  != null);
    const withMalariaRates = yearlyData.filter(d => d.actualMalariaRate  != null);

    const dengueCorr  = pearsonCorrelation(
      withDengueCases.map(d => d.highDenguePct),
      withDengueCases.map(d => d.actualDengueCases),
    );
    const malariaCorr = pearsonCorrelation(
      withMalariaRates.map(d => d.highMalariaPct),
      withMalariaRates.map(d => d.actualMalariaRate),
    );

    // Outbreak detection accuracy
    const outbreakYears = yearlyData.filter(d => d.knownDengueOutbreak);
    const detectedOutbreaks = outbreakYears.filter(d => d.highDenguePct >= 0.25 || d.watchOrHighDenguePct >= 0.5);
    const outbreakDetectionRate = outbreakYears.length
      ? +(detectedOutbreaks.length / outbreakYears.length).toFixed(2)
      : null;

    const cityResult = {
      city: city.name,
      country: city.country,
      iso3: city.iso3,
      yearlyData: yearlyData.map(({ monthly: _, ...rest }) => rest), // exclude monthly detail for summary
      dengueCorrelation: dengueCorr,
      malariaCorrelation: malariaCorr,
      outbreakDetectionRate,
      knownOutbreakYears: KNOWN_OUTBREAKS[city.iso3]?.dengue ?? [],
      detectedOutbreakYears: detectedOutbreaks.map(d => d.year),
    };

    results.push(cityResult);

    console.log(`  → Dengue correlation (model vs WHO cases): ${dengueCorr ?? 'insufficient data'}`);
    console.log(`  → Malaria correlation (model vs WHO rate): ${malariaCorr ?? 'insufficient data'}`);
    if (outbreakDetectionRate !== null) {
      console.log(`  → Outbreak detection rate: ${(outbreakDetectionRate*100).toFixed(0)}% (${detectedOutbreaks.length}/${outbreakYears.length} known outbreaks flagged)`);
    }
  }

  // ── Global summary ────────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════');
  console.log('BACKTEST SUMMARY');
  console.log('══════════════════════════════════════════\n');

  const validDengueCorrs  = results.filter(r => r.dengueCorrelation  != null).map(r => r.dengueCorrelation);
  const validMalariaCorrs = results.filter(r => r.malariaCorrelation != null).map(r => r.malariaCorrelation);
  const avgDengueCorr  = validDengueCorrs.length  ? (validDengueCorrs.reduce((a,b)=>a+b)/validDengueCorrs.length).toFixed(3) : 'N/A';
  const avgMalariaCorr = validMalariaCorrs.length ? (validMalariaCorrs.reduce((a,b)=>a+b)/validMalariaCorrs.length).toFixed(3) : 'N/A';

  const detectionRates = results.filter(r => r.outbreakDetectionRate != null).map(r => r.outbreakDetectionRate);
  const avgDetection = detectionRates.length
    ? ((detectionRates.reduce((a,b)=>a+b)/detectionRates.length)*100).toFixed(0)
    : 'N/A';

  console.log(`Cities analysed:                 ${results.length}`);
  console.log(`Avg dengue correlation (r):      ${avgDengueCorr}`);
  console.log(`Avg malaria correlation (r):     ${avgMalariaCorr}`);
  console.log(`Avg outbreak detection rate:     ${avgDetection}%`);
  console.log('');
  console.log('Per-city breakdown:');
  results.forEach(r => {
    const det = r.outbreakDetectionRate != null ? `${(r.outbreakDetectionRate*100).toFixed(0)}% outbreaks detected` : 'no outbreak data';
    console.log(`  ${r.city.padEnd(22)} D-corr:${String(r.dengueCorrelation ?? 'N/A').padStart(6)}  M-corr:${String(r.malariaCorrelation ?? 'N/A').padStart(6)}  ${det}`);
  });

  console.log('\nInterpretation guide:');
  console.log('  r > 0.6  → strong positive correlation (model tracks real outbreaks)');
  console.log('  r 0.3–0.6 → moderate correlation');
  console.log('  r < 0.3  → weak / model needs refinement for this region');
  console.log('  Outbreak detection >70% → model reliably flags known outbreak years');

  // Save full results
  const outPath = path.join(__dirname, 'backtest-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
