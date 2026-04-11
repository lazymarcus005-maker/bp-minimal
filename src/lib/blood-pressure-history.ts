export type BloodPressureHistoryReading = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string | null;
  created_at: string;
  notes: string | null;
};

export type BloodPressureHistoryStats = {
  count: number;
  averageSystolic: number | null;
  averageDiastolic: number | null;
  highestSystolic: number | null;
  lowestSystolic: number | null;
  highestDiastolic: number | null;
  lowestDiastolic: number | null;
  normalCount: number;
  elevatedCount: number;
  highCount: number;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function getSortTime(reading: BloodPressureHistoryReading) {
  return new Date(reading.measured_at ?? reading.created_at).getTime();
}

function classifyReading(reading: BloodPressureHistoryReading) {
  if (reading.systolic >= 140 || reading.diastolic >= 90) {
    return 'high';
  }

  if (reading.systolic >= 120 || reading.diastolic >= 80) {
    return 'elevated';
  }

  return 'normal';
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

export function sortBloodPressureHistory(readings: BloodPressureHistoryReading[]) {
  return [...readings].sort((left, right) => getSortTime(right) - getSortTime(left));
}

export function analyzeBloodPressureHistory(readings: BloodPressureHistoryReading[]): BloodPressureHistoryStats {
  const sorted = sortBloodPressureHistory(readings);

  return {
    count: sorted.length,
    averageSystolic: average(sorted.map((reading) => reading.systolic)),
    averageDiastolic: average(sorted.map((reading) => reading.diastolic)),
    highestSystolic: sorted.length > 0 ? Math.max(...sorted.map((reading) => reading.systolic)) : null,
    lowestSystolic: sorted.length > 0 ? Math.min(...sorted.map((reading) => reading.systolic)) : null,
    highestDiastolic: sorted.length > 0 ? Math.max(...sorted.map((reading) => reading.diastolic)) : null,
    lowestDiastolic: sorted.length > 0 ? Math.min(...sorted.map((reading) => reading.diastolic)) : null,
    normalCount: sorted.filter((reading) => classifyReading(reading) === 'normal').length,
    elevatedCount: sorted.filter((reading) => classifyReading(reading) === 'elevated').length,
    highCount: sorted.filter((reading) => classifyReading(reading) === 'high').length,
  };
}

export function buildBloodPressureHistoryLines(readings: BloodPressureHistoryReading[]) {
  const sorted = sortBloodPressureHistory(readings);

  return sorted.map((reading, index) => {
    const pulseText = reading.pulse === null ? '' : ` | ชีพจร ${reading.pulse}`;
    const notesText = reading.notes ? ` | ${reading.notes}` : '';

    return `${index + 1}. ${formatDateTime(reading.measured_at ?? reading.created_at)} | ${reading.systolic}/${reading.diastolic} mmHg${pulseText}${notesText}`;
  });
}

export function buildBloodPressureFallbackSummary(stats: BloodPressureHistoryStats) {
  if (stats.count === 0) {
    return 'ยังไม่มีประวัติการวัดความดันในระบบ';
  }

  const parts = [
    `ค่าเฉลี่ยอยู่ที่ประมาณ ${stats.averageSystolic ?? '-'} / ${stats.averageDiastolic ?? '-'} mmHg`,
    `พบค่าระดับสูง ${stats.highCount} ครั้ง`,
    `อยู่ในช่วงเริ่มสูง ${stats.elevatedCount} ครั้ง`,
    `อยู่ในช่วงปกติ ${stats.normalCount} ครั้ง`,
  ];

  return `ภาพรวมจากข้อมูลล่าสุด: ${parts.join(' และ ')}. หากค่าระดับสูงเกิดซ้ำบ่อย ควรติดตามต่อเนื่องและปรึกษาแพทย์`;
}