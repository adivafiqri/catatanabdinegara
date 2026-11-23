# Skema Data

Versi 0.1 · 23 November 2026 · PostgreSQL (Supabase) · Semua waktu disimpan `timestamptz` (UTC), ditampilkan dalam WIB.

Konvensi: nama tabel & kolom dalam bahasa Inggris snake_case (agar cocok dengan alat & pustaka). Nilai yang terlihat pengguna (label subtes, teks) berbahasa Indonesia. ID memakai `uuid` (v7 bila tersedia), kecuali tabel kecil/lookup.

---

## 1. Diagram relasi (ringkas)

```
auth.users 1─1 profiles 1─* attempts *─1 packages *─1 rule_sets
                  │            │   └──*─1 events *─1 packages
                  │            └─1─* attempt_answers *─1 questions
                  │                                     1─* question_options
                  ├─* guardian_consents                 *─1 sub_topics *─1 subtests
                  ├─* user_badges *─1 badges (T2)
                  └─* purchases *─1 packages (P)

packages 1─* package_questions *─1 questions
questions 1─* question_revisions (riwayat ubah)

Bot: bot_settings · bot_members · bot_warnings · bot_actions
     bot_pending_verifications · bot_scheduled_posts · bot_outbox · bot_quiz_log
```

## 2. Konfigurasi aturan SKD (bisa diubah admin)

Aturan ujian **tidak di-hard-code**. Disimpan sebagai versi; setiap paket menunjuk satu versi, dan setiap attempt menyalin `rule_set_id` saat dimulai. Dengan begitu, mengubah aturan tidak mengubah skor lama.

### `subtests`
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| code | text PK | `TWK`, `TIU`, `TKP` (bisa ditambah) |
| name | text | "Tes Wawasan Kebangsaan" |
| scoring_type | text | `correct_wrong` atau `weighted` |
| sort_order | int | |

### `sub_topics`
| id | serial PK | |
| subtest_code | text FK → subtests | |
| name | text | mis. "Deret angka", "Pelayanan publik" |
| slug | text unik | dipakai di file impor: `tiu-deret-angka` |

### `rule_sets`
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | serial PK | |
| name | text | "SKD Sekolah Kedinasan 2026" |
| duration_minutes | int | 100 |
| config | jsonb | lihat contoh di bawah, divalidasi Zod `RuleSetConfig` |
| source_note | text | sumber pengumuman resmi + tanggal dicek |
| status | text | `draft` / `active` / `retired` |
| created_by, created_at | | |

Contoh `config`:
```json
{
  "subtests": [
    { "code": "TWK", "question_count": 30, "correct_points": 5, "wrong_points": 0, "blank_points": 0,
      "passing_grade": { "value": 65, "verified": false } },
    { "code": "TIU", "question_count": 35, "correct_points": 5, "wrong_points": 0, "blank_points": 0,
      "passing_grade": { "value": 80, "verified": false } },
    { "code": "TKP", "question_count": 45, "weight_min": 1, "weight_max": 5, "blank_points": 0,
      "passing_grade": { "value": 166, "verified": false } }
  ],
  "total_passing_grade": null,
  "order": ["TWK", "TIU", "TKP"],
  "shuffle_questions": "within_subtest",
  "shuffle_options": true,
  "min_plausible_seconds": 900
}
```
- `passing_grade.verified = false` → web **tidak** menampilkan "aman/belum aman" (brief §2). Angka di atas hanya contoh dan wajib dicek dari aturan resmi.
- `blank_points` untuk TKP: brief menyebut "tidak ada nilai 0" untuk opsi, tetapi soal yang **tidak dijawab** tetap 0. Ini dicatat eksplisit supaya tidak ambigu.
- `min_plausible_seconds`: attempt yang selesai lebih cepat dari ini ditandai janggal.

## 3. Pengguna & privasi

### `profiles` (1–1 dengan `auth.users` Supabase; email & hash password ada di `auth.users`)
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid PK = auth.users.id | |
| nickname | citext unik | 3–20 karakter, disaring kata kasar; tampil di leaderboard |
| nickname_changed_at | timestamptz | batasi ubah 1×/30 hari |
| city | text | dari daftar kab/kota (bukan teks bebas) agar leaderboard rapi |
| target_school | text null | dari daftar `schools.code` |
| birth_year | smallint | **hanya tahun**, untuk menentukan perlu persetujuan wali (minimisasi data) |
| role | text | `user` / `moderator` / `admin` |
| telegram_user_id | bigint null unik | T2, diisi saat menautkan |
| consent_privacy_version | text | mis. `2027-01` |
| consent_at | timestamptz | |
| marketing_opt_in | bool default false | terpisah dari persetujuan wajib |
| deletion_requested_at | timestamptz null | |
| created_at | timestamptz | |

### `guardian_consents` (untuk pengguna < 18 tahun)
| id, profile_id FK, guardian_email (terenkripsi), token_hash, confirmed_at, revoked_at, created_at |

### `schools`
| code PK (`STIS`, `PKN-STAN`, `IPDN`, `STMKG`, `POLTEK-SSN`, …), name, active |
Hanya nama sekolah dalam bentuk teks. **Tanpa logo.**

## 4. Bank soal

### `questions`
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid PK | |
| code | text unik | kode yang mudah dibaca manusia, mis. `TIU-DRT-0042` (kunci impor ulang) |
| subtest_code | text FK | |
| sub_topic_id | int FK | |
| difficulty | smallint | 1 mudah · 2 sedang · 3 sulit |
| stem | text | teks soal (Markdown terbatas: tebal, miring, tabel, rumus sederhana) |
| image_path | text null | path di Storage (soal figural) |
| image_alt | text null | wajib bila ada gambar (aksesibilitas) |
| explanation | text | pembahasan |
| quiz_explanation | text null | ≤ 200 karakter, untuk kuis Telegram |
| allow_quiz | bool | boleh dipakai bot |
| status | text | `draft` / `review` / `published` / `archived` |
| source_note | text | "orisinal", "dibantu AI dicek manual oleh …" (aturan brief §7.3) |
| version | int | naik setiap diubah setelah terbit |
| created_by, updated_by, created_at, updated_at | | |

### `question_options`
| id uuid PK, question_id FK, label (`A`–`E`, label asli sebelum diacak), text, image_path null, is_correct bool null (TWK/TIU), weight smallint null (TKP 1–5) |
Batasan (dicek di DB lewat trigger + di Zod):
- `correct_wrong`: tepat 1 `is_correct = true`, `weight` null.
- `weighted`: semua `weight` 1–5 dan tidak ada yang kembar, `is_correct` null.

### `question_revisions`
Salinan JSON soal setiap kali diubah setelah terbit → attempt lama tetap bisa menampilkan versi soal yang dikerjakan.

## 5. Paket, event, attempt

### `packages`
| id, slug, name, description, rule_set_id FK, access (`free`/`paid`), price_idr null, mode (`fixed`/`random_by_quota`), random_quota jsonb null, status (`draft`/`published`), created_at |

### `package_questions` (untuk mode `fixed`)
| package_id, question_id, position · PK (package_id, question_id) |

### `events`
| id, package_id FK, name, opens_at, closes_at, starts_at null (null = bebas mulai kapan saja dalam jendela; diisi = serentak), announce_to_telegram bool, status |

### `attempts`
| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK | |
| package_id, event_id null, rule_set_id | FK | |
| is_first_in_event | bool | dihitung saat dibuat (unique partial index `(user_id, event_id) where is_first_in_event`) |
| question_order | jsonb | array question_id hasil acak |
| option_order | jsonb | `{question_id: ["C","A","E","B","D"]}` |
| answers_draft | jsonb | `{question_id: {o:"C", f:true, t:1732…}}`; ditulis selama ujian |
| started_at, deadline_at, submitted_at | timestamptz | deadline dihitung server |
| status | text | `in_progress` / `submitted` / `expired_submitted` |
| score_twk, score_tiu, score_tkp, score_total | smallint | |
| duration_seconds | int | |
| flag_status | text | `none` / `flagged` / `cleared` / `excluded` |
| flag_reasons | text[] | `too_fast`, `tab_hidden_long`, `burst_answers`, … |
| client_meta | jsonb | ringkas: UA kelas perangkat, tanpa IP mentah (IP disimpan hash + dibuang 30 hari) |

Indeks: `(event_id, score_total desc) where is_first_in_event and flag_status in ('none','cleared')`.

### `attempt_answers` (dinormalisasi saat attempt selesai)
| attempt_id, question_id, question_version, option_label null, is_flagged, answered_at, points · PK (attempt_id, question_id) |

## 6. Gamifikasi & premium (T2/P — dirancang sekarang, dibangun nanti)

- `badges` (code, name, description, rule jsonb) · `user_badges` (user_id, badge_code, earned_at)
- `daily_streaks` (user_id, date) — satu baris per hari aktif
- `purchases` (id, user_id, package_id, provider, provider_ref unik, amount_idr, status, paid_at, raw_webhook jsonb) · `vouchers` (code, discount, quota, valid_until)

## 7. Bot Telegram

| Tabel | Kolom penting | Fungsi |
| --- | --- | --- |
| `bot_settings` | key PK, value jsonb, updated_by, updated_at | `banned_words`, `domain_whitelist`, `welcome_text`, `rules_text`, `verify_timeout_min`, `flood_limit` (n, detik), `newbie_hours`, `mute_hours` |
| `bot_members` | chat_id, tg_user_id, joined_at, verified_at, warning_count, muted_until | status anggota |
| `bot_pending_verifications` | chat_id, tg_user_id, welcome_message_id, expires_at | dipindai tiap menit → kick jika lewat |
| `bot_warnings` | id, chat_id, tg_user_id, reason, message_excerpt (≤ 100 karakter), by (`bot` / tg_user_id moderator), created_at, revoked_at, revoked_by | riwayat peringatan, bisa dibatalkan |
| `bot_actions` | id, action (`delete`,`warn`,`mute`,`unmute`,`kick`,`unwarn`), target, by, reason, created_at | log audit |
| `bot_scheduled_posts` | id, chat_id, text, cron (WIB), next_run_at, last_run_at, active | info terjadwal & anti-penipuan |
| `bot_outbox` | id, chat_id, payload jsonb, dedupe_key unik, sent_at, error | pesan dari web ke Telegram |
| `bot_quiz_log` | question_id, chat_id, sent_at, poll_id | mencegah soal berulang |

Retensi: `message_excerpt` & log tindakan dihapus otomatis setelah 180 hari.

## 8. Format impor bank soal

Impor selalu **validasi dulu, simpan belakangan**, dan bersifat all-or-nothing. `code` yang sudah ada → soal diperbarui (versi naik). Status hasil impor selalu `draft`.

### 8.1 CSV (UTF-8, pemisah koma, cocok diisi dari Google Sheets)

Satu baris = satu soal. Kolom:

```
code,subtes,sub_materi,tingkat,soal,gambar,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,bobot,pembahasan,pembahasan_kuis,boleh_kuis,sumber
```

- `subtes`: `TWK` / `TIU` / `TKP`
- `sub_materi`: slug, mis. `tiu-deret-angka`
- `tingkat`: `1` / `2` / `3`
- `gambar`: nama file yang ikut diunggah dalam satu ZIP (`gambar/TIU-FIG-0001.webp`), boleh kosong
- `kunci`: huruf `A`–`E` untuk TWK/TIU; kosong untuk TKP
- `bobot`: untuk TKP, 5 angka dipisah `|` sesuai urutan A–E, mis. `3|5|1|4|2`; kosong untuk TWK/TIU
- `boleh_kuis`: `ya` / `tidak`

Contoh:
```csv
code,subtes,sub_materi,tingkat,soal,gambar,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,bobot,pembahasan,pembahasan_kuis,boleh_kuis,sumber
TIU-DRT-0001,TIU,tiu-deret-angka,1,"2, 5, 10, 17, 26, ...",,35,36,37,38,39,C,,"Selisihnya 3, 5, 7, 9 → berikutnya +11, jadi 26 + 11 = 37.","Selisih naik 2: 26+11=37",ya,orisinal
TKP-PLY-0001,TKP,tkp-pelayanan-publik,2,"Seorang warga lansia kebingungan mengisi formulir di loket Anda yang sedang ramai. Sikap Anda...",,"Meminta warga menunggu sampai antrean sepi","Membantu mengisi sambil tetap melayani antrean secara bergantian","Menyuruh warga bertanya ke petugas lain","Mengisikan seluruh formulir tanpa menjelaskan","Memberikan contoh formulir yang sudah terisi",,2|5|1|3|4,"Opsi B paling menunjukkan pelayanan aktif tanpa mengabaikan warga lain.",,tidak,orisinal
```

### 8.2 JSON (untuk impor/ekspor penuh & cadangan)

```json
{
  "format": "can-bank-soal",
  "version": 1,
  "questions": [
    {
      "code": "TWK-PCS-0001",
      "subtest": "TWK",
      "sub_topic": "twk-pancasila",
      "difficulty": 2,
      "stem": "Nilai Pancasila yang paling tercermin ketika ...",
      "image": null,
      "options": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "...", "correct": true },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." },
        { "label": "E", "text": "..." }
      ],
      "explanation": "...",
      "quiz_explanation": "...",
      "allow_quiz": true,
      "source": "orisinal"
    }
  ]
}
```
Untuk TKP, setiap opsi memakai `"weight": 1..5` sebagai pengganti `correct`.

File contoh lengkap & validatornya (`pnpm soal:cek file.csv`) dibuat di Milestone 2.
