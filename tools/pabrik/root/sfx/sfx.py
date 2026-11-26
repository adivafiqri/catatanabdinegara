"""Sintesis efek suara + musik latar (bebas hak cipta, dibuat dari nol) dan susun track SFX dari event animasi."""
import json, os, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
OUT = "/home/claude/sfx/out"
os.makedirs(f"{OUT}/aset", exist_ok=True)
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.003, r=None, curve=4.0):
    e = np.ones(n); na = max(1, min(n, int(SR * a))); e[:na] = np.linspace(0, 1, na)
    tail = np.linspace(1, 0, n - na) ** curve; e[na:] = tail
    return e
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak

def pop():
    d = 0.11; t = t_(d); f = 950 * np.exp(-t * 18) + 380
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, curve=3)
    click = bp(rng.standard_normal(len(t)), 2000, 8000) * env(len(t), 0.0005, curve=30) * 0.4
    return norm(x + click, 0.8)

def whoosh(d=0.32, lo=250, hi=4500):
    n = int(SR * d); x = rng.standard_normal(n); p = np.linspace(0, 1, n)
    low = bp(x, lo, lo * 4); mid = bp(x, lo * 3, hi * 0.7); high = bp(x, hi * 0.5, min(hi * 1.8, 20000))
    out = low * np.clip(1 - 2 * p, 0, 1) + mid * (1 - np.abs(2 * p - 1)) + high * np.clip(2 * p - 1, 0, 1)
    shape = np.sin(np.pi * p) ** 1.5
    return norm(out * shape, 0.7)

def swish(): return whoosh(0.16, 900, 9000)

def ding():
    d = 0.7; t = t_(d)
    x = (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t))
    return norm(x * env(len(t), 0.002, curve=2.2), 0.6)

def stamp():
    d = 0.35; t = t_(d)
    low = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 25)) * t) * env(len(t), 0.001, curve=3)
    hit = bp(rng.standard_normal(len(t)), 200, 3000) * env(len(t), 0.0005, curve=12)
    return norm(low + 0.7 * hit, 0.95)

def boing():
    d = 0.45; t = t_(d); f = 300 + 120 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 5) + 200 * t
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.004, curve=1.8)
    return norm(x, 0.6)

def tick():
    t = t_(0.03); return norm(bp(rng.standard_normal(len(t)), 3000, 9000) * env(len(t), 0.0003, curve=20), 0.5)

def bgm(total, bpm=112):
    """Loop musik latar ringan: kick, hi-hat, pad akor."""
    n = int(SR * total); out = np.zeros(n); beat = 60 / bpm
    kick_t = t_(0.25); kick = np.sin(2 * np.pi * (50 + 110 * np.exp(-kick_t * 30)) * kick_t) * env(len(kick_t), 0.001, curve=4)
    hat_t = t_(0.05); hat = bp(rng.standard_normal(len(hat_t)), 7000, 15000) * env(len(hat_t), 0.0005, curve=8) * 0.35
    chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0]]
    bar = beat * 4
    k = 0
    while k * beat < total:
        s = int(k * beat * SR)
        if k % 4 in (0, 2) or (k % 8 == 7):
            seg = kick[: n - s]; out[s:s + len(seg)] += 0.8 * seg
        s2 = int((k + 0.5) * beat * SR)
        if s2 < n:
            seg = hat[: n - s2]; out[s2:s2 + len(seg)] += seg
        k += 1
    b = 0
    while b * bar < total:
        s = int(b * bar * SR); d = min(bar, total - b * bar); tt = t_(d)
        pad = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt) for f in chords[b % 4])
        pad *= np.minimum(1, tt / 0.08) * np.minimum(1, (d - tt) / 0.15) * 0.10
        # plucky arp on top
        for j, f in enumerate(chords[b % 4] * 2):
            st = j * beat / 2
            if st >= d: break
            at = t_(min(0.3, d - st)); pl = np.sin(2 * np.pi * f * 2 * at) * env(len(at), 0.002, curve=5) * 0.12
            i0 = int(st * SR); pad[i0:i0 + len(pl)] += pl
        out[s:s + len(pad)] += pad
        b += 1
    out[: int(SR * 0.3)] *= np.linspace(0, 1, int(SR * 0.3))
    out[-int(SR * 0.8):] *= np.linspace(1, 0, int(SR * 0.8))
    return norm(out, 0.7)

def save(path, x):
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())

SOUNDS = {"pop": pop(), "whoosh": whoosh(), "swish": swish(), "ding": ding(), "stamp": stamp(), "boing": boing(), "tick": tick()}
GAIN = {"pop": 0.55, "whoosh": 0.35, "swish": 0.3, "ding": 0.4, "stamp": 0.75, "boing": 0.45, "tick": 0.25}
PRIO = {"stamp": 5, "ding": 4, "boing": 3, "pop": 2, "whoosh": 1, "swish": 0}

if __name__ == "__main__":
    for k, v in SOUNDS.items():
        save(f"{OUT}/aset/sfx-{k}.wav", v)
    events = json.load(open(sys.argv[1]))
    total = events["total"]
    save(f"{OUT}/aset/musik-latar-loop.wav", bgm(total))
    # de-duplicate: within 0.12 s keep highest priority
    evs = sorted(events["events"], key=lambda e: e[0]); kept = []
    for t, k in evs:
        if kept and t - kept[-1][0] < 0.12:
            if PRIO[k] > PRIO[kept[-1][1]]: kept[-1] = (t, k)
            continue
        kept.append((t, k))
    thin = []
    for j, (t, k) in enumerate(kept):
        if k in ("whoosh", "swish"):
            near = [u for u, kk in kept if kk not in ("whoosh", "swish") and abs(u - t) < 0.35]
            prev = [u for u, kk in thin if kk in ("whoosh", "swish") and t - u < 0.6]
            if near or prev: continue
        thin.append((t, k))
    kept = thin
    track = np.zeros(int(SR * (total + 1)))
    for t, k in kept:
        s = SOUNDS[k] * GAIN[k]; i = int(t * SR); track[i:i + len(s)] += s[: len(track) - i]
    track = track[: int(SR * total)]
    save(f"{OUT}/sfx-track.wav", np.clip(track, -1, 1))
    save(f"{OUT}/musik-latar.wav", bgm(total))
    print(len(kept), "efek dipasang:", ", ".join(f"{t:.2f}s {k}" for t, k in kept))
