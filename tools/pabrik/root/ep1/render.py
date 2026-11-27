"""Render Episode 1 'Apa itu Sekolah Kedinasan?' — 1080x1920, 30 fps."""
import json, math, os, subprocess, sys, io
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, "/home/claude")
import gen_kedinasan as G  # palette + helpers (also regenerates the asset kit)

W, H, FPS = 1080, 1920, 30
EP = "/home/claude/ep1"
os.makedirs(f"{EP}/layers", exist_ok=True)
os.makedirs(f"{EP}/scenes", exist_ok=True)
NASKAH = json.load(open(f"{EP}/naskah.json"))
FB = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"

# ---------------- rasterising helpers ----------------
_cache = {}
def layer(name, w, h, body):
    if name in _cache:
        return _cache[name]
    p = f"{EP}/layers/{name}.svg"
    open(p, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>')
    png = subprocess.run(["rsvg-convert", p], capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    _cache[name] = im
    return im

def text_w(t, size):
    return ImageFont.truetype(FB, size).getlength(t)

def headline(name, kicker, plain, hl):
    pw = text_w(plain + " ", 76)
    hw = text_w(hl, 76) + 34
    b = f'<text x="8" y="36" font-family="{G.MONO}" font-size="26" fill="{G.MUTED}">{kicker}</text>'
    if plain:
        b += f'<text x="8" y="124" font-family="{G.HEAD}" font-weight="800" font-size="76" fill="{G.INK}">{plain}</text>'
    b += f'<rect x="{pw}" y="62" width="{hw}" height="80" rx="4" fill="{G.BROWN}" transform="rotate(-1.5 {pw+hw/2} 102)"/>'
    b += f'<text x="{pw+17}" y="124" font-family="{G.HEAD}" font-weight="800" font-size="76" fill="#fff">{hl}</text>'
    return layer(name, int(pw + hw + 20), 160, b)

def card_frame(name, w, h, lab, pill=None):
    b = G.card(6, 6, w - 20, h - 20)
    l1, w1 = G.label(32, 28, lab, size=22); b += l1
    if pill:
        l2, _ = G.label(32 + w1 + 12, 28, pill, dark=False, size=22); b += l2
    return layer(name, w, h, b)

# ---------------- easing / animation ----------------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease_out_back(x):
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
def ease_out(x): return 1 - (1 - x) ** 3

def place(canvas, im, x, y, t, t0, kind="pop", dur=0.45, t_out=None, alpha=1.0):
    """Draw im with its top-left at (x,y), animated in at t0."""
    if t < t0:
        return
    p = clamp((t - t0) / dur)
    a = alpha
    if t_out is not None and t > t_out:
        a *= 1 - clamp((t - t_out) / 0.25)
    if a <= 0:
        return
    sc, dx, dy = 1.0, 0, 0
    if kind == "pop":
        sc = 0.6 + 0.4 * ease_out_back(p); a *= clamp(p * 3)
    elif kind == "up":
        dy = (1 - ease_out(p)) * 60; a *= clamp(p * 2)
    elif kind == "left":
        dx = -(1 - ease_out(p)) * 120; a *= clamp(p * 2)
    elif kind == "drop":
        dy = -(1 - ease_out_back(p)) * 160; a *= clamp(p * 3)
    elif kind == "fade":
        a *= ease_out(p)
    img = im
    if abs(sc - 1) > 1e-3:
        nw, nh = max(1, int(im.width * sc)), max(1, int(im.height * sc))
        img = im.resize((nw, nh), Image.BILINEAR)
        dx += (im.width - nw) / 2; dy += (im.height - nh) / 2
    if a < 0.999:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda v: int(v * a)))
    canvas.alpha_composite(img, (int(x + dx), int(y + dy)))

# ---------------- persistent layers ----------------
BG = Image.open(f"{G.OUT}/png/01-latar-grid-1080x1920.png").convert("RGBA").resize((W, H))
BAR = layer("bar", 990, 100, open(f"{G.OUT}/svg/02-bar-browser.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0])
MASCOT = {e: layer(f"m-{e}", 400, 420, G.mascot(e)) for e in ["senyum", "hormat", "kaget", "mikir", "tegas"]}
MASCOT = {k: v.resize((360, 378), Image.LANCZOS) for k, v in MASCOT.items()}
MX, MY = 40, 1440  # mascot position (bottom-left, clear of TikTok right-side buttons)

def draw_mascot(canvas, t, timeline, scene_t0):
    """timeline: list of (local_time, expression). Bob + squash on change."""
    expr, last = timeline[0][1], timeline[0][0]
    for lt, e in timeline:
        if t >= lt:
            expr, last = e, lt
    bob = math.sin((scene_t0 + t) * 2 * math.pi * 0.6) * 7
    since = t - last
    s = 1 + 0.08 * math.exp(-since * 6) * math.cos(since * 18) if since < 1 else 1
    im = MASCOT[expr]
    if abs(s - 1) > 1e-3:
        im = im.resize((int(360 * s), int(378 * s)), Image.BILINEAR)
    canvas.alpha_composite(im, (int(MX + (360 - im.width) / 2), int(MY + bob + (378 - im.height))))

# ---------------- subtitles ----------------
FSUB = ImageFont.truetype(FB, 44)
def chunks(text):
    import re
    parts = [p.strip() for p in re.split(r"(?<=[\.\?,!])\s+", text) if p.strip()]
    out, cur = [], ""
    for p in parts:
        if len(cur) + len(p) < 46:
            cur = (cur + " " + p).strip()
        else:
            if cur: out.append(cur)
            cur = p
    if cur: out.append(cur)
    return out

def wrap(text, maxw):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        test = (cur + " " + w_).strip()
        if FSUB.getlength(test) <= maxw: cur = test
        else: lines.append(cur); cur = w_
    lines.append(cur)
    return lines

_subcache = {}
def sub_img(text):
    if text in _subcache: return _subcache[text]
    lines = wrap(text, 880)
    lh = 58; h = lh * len(lines) + 36
    w = int(max(FSUB.getlength(l) for l in lines)) + 56
    im = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 8, w + 7, h + 7), 18, fill=G.INK)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 18, fill=G.CARD, outline=G.INK, width=4)
    for i, l in enumerate(lines):
        lw = FSUB.getlength(l)
        d.text(((w - lw) / 2, 16 + i * lh), l, font=FSUB, fill=G.INK)
    _subcache[text] = im
    return im

def sub_schedule(narasi, dur):
    cs = chunks(narasi)
    total = sum(len(c) for c in cs)
    start, span, out = 0.25, dur - 0.55, []
    t = start
    for c in cs:
        d = span * len(c) / total
        out.append((t, t + d, c)); t += d
    return out

def draw_sub(canvas, t, sched):
    for a, b, c in sched:
        if a <= t < b:
            im = sub_img(c)
            p = clamp((t - a) / 0.15)
            y = 1250 + (1 - p) * 14
            canvas.alpha_composite(im, (int((W - im.width) / 2), int(y)))

# ---------------- scene content ----------------
I = G  # shorthand
def big_text_layer(name, lines, size=60, color=None, w=900):
    color = color or G.INK
    b = "".join(f'<text x="4" y="{size + i * (size + 14)}" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="{color}">{l}</text>' for i, l in enumerate(lines))
    return layer(name, w, int((size + 14) * len(lines) + 20), b)

def icon(n):
    return Image.open(f"{G.OUT}/png/{n}.png").convert("RGBA").resize((150, 150), Image.LANCZOS)

def row_layer(name, text, done=True, w=900, size=40):
    b = G.check(30, 34, 22, done)
    b += f'<text x="70" y="{34 + size*0.36}" font-family="{G.HEAD}" font-weight="700" font-size="{size}" fill="{G.INK}">{text}</text>'
    return layer(name, w, 70, b)

def chip_layer(name, title, sub):
    w = 410
    b = f'<rect x="7" y="7" width="{w}" height="150" rx="14" fill="{G.INK}"/>'
    b += f'<rect x="0" y="0" width="{w}" height="150" rx="14" fill="{G.GOLD_L}" stroke="{G.INK}" stroke-width="4"/>'
    b += f'<text x="28" y="78" font-family="{G.HEAD}" font-weight="800" font-size="62" fill="{G.INK}">{title}</text>'
    b += f'<text x="30" y="122" font-family="{G.MONO}" font-size="26" fill="{G.MUTED}">{sub}</text>'
    return layer(name, w + 10, 160, b)

CX = 45  # left margin of content
CARD_Y = 470

def scene1(c, t, D):
    o = D - 0.3
    place(c, BAR, CX, 110, t, 0.0, "drop", 0.6)
    place(c, headline("h1", "hari ini kita bahas →", "sekolah", "kedinasan."), CX, 260, t, 0.5, "left", 0.5, o)
    place(c, card_frame("c1", 990, 560, "episode 1", "seri kedinasan"), CX, CARD_Y, t, 1.0, "up", 0.5, o)
    place(c, big_text_layer("q1", ["Apa itu", "sekolah", "kedinasan?"], 96, G.BROWN), CX + 50, CARD_Y + 100, t, 1.4, "up", 0.5, o)
    place(c, icon("15-ikon-toga"), CX + 790, CARD_Y + 330, t, 2.2, "pop", 0.5, o)

def scene2(c, t, D):
    o = D - 0.3
    place(c, BAR, CX, 110, t, -9)
    place(c, headline("h2", "pengertian →", "jadi,", "apa itu?"), CX, 260, t, 0.1, "left", 0.5, o)
    place(c, card_frame("c2", 990, 700, "pengertian", "singkatnya"), CX, CARD_Y, t, 0.4, "up", 0.5, o)
    place(c, icon("19-ikon-gedung-kampus"), CX + 40, CARD_Y + 110, t, 1.0, "pop", 0.45, o)
    place(c, big_text_layer("d2a", ["perguruan tinggi milik", "kementerian / lembaga"], 46), CX + 215, CARD_Y + 130, t, 1.2, "left", 0.45, o)
    place(c, icon("17-ikon-medali"), CX + 40, CARD_Y + 330, t, 4.6, "pop", 0.45, o)
    place(c, big_text_layer("d2b", ["mencetak calon aparatur", "untuk instansinya sendiri"], 46), CX + 215, CARD_Y + 350, t, 4.8, "left", 0.45, o)
    # underline accent
    place(c, layer("ul2", 640, 20, f'<rect x="0" y="4" width="620" height="12" rx="6" fill="{G.GOLD}"/>'), CX + 215, CARD_Y + 540, t, 6.0, "left", 0.5, o)

def scene3(c, t, D):
    o = D - 0.3
    place(c, BAR, CX, 110, t, -9)
    place(c, headline("h3", "contohnya →", "siapa", "aja?"), CX, 260, t, 0.1, "left", 0.5, o)
    place(c, card_frame("c3", 990, 720, "contoh sekolah kedinasan", "bukan daftar lengkap"), CX, CARD_Y, t, 0.3, "up", 0.5, o)
    chips = [("Akpol", "Polri", 1.0), ("IPDN", "Kemendagri", 3.6), ("PKN STAN", "Kemenkeu", 5.4), ("STIS", "BPS", 7.4)]
    pos = [(CX + 50, CARD_Y + 100), (CX + 500, CARD_Y + 100), (CX + 50, CARD_Y + 290), (CX + 500, CARD_Y + 290)]
    for (ti, su, t0), (x, y) in zip(chips, pos):
        place(c, chip_layer(f"chip-{ti}", ti, su), x, y, t, t0, "pop", 0.45, o)
    place(c, big_text_layer("more3", ["+ masih banyak lagi"], 46, G.BROWN), CX + 50, CARD_Y + 500, t, 9.0, "left", 0.45, o)
    place(c, icon("19-ikon-gedung-kampus"), CX + 790, CARD_Y + 530, t, 9.3, "pop", 0.45, o)

def scene4(c, t, D):
    o = D - 0.3
    place(c, BAR, CX, 110, t, -9)
    place(c, headline("h4", "dibanding kampus biasa →", "bedanya", "apa?"), CX, 260, t, 0.1, "left", 0.5, o)
    place(c, card_frame("c4", 990, 400, "ciri khas", "umumnya"), CX, CARD_Y, t, 0.3, "up", 0.5, o)
    rows = [("biaya pendidikan ditanggung negara", 1.6), ("disiplin ala kehidupan taruna", 5.6), ("lulus, terikat dinas di instansinya", 8.4)]
    for i, (txt, t0) in enumerate(rows):
        place(c, row_layer(f"r4-{i}", txt, size=38), CX + 36, CARD_Y + 95 + i * 90, t, t0, "left", 0.4, o)
    place(c, layer("rp0", 550, 260, open(f"{G.OUT}/svg/07-kartu-angka-besar.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]), CX, CARD_Y + 440, t, 2.4, "pop", 0.5, o)
    place(c, icon("20-ikon-jam"), CX + 620, CARD_Y + 470, t, 6.0, "pop", 0.45, o)
    place(c, icon("21-ikon-dokumen-syarat"), CX + 800, CARD_Y + 470, t, 8.8, "pop", 0.45, o)

def scene5(c, t, D):
    o = D - 0.3
    place(c, BAR, CX, 110, t, -9)
    place(c, headline("h5", "eits →", "tapi", "jangan salah."), CX, 260, t, 0.1, "left", 0.5, o)
    place(c, card_frame("c5", 990, 720, "mitos vs fakta"), CX, CARD_Y, t, 0.3, "up", 0.5, o)
    mit = (f'<rect x="0" y="0" width="900" height="220" rx="14" fill="#F7DCD6" stroke="{G.INK}" stroke-width="3.5"/>'
           f'<circle cx="52" cy="54" r="24" fill="{G.RED}" stroke="{G.INK}" stroke-width="3"/><path d="M42 44 l20 20 M62 44 l-20 20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
           f'<text x="92" y="70" font-family="{G.HEAD}" font-weight="800" font-size="40" fill="{G.RED}">MITOS</text>'
           f'<text x="32" y="150" font-family="{G.HEAD}" font-weight="700" font-size="40" fill="{G.INK}">"masuknya gampang, tinggal daftar"</text>')
    fak = (f'<rect x="0" y="0" width="900" height="300" rx="14" fill="{G.GOLD_L}" stroke="{G.INK}" stroke-width="3.5"/>'
           + G.check(52, 54, 24, True) +
           f'<text x="92" y="70" font-family="{G.HEAD}" font-weight="800" font-size="40" fill="{G.BROWN_D}">FAKTA</text>'
           f'<text x="32" y="148" font-family="{G.HEAD}" font-weight="700" font-size="40" fill="{G.INK}">seleksinya ketat:</text>')
    place(c, layer("mitos5", 910, 230, mit), CX + 40, CARD_Y + 90, t, 1.6, "pop", 0.45, o)
    place(c, layer("fakta5", 910, 310, fak), CX + 40, CARD_Y + 340, t, 4.0, "pop", 0.45, o)
    tags = [("akademik", 5.4), ("kesehatan", 6.6), ("jasmani", 7.4), ("psikotes", 8.3)]
    x = CX + 72
    for tg, t0 in tags:
        L, wl = G.label(0, 0, tg, dark=True, size=30)
        im = layer(f"tag-{tg}", int(wl) + 4, 48, L)
        place(c, im, x, CARD_Y + 540, t, t0, "pop", 0.35, o)
        x += im.width + 14
    st = open(f"{G.OUT}/svg/14-stiker-cap-penting.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]
    place(c, layer("penting", 330, 130, st), CX + 640, CARD_Y - 60, t, 4.6, "pop", 0.4, o)

def scene6(c, t, D):
    place(c, BAR, CX, 110, t, -9)
    place(c, headline("h6", "next →", "episode", "berikutnya"), CX, 260, t, 0.1, "left", 0.5)
    place(c, card_frame("c6", 990, 560, "episode 2", "jangan sampai lewat"), CX, CARD_Y, t, 0.4, "up", 0.5)
    place(c, big_text_layer("n6", ["cara masuk &amp;", "tahapan seleksi"], 84, G.BROWN), CX + 50, CARD_Y + 110, t, 0.9, "up", 0.5)
    place(c, icon("16-ikon-kalender"), CX + 50, CARD_Y + 330, t, 2.2, "pop", 0.45)
    place(c, icon("21-ikon-dokumen-syarat"), CX + 220, CARD_Y + 330, t, 2.5, "pop", 0.45)
    place(c, icon("17-ikon-medali"), CX + 390, CARD_Y + 330, t, 2.8, "pop", 0.45)
    st = open(f"{G.OUT}/svg/11-stiker-siap.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]
    place(c, layer("siap6", 270, 150, st).resize((405, 225), Image.LANCZOS), CX + 500, 1500, t, 6.4, "pop", 0.45)

SCENES = [
    (scene1, [(0, "hormat"), (3.2, "senyum")]),
    (scene2, [(0, "senyum"), (4.6, "tegas")]),
    (scene3, [(0, "senyum"), (9.0, "kaget")]),
    (scene4, [(0, "mikir"), (1.6, "senyum"), (8.4, "tegas")]),
    (scene5, [(0, "kaget"), (4.0, "tegas")]),
    (scene6, [(0, "senyum"), (6.3, "hormat")]),
]

def frame(i, t):
    fn, mt = SCENES[i]
    D = NASKAH["adegan"][i]["durasi"]
    c = BG.copy()
    fn(c, t, D)
    draw_mascot(c, t, mt, sum(a["durasi"] for a in NASKAH["adegan"][:i]))
    draw_sub(c, t, sub_schedule(NASKAH["adegan"][i]["narasi"], D))
    return c

def render_scene(i):
    D = NASKAH["adegan"][i]["durasi"]
    n = int(round(D * FPS))
    tmp, out = f"{EP}/scenes/s{i+1}.tmp.mp4", f"{EP}/scenes/s{i+1}.mp4"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for f in range(n):
        p.stdin.write(frame(i, f / FPS).convert("RGB").tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out)

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "still":
        for spec in sys.argv[2:]:
            i, t = spec.split("@")
            frame(int(i) - 1, float(t)).convert("RGB").save(f"{EP}/still-{i}-{t}.png")
    else:
        for i in map(int, sys.argv[2:]):
            render_scene(i - 1)
            print("scene", i, "done", flush=True)
