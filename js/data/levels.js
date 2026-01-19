export const LEVELS = [
  {
    id: 0,
    name: "Melody Duel I",
    enemyName: "Tempo Rival",
    keyCount: 5,
    expectedScore: 2600,
    midiSrc: "midi/song1.mid",
    midiOptions: {
      minGap: 0.28,    // Not yoğunluğu (0.20-0.35 arası iyi)
      quantize: 0.05
    }
  },
  {
    id: 1,
    name: "Melody Duel II",
    enemyName: "Rhythm Master",
    keyCount: 5,
    expectedScore: 3200,
    midiSrc: "midi/song2.mid",
    midiOptions: {
      minGap: 0.28,    // Biraz daha zor - daha sık notalar
      quantize: 0.05
    }
  },
  {
    id: 2,
    name: "Melody Duel III",
    enemyName: "Harmony King",
    keyCount: 5,
    expectedScore: 4000,
    midiSrc: "midi/song3.mid",
    midiOptions: {
      minGap: 0.26,    // En zor - en sık notalar
      quantize: 0.05
    }
  }
];