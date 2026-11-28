"""0.30 feel: measure the WAVs written by tools/shots/feel30-audio.js. Measured, not heard.
Per sound: peak and RMS (dBFS, RMS over the sounding span), a loudness in the manner of LUFS (BS.1770 K-weighting,
ungated, over the sounding span; short sounds have no proper integrated loudness), spectral centroid, the share of
energy in 2-5 kHz (where harshness lives), clicks (see measure()), and key: the tonal peaks below 2 kHz, their nearest A-major degree and how far off, as the
share of tonal energy that is not on a degree of the key (MKEY, default A major) (equal temperament, A = 440).
usage: [MKEY='F minor'] python3 feel30-audio.py DIR [DIR2]   (two dirs: a before/after table)"""
import sys, os, glob, json
import numpy as np
from scipy.signal import lfilter, find_peaks

SR = 44100
NAMES = 'A A# B C C# D D# E F F# G G#'.split()
_k = os.environ.get('MKEY', 'A major').split()  # the key to judge against, e.g. MKEY='F minor' (minor allows the raised 7th)
TON = NAMES.index(_k[0]); MAJ = {(TON + d) % 12 for d in ((0, 2, 4, 5, 7, 9, 11) if _k[1] == 'major' else (0, 2, 3, 5, 7, 8, 10, 11))}


def kweight(x):
    # BS.1770 pre-filter (high shelf) and RLB high-pass, coefficients for 44.1 kHz
    b1 = [1.53090959966, -2.65116903039, 1.16916686237]; a1 = [1.0, -1.66375011030, 0.71265753489]
    b2 = [1.0, -2.0, 1.0]; a2 = [1.0, -1.98916967363, 0.98919159781]
    return lfilter(b2, a2, lfilter(b1, a1, x))


def db(v):
    return 20 * np.log10(max(v, 1e-9))


def measure(f):
    import wave
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32767.0
    a = np.abs(x); pk = a.max() if len(a) else 0
    on = np.where(a > max(pk * 0.001, 1e-4))[0]
    if len(on) == 0:
        return None
    s0, s1 = on[0], on[-1] + 1; y = x[s0:s1]
    rms = np.sqrt(np.mean(y ** 2)); k = kweight(x)[s0:s1]; lufs = -0.691 + 10 * np.log10(max(np.mean(k ** 2), 1e-12))
    sp = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2; fr = np.fft.rfftfreq(len(y), 1 / SR)
    tot = sp.sum() + 1e-18; cent = float((sp * fr).sum() / tot); harsh = float(sp[(fr >= 2000) & (fr <= 5000)].sum() / tot)
    # clicks: a discontinuity is broadband, so a click is a 1 ms window whose energy above 12 kHz is over 20 % of its
    # whole energy while the window is within 30 dB of the sound's loudest; a smooth attack, a beat or a filtered noise
    # is not a click. Counted per run of such windows; a sound that starts on one counts too.
    from scipy.signal import butter, sosfilt
    hp = sosfilt(butter(4, 12000, 'highpass', fs=SR, output='sos'), np.concatenate([np.zeros(441), y]))
    yy = np.concatenate([np.zeros(441), y]); n = 44; m = len(yy) // n
    fe = np.sqrt(np.mean(yy[:m * n].reshape(m, n) ** 2, axis=1)); he = np.sqrt(np.mean(hp[:m * n].reshape(m, n) ** 2, axis=1))
    hot = (he > 0.2 * fe) & (fe > fe.max() * 0.03); clicks = int(np.sum(hot[1:] & ~hot[:-1]) + (1 if hot[0] else 0))
    tail = float(a[min(len(a) - 1, on[-1])]) if on[-1] >= len(a) - 2 else 0.0
    # key: spectral peaks 60 Hz - 2 kHz within 24 dB of the strongest
    band = (fr >= 60) & (fr <= 2000); spb = sp.copy(); spb[~band] = 0
    tonal = []; off = 0.0; ton = 0.0
    if spb.max() > 0:
        pk_i, _ = find_peaks(spb, height=spb.max() * 10 ** (-24 / 10), distance=max(1, int(8 / (fr[1] - fr[0]))))
        for i in pk_i:
            semis = 12 * np.log2(fr[i] / 440.0); near = int(round(semis)); cents = (semis - near) * 100; pc = near % 12
            bad = (pc not in MAJ) or abs(cents) > 30
            ton += spb[i]; off += spb[i] if bad else 0
            tonal.append((round(float(fr[i]), 1), pc, round(float(cents)), bad, float(spb[i])))
    tonal.sort(key=lambda t: -t[4])
    return dict(peak=db(pk), rms=db(rms), lufs=lufs, cent=cent, harsh=harsh, clicks=clicks, tail=tail, secs=(s1 - s0) / SR,
                offkey=(off / ton if ton else 0.0), tones=[(t[0], 'A A# B C C# D D# E F F# G G#'.split()[t[1]], t[2], 'OFF' if t[3] else '') for t in tonal[:5]])


def table(d):
    r = {}
    for f in sorted(glob.glob(os.path.join(d, '*.wav'))):
        m = measure(f)
        if m:
            r[os.path.basename(f)[:-4]] = m
    return r


if __name__ == '__main__':
    A = table(sys.argv[1]); B = table(sys.argv[2]) if len(sys.argv) > 2 else None
    hdr = '%-22s %6s %6s %6s %6s %5s %4s %5s %5s' % ('sound', 'peak', 'rms', 'LUFS~', 'cent', '2-5k', 'clk', 'off%', 'secs')
    print(hdr if not B else '%-22s | before: %s | after: %s' % ('', hdr[23:], hdr[23:]))
    def row(m):
        return '%6.1f %6.1f %6.1f %6.0f %5.2f %4d %5.0f %5.2f' % (m['peak'], m['rms'], m['lufs'], m['cent'], m['harsh'], m['clicks'], m['offkey'] * 100, m['secs'])
    for k in A:
        print('%-22s %s' % (k, row(A[k])) + (' | ' + row(B[k]) if B and k in B else ''))
    print()
    for k in (B or A):
        print('%-22s tones %s' % (k, (B or A)[k]['tones']))
    if len(sys.argv) > 3:
        json.dump({'before': A, 'after': B}, open(sys.argv[3], 'w'), indent=1, default=str)
