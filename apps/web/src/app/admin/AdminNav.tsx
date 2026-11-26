import Link from "next/link";
import { adminLogout } from "./actions";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <>
      <header
        style={{
          background: "var(--brown-d)",
          color: "var(--card)",
          borderBottom: "3px solid var(--ink)",
        }}
      >
        <div
          className="wrap wide row"
          style={{ justifyContent: "space-between", padding: "12px 0" }}
        >
          <nav className="row" style={{ gap: 16 }}>
            <b>Admin CAN</b>
            <Link href="/admin">Ringkasan</Link>
            <Link href="/admin/soal">Bank soal</Link>
            <Link href="/admin/event">Paket & event</Link>
          </nav>
          <form action={adminLogout}>
            <button className="btn sm">Keluar</button>
          </form>
        </div>
      </header>
      <main className="wrap wide stack">
        <h1 className="h2">{title}</h1>
        {children}
      </main>
    </>
  );
}
