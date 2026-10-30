import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out_dir = 'promo_build/mockups'
os.makedirs(out_dir, exist_ok=True)

screens = {
    'dashboard': 'promo_build/processed_screens/dashboard.png',
    'focus': 'promo_build/processed_screens/focus.png',
    'calendar': 'promo_build/processed_screens/calendar.png',
    'tasks': 'promo_build/processed_screens/tasks.png',
    'analytics': 'promo_build/processed_screens/analytics.png'
}

def create_studio_display(img_path, width=1420):
    src = Image.open(img_path).convert('RGBA')
    orig_w, orig_h = src.size
    h = int(width * orig_h / orig_w)
    screen_resized = src.resize((width, h), Image.Resampling.LANCZOS)
    
    top_bezel = 40
    bot_bezel = 14
    side_bezel = 14
    
    chassis_w = width + side_bezel * 2
    chassis_h = h + top_bezel + bot_bezel
    
    # Base chassis
    chassis = Image.new('RGBA', (chassis_w, chassis_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(chassis)
    
    # Outer frame
    draw.rounded_rectangle(
        [0, 0, chassis_w - 1, chassis_h - 1],
        radius=22,
        fill=(14, 23, 18, 255), # Deep dark forest obsidian
        outline=(34, 197, 94, 75), # Emerald rim light
        width=2
    )
    
    # Window controls (macOS traffic light dots)
    dot_y = top_bezel // 2
    draw.ellipse([24, dot_y - 6, 36, dot_y + 6], fill=(239, 68, 68, 210))
    draw.ellipse([44, dot_y - 6, 56, dot_y + 6], fill=(234, 179, 8, 210))
    draw.ellipse([64, dot_y - 6, 76, dot_y + 6], fill=(34, 197, 94, 210))
    
    # Title bar label
    try:
        font = ImageFont.truetype('segoeui.ttf', 14)
        draw.text((chassis_w // 2, dot_y), 'Study-Group — Workspace', font=font, fill=(160, 185, 170, 160), anchor='mm')
    except:
        pass
        
    # Paste screen inside
    # Round the screen corners slightly
    mask = Image.new('L', (width, h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, width - 1, h - 1], radius=10, fill=255)
    
    chassis.paste(screen_resized, (side_bezel, top_bezel), mask)
    
    # Create glowing drop shadow canvas
    pad_x, pad_y = 70, 80
    total_w = chassis_w + pad_x * 2
    total_h = chassis_h + pad_y * 2
    
    shadow_layer = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    # Deep black shadow
    s_draw.rounded_rectangle(
        [pad_x, pad_y + 20, pad_x + chassis_w, pad_y + chassis_h + 20],
        radius=30,
        fill=(0, 0, 0, 160)
    )
    # Emerald ambient halo
    s_draw.rounded_rectangle(
        [pad_x - 10, pad_y, pad_x + chassis_w + 10, pad_y + chassis_h + 10],
        radius=35,
        fill=(21, 115, 67, 70)
    )
    shadow_blurred = shadow_layer.filter(ImageFilter.GaussianBlur(32))
    
    # Composite chassis onto shadow
    shadow_blurred.paste(chassis, (pad_x, pad_y), chassis)
    return shadow_blurred

# Build mockups for each screen
for name, path in screens.items():
    res = create_studio_display(path, width=1380)
    out_path = os.path.join(out_dir, f'{name}_mockup.png')
    res.save(out_path)
    print(f'Saved {out_path}: {res.size}')

# Also build StudyMate AI dedicated card mockup
def create_studymate_card():
    card_w, card_h = 1000, 600
    card = Image.new('RGBA', (card_w, card_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    
    # Outer container
    draw.rounded_rectangle([0, 0, card_w - 1, card_h - 1], radius=24, fill=(14, 26, 20, 250), outline=(34, 197, 94, 90), width=2)
    
    font_bold = ImageFont.truetype('segoeuib.ttf', 24)
    font_reg = ImageFont.truetype('segoeui.ttf', 18)
    font_code = ImageFont.truetype('consola.ttf', 16)
    
    # Top AI header
    draw.ellipse([36, 32, 72, 68], fill=(21, 115, 67, 255), outline=(52, 211, 153, 200), width=2)
    draw.text((54, 50), '✦', font=font_bold, fill=(255, 255, 255), anchor='mm')
    draw.text((88, 40), 'StudyMate AI · Intelligent Academic Tutor', font=font_bold, fill=(240, 255, 245))
    draw.text((88, 66), 'Grounded in course lecture notes & problem sets', font=font_reg, fill=(120, 160, 135))
    
    # User message bubble (right aligned)
    u_x, u_y, u_w, u_h = 240, 115, 720, 95
    draw.rounded_rectangle([u_x, u_y, u_x + u_w, u_y + u_h], radius=16, fill=(22, 45, 33, 240), outline=(34, 197, 94, 50), width=1)
    draw.text((u_x + 24, u_y + 20), 'Exon · Computer Science Circle', font=font_bold, fill=(52, 211, 153))
    draw.text((u_x + 24, u_y + 54), 'Can you explain Dijkstra\'s algorithm and its priority queue complexity?', font=font_reg, fill=(255, 255, 255))
    
    # AI response bubble
    ai_x, ai_y, ai_w, ai_h = 40, 235, 920, 320
    draw.rounded_rectangle([ai_x, ai_y, ai_x + ai_w, ai_y + ai_h], radius=18, fill=(17, 34, 25, 250), outline=(52, 211, 153, 100), width=1)
    
    draw.text((ai_x + 24, ai_y + 22), '🤖 StudyMate Assistant', font=font_bold, fill=(52, 211, 153))
    
    lines = [
        'Dijkstra\'s algorithm calculates the shortest path from a starting vertex to all other vertices in a weighted graph.',
        'Key properties from your class notes:',
        '• Greedy Strategy: Always extracts the vertex with minimum tentative distance from priority queue.',
        '• Time Complexity: O((V + E) log V) using a binary min-heap implementation.',
        '• Non-negative weights: Requires all edge weights w(u, v) >= 0 to guarantee optimality.'
    ]
    cur_y = ai_y + 60
    for l in lines:
        draw.text((ai_x + 24, cur_y), l, font=font_reg, fill=(220, 240, 230))
        cur_y += 34
        
    # Interactive Quiz chip
    draw.rounded_rectangle([ai_x + 24, cur_y + 12, ai_x + 480, cur_y + 58], radius=23, fill=(21, 115, 67, 240), outline=(255, 255, 255, 120), width=1)
    draw.text((ai_x + 50, cur_y + 35), '▶  Generate 5-Question Practice Quiz on Graphs', font=font_bold, fill=(255, 255, 255), anchor='lm')
    
    # Shadow
    pad = 60
    sw, sh = card_w + pad * 2, card_h + pad * 2
    shad = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shad)
    sdraw.rounded_rectangle([pad, pad + 15, pad + card_w, pad + card_h + 15], radius=30, fill=(0, 0, 0, 160))
    sdraw.rounded_rectangle([pad - 10, pad - 5, pad + card_w + 10, pad + card_h + 10], radius=35, fill=(21, 115, 67, 70))
    shad_blur = shad.filter(ImageFilter.GaussianBlur(28))
    shad_blur.paste(card, (pad, pad), card)
    
    out_path = os.path.join(out_dir, 'studymate_mockup.png')
    shad_blur.save(out_path)
    print(f'Saved {out_path}: {shad_blur.size}')

create_studymate_card()
print('All mockups generated successfully.')
