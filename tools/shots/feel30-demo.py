"""0.30 feel: a short demo for the owner's ears from the WAVs of tools/shots/feel30-audio.js.
Part 1: each rule sound, before then after (0.5 s apart, 1.2 s between sounds), Dora's shot first for scale.
Part 2: the before sounds (in A) over the valley music (valley-1, which is in F major) at the game's own mix (music
0.7 x 0.8, effects 0.9); part 3: the after sounds rendered in the cue's key (CUE=valley-1) over the same music. The
game runs effects through a compressor; the demo through a gentle tanh instead. Writes OUT.wav and a cue list (OUT.txt) with the time of each sound; encode with ffmpeg.
usage: python3 feel30-demo.py BEFORE_DIR AFTER_DIR AFTER_IN_CUE_KEY_DIR MUSIC_WAV OUT_BASENAME"""
import sys, wave
import numpy as np

SR = 44100


def rd(f):
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32767.0
    on = np.where(np.abs(x) > 1e-4)[0]
    return x[:on[-1] + 1] if len(on) else x


B, A, AK, MUS, OUT = sys.argv[1:6]
order = ['ref-shot-dora', 'arrive-yours', 'caught', 'death-creased', 'pinned', 'unpinned', 'ember', 'mended', 'mended-relit', 'brightend-10m',
         'slackwarn', 'slack', 'slackend-hush-fell', 'slackend-yours-fell', 'slackend-time']
seq = []; cues = []; t = 0.0
def put(x, label):
    global t
    seq.append((int(t * SR), x)); cues.append('%6.2f  %s' % (t, label)); t += len(x) / SR
for k in order:
    put(rd('%s/%s.wav' % (B, k)), k + ' (before)'); t += 0.5
    put(rd('%s/%s.wav' % (A, k)), k + ' (after)'); t += 1.2
w = wave.open(MUS); ch = w.getnchannels(); mus = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32767.0
if ch == 2:
    mus = mus.reshape(-1, 2).mean(axis=1)
for part, D in (('2: before (A major) over valley-1 (F major)', B), ('3: after, in the cue key, over valley-1', AK)):
    t += 1.0; p2 = t; cues.append('%6.2f  -- part %s --' % (t, part))
    m = mus[SR * 20: SR * 44] * 0.56
    fade = np.minimum(1, np.minimum(np.arange(len(m)) / SR, (len(m) - np.arange(len(m))) / SR))
    seq.append((int(p2 * SR), m * fade))
    t = p2 + 1.5
    for k in ['arrive-yours', 'caught', 'pinned', 'ember', 'mended', 'slackwarn', 'slack', 'unpinned', 'slackend-hush-fell', 'brightend-10m', 'ref-soul-secured']:
        x = rd('%s/%s.wav' % (D, k)) * 0.9; seq.append((int(t * SR), x)); cues.append('%6.2f  %s' % (t, k)); t += max(1.3, min(2.4, len(x) / SR * 0.8))
    t = max(t, p2 + len(m) / SR)
n = max(s + len(x) for s, x in seq) + SR // 2; y = np.zeros(n)
for s, x in seq:
    y[s:s + len(x)] += x
y = np.tanh(y * 1.2) / 1.2
w = wave.open(OUT + '.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
open(OUT + '.txt', 'w').write('\n'.join(cues) + '\n')
print('wrote', OUT, '%.1f s' % (n / SR))
