// src/meta/MidiPlayback.js
import { loadMidiToChart } from "./MidiLoader.js";

// Bu fonksiyon: midi'yi okur, notaları zamanına göre sıralar ve playback için döner
export async function loadMidiForPlayback(url){
  // MidiLoader zaten fetch+parse yapıyor; ama bizim playback için
  // "midi note + time + duration" lazım.
  // O yüzden MidiLoader'ı biraz genişletmek en güzeli.
  // Şimdilik direkt Midi globali ile okuyalım:

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MIDI fetch failed: ${res.status}`);
  const arr = await res.arrayBuffer();

  const midi = new Midi(arr);

  const bpm = midi.header.tempos?.[0]?.bpm ?? 120;

  // melody track seçimi: genelde en yüksek ortalama pitch daha melodidir
  const tracks = midi.tracks.filter(t => t.notes.length > 0);
  const scoreTrack = (t) => {
    const avg = t.notes.reduce((s,n)=>s+n.midi,0) / t.notes.length;
    return avg + t.notes.length * 0.001; // küçük bias
  };
  const track = tracks.sort((a,b)=>scoreTrack(b)-scoreTrack(a))[0];

  const events = track.notes
    .map(n => ({ time: n.time, midi: n.midi, dur: n.duration }))
    .sort((a,b)=>a.time-b.time);

  const last = events[events.length-1];
  const lengthSec = last ? (last.time + last.dur + 1) : 30;

  return { bpm, events, lengthSec };
}
