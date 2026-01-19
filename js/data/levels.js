export const LEVELS = [
  {
    id: 0,
    name: "MELODY DUEL I",
    enemyName: "OFFBEAT GHOST",
    keyCount: 5,
    expectedScore: 5000,
    lengthSec: 30, 
    midiSrc: "midi/song2.mid",
    tempoMultiplier: 1.0,  // 1.0 = normal, 0.8 = 20% slower, 0.5 = 50% slower
    midiOptions: {
      minGap: 0.28,
      quantize: 0.05
    }
  },
  {
    id: 1,
    name: "MELODY DUEL II",
    enemyName: "SUSTAIN QUEEN",
    keyCount: 5,
    expectedScore: 5500,
    lengthSec: 30,
    midiSrc: "midi/song1.mid",
    tempoMultiplier: 0.8,
    midiOptions: {
      minGap: 0.26,
      quantize: 0.05
    }
  },
  {
    id: 2,
    name: "MELODY DUEL III",
    enemyName: "RIFF KID",
    keyCount: 5,
    expectedScore: 5600,
    lengthSec: 40, 
    midiSrc: "midi/song3.mid",
    tempoMultiplier: 1.0,
    midiOptions: {
      minGap: 0.24,
      quantize: 0.05
    }
  }
];