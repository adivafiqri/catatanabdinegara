import { Band, Footer } from "@/components/Site";
import { PRIVACY_VERSION } from "@/lib/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kebijakan privasi" };

export default function Page() {
  return (
    <>
      <Band>
        <h1 className="display" style={{ marginTop: 14 }}>
          Kebijakan privasi
        </h1>
        <p className="hand">versi {PRIVACY_VERSION}</p>
      </Band>
      <main className="wrap stack" style={{ maxWidth: 680 }}>
        <div className="card stack">
          <p>
            Situs tryout ini dikelola secara pribadi oleh pemilik akun edukasi Catatan Abdi Negara,
            bukan kanal resmi instansi mana pun. Kami menjaga data pribadimu sesuai Undang-Undang
            Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
          </p>
          <h2 className="h2">Data yang kami kumpulkan</h2>
          <ul>
            <li>
              <b>Email & kata sandi</b> untuk masuk. Kata sandi disimpan dalam bentuk hash, tidak
              bisa dibaca siapa pun.
            </li>
            <li>
              <b>Nama panggilan & kota/kabupaten</b>: tampil di papan peringkat.
            </li>
            <li>
              <b>Sekolah tujuan</b> (opsional), untuk filter peringkat.
            </li>
            <li>
              <b>Tahun lahir</b> (bukan tanggal lahir), untuk mengetahui perlu tidaknya izin orang
              tua/wali.
            </li>
            <li>
              <b>Jawaban, skor, dan waktu pengerjaan</b> tryout.
            </li>
            <li>
              <b>Alamat IP & jenis perangkat</b> untuk keamanan dan mencegah kecurangan.
            </li>
          </ul>
          <p>
            Kami <b>tidak</b> meminta nama lengkap, NIK, nomor HP, alamat, atau foto.
          </p>
          <h2 className="h2">Untuk apa</h2>
          <p>
            Menjalankan tryout, menghitung skor, menyusun peringkat, menjaga keamanan akun, dan
            memperbaiki kualitas soal. Data <b>tidak dijual</b> dan tidak dibagikan ke pihak lain
            untuk pemasaran.
          </p>
          <h2 className="h2">Peserta di bawah 18 tahun</h2>
          <p>
            Peserta berusia di bawah 18 tahun wajib menyatakan telah mendapat izin dari orang
            tua/wali saat mendaftar.
          </p>
          <h2 className="h2">Tempat penyimpanan</h2>
          <p>
            Data disimpan di server di Indonesia (Jakarta) dan dicadangkan secara berkala. Lalu
            lintas situs melewati jaringan Cloudflare untuk keamanan.
          </p>
          <h2 className="h2">Hakmu</h2>
          <p>
            Kamu bisa meminta salinan data atau penghapusan akun kapan saja. Untuk sementara,
            sampaikan permintaan melalui admin di grup Telegram; fitur hapus akun mandiri sedang
            disiapkan. Setelah akun dihapus, nama panggilanmu di peringkat lama diganti
            &quot;Peserta terhapus&quot;.
          </p>
          <h2 className="h2">Kontak</h2>
          <p>
            Pertanyaan tentang privasi: hubungi admin melalui grup Telegram Catatan Abdi Negara.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
