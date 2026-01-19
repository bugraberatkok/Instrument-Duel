export const UPGRADES = [
  {
    id: "forgiving_hold",
    name: "Forgiving Strings",
    icon: "forgiving-strings.png",
    maxLevel: 3,
    baseDesc: "Hold release tolerance",
    getLevelDesc: (level) => {
      const bonus = 25 + (level - 1) * 15; // L1: 25%, L2: 40%, L3: 55%
      return `+${bonus}% hold tolerance`;
    },
    baseCost: 250,
    getCost: (level) => Math.floor(250 * Math.pow(2, level - 1))
  },
  {
    id: "score_mult",
    name: "Resonant Amplifier",
    icon: "score-mult.png",
    maxLevel: 3,
    baseDesc: "Score from all hits",
    getLevelDesc: (level) => {
      const bonus = 15 + (level - 1) * 10; // L1: 15%, L2: 25%, L3: 35%
      return `+${bonus}% score boost`;
    },
    baseCost: 280,
    getCost: (level) => Math.floor(280 * Math.pow(2, level - 1))
  },
  {
    id: "combo_boost",
    name: "Combo Booster",
    icon: "boost-2.png", // Default icon
    getIcon: (level) => {
      if (level === 0) return "boost-2.png";
      if (level === 1) return "boost-2.png";
      if (level === 2) return "boost-3.png";
      return "boost-5.png";
    },
    maxLevel: 3,
    baseDesc: "Reach 5x combo faster",
    getLevelDesc: (level) => {
      const mult = [70, 50, 30][level - 1]; // L1: 70%, L2: 50%, L3: 30%
      return `Reach 5x ${100 - mult}% faster`;
    },
    baseCost: 300,
    getCost: (level) => Math.floor(300 * Math.pow(2, level - 1))
  },
  {
    id: "currency_mult",
    name: "Currency Amplifier",
    icon: "currency-mult.png",
    maxLevel: 3,
    baseDesc: "Money earned after levels",
    getLevelDesc: (level) => {
      const bonus = 20 + (level - 1) * 15; // L1: 20%, L2: 35%, L3: 50%
      return `+${bonus}% money earned`;
    },
    baseCost: 320,
    getCost: (level) => Math.floor(320 * Math.pow(2, level - 1))
  }
];