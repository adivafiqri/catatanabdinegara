import Link from "next/link";
import { logout } from "@/app/akun/actions";
import { startExam } from "@/app/ujian/actions";
import { Band, Footer, fmtWib } from "@/components/Site";
import { currentEvent, phase } from "@/lib/events";
import { getProfile, getSession } from "@/lib/session";
import { attempts } from "@can/db";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const INFO: Record<string, string> = {
  not_open_yet: "Ruang ujian belum dibuka. Datang lagi tepat pukul mulai, ya.",
  join_closed: "Waktu masuk ruang ujian sudah ditutup (maksimal 30 menit setelah mulai).",
  event_not_found: "Event tidak ditemukan.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ info?: string }> }) {
  const { info } = await searchParams;
  const s = await getSession();
  const profile = s ? await getProfile(s.user.id) : undefined;
  const ev = await currentEvent();
  const ph = ev ? phase(ev) : undefined;
  const mine =
    s && ev
      ? (
          await db
            .select()
            .from(attempts)
            .where(and(eq(attempts.userId, s.user.id), eq(attempts.eventId, ev.id)))
        )[0]
      : undefined;

  return (
    <>
      <Band
        right={
          s ? (
            <>
              <span>Hai, {profile?.nickname ?? "peserta"}</span>
              <form action={logout}>
                <button className="btn sm">Keluar</button>
              </form>
            </>
          ) : (
            <>
              <Link className="btn sm" href="/masuk">
                Masuk
              </Link>
              <Link className="btn sm main" href="/daftar">
                Daftar
              </Link>
            </>
          )
        }
      >
        <div
          className="row"
          style={{
            alignItems: "end",
            justifyContent: "space-between",
            marginTop: 18,
            flexWrap: "nowrap",
          }}
        >
          <div>
            <h1 className="display">Tryout SKD gratis, rasanya mirip CAT</h1>
            <p className="hand">110 soal · 100 menit · skor langsung keluar</p>
          </div>
          <img
            src="/img/pet-hormat.svg"
            alt="Maskot memberi hormat"
            width={130}
            height={137}
            style={{ marginBottom: -26, flex: "none" }}
          />
        </div>
      </Band>

      <main className="wrap stack">
        {info && INFO[info] && <p className="notice">{INFO[info]}</p>}
        {!ev && (
          <div className="card stack">
            <h2 className="h2">Belum ada jadwal tryout</h2>
            <p className="muted">Jadwal berikutnya diumumkan di grup Telegram.</p>
          </div>
        )}
        {ev && (
          <div className="sticker stack" style={{ position: "relative" }}>
            {ph === "upcoming" && (
              <span className="stamp" style={{ position: "absolute", right: 12, top: -16 }}>
                Segera
              </span>
            )}
            {(ph === "open" || ph === "running") && (
              <span className="stamp" style={{ position: "absolute", right: 12, top: -16 }}>
                Berlangsung
              </span>
            )}
            <h2 className="h2">{ev.name}</h2>
            <p style={{ margin: 0 }}>
              Mulai serentak <b>{fmtWib(ev.startsAt)}</b>. Ruang ujian bisa dimasuki sampai 30 menit
              setelah mulai, dan semua peserta selesai pukul{" "}
              {new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
              }).format(ev.endsAt)}{" "}
              WIB.
            </p>
            {!s && (
              <Link className="btn main block" href="/daftar">
                Daftar dulu (gratis)
              </Link>
            )}
            {s && !profile && (
              <Link className="btn main block" href="/lengkapi">
                Lengkapi profil
              </Link>
            )}
            {s && profile && mine && mine.status === "in_progress" && (
              <Link className="btn main block" href={`/ujian/${mine.id}`}>
                Lanjutkan ujian
              </Link>
            )}
            {s && profile && mine && mine.status !== "in_progress" && (
              <Link className="btn main block" href={`/hasil/${mine.id}`}>
                Lihat hasilmu
              </Link>
            )}
            {s && profile && !mine && ph === "upcoming" && (
              <p className="notice" style={{ margin: 0 }}>
                Kamu sudah terdaftar. Tombol &quot;Masuk ruang ujian&quot; aktif tepat pukul mulai.
                Siapkan kuota & baterai, ya.
              </p>
            )}
            {s && profile && !mine && ph === "open" && (
              <form action={startExam}>
                <input type="hidden" name="event" value={ev.slug} />
                <button className="btn main block">Masuk ruang ujian</button>
              </form>
            )}
            {s && profile && !mine && (ph === "running" || ph === "finished") && (
              <p className="muted" style={{ margin: 0 }}>
                Waktu masuk ruang ujian sudah ditutup.
              </p>
            )}
            {ph === "finished" && (
              <Link className="btn block" href={`/peringkat/${ev.slug}`}>
                Lihat papan peringkat
              </Link>
            )}
          </div>
        )}

        <div className="card stack">
          <h2 className="h2">Isi tryout</h2>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip">TWK 30 soal</span>
            <span className="chip">TIU 35 soal</span>
            <span className="chip">TKP 45 soal</span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Penilaian: TWK & TIU benar 5, salah/kosong 0; TKP bernilai 1–5 per jawaban. Pembahasan
            dan peringkat lengkap dibuka setelah tryout selesai.
          </p>
        </div>
        <div className="notice">
          <b>Hati-hati penipuan.</b> Admin tidak pernah meminta transfer atau kode OTP lewat chat
          pribadi.
        </div>
        <a className="btn block" href="https://t.me/+BRtzn97ymwdmMjQ1" rel="noopener">
          Gabung grup Telegram
        </a>
      </main>
      <Footer />
    </>
  );
}
