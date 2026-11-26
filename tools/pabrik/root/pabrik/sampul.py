"""Sampul (cover) 1080x1920 untuk tiap episode. Teks utama ada di zona aman crop grid 3:4 (y 240-1680).
Pemakaian: python3 sampul.py <naskah.json> <out.png>   (naskah.json berisi kunci "sampul")
"""
import json, sys
from PIL import Image
sys.argv_backup = sys.argv; sys.argv = ["x", "none"]
sys.path.insert(0, "/home/claude/ep1/el"); sys.path.insert(0, "/home/claude")
import render_final as F
import maskot_adiva as MA
sys.argv = sys.argv_backup
R, G = F.R, F.G
W, H = 1080, 1920

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")

def fit(t, size, maxw):
    while size > 60 and R.text_w(t, size) > maxw: size -= 4
    return size

def make(sp, out):
    c = R.BG.copy(); c.alpha_composite(R.BAR, (45, 110))
    b = ""
    # label episode
    ep, seri = sp.get("ep", ""), sp.get("seri", "SERI SEKOLAH KEDINASAN")
    we = R.text_w(ep, 44) + 56; ws = len(seri) * 23 + 48
    x0 = (W - (we + ws)) / 2
    b += (f'<rect x="{x0}" y="300" width="{we}" height="78" rx="12" fill="{G.INK}"/>'
          f'<text x="{x0+we/2}" y="354" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="44" fill="{G.GOLD}">{esc(ep)}</text>'
          f'<rect x="{x0+we}" y="300" width="{ws}" height="78" rx="12" fill="{G.CARD}" stroke="{G.INK}" stroke-width="4"/>'
          f'<text x="{x0+we+ws/2}" y="350" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="36" fill="{G.INK}">{esc(seri)}</text>')
    y = 680
    for ln in sp.get("atas", []):
        s = fit(ln, 124, 960)
        b += f'<text x="540" y="{y}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="{G.INK}">{esc(ln)}</text>'
        y += s + 20
    hl = sp.get("hl", "")
    if hl:
        s = fit(hl, 132, 900); w = R.text_w(hl, s) + 70; h = s + 52
        b += (f'<g transform="rotate(-2 540 {y})"><rect x="{540-w/2+10}" y="{y-s*0.82+10}" width="{w}" height="{h}" rx="10" fill="{G.INK}"/>'
              f'<rect x="{540-w/2}" y="{y-s*0.82}" width="{w}" height="{h}" rx="10" fill="{G.BROWN}"/>'
              f'<text x="540" y="{y+s*0.2}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{s}" fill="#fff">{esc(hl)}</text></g>')
        y += h + 40
    for ln in sp.get("bawah", []):
        s = fit(ln, 84, 960)
        b += f'<text x="540" y="{y+20}" text-anchor="middle" font-family="{G.HEAD}" font-weight="700" font-size="{s}" fill="{G.BROWN_D}">{esc(ln)}</text>'
        y += s + 16
    st = sp.get("stiker")
    if st:
        ws2 = R.text_w(st, 60) + 60
        b += (f'<g transform="rotate(5 780 470)"><rect x="{780-ws2/2}" y="420" width="{ws2}" height="96" rx="10" fill="{G.CARD}" stroke="{G.RED}" stroke-width="7"/>'
              f'<text x="780" y="490" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="60" fill="{G.RED}">{esc(st)}</text></g>')
    my = 1185
    b += (f'<ellipse cx="540" cy="{my+452}" rx="210" ry="24" fill="{G.INK}" opacity="0.12"/>'
          f'<text x="540" y="1760" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="38" fill="{G.MUTED}">@catatan.abdinegara</text>')
    c.alpha_composite(R.layer(f"sampul-{abs(hash(json.dumps(sp)))}", W, H, b), (0, 0))
    ma = R.layer(f"ma-big-{sp.get('maskot','senyum')}", 400, 420, MA.face(sp.get("maskot", "senyum"), cap=True)).resize((440, 462), Image.LANCZOS)
    c.alpha_composite(ma, (320, my))
    c.convert("RGB").save(out)
    return out

if __name__ == "__main__":
    d = json.load(open(sys.argv[1])); make(d["sampul"], sys.argv[2])
