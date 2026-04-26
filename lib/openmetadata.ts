/**
 * OpenMetadata integration — data catalog, lineage, and quality for Bzzt.
 *
 * Entities created in OM:
 *   PipelineService  "bzzt-pipeline-service"
 *   Pipeline         "bzzt-risk-scorer"  (with pipelineStatus per run)
 *   Topic/Table      "climate-inputs"    (source)
 *   Topic/Table      "disease-risk-scores" (output)
 *   Lineage          climate-inputs → bzzt-risk-scorer → disease-risk-scores
 *   TestSuite        per-run data quality checks
 *
 * Gracefully degrades when OPENMETADATA_HOST / OPENMETADATA_TOKEN are not set.
 */

const OM_HOST  = (process.env.OPENMETADATA_HOST  || '').replace(/\/$/, '');
const OM_TOKEN = process.env.OPENMETADATA_TOKEN || '';
const PIPELINE_FQN = 'bzzt-pipeline-service.bzzt-risk-scorer';

export interface LineageEvent {
  id: string;
  cityId: string;   // was erroneously named "pincode" — fixed
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
  alertSent: boolean;
  alertRecipients: number;
  qualityChecks: Array<{ name: string; passed: boolean; value: number | string }>;
  omSynced: boolean;
}

const lineageLog: LineageEvent[] = [];

export function getLineageLog(): LineageEvent[] {
  return [...lineageLog].slice(0, 30);
}

// ─── OM REST helpers ──────────────────────────────────────────────────────────

async function omFetch(path: string, method: string, body?: object): Promise<boolean> {
  if (!OM_HOST || !OM_TOKEN) return false;
  try {
    const res = await fetch(`${OM_HOST}/api/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${OM_TOKEN}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) console.warn(`[OM] ${method} ${path} → ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn('[OM] request failed:', err);
    return false;
  }
}

// ─── One-time bootstrap — register catalog entities ──────────────────────────

let bootstrapped = false;

async function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // ── Data source services ─────────────────────────────────────────────────
  await omFetch('/services/databaseServices', 'PUT', {
    name: 'open-meteo-api',
    displayName: 'Open-Meteo Climate API',
    description: 'Free weather forecast API providing historical and forecast climate data. No API key required. Used as primary climate signal source for Bzzt risk scoring.',
    serviceType: 'CustomDatabase',
    connection: { config: { type: 'CustomDatabase', sourcePythonClass: 'open_meteo' } },
  });

  await omFetch('/services/databaseServices', 'PUT', {
    name: 'who-gho-api',
    displayName: 'WHO Global Health Observatory',
    description: 'WHO GHO OData API providing historical dengue and malaria case surveillance data by country. Used to validate climate-based risk signals against observed outbreak patterns.',
    serviceType: 'CustomDatabase',
    connection: { config: { type: 'CustomDatabase', sourcePythonClass: 'who_gho' } },
  });

  await omFetch('/services/databaseServices', 'PUT', {
    name: 'population-estimates',
    displayName: 'UN Population Estimates',
    description: 'UN World Urbanization Prospects 2024 metro area population figures. Used to compute people-at-risk counts from risk scores.',
    serviceType: 'CustomDatabase',
    connection: { config: { type: 'CustomDatabase', sourcePythonClass: 'population' } },
  });

  // ── Table entities (data assets) ─────────────────────────────────────────
  await omFetch('/tables', 'PUT', {
    name: 'climate_observations',
    displayName: 'Climate Observations',
    description: 'Daily climate observations from Open-Meteo. Each row is a (lat, lng, date) triple with temperature, rainfall, and humidity readings.',
    service: { fullyQualifiedName: 'open-meteo-api' },
    databaseSchema: { fullyQualifiedName: 'open-meteo-api.open_meteo' },
    columns: [
      { name: 'latitude',                  dataType: 'FLOAT',  description: 'Location latitude' },
      { name: 'longitude',                 dataType: 'FLOAT',  description: 'Location longitude' },
      { name: 'date',                      dataType: 'DATE',   description: 'Observation date' },
      { name: 'temperature_2m_max',        dataType: 'FLOAT',  description: 'Daily max temperature at 2m (°C)' },
      { name: 'precipitation_sum',         dataType: 'FLOAT',  description: 'Daily precipitation total (mm)' },
      { name: 'relative_humidity_2m_max',  dataType: 'FLOAT',  description: 'Daily max relative humidity at 2m (%)' },
    ],
    tags: [{ tagFQN: 'PII.None' }],
  });

  await omFetch('/tables', 'PUT', {
    name: 'disease_surveillance',
    displayName: 'WHO Disease Surveillance',
    description: 'Annual dengue case counts and malaria incidence rates by country from WHO GHO. Used as historical baseline to contextualise climate-based risk signals.',
    service: { fullyQualifiedName: 'who-gho-api' },
    databaseSchema: { fullyQualifiedName: 'who-gho-api.who_gho' },
    columns: [
      { name: 'country_iso3',        dataType: 'STRING',  description: 'ISO 3166-1 alpha-3 country code' },
      { name: 'year',                dataType: 'INT',     description: 'Reporting year' },
      { name: 'dengue_cases',        dataType: 'INT',     description: 'Reported dengue fever cases (DENGUE_0000000001)' },
      { name: 'malaria_incidence',   dataType: 'FLOAT',   description: 'Estimated malaria incidence per 1000 population at risk (MALARIA_EST_INCIDENCE)' },
    ],
    tags: [{ tagFQN: 'PII.None' }],
  });

  await omFetch('/tables', 'PUT', {
    name: 'city_population',
    displayName: 'City Population Estimates',
    description: 'UN World Urbanization Prospects 2024 metro area population for monitored cities.',
    service: { fullyQualifiedName: 'population-estimates' },
    databaseSchema: { fullyQualifiedName: 'population-estimates.un_wup' },
    columns: [
      { name: 'city_id',     dataType: 'STRING', description: 'Bzzt internal city slug' },
      { name: 'city_name',   dataType: 'STRING', description: 'City display name' },
      { name: 'country',     dataType: 'STRING', description: 'Country name' },
      { name: 'population_m', dataType: 'FLOAT', description: 'Metro area population (millions)' },
      { name: 'year',        dataType: 'INT',    description: 'Estimate year' },
    ],
    tags: [{ tagFQN: 'PII.None' }],
  });

  await omFetch('/tables', 'PUT', {
    name: 'disease_risk_scores',
    displayName: 'Disease Risk Scores',
    description: 'Output of the Bzzt risk scorer. One row per (city, computation_run). Dengue and malaria risk levels and scores computed from lagged climate observations.',
    service: { fullyQualifiedName: 'bzzt-pipeline-service' },
    databaseSchema: { fullyQualifiedName: 'bzzt-pipeline-service.bzzt_outputs' },
    columns: [
      { name: 'run_id',             dataType: 'STRING',  description: 'Unique computation run ID' },
      { name: 'city_id',            dataType: 'STRING',  description: 'Bzzt city slug' },
      { name: 'city_name',          dataType: 'STRING',  description: 'City display name' },
      { name: 'computed_at',        dataType: 'TIMESTAMP', description: 'Computation timestamp (UTC)' },
      { name: 'dengue_risk_level',  dataType: 'STRING',  description: 'Dengue risk level: HIGH | WATCH | LOW' },
      { name: 'dengue_risk_score',  dataType: 'FLOAT',   description: 'Dengue risk score 0–100' },
      { name: 'malaria_risk_level', dataType: 'STRING',  description: 'Malaria risk level: HIGH | WATCH | LOW' },
      { name: 'malaria_risk_score', dataType: 'FLOAT',   description: 'Malaria risk score 0–100' },
      { name: 'alert_sent',         dataType: 'BOOLEAN', description: 'Whether an alert was dispatched for this run' },
      { name: 'alert_recipients',   dataType: 'INT',     description: 'Number of recipients the alert was sent to' },
    ],
    tags: [{ tagFQN: 'PII.None' }],
  });

  // ── Column-level lineage ──────────────────────────────────────────────────
  // climate_observations → disease_risk_scores
  await omFetch('/lineage', 'PUT', {
    edge: {
      fromEntity: { type: 'table', fullyQualifiedName: 'open-meteo-api.open_meteo.default.climate_observations' },
      toEntity:   { type: 'table', fullyQualifiedName: 'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores' },
      columnLineage: [
        {
          fromColumns: [
            'open-meteo-api.open_meteo.default.climate_observations.temperature_2m_max',
            'open-meteo-api.open_meteo.default.climate_observations.precipitation_sum',
            'open-meteo-api.open_meteo.default.climate_observations.relative_humidity_2m_max',
          ],
          toColumn: 'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores.dengue_risk_score',
          function: 'scoreDengue(temp>26, rain 8–60mm, lagged_rain≥8mm, humidity≥60%)',
        },
        {
          fromColumns: [
            'open-meteo-api.open_meteo.default.climate_observations.temperature_2m_max',
            'open-meteo-api.open_meteo.default.climate_observations.precipitation_sum',
            'open-meteo-api.open_meteo.default.climate_observations.relative_humidity_2m_max',
          ],
          toColumn: 'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores.malaria_risk_score',
          function: 'scoreMalaria(temp>24, rain>25mm, lagged_rain>25mm, humidity>65%)',
        },
      ],
    },
  });

  // disease_surveillance → disease_risk_scores (context enrichment)
  await omFetch('/lineage', 'PUT', {
    edge: {
      fromEntity: { type: 'table', fullyQualifiedName: 'who-gho-api.who_gho.default.disease_surveillance' },
      toEntity:   { type: 'table', fullyQualifiedName: 'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores' },
      description: 'WHO historical baseline used to contextualise risk signals. Not used in scoring computation directly.',
    },
  });

  // city_population → disease_risk_scores (people-at-risk enrichment)
  await omFetch('/lineage', 'PUT', {
    edge: {
      fromEntity: { type: 'table', fullyQualifiedName: 'population-estimates.un_wup.default.city_population' },
      toEntity:   { type: 'table', fullyQualifiedName: 'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores' },
      columnLineage: [
        {
          fromColumns: ['population-estimates.un_wup.default.city_population.population_m'],
          toColumn:    'bzzt-pipeline-service.bzzt_outputs.default.disease_risk_scores.alert_recipients',
          function:    'population × enrollment_rate → estimated_reachable_population',
        },
      ],
    },
  });

  // ── Pipeline service + pipeline entity ───────────────────────────────────
  await omFetch('/services/pipelineServices', 'PUT', {
    name: 'bzzt-pipeline-service',
    displayName: 'Bzzt Climate Risk Pipeline',
    serviceType: 'CustomPipeline',
    connection: { config: { type: 'CustomPipeline' } },
  });

  // 2. Pipeline entity with model metadata
  await omFetch('/pipelines', 'PUT', {
    name: 'bzzt-risk-scorer',
    displayName: 'Mosquito-borne Disease Risk Scorer',
    description: [
      'Scores dengue and malaria risk from Open-Meteo climate observations.',
      '',
      '**Model thresholds (Dengue)**',
      '- Temperature > 26 °C (Aedes aegypti survival range)',
      '- 28-day avg rainfall 8–60 mm (breeding pool formation without washout)',
      '- 14-day lagged rainfall ≥ 8 mm (egg hatching incubation window)',
      '- Humidity ≥ 60 % (adult vector survival)',
      '3+ conditions → HIGH, 2 → WATCH, <2 → LOW',
      '',
      '**Model thresholds (Malaria)**',
      '- Temperature > 24 °C (Anopheles + Plasmodium development)',
      '- 28-day avg rainfall > 25 mm (stagnant pool formation)',
      '- 14-day lagged rainfall > 25 mm (10–12 day Plasmodium incubation)',
      '- Humidity > 65 %',
      '3+ conditions → HIGH, 2 → WATCH, <2 → LOW',
      '',
      'Source: Open-Meteo free API (no key required). Data freshness: 5-minute cache.',
    ].join('\n'),
    service: { fullyQualifiedName: 'bzzt-pipeline-service' },
    sourceUrl: 'https://open-meteo.com/en/docs',
    tags: [{ tagFQN: 'PII.None' }],
  });
}

// ─── Per-run pipeline status (proper OM run history) ─────────────────────────

async function recordPipelineRun(event: LineageEvent): Promise<boolean> {
  const allPassed = event.qualityChecks.every(q => q.passed);
  return omFetch(`/pipelines/${encodeURIComponent(PIPELINE_FQN)}/pipelineStatus`, 'PUT', {
    runId: event.id,
    pipelineState: allPassed ? 'Successful' : 'Failed',
    startDate: new Date(event.computedAt).getTime(),
    timestamp: Date.now(),
    taskStatus: [
      {
        name: 'fetch-climate',
        executionStatus: 'Successful',
        startTime: new Date(event.computedAt).getTime(),
        endTime: Date.now(),
      },
      {
        name: 'score-risk',
        executionStatus: allPassed ? 'Successful' : 'Failed',
        startTime: new Date(event.computedAt).getTime(),
        endTime: Date.now(),
      },
      {
        name: 'send-alert',
        executionStatus: event.alertSent ? 'Successful' : 'Skipped',
        startTime: new Date(event.computedAt).getTime(),
        endTime: Date.now(),
      },
    ],
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function logRiskComputation(
  cityId: string,
  city: string,
  inputs: LineageEvent['inputs'],
  outputs: LineageEvent['outputs'],
  alert?: { sent: boolean; recipients: number },
): Promise<LineageEvent> {
  const qualityChecks = [
    { name: 'temp_in_range',            passed: inputs.avgTemp > -10 && inputs.avgTemp < 55, value: inputs.avgTemp },
    { name: 'humidity_valid',           passed: inputs.avgHumidity >= 0 && inputs.avgHumidity <= 100, value: inputs.avgHumidity },
    { name: 'rainfall_non_negative',    passed: inputs.avgRainfall >= 0, value: inputs.avgRainfall },
    { name: 'lagged_rainfall_positive', passed: inputs.laggedRainfall >= 0, value: inputs.laggedRainfall },
    { name: 'dengue_level_valid',       passed: ['HIGH', 'WATCH', 'LOW'].includes(outputs.dengue), value: outputs.dengue },
    { name: 'malaria_level_valid',      passed: ['HIGH', 'WATCH', 'LOW'].includes(outputs.malaria), value: outputs.malaria },
    { name: 'scores_in_range',          passed: outputs.dengueScore >= 0 && outputs.dengueScore <= 100 && outputs.malariaScore >= 0 && outputs.malariaScore <= 100, value: `${outputs.dengueScore}/${outputs.malariaScore}` },
  ];

  const event: LineageEvent = {
    id: Math.random().toString(36).slice(2, 10),
    cityId,
    city,
    computedAt: new Date().toISOString(),
    inputs,
    outputs,
    alertSent: alert?.sent ?? false,
    alertRecipients: alert?.recipients ?? 0,
    qualityChecks,
    omSynced: false,
  };

  lineageLog.unshift(event);

  await bootstrap();
  const synced = await recordPipelineRun(event);
  event.omSynced = synced;

  const allPassed = qualityChecks.every(c => c.passed);
  console.log(`[OM] ${event.id} | ${city} | D:${outputs.dengue} M:${outputs.malaria} | QC:${allPassed ? 'PASS' : 'FAIL'} | alert:${event.alertSent}(${event.alertRecipients}) | synced:${synced}`);

  return event;
}

export async function markAlertSent(eventId: string, recipients: number): Promise<void> {
  const ev = lineageLog.find(e => e.id === eventId);
  if (!ev) return;
  ev.alertSent = true;
  ev.alertRecipients = recipients;
  await recordPipelineRun(ev); // re-record with alert status
}
