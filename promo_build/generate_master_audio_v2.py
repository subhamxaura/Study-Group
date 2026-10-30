import numpy as np
import scipy.io.wavfile as wav
import os, subprocess, imageio_ffmpeg
from scipy.ndimage import uniform_filter1d

SAMPLE_RATE = 44100

def create_rich_soundtrack(total_duration_sec):
    total_samples = int(SAMPLE_RATE * total_duration_sec)
    
    bpm = 86
    spb = 60.0 / bpm # ~0.6976s
    bar_len = spb * 4 # ~2.79s
    
    # Chord progression: Dm9 -> G13 -> Cmaj9 -> Am9
    chord_freqs = [
        [146.83, 174.61, 220.00, 261.63, 329.63], # Dm9
        [98.00,  246.94, 329.63, 349.23, 440.00], # G13
        [130.81, 164.81, 196.00, 246.94, 293.66], # Cmaj9
        [110.00, 130.81, 164.81, 196.00, 246.94]  # Am9
    ]
    
    music_l = np.zeros(total_samples, dtype=np.float32)
    music_r = np.zeros(total_samples, dtype=np.float32)
    
    # Rhodes Chords
    num_bars = int(np.ceil(total_duration_sec / bar_len)) + 1
    for b in range(num_bars):
        chord = chord_freqs[b % len(chord_freqs)]
        bar_start = b * bar_len
        bar_start_idx = int(bar_start * SAMPLE_RATE)
        
        chord_samples = int(bar_len * 1.4 * SAMPLE_RATE)
        t_chord = np.linspace(0, bar_len * 1.4, chord_samples, endpoint=False)
        envelope = np.exp(-1.4 * t_chord) * (1.0 - np.exp(-50 * t_chord))
        tremolo = 1.0 + 0.15 * np.sin(2 * np.pi * 5.2 * t_chord)
        
        for i, f in enumerate(chord):
            harm1 = np.sin(2 * np.pi * f * t_chord)
            harm2 = 0.35 * np.sin(2 * np.pi * f * 2 * t_chord)
            harm3 = 0.10 * np.sin(2 * np.pi * f * 3 * t_chord)
            note = (harm1 + harm2 + harm3) * envelope * tremolo * 0.16
            
            pan = (i / (len(chord) - 1)) * 0.6 + 0.2
            end_idx = min(total_samples, bar_start_idx + chord_samples)
            slice_len = end_idx - bar_start_idx
            if slice_len > 0:
                music_l[bar_start_idx:end_idx] += note[:slice_len] * (1.0 - pan)
                music_r[bar_start_idx:end_idx] += note[:slice_len] * pan
                
    # Sub-bass line
    bass_freqs = [73.42, 98.00, 65.41, 55.00]
    for b in range(num_bars):
        bf = bass_freqs[b % len(bass_freqs)]
        bar_start = b * bar_len
        bar_start_idx = int(bar_start * SAMPLE_RATE)
        bass_samples = int(bar_len * SAMPLE_RATE)
        t_bass = np.linspace(0, bar_len, bass_samples, endpoint=False)
        pitch_env = 1.0 + 0.15 * np.exp(-25 * t_bass)
        amp_env = np.exp(-0.8 * t_bass) * (1.0 - np.exp(-30 * t_bass))
        bass_note = np.sin(2 * np.pi * bf * pitch_env * t_bass) * amp_env * 0.25
        
        end_idx = min(total_samples, bar_start_idx + bass_samples)
        slice_len = end_idx - bar_start_idx
        if slice_len > 0:
            music_l[bar_start_idx:end_idx] += bass_note[:slice_len]
            music_r[bar_start_idx:end_idx] += bass_note[:slice_len]
            
    # Drums
    num_beats = int(total_duration_sec / spb)
    for beat in range(num_beats):
        beat_time = beat * spb
        in_bar = beat % 4
        is_kick = (in_bar == 0 or in_bar == 2)
        is_snare = (in_bar == 1 or in_bar == 3)
        start_idx = int(beat_time * SAMPLE_RATE)
        
        if is_kick:
            k_len = int(0.22 * SAMPLE_RATE)
            t_k = np.linspace(0, 0.22, k_len, endpoint=False)
            f_k = 55.0 + 80.0 * np.exp(-40 * t_k)
            kick = np.sin(2 * np.pi * f_k * t_k) * np.exp(-12 * t_k) * 0.32
            end_idx = min(total_samples, start_idx + k_len)
            s_len = end_idx - start_idx
            if s_len > 0:
                music_l[start_idx:end_idx] += kick[:s_len]
                music_r[start_idx:end_idx] += kick[:s_len]
                
        if is_snare:
            s_len = int(0.25 * SAMPLE_RATE)
            t_s = np.linspace(0, 0.25, s_len, endpoint=False)
            body = np.sin(2 * np.pi * 180 * t_s) * np.exp(-22 * t_s) * 0.18
            noise = (np.random.rand(s_len) * 2 - 1) * np.exp(-18 * t_s) * 0.12
            snare = body + noise
            end_idx = min(total_samples, start_idx + s_len)
            s_len_actual = end_idx - start_idx
            if s_len_actual > 0:
                music_l[start_idx:end_idx] += snare[:s_len_actual]
                music_r[start_idx:end_idx] += snare[:s_len_actual]
                
        for sub in [0, 0.5]:
            hh_time = beat_time + sub * spb
            hh_start = int(hh_time * SAMPLE_RATE)
            hh_len = int(0.05 * SAMPLE_RATE)
            t_hh = np.linspace(0, 0.05, hh_len, endpoint=False)
            hh = (np.random.rand(hh_len) * 2 - 1) * np.exp(-65 * t_hh) * 0.045
            end_idx = min(total_samples, hh_start + hh_len)
            s_len_actual = end_idx - hh_start
            if s_len_actual > 0 and hh_start < total_samples:
                music_l[hh_start:end_idx] += hh[:s_len_actual] * 0.4
                music_r[hh_start:end_idx] += hh[:s_len_actual] * 0.6
                
    # Vinyl texture
    vinyl = (np.random.rand(total_samples) * 2 - 1) * 0.008
    crackle_indices = np.random.randint(0, total_samples, size=int(total_duration_sec * 6))
    vinyl[crackle_indices] += np.random.uniform(0.04, 0.12, size=len(crackle_indices))
    music_l += vinyl
    music_r += vinyl
    
    # Fades
    fade_in = int(1.2 * SAMPLE_RATE)
    fade_out = int(2.5 * SAMPLE_RATE)
    music_l[:fade_in] *= np.linspace(0, 1, fade_in)
    music_r[:fade_in] *= np.linspace(0, 1, fade_in)
    music_l[-fade_out:] *= np.linspace(1, 0, fade_out)
    music_r[-fade_out:] *= np.linspace(1, 0, fade_out)
    
    return music_l, music_r

def generate_sfx(name, duration=1.0):
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, endpoint=False)
    
    if name == 'sub_drop':
        f = 35 + 65 * np.exp(-3.5 * t)
        phase = 2 * np.pi * np.cumsum(f) / SAMPLE_RATE
        sig = np.sin(phase) * np.exp(-1.5 * t) * 0.45
        return sig, sig
    elif name == 'whoosh':
        noise = np.random.rand(samples) * 2 - 1
        env = np.sin(np.pi * t / duration) ** 2
        sig = noise * env * 0.15
        return sig * 0.8, sig * 1.2
    elif name == 'chime':
        f1, f2, f3 = 1046.5, 1318.5, 1567.98
        sig = (np.sin(2*np.pi*f1*t) + 0.7*np.sin(2*np.pi*f2*t) + 0.5*np.sin(2*np.pi*f3*t)) * np.exp(-4 * t) * 0.20
        return sig, sig
    return np.zeros(samples), np.zeros(samples)

def build_master_soundtrack():
    audio_dir = 'promo_build/audio/v2'
    scene_timeline = [
        ('scene1_intro', 0.6),
        ('scene2_dashboard', 11.6),
        ('scene3_focus', 22.2),
        ('scene4_calendar_tasks', 33.6),
        ('scene5_analytics', 43.4),
        ('scene6_studymate', 53.6),
        ('scene7_finale', 63.8)
    ]
    total_duration = 73.5
    total_samples = int(total_duration * SAMPLE_RATE)
    
    print(f'Synthesizing music for {total_duration}s...')
    music_l, music_r = create_rich_soundtrack(total_duration)
    
    voice_l = np.zeros(total_samples, dtype=np.float32)
    voice_r = np.zeros(total_samples, dtype=np.float32)
    ducking_mask = np.zeros(total_samples, dtype=np.float32)
    
    for name, start_time in scene_timeline:
        wav_path = os.path.join(audio_dir, f'{name}.wav')
        sr, data = wav.read(wav_path)
        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0
        
        start_idx = int(start_time * SAMPLE_RATE)
        num_s = len(data)
        end_idx = min(total_samples, start_idx + num_s)
        actual_s = end_idx - start_idx
        
        if data.ndim == 2:
            voice_l[start_idx:end_idx] += data[:actual_s, 0] * 1.10
            voice_r[start_idx:end_idx] += data[:actual_s, 1] * 1.10
        else:
            voice_l[start_idx:end_idx] += data[:actual_s] * 1.10
            voice_r[start_idx:end_idx] += data[:actual_s] * 1.10
            
        pad = int(0.20 * SAMPLE_RATE)
        d_start = max(0, start_idx - pad)
        d_end = min(total_samples, end_idx + pad)
        ducking_mask[d_start:d_end] = 1.0
        
    # Instant O(N) smooth ducking using uniform_filter1d
    window_samples = int(0.35 * SAMPLE_RATE)
    ducking_smooth = uniform_filter1d(ducking_mask, size=window_samples)
    ducking_gain = 1.0 - ducking_smooth * 0.58
    
    music_l *= ducking_gain
    music_r *= ducking_gain
    
    # SFX
    sub_l, sub_r = generate_sfx('sub_drop', 1.8)
    s_idx = int(0.1 * SAMPLE_RATE)
    music_l[s_idx:s_idx+len(sub_l)] += sub_l
    music_r[s_idx:s_idx+len(sub_r)] += sub_r
    
    for _, st in scene_timeline[1:]:
        w_idx = int((st - 0.4) * SAMPLE_RATE)
        w_l, w_r = generate_sfx('whoosh', 0.8)
        end_w = min(total_samples, w_idx + len(w_l))
        music_l[w_idx:end_w] += w_l[:end_w - w_idx]
        music_r[w_idx:end_w] += w_r[:end_w - w_idx]
        
    for chime_t in [43.0, 53.2, 63.5, 71.2]:
        c_idx = int(chime_t * SAMPLE_RATE)
        c_l, c_r = generate_sfx('chime', 1.5)
        end_c = min(total_samples, c_idx + len(c_l))
        music_l[c_idx:end_c] += c_l[:end_c - c_idx]
        music_r[c_idx:end_c] += c_r[:end_c - c_idx]
        
    master_l = voice_l + music_l * 0.85
    master_r = voice_r + music_r * 0.85
    
    peak = max(np.max(np.abs(master_l)), np.max(np.abs(master_r)))
    print(f'Peak: {peak:.3f}')
    if peak > 0.01:
        target_peak = 0.94
        master_l = (master_l / peak) * target_peak
        master_r = (master_r / peak) * target_peak
        
    out_stereo = np.column_stack([
        (np.clip(master_l, -1.0, 1.0) * 32767).astype(np.int16),
        (np.clip(master_r, -1.0, 1.0) * 32767).astype(np.int16)
    ])
    
    master_wav = os.path.join(audio_dir, 'master_soundtrack.wav')
    wav.write(master_wav, SAMPLE_RATE, out_stereo)
    print(f'Saved: {master_wav} ({total_duration}s)')

if __name__ == '__main__':
    build_master_soundtrack()
