export type ReadingRow = {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string | null;
  notes: string | null;
  source: string;
  confidence: number | null;
  extracted_json: unknown;
  image_base64: string | null;
  created_at: string;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

export function buildDashboard(readings: ReadingRow[]) {
  const sorted = [...readings].sort((a, b) => {
    const aTime = new Date(a.measured_at ?? a.created_at).getTime();
    const bTime = new Date(b.measured_at ?? b.created_at).getTime();
    return aTime - bTime;
  });

  const latest = [...sorted].at(-1) ?? null;
  const now = Date.now();
  const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;

  const inRange = (days: number) =>
    readings.filter((item) => new Date(item.measured_at ?? item.created_at).getTime() >= daysAgo(days));

  const past7 = inRange(7);
  const past30 = inRange(30);

  return {
    latest,
    averages: {
      systolic7d: average(past7.map((r) => r.systolic)),
      diastolic7d: average(past7.map((r) => r.diastolic)),
      systolic30d: average(past30.map((r) => r.systolic)),
      diastolic30d: average(past30.map((r) => r.diastolic)),
    },
    chart: sorted.map((row) => ({
      id: row.id,
      at: row.measured_at ?? row.created_at,
      systolic: row.systolic,
      diastolic: row.diastolic,
      pulse: row.pulse,
    })),
    recent: [...sorted].reverse().slice(0, 20),
  };
}
