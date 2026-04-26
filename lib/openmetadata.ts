/**
 * OpenMetadata integration for Bzzt data lineage and catalog.
 * Tracks: Open-Meteo (source) → risk-scorer (pipeline) → disease_risk_scores (output)
 * Falls back gracefully if OM is not configured — app stays fully functional.
 */

const OM_HOST = process.env.OPENMETADATA_HOST || '';
const OM_TOKEN = process.env.OPENMETADATA_TOKEN || '';

export interface LineageEvent {
  id: string;
  pincode: string;
  city: string;
  computedAt: string;
  inputs: {
    source: string;
    lat: number;
    lng: number;
    avgTemp: number;
    avgRainfall: number;
    laggedRainfall: number;
    avgHumidity: number;
  };
  outputs: {
    dengue: string;
    malaria: string;
    dengueScore: number;
    malariaScore: number;
  };
  qualityChecks: Array<{ name: string; passed: boolean; value: number | string }>;
  omSynced: boolean;
}

// In-memory lineage log — shows in dashboard even without real OM
const lineageLog: LineageEvent[] = [];

export function getLineageLog(): LineageEvent[] {
  return [...lineageLog].slice(0, 20);
}

async function omRequest(path: string, method: string, body: object): Promise<boolean> {
  if (!OM_HOST || !OM_TOKEN) return false;
  try {
    const res = await fetch(`${OM_HOST}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${OM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureDataAssets(): Promise<void> {
  // Register Open-Meteo as a pipeline service
  await omRequest('/services/pipelineServices', 'PUT', {
    name: 'bzzt-climate-pipeline',
    displayName: 'Bzzt Climate Risk Pipeline',
    serviceType: 'CustomPipeline',
    connection: { config: { type: 'CustomPipeline' } },
  });

  // Register the risk scorer pipeline
  await omRequest('/pipelines', 'PUT', {
    name: 'bzzt-risk-scorer',
    displayName: 'Mosquito-borne Disease Risk Scorer',
    description: 'Computes dengue and malaria risk from Open-Meteo climate observations. Uses lagged rainfall (14-day window) to account for mosquito breeding incubation.',
    service: { fullyQualifiedName: 'bzzt-climate-pipeline' },
    sourceUrl: 'https://open-meteo.com/en/docs',
    tags: [
      { tagFQN: 'PII.None' },
    ],
  });
}

let assetsEnsured = false;

export async function logRiskComputationToOM(event: LineageEvent): Promise<boolean> {
  if (!assetsEnsured) {
    await ensureDataAssets();
    assetsEnsured = true;
  }

  const ok = await omRequest('/pipelines', 'PATCH', {
    name: 'bzzt-risk-scorer',
    description: `Last run: ${event.computedAt} | ${event.city} (${event.pincode}) | Dengue: ${event.outputs.dengue} | Malaria: ${event.outputs.malaria}`,
  });

  return ok;
}

export async function logRiskComputation(
  pincode: string,
  city: string,
  inputs: LineageEvent['inputs'],
  outputs: LineageEvent['outputs'],
): Promise<LineageEvent> {
  const qualityChecks = [
    { name: 'temp_in_range', passed: inputs.avgTemp > -10 && inputs.avgTemp < 55, value: inputs.avgTemp },
    { name: 'humidity_valid', passed: inputs.avgHumidity >= 0 && inputs.avgHumidity <= 100, value: inputs.avgHumidity },
    { name: 'rainfall_non_negative', passed: inputs.avgRainfall >= 0, value: inputs.avgRainfall },
    { name: 'lagged_rainfall_non_negative', passed: inputs.laggedRainfall >= 0, value: inputs.laggedRainfall },
    { name: 'risk_level_valid', passed: ['HIGH', 'WATCH', 'LOW'].includes(outputs.dengue), value: outputs.dengue },
  ];

  const event: LineageEvent = {
    id: Math.random().toString(36).slice(2, 10),
    pincode,
    city,
    computedAt: new Date().toISOString(),
    inputs,
    outputs,
    qualityChecks,
    omSynced: false,
  };

  // Store locally first — always available
  lineageLog.unshift(event);

  // Try to sync to OpenMetadata
  const synced = await logRiskComputationToOM(event);
  event.omSynced = synced;

  const allPassed = qualityChecks.every((c) => c.passed);
  console.log(
    `[OpenMetadata] ${event.id} | ${city} (${pincode}) | Dengue: ${outputs.dengue} | Malaria: ${outputs.malaria} | QC: ${allPassed ? 'PASS' : 'FAIL'} | OM synced: ${synced}`,
  );

  return event;
}
