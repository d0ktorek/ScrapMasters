// Rarity configuration
window.RARITIES = {
  Common:    { key: 'Common', weight: 0.50, color: '#bfbfbf', stock: [3,2,1] },
  Uncommon:  { key: 'Uncommon', weight: 0.20, color: '#4CAF50', stock: [3,2,1] },
  Rare:      { key: 'Rare', weight: 0.10, color: '#4aa3ff', stock: [3,2,1] },
  Mythic:    { key: 'Mythic', weight: 0.05, color: '#ff66d9', stock: [3,2,1] },
  Legendary: { key: 'Legendary', weight: 0.01, color: '#FFD700', stock: [3,2,1] },
};

window.rollRarity = function() {
  const entries = Object.values(window.RARITIES);
  const total = entries.reduce((s, r) => s + r.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const r of entries) {
    acc += r.weight;
    if (roll <= acc) return r.key;
  }
  return 'Common';
};
