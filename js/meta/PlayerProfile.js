const KEY = "instrument_duel_profile_v2"; // Version bump for new system

export class PlayerProfile {
  constructor(){
    this.money = 0;
    this.unlockedLevel = 0; // index of highest unlocked
    this.upgradeLevels = {}; // upgradeId -> level (0 = not owned, 1-3 = levels)
  }

  static load(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        // Try old version migration
        const oldRaw = localStorage.getItem("instrument_duel_profile_v1");
        if (oldRaw) {
          const oldData = JSON.parse(oldRaw);
          const p = new PlayerProfile();
          p.money = oldData.money ?? 0;
          p.unlockedLevel = oldData.unlockedLevel ?? 0;
          // Migrate old owned to level 1
          if (oldData.owned) {
            Object.keys(oldData.owned).forEach(id => {
              if (oldData.owned[id]) p.upgradeLevels[id] = 1;
            });
          }
          p.save(); // Save migrated data
          return p;
        }
        return new PlayerProfile();
      }
      const obj = JSON.parse(raw);
      const p = new PlayerProfile();
      p.money = obj.money ?? 0;
      p.unlockedLevel = obj.unlockedLevel ?? 0;
      p.upgradeLevels = obj.upgradeLevels ?? {};
      return p;
    }catch{
      return new PlayerProfile();
    }
  }

  save(){
    localStorage.setItem(KEY, JSON.stringify({
      money: this.money,
      unlockedLevel: this.unlockedLevel,
      upgradeLevels: this.upgradeLevels
    }));
  }

  getUpgradeLevel(upgradeId) {
    return this.upgradeLevels[upgradeId] ?? 0;
  }

  setUpgradeLevel(upgradeId, level) {
    this.upgradeLevels[upgradeId] = level;
  }

  hasUpgrade(upgradeId) {
    return this.getUpgradeLevel(upgradeId) > 0;
  }
}