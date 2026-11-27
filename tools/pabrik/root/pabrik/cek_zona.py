"""Overlay zona UI TikTok/Reels/Shorts di atas frame untuk cek. python3 cek_zona.py in.png out.png"""
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert("RGBA"); o = Image.new("RGBA", im.size, (0,0,0,0)); d = ImageDraw.Draw(o)
d.rectangle((0, 0, 1080, 240), fill=(220, 0, 0, 70))        # tab Following/For You, profil IG
d.rectangle((0, 1440, 1080, 1920), fill=(220, 0, 0, 70))    # caption, username, musik
d.rectangle((900, 240, 1080, 1440), fill=(220, 0, 0, 70))   # tombol like/komen/share/simpan
d.rectangle((0, 240, 60, 1440), fill=(220, 120, 0, 50))     # margin kiri
im.alpha_composite(o); im.convert("RGB").save(sys.argv[2])
