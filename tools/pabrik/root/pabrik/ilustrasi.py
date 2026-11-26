"""Ilustrasi kolase per bidang (bukan logo resmi). Tiap fungsi -> body SVG 840x520, garis tinta tebal, bayangan offset."""
import sys
sys.path.insert(0, "/home/claude")
import gen_kedinasan as G

INK, CARD, GL, GB, GOLD, BR, BRD, RED, MUT = G.INK, G.CARD, G.GOLD_L, G.GOLD_B, G.GOLD, G.BROWN, G.BROWN_D, G.RED, G.MUTED
SW = 'stroke="%s" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"' % INK
SKY = "#CFE3E8"; GREEN = "#8DB36B"; BLUE = "#5C8FB3"; GREY = "#B9B2A4"

def box(x, y, w, h, fill, rx=10, extra=""):
    return (f'<rect x="{x+8}" y="{y+8}" width="{w}" height="{h}" rx="{rx}" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {SW} {extra}/>')

def tag(x, y, text, fill=CARD, color=INK, rot=-4, size=34):
    w = len(text.replace("&amp;", "&")) * size * 0.6 + 40
    return (f'<g transform="rotate({rot} {x+w/2} {y+30})">{box(x, y, w, size+30, fill, 8)}'
            f'<text x="{x+w/2}" y="{y+size+6}" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="{size}" fill="{color}">{text}</text></g>')

def frame(inner, bg=SKY):
    grid = "".join(f'<path d="M{x} 0 V520" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>' for x in range(40, 840, 40))
    grid += "".join(f'<path d="M0 {y} H840" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>' for y in range(40, 520, 40))
    return (f'<clipPath id="cp"><rect x="0" y="0" width="840" height="520" rx="18"/></clipPath>'
            f'<g clip-path="url(#cp)"><rect width="840" height="520" fill="{bg}"/>{grid}{inner}</g>'
            f'<rect x="2.5" y="2.5" width="835" height="515" rx="18" fill="none" stroke="{INK}" stroke-width="5"/>')

def gedung(x, y, w, h, fill=CARD, cols=4, roof=BR):
    s = box(x, y + 60, w, h - 60, fill, 4)
    s += f'<path d="M{x-20} {y+64} L{x+w/2} {y} L{x+w+20} {y+64}z" fill="{roof}" {SW}/>'
    cw = w / (cols * 2 + 1)
    for i in range(cols):
        cx = x + cw * (2 * i + 1)
        s += f'<rect x="{cx}" y="{y+90}" width="{cw}" height="{h-130}" fill="{GL}" {SW}/>'
    s += f'<rect x="{x-10}" y="{y+h-28}" width="{w+20}" height="28" fill="{GB}" {SW}/>'
    return s

def statistik():
    s = box(60, 70, 430, 380, CARD, 14)
    vals = [120, 190, 150, 260, 220]
    for i, v in enumerate(vals):
        s += f'<rect x="{100+i*74}" y="{400-v}" width="50" height="{v}" fill="{[BR,GOLD,BR,RED,GOLD][i]}" {SW}/>'
    s += f'<path d="M100 400 H460" {SW}/><polyline points="125,250 199,190 273,220 347,120 421,150" fill="none" stroke="{INK}" stroke-width="6" stroke-dasharray="2 14"/>'
    s += f'<circle cx="640" cy="230" r="130" fill="{GL}" {SW}/><path d="M640 230 V100 A130 130 0 0 1 765 265z" fill="{GOLD}" {SW}/><path d="M640 230 L765 265 A130 130 0 0 1 560 330z" fill="{BR}" {SW}/>'
    s += box(560, 380, 210, 100, CARD, 10) + f'<path d="M585 410 H745 M585 440 H700" {SW}/>'
    return frame(s + tag(70, 30, "DATA &amp; SENSUS", GL))

def keuangan():
    s = gedung(80, 90, 380, 380, CARD, 4)
    for i in range(4):
        s += f'<ellipse cx="640" cy="{430-i*42}" rx="110" ry="30" fill="{GOLD}" {SW}/>'
    s += f'<ellipse cx="640" cy="304" rx="110" ry="30" fill="{GL}" {SW}/><text x="640" y="316" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="36" fill="{BRD}">Rp</text>'
    s += box(560, 110, 220, 120, CARD, 10) + f'<path d="M585 150 H750 M585 185 H700" {SW}/><text x="740" y="200" font-family="{G.HEAD}" font-weight="800" font-size="40" fill="{RED}">%</text>'
    return frame(s + tag(440, 30, "KEUANGAN NEGARA", GL, rot=3, size=30))

def pemerintahan():
    s = gedung(220, 120, 400, 350, CARD, 5, BRD)
    s += f'<path d="M420 120 V30" {SW}/><path d="M420 30 h90 v26 h-90z" fill="{RED}" {SW}/><path d="M420 56 h90 v26 h-90z" fill="#fff" {SW}/>'
    s += f'<path d="M0 470 H840 V520 H0z" fill="{GREEN}" {SW}/>'
    for x in (80, 760):
        s += f'<circle cx="{x}" cy="380" r="60" fill="{GREEN}" {SW}/><path d="M{x} 440 V475" {SW}/>'
    return frame(s + tag(30, 36, "PEMERINTAHAN DAERAH", GL, size=28))

def siber():
    s = box(70, 90, 260, 380, "#3B3A36", 12)
    for i in range(5):
        s += f'<rect x="95" y="{115+i*68}" width="210" height="46" rx="6" fill="#57544D" {SW}/><circle cx="125" cy="{138+i*68}" r="8" fill="{["#7CD67C",GOLD,"#7CD67C",RED,"#7CD67C"][i]}"/>'
    s += f'<path d="M520 230 v-60 a90 90 0 0 1 180 0 v60" fill="none" stroke="{INK}" stroke-width="30"/><path d="M520 230 v-60 a90 90 0 0 1 180 0 v60" fill="none" stroke="{GB}" stroke-width="18"/>'
    s += box(470, 225, 280, 220, GOLD, 18) + f'<circle cx="610" cy="320" r="28" fill="{INK}"/><path d="M600 330 h20 l8 60 h-36z" fill="{INK}"/>'
    s += f'<text x="360" y="150" font-family="{G.MONO}" font-weight="700" font-size="34" fill="{BRD}">01101</text><text x="360" y="470" font-family="{G.MONO}" font-weight="700" font-size="34" fill="{BRD}">10#7A</text>'
    return frame(s + tag(500, 30, "SANDI &amp; SIBER", GL, rot=3), bg="#DCE4E0")

def cuaca():
    s = f'<circle cx="190" cy="170" r="80" fill="{GOLD}" {SW}/>'
    s += f'<path d="M140 300 a70 70 0 0 1 120 -60 a90 90 0 0 1 170 30 a60 60 0 0 1 -10 120 h-270 a50 50 0 0 1 -10 -90z" fill="#fff" {SW}/>'
    for x in (200, 260, 320, 380):
        s += f'<path d="M{x} 420 l-18 50" stroke="{BLUE}" stroke-width="10" stroke-linecap="round"/>'
    s += f'<path d="M600 470 V300" {SW}/><path d="M520 310 a90 90 0 0 0 170 -60z" fill="{CARD}" {SW}/><path d="M605 280 l60 -60" {SW}/><circle cx="670" cy="215" r="12" fill="{RED}" {SW}/>'
    s += f'<path d="M520 470 H700" {SW}/>' + box(680, 90, 120, 90, CARD, 10) + f'<text x="740" y="150" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="40" fill="{INK}">28°</text>'
    return frame(s + tag(40, 30, "CUACA &amp; GEMPA", GL))

def transportasi():
    s = f'<path d="M0 400 H430 V520 H0z" fill="{BLUE}" {SW}/><path d="M430 400 H840 V520 H430z" fill="{GREY}" {SW}/><path d="M470 460 H800" stroke="#fff" stroke-width="8" stroke-dasharray="40 30"/>'
    s += f'<path d="M60 380 H380 l-40 70 H110z" fill="{RED}" {SW}/><rect x="130" y="300" width="180" height="80" fill="{CARD}" {SW}/><rect x="220" y="240" width="60" height="60" fill="{GOLD}" {SW}/>'
    s += f'<path d="M470 170 l260 -40 q40 -6 40 20 q0 22 -40 26 l-260 34z" fill="#fff" {SW}/><path d="M600 160 l-70 -90 h40 l100 80z" fill="{GB}" {SW}/><path d="M600 200 l-50 80 h40 l80 -86z" fill="{GB}" {SW}/>'
    s += box(470, 290, 300, 90, GOLD, 18) + f'<rect x="495" y="318" width="60" height="40" fill="{SKY}" {SW}/><rect x="575" y="318" width="60" height="40" fill="{SKY}" {SW}/><circle cx="530" cy="395" r="22" fill="{INK}"/><circle cx="710" cy="395" r="22" fill="{INK}"/>'
    return frame(s + tag(40, 30, "DARAT · LAUT · UDARA", GL))

def kampus():
    s = gedung(160, 110, 520, 360, CARD, 6)
    s += f'<path d="M0 470 H840 V520 H0z" fill="{GREEN}" {SW}/>'
    s += f'<path d="M370 470 v-80 a50 50 0 0 1 100 0 v80" fill="{BRD}" {SW}/>'
    return frame(s + tag(40, 30, "KAMPUS &amp; ASRAMA", GL))

ALL = {"statistik": statistik, "keuangan": keuangan, "pemerintahan": pemerintahan, "siber": siber,
       "cuaca": cuaca, "transportasi": transportasi, "kampus": kampus}

def peta():
    """Kepulauan bergaya kartun (bukan peta presisi) dengan pin penempatan."""
    LAND = GL
    s = ""
    s += f'<g transform="rotate(38 140 210)"><ellipse cx="140" cy="210" rx="150" ry="42" fill="{LAND}" {SW}/></g>'      # sumatra
    s += f'<ellipse cx="350" cy="372" rx="120" ry="22" fill="{LAND}" {SW}/>'                                               # jawa
    s += f'<path d="M290 150 q40 -70 120 -40 q60 30 30 110 q-30 60 -100 40 q-70 -30 -50 -110z" fill="{LAND}" {SW}/>'      # kalimantan
    s += f'<path d="M520 150 q30 -10 50 0 l-30 30 l60 0 q10 20 -10 25 l-50 0 l20 60 q-10 15 -25 0 l-25 -60 q-15 -30 10 -55z" fill="{LAND}" {SW}/>'  # sulawesi
    s += f'<path d="M640 230 q60 -40 130 -10 q50 30 30 80 q-60 30 -120 10 q-60 -20 -40 -80z" fill="{LAND}" {SW}/>'        # papua
    for x, w in ((480, 26), (530, 36), (590, 30)):
        s += f'<ellipse cx="{x}" cy="395" rx="{w}" ry="12" fill="{LAND}" {SW}/>'                                           # nusa tenggara
    s += f'<path d="M140 210 Q 250 300 350 372 Q 450 260 545 200 Q 640 200 710 260" fill="none" stroke="{BRD}" stroke-width="5" stroke-dasharray="14 12"/>'
    for x, y in ((140, 210), (350, 372), (360, 180), (545, 200), (710, 260), (530, 395)):
        s += (f'<path d="M{x} {y} l-18 -34 a20 20 0 1 1 36 0z" fill="{RED}" {SW}/>'
              f'<circle cx="{x}" cy="{y-46}" r="7" fill="#fff"/>')
    return frame(s + tag(30, 450, "PENEMPATAN SE-INDONESIA", GL, rot=-2, size=30), bg="#BFDCE6")

ALL["peta"] = peta

def stan():
    """Ilustrasi monumen huruf kampus PKN STAN (tanpa logo instansi)."""
    YEL = "#F2C21B"; STONE = "#CFC6B4"; LET = "#F6F2E9"; LEAF = "#5E8A4A"; LEAF2 = "#4C7640"
    s = ""
    # gedung kiri & kanan (kisi-kisi jendela)
    s += box(-20, 40, 200, 330, CARD, 4)
    for y in range(70, 340, 26): s += f'<path d="M0 {y} H170" stroke="{GREY}" stroke-width="6"/>'
    s += box(640, 60, 230, 310, CARD, 4)
    for y in range(110, 340, 30): s += f'<path d="M660 {y} H840" stroke="{GREY}" stroke-width="6"/>'
    s += f'<rect x="660" y="80" width="120" height="16" fill="{GB}" stroke="{INK}" stroke-width="4"/>'
    # pepohonan
    for cx, cy, r, c in ((250, 140, 90, LEAF2), (360, 110, 100, LEAF), (480, 130, 95, LEAF2), (590, 150, 80, LEAF), (180, 200, 70, LEAF)):
        s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}" {SW}/>'
    # tulisan kuning
    s += (f'<text x="440" y="150" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="32" '
          f'fill="{YEL}" stroke="{INK}" stroke-width="4" paint-order="stroke" letter-spacing="1">POLITEKNIK KEUANGAN NEGARA</text>')
    # huruf monumen STAN (bayangan + huruf)
    for dx, fill in ((10, INK), (0, LET)):
        s += (f'<text x="{430 + dx}" y="{368 + dx}" text-anchor="middle" font-family="DejaVu Serif, serif" font-weight="700" '
              f'font-size="230" letter-spacing="18" fill="{fill}" stroke="{INK}" stroke-width="6" paint-order="stroke">STAN</text>')
    # alas batu & kolam
    s += box(60, 372, 760, 46, STONE, 4)
    s += f'<path d="M60 395 H820" stroke="{GREY}" stroke-width="3"/>'
    s += f'<path d="M0 430 H840 V520 H0z" fill="#6E7F86" {SW}/>'
    s += f'<path d="M80 470 H300 M420 490 H700" stroke="#9DB0B6" stroke-width="6" stroke-linecap="round"/>'
    return frame(s + tag(30, 448, "KAMPUS PKN STAN, TANGERANG SELATAN", GL, rot=-2, size=26), bg="#DCE7EC")

ALL["stan"] = stan

def kontrak():
    """Dokumen perjanjian ikatan dinas + pena + stempel."""
    s = f'<g transform="rotate(-6 300 270)">' + box(150, 60, 320, 410, CARD, 8)
    s += f'<text x="310" y="120" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="30" fill="{INK}">PERJANJIAN</text>'
    s += f'<text x="310" y="152" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="26" fill="{BR}">IKATAN DINAS</text>'
    for y in range(190, 380, 30): s += f'<path d="M190 {y} H{430 - (y % 60)}" stroke="{GREY}" stroke-width="7" stroke-linecap="round"/>'
    s += f'<path d="M200 430 q30 -30 50 0 q20 25 45 -10 q15 -20 40 5" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>'
    s += f'<g transform="rotate(35 560 260)"><rect x="520" y="110" width="40" height="300" rx="10" fill="{BRD}" {SW}/><path d="M520 410 l20 50 l20 -50z" fill="{GOLD}" {SW}/><rect x="520" y="110" width="40" height="40" fill="{GOLD}" {SW}/></g>'
    s += f'<g transform="rotate(-14 690 360)"><circle cx="690" cy="360" r="88" fill="none" stroke="{RED}" stroke-width="10"/><circle cx="690" cy="360" r="70" fill="none" stroke="{RED}" stroke-width="4"/><text x="690" y="374" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="34" fill="{RED}">SAH</text></g>'
    return frame(s + tag(480, 30, "WAJIB MENGABDI", GL, rot=4, size=30), bg="#EADFCB")

def cukur():
    """Alat cukur, rambut berjatuhan, seragam di gantungan."""
    s = f'<path d="M560 60 h170 M645 60 v40" {SW}/><path d="M645 100 l-90 60 h180z" fill="none" {SW}/>'
    s += f'<path d="M565 160 h160 l30 300 h-220z" fill="{BRD}" {SW}/><path d="M645 160 v300" stroke="{GOLD}" stroke-width="6"/>'
    for y in (220, 280, 340): s += f'<circle cx="665" cy="{y}" r="9" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
    s += f'<rect x="580" y="200" width="44" height="14" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
    s += f'<g transform="rotate(-25 230 260)">' + box(150, 140, 150, 260, "#4A4A48", 30)
    s += f'<rect x="150" y="120" width="150" height="40" rx="6" fill="#C9C9C9" {SW}/>'
    for x in range(160, 300, 14): s += f'<path d="M{x} 120 v-18" stroke="{INK}" stroke-width="4"/>'
    s += f'<rect x="200" y="230" width="50" height="60" rx="10" fill="{GOLD}" {SW}/></g>'
    import random
    rnd = random.Random(7)
    for k in range(26):
        x, y, a = rnd.randint(60, 480), rnd.randint(330, 500), rnd.randint(-60, 60)
        s += f'<path d="M{x} {y} q8 -14 18 -4" transform="rotate({a} {x} {y})" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    return frame(s + tag(30, 30, "RAMBUT CEPAK &amp; SERAGAM", GL, size=30), bg="#E4E8E2")

def layanan():
    """Loket pelayanan publik dengan antrean warga."""
    s = box(60, 60, 720, 250, CARD, 6)
    for x, n in ((110, "A-12"), (330, "B-07"), (550, "C-03")):
        s += box(x, 120, 180, 120, GL, 6) + f'<text x="{x+90}" y="200" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="40" fill="{INK}">{n}</text>'
    s += f'<rect x="40" y="300" width="760" height="40" fill="{BR}" {SW}/>'
    for k, x in enumerate((130, 250, 370, 490, 610)):
        col = [GOLD, BLUE, RED, GREEN, BRD][k]
        s += f'<circle cx="{x}" cy="400" r="30" fill="#E0B48A" {SW}/><path d="M{x-48} 520 q48 -110 96 0z" fill="{col}" {SW}/>'
    s += f'<text x="420" y="100" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="34" fill="{BRD}">LOKET PELAYANAN</text>'
    return frame(s + tag(540, 6, "MELAYANI WARGA", GL, rot=3, size=26), bg="#DDE7E4")

ALL.update({"kontrak": kontrak, "cukur": cukur, "layanan": layanan})

def makan():
    """Ruang makan asrama: meja panjang, baki makan seragam."""
    s = f'<path d="M0 300 H840 V520 H0z" fill="#D9C7A6" {SW}/>'
    s += box(40, 70, 760, 120, CARD, 6)
    for x in range(80, 800, 120): s += f'<rect x="{x}" y="95" width="70" height="70" rx="6" fill="{SKY}" {SW}/>'
    s += f'<path d="M60 330 L780 330 L800 380 L40 380z" fill="{BR}" {SW}/>'
    s += f'<path d="M70 380 v90 M770 380 v90" stroke="{INK}" stroke-width="10"/>'
    for x in (110, 280, 450, 620):
        s += f'<rect x="{x}" y="300" width="130" height="44" rx="6" fill="#C9C9C9" {SW}/>'
        s += f'<ellipse cx="{x+38}" cy="318" rx="24" ry="12" fill="#fff" {SW}/><circle cx="{x+90}" cy="318" r="12" fill="{GREEN}" {SW}/><rect x="{x+104}" y="306" width="18" height="24" rx="4" fill="{GOLD}" stroke="{INK}" stroke-width="3"/>'
    for x in (60, 230, 400, 570, 740):
        s += f'<rect x="{x}" y="420" width="90" height="26" rx="6" fill="{BRD}" {SW}/>'
    return frame(s + tag(30, 210, "MAKAN BERSAMA", GL, rot=-3, size=30), bg="#EFE3CC")

ALL["makan"] = makan
