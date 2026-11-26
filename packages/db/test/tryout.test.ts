import { PGlite } from "@electric-sql/pglite";
import { OPTION_LABELS, type Question } from "@can/shared";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import {
  BankRepo,
  TryoutError,
  TryoutRepo,
  profiles,
  ruleSets,
  schema,
  type Db,
} from "../src/index.js";
import { webMigrationsFolder } from "../src/migrations.js";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const T0 = new Date("2026-12-07T12:00:00Z"); // 19.00 WIB

function synth(): Question[] {
  const mk = (sub: "TWK" | "TIU" | "TKP", topic: string, n: number): Question[] =>
    Array.from({ length: n }, (_, i) => ({
      code: `${sub}-SIN-${String(i + 1).padStart(4, "0")}`,
      subtest: sub,
      subTopic: topic,
      difficulty: 1,
      stem: `Soal ${sub} nomor ${i + 1}`,
      image: null,
      options: OPTION_LABELS.map((label, j) =>
        sub === "TKP"
          ? { label, text: `opsi ${label}`, weight: 5 - j }
          : { label, text: `opsi ${label}`, correct: label === "A" },
      ),
      explanation: "pembahasan",
      quizExplanation: null,
      allowQuiz: false,
      source: "uji",
    }));
  return [
    ...mk("TWK", "twk-pancasila", 30),
    ...mk("TIU", "tiu-deret-angka", 35),
    ...mk("TKP", "tkp-profesionalisme", 45),
  ];
}

async function setup(opts: { publish?: number } = {}) {
  const pg = new PGlite();
  await migrate(drizzle(pg), {
    migrationsFolder: webMigrationsFolder,
    migrationsSchema: "drizzle",
  });
  const db = drizzle(pg, { schema }) as unknown as Db;
  const bank = new BankRepo(db);
  await bank.seedReferenceData();
  const qs = synth();
  await bank.importQuestions(qs, ADMIN);
  const publish = opts.publish ?? qs.length;
  for (const q of qs.slice(0, publish)) {
    await bank.setStatus(q.code, "review", ADMIN);
    await bank.setStatus(q.code, "published", ADMIN);
  }
  let seed = 7;
  const tryout = new TryoutRepo(db, (n) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n);
  const [rs] = await db.select().from(ruleSets);
  for (const [id, nick] of [
    ["u1", "rani"],
    ["u2", "bagas"],
    ["u3", "ayu"],
  ] as const) {
    await db.insert(profiles).values({
      userId: id,
      nickname: nick,
      city: "Kota Malang",
      targetSchool: "STIS",
      birthYear: 2008,
      consentPrivacyVersion: "2026-12",
      consentAt: T0,
      guardianAckAt: T0,
    });
  }
  return { db, bank, tryout, ruleSetId: rs!.id, qs };
}

async function withEvent() {
  const s = await setup();
  const pkg = await s.tryout.createPackageFromPublished({
    slug: "skd-1",
    name: "SKD #1",
    ruleSetId: s.ruleSetId,
  });
  const ev = await s.tryout.createEvent({
    slug: "perdana",
    name: "Tryout Perdana",
    packageId: pkg.id,
    startsAt: T0,
    joinWindowMinutes: 30,
  });
  return { ...s, pkg, ev };
}

const at = (min: number) => new Date(T0.getTime() + min * 60_000);

describe("paket & event", () => {
  it("paket menolak bila soal terbit kurang dari kuota", async () => {
    const s = await setup({ publish: 100 });
    await expect(
      s.tryout.createPackageFromPublished({ slug: "x", name: "x", ruleSetId: s.ruleSetId }),
    ).rejects.toThrow(/TKP terbit baru 35 dari 45/);
  });
  it("event serentak: selesai = mulai + 100 menit", async () => {
    const { ev } = await withEvent();
    expect(ev.endsAt.toISOString()).toBe(at(100).toISOString());
    expect(ev.joinUntil.toISOString()).toBe(at(30).toISOString());
  });
});

describe("attempt", () => {
  it("belum dibuka / sudah ditutup", async () => {
    const { tryout } = await withEvent();
    await expect(tryout.start("u1", "perdana", at(-1))).rejects.toMatchObject({
      code: "not_open_yet",
    });
    await expect(tryout.start("u1", "perdana", at(31))).rejects.toMatchObject({
      code: "join_closed",
    });
  });

  it("satu peserta satu attempt; mulai ulang mengembalikan yang sama", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(0));
    const b = await tryout.start("u1", "perdana", at(5));
    expect(b.id).toBe(a.id);
  });

  it("tampilan ujian TIDAK memuat kunci/bobot/pembahasan; urutan per subtes; opsi diacak", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(0));
    const v = await tryout.view(a.id, "u1", at(1));
    expect(v.questions).toHaveLength(110);
    expect(v.questions.map((q) => q.subtest).join("")).toBe(
      "TWK".repeat(30) + "TIU".repeat(35) + "TKP".repeat(45),
    );
    const json = JSON.stringify(v);
    for (const banned of ["correct", "isCorrect", "weight", "explanation", "pembahasan"])
      expect(json).not.toContain(banned);
    const firstLabels = v.questions
      .slice(0, 20)
      .map((q) => q.options.findIndex((o) => o.text === "opsi A"));
    expect(new Set(firstLabels).size).toBeGreaterThan(1);
  });

  it("peserta lain tidak bisa membuka attempt milik orang lain", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(0));
    await expect(tryout.view(a.id, "u2", at(1))).rejects.toMatchObject({
      code: "attempt_not_found",
    });
    await expect(tryout.save(a.id, "u2", {}, at(1))).rejects.toMatchObject({
      code: "attempt_not_found",
    });
  });

  it("menjawab semua benar → 550; simpan bertahap tidak saling menimpa", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(0));
    const v = await tryout.view(a.id, "u1", at(1));
    const best = (q: (typeof v.questions)[number]) =>
      q.options.find((o) => o.text === "opsi A")!.label;
    const half = Math.floor(v.questions.length / 2);
    await tryout.save(
      a.id,
      "u1",
      Object.fromEntries(v.questions.slice(0, half).map((q) => [q.id, { o: best(q), f: false }])),
      at(40),
    );
    await tryout.save(
      a.id,
      "u1",
      Object.fromEntries(
        v.questions.slice(half).map((q) => [q.id, { o: best(q), f: q.no % 7 === 0 }]),
      ),
      at(60),
    );
    const done = await tryout.submit(a.id, "u1", at(70));
    expect([done.scoreTwk, done.scoreTiu, done.scoreTkp, done.scoreTotal]).toEqual([
      150, 175, 225, 550,
    ]);
    expect(done.durationSeconds).toBe(70 * 60);
    expect(done.flagStatus).toBe("none");
  });

  it("jawaban tidak valid ditolak", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(0));
    const v = await tryout.view(a.id, "u1", at(1));
    await expect(
      tryout.save(a.id, "u1", { "bukan-soal": { o: "A", f: false } }, at(2)),
    ).rejects.toMatchObject({ code: "invalid_answer" });
    await expect(
      tryout.save(a.id, "u1", { [v.questions[0]!.id]: { o: "Z", f: false } }, at(2)),
    ).rejects.toMatchObject({ code: "invalid_answer" });
  });

  it("lewat batas waktu: simpan ditolak & otomatis dikumpulkan dengan jawaban terakhir", async () => {
    const { tryout } = await withEvent();
    const a = await tryout.start("u1", "perdana", at(10)); // masuk telat 10 menit → tetap selesai 20.40
    expect(a.deadlineAt.toISOString()).toBe(at(100).toISOString());
    const v = await tryout.view(a.id, "u1", at(11));
    const q = v.questions[0]!;
    await tryout.save(
      a.id,
      "u1",
      { [q.id]: { o: q.options.find((o) => o.text === "opsi A")!.label, f: false } },
      at(50),
    );
    await expect(tryout.save(a.id, "u1", {}, at(101))).rejects.toMatchObject({
      code: "deadline_passed",
    });
    const r = await tryout.result(a.id, "u1");
    expect(r.attempt.status).toBe("expired_submitted");
    expect(r.attempt.scoreTotal).toBe(5);
  });

  it("finalizeExpired mengumpulkan attempt yang ditinggal", async () => {
    const { tryout } = await withEvent();
    await tryout.start("u2", "perdana", at(0));
    expect(await tryout.finalizeExpired(at(99))).toBe(0);
    expect(await tryout.finalizeExpired(at(102))).toBe(1);
  });

  it("selesai sangat cepat ditandai janggal dan tidak masuk peringkat", async () => {
    const { tryout, ev } = await withEvent();
    const a = await tryout.start("u3", "perdana", at(0));
    const v = await tryout.view(a.id, "u3", at(1));
    await tryout.save(
      a.id,
      "u3",
      Object.fromEntries(
        v.questions.map((q) => [
          q.id,
          { o: q.options.find((o) => o.text === "opsi A")!.label, f: false },
        ]),
      ),
      at(3),
    );
    const done = await tryout.submit(a.id, "u3", at(4));
    expect(done.flagReasons).toEqual(["too_fast"]);
    expect(await tryout.leaderboard(ev.id)).toHaveLength(0);
  });

  it("pembahasan baru terbuka setelah event selesai; peringkat urut skor lalu waktu", async () => {
    const { tryout, ev } = await withEvent();
    const play = async (u: string, correct: number, finish: number) => {
      const a = await tryout.start(u, "perdana", at(0));
      const v = await tryout.view(a.id, u, at(1));
      await tryout.save(
        a.id,
        u,
        Object.fromEntries(
          v.questions
            .slice(0, correct)
            .map((q) => [q.id, { o: q.options.find((o) => o.text === "opsi A")!.label, f: false }]),
        ),
        at(finish - 1),
      );
      return tryout.submit(a.id, u, at(finish));
    };
    const r1 = await play("u1", 60, 90);
    await play("u2", 60, 80);
    await expect(tryout.review(r1.id, "u1", at(95))).rejects.toMatchObject({
      code: "results_not_ready",
    });
    const rev = await tryout.review(r1.id, "u1", at(101));
    expect(rev[0]!.options.some((o) => o.correct)).toBe(true);
    expect(rev[0]!.explanation).toBe("pembahasan");
    const lb = await tryout.leaderboard(ev.id);
    expect(lb.map((r) => r.nickname)).toEqual(["bagas", "rani"]);
    expect(Object.keys(lb[0]!)).not.toContain("email");
  });
});

it("TryoutError punya kode", () => {
  expect(new TryoutError("join_closed", "x").code).toBe("join_closed");
});
