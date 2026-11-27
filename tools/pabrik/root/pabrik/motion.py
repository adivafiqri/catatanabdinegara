"""Kosakata gerak v2: animasi cepat (0.12-0.18 dtk), sinkron ke kata yang diucapkan, coretan tangan, dan layer kuis/VS."""
import math, re, sys
from PIL import Image
_av = sys.argv; sys.argv = ["x", "none"]
sys.path.insert(0, "/home/claude/ep1/el")
import render_final as F
sys.argv = _av
R, G = F.R, F.G
GREEN_OK = "#CFE8C0"

# ------------------------------------------------------------ sinkron ke ucapan
def _norm(s):
    return re.sub(r"[^a-z0-9 ]", " ", s.replace("&amp;", "&").lower())

SAT = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
def terbilang(n):
    if n < 12: return SAT[n]
    if n < 20: return SAT[n - 10] + " belas"
    if n < 100: return (SAT[n // 10] + " puluh " + terbilang(n % 10)).strip()
    if n < 200: return ("seratus " + terbilang(n - 100)).strip()
    if n < 1000: return (SAT[n // 100] + " ratus " + terbilang(n % 100)).strip()
    if n < 2000: return ("seribu " + terbilang(n - 1000)).strip()
    if n < 1000000: return (terbilang(n // 1000) + " ribu " + terbilang(n % 1000)).strip()
    return (terbilang(n // 1000000) + " juta " + terbilang(n % 1000000)).strip()

def _words_num(s):
    return re.sub(r"\d[\d.]*", lambda m: " " + terbilang(int(m.group(0).replace(".", ""))) + " " if m.group(0).replace(".", "").isdigit() else m.group(0), s)

def spoken(sc, text):
    """Waktu (relatif adegan) saat `text` mulai diucapkan, atau None."""
    nar = _norm(sc["narasi"]); fr = sc.get("fr") or []
    if not fr or not text: return None
    if re.search(r"\d", text) and not re.search(r"\d", sc["narasi"]): text = _words_num(text)
    q = " ".join(_norm(text).split())
    j = nar.find(q) if q else -1
    if j < 0:
        STOP = {"yang", "dan", "atau", "itu", "ini", "untuk", "dari", "dengan", "juga", "bisa", "ada", "kamu", "kalau", "tapi", "bukan", "harus", "sama"}
        for w in q.split():
            if len(w) >= 3 and w not in STOP:
                m = re.search(r"\b" + re.escape(w), nar) or (re.search(re.escape(w), nar) if len(w) >= 5 else None)
                if m: j = m.start(); break
    if j < 0: return None
    v = t_at(sc, j)
    return v

class Clock:
    """Memberi waktu muncul elemen: saat kata diucapkan - lead, berurutan & tidak terlalu rapat."""
    def __init__(self, sc, lead=0.2):
        self.sc, self.lead, self.prev = sc, lead, -1.0
        self.L, self.A = sc["lead"], max(0.6, sc["audio"])
    def __call__(self, text=None, f=0.0, gap=0.1, chain=False):
        """chain=True: dipakai untuk butir daftar, agar butir berikutnya tidak muncul sebelum butir sebelumnya."""
        ts = spoken(self.sc, text) if text else None
        t0 = ts - self.lead if ts is not None else self.L + min(self.A, 1.6) * f
        t0 = max(0.0, t0, self.prev + gap if (chain and self.prev >= 0) else 0.0)
        self.prev = t0
        return t0

# ------------------------------------------------------------ animasi elemen
def place(canvas, im, x, y, t, t0, kind="pop", dur=0.16, t_out=None):
    if t < t0: return
    p = R.clamp((t - t0) / dur); a = 1.0
    if t_out is not None and t > t_out: a *= 1 - R.clamp((t - t_out) / 0.1)
    if a <= 0: return
    sc, dx, dy, rot = 1.0, 0, 0, 0
    img = im
    if kind == "pop":
        sc = 0.5 + 0.5 * R.ease_out_back(p); a *= R.clamp(p * 4)
    elif kind == "up":
        dy = (1 - R.ease_out(p)) * 110; a *= R.clamp(p * 3)
    elif kind == "left":
        dx = -(1 - R.ease_out(p)) * 200; a *= R.clamp(p * 3)
    elif kind == "right":
        dx = (1 - R.ease_out(p)) * 200; a *= R.clamp(p * 3)
    elif kind == "slam":
        sc = 1 + 0.7 * (1 - R.ease_out(p)); a *= R.clamp(p * 5)
    elif kind == "spin":
        sc = 0.4 + 0.6 * R.ease_out_back(p); rot = (1 - R.ease_out(p)) * -25; a *= R.clamp(p * 4)
    elif kind == "wipe":   # gambar tergores dari kiri ke kanan (coretan, garis bawah)
        w = max(1, int(im.width * R.ease_out(p)))
        img = im.crop((0, 0, w, im.height))
    if rot:
        img = img.rotate(rot, resample=Image.BILINEAR, expand=True)
        dx += (im.width - img.width) / 2; dy += (im.height - img.height) / 2
    if abs(sc - 1) > 1e-3:
        nw, nh = max(1, int(img.width * sc)), max(1, int(img.height * sc))
        dx += (img.width - nw) / 2; dy += (img.height - nh) / 2
        img = img.resize((nw, nh), Image.BILINEAR)
    if a < 0.999:
        img = img.copy(); img.putalpha(img.getchannel("A").point(lambda v: int(v * a)))
    canvas.alpha_composite(img, (int(x + dx), int(y + dy)))

# ------------------------------------------------------------ coretan tangan (doodle)
SW = f'stroke="{G.INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"'
def squiggle(w, color=None):
    pts = " ".join(f"{x},{18 + 10 * math.sin(x / 26)}" for x in range(8, int(w), 12))
    return R.layer(f"dd-sq{int(w)}-{color}", int(w) + 16, 40, f'<polyline points="{pts}" stroke="{color or G.RED}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')

def arrow(flip=False):
    b = f'<path d="M20 30 C 90 10, 150 60, 170 140" {SW}/><path d="M140 120 L172 146 L182 104" {SW}/>'
    im = R.layer("dd-arrow", 210, 170, b)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im

def sparkle(color=None):
    c = color or G.GOLD
    b = "".join(f'<path d="M80 80 L{80 + 70 * math.cos(a)} {80 + 70 * math.sin(a)}" stroke="{c}" stroke-width="10" stroke-linecap="round"/>' for a in [i * math.pi / 4 for i in range(8)] if True)
    b += f'<circle cx="80" cy="80" r="16" fill="{c}" stroke="{G.INK}" stroke-width="5"/>'
    return R.layer(f"dd-spark-{c}", 160, 160, b)

def burst():
    b = "".join(f'<path d="M{100 + 70 * math.cos(a)} {100 + 70 * math.sin(a)} L{100 + 96 * math.cos(a)} {100 + 96 * math.sin(a)}" stroke="{G.INK}" stroke-width="9" stroke-linecap="round"/>' for a in [math.radians(-150 + i * 30) for i in range(5)])
    return R.layer("dd-burst", 200, 200, b)

def circle_scribble(w, h):
    b = f'<ellipse cx="{w/2}" cy="{h/2}" rx="{w/2 - 10}" ry="{h/2 - 10}" stroke="{G.RED}" stroke-width="8" fill="none" transform="rotate(-3 {w/2} {h/2})"/>'
    return R.layer(f"dd-circ{w}x{h}", w, h, b)

# ------------------------------------------------------------ layer kuis & VS
def wrap(text, size, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if R.text_w(test, size) <= maxw: cur = test
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;") if "&amp;" not in s else s

def soal_card(name, label, text, w=990):
    lines = wrap(text.replace("&amp;", "&"), 54, w - 80); h = 120 + len(lines) * 68
    b = (f'<rect x="8" y="8" width="{w-8}" height="{h-8}" rx="16" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-8}" height="{h-8}" rx="16" fill="{G.CARD}" stroke="{G.INK}" stroke-width="5"/>'
         f'<rect x="28" y="24" width="{len(label)*19+40}" height="44" rx="8" fill="{G.INK}"/>'
         f'<text x="48" y="56" font-family="{G.MONO}" font-weight="700" font-size="28" fill="{G.GOLD}">{esc(label)}</text>')
    for i, l in enumerate(lines):
        b += f'<text x="40" y="{130 + i*68}" font-family="{G.HEAD}" font-weight="700" font-size="54" fill="{G.INK}">{esc(l)}</text>'
    return R.layer(name, w, h, b), h

def opsi_row(name, letter, text, state="", w=990):
    fill = {"benar": GREEN_OK, "salah": "#EEE6D6"}.get(state, G.CARD)
    size = 50
    while size > 32 and R.text_w(text.replace("&amp;", "&"), size) > w - 200: size -= 2
    b = (f'<rect x="7" y="7" width="{w-7}" height="96" rx="14" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-7}" height="96" rx="14" fill="{fill}" stroke="{G.INK}" stroke-width="5"/>'
         f'<circle cx="56" cy="48" r="30" fill="{G.GOLD if state != "benar" else "#5E9E4A"}" stroke="{G.INK}" stroke-width="4"/>'
         f'<text x="56" y="62" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="38" fill="{G.INK if state != "benar" else "#fff"}">{letter}</text>'
         f'<text x="108" y="{48 + size*0.36}" font-family="{G.HEAD}" font-weight="700" font-size="{size}" fill="{G.INK if state != "salah" else G.MUTED}">{esc(text)}</text>')
    if state == "benar":
        b += f'<path d="M{w-110} 50 l22 22 l44 -46" stroke="#2F7A2A" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    return R.layer(f"{name}-{state}", w, 104, b)

def vs_card(name, judul, items, fill, w=470):
    h = 130 + sum(vs_item(f"{name}-m{i}", it)[1] + 14 for i, it in enumerate(items))
    b = (f'<rect x="8" y="8" width="{w-8}" height="{h-8}" rx="16" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-8}" height="{h-8}" rx="16" fill="{fill}" stroke="{G.INK}" stroke-width="5"/>')
    s = 60
    while s > 34 and R.text_w(judul.replace("&amp;", "&"), s) > w - 60: s -= 2
    b += f'<text x="{(w-8)/2}" y="80" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="{G.INK}">{esc(judul)}</text>'
    b += f'<path d="M30 106 H{w-38}" stroke="{G.INK}" stroke-width="4"/>'
    return R.layer(f"{name}-{h}", w, h, b), h

def vs_item(name, text, w=420):
    lines = wrap(text.replace("&amp;", "&"), 44, w - 60)[:2]
    h = 20 + 54 * len(lines)
    b = f'<circle cx="18" cy="34" r="9" fill="{G.BROWN}"/>'
    for k, l in enumerate(lines):
        b += f'<text x="40" y="{50 + k*54}" font-family="{G.HEAD}" font-weight="700" font-size="44" fill="{G.INK}">{esc(l)}</text>'
    return R.layer(name, w, h + 10, b), h

def vs_badge():
    b = (f'<circle cx="96" cy="96" r="84" fill="{G.INK}"/><circle cx="88" cy="88" r="80" fill="{G.RED}" stroke="{G.INK}" stroke-width="6"/>'
         f'<text x="88" y="112" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="70" fill="#fff">VS</text>')
    return R.layer("vs-badge", 190, 190, b)

def timer_bar(name, frac, w=990):
    fw = max(0, int((w - 20) * frac))
    b = (f'<rect x="0" y="0" width="{w}" height="28" rx="14" fill="{G.CARD}" stroke="{G.INK}" stroke-width="4"/>'
         f'<rect x="10" y="7" width="{fw}" height="14" rx="7" fill="{G.RED if frac < 0.35 else G.GOLD}"/>')
    return R.layer(f"{name}-{int(frac*20)}", w, 28, b)

# ------------------------------------------------------------ angka berjalan
def parse_num(s):
    m = re.match(r"^\s*([\d.]+)(.*)$", s)
    if not m or (m.group(2) and not m.group(2).startswith(" ")): return None
    digits = m.group(1)
    try: v = int(digits.replace(".", ""))
    except ValueError: return None
    return v, m.group(2), "." in digits

def fmt_num(v, dots):
    s = f"{v:,}".replace(",", ".") if dots else str(v)
    return s

def chip(name, title, sub, w=640):
    """Chip judul+keterangan dengan ukuran huruf menyesuaikan lebar."""
    t = title.replace("&amp;", "&"); s = 60
    while s > 34 and R.text_w(t, s) > w - 60: s -= 2
    b = (f'<rect x="8" y="8" width="{w-8}" height="150" rx="16" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-8}" height="150" rx="16" fill="{G.GOLD_L}" stroke="{G.INK}" stroke-width="5"/>'
         f'<text x="30" y="{20 + s}" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="{G.INK}">{esc(title)}</text>'
         f'<text x="32" y="126" font-family="{G.MONO}" font-weight="700" font-size="30" fill="{G.BROWN}">{esc(sub)}</text>')
    return R.layer(f"chip2-{name}-{s}", w, 162, b)

# ------------------------------------------------------------ bobot ucapan (sinkron teks-suara lebih presisi)
DIEJA_TIDAK = {"STIS", "STAN", "STIN", "STIP", "SPMB", "UKT", "BUMN"}
def spoken_len(tok):
    core = re.sub(r"[^\w]", "", tok)
    if not core: return max(1, len(tok)) * 0.3
    if re.fullmatch(r"[\d.]+", core.replace(",", "")):
        try: return len(terbilang(int(core.replace(".", ""))))
        except Exception: return len(core) * 4
    if re.fullmatch(r"[A-Z]\d", core): return 9          # D3, D4
    if re.fullmatch(r"[A-Z]{2,6}", core) and core not in DIEJA_TIDAK: return len(core) * 2.6   # akronim dieja: SKD, TWK, BPS
    return len(tok)

def weights(text):
    """Bobot kumulatif per karakter: tiap kata dibobot sesuai panjang ucapannya."""
    cw = [0.0] * (len(text) + 1)
    for m in re.finditer(r"\S+|\s+", text):
        s, e = m.start(), m.end()
        w = spoken_len(m.group()) if not m.group().isspace() else 0.6
        for k in range(s, e): cw[k + 1] = cw[k] + w / (e - s)
    return cw

def t_at(sc, j):
    """Waktu (relatif adegan) saat karakter ke-j narasi diucapkan."""
    fr = sc.get("fr") or []
    if not fr: return None
    cw = sc.setdefault("_cw", None) or weights(sc["narasi"]); sc["_cw"] = cw
    for s, e, a, b in fr:
        if s <= j < e:
            return a + (b - a) * (cw[j] - cw[s]) / max(1e-6, cw[e] - cw[s])
    return fr[-1][2]

# ------------------------------------------------------------ layer baru: kata kinetik, chat, skala
def word_layer(name, word, size, hl=False):
    w = R.text_w(word.replace("&amp;", "&"), size) + (36 if hl else 6); h = int(size * 1.3)
    if hl:
        b = (f'<rect x="6" y="6" width="{w-6}" height="{h-4}" rx="10" fill="{G.INK}"/>'
             f'<rect x="0" y="0" width="{w-6}" height="{h-4}" rx="10" fill="{G.BROWN}"/>'
             f'<text x="15" y="{size*0.98}" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="#fff">{esc(word)}</text>')
    else:
        b = f'<text x="0" y="{size*0.98}" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="{G.INK}">{esc(word)}</text>'
    return R.layer(f"kw-{name}-{size}-{hl}", int(w) + 8, h + 8, b), w

def bubble(name, text, side, w=720):
    lines = wrap(text.replace("&amp;", "&"), 48, w - 70)[:4]
    h = 40 + 60 * len(lines)
    fill = G.CARD if side == "kiri" else G.GOLD_L
    tail = (f'M30 {h-10} L6 {h+26} L70 {h-10}z' if side == "kiri" else f'M{w-80} {h-10} L{w-14} {h+26} L{w-40} {h-10}z')
    b = (f'<rect x="8" y="8" width="{w-8}" height="{h}" rx="28" fill="{G.INK}"/>'
         f'<path d="{tail}" fill="{fill}" stroke="{G.INK}" stroke-width="5" stroke-linejoin="round"/>'
         f'<rect x="0" y="0" width="{w-8}" height="{h}" rx="28" fill="{fill}" stroke="{G.INK}" stroke-width="5"/>')
    for k, l in enumerate(lines):
        b += f'<text x="34" y="{68 + k*60}" font-family="{G.HEAD}" font-weight="700" font-size="48" fill="{G.INK}">{esc(l)}</text>'
    return R.layer(f"bb-{name}", w + 10, h + 40, b), h + 40

def avatar_tanya():
    b = (f'<circle cx="64" cy="64" r="58" fill="{G.GOLD_L}" stroke="{G.INK}" stroke-width="5"/>'
         f'<circle cx="64" cy="50" r="20" fill="{G.BROWN}"/><path d="M28 104 q36 -44 72 0" fill="{G.BROWN}"/>'
         f'<circle cx="102" cy="26" r="20" fill="{G.RED}" stroke="{G.INK}" stroke-width="4"/>'
         f'<text x="102" y="38" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="32" fill="#fff">?</text>')
    return R.layer("av-tanya", 132, 132, b)

def skala_row(name, text, skor, frac, w=990):
    s = 44
    while s > 30 and R.text_w(text.replace("&amp;", "&"), s) > w - 380: s -= 2
    b = (f'<rect x="7" y="7" width="{w-7}" height="96" rx="14" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-7}" height="96" rx="14" fill="{G.CARD}" stroke="{G.INK}" stroke-width="5"/>'
         f'<text x="28" y="{48 + s*0.36}" font-family="{G.HEAD}" font-weight="700" font-size="{s}" fill="{G.INK}">{esc(text)}</text>')
    x0 = w - 340; lit = skor * frac
    for k in range(5):
        on = k < lit
        b += f'<rect x="{x0 + k*48}" y="28" width="40" height="40" rx="8" fill="{G.GOLD if on else "#EEE6D6"}" stroke="{G.INK}" stroke-width="4"/>'
    if frac >= 1:
        b += f'<text x="{w-60}" y="64" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="44" fill="{G.BROWN}">{skor}</text>'
    return R.layer(f"sk-{name}-{int(frac*10)}", w, 104, b)

# ------------------------------------------------------------ foto (polaroid + ken burns) & pohon
_FOTO = {}
def foto_frame(path, w, h, z, kredit=None):
    """Foto dibingkai kertas putih + selotip; z = zoom pelan (1.00-1.10)."""
    key = (path, w, h, round(z, 3), kredit)
    if key in _FOTO: return _FOTO[key]
    src = _FOTO.get(path) or Image.open(path).convert("RGB"); _FOTO[path] = src
    iw, ih = w - 40, h - 40
    sr = src.width / src.height; tr = iw / ih
    cw, ch = (src.height * tr, src.height) if sr > tr else (src.width, src.width / tr)
    cw, ch = cw / z, ch / z
    x0, y0 = (src.width - cw) / 2, (src.height - ch) / 2
    ph = src.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((iw, ih), Image.BILINEAR)
    im = Image.new("RGBA", (w + 14, h + 14), (0, 0, 0, 0))
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    d.rectangle((12, 12, w + 12, h + 12), fill=G.INK)
    d.rectangle((0, 0, w, h), fill="#FFFDF7", outline=G.INK, width=5)
    im.paste(ph, (20, 20))
    if kredit:
        kw = min(w - 60, int(len(kredit) * 13.6 + 30))
        tl = R.layer(f"kredit-{kredit}-{kw}", kw, 40, f'<rect width="{kw}" height="40" rx="6" fill="{G.INK}" fill-opacity="0.75"/><text x="14" y="28" font-family="{G.MONO}" font-weight="700" font-size="22" fill="#fff">{esc(kredit)}</text>')
        im.alpha_composite(tl, (w - kw - 30, h - 70))
    tape = R.layer("tape", 170, 46, f'<rect width="170" height="46" fill="{G.GOLD_L}" fill-opacity="0.85" stroke="{G.GOLD_B}" stroke-width="2"/>')
    im.alpha_composite(tape.rotate(-8, expand=True), (30, 0))
    im.alpha_composite(tape.rotate(7, expand=True), (w - 200, 0))
    _FOTO[key] = im
    if len(_FOTO) > 400: [_FOTO.pop(k) for k in list(_FOTO)[:200] if isinstance(k, tuple)]
    return im

def node(name, label, text, w, dark=False):
    lines = wrap(text.replace("&amp;", "&"), 40, w - 50)[:2]
    h = 70 + 48 * len(lines)
    fill = G.BROWN if dark else (G.GOLD_L if label else G.CARD)
    ink = "#fff" if dark else G.INK
    b = (f'<rect x="8" y="8" width="{w-8}" height="{h-8}" rx="14" fill="{G.INK}"/>'
         f'<rect x="0" y="0" width="{w-8}" height="{h-8}" rx="14" fill="{fill}" stroke="{G.INK}" stroke-width="5"/>'
         f'<rect x="20" y="16" width="{len(label)*15+24}" height="32" rx="6" fill="{G.INK}"/>'
         f'<text x="32" y="40" font-family="{G.MONO}" font-weight="700" font-size="22" fill="{G.GOLD}">{esc(label)}</text>')
    for k, l in enumerate(lines):
        b += f'<text x="24" y="{96 + k*48}" font-family="{G.HEAD}" font-weight="800" font-size="40" fill="{ink}">{esc(l)}</text>'
    return R.layer(f"nd-{name}-{w}", w, h, b), h

def line_layer(name, pts, w, h):
    d = "M" + " L".join(f"{x} {y}" for x, y in pts)
    return R.layer(f"ln-{name}", w, h, f'<path d="{d}" fill="none" stroke="{G.INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
