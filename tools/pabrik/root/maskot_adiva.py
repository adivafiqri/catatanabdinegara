"""Maskot kartun berbasis wajah user (bukan foto) — beberapa ekspresi, dengan/tanpa pet, opsi kacamata."""
import os, subprocess, sys
sys.path.insert(0, "/home/claude")
import gen_kedinasan as G

OUT = "/home/claude/maskot-adiva"
os.makedirs(f"{OUT}/svg", exist_ok=True); os.makedirs(f"{OUT}/png", exist_ok=True)
INK = G.INK
SKIN = "#D9A07C"; SKIN_S = "#C0805C"; SKIN_D = "#A9694A"; HAIR = "#1C1411"; FADE = "#6A5A50"
LIP = "#A85A4E"; MOUTH = "#6E2A22"; BLUSH = "#E58C78"

def stroke(w=7): return f'stroke="{INK}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'

def brows(kind):
    # thick straight brows (ciri khas)
    shapes = {
        "normal":  ("M120 206 L176 200 L177 213 L121 218z", "M224 200 L280 206 L279 218 L223 213z"),
        "angkat":  ("M120 194 Q148 180 177 190 L176 203 Q148 194 121 207z", "M223 190 Q252 180 280 194 L279 207 Q252 194 224 203z"),
        "marah":   ("M120 196 L177 212 L174 225 L118 209z", "M280 196 L223 212 L226 225 L282 209z"),
        "mikir":   ("M120 210 L177 206 L177 219 L121 222z", "M223 194 Q252 184 280 196 L279 209 Q252 198 224 207z"),
        "sedih":   ("M120 212 L177 198 L178 211 L122 225z", "M280 212 L223 198 L222 211 L278 225z"),
    }
    a, b = shapes[kind]
    return f'<path d="{a}" fill="{HAIR}"/><path d="{b}" fill="{HAIR}"/>'

def eyes(kind):
    L, R = 150, 250; y = 240
    if kind == "normal":
        e = ""
        for cx in (L, R):
            e += f'<path d="M{cx-24} {y} Q{cx} {y-17} {cx+24} {y} Q{cx} {y+12} {cx-24} {y}z" fill="#fff" {stroke(4)}/>'
            e += f'<circle cx="{cx}" cy="{y-1}" r="10" fill="{HAIR}"/><circle cx="{cx+3}" cy="{y-5}" r="3.5" fill="#fff"/>'
            e += f'<path d="M{cx-26} {y-1} Q{cx} {y-20} {cx+26} {y-1}" fill="none" {stroke(5)}/>'
        return e
    if kind == "senyum":
        return "".join(f'<path d="M{cx-22} {y+2} Q{cx} {y-16} {cx+22} {y+2}" fill="none" {stroke(7)}/>' for cx in (L, R))
    if kind == "kaget":
        e = ""
        for cx in (L, R):
            e += f'<ellipse cx="{cx}" cy="{y-2}" rx="22" ry="19" fill="#fff" {stroke(5)}/><circle cx="{cx}" cy="{y-1}" r="8" fill="{HAIR}"/>'
        return e
    if kind == "marah":
        e = ""
        for cx, s in ((L, 1), (R, -1)):
            e += f'<path d="M{cx-22} {y-2} Q{cx} {y-10} {cx+22} {y-2} Q{cx} {y+10} {cx-22} {y-2}z" fill="#fff" {stroke(4)}/>'
            e += f'<circle cx="{cx}" cy="{y}" r="8" fill="{HAIR}"/>'
            e += f'<path d="M{cx-24} {y-6 + (6 if s<0 else 0)} L{cx+24} {y-6 + (6 if s>0 else 0)}" {stroke(6)}/>'
        return e
    if kind == "kedip":
        e = f'<path d="M{L-22} {y+2} Q{L} {y-16} {L+22} {y+2}" fill="none" {stroke(7)}/>'
        e += f'<path d="M{R-24} {y} Q{R} {y-17} {R+24} {y} Q{R} {y+12} {R-24} {y}z" fill="#fff" {stroke(4)}/><circle cx="{R}" cy="{y-1}" r="10" fill="{HAIR}"/><circle cx="{R+3}" cy="{y-5}" r="3.5" fill="#fff"/>'
        return e
    if kind == "mikir":
        e = f'<path d="M{L-22} {y} L{L+22} {y-2}" {stroke(7)}/>'
        e += f'<path d="M{R-24} {y} Q{R} {y-17} {R+24} {y} Q{R} {y+12} {R-24} {y}z" fill="#fff" {stroke(4)}/><circle cx="{R+6}" cy="{y-4}" r="10" fill="{HAIR}"/>'
        return e
    if kind == "sedih":
        e = ""
        for cx in (L, R):
            e += f'<path d="M{cx-22} {y} Q{cx} {y-12} {cx+22} {y} Q{cx} {y+12} {cx-22} {y}z" fill="#fff" {stroke(4)}/><circle cx="{cx}" cy="{y+2}" r="9" fill="{HAIR}"/>'
        e += f'<path d="M{L+8} {y+16} q-6 14 0 20 q6 -6 0 -20z" fill="#8EC5E8" stroke="{INK}" stroke-width="2.5"/>'
        return e
    return ""

def mouth(kind):
    if kind == "senyum":
        return f'<path d="M168 318 Q200 344 232 318 Q200 330 168 318z" fill="{MOUTH}" {stroke(5)}/><path d="M176 321 Q200 332 224 321" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
    if kind == "ketawa":
        return (f'<path d="M160 312 Q200 314 240 312 Q236 356 200 360 Q164 356 160 312z" fill="{MOUTH}" {stroke(5)}/>'
                f'<path d="M168 314 Q200 318 232 314 L230 324 Q200 328 170 324z" fill="#fff"/>'
                f'<path d="M182 348 Q200 338 218 348 Q200 356 182 348z" fill="#E07A6C"/>')
    if kind == "marah":
        return f'<path d="M172 332 Q200 318 228 332" fill="none" {stroke(7)}/>'
    if kind == "kaget":
        return f'<ellipse cx="200" cy="330" rx="17" ry="21" fill="{MOUTH}" {stroke(5)}/>'
    if kind == "mikir":
        return f'<path d="M180 326 Q200 318 224 330" fill="none" {stroke(6)}/>'
    if kind == "tegas":
        return f'<path d="M176 324 Q200 328 224 324" fill="none" {stroke(6)}/><path d="M184 332 Q200 338 216 332" fill="none" stroke="{LIP}" stroke-width="4" stroke-linecap="round"/>'
    if kind == "sedih":
        return f'<path d="M176 334 Q200 318 224 334" fill="none" {stroke(6)}/>'
    if kind == "kedip":
        return f'<path d="M170 316 Q204 342 232 312" fill="none" {stroke(7)}/>'
    return ""

EXPR = {
    "senyum": ("normal", "senyum", "senyum"),
    "ketawa": ("angkat", "senyum", "ketawa"),
    "marah":  ("marah", "marah", "marah"),
    "kaget":  ("angkat", "kaget", "kaget"),
    "mikir":  ("mikir", "mikir", "mikir"),
    "tegas":  ("normal", "normal", "tegas"),
    "kedip":  ("normal", "kedip", "kedip"),
    "sedih":  ("sedih", "sedih", "sedih"),
    "hormat": ("normal", "normal", "senyum"),
}

def face(expr, cap=True, glasses=False):
    br, ey, mo = EXPR[expr]
    m = f'<ellipse cx="200" cy="404" rx="96" ry="12" fill="{INK}" opacity="0.15"/>'
    # white sticker outline
    m += f'<ellipse cx="200" cy="236" rx="156" ry="156" fill="#fff"/>'
    m += f'<ellipse cx="200" cy="{84 if cap else 100}" rx="{172 if cap else 140}" ry="72" fill="#fff"/>'
    if expr == "hormat":
        m += f'<ellipse cx="318" cy="150" rx="70" ry="44" fill="#fff" transform="rotate(-35 318 150)"/><rect x="300" y="200" width="100" height="200" rx="40" fill="#fff"/>'
    # ears (prominent)
    for cx, d in ((76, 1), (324, -1)):
        m += f'<ellipse cx="{cx}" cy="236" rx="26" ry="36" fill="{SKIN}" {stroke(6)}/>'
        m += f'<path d="M{cx + 8*d} 220 Q{cx - 4*d} 236 {cx + 8*d} 254" fill="none" stroke="{SKIN_S}" stroke-width="5" stroke-linecap="round"/>'
    # face: oval with full cheeks, soft jaw
    m += f'<path d="M92 210 Q90 318 150 356 Q200 382 250 356 Q310 318 308 210 Q306 126 200 120 Q94 126 92 210z" fill="{SKIN}" {stroke(7)}/>'
    # cheek shade
    m += f'<path d="M104 280 Q120 340 170 362" fill="none" stroke="{SKIN_S}" stroke-width="8" opacity="0.35" stroke-linecap="round"/>'
    m += f'<path d="M296 280 Q280 340 230 362" fill="none" stroke="{SKIN_S}" stroke-width="8" opacity="0.35" stroke-linecap="round"/>'
    if not cap:
        # crew cut: short flat top, straight hairline, faded sides
        m += f'<path d="M94 206 Q90 150 104 120 Q130 74 200 70 Q270 74 296 120 Q310 150 306 206 L296 206 Q294 176 280 164 Q262 150 240 152 Q200 146 160 152 Q138 150 120 164 Q106 176 104 206z" fill="{HAIR}" {stroke(6)}/>'
        m += f'<path d="M96 206 Q94 176 104 160 L112 166 Q104 186 106 214z" fill="{FADE}" opacity="0.85"/><path d="M304 206 Q306 176 296 160 L288 166 Q296 186 294 214z" fill="{FADE}" opacity="0.85"/>'
        m += "".join(f'<path d="M{x} {y} l6 -10" stroke="#3A2E29" stroke-width="3" stroke-linecap="round"/>' for x, y in [(140, 104), (172, 92), (206, 88), (240, 94), (268, 108), (156, 128), (226, 124)])
    else:
        m += f'<path d="M94 206 Q94 172 106 158 L116 164 Q106 186 106 216z M306 206 Q306 172 294 158 L284 164 Q294 186 294 216z" fill="{FADE}" {stroke(4)}/>'
    # brows, eyes, nose, mouth
    m += brows(br) + eyes(ey)
    m += f'<path d="M190 256 Q186 276 180 286 Q186 296 200 296 Q214 296 220 286 Q214 276 210 256" fill="none" stroke="{SKIN_D}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    m += f'<ellipse cx="189" cy="289" rx="5" ry="3" fill="{SKIN_D}"/><ellipse cx="211" cy="289" rx="5" ry="3" fill="{SKIN_D}"/>'
    m += f'<path d="M176 306 Q200 300 224 306" fill="none" stroke="{SKIN_D}" stroke-width="4" opacity="0.35" stroke-linecap="round"/>'  # tipis kumis
    m += f'<ellipse cx="124" cy="298" rx="18" ry="9" fill="{BLUSH}" opacity="0.45"/><ellipse cx="276" cy="298" rx="18" ry="9" fill="{BLUSH}" opacity="0.45"/>'
    m += mouth(mo)
    if expr == "marah":
        m += f'<path d="M270 160 l16 -4 l-6 16 z M290 150 l18 6 l-14 10z" fill="#D9473A"/>'
        m += f'<path d="M262 168 l12 12 M286 168 l-12 12 M262 180 l12 -12" stroke="#D9473A" stroke-width="5" stroke-linecap="round" opacity="0"/>'
    if expr == "kaget":
        m += f'<path d="M316 150 q8 14 0 22 q-8 -8 0 -22z" fill="#8EC5E8" stroke="{INK}" stroke-width="2.5"/>'
    if glasses:
        m += f'<g fill="#ffffff" fill-opacity="0.15" {stroke(6)}><rect x="112" y="218" width="76" height="52" rx="14"/><rect x="212" y="218" width="76" height="52" rx="14"/></g>'
        m += f'<path d="M188 236 q12 -8 24 0 M112 232 L86 224 M288 232 L314 224" fill="none" {stroke(6)}/>'
    if cap:
        m += f'<g {stroke(7)}>'
        m += f'<path d="M42 92 Q46 34 200 26 Q354 34 358 92 Q350 118 312 128 L88 128 Q50 118 42 92z" fill="{G.BROWN}"/>'
        m += f'<path d="M74 104 Q200 120 326 104" fill="none" stroke="{G.BROWN_D}" stroke-width="5"/>'
        m += f'<path d="M92 124 L308 124 L304 166 L96 166z" fill="{G.BROWN_D}"/>'
        m += f'<path d="M84 164 Q200 144 316 164 Q312 196 200 198 Q88 196 84 164z" fill="{G.VISOR}"/></g>'
        m += f'<path d="M110 170 Q200 158 290 170" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.35"/>'
        m += f'<path d="M98 156 Q200 148 302 156" fill="none" stroke="{G.GOLD}" stroke-width="8" stroke-linecap="round"/>'
        m += f'<circle cx="100" cy="156" r="8" fill="{G.GOLD}" stroke="{INK}" stroke-width="3"/><circle cx="300" cy="156" r="8" fill="{G.GOLD}" stroke="{INK}" stroke-width="3"/>'
        m += f'<path d="M200 64 L232 78 Q232 122 200 138 Q168 122 168 78z" fill="{G.GOLD}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>' + G.star(200, 100, 17, G.BROWN_D)
        m += f'<path d="M150 98 q-18 -4 -26 8 M250 98 q18 -4 26 8" fill="none" stroke="{G.GOLD}" stroke-width="6" stroke-linecap="round"/>'
    if expr == "hormat":
        m += f'<g {stroke(7)}>'
        m += f'<path d="M330 400 L318 262 Q330 230 362 236 L392 400z" fill="{G.BROWN}"/>'
        m += f'<path d="M318 262 Q300 228 316 196 L338 150 Q344 136 358 142 Q368 148 362 162 L346 214 Q360 232 352 256z" fill="{SKIN}"/>'
        m += f'<path d="M262 132 Q300 116 344 124 Q362 130 356 146 Q350 158 334 156 L282 160 Q262 158 262 146z" fill="{SKIN}"/></g>'
        m += f'<path d="M286 140 h46 M288 150 h40" stroke="{INK}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>'
    return m

def save(name, body):
    p = f"{OUT}/svg/{name}.svg"
    open(p, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="420" viewBox="0 0 400 420">{body}</svg>')
    subprocess.run(["rsvg-convert", "-z", "2", p, "-o", f"{OUT}/png/{name}.png"], check=True)

if __name__ == "__main__":
    for e in EXPR:
        save(f"pet-{e}", face(e, cap=True))
        if e != "hormat":
            save(f"rambut-{e}", face(e, cap=False))
    print("ok")
