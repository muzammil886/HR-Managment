export type CompanySettings = {
  officeStart: string;
  graceMinutes: number;
  halfDayHours: number;
  weekend: string;
  officeLat: number | null;
  officeLng: number | null;
  radiusMeters: number;
};

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function parseHHmm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

export function weekendSet(weekend: string) {
  return new Set(weekend.split(",").map((d) => Number(d.trim())));
}

export function isWeekend(dateISO: string, weekend: string) {
  const d = new Date(`${dateISO}T12:00:00`);
  return weekendSet(weekend).has(d.getDay());
}

export function eachDate(start: string, end: string) {
  const dates: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function workingDates(
  start: string,
  end: string,
  weekend: string,
  holidays: Set<string>,
) {
  return eachDate(start, end).filter((d) => !isWeekend(d, weekend) && !holidays.has(d));
}

export function minutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function officeLimitMinutes(settings: CompanySettings) {
  const { h, m } = parseHHmm(settings.officeStart);
  return h * 60 + m + settings.graceMinutes;
}

export function attendanceStatus(
  checkIn: Date | null,
  checkOut: Date | null,
  settings: CompanySettings,
) {
  if (!checkIn) return "ABSENT";
  if (!checkOut) {
    return minutesFromMidnight(checkIn) > officeLimitMinutes(settings) ? "LATE" : "MISSING_CHECKOUT";
  }
  const hours = (checkOut.getTime() - checkIn.getTime()) / 36e5;
  if (hours < settings.halfDayHours) return "HALF_DAY";
  if (minutesFromMidnight(checkIn) > officeLimitMinutes(settings)) return "LATE";
  return "PRESENT";
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function annualTax(annualGross: number) {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return (annualGross - 600000) * 0.05;
  if (annualGross <= 2400000) return 30000 + (annualGross - 1200000) * 0.15;
  if (annualGross <= 3600000) return 210000 + (annualGross - 2400000) * 0.25;
  return 510000 + (annualGross - 3600000) * 0.35;
}

export function grossFromBasic(basic: number) {
  return basic * 1.5;
}

export function nextCode(last?: string | null) {
  const n = last ? Number(last.replace(/\D/g, "")) + 1 : 1;
  return `EMP${String(n).padStart(3, "0")}`;
}
