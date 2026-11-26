"""Carousel feed IG 1080x1350: Tryout SKD Akbar Gratis 7 Desember 2026."""
import sys
from PIL import Image
import sampul as S
R, G, MA = S.R, S.G, S.MA
W, H = 1080, 1350
esc = S.esc

def base():
    c = R.BG.crop((0, 0, W, H)).copy()
    c.alpha_composite(R.BAR, (45, 40))
    return c

def tw(t, s): return R.text_w(t, s)

def fit(t, size, maxw, mn=40):
    while size > mn and tw(t, size) > maxw: size -= 2
    return size

def hlbox(text, cx, y, size, rot=-2, fill=None):
    s = fit(text, size, 940); w = tw(text, s) + 70; h = s + 46
    return (f'<g transform="rotate({rot} {cx} {y})"><rect x="{cx-w/2+10}" y="{y-s*0.82+10}" width="{w}" height="{h}" rx="12" fill="{G.INK}"/>'
            f'<rect x="{cx-w/2}" y="{y-s*0.82}" width="{w}" height="{h}" rx="12" fill="{fill or G.BROWN}"/>'
            f'<text x="{cx}" y="{y+s*0.18}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="#fff">{esc(text)}</text></g>'), h

def stamp(text, cx, cy, size=58, rot=6, col=None):
    col = col or G.RED; w = tw(text, size) + 60
    return (f'<g transform="rotate({rot} {cx} {cy})"><rect x="{cx-w/2}" y="{cy-size*0.85}" width="{w}" height="{size*1.6}" rx="10" fill="{G.CARD}" stroke="{col}" stroke-width="7"/>'
            f'<text x="{cx}" y="{cy+size*0.32}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="{col}">{esc(text)}</text></g>')

def chip(text, x, y, dark=True):
    w = len(text) * 21 + 44
    fill, tc = (G.INK, G.GOLD) if dark else (G.CARD, G.INK)
    return f'<rect x="{x}" y="{y}" width="{w}" height="62" rx="10" fill="{fill}" stroke="{G.INK}" stroke-width="4"/><text x="{x+w/2}" y="{y+42}" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="32" fill="{tc}">{esc(text)}</text>', w

def spark(x, y, s=1.0, col=None):
    col = col or G.GOLD_B
    return (f'<g transform="translate({x} {y}) scale({s})" stroke="{col}" stroke-width="6" stroke-linecap="round">'
            '<line x1="0" y1="-34" x2="0" y2="34"/><line x1="-34" y1="0" x2="34" y2="0"/><line x1="-22" y1="-22" x2="22" y2="22"/><line x1="-22" y1="22" x2="22" y2="-22"/></g>')

def card(x, y, w, h, rot=0, fill=None):
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x+10}" y="{y+10}" width="{w}" height="{h}" rx="16" fill="{G.INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="{fill or G.CARD}" stroke="{G.INK}" stroke-width="5"/></g>')

def footer(n, total=4, geser=True):
    b = f'<text x="60" y="1300" font-family="{G.MONO}" font-weight="700" font-size="32" fill="{G.MUTED}">@catatan.abdinegara</text>'
    b += f'<text x="1020" y="1300" text-anchor="end" font-family="{G.MONO}" font-weight="700" font-size="32" fill="{G.MUTED}">{n}/{total}{"  geser →" if geser else ""}</text>'
    return b

def mascot(c, face, x, y, w):
    im = R.layer(f"ma-big-{face}", 400, 420, MA.face(face, cap=True)).resize((w, int(w * 1.05)), Image.LANCZOS)
    c.alpha_composite(im, (x, y))

def put(c, key, svg):
    c.alpha_composite(R.layer(f"feed-{key}-{abs(hash(svg))}", W, H, svg), (0, 0))

# ---------- slide 1: cover ----------
def s1(out):
    c = base(); b = ""
    ch, w = chip("TRYOUT AKBAR #1", 60, 190); b += ch
    b += stamp("GRATIS!", 830, 225, 64, 7)
    b += f'<text x="60" y="400" font-family="{G.HEAD}" font-weight="800" font-size="150" fill="{G.INK}">Tryout</text>'
    hb, hh = hlbox("SKD GRATIS", 520, 560, 140, -3); b += hb
    b += f'<text x="60" y="740" font-family="{G.HEAD}" font-weight="700" font-size="54" fill="{G.BROWN_D}">untuk pejuang sekolah</text>'
    b += f'<text x="60" y="805" font-family="{G.HEAD}" font-weight="700" font-size="54" fill="{G.BROWN_D}">kedinasan &amp; CPNS</text>'
    # kartu tanggal (kalender)
    b += card(60, 880, 560, 300, -2)
    b += f'<g transform="rotate(-2 340 1030)"><rect x="60" y="880" width="560" height="84" rx="16" fill="{G.RED}" stroke="{G.INK}" stroke-width="5"/>'
    b += f'<text x="340" y="937" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="40" fill="#fff">DESEMBER 2026</text>'
    b += f'<text x="200" y="1130" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="170" fill="{G.INK}">7</text>'
    b += f'<text x="440" y="1060" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="58" fill="{G.BROWN}">SENIN</text>'
    b += f'<text x="440" y="1120" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="30" fill="{G.MUTED}">online</text></g>'
    b += spark(960, 420, 1.1) + spark(700, 860, 0.7, G.RED) + spark(1010, 760, 0.6)
    b += footer(1)
    put(c, "s1", b)
    mascot(c, "hormat", 650, 820, 400)
    c.convert("RGB").save(out)

# ---------- slide 2: yang didapat ----------
def s2(out):
    c = base(); b = ""
    b += f'<text x="60" y="250" font-family="{G.HEAD}" font-weight="800" font-size="96" fill="{G.INK}">Yang kamu</text>'
    hb, _ = hlbox("dapat:", 260, 370, 100, -3); b += hb
    items = [("110", "soal", "TWK · TIU · TKP"), ("100", "menit", "timer seperti CAT"),
             ("skor", "langsung", "nilai per subtes"), ("rank", "peserta", "papan peringkat")]
    pos = [(60, 470, -2), (560, 470, 2), (60, 830, 1.5), (560, 830, -2)]
    fills = [G.CARD, G.GOLD_L, G.GOLD_L, G.CARD]
    for (big, unit, sub), (x, y, r), f in zip(items, pos, fills):
        b += card(x, y, 460, 320, r, f)
        cx = x + 230
        b += f'<g transform="rotate({r} {cx} {y+160})">'
        s = fit(big, 130, 400)
        b += f'<text x="{cx}" y="{y+150}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="{G.BROWN}">{esc(big)}</text>'
        b += f'<text x="{cx}" y="{y+215}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="52" fill="{G.INK}">{esc(unit)}</text>'
        b += f'<text x="{cx}" y="{y+270}" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="28" fill="{G.MUTED}">{esc(sub)}</text></g>'
    b += stamp("100% GRATIS", 850, 375, 44, 6)
    b += footer(2)
    put(c, "s2", b)
    c.convert("RGB").save(out)

# ---------- slide 3: cara ikut ----------
def s3(out):
    c = base(); b = ""
    b += f'<text x="60" y="250" font-family="{G.HEAD}" font-weight="800" font-size="96" fill="{G.INK}">Cara</text>'
    cxk = 60 + tw("Cara", 96) + 40 + (tw("ikutan:", 100) + 70) / 2
    hb, _ = hlbox("ikutan:", cxk, 250, 100, -3); b += hb
    steps = [("Klik link di bio", "@catatan.abdinegara"),
             ("Daftar akun", "di web tryout kami"),
             ("Gabung grup Telegram", "info jam & link di sana"),
             ("Kerjakan tryout", "Senin, 7 Desember 2026")]
    y = 360
    for i, (t, s) in enumerate(steps):
        r = (-1.2, 1.0, -0.8, 1.2)[i]
        b += card(60, y, 660, 190, r, G.GOLD_L if i == 3 else G.CARD)
        b += f'<g transform="rotate({r} 400 {y+95})">'
        b += f'<circle cx="140" cy="{y+95}" r="50" fill="{G.INK}"/><text x="140" y="{y+117}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="60" fill="{G.GOLD}">{i+1}</text>'
        ts = fit(t, 50, 490)
        b += f'<text x="215" y="{y+88}" font-family="{G.HEAD}" font-weight="800" font-size="{ts}" fill="{G.INK}">{esc(t)}</text>'
        b += f'<text x="215" y="{y+140}" font-family="{G.MONO}" font-weight="700" font-size="28" fill="{G.MUTED}">{esc(s)}</text></g>'
        y += 220
    b += stamp("JANGAN TELAT!", 905, 255, 30, 6)
    b += footer(3)
    put(c, "s3", b)
    mascot(c, "tegas", 760, 800, 290)
    c.convert("RGB").save(out)

# ---------- slide 4: ajak teman ----------
def s4(out):
    c = base(); b = ""
    b += f'<text x="540" y="290" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="104" fill="{G.INK}">Jangan berjuang</text>'
    hb, _ = hlbox("sendirian!", 540, 430, 120, -3); b += hb
    acts = [("TAG", "teman satu perjuangan"), ("SAVE", "biar nggak lupa tanggalnya"), ("FOLLOW", "info tryout berikutnya")]
    y = 560
    for i, (a, t) in enumerate(acts):
        b += card(80, y, 600, 120, (-1, 1, -1)[i])
        aw = tw(a, 44) + 40
        b += f'<g transform="rotate({(-1,1,-1)[i]} 380 {y+60})"><rect x="105" y="{y+27}" width="{aw}" height="66" rx="10" fill="{G.BROWN}"/>'
        b += f'<text x="{105+aw/2}" y="{y+76}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="44" fill="#fff">{a}</text>'
        b += f'<text x="{125+aw}" y="{y+74}" font-family="{G.HEAD}" font-weight="700" font-size="{fit(t, 34, 600-aw-60, 24)}" fill="{G.INK}">{esc(t)}</text></g>'
        y += 150
    b += (f'<rect x="80" y="1030" width="920" height="150" rx="14" fill="{G.CARD}" stroke="{G.INK}" stroke-width="4" stroke-dasharray="14 10"/>'
          f'<text x="110" y="1090" font-family="{G.MONO}" font-weight="700" font-size="27" fill="{G.MUTED}">Tryout latihan dari Catatan Abdi Negara,</text>'
          f'<text x="110" y="1135" font-family="{G.MONO}" font-weight="700" font-size="27" fill="{G.MUTED}">bukan tes resmi BKN. Soal buatan tim, bukan soal asli.</text>')
    b += spark(1000, 560, 0.8) + spark(980, 980, 0.6, G.RED)
    b += footer(4, geser=False)
    put(c, "s4", b)
    mascot(c, "senyum", 730, 600, 290)
    c.convert("RGB").save(out)

if __name__ == "__main__":
    d = sys.argv[1]
    for i, f in enumerate([s1, s2, s3, s4], 1): f(f"{d}/feed-tryout-7des-{i}.png")
