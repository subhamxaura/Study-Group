import os, sys, time, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

WIDTH, HEIGHT = 1920, 1080
FPS = 30
TOTAL_FRAMES = 2205 # 73.5 seconds

# Fonts
FONT_BOLD = ImageFont.truetype('segoeuib.ttf', 44)
FONT_TITLE = ImageFont.truetype('segoeuib.ttf', 32)
FONT_BODY = ImageFont.truetype('segoeui.ttf', 24)
FONT_SUBTITLE = ImageFont.truetype('segoeui.ttf', 21)
FONT_BADGE = ImageFont.truetype('segoeuib.ttf', 16)
FONT_HERO = ImageFont.truetype('georgiab.ttf', 52)
FONT_HERO_SUB = ImageFont.truetype('segoeui.ttf', 28)

# Load mockups
print("Loading pre-rendered studio mockups...")
MOCKUPS = {
    'dashboard': Image.open('promo_build/mockups/dashboard_mockup.png').convert('RGBA'),
    'focus': Image.open('promo_build/mockups/focus_mockup.png').convert('RGBA'),
    'calendar': Image.open('promo_build/mockups/calendar_mockup.png').convert('RGBA'),
    'tasks': Image.open('promo_build/mockups/tasks_mockup.png').convert('RGBA'),
    'analytics': Image.open('promo_build/mockups/analytics_mockup.png').convert('RGBA'),
    'studymate': Image.open('promo_build/mockups/studymate_mockup.png').convert('RGBA')
}

# Pre-generate floating particles
np.random.seed(42)
NUM_PARTICLES = 40
PARTICLES = []
for _ in range(NUM_PARTICLES):
    PARTICLES.append({
        'x': np.random.uniform(50, WIDTH - 50),
        'y': np.random.uniform(50, HEIGHT - 50),
        'speed_y': np.random.uniform(15, 35),
        'amp_x': np.random.uniform(20, 45),
        'freq_x': np.random.uniform(0.4, 1.0),
        'phase': np.random.uniform(0, math.pi * 2),
        'size': np.random.uniform(5, 14),
        'alpha': int(np.random.uniform(40, 130))
    })

# Pre-render background base
BG_BASE = Image.new('RGBA', (WIDTH, HEIGHT), (9, 20, 14, 255))
bg_draw = ImageDraw.Draw(BG_BASE)
for y in range(HEIGHT):
    factor = y / HEIGHT
    r = int(7 + 10 * factor)
    g = int(16 + 18 * factor)
    b = int(11 + 13 * factor)
    bg_draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

def draw_brand_mark(target_draw, cx, cy, radius=40):
    target_draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(21, 115, 67, 240), outline=(52, 211, 153, 220), width=3)
    r_in = radius * 0.52
    pts_left = [(cx - 4, cy + r_in*0.6), (cx - r_in, cy + r_in*0.4), (cx - r_in*1.1, cy - r_in*0.5), (cx - 4, cy - r_in*0.7)]
    target_draw.polygon(pts_left, fill=(255, 255, 255, 240))
    pts_right = [(cx + 4, cy + r_in*0.6), (cx + r_in, cy + r_in*0.4), (cx + r_in*1.1, cy - r_in*0.5), (cx + 4, cy - r_in*0.7)]
    target_draw.polygon(pts_right, fill=(255, 255, 255, 240))
    stem = [(cx, cy - r_in*0.9), (cx + 3, cy - r_in*0.3), (cx, cy + r_in*0.7)]
    target_draw.line(stem, fill=(52, 211, 153, 255), width=2)

def draw_top_bar(draw, scene_num, scene_title):
    draw.ellipse([50, 42, 78, 70], fill=(21, 115, 67, 220), outline=(52, 211, 153, 180), width=2)
    draw.text((64, 56), '✦', font=FONT_BADGE, fill=(255, 255, 255), anchor='mm')
    draw.text((90, 46), 'STUDY-GROUP', font=FONT_TITLE, fill=(240, 255, 245))
    draw.text((90, 76), 'Collaborative Academic Workspace', font=FONT_BADGE, fill=(110, 160, 130))
    
    pill_text = f'{scene_num}  •  {scene_title}'
    draw.rounded_rectangle([WIDTH - 380, 45, WIDTH - 50, 85], radius=20, fill=(15, 32, 22, 200), outline=(34, 197, 94, 80), width=1)
    draw.text((WIDTH - 215, 65), pill_text, font=FONT_BADGE, fill=(52, 211, 153), anchor='mm')

def draw_subtitle_bar(draw, text):
    if not text:
        return
    bbox = FONT_SUBTITLE.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    pad_x, pad_y = 36, 12
    box_w = tw + pad_x * 2
    box_h = th + pad_y * 2
    bx1 = (WIDTH - box_w) // 2
    by1 = 985
    bx2 = bx1 + box_w
    by2 = by1 + box_h
    
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=18, fill=(10, 22, 15, 235), outline=(34, 197, 94, 70), width=1)
    draw.text((WIDTH // 2, by1 + box_h // 2), text, font=FONT_SUBTITLE, fill=(245, 255, 248), anchor='mm')

# Subtitles timeline — disabled per user request: voiceover speaks naturally without burned-in caption overlay
SUBTITLES = []

def get_subtitle(frame_idx):
    for s, e, txt in SUBTITLES:
        if s <= frame_idx < e:
            return txt
    return ""

out_mp4 = 'study-group-promo-v2.mp4'
cmd = [
    ffmpeg_exe, '-y',
    '-loglevel', 'error',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', f'{WIDTH}x{HEIGHT}',
    '-pix_fmt', 'rgba',
    '-r', str(FPS),
    '-i', '-',
    '-i', 'promo_build/audio/v2/master_soundtrack.wav',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    out_mp4
]

print("Launching FFmpeg with non-blocking pipe...")
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

start_time = time.time()

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    
    frame = BG_BASE.copy()
    fdraw = ImageDraw.Draw(frame)
    
    for p in PARTICLES:
        py = (p['y'] - t * p['speed_y']) % HEIGHT
        px = p['x'] + math.sin(t * p['freq_x'] + p['phase']) * p['amp_x']
        pr = p['size'] * (0.8 + 0.2 * math.sin(t * 2 + p['phase']))
        fdraw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(52, 211, 153, p['alpha']))
        
    if frame_idx < 345:
        p_scene = frame_idx / 345.0
        glow_r = int(180 + 25 * math.sin(t * 3.0))
        cx, cy = WIDTH // 2, 430
        fdraw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=(21, 115, 67, 35))
        
        mark_scale = min(1.0, p_scene * 3.0)
        draw_brand_mark(fdraw, cx, cy - 130, radius=int(65 * mark_scale))
        
        alpha_title = min(255, int(p_scene * 4.0 * 255))
        fdraw.text((cx, cy - 20), "Study-Group", font=FONT_HERO, fill=(255, 255, 255, alpha_title), anchor='mm')
        fdraw.text((cx, cy + 45), "Cultivate Your Knowledge · Learn Together", font=FONT_HERO_SUB, fill=(52, 211, 153, alpha_title), anchor='mm')
        fdraw.text((cx, cy + 100), "The all-in-one collaborative workspace engineered to elevate student productivity.", font=FONT_BODY, fill=(180, 215, 195, alpha_title), anchor='mm')
        
        pill_y = cy + 175
        pills = [
            ("✦ Collaborative Study Circles", 320),
            ("⏱ Focus Greenhouse Pomodoro", 330),
            ("🤖 StudyMate AI Tutor", 270)
        ]
        start_px = cx - 480
        for p_txt, p_w in pills:
            fdraw.rounded_rectangle([start_px, pill_y, start_px + p_w, pill_y + 46], radius=23, fill=(16, 36, 24, 220), outline=(34, 197, 94, 90), width=1)
            fdraw.text((start_px + p_w // 2, pill_y + 23), p_txt, font=FONT_BADGE, fill=(240, 255, 245), anchor='mm')
            start_px += p_w + 30
            
    elif frame_idx < 666:
        draw_top_bar(fdraw, "01", "UNIFIED DASHBOARD")
        p_scene = (frame_idx - 345) / 321.0
        spring = 1.0 - math.exp(-7.0 * p_scene)
        cam_scale = 0.88 + 0.08 * p_scene
        
        mock = MOCKUPS['dashboard']
        mw = int(mock.width * cam_scale)
        mh = int(mock.height * cam_scale)
        mock_scaled = mock.resize((mw, mh), Image.Resampling.BILINEAR)
        
        mx = (WIDTH - mw) // 2
        my = int(120 + 20 * (1.0 - spring) + 6 * math.sin(t * 1.6))
        frame.paste(mock_scaled, (mx, my), mock_scaled)
        
        fdraw.rounded_rectangle([mx + 120, my + 80, mx + 490, my + 130], radius=25, fill=(15, 31, 23, 235), outline=(52, 211, 153, 140), width=2)
        fdraw.text((mx + 305, my + 105), "✦ Morning Greeting & Daily Study Streaks", font=FONT_BADGE, fill=(240, 255, 245), anchor='mm')
        
    elif frame_idx < 1005:
        draw_top_bar(fdraw, "02", "FOCUS GREENHOUSE")
        p_scene = (frame_idx - 666) / 339.0
        cam_scale = 0.90 + 0.09 * p_scene
        mock = MOCKUPS['focus']
        mw = int(mock.width * cam_scale)
        mh = int(mock.height * cam_scale)
        mock_scaled = mock.resize((mw, mh), Image.Resampling.BILINEAR)
        
        mx = (WIDTH - mw) // 2
        my = int(125 + 6 * math.sin(t * 1.8))
        frame.paste(mock_scaled, (mx, my), mock_scaled)
        
        aura_r = int(130 + 20 * math.sin(t * 4.0))
        fdraw.ellipse([WIDTH // 2 - aura_r, my + 380 - aura_r, WIDTH // 2 + aura_r, my + 380 + aura_r], outline=(52, 211, 153, 120), width=3)
        
        fdraw.rounded_rectangle([mx + mw - 360, my + mh - 130, mx + mw - 60, my + mh - 75], radius=20, fill=(15, 31, 23, 230), outline=(34, 197, 94, 90), width=1)
        fdraw.text((mx + mw - 210, my + mh - 102), "((o))  Ambient Focus Soundscape", font=FONT_BADGE, fill=(52, 211, 153), anchor='mm')
        
    elif frame_idx < 1299:
        draw_top_bar(fdraw, "03", "CALENDAR & TASKS")
        p_scene = (frame_idx - 1005) / 294.0
        
        cal = MOCKUPS['calendar']
        tasks = MOCKUPS['tasks']
        c_w = int(cal.width * 0.72)
        c_h = int(cal.height * 0.72)
        cal_scaled = cal.resize((c_w, c_h), Image.Resampling.BILINEAR)
        
        t_w = int(tasks.width * 0.72)
        t_h = int(tasks.height * 0.72)
        tasks_scaled = tasks.resize((t_w, t_h), Image.Resampling.BILINEAR)
        
        cal_x = int(-80 + p_scene * 160)
        cal_y = int(170 + 8 * math.sin(t * 1.5))
        frame.paste(cal_scaled, (cal_x, cal_y), cal_scaled)
        
        task_x = int(WIDTH - t_w + 80 - p_scene * 160)
        task_y = int(220 + 8 * math.cos(t * 1.5))
        frame.paste(tasks_scaled, (task_x, task_y), tasks_scaled)
        
        fdraw.rounded_rectangle([WIDTH // 2 - 190, 115, WIDTH // 2 + 190, 165], radius=25, fill=(15, 31, 23, 240), outline=(52, 211, 153, 140), width=2)
        fdraw.text((WIDTH // 2, 140), "✦ Unified Schedule & Priority Queue", font=FONT_BADGE, fill=(240, 255, 245), anchor='mm')
        
    elif frame_idx < 1605:
        draw_top_bar(fdraw, "04", "STUDY ANALYTICS")
        p_scene = (frame_idx - 1299) / 306.0
        cam_scale = 0.90 + 0.08 * p_scene
        mock = MOCKUPS['analytics']
        mw = int(mock.width * cam_scale)
        mh = int(mock.height * cam_scale)
        mock_scaled = mock.resize((mw, mh), Image.Resampling.BILINEAR)
        
        mx = (WIDTH - mw) // 2
        my = int(125 + 6 * math.sin(t * 1.7))
        frame.paste(mock_scaled, (mx, my), mock_scaled)
        
        fdraw.rounded_rectangle([mx + 100, my + mh - 130, mx + 510, my + mh - 75], radius=25, fill=(15, 31, 23, 235), outline=(52, 211, 153, 140), width=2)
        fdraw.text((mx + 305, my + mh - 102), "📈 Real-Time Hours, Consistency & Goals", font=FONT_BADGE, fill=(240, 255, 245), anchor='mm')
        
    elif frame_idx < 1911:
        draw_top_bar(fdraw, "05", "STUDYMATE AI TUTOR")
        p_scene = (frame_idx - 1605) / 306.0
        cam_scale = 0.96 + 0.06 * p_scene
        ai_card = MOCKUPS['studymate']
        aw = int(ai_card.width * cam_scale)
        ah = int(ai_card.height * cam_scale)
        ai_scaled = ai_card.resize((aw, ah), Image.Resampling.BILINEAR)
        
        ax = (WIDTH - aw) // 2
        ay = int(140 + 7 * math.sin(t * 1.6))
        frame.paste(ai_scaled, (ax, ay), ai_scaled)
        
        peers = [
            ("Alex (Organic Chem)", 180, 260),
            ("Elena (Algorithms)", WIDTH - 260, 240),
            ("Marcus (Pomodoro Room)", WIDTH - 290, 680)
        ]
        for name, px, py in peers:
            fdraw.rounded_rectangle([px - 100, py - 20, px + 100, py + 20], radius=18, fill=(16, 36, 25, 210), outline=(34, 197, 94, 80), width=1)
            fdraw.text((px, py), f"● {name}", font=FONT_BADGE, fill=(200, 240, 215), anchor='mm')
            
    else:
        p_scene = (frame_idx - 1911) / 294.0
        
        cards_layout = [
            ('calendar', -180, 280, 0.52),
            ('tasks', 240, 220, 0.56),
            ('analytics', WIDTH - 460, 220, 0.56),
            ('focus', WIDTH - 120, 280, 0.52),
            ('dashboard', WIDTH // 2 - 420, 160, 0.72)
        ]
        
        for name, cx, cy, sc in cards_layout:
            m = MOCKUPS[name]
            cw = int(m.width * sc)
            ch = int(m.height * sc)
            m_sc = m.resize((cw, ch), Image.Resampling.BILINEAR)
            hover_y = int(cy + 6 * math.sin(t * 2.0 + cx * 0.01))
            frame.paste(m_sc, (cx, hover_y), m_sc)
            
        cta_y = 660
        fdraw.rounded_rectangle([WIDTH // 2 - 450, cta_y, WIDTH // 2 + 450, cta_y + 240], radius=30, fill=(10, 24, 16, 250), outline=(52, 211, 153, 160), width=3)
        
        draw_brand_mark(fdraw, WIDTH // 2, cta_y + 40, radius=28)
        fdraw.text((WIDTH // 2, cta_y + 88), "Study-Group", font=FONT_TITLE, fill=(255, 255, 255), anchor='mm')
        fdraw.text((WIDTH // 2, cta_y + 124), "Cultivate your knowledge. Learn together, in one workspace.", font=FONT_BODY, fill=(180, 220, 195), anchor='mm')
        
        btn_w, btn_h = 420, 56
        bx1 = (WIDTH - btn_w) // 2
        by1 = cta_y + 155
        fdraw.rounded_rectangle([bx1, by1, bx1 + btn_w, by1 + btn_h], radius=28, fill=(21, 115, 67, 255), outline=(255, 255, 255, 140), width=2)
        fdraw.text((WIDTH // 2, by1 + btn_h // 2), "Start Learning Together  ➜", font=FONT_TITLE, fill=(255, 255, 255), anchor='mm')

    cur_sub = get_subtitle(frame_idx)
    draw_subtitle_bar(fdraw, cur_sub)
    
    raw_bytes = frame.tobytes()
    proc.stdin.write(raw_bytes)
    
    if (frame_idx + 1) % 150 == 0 or frame_idx == TOTAL_FRAMES - 1:
        elapsed = time.time() - start_time
        fps_curr = (frame_idx + 1) / elapsed
        eta = (TOTAL_FRAMES - frame_idx - 1) / (fps_curr + 1e-5)
        print(f"Rendered [{frame_idx + 1}/{TOTAL_FRAMES}] frames ({((frame_idx + 1)/TOTAL_FRAMES)*100:.1f}%) | Speed: {fps_curr:.1f} FPS | ETA: {eta:.0f}s", flush=True)

proc.stdin.close()
proc.wait()
print(f"Video rendering complete! Generated {out_mp4}", flush=True)
