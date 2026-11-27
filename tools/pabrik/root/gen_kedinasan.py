"""Aset motion graphic tema 'Abdi Negara / Sekolah Kedinasan' — palet Cokelat Bhayangkara."""
import os, subprocess

OUT = "/home/claude/aset-kedinasan"
for d in ("svg", "png"):
    os.makedirs(f"{OUT}/{d}", exist_ok=True)

# ---------- Palet ----------
BG = "#EFE7D6"; GRID = "#E1D5BC"; INK = "#2B2118"; CARD = "#FFFBF2"
BROWN = "#7A5230"; BROWN_D = "#5A3B20"; GOLD = "#C9A13B"; GOLD_L = "#F4E4B5"; GOLD_B = "#DCC27E"
RED = "#B8322A"; MUTED = "#857A6A"; FADED = "#BDB3A3"
SKIN = "#F2C9A0"; HAIR = "#2B2420"; VISOR = "#1C1610"
HEAD = "'Poppins','Inter',sans-serif"
MONO = "'Space Mono','DejaVu Sans Mono','Courier New',monospace"

def svg(w, h, body, name):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n{body}\n</svg>'
    p = f"{OUT}/svg/{name}.svg"
    open(p, "w").write(s)
    subprocess.run(["rsvg-convert", "-z", "2", p, "-o", f"{OUT}/png/{name}.png"], check=True)

def card(x, y, w, h, fill=CARD, r=14, sw=4, off=7):
    return (f'<rect x="{x+off}" y="{y+off}" width="{w}" height="{h}" rx="{r}" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>')

def label(x, y, text, dark=True, size=15):
    w = len(text) * size * 0.7 + 22
    if dark:
        return (f'<rect x="{x}" y="{y}" width="{w}" height="{size+13}" rx="5" fill="{INK}"/>'
                f'<text x="{x+11}" y="{y+size+4}" font-family="{MONO}" font-size="{size}" fill="{CARD}">{text}</text>'), w
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{size+13}" rx="{(size+13)/2}" fill="{GOLD_L}" stroke="{GOLD_B}" stroke-width="2"/>'
            f'<text x="{x+11}" y="{y+size+4}" font-family="{MONO}" font-size="{size}" fill="{BROWN_D}">{text}</text>'), w

def check(cx, cy, r=15, done=True):
    if not done:
        return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{FADED}" stroke-width="3"/>'
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{BROWN}" stroke="{INK}" stroke-width="2.5"/>'
            f'<path d="M{cx-r*0.45} {cy} l{r*0.33} {r*0.33} l{r*0.6} {-r*0.66}" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>')

def star(cx, cy, r, fill):
    import math
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'

# ================= 1. Latar =================
g = "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="1920" stroke="{GRID}" stroke-width="2"/>' for x in range(0, 1081, 72))
g += "".join(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="{GRID}" stroke-width="2"/>' for y in range(0, 1921, 72))
svg(1080, 1920, f'<rect width="1080" height="1920" fill="{BG}"/>{g}', "01-latar-grid-1080x1920")

# ================= 2. Bar browser =================
b = card(10, 10, 960, 74, r=18)
b += "".join(f'<circle cx="{48+i*26}" cy="47" r="9" fill="{c}"/>' for i, c in enumerate(["#EE5F57", "#F5BE30", "#5FC341"]))
b += f'<path d="M140 38 l-9 9 l9 9 M156 38 l9 9 l-9 9" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
b += f'<path d="M190 35 h14 l5 5 h17 v20 h-36z" fill="{BROWN}" stroke="{INK}" stroke-width="2"/>'
b += f'<text x="238" y="57" font-family="{HEAD}" font-weight="700" font-size="26" fill="{INK}">Catatan Abdi Negara</text>'
b += f'<circle cx="760" cy="45" r="10" fill="none" stroke="{INK}" stroke-width="3"/><line x1="767" y1="52" x2="776" y2="61" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
b += f'<rect x="796" y="27" width="160" height="40" rx="20" fill="{CARD}" stroke="#D9CFBC" stroke-width="2"/>'
b += f'<circle cx="818" cy="47" r="13" fill="{GOLD_L}" stroke="{INK}" stroke-width="2"/>' + star(818, 47, 8, BROWN)
b += f'<text x="838" y="53" font-family="{MONO}" font-size="16" fill="{INK}">@akunanda</text>'
svg(990, 100, b, "02-bar-browser")

# ================= 3. Judul highlight =================
h = f'<text x="10" y="40" font-family="{MONO}" font-size="24" fill="{MUTED}">hari ini kita bahas →</text>'
h += f'<text x="10" y="120" font-family="{HEAD}" font-weight="800" font-size="72" fill="{INK}">sekolah</text>'
h += f'<rect x="318" y="62" width="412" height="74" rx="4" fill="{BROWN}" transform="rotate(-1.5 500 100)"/>'
h += f'<text x="332" y="120" font-family="{HEAD}" font-weight="800" font-size="70" fill="#fff">kedinasan.</text>'
svg(750, 150, h, "03-judul-highlight")

# ================= 4. Daftar sekolah kedinasan (chips) =================
d = card(10, 10, 960, 330)
l1, w1 = label(36, 32, "contoh sekolah kedinasan"); l2, _ = label(36 + w1 + 12, 32, "edit sesuai kebutuhan", dark=False)
d += l1 + l2
chips = [("Akpol", "Polri"), ("IPDN", "Kemendagri"), ("PKN STAN", "Kemenkeu"), ("STIS", "BPS"), ("STIN", "BIN"), ("Poltekip", "Pemasyarakatan")]
x, y = 36, 86
for name, inst in chips:
    w = max(len(name) * 25, len(inst) * 10.5) + 50
    if x + w > 940:
        x, y = 36, y + 120
    d += f'<rect x="{x}" y="{y}" width="{w}" height="100" rx="12" fill="{GOLD_L}" stroke="{INK}" stroke-width="3"/>'
    d += f'<text x="{x+20}" y="{y+50}" font-family="{HEAD}" font-weight="800" font-size="38" fill="{INK}">{name}</text>'
    d += f'<text x="{x+20}" y="{y+80}" font-family="{MONO}" font-size="15" fill="{MUTED}">{inst}</text>'
    x += w + 18
svg(990, 360, d, "04-kartu-daftar-sekolah")

# ================= 5. Timeline tahapan seleksi =================
t = card(10, 10, 960, 760)
l1, w1 = label(36, 32, "alur seleksi"); l2, _ = label(36 + w1 + 12, 32, "umumnya", dark=False)
t += l1 + l2
steps = ["daftar online", "seleksi administrasi", "tes akademik / SKD", "tes kesehatan", "tes jasmani", "psikotes", "pengumuman akhir"]
for i, s in enumerate(steps):
    cy = 120 + i * 92
    done = i < 3
    if i < len(steps) - 1:
        t += f'<line x1="70" y1="{cy+26}" x2="70" y2="{cy+66}" stroke="{BROWN if i < 2 else FADED}" stroke-width="5" stroke-dasharray="{"none" if i < 2 else "8 7"}"/>'
    fill = BROWN if done else CARD
    t += f'<circle cx="70" cy="{cy}" r="26" fill="{fill}" stroke="{INK if done or i == 3 else FADED}" stroke-width="3.5"/>'
    t += f'<text x="70" y="{cy+10}" text-anchor="middle" font-family="{HEAD}" font-weight="800" font-size="26" fill="{"#fff" if done else (INK if i == 3 else FADED)}">{i+1}</text>'
    col = INK if i <= 3 else FADED
    t += f'<text x="118" y="{cy+13}" font-family="{HEAD}" font-weight="800" font-size="38" fill="{col}">{s}</text>'
    if i == 3:
        tl, _ = label(560, cy - 16, "sedang dibahas", dark=False, size=17); t += tl
svg(990, 790, t, "05-kartu-alur-seleksi")

# ================= 6. Checklist syarat =================
c = card(10, 10, 960, 420)
l1, w1 = label(36, 32, "syarat umum"); l2, _ = label(36 + w1 + 12, 32, "cek tiap sekolah", dark=False); c += l1 + l2
reqs = [("WNI, sehat jasmani &amp; rohani", True), ("batas usia sesuai ketentuan", True), ("tinggi badan minimal", True), ("nilai rapor / ijazah", False), ("belum menikah", False)]
for i, (r_, done) in enumerate(reqs):
    yy = 110 + i * 62
    c += check(62, yy, 17, done)
    c += f'<text x="98" y="{yy+12}" font-family="{HEAD}" font-weight="700" font-size="32" fill="{INK if done else FADED}">{r_}</text>'
svg(990, 450, c, "06-kartu-checklist-syarat")

# ================= 7. Kartu angka besar =================
r = card(10, 10, 520, 230)
l, _ = label(34, 32, "biaya pendidikan"); r += l
r += f'<text x="30" y="178" font-family="{HEAD}" font-weight="800" font-size="118" fill="{BROWN}" letter-spacing="-4">Rp0*</text>'
r += f'<text x="34" y="218" font-family="{MONO}" font-size="16" fill="{MUTED}">*umumnya ditanggung negara + ikatan dinas</text>'
svg(550, 260, r, "07-kartu-angka-besar")

# ================= 8. Jadwal harian taruna =================
j = card(40, 10, 860, 640)
for i in range(13):
    j += f'<rect x="18" y="{48+i*46}" width="44" height="14" rx="7" fill="{CARD}" stroke="{INK}" stroke-width="3"/>'
l1, w1 = label(84, 34, "sehari jadi taruna"); l2, _ = label(84 + w1 + 10, 34, "ilustrasi", dark=False); j += l1 + l2
sched = [("04.30", "bangun &amp; ibadah"), ("05.30", "olahraga pagi"), ("06.30", "apel pagi"), ("07.30", "kuliah / pelajaran"), ("13.00", "makan siang"), ("15.30", "latihan fisik"), ("19.00", "wajib belajar"), ("22.00", "apel malam &amp; tidur")]
for i, (tm, act) in enumerate(sched):
    yy = 116 + i * 64
    j += f'<rect x="84" y="{yy-30}" width="112" height="44" rx="8" fill="{INK if i % 2 == 0 else BROWN}"/>'
    j += f'<text x="140" y="{yy}" text-anchor="middle" font-family="{MONO}" font-weight="700" font-size="22" fill="#fff">{tm}</text>'
    j += f'<text x="218" y="{yy+2}" font-family="{HEAD}" font-weight="700" font-size="32" fill="{INK}">{act}</text>'
svg(920, 670, j, "08-kartu-jadwal-taruna")

# ================= 9. Mitos vs Fakta =================
m = card(10, 10, 960, 380)
l, _ = label(36, 32, "mitos vs fakta"); m += l
m += f'<rect x="36" y="84" width="430" height="270" rx="12" fill="#F7DCD6" stroke="{INK}" stroke-width="3"/>'
m += f'<rect x="494" y="84" width="440" height="270" rx="12" fill="{GOLD_L}" stroke="{INK}" stroke-width="3"/>'
m += f'<circle cx="80" cy="130" r="22" fill="{RED}" stroke="{INK}" stroke-width="3"/><path d="M71 121 l18 18 M89 121 l-18 18" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
m += f'<text x="116" y="143" font-family="{HEAD}" font-weight="800" font-size="36" fill="{RED}">MITOS</text>'
m += check(538, 130, 22, True) + f'<text x="574" y="143" font-family="{HEAD}" font-weight="800" font-size="36" fill="{BROWN_D}">FAKTA</text>'
m += f'<text x="62" y="210" font-family="{HEAD}" font-weight="600" font-size="28" fill="{INK}">tulis mitos di sini,</text><text x="62" y="250" font-family="{HEAD}" font-weight="600" font-size="28" fill="{INK}">maks. 2–3 baris</text>'
m += f'<text x="520" y="210" font-family="{HEAD}" font-weight="600" font-size="28" fill="{INK}">tulis fakta di sini,</text><text x="520" y="250" font-family="{HEAD}" font-weight="600" font-size="28" fill="{INK}">maks. 2–3 baris</text>'
svg(990, 410, m, "09-kartu-mitos-fakta")

# ================= 10. Kartu identitas taruna =================
k = card(10, 10, 600, 360, r=20)
k += f'<rect x="10" y="10" width="600" height="70" rx="20" fill="{BROWN}" stroke="{INK}" stroke-width="4"/><rect x="12" y="60" width="596" height="22" fill="{BROWN}"/>'
k += f'<line x1="10" y1="80" x2="610" y2="80" stroke="{INK}" stroke-width="4"/>'
k += f'<text x="40" y="57" font-family="{MONO}" font-weight="700" font-size="22" fill="#fff">KARTU TARUNA</text>' + star(570, 45, 18, GOLD)
k += f'<rect x="40" y="110" width="170" height="210" rx="12" fill="{GOLD_L}" stroke="{INK}" stroke-width="3"/>'
k += f'<text x="125" y="222" text-anchor="middle" font-family="{MONO}" font-size="16" fill="{MUTED}">[ maskot ]</text>'
for i, (lb, val) in enumerate([("nama", "Nama Taruna"), ("tingkat", "Tingkat I"), ("angkatan", "20XX")]):
    yy = 130 + i * 72
    k += f'<text x="240" y="{yy}" font-family="{MONO}" font-size="16" fill="{MUTED}">{lb}</text>'
    k += f'<text x="240" y="{yy+34}" font-family="{HEAD}" font-weight="800" font-size="32" fill="{INK}">{val}</text>'
svg(630, 390, k, "10-kartu-identitas-taruna")

# ================= 11. Stiker =================
def pill_sticker(text, fill, fg, rot, w, name):
    s = (f'<g transform="rotate({rot} {w/2+15} 60)"><rect x="24" y="24" width="{w}" height="88" rx="44" fill="{INK}"/>'
         f'<rect x="16" y="16" width="{w}" height="88" rx="44" fill="{fill}" stroke="{INK}" stroke-width="4"/>'
         f'<text x="{16+w/2}" y="77" text-anchor="middle" font-family="{HEAD}" font-weight="800" font-size="46" fill="{fg}">{text}</text></g>')
    svg(w + 60, 150, s, name)
pill_sticker("SIAP!", GOLD_L, INK, -7, 210, "11-stiker-siap")
pill_sticker("Siap, Ndan!", BROWN, "#fff", 4, 320, "12-stiker-siap-ndan")
pill_sticker("LULUS", GOLD, INK, -5, 220, "13-stiker-lulus")
s = (f'<g transform="rotate(-6 160 60)"><rect x="18" y="18" width="290" height="84" rx="8" fill="#fff" stroke="{RED}" stroke-width="7"/>'
     f'<rect x="30" y="30" width="266" height="60" rx="4" fill="none" stroke="{RED}" stroke-width="3"/>'
     f'<text x="163" y="76" text-anchor="middle" font-family="{HEAD}" font-weight="800" font-size="40" fill="{RED}">PENTING!</text></g>')
svg(330, 130, s, "14-stiker-cap-penting")

# ================= 12. Ikon =================
def icon_tile(inner, name):
    s = card(8, 8, 150, 150, fill=GOLD_L, r=28, off=6) + inner
    svg(172, 172, s, name)
IK = f'stroke="{INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
icon_tile(f'<path d="M38 70 L83 46 L128 70 L83 94z" fill="{BROWN}" {IK}/><path d="M56 80 v28 q27 18 54 0 v-28" fill="{CARD}" {IK}/><path d="M128 70 v32" fill="none" {IK}/>', "15-ikon-toga")
icon_tile(f'<rect x="40" y="48" width="86" height="80" rx="8" fill="{CARD}" {IK}/><rect x="40" y="48" width="86" height="22" rx="6" fill="{BROWN}" {IK}/><path d="M60 40 v16 M106 40 v16" fill="none" {IK}/><circle cx="66" cy="94" r="6" fill="{INK}"/><circle cx="100" cy="94" r="6" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>', "16-ikon-kalender")
icon_tile(f'<path d="M58 40 h50 l-8 24 h-34z" fill="{BROWN}" {IK}/><circle cx="83" cy="96" r="32" fill="{GOLD}" {IK}/>' + star(83, 96, 16, CARD), "17-ikon-medali")
icon_tile(f'<path d="M48 124 V40" fill="none" {IK}/><path d="M48 44 h70 v24 h-70z" fill="{RED}" {IK}/><path d="M48 68 h70 v24 h-70z" fill="#fff" {IK}/>', "18-ikon-bendera")
icon_tile(f'<path d="M36 72 L83 40 L130 72z" fill="{BROWN}" {IK}/><rect x="40" y="72" width="86" height="12" fill="{CARD}" {IK}/><path d="M52 84 v30 M72 84 v30 M94 84 v30 M114 84 v30" fill="none" {IK}/><rect x="36" y="114" width="94" height="12" fill="{CARD}" {IK}/>', "19-ikon-gedung-kampus")
icon_tile(f'<circle cx="83" cy="86" r="42" fill="{CARD}" {IK}/><path d="M83 60 v28 l18 12" fill="none" {IK}/><circle cx="83" cy="86" r="4" fill="{INK}"/>', "20-ikon-jam")
icon_tile(f'<rect x="44" y="40" width="78" height="92" rx="8" fill="{CARD}" {IK}/><path d="M60 64 h46 M60 84 h46 M60 104 h28" fill="none" {IK}/><circle cx="112" cy="118" r="18" fill="{BROWN}" {IK}/><path d="M104 118 l6 6 l10 -12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>', "21-ikon-dokumen-syarat")
icon_tile(f'<path d="M50 120 c-6 -30 10 -42 22 -46 l-6 -20 h34 l-6 20 c12 4 28 16 22 46z" fill="{BROWN}" {IK}/><path d="M66 74 h34" fill="none" {IK}/>' + star(83, 100, 12, GOLD), "22-ikon-ransel")

# ================= 13. Lower-third subtitle bar =================
lt = card(10, 10, 960, 120, r=18)
lt += f'<rect x="10" y="10" width="26" height="120" rx="13" fill="{BROWN}"/><rect x="24" y="12" width="14" height="116" fill="{BROWN}"/>'
lt += f'<text x="62" y="62" font-family="{HEAD}" font-weight="800" font-size="40" fill="{INK}">Teks subtitle muncul di sini</text>'
lt += f'<text x="62" y="102" font-family="{MONO}" font-size="20" fill="{MUTED}">keterangan kecil / sumber</text>'
svg(990, 150, lt, "23-lower-third-subtitle")

# ================= 14. MASKOT: polisi berkacamata =================
def mascot(expr, badge=True):
    m = f'<ellipse cx="200" cy="402" rx="96" ry="14" fill="{INK}" opacity="0.15"/>'
    # white sticker outline (approximate union)
    m += f'<ellipse cx="200" cy="232" rx="152" ry="152" fill="#fff"/><ellipse cx="200" cy="84" rx="170" ry="72" fill="#fff"/>'
    if expr == "hormat":
        m += f'<ellipse cx="318" cy="150" rx="70" ry="44" fill="#fff" transform="rotate(-35 318 150)"/><rect x="300" y="200" width="100" height="200" rx="40" fill="#fff"/>'
    m += f'<g stroke="{INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">'
    # ears
    m += f'<ellipse cx="80" cy="232" rx="24" ry="30" fill="{SKIN}"/><ellipse cx="320" cy="232" rx="24" ry="30" fill="{SKIN}"/>'
    # face
    m += f'<path d="M90 200 Q90 360 200 368 Q310 360 310 200 Q310 140 200 140 Q90 140 90 200z" fill="{SKIN}"/>'
    m += '</g>'
    # side hair (short, under cap)
    m += f'<path d="M92 176 Q94 214 104 222 L112 168z M308 176 Q306 214 296 222 L288 168z" fill="{HAIR}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
    # cheeks
    m += f'<ellipse cx="128" cy="300" rx="20" ry="11" fill="#EE9C86" opacity="0.55"/><ellipse cx="272" cy="300" rx="20" ry="11" fill="#EE9C86" opacity="0.55"/>'
    # eyes / brows / mouth
    if expr in ("senyum", "hormat"):
        m += f'<ellipse cx="150" cy="250" rx="11" ry="15" fill="{INK}"/><ellipse cx="250" cy="250" rx="11" ry="15" fill="{INK}"/>'
        m += f'<circle cx="154" cy="244" r="4" fill="#fff"/><circle cx="254" cy="244" r="4" fill="#fff"/>'
        m += f'<path d="M166 306 q34 34 68 0 z" fill="#8A3A2E" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
        m += f'<path d="M128 217 q22 -8 44 0 M228 217 q22 -8 44 0" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    elif expr == "kaget":
        m += f'<circle cx="150" cy="250" r="17" fill="#fff" stroke="{INK}" stroke-width="5"/><circle cx="250" cy="250" r="17" fill="#fff" stroke="{INK}" stroke-width="5"/>'
        m += f'<circle cx="150" cy="252" r="7" fill="{INK}"/><circle cx="250" cy="252" r="7" fill="{INK}"/>'
        m += f'<ellipse cx="200" cy="318" rx="16" ry="20" fill="#8A3A2E" stroke="{INK}" stroke-width="6"/>'
        m += f'<path d="M126 216 q24 -10 48 -2 M226 214 q24 -8 48 2" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    elif expr == "mikir":
        m += f'<path d="M138 252 q12 7 24 0" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
        m += f'<ellipse cx="250" cy="250" rx="11" ry="15" fill="{INK}"/><circle cx="254" cy="244" r="4" fill="#fff"/>'
        m += f'<path d="M176 316 q24 -10 50 4" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
        m += f'<path d="M128 219 l44 -4 M228 216 q22 -8 44 4" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    elif expr == "tegas":
        m += f'<ellipse cx="150" cy="252" rx="11" ry="12" fill="{INK}"/><ellipse cx="250" cy="252" rx="11" ry="12" fill="{INK}"/>'
        m += f'<path d="M128 209 l44 10 M272 209 l-44 10" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>'
        m += f'<path d="M176 314 h48" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    # glasses (rounded rectangles)
    m += f'<g fill="#ffffff" fill-opacity="0.18" stroke="{INK}" stroke-width="7" stroke-linejoin="round">'
    m += f'<rect x="110" y="222" width="80" height="58" rx="16"/><rect x="210" y="222" width="80" height="58" rx="16"/></g>'
    m += f'<path d="M190 242 q10 -8 20 0 M110 238 L84 228 M290 238 L316 228" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
    m += f'<path d="M122 234 l14 -6 M222 234 l14 -6" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>'
    # ---- police peaked cap (pet) ----
    m += f'<g stroke="{INK}" stroke-width="7" stroke-linejoin="round">'
    m += f'<path d="M42 92 Q46 34 200 26 Q354 34 358 92 Q350 118 312 128 L88 128 Q50 118 42 92z" fill="{BROWN}"/>'
    m += f'<path d="M74 104 Q200 120 326 104" fill="none" stroke="{BROWN_D}" stroke-width="5"/>'
    m += f'<path d="M92 124 L308 124 L304 168 L96 168z" fill="{BROWN_D}"/>'
    m += f'<path d="M84 166 Q200 146 316 166 Q312 204 200 206 Q88 204 84 166z" fill="{VISOR}"/>'
    m += '</g>'
    m += f'<path d="M110 172 Q200 160 290 172" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.35"/>'
    # gold chin cord + buttons
    m += f'<path d="M98 158 Q200 150 302 158" fill="none" stroke="{GOLD}" stroke-width="8" stroke-linecap="round"/>'
    m += f'<circle cx="100" cy="158" r="8" fill="{GOLD}" stroke="{INK}" stroke-width="3"/><circle cx="300" cy="158" r="8" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
    # emblem (generic gold badge, not an official logo)
    if badge:
        m += f'<path d="M200 64 L232 78 Q232 122 200 138 Q168 122 168 78z" fill="{GOLD}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
        m += star(200, 100, 17, BROWN_D)
        m += f'<path d="M150 98 q-18 -4 -26 8 M250 98 q18 -4 26 8" fill="none" stroke="{GOLD}" stroke-width="6" stroke-linecap="round"/>'
    if expr == "hormat":
        # sleeve + saluting hand at the visor
        m += f'<g stroke="{INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">'
        m += f'<path d="M330 400 L318 262 Q330 230 362 236 L392 400z" fill="{BROWN}"/>'
        m += f'<path d="M318 262 Q300 228 316 196 L338 150 Q344 136 358 142 Q368 148 362 162 L346 214 Q360 232 352 256z" fill="{SKIN}"/>'
        m += f'<path d="M262 132 Q300 116 344 124 Q362 130 356 146 Q350 158 334 156 L282 160 Q262 158 262 146z" fill="{SKIN}"/>'
        m += '</g>'
        m += f'<path d="M286 140 h46 M288 150 h40" stroke="{INK}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
    return m

for e in ["senyum", "hormat", "kaget", "mikir", "tegas"]:
    svg(400, 420, mascot(e), f"24-maskot-polisi-{e}")
    svg(400, 420, mascot(e, badge=False), f"25-maskot-pet-polos-{e}")
# panduan posisi lencana
guide = mascot("senyum", badge=False)
guide += f'<rect x="164" y="56" width="72" height="86" fill="none" stroke="{RED}" stroke-width="3" stroke-dasharray="8 6"/>'
guide += f'<text x="246" y="70" font-family="{MONO}" font-size="13" fill="{RED}">area lencana</text>'
guide += f'<text x="246" y="88" font-family="{MONO}" font-size="13" fill="{RED}">x164 y56</text>'
guide += f'<text x="246" y="106" font-family="{MONO}" font-size="13" fill="{RED}">72x86 px</text>'
guide += f'<text x="246" y="124" font-family="{MONO}" font-size="13" fill="{RED}">(skala 400x420)</text>'
svg(400, 420, guide, "26-panduan-posisi-lencana")

# ================= 15. Palet warna =================
pal = [("latar", BG), ("garis grid", GRID), ("tinta", INK), ("kartu", CARD), ("cokelat", BROWN), ("cokelat tua", BROWN_D), ("emas", GOLD), ("emas muda", GOLD_L), ("merah aksen", RED)]
p = ""
for i, (n, c_) in enumerate(pal):
    x = 10 + (i % 3) * 300; y = 10 + (i // 3) * 150
    p += card(x, y, 270, 120, fill=c_, r=12, off=5)
    fg = "#fff" if c_ in (INK, BROWN, BROWN_D, RED) else INK
    p += f'<text x="{x+18}" y="{y+52}" font-family="{HEAD}" font-weight="800" font-size="26" fill="{fg}">{n}</text>'
    p += f'<text x="{x+18}" y="{y+90}" font-family="{MONO}" font-size="20" fill="{fg}">{c_}</text>'
svg(910, 470, p, "00-palet-warna")
print("ok")
