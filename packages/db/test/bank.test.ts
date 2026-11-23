import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { DEFAULT_SUB_TOPICS, contextFromTopics, importCsv, type Question } from "@can/shared";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import {
  BankError,
  BankRepo,
  questions,
  ruleSets,
  schema,
  webMigrationsFolder,
  type Db,
} from "../src/index.js";

const template = readFileSync(
  new URL("../../../docs/templat/templat-soal.csv", import.meta.url),
  "utf8",
);
const sample = (): Question[] =>
  importCsv(template, contextFromTopics(DEFAULT_SUB_TOPICS)).questions;
const ADMIN = "00000000-0000-4000-8000-000000000001";

async function setup() {
  const pg = new PGlite();
  await migrate(drizzle(pg), {
    migrationsFolder: webMigrationsFolder,
    migrationsSchema: "drizzle",
  });
  const db = drizzle(pg, { schema }) as unknown as Db;
  const bank = new BankRepo(db);
  await bank.seedReferenceData();
  return { pg, db, bank };
}

describe("BankRepo", () => {
  it("seed idempoten: aturan SKD 110 soal tersimpan sekali", async () => {
    const { db, bank } = await setup();
    await bank.seedReferenceData();
    const rs = await db.select().from(ruleSets);
    expect(rs).toHaveLength(1);
    expect(rs[0]!.durationMinutes).toBe(100);
  });

  it("impor baru → draft, isi kembali utuh (round-trip)", async () => {
    const { bank } = await setup();
    const res = await bank.importQuestions(sample(), ADMIN);
    expect(res).toEqual({ created: 3, updated: 0, unchanged: 0 });
    const tkp = await bank.getByCode("TKP-PLY-0001");
    expect(tkp!.status).toBe("draft");
    const { id: _id, status: _s, version: _v, updatedAt: _u, ...plain } = tkp!;
    expect(plain).toEqual(sample()[2]);
  });

  it("impor ulang tanpa perubahan dilewati; perubahan menaikkan versi & menyimpan riwayat", async () => {
    const { bank } = await setup();
    await bank.importQuestions(sample(), ADMIN);
    expect(await bank.importQuestions(sample(), ADMIN)).toEqual({
      created: 0,
      updated: 0,
      unchanged: 3,
    });

    await bank.setStatus("TIU-DRT-0001", "review", ADMIN);
    await bank.setStatus("TIU-DRT-0001", "published", ADMIN);
    const changed = sample();
    changed[1]!.explanation = "Pembahasan baru yang lebih jelas.";
    expect(await bank.importQuestions(changed, ADMIN)).toEqual({
      created: 0,
      updated: 1,
      unchanged: 2,
    });
    const q = await bank.getByCode("TIU-DRT-0001");
    expect(q!.version).toBe(2);
    expect(q!.status).toBe("draft");
    const rev = await bank.revisions("TIU-DRT-0001");
    expect(rev).toHaveLength(1);
    expect((rev[0]!.snapshot as { explanation: string; status: string }).status).toBe("published");
  });

  it("impor dengan soal tidak valid ditolak seluruhnya (all-or-nothing)", async () => {
    const { db, bank } = await setup();
    const bad = sample();
    bad[2]!.options[0]!.weight = 5; // bobot kembar
    await expect(bank.importQuestions(bad, ADMIN)).rejects.toBeInstanceOf(BankError);
    expect(await db.select().from(questions)).toHaveLength(0);
  });

  it("alur status: draft → review → published; tidak bisa lompat; terbit butuh pembahasan", async () => {
    const { bank } = await setup();
    const qs = sample();
    qs[0]!.explanation = "";
    await bank.importQuestions(qs, ADMIN);
    await expect(bank.setStatus("TWK-PCS-0001", "published", ADMIN)).rejects.toThrow(
      /tidak bisa langsung/,
    );
    await bank.setStatus("TWK-PCS-0001", "review", ADMIN);
    await expect(bank.setStatus("TWK-PCS-0001", "published", ADMIN)).rejects.toThrow(/pembahasan/);
    await bank.setStatus("TIU-DRT-0001", "review", ADMIN);
    await bank.setStatus("TIU-DRT-0001", "published", ADMIN);
    expect((await bank.getByCode("TIU-DRT-0001"))!.status).toBe("published");
    await bank.setStatus("TIU-DRT-0001", "archived", ADMIN);
    await expect(bank.setStatus("TIU-DRT-0001", "published", ADMIN)).rejects.toThrow();
  });

  it("daftar dengan filter, pencarian aman dari wildcard, dan ekspor", async () => {
    const { bank } = await setup();
    await bank.importQuestions(sample(), ADMIN);
    expect((await bank.list({ subtest: "TKP" })).rows.map((r) => r.code)).toEqual(["TKP-PLY-0001"]);
    expect((await bank.list({ subTopic: "tiu-deret-angka" })).total).toBe(1);
    expect((await bank.list({ search: "gotong royong" })).total).toBe(1);
    expect((await bank.list({ search: "%" })).total).toBe(0);
    expect((await bank.list({ limit: 2 })).rows).toHaveLength(2);
    expect((await bank.list({ limit: 2 })).total).toBe(3);
    expect(await bank.exportAll("published")).toHaveLength(0);
    expect(await bank.exportAll()).toHaveLength(3);
  });

  it("batasan DB menolak data rusak walau lewat jalur lain", async () => {
    const { db } = await setup();
    await expect(
      db.insert(questions).values({
        code: "TWK-X-001",
        subtestCode: "TWK",
        subTopicId: 1,
        difficulty: 9,
        stem: "x",
        sourceNote: "x",
      }),
    ).rejects.toThrow();
  });
});
