create extension if not exists pgcrypto;

create table if not exists public.blood_pressure_readings (
  id uuid primary key default gen_random_uuid(),
  systolic integer not null check (systolic between 40 and 300),
  diastolic integer not null check (diastolic between 20 and 200),
  pulse integer check (pulse between 20 and 250),
  measured_at timestamptz,
  notes text,
  source text not null default 'image_llm',
  confidence numeric(5,2),
  extracted_json jsonb,
  image_base64 text,
  created_at timestamptz not null default now()
);

create index if not exists idx_blood_pressure_readings_measured_at
  on public.blood_pressure_readings (measured_at desc nulls last);

create index if not exists idx_blood_pressure_readings_created_at
  on public.blood_pressure_readings (created_at desc);
