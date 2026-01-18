export const LEVELS = [
  {
    id: 0,
    name: "Level 1: Simple Groove",
    enemyName: "Riff Kid",
    lengthSec: 18,
    expectedScore: 3200,
    keyCount: 5,
    notes: [
      { lane:0, time:1.0 }, { lane:1, time:1.6 }, { lane:2, time:2.2 },
      { lane:3, time:2.8 }, { lane:4, time:3.4 },
      { lane:2, time:4.4, hold:0.9 },
      { lane:1, time:6.0 }, { lane:3, time:6.6 },
      { lane:0, time:8.0 }, { lane:4, time:8.6 },
      { lane:2, time:10.0, hold:1.1 },
      { lane:3, time:12.0 }, { lane:1, time:12.6 },
      { lane:4, time:14.0 }, { lane:0, time:14.6 }
    ]
  },
  {
    id: 1,
    name: "Level 2: Hold Master",
    enemyName: "Sustain Queen",
    lengthSec: 20,
    expectedScore: 5200,
    keyCount: 5,
    notes: [
      { lane:0, time:1.0, hold:1.2 },
      { lane:4, time:3.2, hold:1.0 },
      { lane:2, time:5.4 },
      { lane:2, time:6.0 },
      { lane:1, time:7.0, hold:0.8 },
      { lane:3, time:9.0 },
      { lane:0, time:10.4, hold:1.0 },
      { lane:4, time:12.8, hold:0.9 },
      { lane:2, time:15.0 }, { lane:1, time:15.6 }, { lane:3, time:16.2 }
    ]
  },
  {
    id: 2,
    name: "Level 3: Syncopation",
    enemyName: "Offbeat Ghost",
    lengthSec: 22,
    expectedScore: 6800,
    keyCount: 5,
    notes: [
      { lane:2, time:1.0 }, { lane:2, time:1.35 }, { lane:4, time:1.9 },
      { lane:1, time:2.6 }, { lane:3, time:2.95 },
      { lane:0, time:4.2, hold:0.7 },
      { lane:4, time:5.6 }, { lane:1, time:6.0 }, { lane:3, time:6.45 },
      { lane:2, time:8.0 }, { lane:4, time:8.35 },
      { lane:1, time:9.4, hold:0.9 },
      { lane:3, time:11.2 }, { lane:0, time:12.0 },
      { lane:2, time:13.6, hold:1.0 },
      { lane:4, time:15.6 }, { lane:1, time:16.0 }, { lane:3, time:16.45 }
    ]
  }
];
