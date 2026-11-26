"""Pabrik video Catatan Abdi Negara: naskah.json (adegan bertipe) + narasi-utuh.mp3 + waktu.json -> video final 1080x1920.
Pemakaian: python3 pabrik.py <folder_episode> <folder_output>
folder_episode berisi naskah.json dan suara-elevenlabs/{narasi-utuh.mp3, narasi-utuh-waktu.json}
"""
import json, os, re, subprocess, sys, wave, math
import numpy as np
from PIL import Image, ImageDraw

sys.argv_backup = sys.argv; sys.argv = ["x", "none"]
sys.path.insert(0, "/home/claude/ep1/el"); sys.path.insert(0, "/home/claude/sfx")
import render_final as F          # helper visual + maskot/bar bermerek
import sfx as S                   # efek suara & musik
import ilustrasi as I              # ilustrasi kolase per bidang
import motion as M                 # gerak v2: sinkron kata, coretan, kuis, VS
S.PRIO.setdefault("tick", 1); S.GAIN.setdefault("tick", 0.5)
sys.argv = sys.argv_backup
R, G = F.R, F.G
W, H, FPS = 1080, 1920, 30
CX, TOP = 45, 300

# ------------------------------------------------------------------ penyelarasan suara
def silences(mp3, total):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp3, "-af", "silencedetect=n=-35dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r)]
    if len(en) < len(st): en.append(total)
    return list(zip(st, en))

def speech_segments(mp3):
    total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout)
    sil = silences(mp3, total)
    segs, t = [], 0.0
    for a, b in sil:
        if a - t > 0.08: segs.append((t, a))
        t = b
    if total - t > 0.08: segs.append((t, total))
    return segs, total

def phrases_of(scenes):
    """Daftar frasa (scene_idx, start_char_in_scene, end_char, text) dipecah di tanda baca."""
    out = []
    for si, sc in enumerate(scenes):
        t = sc["narasi"]; s = 0
        for m in re.finditer(r"[,\.\?!:]+(\s+|$)", t):
            e = m.end()
            if t[s:e].strip(): out.append((si, s, e, t[s:e]))
            s = e
        if t[s:].strip(): out.append((si, s, len(t), t[s:]))
    return out

def align(scenes, mp3):
    segs, total = speech_segments(mp3)
    ph = phrases_of(scenes)
    chars = [len(p[3].strip()) for p in ph]
    rate = sum(b - a for a, b in segs) / max(1, sum(chars))
    n, m = len(ph), len(segs)
    INF = 1e18
    dp = [[INF] * (m + 1) for _ in range(n + 1)]; bk = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            if dp[i][j] >= INF: continue
            for a in range(1, 4):
                for b in range(1, 4):
                    if i + a > n or j + b > m: continue
                    if a > 1 and any(ph[k][0] != ph[i][0] for k in range(i, i + a)) and b > 1: continue
                    dur = segs[j + b - 1][1] - segs[j][0]
                    exp = rate * sum(chars[i:i + a])
                    c = ((dur - exp) / max(0.6, exp)) ** 2 + 0.08 * (a - 1) + 0.12 * (b - 1)
                    c += 1.5 * sum(segs[q + 1][0] - segs[q][1] for q in range(j, j + b - 1))  # jeda panjang di tengah satu frasa
                    endp = ph[i + a - 1][3].strip()[-1:]
                    if endp == ",": c += 0.25            # jeda lebih jarang jatuh di koma
                    elif endp not in ".?!:": c += 0.5
                    for k in range(i, i + a - 1):         # akhir kalimat di dalam satu potongan suara
                        if ph[k][3].strip()[-1:] in ".?!": c += 0.45
                        if ph[k][0] != ph[k + 1][0]: c += 1.2   # batas adegan tanpa jeda
                    if dp[i][j] + c < dp[i + a][j + b]:
                        dp[i + a][j + b] = dp[i][j] + c; bk[i + a][j + b] = (i, j)
    # telusur balik
    i, j, groups = n, m, []
    if dp[n][m] >= INF: raise SystemExit("Penyelarasan gagal")
    while i > 0:
        pi, pj = bk[i][j]; groups.append((pi, i, pj, j)); i, j = pi, pj
    groups.reverse()
    times = [None] * n
    for pi, pe, sj, se in groups:
        t0, t1 = segs[sj][0], segs[se - 1][1]
        tot = sum(chars[pi:pe]); t = t0
        for k in range(pi, pe):
            d = (t1 - t0) * chars[k] / tot; times[k] = (t, t + d); t += d
    return ph, times, total

def build_timing(spec, mp3):
    scenes = spec["adegan"]
    ph, times, total = align(scenes, mp3)
    first = {}; last = {}
    for k, p in enumerate(ph):
        first.setdefault(p[0], k); last[p[0]] = k
    starts = [times[first[i]][0] for i in range(len(scenes))]
    ends = [times[last[i]][1] for i in range(len(scenes))]
    cuts = [0.0] + [max(0.0, s - 0.08) for s in starts[1:]]
    for i, sc in enumerate(scenes):
        nxt = cuts[i + 1] if i + 1 < len(scenes) else total + 0.8
        sc["cut"], sc["durasi"] = cuts[i], round(nxt - cuts[i], 3)
        sc["lead"], sc["audio"] = round(starts[i] - cuts[i], 3), round(ends[i] - starts[i], 3)
        # waktu tiap potongan subtitle dari waktu frasa
        cw = M.weights(sc["narasi"])
        def tchar(c):   # waktu ucap karakter ke-c, dibobot panjang ucapan tiap kata (angka/akronim lebih lama)
            for k in range(first[i], last[i] + 1):
                _, s, e, _ = ph[k]
                if s <= c < e or k == last[i]:
                    a, b = times[k]; return a + (b - a) * (cw[c] - cw[s]) / max(1e-6, cw[e] - cw[s])
        subs, pos = [], 0
        for ch in F.sub_chunks(sc["narasi"]):
            txt = " ".join(ch); j = sc["narasi"].find(txt, pos); pos = j + len(txt)
            subs.append(round(tchar(j) - cuts[i], 3))
        sc["subs"] = [max(0.0, round(x - 0.06, 3)) for x in subs]
        sc["fr"] = [[ph[k][1], ph[k][2], round(times[k][0] - cuts[i], 3), round(times[k][1] - cuts[i], 3)] for k in range(first[i], last[i] + 1)]
    return total

# ------------------------------------------------------------------ penyusun visual
EVENTS = []
SHAKES = []
def P(c, im, x, y, t, t0, D, kind="pop", dur=0.16, sound=True):
    if sound and t < -0.5: EVENTS.append((t0, {"pop": "pop", "spin": "pop", "slam": "stamp", "wipe": "tick"}.get(kind, "whoosh")))
    if kind == "slam" and t < -0.5: SHAKES.append(t0 + 0.05)
    M.place(c, im, x, y, t, t0, kind, dur, D - 0.1)

def fit_size(text, size, maxw):
    text = text.replace("&amp;", "&").replace("&lt;", "<")
    while size > 30 and R.text_w(text, size) > maxw: size -= 2
    return size

def bigfit(name, lines, size, color, maxw):
    s = min(fit_size(l, size, maxw) for l in lines)
    return F.big(name + f"-{s}", lines, s, color)

def body(svgname):
    return open(f"{G.OUT}/svg/{svgname}.svg").read().split(">", 1)[1].rsplit("</svg>", 1)[0]

def step_row(name, n, text, size=54):
    s = fit_size(text, size, 780)
    b = (f'<circle cx="34" cy="36" r="30" fill="{G.BROWN}" stroke="{G.INK}" stroke-width="4"/>'
         f'<text x="34" y="48" text-anchor="middle" font-family="{G.HEAD}" font-weight="800" font-size="32" fill="#fff">{n}</text>'
         f'<text x="86" y="{36 + s * 0.36}" font-family="{G.HEAD}" font-weight="700" font-size="{s}" fill="{G.INK}">{text}</text>')
    return R.layer(name, 900, 74, b)

def jadwal_row(name, tm, act, dark):
    b = (f'<rect x="0" y="4" width="150" height="62" rx="10" fill="{G.INK if dark else G.BROWN}"/>'
         f'<text x="75" y="46" text-anchor="middle" font-family="{G.MONO}" font-weight="700" font-size="32" fill="#fff">{tm}</text>'
         f'<text x="180" y="52" font-family="{G.HEAD}" font-weight="700" font-size="54" fill="{G.INK}">{act}</text>')
    return R.layer(name, 880, 72, b)

def scene(c, t, sc, key):
    D = sc["durasi"]; tp = sc["tipe"]; n_ = int(key.split("s")[-1])
    W_ = M.Clock(sc)                      # W_("kata") = saat kata itu diucapkan (dikurangi 0.2 dtk)
    var = n_ % 3                           # variasi gerak antar adegan agar tidak monoton
    side = ["left", "right", "up"][var]
    if tp == "hook":
        y = TOP
        if sc.get("stiker"):
            P(c, F.sticker(f"{key}-st", sc["stiker"], G.GOLD, G.INK, -8, 84), CX, TOP - 40, t, 0.0, D, "spin"); y = TOP + 190
            P(c, M.sparkle(), CX + 20 + R.text_w(sc["stiker"], 84) + 90, TOP - 70, t, 0.12, D, "pop", sound=False)
        t_a = W_(sc["teks"][0])
        P(c, bigfit(f"{key}-a", sc["teks"], 96, G.INK, 980), CX + 10, y, t, t_a, D, "left")
        hs = fit_size(sc["hl"], 132, 940); hy = y + 120 * len(sc["teks"]) + 10
        t_h = W_(sc["hl"])
        P(c, F.hl_word(f"{key}-hl{hs}", sc["hl"], hs), CX + 10, hy, t, t_h, D, "slam")
        P(c, M.squiggle(min(900, R.text_w(sc["hl"], hs) + 30)), CX + 20, hy + hs * 1.25 + 14, t, t_h + 0.18, D, "wipe", 0.22)
    elif tp == "card":
        P(c, R.card_frame(f"{key}-cf-{sc['label']}", 990, 560, sc["label"]), CX, TOP, t, 0.0, D, "up")
        P(c, F.icon(sc["ikon"], 220), CX + 50, TOP + 110, t, 0.06, D, "spin")
        P(c, bigfit(f"{key}-b", sc["baris"], 76, G.INK, 640), CX + 300, TOP + 150, t, W_(sc["baris"][0]), D, side if side != "up" else "left")
        t_s = W_(sc["sub"][0])
        P(c, bigfit(f"{key}-s", sc["sub"], 76, G.BROWN, 900), CX + 50, TOP + 370, t, t_s, D, "pop")
        P(c, M.sparkle(), CX + 880, TOP - 60, t, t_s + 0.1, D, "spin", sound=False)
    elif tp == "tags":
        P(c, bigfit(f"{key}-j", [sc["judul"]], 96, G.INK, 980), CX + 10, TOP - 30, t, W_(sc["judul"]), D, "left")
        for i, tg in enumerate(sc["item"]):
            Lb, wl = G.label(0, 0, tg, dark=(i % 2 == 0), size=62)
            P(c, R.layer(f"{key}-tg{i}", int(wl) + 6, 82, Lb), CX + 30 + (i % 2) * 70, TOP + 150 + i * 150, t, W_(tg, 0.1 + 0.25 * i, chain=True), D, ["left", "pop"][i % 2])
    elif tp == "steps":
        n = len(sc["item"]); hgt = 120 + n * 104
        P(c, R.card_frame(f"{key}-cf{n}", 990, hgt, sc["judul"]), CX, TOP, t, 0.0, D, "up")
        for i, s_ in enumerate(sc["item"]):
            P(c, step_row(f"{key}-st{i}", i + 1, s_), CX + 40, TOP + 96 + i * 104, t, W_(s_, 0.05 + 0.3 * i, chain=True), D, "left")
    elif tp == "chips":
        P(c, bigfit(f"{key}-j", [sc["judul"]], 96, G.INK, 980), CX + 10, TOP - 30, t, W_(sc["judul"]), D, "left")
        for i, (ti, su) in enumerate(sc["item"]):
            P(c, M.chip(f"{key}-{i}", ti, su), CX + 30 + i * 60, TOP + 150 + i * 190, t, W_(ti, 0.05 + 0.3 * i, chain=True), D, ["pop", "spin", "pop"][i % 3])
    elif tp == "big":
        P(c, R.card_frame(f"{key}-cf", 990, 560, sc["label"]), CX, TOP, t, 0.0, D, "up")
        t_n = W_(sc["angka"]); s = fit_size(sc["angka"], 190, 900)
        pn = M.parse_num(sc["angka"])
        if pn and t >= t_n and t < t_n + 0.55:      # angka berjalan naik
            v, suf, dots = pn; k = R.clamp((t - t_n) / 0.5)
            txt = M.fmt_num(int(v * R.ease_out(k)), dots) + suf
            c.alpha_composite(F.big(f"{key}-n{s}-{txt}", [txt], s, G.BROWN), (CX + 40, TOP + 110))
            if t < -0.5: pass
        else:
            P(c, F.big(f"{key}-n{s}", [sc["angka"]], s, G.BROWN), CX + 40, TOP + 110, t, t_n, D, "slam" if not pn else "fade")
        if pn and t < -0.5: EVENTS.append((t_n, "tick")); EVENTS.append((t_n + 0.5, "stamp"))
        P(c, M.burst(), CX + 20 + R.text_w(sc["angka"], s), TOP + 40, t, t_n + 0.5, D, "pop", sound=False)
        P(c, bigfit(f"{key}-s", [sc["sub"]], 64, G.INK, 900), CX + 50, TOP + 380, t, W_(sc["sub"]), D, side)
    elif tp == "ilustrasi":
        if sc.get("judul"): P(c, bigfit(f"{key}-j", [sc["judul"]], 96, G.INK, 980), CX + 10, TOP - 30, t, 0.0, D, "slam")
        im = R.layer(f"il-{sc['ilus']}", 840, 520, I.ALL[sc["ilus"]]()).resize((990, 613), Image.LANCZOS)
        P(c, im, CX, TOP + 110, t, 0.08, D, "up", 0.2)
    elif tp == "stamp":
        P(c, R.layer("stamp-penting", 330, 130, body("14-stiker-cap-penting")).resize((660, 260), Image.LANCZOS), CX + 150, TOP - 20, t, 0.0, D, "slam")
        P(c, bigfit(f"{key}-a", sc["teks"], 100, G.INK, 980), CX + 10, TOP + 300, t, W_(sc["teks"][0]), D, "left")
        hs = fit_size(sc["hl"], 140, 940); t_h = W_(sc["hl"])
        P(c, F.hl_word(f"{key}-hl{hs}", sc["hl"], hs), CX + 10, TOP + 430, t, t_h, D, "slam")
        P(c, M.circle_scribble(int(R.text_w(sc["hl"], hs) + 120), int(hs * 1.6 + 60)), CX - 40, TOP + 400, t, t_h + 0.2, D, "wipe", 0.25)
    elif tp == "checks":
        n = len(sc["item"])
        P(c, R.card_frame(f"{key}-cf{n}", 990, 130 + n * 110, sc["label"]), CX, TOP, t, 0.0, D, "up")
        for i, s_ in enumerate(sc["item"]):
            P(c, R.row_layer(f"{key}-ck{i}", s_, True, 940, fit_size(s_, 56, 820)), CX + 36, TOP + 100 + i * 110, t, W_(s_, 0.05 + 0.3 * i, chain=True), D, "left")
    elif tp == "jadwal":
        n = len(sc["item"])
        P(c, R.card_frame(f"{key}-cf{n}", 990, 130 + n * 100, sc["label"]), CX, TOP, t, 0.0, D, "up")
        for i, (tm, act) in enumerate(sc["item"]):
            P(c, jadwal_row(f"{key}-j{i}", tm, act, i % 2 == 0), CX + 40, TOP + 100 + i * 100, t, W_(act, 0.05 + 0.3 * i, chain=True), D, ["left", "right"][i % 2])
    elif tp == "kuis":
        card, h = M.soal_card(f"{key}-soal", sc.get("label", "LATIHAN SOAL"), sc["soal"])
        P(c, card, CX, TOP - 30, t, 0.0, D, "up")
        y0 = TOP - 30 + h + 30; opsi = sc["opsi"]; letters = "ABCDE"
        t_os = [W_(o, 0.1 + 0.15 * i, chain=True) for i, o in enumerate(opsi)]
        t_last = max(t_os)
        if sc.get("jawab") is None:           # mode komentar: tidak dijawab, penonton menjawab di kolom komentar
            for i, o in enumerate(opsi):
                P(c, M.opsi_row(f"{key}-o{i}", letters[i], o, ""), CX, y0 + i * 118, t, t_os[i], D, ["left", "right"][i % 2])
            ty = y0 + len(opsi) * 118 + 10
            t_k = max(W_(sc.get("kunci_kata", "komentar"), 0.8), t_last + 0.3)
            if t_last + 0.2 < t:
                c.alpha_composite(M.timer_bar(f"{key}-tb", R.clamp(1 - (t - t_last - 0.2) / max(0.5, D - t_last - 0.4))), (CX, ty))
            P(c, F.sticker(f"{key}-kom", "JAWAB DI KOMENTAR", G.GOLD, G.INK, -5, 72), CX + 60, ty + 70, t, t_k, D, "slam")
            P(c, M.arrow(), CX + 700, ty + 150, t, t_k + 0.15, D, "wipe", 0.2, sound=False)
            return
        t_r = max(W_(sc.get("kunci_kata", "jawabannya"), 0.85), t_last + 0.4)
        for i, o in enumerate(opsi):
            t_o = t_os[i]
            state = "" if t < t_r else ("benar" if i == sc["jawab"] else "salah")
            P(c, M.opsi_row(f"{key}-o{i}", letters[i], o, state), CX, y0 + i * 118, t, t_o, D, ["left", "right"][i % 2])
        ty = y0 + len(opsi) * 118 + 10
        if t_last + 0.2 < t < t_r:                 # bar waktu menghitung mundur sebelum jawaban
            c.alpha_composite(M.timer_bar(f"{key}-tb", 1 - (t - t_last - 0.2) / max(0.3, t_r - t_last - 0.2)), (CX, ty))
        if t < -0.5: EVENTS.append((t_r, "ding")); SHAKES.append(t_r)
    elif tp == "vs":
        kl, kn = sc["kiri"], sc["kanan"]
        cl, hl_ = M.vs_card(f"{key}-kl", kl["judul"], kl["item"], G.CARD)
        cr, hr_ = M.vs_card(f"{key}-kn", kn["judul"], kn["item"], G.GOLD_L)
        t_l, t_rr = W_(kl["judul"]), W_(kn["judul"], 0.45)
        # kartu muncul paling lambat saat butir pertamanya diucapkan
        if kl["item"]: t_l = min(t_l, max(0.0, W_(kl["item"][0], 0.1) - 0.15))
        if kn["item"]: t_rr = min(t_rr, max(t_l + 0.1, W_(kn["item"][0], 0.5) - 0.15))
        P(c, cl, CX, TOP, t, t_l, D, "left"); P(c, cr, CX + 520, TOP, t, t_rr, D, "right")
        P(c, M.vs_badge(), CX + 400, TOP + max(hl_, hr_) - 70, t, t_rr + 0.05, D, "slam")
        y = TOP + 122
        for i, it in enumerate(kl["item"]):
            im, h = M.vs_item(f"{key}-kli{i}", it)
            P(c, im, CX + 20, y, t, max(t_l + 0.12, W_(it, 0.1 + 0.1 * i)), D, "pop"); y += h + 14
        y = TOP + 122
        for i, it in enumerate(kn["item"]):
            im, h = M.vs_item(f"{key}-kni{i}", it)
            P(c, im, CX + 540, y, t, max(t_rr + 0.1, W_(it, 0.5 + 0.1 * i)), D, "pop"); y += h + 14
    elif tp == "kata":   # tipografi kinetik: tiap kata muncul tepat saat diucapkan
        hl = {h.lower() for h in sc.get("hl", [])}
        words = [(m.group(), m.start()) for m in re.finditer(r"\S+", sc["narasi"])]
        size = sc.get("ukuran", 104)
        def layout(sz):
            x, y, out = 0, 0, []
            for wd, j in words:
                ww = R.text_w(wd, sz) + (36 if wd.strip(".,?!").lower() in hl else 6)
                if x and x + ww > 980: x, y = 0, y + sz * 1.32
                out.append((wd, j, x, y)); x += ww + sz * 0.28
            return out, y + sz * 1.32
        lay, hgt = layout(size)
        while hgt > 900 and size > 64: size -= 6; lay, hgt = layout(size)
        y0 = TOP - 40 + max(0, (760 - hgt) / 2)
        for k, (wd, j, x, y) in enumerate(lay):
            isk = wd.strip(".,?!").lower() in hl
            ts = M.t_at(sc, j); t0 = max(0.0, (ts if ts is not None else sc["lead"] + 0.2 * k) - 0.12)
            im, _ = M.word_layer(f"{key}-{k}", wd, size, isk)
            P(c, im, CX + 10 + x, y0 + y, t, t0, D, "slam" if isk else "up", 0.12, sound=isk)
    elif tp == "chat":   # gelembung percakapan: penanya (kiri) vs maskot (kanan)
        y = TOP - 40
        for i, (side, txt) in enumerate(sc["item"]):
            im, h = M.bubble(f"{key}-{i}", txt, side)
            t0 = W_(txt, 0.05 + 0.35 * i, chain=True)
            if side == "kiri":
                P(c, M.avatar_tanya(), CX, y + h - 150, t, t0, D, "pop", sound=False)
                P(c, im, CX + 140, y, t, t0 + 0.04, D, "left")
            else:
                face = (MASCOT_S.get(sc.get("wajah", "senyum")) or MASCOT_S["senyum"]).resize((150, 158), Image.LANCZOS)
                P(c, face, CX + 840, y + h - 170, t, t0, D, "pop", sound=False)
                P(c, im, CX + 100, y, t, t0 + 0.04, D, "right")
            y += h + 20
    elif tp == "skala":  # pilihan TKP dengan bar skor 1-5
        card, h = M.soal_card(f"{key}-soal", sc.get("label", "CONTOH TKP"), sc["soal"])
        P(c, card, CX, TOP - 40, t, 0.0, D, "up")
        y0 = TOP - 40 + h + 26
        for i, (o, sk) in enumerate(sc["opsi"]):
            t_o = W_(o, 0.15 + 0.2 * i, chain=True)
            frac = R.clamp((t - t_o - 0.12) / 0.35)
            P(c, M.skala_row(f"{key}-r{i}", o, sk, frac), CX, y0 + i * 116, t, t_o, D, ["left", "right"][i % 2])
            if t < -0.5: EVENTS.append((t_o + 0.45, "tick"))
    elif tp == "foto":   # foto asli dalam bingkai kertas + zoom pelan
        if sc.get("judul"): P(c, bigfit(f"{key}-j", [sc["judul"]], 96, G.INK, 980), CX + 10, TOP - 40, t, 0.0, D, "slam")
        src = Image.open(sc["foto"]); ar = src.width / src.height
        if ar < 0.95:   # foto/poster tegak: bingkai tegak agar tidak terpotong
            fh = 860; fw = int((fh - 40) * ar + 40); z = 1.0 + 0.03 * R.clamp(t / max(D, 0.5))
        else:
            fw = 990; fh = int(min(760, (fw - 40) / ar + 40)); z = 1.0 + 0.08 * R.clamp(t / max(D, 0.5))
        im = M.foto_frame(sc["foto"], fw, fh, z, sc.get("kredit"))
        P(c, im, CX - 4 + (990 - fw) // 2, TOP + 90, t, 0.06, D, "up", 0.2)
    elif tp == "pohon":  # bagan cabang: akar -> anak -> cucu, muncul sesuai ucapan
        root = sc["akar"]; kids = sc["anak"]
        rim, rh = M.node(f"{key}-root", root[0], root[1], 560, True)
        P(c, rim, CX + 215, TOP - 40, t, W_(root[1], 0.05), D, "slam")
        ky = TOP - 40 + rh + 70
        kx = [CX, CX + 510]
        for i, kd in enumerate(kids):
            kim, kh = M.node(f"{key}-k{i}", kd[0], kd[1], 480)
            tk = W_(kd[1], 0.2 + 0.2 * i)
            ln = M.line_layer(f"{key}-l{i}", [(495, 0), (495, 35), (kx[i] - CX + 240, 35), (kx[i] - CX + 240, 70)], 1000, 80)
            P(c, ln, CX, ky - 72, t, tk - 0.05, D, "wipe", 0.18, sound=False)
            P(c, kim, kx[i], ky, t, tk, D, "pop")
            gy = ky + kh + 50; acc = 0
            for j, cc in enumerate(kd[2] if len(kd) > 2 else []):
                gim, gh = M.node(f"{key}-g{i}{j}", cc[0], cc[1], 440)
                tg = W_(cc[1], 0.6 + 0.15 * j)
                yy = gy + acc; mid = yy - (ky + kh - 6) + gh / 2
                gl = M.line_layer(f"{key}-gl{i}{j}-{int(mid)}", [(24, 0), (24, mid), (44, mid)], 60, int(mid) + 10)
                P(c, gl, kx[i] + 6, ky + kh - 6, t, tg - 0.05, D, "wipe", 0.18, sound=False)
                P(c, gim, kx[i] + 50, yy, t, tg, D, "left")
                acc += gh + 24
    elif tp == "cta":
        P(c, bigfit(f"{key}-j", [sc["judul"]], 96, G.INK, 980), CX + 10, TOP - 20, t, 0.0, D, "slam")
        P(c, R.card_frame(f"{key}-cf", 990, 380, sc["label"], None), CX, TOP + 150, t, 0.1, D, "up")
        P(c, bigfit(f"{key}-b", sc["baris"], 80, G.BROWN, 900), CX + 50, TOP + 240, t, W_(sc["baris"][0]), D, "left")
        t_s = W_(sc.get("stiker", "SIAP!"), 0.85)
        P(c, F.sticker(f"{key}-siap", sc.get("stiker", "SIAP!"), G.GOLD_L, G.INK, -7, 90), CX + 470, 1100, t, t_s, D, "spin", sound=False)
        if t < -0.5: EVENTS.append((t_s, "ding"))
        sc["_hormat"] = t_s

def mascot_tl(sc):
    m = sc.get("maskot", "senyum")
    if sc["tipe"] == "cta":
        return [(0, "senyum"), (sc.get("_hormat", sc["lead"] + sc["audio"] * 0.85), "hormat")]
    return [(0, m)]

# ------------------------------------------------------------------ zona aman (TikTok/Reels/Shorts)
# Semua yang penting di dalam x 60-900, y 240-1440: atas = tab/profil, bawah = caption/musik, kanan = tombol like/komen/share.
# Tata letak: user memilih tata letak lama (penuh, tanpa margin zona aman besar).
SAFE = (45, 110, 1035, 1906)        # batas dipakai untuk subtitle & progress bar
CS = 1.0
COFF = (0, 0)
BAR_S = R.BAR
M_W, M_H, M_X, M_BOTTOM = 360, 378, 40, 1440 + 378
MASCOT_S = dict(R.MASCOT)
SUB_CX, SUB_Y = 540, 1300

def draw_subs(c, t, text, D, subs):
    for k, x in enumerate(F.sub_chunks(text)):
        a = subs[k] if k < len(subs) else D
        b = subs[k + 1] if k + 1 < len(subs) else D + 1
        if a <= t < b:
            im = F.sub_img(x)
            if im.width > SAFE[2] - SAFE[0] - 20:   # subtitle panjang diperkecil agar tidak masuk zona tombol
                f = (SAFE[2] - SAFE[0] - 20) / im.width; im = im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS)
            p = R.clamp((t - a) / 0.12); s = 0.85 + 0.15 * R.ease_out_back(p)
            im2 = im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
            c.alpha_composite(im2, (int(SUB_CX - im2.width / 2), int(SUB_Y + (im.height - im2.height) / 2)))

def draw_mascot(c, t, tl, t0):
    expr, last = tl[0][1], tl[0][0]
    for lt, e in tl:
        if t >= lt: expr, last = e, lt
    bob = math.sin((t0 + t) * 2 * math.pi * 0.6) * 6
    since = t - last
    s = 1 + 0.08 * math.exp(-since * 6) * math.cos(since * 18) if since < 1 else 1
    im = MASCOT_S[expr]
    if abs(s - 1) > 1e-3: im = im.resize((int(M_W * s), int(M_H * s)), Image.BILINEAR)
    c.alpha_composite(im, (int(M_X + (M_W - im.width) / 2), int(M_BOTTOM - im.height + bob)))

def _tint(col, k):
    o = Image.new("RGBA", (W, H), col); return Image.blend(R.BG, o, k)
def _pattern(kind, col):
    im = Image.new("RGBA", (W, H), col); d = ImageDraw.Draw(im)
    if kind == "dots":
        for yy in range(30, H, 54):
            for xx in range(30 + (yy // 54 % 2) * 27, W, 54): d.ellipse((xx - 4, yy - 4, xx + 4, yy + 4), fill="#E1D2B4")
    else:
        for k in range(-H, W, 70): d.line((k, 0, k + H, H), fill="#E8DCC2", width=14)
    return im
BGS = [R.BG, _tint("#F4E4B5", 0.28), _pattern("dots", "#F1E8D4"), _tint("#DCE4E0", 0.35), _pattern("stripe", "#F2EADA")]

def scene_meta(spec, i):
    sc = spec["adegan"][i]
    if "_shakes" not in sc:
        global SHAKES, EVENTS
        SHAKES, EVENTS = [], []
        globals()["SHAKES"], globals()["EVENTS"] = SHAKES, EVENTS
        scene(Image.new("RGBA", (10, 10)), -1, sc, f"e{spec['_key']}s{i}")
        sc["_shakes"] = list(SHAKES)
        sc["_bumps"] = sorted({round(t0, 2) for t0, k in EVENTS if t0 > 0.2})
    return sc

def frame(spec, i, t):
    sc = scene_meta(spec, i); D = sc["durasi"]
    c = BGS[i % len(BGS)].copy(); c.alpha_composite(BAR_S, (SAFE[0], SAFE[1]))
    content = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    scene(content, t, sc, f"e{spec['_key']}s{i}")
    # transisi masuk (0.16 dtk) bergantian: punch-zoom / geser dari kanan / geser dari bawah; drift pelan sepanjang adegan
    var = i % 3; k = R.clamp(t / 0.16); e = R.ease_out(k)
    s = (1 + 0.025 * t / max(D, 0.1)) * CS
    dx = dy = 0
    if i > 0 or var == 0:
        if var == 0: s *= 1.12 - 0.12 * e
        elif var == 1: dx = (1 - e) * 320
        else: dy = (1 - e) * 260
    # transisi keluar (0.1 dtk terakhir): konten tersentak ke arah berlawanan
    if i < len(spec["adegan"]) - 1 and t > D - 0.1:
        q = R.clamp((t - (D - 0.1)) / 0.1); dx -= q * q * 260 * (1 if var != 2 else 0); dy -= q * q * 220 * (1 if var == 2 else 0)
    # hentakan kamera kecil tiap ada elemen baru (memberi kesan potongan cepat)
    for tb in sc["_bumps"]:
        if 0 <= t - tb < 0.14: s *= 1 + 0.035 * (1 - (t - tb) / 0.14)
    # guncangan layar saat stempel/slam
    for ts in sc["_shakes"]:
        if 0 <= t - ts < 0.18:
            a = (1 - (t - ts) / 0.18) * 14; dx += a * math.sin(t * 95); dy += a * math.cos(t * 80)
    cw, ch_ = round(W * s), round(H * s)
    content = content.resize((cw, ch_), Image.BILINEAR)
    zx = round(COFF[0] - (cw - W * CS) / 2 + dx); zy = round(COFF[1] - (ch_ - H * CS) / 2 + dy)
    sx, sy = max(-zx, 0), max(-zy, 0)
    if sx < cw and sy < ch_:
        c.alpha_composite(content.crop((sx, sy, min(cw, sx + W - max(zx, 0)), min(ch_, sy + H - max(zy, 0)))), (max(zx, 0), max(zy, 0)))
    if i > 0 and i % 4 == 2 and t < 0.22:   # transisi panel emas menyapu keluar
        q = R.ease_out(R.clamp(t / 0.22)); xw = int(W * q)
        ImageDraw.Draw(c).polygon([(xw, 0), (W + 200, 0), (W + 200, H), (xw - 200, H)], fill=G.GOLD)
    draw_mascot(c, t, mascot_tl(sc), sc["cut"])
    draw_subs(c, t, sc["narasi"], D, sc["subs"])
    total = spec["_total"]; prog = (sc["cut"] + t) / total
    ImageDraw.Draw(c).rectangle((0, H - 14, max(10, int(W * prog)), H), fill=G.BROWN)
    return c

def render(spec, out_dir):
    os.makedirs(f"{out_dir}/scenes", exist_ok=True)
    files = []
    for i, sc in enumerate(spec["adegan"]):
        n = int(round(sc["durasi"] * FPS)); fn = f"{out_dir}/scenes/s{i+1:02d}.mp4"
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                              "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", fn + ".tmp.mp4"], stdin=subprocess.PIPE)
        for f in range(n): p.stdin.write(frame(spec, i, f / FPS).convert("RGB").tobytes())
        p.stdin.close(); assert p.wait() == 0; os.replace(fn + ".tmp.mp4", fn); files.append(fn)
    open(f"{out_dir}/list.txt", "w").write("".join(f"file '{os.path.abspath(f)}'\n" for f in files))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{out_dir}/list.txt", "-c", "copy", f"{out_dir}/video.mp4"], check=True)

def sfx_tracks(spec, out_dir):
    global EVENTS
    evs = []
    dummy = Image.new("RGBA", (10, 10))
    for i, sc in enumerate(spec["adegan"]):
        EVENTS = []
        globals()["EVENTS"] = EVENTS; globals()["SHAKES"] = []
        scene(dummy, -1, sc, f"e{spec['_key']}s{i}")
        evs += [(sc["cut"] + t0, k) for t0, k in EVENTS]
        if i > 0: evs.append((sc["cut"], "swish"))
    if spec["adegan"][0].get("maskot") in ("kaget", "mikir"): evs.append((0.0, "boing"))
    total = spec["_total"]
    evs.sort(); kept = []
    for t, k in evs:
        if kept and t - kept[-1][0] < 0.12:
            if S.PRIO[k] > S.PRIO[kept[-1][1]]: kept[-1] = (t, k)
            continue
        kept.append((t, k))
    thin = []
    for t, k in kept:
        if k in ("whoosh", "swish"):
            if [u for u, kk in kept if kk not in ("whoosh", "swish") and abs(u - t) < 0.35] or [u for u, kk in thin if kk in ("whoosh", "swish") and t - u < 0.6]:
                continue
        thin.append((t, k))
    tr = np.zeros(int(S.SR * (total + 1)))
    for t, k in thin:
        s = S.SOUNDS[k] * S.GAIN[k]; i0 = int(t * S.SR); tr[i0:i0 + len(s)] += s[: len(tr) - i0]
    S.save(f"{out_dir}/sfx.wav", np.clip(tr[: int(S.SR * total)], -1, 1))
    S.save(f"{out_dir}/musik.wav", S.bgm(total))
    return len(thin)

def mix(out_dir, mp3, final):
    filt = ("[1:a]aresample=48000,apad,volume=1.6,asplit=2[v][vk];[2:a]volume=0.8[s];[3:a]volume=0.30[m];"
            "[m][vk]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=250[md];[s][md]amix=inputs=2:normalize=0[bg];"
            "[v][bg]amix=inputs=2:normalize=0:duration=shortest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{out_dir}/video.mp4", "-i", mp3, "-i", f"{out_dir}/sfx.wav", "-i", f"{out_dir}/musik.wav",
                    "-filter_complex", filt, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", final + ".tmp.mp4"], check=True)
    os.replace(final + ".tmp.mp4", final)

def pasang_sampul(final, png, dur=0.5):
    """Sampul jadi frame pertama (dipakai otomatis sebagai cover IG/TikTok); suara digeser 0.5 dtk."""
    tmp = final[:-4] + ".tmp.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", png, "-i", final, "-filter_complex",
        f"[0:v]format=yuv420p,loop=-1:1,trim=duration={dur},setsar=1[c];[1:v]setsar=1[m];[c][m]concat=n=2:v=1:a=0[v];"
        f"[1:a]adelay={int(dur*1000)}:all=1[a]", "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, final)

if __name__ == "__main__":
    ep, out = sys.argv[1], sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "full"
    spec = json.load(open(f"{ep}/naskah.json")); spec["_key"] = os.path.basename(ep.rstrip("/"))[:2]
    def esc(v):
        if isinstance(v, str): return v.replace("&", "&amp;").replace("<", "&lt;")
        if isinstance(v, list): return [esc(x) for x in v]
        return v
    for sc in spec["adegan"]:
        for k in list(sc):
            if k not in ("narasi", "ucapan", "tipe", "maskot", "ikon"): sc[k] = esc(sc[k])
    mp3 = f"{ep}/suara-elevenlabs/narasi-utuh.mp3"
    os.makedirs(out, exist_ok=True)
    if spec.get("padat", True):   # pangkas jeda diam (maks ~0.18 dtk) + sedikit dipercepat 5% agar ritme Reels
        padat = f"{out}/narasi-padat.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-af",
            "silenceremove=start_periods=1:start_threshold=-40dB:stop_periods=-1:stop_duration=0.2:stop_threshold=-40dB:stop_silence=0.18,atempo=1.05",
            "-ar", "44100", padat], check=True)
        mp3 = padat
    spec["_total"] = build_timing(spec, mp3) + 0.8
    spec["_total"] = sum(sc["durasi"] for sc in spec["adegan"])
    os.makedirs(out, exist_ok=True)
    json.dump(spec, open(f"{out}/timing.json", "w"), ensure_ascii=False, indent=1)
    if mode == "still":
        ims = [frame(spec, i, sc["lead"] + sc["audio"] * 0.95).convert("RGB").resize((360, 640)) for i, sc in enumerate(spec["adegan"])]
        o = Image.new("RGB", (len(ims) * 370, 650), "white")
        for k, im in enumerate(ims): o.paste(im, (k * 370, 0))
        o.save(f"{out}/stills.png"); print("stills ok"); sys.exit()
    render(spec, out); n = sfx_tracks(spec, out)
    final = f"{out}/{os.path.basename(ep.rstrip('/'))}.mp4"; mix(out, mp3, final)
    if "sampul" in spec:
        import sampul
        png = sampul.make(json.load(open(f"{ep}/naskah.json"))["sampul"], f"{out}/sampul.png")
        pasang_sampul(final, png)
    print("selesai", final, round(spec["_total"], 1), "dtk,", n, "efek")
