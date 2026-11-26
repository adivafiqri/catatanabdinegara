import Link from "next/link";

export function Band({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="band">
      <div className="wrap">
        <div className="topbar">
          <Link className="brand" href="/">
            Catatan Abdi Negara
          </Link>
          <div className="row small">{right}</div>
        </div>
        {children}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap stack" style={{ gap: 6 }}>
        <span>
          Akun pribadi edukasi, bukan kanal resmi instansi mana pun. Soal latihan dibuat sendiri;
          tidak ada jaminan lulus.
        </span>
        <span>
          <Link href="/privasi">Kebijakan privasi</Link> · Info resmi pendaftaran: sscasn.bkn.go.id
        </span>
      </div>
    </footer>
  );
}

const WIB = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export const fmtWib = (d: Date) => `${WIB.format(d).replace(/\./g, ".")} WIB`;
export const fmtDur = (s: number) => `${Math.floor(s / 60)} menit ${s % 60} detik`;
