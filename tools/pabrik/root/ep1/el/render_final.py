"""Episode 1 versi cepat (gaya Reels): potongan 2-3 detik, animasi 0.25 dtk, subtitle 2-3 kata."""
import json, math, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, "/home/claude/ep1")
import render as R
G = R.G
W, H, FPS = 1080, 1920, 30
DIR = "/home/claude/ep1/el"
os.makedirs(f"{DIR}/scenes", exist_ok=True)
N = json.load(open(f"{DIR}/naskah.json"))["adegan"]
CX, TOP = 45, 300


# --- branding final: maskot wajah user + handle akun ---
import importlib.util as _ilu
_spec=_ilu.spec_from_file_location('maskot_adiva','/home/claude/maskot_adiva.py'); _MA=_ilu.module_from_spec(_spec); _spec.loader.exec_module(_MA)
R.MASCOT = {e: R.layer(f"ma-{e}", 400, 420, _MA.face(e, cap=True)).resize((360, 378), Image.LANCZOS) for e in ["senyum","hormat","kaget","mikir","tegas"]}
_bar = open(f"{G.OUT}/svg/02-bar-browser.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]
for a, b in [('cx="760" cy="45" r="10"', 'cx="688" cy="45" r="10"'), ('x1="767" y1="52" x2="776" y2="61"', 'x1="695" y1="52" x2="704" y2="61"'),
             ('<rect x="796" y="27" width="160"', '<rect x="718" y="27" width="240"'), ('<circle cx="818" cy="47" r="13"', '<circle cx="740" cy="47" r="13"'),
             ('<text x="838" y="53"', '<text x="760" y="53"'), ('@akunanda', '@catatan.abdinegara')]:
    assert a in _bar, a; _bar = _bar.replace(a, b)
import re as _re
_bar = _re.sub(r'<polygon points="[^"]*" fill="[^"]*"/>', '', _bar) + G.star(740, 47, 8, G.BROWN)
R.BAR = R.layer("bar-final", 990, 100, _bar)

SCALE = [1.0]; LEAD = [0.0]
def P(c, im, x, y, t, t0, D, kind="pop", dur=0.25):
    R.place(c, im, x, y, t, t0 * SCALE[0] + (LEAD[0] if t0 > 0 else 0), kind, dur, D - 0.12)

def body(svgname):
    return open(f"{G.OUT}/svg/{svgname}.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]

def sticker(name, text, fill, fg, rot=-6, size=64):
    w = int(R.text_w(text, size) + 70)
    b = (f'<g transform="rotate({rot} {w/2+20} 70)"><rect x="28" y="28" width="{w}" height="{size+60}" rx="{(size+60)/2}" fill="{G.INK}"/>'
         f'<rect x="18" y="18" width="{w}" height="{size+60}" rx="{(size+60)/2}" fill="{fill}" stroke="{G.INK}" stroke-width="5"/>'
         f'<text x="{18+w/2}" y="{18+(size+60)/2+size*0.36}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="{fg}">{text}</text></g>')
    return R.layer(name, w + 60, size + 110, b)

def big(name, lines, size=110, color=None):
    return R.big_text_layer(name, lines, size, color or G.INK, 1000)

def icon(n, s=190):
    return Image.open(f"{G.OUT}/png/{n}.png").convert("RGBA").resize((s, s), Image.LANCZOS)

def hl_word(name, text, size=110):
    w = R.text_w(text, size) + 44
    b = (f'<rect x="0" y="10" width="{w}" height="{size*1.15}" rx="6" fill="{G.BROWN}" transform="rotate(-2 {w/2} {size*0.6})"/>'
         f'<text x="22" y="{size*0.98}" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="#fff">{text}</text>')
    return R.layer(name, int(w + 10), int(size * 1.35), b)

# ---------------- scenes ----------------
def s1(c, t, D):
    P(c, big("f1a", ["Kuliah,", "tapi dibiayai"], 104), CX + 10, TOP, t, 0.0, D, "left")
    P(c, hl_word("f1b", "negara?", 120), CX + 10, TOP + 250, t, 0.45, D, "pop")
    P(c, R.layer("f1rp", 550, 260, body("07-kartu-angka-besar")).resize((715, 338), Image.LANCZOS), CX + 250, TOP + 470, t, 0.9, D, "pop")

def s2(c, t, D):
    P(c, sticker("f2ada", "ADA!", G.GOLD, G.INK, -8, 90), CX, TOP - 20, t, 0.0, D, "pop")
    P(c, big("f2a", ["namanya"], 96, G.MUTED), CX + 10, TOP + 230, t, 0.35, D, "left")
    P(c, big("f2b", ["sekolah"], 132), CX + 10, TOP + 340, t, 0.55, D, "left")
    P(c, hl_word("f2c", "kedinasan.", 132), CX + 10, TOP + 500, t, 0.75, D, "pop")

def s3(c, t, D):
    P(c, R.card_frame("f3card", 990, 560, "pengertian"), CX, TOP, t, 0.0, D, "up")
    P(c, icon("19-ikon-gedung-kampus", 220), CX + 50, TOP + 110, t, 0.15, D, "pop")
    P(c, big("f3a", ["kampus milik"], 76), CX + 300, TOP + 120, t, 0.3, D, "left")
    P(c, big("f3b", ["kementerian /", "lembaga negara"], 76, G.BROWN), CX + 50, TOP + 350, t, 0.8, D, "left")

def s4(c, t, D):
    P(c, R.card_frame("f4card", 990, 560, "tujuannya"), CX, TOP, t, 0.0, D, "up")
    P(c, icon("17-ikon-medali", 220), CX + 50, TOP + 110, t, 0.15, D, "pop")
    P(c, big("f4a", ["cetak calon", "aparatur"], 80), CX + 300, TOP + 110, t, 0.35, D, "left")
    P(c, big("f4b", ["untuk instansinya", "sendiri"], 72, G.BROWN), CX + 50, TOP + 360, t, 1.3, D, "left")

def s5(c, t, D):
    P(c, big("f5a", ["contohnya?"], 96), CX + 10, TOP - 30, t, 0.0, D, "left")
    chips = [("Akpol", "Polri", 0.45), ("IPDN", "Kemendagri", 0.95), ("PKN STAN", "Kemenkeu", 1.45), ("STIS", "BPS", 2.0)]
    pos = [(CX + 30, TOP + 130), (CX + 500, TOP + 130), (CX + 30, TOP + 320), (CX + 500, TOP + 320)]
    for (ti, su, t0), (x, y) in zip(chips, pos):
        P(c, R.chip_layer(f"chip-{ti}", ti, su), x, y, t, t0, D, "pop")
    P(c, big("f5b", ["+ banyak lagi"], 72, G.BROWN), CX + 30, TOP + 530, t, 2.6, D, "left")

def s6(c, t, D):
    P(c, big("f6a", ["bedanya?"], 110), CX + 10, TOP - 20, t, 0.0, D, "left")
    rp = R.layer("f6rp", 550, 260, body("07-kartu-angka-besar")).resize((880, 416), Image.LANCZOS)
    P(c, rp, CX + 30, TOP + 170, t, 0.4, D, "pop")
    P(c, sticker("f6neg", "ditanggung negara", G.GOLD_L, G.BROWN_D, 4, 48), CX + 300, TOP + 560, t, 1.3, D, "pop")

def s7(c, t, D):
    P(c, big("f7a", ["hidupnya"], 96, G.MUTED), CX + 10, TOP - 20, t, 0.0, D, "left")
    P(c, hl_word("f7b", "disiplin", 140), CX + 10, TOP + 90, t, 0.25, D, "pop")
    P(c, big("f7c", ["ala taruna"], 100), CX + 10, TOP + 300, t, 0.85, D, "left")
    P(c, icon("20-ikon-jam", 200), CX + 740, TOP + 420, t, 1.0, D, "pop")

def s8(c, t, D):
    P(c, big("f8a", ["lulus →"], 96), CX + 10, TOP - 20, t, 0.0, D, "left")
    P(c, R.layer("f8k", 630, 390, body("10-kartu-identitas-taruna")).resize((882, 546), Image.LANCZOS), CX + 40, TOP + 140, t, 0.3, D, "pop")
    P(c, sticker("f8st", "ikatan dinas", G.BROWN, "#fff", -5, 56), CX + 420, TOP + 640, t, 1.1, D, "pop")

def s9(c, t, D):
    P(c, R.layer("f9p", 330, 130, body("14-stiker-cap-penting")).resize((660, 260), Image.LANCZOS), CX + 150, TOP - 20, t, 0.0, D, "pop")
    P(c, big("f9a", ["seleksinya"], 110), CX + 10, TOP + 300, t, 0.45, D, "left")
    P(c, hl_word("f9b", "KETAT!", 150), CX + 10, TOP + 430, t, 0.9, D, "pop")

def s10(c, t, D):
    tags = [("akademik", 0.0), ("kesehatan", 0.6), ("jasmani", 1.2), ("psikotes", 1.75)]
    for i, (tg, t0) in enumerate(tags):
        L, wl = G.label(0, 0, tg, dark=(i % 2 == 0), size=60)
        im = R.layer(f"f10-{tg}", int(wl) + 6, 80, L)
        P(c, im, CX + 30 + (i % 2) * 70, TOP + i * 150, t, t0, D, "left")
    P(c, icon("21-ikon-dokumen-syarat", 200), CX + 760, TOP + 470, t, 1.9, D, "pop")

def s11(c, t, D):
    P(c, big("f11a", ["cara masuknya?"], 96), CX + 10, TOP - 20, t, 0.0, D, "left")
    P(c, R.card_frame("f11card", 990, 380, "episode 2", "segera"), CX, TOP + 150, t, 0.5, D, "up")
    P(c, big("f11b", ["tonton episode", "berikutnya"], 80, G.BROWN), CX + 50, TOP + 240, t, 0.7, D, "left")
    P(c, sticker("f11siap", "SIAP!", G.GOLD_L, G.INK, -7, 90), CX + 470, 1480, t, 1.9, D, "pop")

SCENES = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11]
MASKOT = [[(0, "kaget")], [(0, "hormat")], [(0, "senyum")], [(0, "tegas")], [(0, "senyum")], [(0, "mikir"), (0.6, "senyum")],
          [(0, "tegas")], [(0, "senyum")], [(0, "kaget")], [(0, "tegas")], [(0, "senyum"), (1.9, "hormat")]]
KATA_KUNCI = {"negara", "negara?", "kedinasan.", "kementerian", "aparatur", "akpol,", "ipdn,", "stis,", "ditanggung", "disiplin,",
              "taruna.", "dinas", "ketat!", "psikotes.", "siap?", "berikutnya."}

# ---------------- subtitle: 2-3 kata, pop ----------------
FS = ImageFont.truetype(R.FB, 62)
def sub_chunks(text):
    words = text.split(); out, cur = [], []
    for w_ in words:
        cur.append(w_)
        if len(cur) == 3 or w_[-1] in ".,?!" and len(cur) >= 2:
            out.append(cur); cur = []
    if cur:
        if out and len(cur) == 1 and len(out[-1]) >= 2:
            cur = [out[-1].pop()] + cur
        out.append(cur)
    return [x for x in out if x]

_sc = {}
def sub_img(words):
    key = " ".join(words)
    if key in _sc: return _sc[key]
    sp = FS.getlength(" ")
    tw = sum(FS.getlength(w_) for w_ in words) + sp * (len(words) - 1)
    w, h = int(tw + 64), 96
    im = Image.new("RGBA", (w + 9, h + 9), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((9, 9, w + 8, h + 8), 20, fill=G.INK)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 20, fill=G.CARD, outline=G.INK, width=5)
    x = 32
    for w_ in words:
        col = G.BROWN if w_.lower() in KATA_KUNCI else G.INK
        d.text((x, 10), w_, font=FS, fill=col); x += FS.getlength(w_) + sp
    if im.width > 1010:
        im = im.resize((1010, int(im.height * 1010 / im.width)), Image.LANCZOS)
    _sc[key] = im
    return im

def draw_sub_times(c, t, text, D, subs):
    ch = sub_chunks(text)
    for k, x in enumerate(ch):
        a = subs[k] if k < len(subs) else D
        b = subs[k + 1] if k + 1 < len(subs) else D + 1
        if a <= t < b:
            im = sub_img(x)
            p = R.clamp((t - a) / 0.12)
            s = 0.85 + 0.15 * R.ease_out_back(p)
            im2 = im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
            c.alpha_composite(im2, (int((W - im2.width) / 2), int(1300 + (im.height - im2.height) / 2)))

def draw_sub(c, t, text, D, speech=None, lead=0.12):
    ch = sub_chunks(text)
    total = sum(len(" ".join(x)) for x in ch)
    a = lead
    span = speech if speech else D - 0.08
    for x in ch:
        d = span * len(" ".join(x)) / total
        if x is ch[-1]: d += D  # keep the last chunk until the cut
        if a <= t < a + d:
            im = sub_img(x)
            p = R.clamp((t - a) / 0.12)
            s = 0.85 + 0.15 * R.ease_out_back(p)
            im2 = im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
            c.alpha_composite(im2, (int((W - im2.width) / 2), int(1300 + (im.height - im2.height) / 2)))
        a += d

# ---------------- frame ----------------
def frame(i, t):
    D = N[i]["durasi"]
    c = R.BG.copy()
    c.alpha_composite(R.BAR, (CX, 110))
    content = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    SCALE[0] = N[i]["audio"] / N[i]["durasi_lama"]; LEAD[0] = N[i].get("lead", 0)
    SCENES[i](content, t, D)
    # punch-in at every cut
    k = R.clamp(t / 0.22)
    s = 1.06 - 0.06 * R.ease_out(k)
    if s > 1.001:
        cw, ch_ = int(W / s), int(H / s)
        cx0, cy0 = (W - cw) // 2, (H - ch_) // 2
        content = content.crop((cx0, cy0, cx0 + cw, cy0 + ch_)).resize((W, H), Image.BILINEAR)
    c.alpha_composite(content)
    t0 = sum(a["durasi"] for a in N[:i])
    R.draw_mascot(c, t, [(lt * SCALE[0], e) for lt, e in MASKOT[i]], t0)
    draw_sub_times(c, t, N[i]["narasi"], D, N[i]["subs"])
    # thin progress bar at bottom
    total = sum(a["durasi"] for a in N)
    prog = (t0 + t) / total
    d = ImageDraw.Draw(c)
    d.rectangle((0, H - 14, int(W * prog), H), fill=G.BROWN)
    return c

def render_scene(i):
    D = N[i]["durasi"]; n = int(round(D * FPS))
    tmp, out = f"{DIR}/scenes/s{i+1:02d}.tmp.mp4", f"{DIR}/scenes/s{i+1:02d}.mp4"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for f in range(n):
        p.stdin.write(frame(i, f / FPS).convert("RGB").tobytes())
    p.stdin.close()
    if p.wait() == 0:
        os.replace(tmp, out)

if __name__ == "__main__":
    if sys.argv[1] == "still":
        ims = []
        for spec in sys.argv[2:]:
            i, t = spec.split("@")
            ims.append(frame(int(i) - 1, float(t)).convert("RGB").resize((360, 640)))
        cols = 6; rows = (len(ims) + cols - 1) // cols
        o = Image.new("RGB", (cols * 370, rows * 650), "white")
        for k, im in enumerate(ims): o.paste(im, ((k % cols) * 370, (k // cols) * 650))
        o.save("/tmp/fast.png")
    else:
        for i in map(int, sys.argv[2:]):
            render_scene(i - 1); print("scene", i, flush=True)
