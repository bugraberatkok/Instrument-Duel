const KEY = "instrument_duel_profile_v1";

export class PlayerProfile {
  constructor(){
    this.money = 0;
    this.unlockedLevel = 0; // index of highest unlocked
    this.owned = {}; // upgradeId -> true
  }

  static load(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return new PlayerProfile();
      const obj = JSON.parse(raw);
      const p = new PlayerProfile();
      p.money = obj.money ?? 0;
      p.unlockedLevel = obj.unlockedLevel ?? 0;
      p.owned = obj.owned ?? {};
      return p;
    }catch{
      return new PlayerProfile();
    }
  }

  save(){
    localStorage.setItem(KEY, JSON.stringify({
      money: this.money,
      unlockedLevel: this.unlockedLevel,
      owned: this.owned
    }));
  }
}
