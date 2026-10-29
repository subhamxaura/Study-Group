import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

# ---------- Video Settings ----------
WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION = 44.0
TOTAL_FRAMES = int(FPS * DURATION) # 1320 frames

# ---------- Brand Color Palette ----------
BG_COLOR = (247, 250, 248)       # #F7FAF8 — Cool Sage Off-White
SURFACE_WHITE = (255, 255, 255)  # #FFFFFF — Pure White
SURFACE_MUTED = (242, 248, 244)  # #F2F8F4 — Very Light Sage Inner Card
SIDEBAR_BG = (235, 244, 238)     # #EBF4EE — Pale Mint-Sage
BORDER_COLOR = (228, 236, 231)   # #E4ECE7 — Card 1px Border
BORDER_INNER = (220, 235, 225)   # #DCEBE1 — Inner Card Border
BORDER_HERO = (203, 229, 214)    # #CBE5D6 — Hero Border
HERO_BG = (227, 243, 233)        # #E3F3E9 — Soft Pastel Mint Hero
FOREGROUND = (15, 31, 23)        # #0F1F17 — Deep Forest Charcoal
SECONDARY = (44, 58, 51)         # #2C4035 — Dark Slate Body
MUTED_TEXT = (90, 107, 98)       # #5A6B62 — Muted Labels
ACCENT_GREEN = (21, 115, 67)     # #157343 — Rich Forest Green
ACCENT_HOVER = (17, 94, 56)      # #115E38 — Deep Forest Hover
ACCENT_LIGHT = (20, 99, 58)      # #14633A — Accent Phrase
ACCENT_SOFT = (216, 240, 226)    # #D8F0E2 — Soft Mint Pill
AMBER_BG = (253, 230, 196)       # #FDE6C4 — Warm Amber Streak Pill
AMBER_TEXT = (154, 91, 19)       # #9A5B13 — Streak Text
TRACK_BG = (234, 239, 236)       # #EAEFEC — Progress Track

# ---------- Load Fonts ----------
FONT_DIR = r'C:\Windows\Fonts'
font_hero_display = ImageFont.truetype(os.path.join(FONT_DIR, 'georgia.ttf'), 58)
font_scene_title  = ImageFont.truetype(os.path.join(FONT_DIR, 'georgia.ttf'), 46)
font_card_head    = ImageFont.truetype(os.path.join(FONT_DIR, 'georgia.ttf'), 28)
font_serif_sm     = ImageFont.truetype(os.path.join(FONT_DIR, 'georgia.ttf'), 22)

font_ui_title     = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 30)
font_ui_h2        = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 24)
font_ui_bold      = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 20)
font_ui_bold_sm   = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 16)
font_ui_bold_xs   = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 13)

font_body_lg      = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeui.ttf'), 26)
font_body         = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeui.ttf'), 20)
font_body_sm      = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeui.ttf'), 16)
font_body_xs      = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeui.ttf'), 13)

font_subtitle     = ImageFont.truetype(os.path.join(FONT_DIR, 'segoeuib.ttf'), 22)

# ---------- Helper: Easing Functions ----------
def ease_out_cubic(t):
    t = max(0.0, min(1.0, t))
    return 1.0 - math.pow(1.0 - t, 3)

def ease_in_out_quad(t):
    t = max(0.0, min(1.0, t))
    return 2.0 * t * t if t < 0.5 else 1.0 - math.pow(-2.0 * t + 2.0, 2) / 2.0

def spring(t, omega=9.0, zeta=0.68):
    if t <= 0: return 0.0
    if t >= 1.2: return 1.0
    return 1.0 - math.exp(-zeta * omega * t) * math.cos(omega * t)

# ---------- Shadow Cache for Ultra-Fast Rendering ----------
shadow_cache = {}

def get_shadow_mask(w, h, radius, pad=20):
    key = (w, h, radius)
    if key in shadow_cache:
        return shadow_cache[key]
    s_img = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(s_img)
    s_draw.rounded_rectangle([pad, pad + 6, pad + w, pad + h + 6], radius=radius, fill=(15, 31, 23, 20))
    s_blur = s_img.filter(ImageFilter.GaussianBlur(8))
    shadow_cache[key] = s_blur
    return s_blur

def draw_card(canvas, bbox, radius, fill, border_color=None, border_width=1, shadow=True):
    x0, y0, x1, y1 = bbox
    w = int(x1 - x0)
    h = int(y1 - y0)
    if w <= 0 or h <= 0: return

    if shadow:
        pad = 20
        s_blur = get_shadow_mask(w, h, radius, pad)
        canvas.paste(s_blur, (int(x0) - pad, int(y0) - pad), s_blur)

    card_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(card_img)
    c_draw.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=fill, outline=border_color, width=border_width)
    canvas.paste(card_img, (int(x0), int(y0)), card_img)

# ---------- Helper: Draw Organic Leaf Graphic ----------
def draw_leaf(canvas, cx, cy, size, angle_deg, color, alpha=255):
    leaf_img = Image.new('RGBA', (int(size * 2), int(size * 2)), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaf_img)
    r = size * 0.7
    pts = [
        (size, size - r),
        (size + r * 0.65, size - r * 0.3),
        (size + r * 0.8, size + r * 0.2),
        (size, size + r),
        (size - r * 0.8, size + r * 0.2),
        (size - r * 0.65, size - r * 0.3)
    ]
    fill_c = (color[0], color[1], color[2], alpha)
    ld.polygon(pts, fill=fill_c)
    ld.line([(size, size - r * 0.8), (size, size + r * 0.8)], fill=(color[0], color[1], color[2], int(alpha * 0.6)), width=2)
    
    rotated = leaf_img.rotate(angle_deg, resample=Image.BICUBIC)
    canvas.paste(rotated, (int(cx - size), int(cy - size)), rotated)

# ---------- Helper: Draw Vector Book Icon ----------
def draw_book_icon(canvas, cx, cy, size, color):
    hw = size / 2
    hh = size * 0.6
    draw = ImageDraw.Draw(canvas)
    # Left page
    draw.rounded_rectangle([cx - hw, cy - hh, cx - 2, cy + hh], radius=2, outline=color, width=2)
    # Right page
    draw.rounded_rectangle([cx + 2, cy - hh, cx + hw, cy + hh], radius=2, outline=color, width=2)
    # Center spine
    draw.line([(cx, cy - hh), (cx, cy + hh)], fill=color, width=2)

# ---------- Helper: Draw Floating Confetti ----------
np.random.seed(42)
confetti_colors = [
    (21, 115, 67), (253, 230, 196), (154, 91, 19), (216, 240, 226), (82, 183, 136)
]
confetti_particles = [
    {
        'x': 1480 + np.random.uniform(-180, 180),
        'y': 480 + np.random.uniform(-150, 150),
        'vx': np.random.uniform(-220, 220),
        'vy': np.random.uniform(-380, -120),
        'size': np.random.uniform(5, 12),
        'color': confetti_colors[i % len(confetti_colors)],
        'rot': np.random.uniform(0, 360),
        'vrot': np.random.uniform(-180, 180)
    }
    for i in range(45)
]

# ---------- Helper: Subtitles Pill Bar ----------
def draw_subtitles(canvas, text):
    if not text: return
    dummy = ImageDraw.Draw(canvas)
    bbox = dummy.textbbox((0, 0), text, font=font_subtitle)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    pad_x = 28
    pad_y = 12
    card_w = tw + pad_x * 2
    card_h = th + pad_y * 2
    cx = (WIDTH - card_w) / 2
    cy = HEIGHT - 84
    
    sub_overlay = Image.new('RGBA', (int(card_w), int(card_h)), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sub_overlay)
    s_draw.rounded_rectangle([0, 0, card_w - 1, card_h - 1], radius=card_h // 2, fill=(15, 31, 23, 225), outline=(203, 229, 214, 140), width=1)
    canvas.paste(sub_overlay, (int(cx), int(cy)), sub_overlay)
    
    draw = ImageDraw.Draw(canvas)
    draw.text((cx + pad_x, cy + pad_y - 2), text, font=font_subtitle, fill=(255, 255, 255))

# Load full dashboard screenshot
ui_dashboard = None
if os.path.exists('promo_build/assets/full_dashboard.png'):
    ui_dashboard = Image.open('promo_build/assets/full_dashboard.png').convert('RGBA')

print('Starting high-fidelity frame rendering (1320 frames)...')
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
output_video_path = 'study-group-promo.mp4'

cmd = [
    ffmpeg_exe,
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', f'{WIDTH}x{HEIGHT}',
    '-pix_fmt', 'rgb24',
    '-r', str(FPS),
    '-i', '-',
    '-i', 'promo_build/audio/promo_master_audio.wav',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '17',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-shortest',
    output_video_path
]

process = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for f_idx in range(TOTAL_FRAMES):
    t_sec = f_idx / float(FPS)
    
    # Canvas
    canvas = Image.new('RGBA', (WIDTH, HEIGHT), (247, 250, 248, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Ambient aura
    aura_cx = WIDTH * 0.75 + math.sin(t_sec * 0.5) * 40
    aura_cy = HEIGHT * 0.25 + math.cos(t_sec * 0.5) * 40
    for r in range(400, 50, -50):
        alpha = int(12 * (1.0 - r / 400.0))
        draw.ellipse([aura_cx - r, aura_cy - r, aura_cx + r, aura_cy + r], fill=(216, 240, 226, alpha))
        
    # Floating background leaves
    for i in range(8):
        lx = (i * 260 + t_sec * 25 + math.sin(t_sec * 0.7 + i) * 35) % (WIDTH + 100) - 50
        ly = (120 + i * 110 + math.cos(t_sec * 0.5 + i) * 45) % HEIGHT
        lang = (i * 45 + t_sec * 15) % 360
        draw_leaf(canvas, lx, ly, 24, lang, (180, 215, 195), alpha=60)

    # -------------------------------------------------------------
    # SCENE 1: The Hook & Academic Sanctuary (0.0s - 9.0s)
    # -------------------------------------------------------------
    if t_sec < 9.0:
        sub_text = 'Struggling to stay consistent with your coursework? Meet Study-Group.' if t_sec < 4.5 else 'Your botanical academic sanctuary designed for student collaboration.'
        
        if t_sec < 4.5:
            prog = ease_out_cubic(t_sec / 1.0)
            y_offset = (1.0 - prog) * 40
            
            badge_w, badge_h = 320, 44
            badge_x = (WIDTH - badge_w) / 2
            badge_y = 310 + y_offset
            draw_card(canvas, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], radius=22, fill=(253, 230, 196), border_color=(240, 210, 170), shadow=False)
            draw_leaf(canvas, badge_x + 24, badge_y + 22, 12, 20, (154, 91, 19), alpha=240)
            draw.text((badge_x + 44, badge_y + 11), 'Academic Consistency Solved', font=font_ui_bold_sm, fill=(154, 91, 19))
            
            q_line1 = 'Struggling to stay consistent'
            q_line2 = 'with your studies?'
            bbox1 = draw.textbbox((0, 0), q_line1, font=font_hero_display)
            bbox2 = draw.textbbox((0, 0), q_line2, font=font_hero_display)
            draw.text(((WIDTH - (bbox1[2] - bbox1[0])) / 2, 380 + y_offset), q_line1, font=font_hero_display, fill=FOREGROUND)
            draw.text(((WIDTH - (bbox2[2] - bbox2[0])) / 2, 450 + y_offset), q_line2, font=font_hero_display, fill=ACCENT_GREEN)
            
            sub_q = 'Long solitary study sessions lead to burnout. Study alongside peers who push you forward.'
            bbox_s = draw.textbbox((0, 0), sub_q, font=font_body_lg)
            draw.text(((WIDTH - (bbox_s[2] - bbox_s[0])) / 2, 545 + y_offset), sub_q, font=font_body_lg, fill=SECONDARY)
            
            sprout_scale = min(1.0, t_sec / 2.0)
            sprout_y = 660 + y_offset
            draw.ellipse([WIDTH/2 - 40 * sprout_scale, sprout_y - 40 * sprout_scale, WIDTH/2 + 40 * sprout_scale, sprout_y + 40 * sprout_scale], fill=(216, 240, 226, 180), outline=(203, 229, 214))
            draw_leaf(canvas, WIDTH/2, sprout_y - 8, int(28 * sprout_scale), 25, ACCENT_GREEN, alpha=230)
            draw_leaf(canvas, WIDTH/2, sprout_y - 8, int(22 * sprout_scale), -30, ACCENT_HOVER, alpha=210)
            
        else:
            p2 = t_sec - 4.5
            sp = spring(p2)
            
            bm_x = (WIDTH - 420) / 2
            bm_y = 110
            draw_card(canvas, [bm_x, bm_y, bm_x + 52, bm_y + 52], radius=14, fill=ACCENT_SOFT, border_color=BORDER_HERO, shadow=False)
            draw_book_icon(canvas, bm_x + 26, bm_y + 26, 20, ACCENT_GREEN)
            draw.text((bm_x + 68, bm_y + 8), 'Study-Group', font=font_hero_display, fill=FOREGROUND)
            
            card_y = 230 + (1.0 - sp) * 220
            card_w = 1260
            card_h = 320
            cx = (WIDTH - card_w) / 2
            
            draw_card(canvas, [cx, card_y, cx + card_w, card_y + card_h], radius=24, fill=HERO_BG, border_color=BORDER_HERO, shadow=True)
            
            # Streak pill
            draw_card(canvas, [cx + 42, card_y + 36, cx + 330, card_y + 74], radius=19, fill=AMBER_BG, border_color=AMBER_BG, shadow=False)
            draw_leaf(canvas, cx + 60, card_y + 55, 12, 15, (154, 91, 19), alpha=240)
            draw.text((cx + 78, card_y + 44), '0-Day Study Growth Streak', font=font_ui_bold_sm, fill=AMBER_TEXT)
            
            draw.text((cx + 42, card_y + 90), 'Good evening, Subham. ', font=font_hero_display, fill=FOREGROUND)
            draw.text((cx + 630, card_y + 90), 'Cultivate your knowledge.', font=font_hero_display, fill=ACCENT_LIGHT)
            draw.text((cx + 42, card_y + 165), 'Join a study circle to share lecture notes, join focus rooms, and track deadlines together.', font=font_body, fill=SECONDARY)
            
            # Action Buttons
            btn1_w = 210
            draw_card(canvas, [cx + 42, card_y + 225, cx + 42 + btn1_w, card_y + 275], radius=25, fill=ACCENT_GREEN, shadow=False)
            draw.text((cx + 64, card_y + 240), 'Enter Focus Room', font=font_ui_bold, fill=(255, 255, 255))
            
            draw_card(canvas, [cx + 270, card_y + 225, cx + 460, card_y + 275], radius=25, fill=(255, 255, 255), border_color=(142, 184, 160), border_width=1, shadow=False)
            draw.text((cx + 295, card_y + 240), 'Ask StudyMate', font=font_ui_bold, fill=ACCENT_HOVER)
            
            draw.text((cx + 490, card_y + 242), 'New Session →', font=font_ui_bold, fill=ACCENT_LIGHT)
            draw_leaf(canvas, cx + card_w - 90, card_y + card_h - 60, 110, -45, (208, 233, 218), alpha=160)
            
            # 3 Metric Cards
            m_sp = spring(max(0.0, p2 - 0.4))
            my = card_y + card_h + 36 + (1.0 - m_sp) * 80
            mw = (card_w - 40) / 3
            
            metrics_data = [
                ('Weekly focus time', '+0.0h vs last wk', '0.0', 'hours', '0% of 5h weekly goal reached'),
                ('Active study circles', '3 circles', '3', 'circles', 'Advanced Mathematics (4 members)'),
                ('Study growth streak', '1 day consistent', '1', 'days consistent', 'Consistency is blooming. Keep it going!')
            ]
            for mi, (mtitle, mtag, mval, munit, msub) in enumerate(metrics_data):
                mx0 = cx + mi * (mw + 20)
                draw_card(canvas, [mx0, my, mx0 + mw, my + 130], radius=16, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
                draw.text((mx0 + 20, my + 16), mtitle, font=font_body_sm, fill=MUTED_TEXT)
                draw.text((mx0 + mw - 125, my + 14), mtag, font=font_ui_bold_xs, fill=ACCENT_GREEN)
                draw.text((mx0 + 20, my + 42), mval, font=font_ui_title, fill=FOREGROUND)
                draw.text((mx0 + 72, my + 50), munit, font=font_body_sm, fill=MUTED_TEXT)
                draw.text((mx0 + 20, my + 94), msub, font=font_body_xs, fill=SECONDARY)
        
        draw_subtitles(canvas, sub_text)

    # -------------------------------------------------------------
    # SCENE 2: Collaborative Study Circles (9.0s - 18.5s)
    # -------------------------------------------------------------
    elif t_sec < 18.5:
        sub_text = 'Join subject study circles with role permissions, real-time discussions, and lecture notes.'
        p = t_sec - 9.0
        
        head_sp = spring(p)
        hy = 100 + (1.0 - head_sp) * 40
        draw.text((WIDTH * 0.1, hy), 'Your Study Circles', font=font_scene_title, fill=FOREGROUND)
        draw.text((WIDTH * 0.1, hy + 56), 'Spaces where coursework, collaborative notes, and peer discussions flourish', font=font_body, fill=MUTED_TEXT)
        
        circles_data = [
            {
                'subject': 'MATHEMATICS',
                'title': 'Advanced Mathematics',
                'desc': 'Deep dive into calculus, linear algebra, and differential equations. Weekly problem sets & exam prep.',
                'members': 4,
                'status': 'Active discussion · 38 messages this wk'
            },
            {
                'subject': 'PHYSICS',
                'title': 'Physics Study Circle',
                'desc': 'Classical mechanics, thermodynamics and modern physics through collaborative problem-solving.',
                'members': 3,
                'status': 'Quiz session scheduled for Tomorrow'
            },
            {
                'subject': 'COMPUTER SCIENCE',
                'title': 'Computer Science Hub',
                'desc': 'Algorithms, data structures, system design and technical interview prep. Code together in real-time.',
                'members': 5,
                'status': 'Active focus session ongoing'
            }
        ]
        
        card_w = 480
        card_h = 360
        start_x = (WIDTH - (3 * card_w + 2 * 40)) / 2
        card_y = 260
        
        for ci, cdata in enumerate(circles_data):
            c_delay = ci * 0.25
            c_sp = spring(max(0.0, p - c_delay))
            cx = start_x + ci * (card_w + 40)
            cy = card_y + (1.0 - c_sp) * 120
            
            draw_card(canvas, [cx, cy, cx + card_w, cy + card_h], radius=20, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
            
            tag_w = draw.textbbox((0, 0), cdata['subject'], font=font_ui_bold_xs)[2] + 20
            draw_card(canvas, [cx + 24, cy + 26, cx + 24 + tag_w, cy + 54], radius=14, fill=ACCENT_SOFT, border_color=BORDER_INNER, shadow=False)
            draw.text((cx + 34, cy + 32), cdata['subject'], font=font_ui_bold_xs, fill=ACCENT_GREEN)
            
            curr_mem = min(cdata['members'], int(1 + (cdata['members'] - 1) * min(1.0, max(0.0, p - c_delay) * 1.5)))
            draw.text((cx + card_w - 120, cy + 30), f'{curr_mem} members', font=font_body_sm, fill=MUTED_TEXT)
            
            draw.text((cx + 24, cy + 80), cdata['title'], font=font_ui_title, fill=FOREGROUND)
            
            words = cdata['desc'].split(' ')
            line1 = ' '.join(words[:7])
            line2 = ' '.join(words[7:])
            draw.text((cx + 24, cy + 130), line1, font=font_body, fill=SECONDARY)
            draw.text((cx + 24, cy + 162), line2, font=font_body, fill=SECONDARY)
            
            for avi in range(min(4, curr_mem)):
                av_x = cx + 24 + avi * 34
                av_c = [(216, 240, 226), (224, 239, 230), (253, 230, 196), (210, 232, 218)][avi % 4]
                draw.ellipse([av_x, cy + 220, av_x + 38, cy + 258], fill=av_c, outline=(255, 255, 255), width=2)
                draw.text((av_x + 12, cy + 228), ['A', 'B', 'C', 'D'][avi], font=font_ui_bold_sm, fill=ACCENT_HOVER)
                
            draw.line([(cx + 24, cy + 285), (cx + card_w - 24, cy + 285)], fill=BORDER_COLOR, width=1)
            draw.text((cx + 24, cy + 308), cdata['status'], font=font_body_xs, fill=MUTED_TEXT)
            draw.text((cx + card_w - 90, cy + 306), 'Open →', font=font_ui_bold, fill=ACCENT_GREEN)
            
        banner_sp = spring(max(0.0, p - 1.2))
        by = 700 + (1.0 - banner_sp) * 100
        bw = 880
        bx = (WIDTH - bw) / 2
        draw_card(canvas, [bx, by, bx + bw, by + 76], radius=20, fill=HERO_BG, border_color=BORDER_HERO, shadow=True)
        draw.text((bx + 40, by + 24), '✦ Note Sharing  ·  Real-Time Chat  ·  Assignment Deadlines  ·  Invite Links', font=font_ui_bold, fill=ACCENT_HOVER)
        
        draw_subtitles(canvas, sub_text)

    # -------------------------------------------------------------
    # SCENE 3: The Focus Greenhouse & Daily Growth Streaks (18.5s - 27.0s)
    # -------------------------------------------------------------
    elif t_sec < 27.0:
        sub_text = 'Step into the Focus Greenhouse. Sync with peers in live Pomodoro rooms and build your streak.'
        p = t_sec - 18.5
        
        head_sp = spring(p)
        hy = 100 + (1.0 - head_sp) * 40
        draw_leaf(canvas, WIDTH * 0.1 - 4, hy + 24, 20, 30, ACCENT_GREEN, alpha=240)
        draw.text((WIDTH * 0.1 + 24, hy), 'Focus Greenhouse', font=font_scene_title, fill=FOREGROUND)
        draw.text((WIDTH * 0.1, hy + 56), 'Quiet collaborative rooms with synchronized Pomodoro timers to eliminate distraction', font=font_body, fill=MUTED_TEXT)
        
        lw = 840
        lh = 490
        lx = WIDTH * 0.1
        ly = 230
        draw_card(canvas, [lx, ly, lx + lw, ly + lh], radius=24, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
        
        in_w = lw - 64
        in_h = lh - 120
        ix0 = lx + 32
        iy0 = ly + 80
        draw_card(canvas, [ix0, iy0, ix0 + in_w, iy0 + in_h], radius=16, fill=SURFACE_MUTED, border_color=BORDER_INNER, shadow=False)
        
        draw.text((ix0 + 24, iy0 + 22), '((o)) Live focus rooms', font=font_ui_bold, fill=ACCENT_GREEN)
        
        btn_cr_w = 150
        draw_card(canvas, [ix0 + in_w - btn_cr_w - 24, iy0 + 16, ix0 + in_w - 24, iy0 + 54], radius=19, fill=ACCENT_GREEN, shadow=False)
        draw.text((ix0 + in_w - btn_cr_w + 14, iy0 + 23), '+ Create room', font=font_ui_bold_sm, fill=(255, 255, 255))
        
        timer_seconds = max(0, 1500 - int(p * 20))
        t_min = timer_seconds // 60
        t_sec_rem = timer_seconds % 60
        timer_str = f'{t_min:02d}:{t_sec_rem:02d}'
        
        ccx = ix0 + in_w / 2
        ccy = iy0 + in_h / 2 + 10
        
        for wave_i in range(3):
            wave_r = 75 + ((p * 45 + wave_i * 35) % 110)
            wave_a = int(140 * (1.0 - (wave_r - 75) / 110.0))
            draw.ellipse([ccx - wave_r, ccy - wave_r, ccx + wave_r, ccy + wave_r], outline=(21, 115, 67, wave_a), width=2)
            
        draw.ellipse([ccx - 68, ccy - 68, ccx + 68, ccy + 68], fill=SURFACE_WHITE, outline=BORDER_HERO, width=2)
        draw.text((ccx - 48, ccy - 18), timer_str, font=font_ui_title, fill=FOREGROUND)
        draw.text((ccx - 36, ccy + 18), 'FOCUSING', font=font_ui_bold_xs, fill=ACCENT_GREEN)
        
        draw.text((ix0 + 24, iy0 + in_h - 45), '👥 4 students currently in room: Linear Algebra Sprint', font=font_body_sm, fill=MUTED_TEXT)
        
        # Right Container: Streak & Milestone
        rw = 680
        rh = 490
        rx = lx + lw + 40
        ry = 230
        draw_card(canvas, [rx, ry, rx + rw, ry + rh], radius=24, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
        
        draw_card(canvas, [rx + 36, ry + 36, rx + 370, ry + 78], radius=21, fill=AMBER_BG, border_color=AMBER_BG, shadow=False)
        draw_leaf(canvas, rx + 56, ry + 56, 12, 20, (154, 91, 19), alpha=240)
        draw.text((rx + 76, ry + 44), '7-Day Study Growth Streak', font=font_ui_bold, fill=AMBER_TEXT)
        
        streak_num = 7 if p > 3.0 else int(1 + p * 2)
        draw.text((rx + 36, ry + 120), str(streak_num), font=ImageFont.truetype(os.path.join(FONT_DIR, 'georgia.ttf'), 110), fill=FOREGROUND)
        draw.text((rx + 170, ry + 160), 'days consistent', font=font_scene_title, fill=MUTED_TEXT)
        
        draw.text((rx + 36, ry + 270), 'Weekly Goal: 15 / 15 Hours Reached (100%)', font=font_ui_bold_sm, fill=FOREGROUND)
        draw_card(canvas, [rx + 36, ry + 305, rx + rw - 36, ry + 325], radius=10, fill=TRACK_BG, shadow=False)
        bar_fill_w = min(rw - 72, (rw - 72) * min(1.0, p / 3.0))
        draw_card(canvas, [rx + 36, ry + 305, rx + 36 + bar_fill_w, ry + 325], radius=10, fill=ACCENT_GREEN, shadow=False)
        
        if p > 3.5:
            confetti_t = (p - 3.5)
            for part in confetti_particles:
                px = part['x'] + part['vx'] * confetti_t
                py = part['y'] + part['vy'] * confetti_t + 0.5 * 450 * (confetti_t ** 2)
                if px > rx and px < rx + rw and py > ry and py < ry + rh:
                    draw.rectangle([px, py, px + part['size'], py + part['size']], fill=part['color'])
                    
        draw.text((rx + 36, ry + 375), '✦ Milestone Unlocked: Consistent Cultivator', font=font_ui_bold, fill=ACCENT_HOVER)
        draw.text((rx + 36, ry + 415), 'Your shared timer blocks sync with your group calendar automatically.', font=font_body_sm, fill=SECONDARY)
        
        draw_subtitles(canvas, sub_text)

    # -------------------------------------------------------------
    # SCENE 4: StudyMate AI Grounded Tutor (27.0s - 35.5s)
    # -------------------------------------------------------------
    elif t_sec < 35.5:
        sub_text = 'Supercharge your revision with StudyMate AI. An intelligent tutor that turns your notes into active recall quizzes.'
        p = t_sec - 27.0
        
        head_sp = spring(p)
        hy = 100 + (1.0 - head_sp) * 40
        draw.text((WIDTH * 0.1, hy), '✦ StudyMate AI Tutor', font=font_scene_title, fill=FOREGROUND)
        draw.text((WIDTH * 0.1, hy + 56), 'Grounded exclusively on your uploaded lecture notes, slides, and syllabus documents', font=font_body, fill=MUTED_TEXT)
        
        cw = 1180
        ch = 500
        cx = (WIDTH - cw) / 2
        cy = 230
        draw_card(canvas, [cx, cy, cx + cw, cy + ch], radius=24, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
        
        draw_card(canvas, [cx, cy, cx + cw, cy + 68], radius=24, fill=HERO_BG, border_color=BORDER_HERO, shadow=False)
        draw.text((cx + 28, cy + 20), 'StudyMate Assistant  ·  Grounded in: CS301_Algorithms_Week4.pdf', font=font_ui_bold, fill=ACCENT_HOVER)
        
        if p > 0.4:
            u_sp = spring(p - 0.4)
            uy = cy + 100 + (1.0 - u_sp) * 30
            uw = 580
            draw_card(canvas, [cx + cw - uw - 32, uy, cx + cw - 32, uy + 64], radius=18, fill=ACCENT_SOFT, border_color=BORDER_INNER, shadow=False)
            draw.text((cx + cw - uw - 16, uy + 18), 'Quiz me on Dijkstra vs A* search from lecture 7', font=font_body, fill=ACCENT_HOVER)
            
        if p > 1.8:
            ai_sp = spring(p - 1.8)
            ay = cy + 185 + (1.0 - ai_sp) * 30
            aw = 820
            draw_card(canvas, [cx + 32, ay, cx + 32 + aw, ay + 260], radius=20, fill=SURFACE_MUTED, border_color=BORDER_INNER, shadow=False)
            
            ai_text_full = "Active Recall Challenge (Question 1 of 3):\nWhat makes A* search explore fewer nodes than standard Dijkstra's algorithm?"
            chars_to_show = min(len(ai_text_full), int((p - 1.8) * 45))
            current_text = ai_text_full[:chars_to_show]
            
            draw.text((cx + 56, ay + 20), current_text, font=font_ui_bold, fill=FOREGROUND)
            
            if p > 3.2:
                opts = [
                    'A) A* uses a heuristic function h(n) to guide search toward the goal',
                    'B) A* operates strictly on acyclic directed graphs',
                    'C) Dijkstra examines edges in reverse topological sort'
                ]
                for oi, opt in enumerate(opts):
                    oy = ay + 95 + oi * 46
                    is_correct = (oi == 0)
                    opt_fill = (216, 240, 226) if (is_correct and p > 4.5) else SURFACE_WHITE
                    opt_border = ACCENT_GREEN if (is_correct and p > 4.5) else BORDER_COLOR
                    opt_text_c = ACCENT_HOVER if (is_correct and p > 4.5) else FOREGROUND
                    
                    draw_card(canvas, [cx + 56, oy, cx + aw + 8, oy + 38], radius=10, fill=opt_fill, border_color=opt_border, shadow=False)
                    draw.text((cx + 72, oy + 8), opt, font=font_body_sm, fill=opt_text_c)
                    if is_correct and p > 4.5:
                        draw.text((cx + aw - 50, oy + 8), '✓ Correct', font=font_ui_bold_sm, fill=ACCENT_GREEN)
                        
            if p > 5.5:
                draw_card(canvas, [cx + 56, ay + 215, cx + 460, ay + 248], radius=14, fill=AMBER_BG, border_color=AMBER_BG, shadow=False)
                draw.text((cx + 72, ay + 221), '✦ +15 Mastery Points Earned · Recall Streak Active', font=font_ui_bold_xs, fill=AMBER_TEXT)
        
        draw_subtitles(canvas, sub_text)

    # -------------------------------------------------------------
    # SCENE 5: Grand Finale Showcase & Call To Action (35.5s - 44.0s)
    # -------------------------------------------------------------
    else:
        sub_text = 'Cultivate your knowledge. Join Study-Group today and bloom into your best academic self.'
        p = t_sec - 35.5
        
        f_sp = spring(p)
        scale = 0.88 + 0.04 * math.sin(p * 0.5)
        
        hy = 90 + (1.0 - f_sp) * 50
        title_cta = 'Cultivate Your Knowledge.'
        bbox_t = draw.textbbox((0, 0), title_cta, font=font_hero_display)
        draw.text(((WIDTH - (bbox_t[2] - bbox_t[0])) / 2, hy), title_cta, font=font_hero_display, fill=FOREGROUND)
        
        sub_cta = 'The serene academic workspace that helps you stay consistent, study deeply, and flourish together.'
        bbox_sub = draw.textbbox((0, 0), sub_cta, font=font_body_lg)
        draw.text(((WIDTH - (bbox_sub[2] - bbox_sub[0])) / 2, hy + 70), sub_cta, font=font_body_lg, fill=SECONDARY)
        
        if ui_dashboard is not None:
            dw = int(1200 * scale)
            dh = int(580 * scale)
            dx = (WIDTH - dw) // 2
            dy = int(250 + (1.0 - f_sp) * 120)
            
            draw_card(canvas, [dx, dy, dx + dw, dy + dh], radius=24, fill=(255, 255, 255, 0), shadow=True)
            resized_dash = ui_dashboard.resize((dw, dh), resample=Image.LANCZOS)
            canvas.paste(resized_dash, (dx, dy), resized_dash)
            
        pills = [
            (WIDTH * 0.06, 320, 'Botanical Aesthetic Floor'),
            (WIDTH * 0.06, 410, 'Collaborative Study Circles'),
            (WIDTH * 0.74, 320, 'Live Focus Greenhouse'),
            (WIDTH * 0.74, 410, 'Grounded StudyMate AI')
        ]
        for pi, (px, py, ptxt) in enumerate(pills):
            p_delay = 0.5 + pi * 0.2
            psp = spring(max(0.0, p - p_delay))
            p_x = px + (1.0 - psp) * (-40 if px < WIDTH/2 else 40)
            draw_card(canvas, [p_x, py, p_x + 360, py + 52], radius=26, fill=SURFACE_WHITE, border_color=BORDER_COLOR, shadow=True)
            draw_leaf(canvas, p_x + 24, py + 26, 12, 20, ACCENT_GREEN, alpha=230)
            draw.text((p_x + 46, py + 14), ptxt, font=font_ui_bold, fill=ACCENT_GREEN)
            
        cta_sp = spring(max(0.0, p - 1.5))
        cy = 870 + (1.0 - cta_sp) * 60
        cw = 420
        cx = (WIDTH - cw) / 2
        
        draw_card(canvas, [cx, cy, cx + cw, cy + 68], radius=34, fill=ACCENT_GREEN, shadow=True)
        draw.text((cx + 70, cy + 18), 'Get Started for Free →', font=font_ui_title, fill=(255, 255, 255))
        
        draw.text(((WIDTH - 240) / 2, cy + 86), 'study-group-sigma.vercel.app', font=font_body, fill=MUTED_TEXT)
        
        draw_subtitles(canvas, sub_text)

    # Convert to RGB24 and write to ffmpeg pipe
    rgb_frame = canvas.convert('RGB')
    process.stdin.write(rgb_frame.tobytes())
    
    if f_idx % 150 == 0 or f_idx == TOTAL_FRAMES - 1:
        print(f'Rendered frame {f_idx + 1} / {TOTAL_FRAMES} ({(f_idx + 1) / TOTAL_FRAMES * 100:.1f}%)')

process.stdin.close()
process.wait()
print(f'Video generated successfully: {output_video_path}')
