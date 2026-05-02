-- Bzzt Database Schema
-- Run once in Supabase SQL Editor: supabase.com → project → SQL Editor → New Query
-- Then click Run.

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Districts ─────────────────────────────────────────────────────────────────
-- Loaded once from GADM. One row per monitored district/province.
create table if not exists districts (
  id          text primary key,           -- e.g. "NGA-Kano"
  country     text not null,
  country_code text not null,             -- ISO 3166-1 alpha-3
  state       text,                       -- admin level 1
  district    text not null,              -- admin level 2 (or level 1 if no level 2)
  lat         float not null,             -- centroid latitude
  lng         float not null,             -- centroid longitude
  population  integer,                    -- WorldPop estimate
  geometry    jsonb,                      -- GeoJSON polygon for choropleth
  created_at  timestamptz default now()
);

-- ── Risk scores ───────────────────────────────────────────────────────────────
-- One row per district per scan. The core time-series table.
create table if not exists risk_scores (
  id              uuid primary key default uuid_generate_v4(),
  district_id     text references districts(id) on delete cascade,
  city_id         text,                   -- legacy city slug (for non-district scans)
  city_name       text not null,
  country         text not null,
  computed_at     timestamptz not null default now(),
  dengue_level    text not null check (dengue_level in ('HIGH','WATCH','LOW')),
  malaria_level   text not null check (malaria_level in ('HIGH','WATCH','LOW')),
  dengue_score    float,
  malaria_score   float,
  population_at_risk integer,
  avg_temp        float,
  avg_rainfall    float,
  lagged_rainfall float,
  avg_humidity    float,
  model_version   text default '1.0',
  lat             float,
  lng             float
);

create index if not exists risk_scores_computed_at on risk_scores (computed_at desc);
create index if not exists risk_scores_district_id on risk_scores (district_id);
create index if not exists risk_scores_city_id     on risk_scores (city_id);

-- ── Enrollments ───────────────────────────────────────────────────────────────
create table if not exists enrollments (
  id          uuid primary key default uuid_generate_v4(),
  phone       text,
  email       text,
  city_id     text,
  city_name   text not null,
  country     text not null,
  lat         float not null,
  lng         float not null,
  whatsapp    boolean default false,
  language    text,
  enrolled_at timestamptz default now(),
  constraint phone_or_email check (phone is not null or email is not null)
);

create index if not exists enrollments_city_id on enrollments (city_id);
create index if not exists enrollments_lat_lng on enrollments (lat, lng);

-- ── Alert logs ────────────────────────────────────────────────────────────────
create table if not exists alert_logs (
  id            text primary key,
  city_id       text,
  city_name     text not null,
  country       text not null,
  message       text not null,
  local_message text,
  language      text,
  recipients    integer default 0,
  channel       text,
  risk_level    text not null check (risk_level in ('HIGH','WATCH','LOW')),
  dengue_level  text,
  malaria_level text,
  sent_at       timestamptz default now()
);

create index if not exists alert_logs_sent_at  on alert_logs (sent_at desc);
create index if not exists alert_logs_city_id  on alert_logs (city_id);

-- ── Prospective predictions ───────────────────────────────────────────────────
-- Every risk computation is logged here for prospective validation.
-- validate_after = computed_at + 5 weeks (mid-point of 4-11 week lead time).
-- After that date, actual case data is checked and validated flag is set.
create table if not exists predictions (
  id              text primary key,
  city_id         text,
  city_name       text not null,
  country         text not null,
  predicted_at    timestamptz not null,
  validate_after  timestamptz not null,
  dengue_level    text not null,
  malaria_level   text not null,
  probability_score integer,
  avg_temp        float,
  avg_rainfall    float,
  lagged_rainfall float,
  avg_humidity    float,
  validated       boolean default false,
  actual_outbreak boolean,
  validated_at    timestamptz
);

create index if not exists predictions_validate_after on predictions (validate_after);
create index if not exists predictions_city_id        on predictions (city_id);

-- ── Community health worker reports ──────────────────────────────────────────
-- Ground truth flywheel: CHW symptom reports feed back into the model.
create table if not exists chw_reports (
  id                  uuid primary key default uuid_generate_v4(),
  reported_at         timestamptz default now(),
  lat                 float not null,
  lng                 float not null,
  district_id         text references districts(id),
  fever_cases         integer default 0,
  suspected_dengue    integer default 0,
  suspected_malaria   integer default 0,
  rdt_positive        integer default 0,
  reporter_phone      text,
  verified            boolean default false
);

create index if not exists chw_reports_reported_at  on chw_reports (reported_at desc);
create index if not exists chw_reports_lat_lng       on chw_reports (lat, lng);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Risk scores and alert logs are public read (needed for dashboard).
-- Enrollments and CHW reports are protected (server role only).

alter table risk_scores  enable row level security;
alter table alert_logs   enable row level security;
alter table enrollments  enable row level security;
alter table predictions  enable row level security;
alter table chw_reports  enable row level security;
alter table districts    enable row level security;

-- Public can read risk scores and alert logs (dashboard data)
create policy "public read risk_scores"
  on risk_scores for select to anon using (true);

create policy "public read alert_logs"
  on alert_logs for select to anon using (true);

create policy "public read districts"
  on districts for select to anon using (true);

create policy "public read predictions"
  on predictions for select to anon using (true);

-- Service role has full access to everything
create policy "service full access risk_scores"
  on risk_scores for all to service_role using (true);

create policy "service full access alert_logs"
  on alert_logs for all to service_role using (true);

create policy "service full access enrollments"
  on enrollments for all to service_role using (true);

create policy "service full access predictions"
  on predictions for all to service_role using (true);

create policy "service full access chw_reports"
  on chw_reports for all to service_role using (true);

create policy "service full access districts"
  on districts for all to service_role using (true);
