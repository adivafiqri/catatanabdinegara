import { CronExpressionParser } from "cron-parser";

export const TZ = "Asia/Jakarta";

/** Waktu jalan berikutnya (UTC Date) untuk ekspresi cron yang dibaca dalam WIB. */
export function nextRun(cron: string, after: Date): Date {
  return CronExpressionParser.parse(cron, { currentDate: after, tz: TZ }).next().toDate();
}

const DAYS: Record<string, number> = {
  minggu: 0,
  ahad: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  "jum'at": 5,
  sabtu: 6,
};

/**
 * Mengubah format ramah moderator menjadi cron.
 * "19:00 harian" -> "0 19 * * *"; "07:30 senin,kamis" -> "30 7 * * 1,4".
 * Mengembalikan null jika format salah.
 */
export function friendlyToCron(time: string, days: string): string | null {
  const m = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(time.trim());
  if (!m) return null;
  const [h, mi] = [Number(m[1]), Number(m[2])];
  const d = days.trim().toLowerCase();
  if (d === "harian" || d === "setiap-hari" || d === "tiaphari") return `${mi} ${h} * * *`;
  const parts = d.split(",").map((x) => x.trim());
  const nums = parts.map((p) => DAYS[p]);
  if (nums.length === 0 || nums.some((n) => n === undefined)) return null;
  return `${mi} ${h} * * ${[...new Set(nums)].sort().join(",")}`;
}

/** Penjelasan cron dalam bahasa Indonesia untuk daftar posting. */
export function describeCron(cron: string): string {
  const [mi, h, , , dow] = cron.split(" ");
  const time = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} WIB`;
  if (dow === "*") return `setiap hari ${time}`;
  const names = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const list = (dow ?? "")
    .split(",")
    .map((n) => names[Number(n)] ?? n)
    .join(", ");
  return `${list} ${time}`;
}

export function formatWib(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
