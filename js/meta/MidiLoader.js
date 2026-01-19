// src/meta/MidiLoader.js
// Requires index.html: <script src=".../Midi.js"></script>

export async function loadMidiToChart(url, {
  keyCount = 5,
  minGap = 0.26,     // clicker için kritik (0.24-0.32 arası iyi)
  quantize = 0.05,   // 50ms grid
  pickTrack = "largest"
} = {}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MIDI fetch failed: ${res.status} ${res.statusText}`);
  const arr = await res.arrayBuffer();

  // global Midi (tonejs/midi)
  const midi = new Midi(arr);

  // BPM
  const bpm = midi.header.tempos?.[0]?.bpm ?? 120;

  // Track seç (en çok nota olan)
  let track = null;
  if (pickTrack === "largest"){
    track = midi.tracks.reduce((best, t) =>
      (!best || t.notes.length > best.notes.length) ? t : best
    , null);
  } else {
    track = midi.tracks[0] ?? null;
  }

  if (!track || track.notes.length === 0){
    return { bpm, lengthSec: 30, notes: [] };
  }

  // Notları al
  let raw = track.notes.map(n => ({
    time: n.time,
    dur: n.duration,
    midi: n.midi
  }));

  // Quantize
  const q = (x) => Math.round(x / quantize) * quantize;
  raw = raw.map(n => ({
    ...n,
    time: +q(n.time).toFixed(3),
    dur: +q(n.dur).toFixed(3)
  }));

  // Sırala
  raw.sort((a,b) => a.time - b.time);

  // Çok sık notaları at (minGap)
  const filtered = [];
  let lastTime = -999;
  for (const n of raw){
    if (n.time - lastTime < minGap) continue;
    filtered.push(n);
    lastTime = n.time;
  }

  // lane map: pitch range -> 0..keyCount-1
  const minMidi = Math.min(...filtered.map(n => n.midi));
  const maxMidi = Math.max(...filtered.map(n => n.midi));
  const span = Math.max(1, maxMidi - minMidi);

  const notes = filtered.map(n => {
    const norm = (n.midi - minMidi) / span; // 0..1
    let lane = Math.floor(norm * keyCount);
    if (lane >= keyCount) lane = keyCount - 1;

    // hold: uzun notayı hold yap
    const hold = (n.dur >= 0.45) ? n.dur : 0;

    return hold > 0
      ? { lane, time: n.time, hold }
      : { lane, time: n.time };
  });

  const last = notes[notes.length - 1];
  const lengthSec = last ? Math.max(10, last.time + (last.hold ?? 0) + 2) : 30;

  return { bpm, lengthSec, notes };
}
