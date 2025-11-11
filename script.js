let scraps = 0;
let canClick = true;
let scrapPerClick = 1;
let autoClickerInterval = null;
let currentCooldownTime = 5.00;
let scrapyardInterval = null;
let scrapyardPurchased = false;
const scrapyardCost = 2000;
const SCRAPYARD_MASTERY_TIER_MAX = 10;
const SCRAPYARD_MASTERY_BASE_TIER_COST = 2000;
const SCRAPYARD_MASTERY_REDUCTION_PER_LEVEL = 0.002; // 0.20% per level
const SCRAPYARD_MASTERY_STORAGE_KEY = 'sm_scrapyard_mastery';
const scrapyardMasteryTierCostCache = new Map();
let scrapyardMasteryTier = 0;
let scrapyardMasteryLevel = 0;
let rebirthCount = 0;
// Dynamiczny koszt rebirth: pierwszy 2000, potem x1.85 za każdy kolejny
function getScrapyardMasteryMultiplier() {
    const reduction = (SCRAPYARD_MASTERY_REDUCTION_PER_LEVEL * scrapyardMasteryLevel) || 0;
    const multiplier = 1 - reduction;
    return Math.max(0.1, multiplier); // never drop below 10% of base cost
}

function getScrapyardMasteryReductionPercent() {
    const reduction = (SCRAPYARD_MASTERY_REDUCTION_PER_LEVEL * scrapyardMasteryLevel) || 0;
    return Math.max(0, reduction * 100);
}

function getScrapyardMasteryLevelMultiplier(levelNumber) {
    if (levelNumber >= 200) return 1.20;
    if (levelNumber >= 150) return 1.25;
    if (levelNumber >= 100) return 1.30;
    if (levelNumber >= 70) return 1.35;
    if (levelNumber >= 40) return 1.50;
    if (levelNumber >= 15) return 1.70;
    if (levelNumber >= 10) return 1.75;
    if (levelNumber >= 1) return 1.85;
    return 1;
}

function getScrapyardMasteryTierCost() {
    const appliedLevels = Math.max(0, scrapyardMasteryLevel || 0);
    if (scrapyardMasteryTierCostCache.has(appliedLevels)) {
        return scrapyardMasteryTierCostCache.get(appliedLevels);
    }

    let cost = SCRAPYARD_MASTERY_BASE_TIER_COST;
    for (let levelIndex = 1; levelIndex <= appliedLevels; levelIndex++) {
        cost = Math.ceil(cost * getScrapyardMasteryLevelMultiplier(levelIndex));
    }

    scrapyardMasteryTierCostCache.set(appliedLevels, cost);
    return cost;
}

function persistScrapyardMasteryProgress() {
    try {
        const payload = {
            tier: Math.max(0, Math.min(SCRAPYARD_MASTERY_TIER_MAX, scrapyardMasteryTier)),
            level: Math.max(0, scrapyardMasteryLevel)
        };
        localStorage.setItem(SCRAPYARD_MASTERY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
}

function loadScrapyardMasteryProgressFromStorage() {
    try {
        const raw = localStorage.getItem(SCRAPYARD_MASTERY_STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
            if (typeof data.level === 'number' && Number.isFinite(data.level)) {
                scrapyardMasteryLevel = Math.max(0, Math.floor(data.level));
            }
            if (typeof data.tier === 'number' && Number.isFinite(data.tier)) {
                scrapyardMasteryTier = Math.max(0, Math.min(SCRAPYARD_MASTERY_TIER_MAX, Math.floor(data.tier)));
            }
            scrapyardMasteryTierCostCache.clear();
        }
    } catch {}
}

loadScrapyardMasteryProgressFromStorage();

function isScrapyardMasteryUnlocked() {
    try {
        const mastery = treeUpgrades && treeUpgrades.find(u => u && u.name === 'ScrapYard Mastery');
        return !!(mastery && mastery.level > 0);
    } catch {
        return false;
    }
}

function getCurrentRebirthCost() {
    // Tiered softcaps for next rebirth cost (in Scrap):
    // base = 2000 for the 1st; then multipliers per step based on current rebirthCount (already owned)
    // steps 0..2 (to reach 1..3): x1.85
    // steps 3..5 (to reach 4..6): x1.5
    // steps 6..9 (to reach 7..10): x1.4
    // steps 10+ (to reach 11,12, ...): x1.2
    const base = 2000;
    const c = Math.max(0, Math.floor(Number(rebirthCount) || 0));
    const n1 = Math.min(c, 3);                 // up to 3 steps at 1.85
    const n2 = Math.min(Math.max(c - 3, 0), 3); // next up to 3 steps at 1.5 (3..5)
    const n3 = Math.min(Math.max(c - 6, 0), 4); // next up to 4 steps at 1.4 (6..9)
    const n4 = Math.max(c - 10, 0);             // remaining steps at 1.2 (10+)
    const cost = base
        * Math.pow(1.85, n1)
        * Math.pow(1.5, n2)
        * Math.pow(1.4, n3)
        * Math.pow(1.2, n4);
    return Math.floor(cost * getScrapyardMasteryMultiplier());
}

// Always render Scrap without decimals in the main counter
function updateScrapCounter() {
    if (typeof counter !== 'undefined' && counter) {
        const val = Math.floor(Number.isFinite(scraps) ? scraps : 0);
        try {
            counter.textContent = `Scrap: ${val.toLocaleString()}`;
        } catch {
            counter.textContent = `Scrap: ${val}`;
        }
    }
    if (typeof updateScrapyardMasteryUI === 'function') updateScrapyardMasteryUI();
}
// Dynamic cost model for +1 Scrap/click: keep early levels cheap, soften growth at high levels
const UPG1_BASE_COST = 1;
const UPG1_GROWTH = 1.05;        // L0..150
const UPG1_SOFTCAP1 = 150;
const UPG1_GROWTH_2 = 1.02;      // L151..400
const UPG1_SOFTCAP2 = 400;
const UPG1_GROWTH_3 = 1.015;     // L401..700
const UPG1_SOFTCAP3 = 700;
const UPG1_GROWTH_4 = 1.008;     // L701..1000
const UPG1_SOFTCAP4 = 1000;
const UPG1_GROWTH_5 = 1.004;     // L1001..1500
const UPG1_SOFTCAP5 = 1500;
const UPG1_GROWTH_6 = 1.002;     // L1501..2300
const UPG1_SOFTCAP6 = 2300;
const UPG1_GROWTH_7 = 1.001;     // L2301+
function getUpgrade1Cost(level) {
    // Segment 1
    if (level <= UPG1_SOFTCAP1) {
        return Math.floor(UPG1_BASE_COST * Math.pow(UPG1_GROWTH, level));
    }
    // cost at end of seg1
    const c1 = UPG1_BASE_COST * Math.pow(UPG1_GROWTH, UPG1_SOFTCAP1);
    const l2 = Math.min(level, UPG1_SOFTCAP2) - UPG1_SOFTCAP1; // levels in seg2
    if (level <= UPG1_SOFTCAP2) {
        return Math.floor(c1 * Math.pow(UPG1_GROWTH_2, l2));
    }
    // cost at end of seg2
    const c2 = c1 * Math.pow(UPG1_GROWTH_2, UPG1_SOFTCAP2 - UPG1_SOFTCAP1);
    const l3 = Math.min(level, UPG1_SOFTCAP3) - UPG1_SOFTCAP2; // levels in seg3
    if (level <= UPG1_SOFTCAP3) {
        return Math.floor(c2 * Math.pow(UPG1_GROWTH_3, l3));
    }
    // seg4 (701..1000)
    const c3 = c2 * Math.pow(UPG1_GROWTH_3, UPG1_SOFTCAP3 - UPG1_SOFTCAP2);
    const l4 = Math.min(level, UPG1_SOFTCAP4) - UPG1_SOFTCAP3;
    if (level <= UPG1_SOFTCAP4) {
        return Math.floor(c3 * Math.pow(UPG1_GROWTH_4, l4));
    }
    // seg5 (1001..1500)
    const c4 = c3 * Math.pow(UPG1_GROWTH_4, UPG1_SOFTCAP4 - UPG1_SOFTCAP3);
    const l5 = Math.min(level, UPG1_SOFTCAP5) - UPG1_SOFTCAP4;
    if (level <= UPG1_SOFTCAP5) {
        return Math.floor(c4 * Math.pow(UPG1_GROWTH_5, l5));
    }
    // seg6 (1501..2300)
    const c5 = c4 * Math.pow(UPG1_GROWTH_5, UPG1_SOFTCAP5 - UPG1_SOFTCAP4);
    const l6 = Math.min(level, UPG1_SOFTCAP6) - UPG1_SOFTCAP5;
    if (level <= UPG1_SOFTCAP6) {
        return Math.floor(c5 * Math.pow(UPG1_GROWTH_6, l6));
    }
    // seg7 (2301+)
    const c6 = c5 * Math.pow(UPG1_GROWTH_6, UPG1_SOFTCAP6 - UPG1_SOFTCAP5);
    const l7 = level - UPG1_SOFTCAP6;
    return Math.floor(c6 * Math.pow(UPG1_GROWTH_7, l7));
}
const upgrade2Cost = 50;
const upgrade3Costs = [30, 80, 300, 500, 600, 800, 900, 1000, 1300, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 18000, 22000, 26000, 30000, 35000, 40000, 45000, 50000, 60000, 70000];
// Funny Joke: 10 levels
const upgrade4Costs = [
    100, 200, 350, 500, 750, 1100, 1600, 2200, 3000, 4000
];
// Mass Scrap costs: even cheaper progression, 10 levels
const upgrade5Costs = [
    25000,    // L1
    60000,    // L2
    120000,   // L3
    250000,   // L4
    500000,   // L5
    1000000,  // L6
    2000000,  // L7
    4000000,  // L8
    8000000,  // L9
    16000000  // L10
];
const upgradeLevels = [0, 0, 0, 0, 0];

// Stała: maksymalny poziom Autoclickera (index 1)
const AUTOCLICKER_MAX_LEVEL = 1;

// Tire system
let tireInterval = null;
let tires = 0;
let tiles = 0; // New currency
let tilesTier = 0; // current tier progress (0..10)
let tilesLevel = 0; // total level; each full tier adds +1 level
const tilesTierMax = 10;

// Cost to upgrade a single Tier step grows with Level: base 1 + 2 per Level
function getTilesTierCost() {
    // Base 5 Tires +2 per Tiles Level for each Tier step (10 steps per Level)
    return 5 + (tilesLevel * 2);
}

// Elementy DOM
const counter = document.getElementById('counter');
const scrapImage = document.getElementById('scrap-image');
const cooldownBar = document.getElementById('cooldown-bar');
const cooldownTimer = document.getElementById('cooldown-timer');
const upgradeBtn = document.getElementById('upgrade-btn');
const upgradeWindow = document.getElementById('upgrade-window');
const closeUpgrades = document.getElementById('close-upgrades');
const bookContainer = document.getElementById('book-container');
const bookBtn = document.getElementById('book-btn');
const scrapyardWindow = document.getElementById('scrapyard-window');
const scrapyardImage = document.getElementById('scrapyard-image');
const buyScrapyardBtn = document.getElementById('buy-scrapyard');
const closeScrapyard = document.getElementById('close-scrapyard');
const scrapyardCostDisplay = document.getElementById('scrapyard-cost');
const starBtn = document.getElementById('star-btn');
const rebirthWindow = document.getElementById('rebirth-window');
const closeRebirth = document.getElementById('close-rebirth');
const confirmRebirthBtn = document.getElementById('confirm-rebirth');
const rebirthCountDisplay = document.getElementById('rebirth-count');
const greenUpgradeBtn = document.getElementById('greenupgrade-btn');
const greenUpgradeContainer = document.getElementById('greenupgrade-container');
const greenUpgradeWindow = document.getElementById('greenupgrade-window');
const closeGreenUpgrade = document.getElementById('close-greenupgrade');
const mysteryBookContainer = document.getElementById('mysterybook-container');
const mysteryBookBtn = document.getElementById('mysterybook-btn');
const masterTokenCount = document.getElementById('master-token-count');
const scrapyardStatusIcon = document.getElementById('scrapyard-status-icon');
const scrapyardMasteryIcon = document.getElementById('scrapyard-mastery-icon');
const scrapyardMasteryBadge = document.getElementById('scrapyard-mastery-badge');
const scrapyardMasteryWindow = document.getElementById('scrapyard-mastery-window');
const scrapyardMasteryButton = document.getElementById('scrapyard-mastery-image');
const scrapyardMasteryTierLabel = document.getElementById('scrapyard-mastery-tier');
const scrapyardMasteryLevelLabel = document.getElementById('scrapyard-mastery-level');
const scrapyardMasteryReductionLabel = document.getElementById('scrapyard-mastery-reduction');
const scrapyardMasteryMultiplierLabel = document.getElementById('scrapyard-mastery-multiplier');
const scrapyardMasteryCostLabel = document.getElementById('scrapyard-mastery-cost');
const closeScrapyardMastery = document.getElementById('close-scrapyard-mastery');
const brickCount = document.getElementById('brick-count');
const brickContainer = document.getElementById('brick-container');
const brickCounter = document.getElementById('brick-counter');
const tilesCounter = document.getElementById('tiles-counter');
const tilesContainer = document.getElementById('tiles-container');
const brickyardSection = document.getElementById('brickyard-section');
const brickyardSeparator = document.getElementById('brickyard-separator');
const brickyardImage = document.getElementById('brickyard-image');
const buyBrickBtn = document.getElementById('buy-brick');
// TilesYard DOM
const tilesyardSection = document.getElementById('tilesyard-section');
const tilesyardSeparator = document.getElementById('tilesyard-separator');
const tilesyardImage = document.getElementById('tilesyard-image');
const tilesyardStatus = document.getElementById('tilesyard-status');
const tilesUpgradeLevelLabel = document.getElementById('tiles-upgrade-level'); // will show Tier: x/10
const tilesLevelLabel = document.getElementById('tiles-level-label'); // shows Level: x
const tilesUpgradeBtn = document.getElementById('tiles-upgrade-btn');
const treeContainer = document.getElementById('tree-container');
const treeBtn = document.getElementById('tree-btn');
const treeWindow = document.getElementById('tree-window');
const treeGeneration = document.getElementById('tree-generation');
const closeTree = document.getElementById('close-tree');
const treeInfoWindow = document.getElementById('tree-info-window');
const closeTreeInfo = document.getElementById('close-tree-info');
const treeInfoStatus = document.getElementById('tree-info-status');
const treeInfoRequirement = document.getElementById('tree-info-requirement');
const treeInfoRequirement2 = document.getElementById('tree-info-requirement2');
const treeInfoBuyBtn = document.getElementById('tree-info-buy-btn');
const treeInfoTokens = document.getElementById('tree-info-tokens');
const treeInfoTitle = document.getElementById('tree-info-title');
const treeInfoDescription = document.getElementById('tree-info-description');
// Item Shop DOM
const itemshopWindow = document.getElementById('itemshop-window');
const itemshopGrid = document.getElementById('itemshop-grid');
const itemshopTimerEl = document.getElementById('itemshop-timer');
const closeItemshop = document.getElementById('close-itemshop');
// Inventory DOM
const inventoryBtn = document.getElementById('inventory-btn');
const inventoryWindow = document.getElementById('inventory-window');
const inventoryGrid = document.getElementById('inventory-grid');
const inventoryCountEl = document.getElementById('inventory-count');
const closeInventory = document.getElementById('close-inventory');
// Boosts UI DOM
const boostsBanner = document.getElementById('boosts-banner');
// Item hint DOM
const itemhintWindow = document.getElementById('itemhint-window');
const itemhintTitle = document.getElementById('itemhint-title');
const itemhintText = document.getElementById('itemhint-text');
const closeItemhint = document.getElementById('close-itemhint');
// Chat removed
// (All global chat UI & socket logic stripped)
// Blue upgrade UI elements
const blueUpgradeContainer = document.getElementById('blueupgrade-container');
const blueUpgradeBtn = document.getElementById('blueupgrade-btn');
const blueUpgradeWindow = document.getElementById('blueupgrade-window');
const closeBlueUpgrade = document.getElementById('close-blueupgrade');

// =================
// Inventory system
// =================
const INVENTORY_SLOTS = 6;
let inventory = []; // array of { id, name, rarity, price? }
let itemHints = null; // loaded from itemshint.json

function resolveItemIcon(item) {
    const mapping = {
        low_cooldown: 'assets/inventory2.png',
        sunny_day: 'assets/inventory1.png',
        runny_day: 'assets/scrap.png',
        real_autoclicker: 'assets/inventory2.png',
        triple_drops: 'assets/inventory2.png',
        boost_master_tokens: 'assets/master.png',
    };
    return mapping[item.id] || 'assets/itemshop.png';
}

// =================
// Boosts system
// =================
// Structure: { id, name, untilTs, data }
const activeBoosts = [];
let boostsTicker = null;
let sunnyDayInterval = null;
let sunnyDayOriginalBarrel = null;
let sunnyDayCurrentIndex = null;
// Runny Day storm: simple local storm of scrap/barrels
let runnyStormActive = false;
let realAutoClickerInterval = null;

function isUsableItem(it) {
    if (!it) return false;
    const id = (it.id || '').toLowerCase();
    const name = (it.name || '').toLowerCase();
    const usableIds = ['low_cooldown','sunny_day','runny_day','real_autoclicker','triple_drops','boost_master_tokens'];
    const usableNames = ['low cooldown','sunny day','runny day','real auto clicker','real autoclicker','triple drops','boost master tokens'];
    return usableIds.includes(id) || usableNames.includes(name);
}

function formatRemain(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

function renderBoosts() {
    if (!boostsBanner) return;
    // Remove expired first
    const now = Date.now();
    for (let i = activeBoosts.length - 1; i >= 0; i--) {
        if (activeBoosts[i].untilTs <= now) activeBoosts.splice(i, 1);
    }
    boostsBanner.innerHTML = '';
    if (!activeBoosts.length) {
        boostsBanner.classList.add('hidden');
        return;
    }
    boostsBanner.classList.remove('hidden');
    for (const b of activeBoosts) {
        const badge = document.createElement('div');
        badge.className = 'boost-badge';
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = b.name;
        const time = document.createElement('span');
        time.className = 'time';
        time.textContent = formatRemain(b.untilTs - now);
        badge.appendChild(name);
        badge.appendChild(time);
        boostsBanner.appendChild(badge);
    }
}

function ensureBoostsTicker() {
    if (boostsTicker) return;
    boostsTicker = setInterval(() => {
        renderBoosts();
    }, 1000);
}

function addBoost(b) {
    // If same id exists, extend/replace
    const idx = activeBoosts.findIndex(x => x.id === b.id);
    if (idx >= 0) activeBoosts.splice(idx, 1);
    activeBoosts.push(b);
    renderBoosts();
    ensureBoostsTicker();
}

function isBoostActive(id) {
    const now = Date.now();
    return activeBoosts.some(b => b.id === id && b.untilTs > now);
}

function getCooldownOverride() {
    // Low Cooldown sets cooldown to 1.00s
    if (isBoostActive('low_cooldown')) return 1.00;
    return null;
}

function isSunnyDayActive() { return isBoostActive('sunny_day'); }

// Triple Drops: when active, falling pickups give 3x rewards
function getDropMultiplier() {
    try { return isBoostActive('triple_drops') ? 3 : 1; } catch { return 1; }
}

// Boost Master Tokens: when active, Master Token gains are x5
function getMasterTokenMultiplier() {
    try { return isBoostActive('boost_master_tokens') ? 5 : 1; } catch { return 1; }
}

function getAvailableBarrelIndices() {
    // Respect rebirth gating: index requires rebirth >= index
    const arr = [];
    for (let i = 0; i < (typeof barrelImages !== 'undefined' ? barrelImages.length : 0); i++) {
        if (rebirthCount >= i) arr.push(i);
    }
    if (!arr.length) arr.push(0);
    return arr;
}

function setTemporaryBarrel(index) {
    try {
        if (index >= 0 && index < barrelImages.length) {
            // Change image and click bonus without altering selectedBarrelIndex or saving
            scrapImage.src = barrelImages[index];
            scrapBonusPercent = index;
            sunnyDayCurrentIndex = index;
        }
    } catch {}
}

function startSunnyDay() {
    // Save original selected barrel to restore after effect
    if (sunnyDayInterval) { try { clearInterval(sunnyDayInterval); } catch {} sunnyDayInterval = null; }
    sunnyDayOriginalBarrel = (typeof selectedBarrelIndex !== 'undefined') ? selectedBarrelIndex : 0;
    const pool = getAvailableBarrelIndices();
    // Immediately set a random one
    setTemporaryBarrel(pool[Math.floor(Math.random() * pool.length)]);
    sunnyDayInterval = setInterval(() => {
        const poolNow = getAvailableBarrelIndices();
        const next = poolNow[Math.floor(Math.random() * poolNow.length)];
        setTemporaryBarrel(next);
    }, 1000);
}

function stopSunnyDay() {
    if (sunnyDayInterval) { try { clearInterval(sunnyDayInterval); } catch {} sunnyDayInterval = null; }
    sunnyDayCurrentIndex = null;
    // Restore original selected barrel image/bonus
    if (typeof updateBarrelImage === 'function' && sunnyDayOriginalBarrel != null) {
        updateBarrelImage(sunnyDayOriginalBarrel);
    }
    sunnyDayOriginalBarrel = null;
}

// ---- Real Auto clicker (Rare): for 60s, auto-clicks when cooldown is READY ----
async function syncPlayerToServer() {
    if (!isBackendAvailable()) return;
    if (window.__SM_BANNED) return; // do not sync if banned
    const { username } = resolveActiveUsername({ allowAuto: false });
    if (!username) {
        if (!hasWarnedMissingNickname) {
            console.debug('[Sync] Skipping player sync because nickname is not set manually.');
        }
        hasWarnedMissingNickname = true;
        return;
    }
    hasWarnedMissingNickname = false;
    const payload = { username, clientId: getClientId(), inventory: Array.isArray(inventory) ? inventory.slice(0, 6) : [] };
    try {
        const res = await fetch('/api/player/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            if (res.status === 403) {
                disableBackendSyncAfterForbidden('Server sync disabled after save error (403).');
                console.warn('Player sync rejected with 403. Backend interactions disabled.');
                if (data && data.antiCheat) {
                    alert(data.message || 'Access Denied. Do not attempt to enter commands in the console or it will result in your account being banned.');
                    return;
                }
                if (data && data.banned) {
                    window.__SM_BANNED = true;
                    showBanOverlay(data.message || 'You have been banned for not following the game rules (which do not exist). Please do not play unfairly.');
                }
                return;
            }
        }
    } catch {}
}

let backendOptIn = true;
const BACKEND_BLOCK_KEY = 'sm_backend_blocked';

try {
    const stored = localStorage.getItem('sm_backend_opt_in');
    if (stored === '0') {
        backendOptIn = true;
        localStorage.setItem('sm_backend_opt_in', '1');
    }
    if (localStorage.getItem(BACKEND_BLOCK_KEY) === '1') {
        localStorage.removeItem(BACKEND_BLOCK_KEY);
    }
} catch (err) {}

try { setBackendSyncOptIn(true, { silent: true, log: false }); } catch {}

function isBackendAvailable() {
    if (!backendOptIn) return false;
    if (typeof window !== 'undefined') {
        if (window.__SM_BACKEND_BLOCKED) return false;
        if (window.__SM_BANNED) return false;
    }
    const proto = (location && location.protocol || '').toLowerCase();
    if (!proto || !proto.startsWith('http')) return false;
    return true;
}

// Auto-enable backend sync in local development (if user never opted in) so that chat/leaderboard work out of the box.
// This prevents confusion when opening the site on localhost where nothing loads.
(function ensureLocalBackendOptIn(){
    try {
        const proto = (location && location.protocol || '').toLowerCase();
        const host = (location && location.hostname ? location.hostname.toLowerCase() : '');
        if (proto.startsWith('http') && (host === 'localhost' || host === '127.0.0.1')) {
            setBackendSyncOptIn(true, { silent: true, log: false });
            backendOptIn = true;
            console.log('[Dev] Auto-enabled backend sync for localhost.');
        }
    } catch {}
})();

function setBackendSyncOptIn(enabled, options = {}) {
    const next = !!enabled;
    const prev = backendOptIn;
    backendOptIn = next;
    try { localStorage.setItem('sm_backend_opt_in', next ? '1' : '0'); } catch {}
    if (typeof window !== 'undefined') window.__SM_BACKEND_BLOCKED = next ? false : true;
    if (next) {
        try { localStorage.removeItem(BACKEND_BLOCK_KEY); } catch {}
    } else {
        try { localStorage.setItem(BACKEND_BLOCK_KEY, '1'); } catch {}
    }
    if (prev !== next && options.log !== false) {
        console.log(`Backend sync ${next ? 'enabled' : 'disabled'}.`);
    }
    if (prev !== next && !options.silent) {
    const message = options.message || (next ? 'Server sync enabled.' : 'Server sync disabled.');
        const variant = options.variant || (next ? 'toast-success' : 'toast-error');
        try { showBackendSyncToast(message, variant); } catch {}
    }
}

function showBackendSyncToast(message, variant = '') {
    if (typeof document === 'undefined') return;
    const styleId = 'backend-sync-toast-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
.backend-sync-toast {
  position: fixed;
  left: 50%;
  top: 80px;
  transform: translateX(-50%);
  padding: 10px 18px;
  background: rgba(15, 15, 25, 0.92);
  color: #f5f5f5;
  font-family: inherit;
  font-size: 14px;
  border-radius: 12px;
  z-index: 9999;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  opacity: 0;
  animation: backendSyncToastFade 2.7s ease forwards;
  pointer-events: none;
}
.backend-sync-toast.toast-error {
  background: rgba(140, 35, 35, 0.92);
}
.backend-sync-toast.toast-success {
  background: rgba(20, 120, 55, 0.92);
}
@keyframes backendSyncToastFade {
  0% { opacity: 0; transform: translate(-50%, -10px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 10px); }
}
        `;
        document.head.appendChild(style);
    }
    const el = document.createElement('div');
    el.className = `backend-sync-toast${variant ? ` ${variant}` : ''}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2700);
}

function disableBackendSyncAfterForbidden(sourceMessage) {
    const message = sourceMessage || 'Server sync encountered a 403 error.';
    console.warn(message);
    showBackendSyncToast(message, 'toast-error');
}

if (typeof window !== 'undefined') {
    window.enableOnlineSync = () => setBackendSyncOptIn(true);
    window.disableOnlineSync = () => setBackendSyncOptIn(false);
}
function spawnRunnyDayStorm(count = 40, spacingMs = 150) {
    if (runnyStormActive) return;
    runnyStormActive = true;
    // Show storm cloud like normal storm
    let cloud = document.getElementById('storm-cloud');
    if (!cloud) {
        cloud = document.createElement('div');
        cloud.id = 'storm-cloud';
        document.body.appendChild(cloud);
    }
    cloud.classList.add('active');
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            createFallingScrapBarrel();
            if (i === count - 1) {
                setTimeout(() => {
                    runnyStormActive = false;
                    // Hide cloud shortly after last drop
                    try { cloud.classList.remove('active'); } catch {}
                }, 1000);
            }
        }, i * spacingMs);
    }
}

function updateInventoryUI() {
    if (inventoryCountEl) inventoryCountEl.textContent = String(inventory.length);
    if (!inventoryGrid) return;
    inventoryGrid.innerHTML = '';
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
        const slotItem = inventory[i] || null;
        const card = document.createElement('div');
        card.className = 'inventory-card' + (slotItem ? '' : ' empty');
        if (slotItem) {
            const hint = document.createElement('div');
            hint.className = 'hint-badge';
            hint.title = 'Info';
            hint.addEventListener('click', (e) => { e.stopPropagation(); openItemHint(slotItem); });
            card.appendChild(hint);

            // Name
            const name = document.createElement('div');
            name.className = 'inventory-name';
            name.textContent = slotItem.name || slotItem.id;
            card.appendChild(name);

            // Rarity
            const rarityEl = document.createElement('div');
            rarityEl.className = 'inventory-rarity ' + (slotItem.rarity ? `rar-${(slotItem.rarity + '').toLowerCase()}` : '');
            rarityEl.textContent = slotItem.rarity || 'Unknown';
            card.appendChild(rarityEl);

            // Purchase price
            const priceEl = document.createElement('div');
            priceEl.className = 'inventory-price';
            if (typeof slotItem.price === 'number') priceEl.textContent = `Price: ${slotItem.price}`;
            else priceEl.textContent = 'Price: —';
            card.appendChild(priceEl);

            const actions = document.createElement('div');
            actions.className = 'inventory-actions';
            // Use button (only for usable items)
            if (isUsableItem(slotItem)) {
                const useBtn = document.createElement('button');
                useBtn.textContent = 'Use';
                useBtn.addEventListener('click', () => { useInventoryItem(i); });
                actions.appendChild(useBtn);
            }
            const dropBtn = document.createElement('button');
            dropBtn.textContent = 'Drop';
            dropBtn.addEventListener('click', () => { removeFromInventory(i); });
            actions.appendChild(dropBtn);
            card.appendChild(actions);
        } else {
            const name = document.createElement('div');
            name.className = 'inventory-name';
            name.textContent = 'Empty';
            card.appendChild(name);
        }
        inventoryGrid.appendChild(card);
    }
}

function removeFromInventory(index) {
    if (index < 0 || index >= inventory.length) return;
        inventory.splice(index, 1); 
        try { requestSyncLeaderboard(); } catch {}
    updateInventoryUI();
    try { saveSystem.saveGame(); } catch {}
    try { syncPlayerToServer(); } catch {}
}

function addToInventory(item) {
    if (inventory.length >= INVENTORY_SLOTS) return false;
    inventory.push({ id: item.id, name: item.name, rarity: item.rarity, price: item.price });
    updateInventoryUI();
    try { saveSystem.saveGame(); } catch {}
    try { syncPlayerToServer(); } catch {}
    return true;
}

function useInventoryItem(index) {
    const it = inventory[index];
    if (!it) return;
    // Enforce one-item-at-a-time: block if any timed boost active or Runny Day storm active
    try {
        const now = Date.now();
        const anyActiveBoost = activeBoosts && activeBoosts.some(b => b && b.untilTs > now);
        if (anyActiveBoost || runnyStormActive) {
            alert('You can only use one item at a time. Wait for the current effect to finish.');
            return;
        }
    } catch {}
    const id = (it.id || '').toLowerCase();
    const name = (it.name || '').toLowerCase();
    const isLowCooldown = (id === 'low_cooldown' || name === 'low cooldown');
    const isSunnyDay = (id === 'sunny_day' || name === 'sunny day');
    const isRunnyDay = (id === 'runny_day' || name === 'runny day');
    const isRealAuto = (id === 'real_autoclicker' || name === 'real auto clicker' || name === 'real autoclicker');
    const isTripleDrops = (id === 'triple_drops' || name === 'triple drops');
    const isBoostTokens = (id === 'boost_master_tokens' || name === 'boost master tokens');
    if (isLowCooldown) {
        // Apply boost: cooldown fixed to 1.00s for 60s
        addBoost({ id: 'low_cooldown', name: 'Low Cooldown', untilTs: Date.now() + 60000 });
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else if (isSunnyDay) {
        // Start Sunny Day: random barrel every 1s; treat current barrel as max level; lasts 120s; cancel on refresh
        const until = Date.now() + 120000;
        addBoost({ id: 'sunny_day', name: 'Sunny Day', untilTs: until });
        // Start effect logic
        startSunnyDay();
        setTimeout(() => { stopSunnyDay(); }, 120000);
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else if (isRunnyDay) {
        // Trigger scrap/barrel storm: 40 drops, each pickup = +150 Scrap
        spawnRunnyDayStorm(40, 150);
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else if (isRealAuto) {
        // Start 60s real auto clicker: clicks only when cooldown is ready
        const until = Date.now() + 60000;
        addBoost({ id: 'real_autoclicker', name: 'Real Auto clicker', untilTs: until });
        startRealAutoClicker();
        setTimeout(() => { stopRealAutoClicker(); }, 60000);
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else if (isTripleDrops) {
        // Triple Drops: for 5 minutes, all falling pickups grant 3x rewards
        const until = Date.now() + 300000; // 5 minutes
        addBoost({ id: 'triple_drops', name: 'Triple Drops', untilTs: until });
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else if (isBoostTokens) {
        // Boost Master Tokens: for 10 minutes, Master Token gains on collect are x5
        const until = Date.now() + 600000; // 10 minutes
        addBoost({ id: 'boost_master_tokens', name: 'Boost Master Tokens', untilTs: until });
        // Consume item
        removeFromInventory(index);
        try { saveSystem.saveGame(); } catch {}
        try { syncPlayerToServer(); } catch {}
    } else {
        // Not usable – optionally show hint
        openItemHint(it);
    }
}

async function claimUsernameOnServer(username) {
    if (!isBackendAvailable()) return;
    if (!username) return;
    const payload = { username, clientId: getClientId() };
    try {
        const res = await fetch('/api/player/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok) {
            console.warn(`[Claim] POST /api/player/claim failed ${res.status}:`, data);
            if (res.status === 403) {
                disableBackendSyncAfterForbidden('Server sync encountered a 403 during nickname claim.');
                if (data && data.antiCheat) {
                    alert(data.message || 'Access Denied. Do not attempt to enter commands in the console or it will result in your account being banned.');
                    return;
                }
                if (data && data.banned) {
                    window.__SM_BANNED = true;
                    showBanOverlay(data.message || 'You have been banned for not following the game rules (which do not exist). Please do not play unfairly.');
                    return;
                }
                console.warn('Leaderboard/claim backend rejected with 403. Disabling further sync attempts.');
                return;
            }
            if (data && data.error === 'name-taken') {
                alert('Nickname is taken. Choose another.');
                try { localStorage.removeItem('sm_username'); } catch {}
                try { localStorage.removeItem('sm_username_manual'); } catch {}
                if (typeof chatNameWindow !== 'undefined' && chatNameWindow) chatNameWindow.classList.remove('hidden');
                if (typeof chatNameInput !== 'undefined' && chatNameInput) { chatNameInput.value = ''; setTimeout(() => chatNameInput.focus(), 0); }
                return;
            }
            return; // silent on other errors
        }
        // If server returned inventory for this username, adopt it locally
        if (data && Array.isArray(data.inventory)) {
            inventory = data.inventory.slice(0, INVENTORY_SLOTS).map(it => ({ id: it.id, name: it.name, rarity: it.rarity, price: it.price }));
            updateInventoryUI();
            try { saveSystem.saveGame(); } catch {}
        }
        // Ensure server has the latest local state too
        await syncPlayerToServer();
    } catch {
        // offline or server unreachable – ignore
    }
}

// Manual refresh of inventory from server's saved state
async function reloadInventoryFromServer() {
    if (!isBackendAvailable()) {
    alert('Server sync is currently disabled. Enable it to fetch data from server.');
        return;
    }
    const proto = (location && location.protocol || '').toLowerCase();
    if (proto === 'file:') { alert('No server connection (file:// mode).'); return; }
    const username = getStoredNick();
    if (!username) { alert('Set your chat nickname first.'); return; }
    try {
        const res = await fetch('/api/player/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, clientId: getClientId() })
        });
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok) {
            if (res.status === 403) {
                disableBackendSyncAfterForbidden('Server sync disabled after inventory refresh attempt (403).');
                if (data && data.antiCheat) {
                    alert(data.message || 'Access Denied. Do not attempt to enter commands in the console or it will result in your account being banned.');
                    return;
                }
                if (data && data.banned) {
                    window.__SM_BANNED = true;
                    showBanOverlay(data.message || 'You have been banned for not following the game rules (which do not exist). Please do not play unfairly.');
                    return;
                }
            }
            if (data && data.error === 'name-taken') {
                alert('Nickname is taken on another device.');
                return;
            }
            throw new Error('HTTP ' + res.status);
        }
        if (data && Array.isArray(data.inventory)) {
            inventory = data.inventory.slice(0, INVENTORY_SLOTS).map(it => ({ id: it.id, name: it.name, rarity: it.rarity, price: it.price }));
            updateInventoryUI();
            try { saveSystem.saveGame(); } catch {}
            try { await syncPlayerToServer(); } catch {}
        }
    } catch (e) {
    alert('Failed to refresh inventory.');
    }
}

// Simple centered overlay shown when player is banned
function showBanOverlay(message) {
    try {
        if (document.getElementById('sm-ban-overlay')) return; // already shown
        const overlay = document.createElement('div');
        overlay.id = 'sm-ban-overlay';
        overlay.className = 'ban-overlay';
        const box = document.createElement('div');
        box.className = 'ban-overlay-box';
        const title = document.createElement('div');
        title.className = 'ban-overlay-title';
        title.textContent = 'Access Restricted';
        const msg = document.createElement('div');
        msg.className = 'ban-overlay-message';
        msg.textContent = message || 'You have been banned for not following the game rules (which do not exist). Please do not play unfairly.';
        box.appendChild(title);
        box.appendChild(msg);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    } catch {}
}

function openInventory() {
    if (!inventoryWindow) return;
    inventoryWindow.classList.remove('hidden');
    inventoryWindow.classList.add('active');
}
function closeInventoryWindow() {
    if (!inventoryWindow) return;
    inventoryWindow.classList.add('hidden');
    inventoryWindow.classList.remove('active');
}

function openItemHint(item) {
    if (!itemhintWindow) return;
    if (!itemHints) {
        fetch('itemshint.json', { cache: 'no-cache' })
            .then(r => r.ok ? r.json() : {})
            .then(data => { itemHints = data || {}; showHintNow(item); })
            .catch(() => { itemHints = {}; showHintNow(item); });
    } else {
        showHintNow(item);
    }
}
function showHintNow(item) {
    const id = item && item.id;
    const text = (itemHints && itemHints[id]) || 'No description available.';
    if (itemhintTitle) itemhintTitle.textContent = item.name || id;
    if (itemhintText) itemhintText.textContent = text;
    itemhintWindow.classList.remove('hidden');
    itemhintWindow.classList.add('active');
}
function closeItemHintWindow() {
    if (!itemhintWindow) return;
    itemhintWindow.classList.add('hidden');
    itemhintWindow.classList.remove('active');
}


const UPGRADE_UNLOCK = 10;

// Inicjalizacja - settings (upgrade) button widoczny od razu
upgradeBtn.style.display = "block";
bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);  // Ukryj książkę na starcie
starBtn.style.display = "none";         // Gwiazda ukryta na starcie
mysteryBookContainer.classList.add('hidden'); // Ukryj mystery book na starcie
treeContainer.classList.add('hidden'); // Ukryj tree na starcie
const itemshopBtn = document.getElementById('itemshop-btn');
if (itemshopBtn) itemshopBtn.classList.add('hidden'); // ukryj itemshop na starcie

// ===== Global Chat (unlocked after 1 Rebirth) =====
const chatContainer = document.getElementById('chat-container');
const chatBtn = document.getElementById('earth-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatStatus = document.getElementById('chat-status');
const closeChat = document.getElementById('close-chat');
const chatHeader = (function(){ try { return document.querySelector('#chat-window .chat-header'); } catch { return null; } })();
const chatMinimizeBtn = document.getElementById('chat-minimize');
// Nickname modal elements
const chatNameWindow = document.getElementById('chat-name-window');
const chatNameInput = document.getElementById('chat-name-input');
const chatNameSave = document.getElementById('chat-name-save');
const closeChatName = document.getElementById('close-chat-name');

// === Chat moderation state ===
const CHAT_MUTE_KEYS = { until: 'sm_chat_mute_until', offenses: 'sm_chat_offenses', badwords: 'sm_chat_badwords' };
let chatMuteTimer = null;

function getMuteUntil() {
    try { return Number(localStorage.getItem(CHAT_MUTE_KEYS.until)) || 0; } catch { return 0; }
}
function setMuteUntil(ts) {
    try { localStorage.setItem(CHAT_MUTE_KEYS.until, String(ts||0)); } catch {}
}
function getOffenses() {
    try { return Number(localStorage.getItem(CHAT_MUTE_KEYS.offenses)) || 0; } catch { return 0; }
}
function setOffenses(n) {
    try { localStorage.setItem(CHAT_MUTE_KEYS.offenses, String(n||0)); } catch {}
}
function getBadwordList() {
    try {
        const raw = localStorage.getItem(CHAT_MUTE_KEYS.badwords);
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return arr.filter(x => typeof x === 'string' && x.trim()).map(x => x.toLowerCase());
        }
    } catch {}
    // Default empty for safety; configure via window.setChatBadwords([...])
    return [];
}
// Admin helper to set badword list at runtime: window.setChatBadwords(['...','...'])
window.setChatBadwords = function(list) {
    if (!Array.isArray(list)) return false;
    try { localStorage.setItem(CHAT_MUTE_KEYS.badwords, JSON.stringify(list)); return true; } catch { return false; }
};

// Attempt to load external Mute.json once per session
(function loadMuteJson(){
    try {
        // If already configured, skip
        const existing = localStorage.getItem(CHAT_MUTE_KEYS.badwords);
        if (existing) return;
        // Avoid CORS errors when opened via file://; only fetch on http/https
        const proto = (location && location.protocol || '').toLowerCase();
        if (proto === 'http:' || proto === 'https:') {
            fetch('Mute.json', { cache: 'no-cache' })
                .then(r => r.ok ? r.json() : null)
                .then(list => { if (Array.isArray(list) && list.length) { window.setChatBadwords(list); } })
                .catch(() => {});
        }
    } catch {}
})();

function normalizeForModeration(text) {
    if (!text) return '';
    let s = String(text).toLowerCase();
    try { s = s.normalize('NFD').replace(/\p{Diacritic}+/gu, ''); } catch { try { s = s.normalize('NFD').replace(/[\u0300-\u036f]+/g, ''); } catch {} }
    // simple leet replacements
    const map = { '0':'o','1':'i','!':'i','3':'e','4':'a','@':'a','5':'s','$':'s','7':'t','9':'g' };
    s = s.replace(/[0!134@579$]/g, c => map[c] || c);
    // remove separators/spaces
    try { s = s.replace(/[^\p{L}\p{N}]+/gu, ''); } catch { s = s.replace(/[^a-z0-9]+/g, ''); }
    return s;
}

function messageIsFlagged(text) {
    const list = getBadwordList();
    if (!list.length) return false;
    const norm = normalizeForModeration(text);
    for (const w of list) {
        const n = normalizeForModeration(w);
        if (!n) continue;
        if (norm.includes(n)) return true;
    }
    return false;
}

function isMuted() {
    return Date.now() < getMuteUntil();
}

function formatMs(ms) {
    const total = Math.max(0, Math.floor(ms/1000));
    const h = Math.floor(total/3600);
    const m = Math.floor((total%3600)/60);
    const s = total%60;
    const pad = (n) => String(n).padStart(2,'0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function ensureChatMuteOverlay() {
    if (!chatWindow) return null;
    let overlay = chatWindow.querySelector('.chat-muted-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'chat-muted-overlay';
    overlay.innerHTML = `<div class="mute-box"><div class="mute-title">Global Chat muted</div><div class="mute-sub">Rule violation. Remaining: <span class="mute-countdown">--:--</span></div></div>`;
        chatWindow.appendChild(overlay);
    }
    return overlay;
}

function applyMuteStateUI() {
    const muted = isMuted();
    const overlay = ensureChatMuteOverlay();
    if (muted) {
        chatWindow?.classList.add('muted');
        if (overlay) overlay.style.display = 'flex';
        if (chatSend) chatSend.disabled = true;
        if (chatInput) { chatInput.disabled = true; chatInput.value = ''; }
        startMuteCountdown();
    } else {
        chatWindow?.classList.remove('muted');
        if (overlay) overlay.style.display = 'none';
        if (chatInput) chatInput.disabled = false;
        if (chatSend) setChatConnected(chatSocket && chatSocket.readyState === 1);
        stopMuteCountdown();
    }
}

function startMuteCountdown() {
    stopMuteCountdown();
    const until = getMuteUntil();
    const overlay = ensureChatMuteOverlay();
    const span = overlay ? overlay.querySelector('.mute-countdown') : null;
    const tick = () => {
        const left = until - Date.now();
        if (span) span.textContent = formatMs(left);
        if (left <= 0) {
            setMuteUntil(0);
            applyMuteStateUI();
        }
    };
    tick();
    chatMuteTimer = setInterval(tick, 1000);
}
function stopMuteCountdown() {
    if (chatMuteTimer) { clearInterval(chatMuteTimer); chatMuteTimer = null; }
}

function handleModerationOffense() {
    let offenses = getOffenses();
    offenses += 1;
    setOffenses(offenses);
    if (offenses === 1) {
        setMuteUntil(Date.now() + 30 * 60 * 1000); // 30 minutes
        applyMuteStateUI();
    appendChatLine({ text: 'Rule violation: chat muted for 30 minutes.', system: true });
    } else if (offenses === 2) {
        setMuteUntil(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        applyMuteStateUI();
    appendChatLine({ text: 'Second violation: chat muted for 2 hours.', system: true });
    } else {
        try { localStorage.clear(); } catch {}
    alert('Third violation: localStorage cleared.');
        // hard reload to apply wipe
        try { location.reload(); } catch {}
    }
}

let chatSocket = null;
let chatReconnectTimer = null;
let chatSending = false; // prevents double send on click+enter

let hasWarnedMissingNickname = false;

// Stable client identifier to bind username ownership on the server
function getClientId() {
    try {
        let id = localStorage.getItem('sm_client_id');
        if (!id) {
            id = Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('sm_client_id', id);
        }
        return id;
    } catch {
        return 'client_' + Math.random().toString(36).slice(2);
    }
}

function getStoredNick() {
    try { return localStorage.getItem('sm_username') || ''; } catch { return ''; }
}
function setStoredNick(nick, opts = {}) {
    const value = String(nick).slice(0, 20);
    const auto = !!opts.auto;
    try {
        localStorage.setItem('sm_username', value);
        localStorage.setItem('sm_username_manual', auto ? '0' : '1');
    } catch {}
    if (!auto) {
        try { claimUsernameOnServer(value); } catch {}
        try { requestSyncLeaderboard(0); } catch {}
    }
}

function resolveActiveUsername(options = {}) {
    const allowAuto = options.allowAuto === true;
    let username = getStoredNick();
    let manualFlag = null;
    try { manualFlag = localStorage.getItem('sm_username_manual'); } catch {}
    const looksManual = !!(username && !/^player-/i.test(username));
    if (username && manualFlag === null) {
        const inferred = looksManual ? '1' : '0';
        try { localStorage.setItem('sm_username_manual', inferred); manualFlag = inferred; } catch {}
    }
    const manual = manualFlag === '1';
    if (!username || !username.trim()) {
        return { username: '', manual: false };
    }
    if (!manual && !allowAuto) {
        return { username: '', manual: false };
    }
    return { username, manual };
}
function ensureNickname() {
    const { username, manual } = resolveActiveUsername({ allowAuto: false });
    if (!username || !manual) {
        // show modal
        if (chatNameWindow) chatNameWindow.classList.remove('hidden');
        if (chatNameInput) { chatNameInput.value = ''; setTimeout(() => chatNameInput.focus(), 0); }
        return false;
    }
    return true;
}

function updateChatUnlockUI() {
    // Make the container and chat icon always visible
    if (!chatContainer) return;
    try { chatContainer.classList.remove('hidden'); } catch {}
    const earth = document.getElementById('earth-btn');
    if (earth) earth.style.display = '';
    // Ensure leaderboard is always visible from rebirth 0
    const lb = document.getElementById('leaderboard-btn');
    if (lb) lb.style.display = '';
    // Keep itemshop and inventory gated by rebirths (>=6)
    const inv = document.getElementById('inventory-btn');
    const shop = document.getElementById('itemshop-btn');
    if (inv) inv.classList.toggle('hidden', rebirthCount < 6);
    if (shop) shop.classList.toggle('hidden', rebirthCount < 6);
}

function openChatWindow() {
    if (!chatWindow) return;
    if (!ensureNickname()) return; // ask for nickname first
    chatWindow.classList.remove('hidden');
    chatWindow.classList.add('active');
    if (!chatSocket || chatSocket.readyState !== 1) connectChat();
    chatInput?.focus();
    applyMuteStateUI();
}
function closeChatWindow() { if (!chatWindow) return; chatWindow.classList.add('hidden'); chatWindow.classList.remove('active'); }

function appendChatLine({ from = 'System', text = '', time = Date.now(), system = false } = {}) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = system ? 'chat-msg system' : 'chat-msg';
    const timeStr = new Date(time).toLocaleTimeString();
    div.innerHTML = system
        ? `<span class="from">[System]</span> ${escapeHtml(text)} <span class="time">${timeStr}</span>`
        : `<span class="from">${escapeHtml(from)}:</span> ${escapeHtml(text)} <span class="time">${timeStr}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatConnected(connected) {
    if (chatStatus) {
        chatStatus.textContent = connected ? 'Connected' : 'Disconnected';
        chatStatus.style.color = connected ? '#27ae60' : 'var(--muted)';
        chatStatus.style.borderColor = connected ? '#27ae60' : 'var(--border)';
    }
    if (chatSend) chatSend.disabled = !connected || !chatInput?.value.trim() || isMuted();
}

function connectChat() {
    if (!window.WebSocket) { appendChatLine({ text: 'WebSocket unsupported in this browser.', system: true }); return; }
    try { if (chatSocket) { chatSocket.close(); chatSocket = null; } } catch {}
    // Build WS URL based on current page origin and protocol (works locally and behind Cloudflare/HTTPS)
    let url;
    try {
        if (typeof window !== 'undefined' && window.SM_WS_URL) {
            // Optional override if provided by inline config
            url = String(window.SM_WS_URL);
        } else {
            const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
            url = `${proto}://${location.host}`; // same host:port as page
        }
    } catch {
        const proto = (typeof location !== 'undefined' && location.protocol === 'https:') ? 'wss' : 'ws';
        url = `${proto}://localhost:3000`;
    }

    // Normalize: if page is HTTPS, always use wss and same host (prevents Mixed Content even if old config forces ws://:3000)
    try {
        if (location.protocol === 'https:') {
            const u = new URL(url, location.origin);
            u.protocol = 'wss:';
            u.host = location.host; // drop custom ports like :3000 on production
            url = u.toString();
        }
    } catch {
        if (location && location.protocol === 'https:') url = `wss://${location.host}`;
    }

    appendChatLine({ text: 'Connecting to chat…', system: true });
    chatSocket = new WebSocket(url);

    chatSocket.addEventListener('open', () => { setChatConnected(true); appendChatLine({ text: 'Connected to Global Chat.', system: true }); });
    chatSocket.addEventListener('message', (ev) => {
        try {
            const msg = JSON.parse(ev.data);
            if (msg && typeof msg.text === 'string') {
                appendChatLine({ from: msg.from || 'Player', text: msg.text, time: msg.time || Date.now() });
            }
        } catch {}
    });
    chatSocket.addEventListener('close', () => {
        setChatConnected(false);
        appendChatLine({ text: 'Disconnected. Reconnecting in 3s…', system: true });
        if (chatReconnectTimer) clearTimeout(chatReconnectTimer);
        chatReconnectTimer = setTimeout(connectChat, 3000);
    });
    chatSocket.addEventListener('error', () => {
        setChatConnected(false);
    });
}

function sendChatMessage() {
    if (chatSending) return; // debounce
    const text = chatInput?.value.trim();
    if (!text || !chatSocket || chatSocket.readyState !== 1) return;
    // Block if muted
    if (isMuted()) { applyMuteStateUI(); return; }
    // Moderate outgoing message
    if (messageIsFlagged(text)) {
        // Clear input and apply offense; do not send
        if (chatInput) chatInput.value = '';
        handleModerationOffense();
        return;
    }
    const from = getStoredNick() || `Player${(rebirthCount||0)}`;
    const payload = { from, text, time: Date.now() };
    chatSending = true;
    try {
        chatSocket.send(JSON.stringify(payload));
        // nie dodajemy lokalnego echo — serwer odsyła broadcast i pokaże jedną wiadomość
        chatInput.value = '';
        setChatConnected(true);
    } catch {
        appendChatLine({ text: 'Failed to send.', system: true });
    } finally {
        setTimeout(() => { chatSending = false; }, 120); // krótki cooldown przeciw podwójnym wysyłkom
    }
}

function escapeHtml(s) {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
    };
    return String(s).replace(/[&<>"']/g, (c) => entities[c] || c);
}

if (chatBtn) chatBtn.addEventListener('click', () => {
    // On click of chat icon: if no nickname -> open modal, else open chat window
    if (!ensureNickname()) return;
    openChatWindow();
});
if (closeChat) closeChat.addEventListener('click', closeChatWindow);
if (chatSend) chatSend.addEventListener('click', sendChatMessage);
if (chatInput) {
    chatInput.addEventListener('input', () => setChatConnected(chatSocket && chatSocket.readyState === 1));
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); } });
}

// Initialize unlock state at start
updateChatUnlockUI();
// Apply mute UI if needed on load
try { applyMuteStateUI(); } catch {}

// (header toggle removed)

// Restore chat position (minimize removed)
(function restoreChatState(){
    if (!chatWindow) return;
    try {
        const pos = JSON.parse(localStorage.getItem('sm_chat_pos')||'null');
        if (pos && typeof pos.left==='number' && typeof pos.top==='number') {
            chatWindow.style.left = `${pos.left}px`;
            chatWindow.style.top = `${pos.top}px`;
            chatWindow.style.right = 'auto';
            chatWindow.style.position = 'fixed';
        }
    } catch {}
})();

// Drag support for chat window (header as handle)
(function enableChatDrag(){
    if (!chatWindow || !chatHeader) return;
    let dragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const getPos = (e) => {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e) => {
        // Ignore drag when clicking header controls
        const t = e.target;
        if (t === chatMinimizeBtn || (t && t.closest && t.closest('.chat-actions'))) return;
        dragging = true;
        const { x, y } = getPos(e);
        startX = x; startY = y;
        const rect = chatWindow.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        e.preventDefault();
    };

    const onMove = (e) => {
        if (!dragging) return;
        const { x, y } = getPos(e);
        let nx = startLeft + (x - startX);
        let ny = startTop + (y - startY);
        // Constrain within viewport
        const vw = window.innerWidth, vh = window.innerHeight;
        const rect = chatWindow.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        nx = Math.min(Math.max(nx, 0), vw - w);
        ny = Math.min(Math.max(ny, 0), vh - h);
        chatWindow.style.left = `${nx}px`;
        chatWindow.style.top = `${ny}px`;
        chatWindow.style.right = 'auto'; // switch to left/top based positioning while dragging
        chatWindow.style.position = 'fixed';
        e.preventDefault();
    };

    const onUp = () => {
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        // Persist position
        try {
            const rect = chatWindow.getBoundingClientRect();
            localStorage.setItem('sm_chat_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        } catch {}
    };

    chatHeader.addEventListener('mousedown', onDown);
    chatHeader.addEventListener('touchstart', onDown, { passive: false });
})();

// Debounced sync helper for leaderboard
let syncLbTimer = null;
function requestSyncLeaderboard(delay = 600) {
    if (!isBackendAvailable()) return;
    if (syncLbTimer) clearTimeout(syncLbTimer);
    syncLbTimer = setTimeout(() => { syncLbTimer = null; syncLeaderboardStats(); }, delay);
}

// Initialize peak tiles from current value
try { setTimeout(() => { peakTiles = Math.max(peakTiles, Number(tiles)||0); }, 0); } catch {}

// Periodic sync every 60s
try { setInterval(syncLeaderboardStats, 60000); } catch {}
try { requestSyncLeaderboard(1200); } catch {}

// Sync on tab hide/exit
try {
    window.addEventListener('beforeunload', () => {
        if (!isBackendAvailable() || window.__SM_BANNED) return;
        try {
            if (navigator.sendBeacon) {
                const payload = {
                    username: getStoredNick(),
                    clientId: getClientId(),
                    inventory: (inventory || []).slice(0, 6),
                    stats: {
                        rebirths: (STATS && STATS.rebirths) || rebirthCount || 0,
                        maxScrap: (STATS && STATS.highestScraps) || 0,
                        maxTires: Math.max(peakTiles, (STATS && STATS.peakTiles) || 0)
                    }
                };
                navigator.sendBeacon('/api/player/sync', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            }
        } catch {}
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') requestSyncLeaderboard(0);
    });
} catch {}

// ===== Leaderboard =====
const leaderboardWindow = document.getElementById('leaderboard-window');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardClose = document.getElementById('close-leaderboard');
const leaderboardTabs = document.querySelectorAll('.lb-tab');

function formatExponent(value) {
    // Display in scientific notation e.g. 1.23e+6
    const n = Number(value)||0;
    if (!isFinite(n)) return '0e+0';
    const exp = n.toExponential(2);
    return exp.replace('e+', 'e');
}

async function fetchLeaderboard(by) {
    if (!isBackendAvailable()) return [];
    try {
        const res = await fetch(`/api/player/leaderboard?by=${encodeURIComponent(by)}`);
        if (!res.ok) {
            const body = await res.text().catch(() => '<no body>');
            console.warn(`[Leaderboard] fetch failed ${res.status}: ${body}`);
            if (res.status === 403) {
                disableBackendSyncAfterForbidden('Server sync encountered a 403 during leaderboard fetch.');
            }
            return [];
        }
        const data = await res.json();
        if (!data || !data.ok) throw new Error('Bad response');
        return Array.isArray(data.top) ? data.top : [];
    } catch {
        return [];
    }
}

function renderLeaderboard(rows, by) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';
    if (!rows.length) {
        const msg = document.createElement('div');
        msg.style.padding = '8px';
        msg.style.color = 'var(--muted)';
    msg.textContent = isBackendAvailable() ? 'No data returned by server.' : 'Server unavailable – offline mode.';
        list.appendChild(msg);
        return;
    }
    const visibleRows = rows.filter(r => r && r.username && !/^player-/i.test(String(r.username)));
    if (!visibleRows.length) {
        const msg = document.createElement('div');
        msg.style.padding = '8px';
        msg.style.color = 'var(--muted)';
        msg.textContent = 'No public entries yet. Set your nickname in Settings › Global Chat to appear.';
        list.appendChild(msg);
        return;
    }
    const hiddenCount = rows.length - visibleRows.length;
    visibleRows.forEach((r, idx) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-row';
        const valStr = by === 'rebirths' ? String(r.value) : formatExponent(r.value);
        div.innerHTML = `<div class="leaderboard-rank">${idx + 1}</div>`+
                        `<div class="leaderboard-name">${escapeHtml(r.username)}</div>`+
                        `<div class="leaderboard-value">${valStr}</div>`;
        list.appendChild(div);
    });
    if (hiddenCount > 0) {
        const note = document.createElement('div');
        note.className = 'leaderboard-note extra';
        note.textContent = 'Some entries are hidden until players set a custom nickname.';
        list.appendChild(note);
    }
}

async function openLeaderboard(defaultTab = 'rebirths') {
    const win = document.getElementById('leaderboard-window');
    if (!win) return;
    win.classList.remove('hidden');
    win.classList.add('active');
    // Bind close button
    const closeBtn = document.getElementById('close-leaderboard');
    if (closeBtn && !closeBtn._smBound) { closeBtn.addEventListener('click', closeLeaderboard); closeBtn._smBound = true; }
    // Bind tab buttons
    document.querySelectorAll('.lb-tab').forEach(btn => {
        if (!btn._smBound) { btn.addEventListener('click', () => switchLeaderboardTab(btn.dataset.tab)); btn._smBound = true; }
    });
    // Push latest stats before fetching leaderboard so it reflects current session
    try { await syncLeaderboardStats(); } catch {}
    await switchLeaderboardTab(defaultTab);
}
function closeLeaderboard() {
    const win = document.getElementById('leaderboard-window');
    if (!win) return;
    win.classList.add('hidden');
    win.classList.remove('active');
}

async function switchLeaderboardTab(tabKey) {
    document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabKey));
    const rows = await fetchLeaderboard(tabKey);
    renderLeaderboard(rows, tabKey);
}

if (leaderboardBtn) {
    const openLb = () => openLeaderboard('rebirths');
    leaderboardBtn.addEventListener('click', openLb);
    leaderboardBtn.addEventListener('mousedown', (e) => { e.preventDefault(); openLb(); });
    leaderboardBtn.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} openLb(); }, { passive: false });
} else {
    // In case DOM loaded later, bind after DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('leaderboard-btn');
        if (!btn) return;
        const openLb = () => openLeaderboard('rebirths');
        btn.addEventListener('click', openLb);
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); openLb(); });
        btn.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} openLb(); }, { passive: false });
    });
}
if (leaderboardClose) leaderboardClose.addEventListener('click', closeLeaderboard);

// Expose for inline fallback usage from HTML
try {
    window.openLeaderboard = openLeaderboard;
    window.closeLeaderboard = closeLeaderboard;
} catch {}

// Track and sync leaderboard stats
let peakTiles = 0; // highest Tires value ever seen this session
function updatePeaksAfterTilesChange() {
    peakTiles = Math.max(peakTiles, Number(tiles)||0);
}
function updatePeaksAfterScrapChange() {
    if (!STATS) return; // STATS.highestScraps tracks max scrap including deltas
    // nothing additional needed; highestScraps updated via grantScrap() elsewhere
}

async function syncLeaderboardStats() {
    if (!isBackendAvailable()) return;
    const { username } = resolveActiveUsername({ allowAuto: false });
    if (!username) {
        if (!hasWarnedMissingNickname) {
            console.debug('[Sync] Skipping leaderboard sync because nickname is not set manually.');
        }
        hasWarnedMissingNickname = true;
        return;
    }
    hasWarnedMissingNickname = false;
    const payload = {
        username,
        clientId: getClientId(),
        inventory: Array.isArray(inventory) ? inventory.slice(0, 6) : [],
        stats: {
            rebirths: (STATS && STATS.rebirths) || rebirthCount || 0,
            maxScrap: (STATS && STATS.highestScraps) || 0,
            maxTires: Math.max(peakTiles, (STATS && STATS.peakTiles) || 0)
        }
    };
    try {
        const res = await fetch('/api/player/sync', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '<no body>');
            console.warn(`[Sync] POST /api/player/sync failed ${res.status}: ${body}`);
            if (res.status === 403) disableBackendSyncAfterForbidden('Server sync encountered a 403 during stat sync.');
        }
    } catch {}
}


// Nickname modal events
if (chatNameSave) {
    chatNameSave.addEventListener('click', (e) => {
        e.preventDefault();
        const val = (chatNameInput?.value || '').trim().slice(0,20);
        if (!val) { chatNameInput?.focus(); return; }
    setStoredNick(val, { auto: false });
        if (chatNameWindow) chatNameWindow.classList.add('hidden');
        // if chat is open and socket not connected yet, connect now
        if (chatWindow && chatWindow.classList.contains('active') && (!chatSocket || chatSocket.readyState !== 1)) {
            connectChat();
        }
    });
}
if (closeChatName) {
    closeChatName.addEventListener('click', () => {
        if (chatNameWindow) chatNameWindow.classList.add('hidden');
    });
}
// Close nickname modal when clicking on overlay outside the content
if (chatNameWindow) {
    chatNameWindow.addEventListener('click', (e) => {
        if (e.target === chatNameWindow) {
            chatNameWindow.classList.add('hidden');
        }
    });
}
if (chatNameInput) {
    chatNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            chatNameSave?.click();
        }
    });
}

// ========= Stats system =========
// Tracks gameplay statistics across sessions (persisted in localStorage)
const STATS_STORAGE_KEY = 'sm_stats';
let STATS = null;

function pad(n, w = 2) { n = String(n); return n.length >= w ? n : '0'.repeat(w - n.length) + n; }
function formatDateDetailed(d) {
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);
    return `${Y}.${M}.${D}.${h}.${m}.${s}.${ms}`;
}
function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = pad(Math.floor(totalSec / 3600));
    const m = pad(Math.floor((totalSec % 3600) / 60));
    const s = pad(totalSec % 60);
    return `${h}:${m}:${s}`;
}
function loadStats() {
    const now = Date.now();
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    let base = {
        version: 1,
        firstLaunchAt: now,
        lastSeenAt: now,
        totalPlaytimeMs: 0,
        sessionsStarted: 0,
        clicks: { total: 0, session: 0 },
        bestClickYield: 0,
        totalScrapEarned: 0,
        sessionScrapEarned: 0,
        scrapSpent: 0,
    highestScraps: 0,
    peakTiles: 0,
        tiresSpawned: 0,
        tiresCollected: 0,
        tilesEarned: 0,
        tilesSpent: 0,
        bricksBought: 0,
        masterTokensSpent: 0,
        upgradesBought: 0,
        blueUpgradesBought: 0,
        autoClicks: 0,
        autoClicksSession: 0,
        scrapyardTicks: 0,
        scrapyardOwnedSeconds: 0,
        stormsOccurred: 0,
        rebirths: 0,
        lastRebirthAt: null,
        longestSessionMs: 0
    };
    if (raw) {
        try { base = Object.assign(base, JSON.parse(raw)); } catch (e) {}
    }
    base.sessionsStarted += 1;
    base.sessionStartAt = now;
    base.sessionPlaytimeMs = 0;
    return base;
}
function saveStats() {
    if (!STATS) return;
    try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(STATS));
    } catch (e) {}
}
function bumpHighestScraps(delta = 0) {
    if (typeof scraps === 'number') {
        STATS.highestScraps = Math.max(STATS.highestScraps, scraps + (delta || 0));
    }
}
function bumpBestClick(yieldAmount) {
    if (!STATS) return;
    if (typeof yieldAmount !== 'number' || !isFinite(yieldAmount)) return;
    STATS.bestClickYield = Math.max(STATS.bestClickYield || 0, yieldAmount);
}
// Periodically update playtime and save
setInterval(() => {
    if (!STATS) return;
    const now = Date.now();
    STATS.sessionPlaytimeMs = now - STATS.sessionStartAt;
    STATS.lastSeenAt = now;
    // light autosave of stats every 15s
    if ((now / 1000) % 15 < 1) saveStats();
}, 1000);

window.addEventListener('beforeunload', () => {
    if (!STATS) return;
    const now = Date.now();
    STATS.sessionPlaytimeMs = now - STATS.sessionStartAt;
    STATS.totalPlaytimeMs += STATS.sessionPlaytimeMs;
    STATS.longestSessionMs = Math.max(STATS.longestSessionMs || 0, STATS.sessionPlaytimeMs);
    STATS.lastSeenAt = now;
    saveStats();
});

// -----------------------
// Item Shop (client side)
// -----------------------
(function initItemShop(){
    if (!itemshopBtn) return;
    function openShop(){
        if (!itemshopWindow) return;
        itemshopWindow.classList.remove('hidden');
        itemshopWindow.classList.add('active');
        refreshShop();
    }
    function closeShop(){
        if (!itemshopWindow) return;
        itemshopWindow.classList.add('hidden');
        itemshopWindow.classList.remove('active');
    }
    itemshopBtn.addEventListener('click', openShop);
    itemshopBtn.addEventListener('mousedown', (e) => { e.preventDefault(); openShop(); });
    itemshopBtn.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} openShop(); }, { passive: false });
    // expose for external/fallback triggers
    try { window.openItemShop = openShop; window.refreshItemShop = refreshShop; window.closeItemShop = closeShop; } catch {}
    if (closeItemshop) closeItemshop.addEventListener('click', closeShop);
    if (itemshopWindow) {
        // click outside content to close
        itemshopWindow.addEventListener('click', (e) => {
            if (e.target === itemshopWindow) closeShop();
        });
    }

    let countdownInterval = null;
    function startCountdown(nextTs, serverTime){
        if (!itemshopTimerEl) return;
        if (countdownInterval) clearInterval(countdownInterval);
        const offset = Date.now() - (serverTime || Date.now());
        function tick(){
            const now = Date.now() - offset;
            let ms = Math.max(0, nextTs - now);
            const h = Math.floor(ms / 3600000); ms -= h*3600000;
            const m = Math.floor(ms / 60000); ms -= m*60000;
            const s = Math.floor(ms / 1000);
            if (itemshopTimerEl)
                itemshopTimerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (h===0 && m===0 && s===0) {
                clearInterval(countdownInterval);
                refreshShop();
            }
        }
        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    async function refreshShop(){
        if (!itemshopGrid) return;
        const proto = (location && location.protocol || '').toLowerCase();
        if (proto === 'file:') {
            itemshopGrid.innerHTML = '<div style="grid-column: 1/-1; color: #bbb;">Run server to use Item Shop.</div>';
            return;
        }
        try {
            const res = await fetch('/api/shop', { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP '+res.status);
            const data = await res.json();
            renderShop(Array.isArray(data.items) ? data.items : []);
            if (data.nextRestock) startCountdown(data.nextRestock, data.serverTime);
        } catch (e) {
            itemshopGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f66;">Shop error: ${e.message}</div>`;
        }
    }

    function rarityClass(r){ return 'rarity-'+(r||'Common'); }
    function renderShop(items){
        if (!Array.isArray(items) || !items.length) {
            itemshopGrid.innerHTML = '<div style="grid-column: 1/-1; color: #bbb;">No items.</div>';
            return;
        }
        itemshopGrid.innerHTML = '';
        for (const it of items) {
            const card = document.createElement('div');
            card.className = 'itemshop-card';
            card.innerHTML = `
                <div class="hint-badge" title="Info"></div>
                <div class="itemshop-name">${it.name}</div>
                <div class="itemshop-rarity ${rarityClass(it.rarity)}">${it.rarity}</div>
                <div class="itemshop-price">Price: ${Number(it.price||0).toLocaleString()}</div>
                <button class="itemshop-buy" data-slot="${it.slot}" ${it.stock<=0?'disabled':''}>Buy</button>
            `;
            // bind hint badge
            const h = card.querySelector('.hint-badge');
            if (h) h.addEventListener('click', () => openItemHint(it));
            // enrich buy button with price/id metadata
            const buyBtn = card.querySelector('.itemshop-buy');
            if (buyBtn) {
                buyBtn.setAttribute('data-id', String(it.id||''));
                buyBtn.setAttribute('data-price', String(Number(it.price||0)));
            }
            itemshopGrid.appendChild(card);
        }
        itemshopGrid.querySelectorAll('.itemshop-buy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const el = e.currentTarget;
                const slot = Number(el.getAttribute('data-slot'));
                const price = Number(el.getAttribute('data-price') || '0');
                // Inventory capacity check
                if (inventory.length >= INVENTORY_SLOTS) {
                    alert('Your inventory is full (6/6). You cannot buy this item.');
                    return;
                }
                // Afford check with Scrap
                if (typeof scraps === 'number' && price > 0 && scraps < price) {
                    alert(`Not enough Scrap. You need ${price.toLocaleString()} Scrap.`);
                    return;
                }
                el.disabled = true;
                try {
                    const res = await fetch('/api/shop/buy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slot })
                    });
                    const data = await res.json();
                    if (!res.ok || !data || data.ok !== true) throw new Error((data && data.error) || 'Buy failed');
                    // Add purchased item to inventory (non-stacking)
                    if (data.item) {
                        const ok = addToInventory(data.item);
                        if (!ok) alert('Your inventory is full. Item not added.');
                    }
                    // Deduct Scrap on success
                    if (typeof scraps === 'number' && price > 0) {
                        scraps -= price;
                        if (scraps < 0) scraps = 0;
                        if (typeof updateScrapCounter === 'function') updateScrapCounter();
                        try { if (window.STATS) STATS.scrapSpent = (STATS.scrapSpent||0) + price; } catch {}
                    }
                    // Disable buy after successful purchase (single-stock per restock)
                    el.disabled = true;
                } catch (err) {
                    alert('Purchase failed: '+(err.message||'Unknown'));
                    el.disabled = false;
                }
            });
        });
    }
})();

// Fallback: ensure click always opens shop even if initializer ran earlier/later
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.id === 'itemshop-btn') {
        if (window.openItemShop) return window.openItemShop();
        // minimal fallback: show window if present
        const w = document.getElementById('itemshop-window');
        if (w) { w.classList.remove('hidden'); w.classList.add('active'); }
    }
});

// ========= Settings UI (created dynamically to avoid HTML edits) =========
        // Inventory events
        if (inventoryBtn) {
            inventoryBtn.addEventListener('click', openInventory);
            inventoryBtn.addEventListener('mousedown', (e) => { e.preventDefault(); openInventory(); });
            inventoryBtn.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} openInventory(); }, { passive: false });
        }
        if (closeInventory) closeInventory.addEventListener('click', closeInventoryWindow);
        if (inventoryWindow) inventoryWindow.addEventListener('click', (e) => { if (e.target === inventoryWindow) closeInventoryWindow(); });
        if (closeItemhint) closeItemhint.addEventListener('click', closeItemHintWindow);
        if (itemhintWindow) itemhintWindow.addEventListener('click', (e) => { if (e.target === itemhintWindow) closeItemHintWindow(); });
    const reloadBtn = document.getElementById('reload-inventory');
    if (reloadBtn) reloadBtn.addEventListener('click', () => { try { reloadInventoryFromServer(); } catch {} });

        // Initialize inventory UI
        updateInventoryUI();
function ensureSettingsButton() {
    if (document.getElementById('settings-btn')) return;
    const container = document.createElement('div');
    container.id = 'settings-container';
    const img = document.createElement('img');
    img.id = 'settings-btn';
    img.src = 'assets/settings.png';
    img.alt = 'Settings';
    img.title = 'Settings';
    container.appendChild(img);
    document.body.appendChild(container);
}

function ensureSettingsWindow() {
    if (document.getElementById('settings-window')) {
        // If window exists from HTML, still bind overlay click to close
        const wrap = document.getElementById('settings-window');
        wrap.addEventListener('click', (e) => { if (e.target === wrap) closeSettings(); });
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'settings-window';
    wrap.className = 'hidden';
            card.innerHTML = `
        <div class="settings-content">
            <h3>Settings</h3>
            <div id="settings-stats" class="settings-stats">
                <div class="stat"><span class="label">Now:</span> <span id="stat-now">-</span></div>
                <button class="itemshop-buy" data-slot="${it.slot}" ${it.stock<=0?'disabled':''}>Buy</button>
                <div class="stat"><span class="label">Session time:</span> <span id="stat-session-time">-</span></div>
                <div class="stat"><span class="label">Total time:</span> <span id="stat-total-time">-</span></div>
                <div class="stat"><span class="label">First seen:</span> <span id="stat-first-seen">-</span></div>
                <div class="stat"><span class="label">Last seen:</span> <span id="stat-last-seen">-</span></div>
                <div class="stat"><span class="label">Sessions:</span> <span id="stat-sessions">-</span></div>
                <div class="stat"><span class="label">Clicks (session/total):</span> <span id="stat-clicks">0 / 0</span></div>
                <div class="stat"><span class="label">CPS (clicks per second):</span> <span id="stat-cps">0</span></div>
                <div class="stat"><span class="label">Scrap earned:</span> <span id="stat-scrap-earned">0</span></div>
                <div class="stat"><span class="label">Scrap spent:</span> <span id="stat-scrap-spent">0</span></div>
                <div class="stat"><span class="label">Session scrap:</span> <span id="stat-scrap-session">0</span></div>
                <div class="stat"><span class="label">SPS (scrap per second):</span> <span id="stat-sps">0</span></div>
                <div class="stat"><span class="label">Peak scrap:</span> <span id="stat-peak-scrap">0</span></div>
                <div class="stat"><span class="label">Best click yield:</span> <span id="stat-best-click">0</span></div>
                <div class="stat"><span class="label">Rebirths:</span> <span id="stat-rebirths">0</span></div>
                <div class="stat"><span class="label">Last rebirth:</span> <span id="stat-last-rebirth">-</span></div>
                <div class="stat"><span class="label">Bricks bought:</span> <span id="stat-bricks-bought">0</span></div>
                <div class="stat"><span class="label">Tires spawned/collected:</span> <span id="stat-tires">0 / 0</span></div>
                <div class="stat"><span class="label">Tiles earned:</span> <span id="stat-tiles-earned">0</span></div>
                <div class="stat"><span class="label">Tiles spent:</span> <span id="stat-tiles-spent">0</span></div>
                <div class="stat"><span class="label">Autoclicks:</span> <span id="stat-autoclicks">0</span></div>
                <div class="stat"><span class="label">Autoclicks (session):</span> <span id="stat-autoclicks-session">0</span></div>
                <div class="stat"><span class="label">Scrapyard ticks:</span> <span id="stat-scrapyard-ticks">0</span></div>
                <div class="stat"><span class="label">Scrapyard runtime:</span> <span id="stat-scrapyard-uptime">0</span></div>
                <div class="stat"><span class="label">Storms:</span> <span id="stat-storms">0</span></div>
                <div class="stat"><span class="label">Upgrades bought:</span> <span id="stat-upgrades-bought">0</span></div>
                <div class="stat"><span class="label">Blue upgrades (b/e/t):</span> <span id="stat-blue-bought">0</span></div>
                <div class="stat"><span class="label">Master Tokens spent:</span> <span id="stat-tokens-spent">0</span></div>
            </div>
            <div class="settings-actions">
                <button id="export-save-btn">Export Save</button>
                <button id="export-simple-btn" title="Export only core game data as plain JSON">Export Simple JSON</button>
                <button id="reset-save-btn">Reset Save</button>
                <button id="import-save-btn">Import Save</button>
                <input type="file" id="import-save-input" accept="application/json" class="visually-hidden" />
                <button id="paste-save-btn" title="Paste JSON from clipboard or manual">Paste JSON Save</button>
            </div>
            <img id="settings-palette" src="assets/pallet.png" alt="Palette">
            <div id="close-settings">✕</div>
        </div>`;
    document.body.appendChild(wrap);

    // Close on overlay click
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeSettings(); });
}

function updateSettingsStatsUI() {
    if (!STATS) return;
    const now = new Date();
    const sessionStart = new Date(STATS.sessionStartAt);
    const totalTime = STATS.totalPlaytimeMs + (Date.now() - STATS.sessionStartAt);
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('stat-now', formatDateDetailed(now));
    setText('stat-session-start', formatDateDetailed(sessionStart));
    setText('stat-session-time', formatDuration(Date.now() - STATS.sessionStartAt));
    setText('stat-total-time', formatDuration(totalTime));
    if (STATS.firstLaunchAt) setText('stat-first-seen', formatDateDetailed(new Date(STATS.firstLaunchAt)));
    if (STATS.lastSeenAt) setText('stat-last-seen', formatDateDetailed(new Date(STATS.lastSeenAt)));
    if (typeof STATS.sessionsStarted === 'number') setText('stat-sessions', String(STATS.sessionsStarted));
    setText('stat-clicks', `${STATS.clicks.session} / ${STATS.clicks.total}`);
    const sessionSeconds = Math.max(1, Math.floor((Date.now() - STATS.sessionStartAt) / 1000));
    setText('stat-cps', (STATS.clicks.session / sessionSeconds).toFixed(2));
    setText('stat-scrap-earned', (STATS.totalScrapEarned).toLocaleString());
    setText('stat-scrap-spent', (STATS.scrapSpent).toLocaleString());
    setText('stat-scrap-session', (STATS.sessionScrapEarned || 0).toLocaleString());
    setText('stat-sps', ((STATS.sessionScrapEarned || 0) / sessionSeconds).toFixed(2));
    setText('stat-peak-scrap', (STATS.highestScraps).toLocaleString());
    setText('stat-best-click', (STATS.bestClickYield || 0).toLocaleString());
    setText('stat-rebirths', String(STATS.rebirths));
    setText('stat-last-rebirth', STATS.lastRebirthAt ? formatDateDetailed(new Date(STATS.lastRebirthAt)) : '-');
    setText('stat-bricks-bought', String(STATS.bricksBought));
    setText('stat-tires', `${STATS.tiresSpawned} / ${STATS.tiresCollected}`);
    setText('stat-tiles-earned', String(STATS.tilesEarned));
    setText('stat-tiles-spent', String(STATS.tilesSpent || 0));
    setText('stat-autoclicks', String(STATS.autoClicks));
    setText('stat-autoclicks-session', String(STATS.autoClicksSession || 0));
    setText('stat-scrapyard-ticks', String(STATS.scrapyardTicks));
    const upSec = STATS.scrapyardOwnedSeconds || 0;
    const upH = Math.floor(upSec / 3600), upM = Math.floor((upSec % 3600) / 60), upS = upSec % 60;
    setText('stat-scrapyard-uptime', `${upH.toString().padStart(2,'0')}:${upM.toString().padStart(2,'0')}:${upS.toString().padStart(2,'0')}`);
    setText('stat-storms', String(STATS.stormsOccurred));
    setText('stat-upgrades-bought', String(STATS.upgradesBought));
    let blueBreakdown = String(STATS.blueUpgradesBought);
    try { if (window.blueUpgrades) blueBreakdown = `${window.blueUpgrades.better.level}/${window.blueUpgrades.earnings.level}/${window.blueUpgrades.tires.level}`; } catch {}
    setText('stat-blue-bought', blueBreakdown);
    setText('stat-tokens-spent', String(STATS.masterTokensSpent || 0));
}

function openSettings() {
    const win = document.getElementById('settings-window');
    if (!win) return;
    win.classList.remove('hidden');
    win.classList.add('active');
    updateSettingsStatsUI();
    if (!openSettings._timer) {
        openSettings._timer = setInterval(() => {
            if (!win.classList.contains('active')) return;
            updateSettingsStatsUI();
        }, 1000);
    }
}
function closeSettings() {
    const win = document.getElementById('settings-window');
    if (!win) return;
    win.classList.add('hidden');
    win.classList.remove('active');
}

// Export/Import helpers
function collectSaveData() {
    try { if (typeof window.gameExportSave === 'function') { return { type: 'custom', payload: window.gameExportSave() }; } } catch(e) {}
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        all[key] = localStorage.getItem(key);
    }
    return { type: 'localStorage', meta: { exportedAt: new Date().toISOString(), version: '1.2-patch1' }, payload: all };
}
function exportSave() {
    try {
        if (window.saveSystem && typeof window.saveSystem.exportSave === 'function') {
            // Prefer native SaveSystem exporter for proper format
            window.saveSystem.exportSave();
            return;
        }
    } catch {}
    // Fallback: export all localStorage keys
    const data = collectSaveData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scrapmasters-save.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
}
// Export only the core game data (simple, human-readable JSON)
function exportSimpleSave() {
    let gameData = null;
    try {
        if (window.saveSystem && typeof window.saveSystem.getGameData === 'function') {
            gameData = window.saveSystem.getGameData();
        }
    } catch {}
    if (!gameData) {
        // Fallback: try to read the core save key directly
        try {
            const key = (window.saveSystem && window.saveSystem.saveKey) ? window.saveSystem.saveKey : 'scrapMastersGameSave';
            const raw = localStorage.getItem(key);
            if (raw) {
                try { gameData = JSON.parse(raw); } catch { gameData = { raw }; }
            }
        } catch {}
    }
    if (!gameData) {
        // Last resort minimal snapshot
        gameData = {
            saveVersion: 1,
            scraps: (typeof window.scraps === 'number') ? window.scraps : 0,
            upgradeLevels: (typeof window.upgradeLevels === 'object' && window.upgradeLevels) ? window.upgradeLevels : {},
            rebirths: (typeof window.rebirthCount === 'number') ? window.rebirthCount : 0,
            tiles: (typeof window.tiles === 'number') ? window.tiles : 0,
        };
    }
    const blob = new Blob([JSON.stringify(gameData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scrapmasters-simple-save.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
}
async function applyImportedData(obj) {
    try { console.debug('[Import] applyImportedData start. typeof:', typeof obj); } catch {}
    // 1) If custom importer exposed, let it handle
    if (obj && obj.type === 'custom' && obj.payload && typeof window.gameImportSave === 'function') {
        try { console.debug('[Import] Detected custom payload, delegating to gameImportSave'); window.gameImportSave(obj.payload); return true; } catch(e) { try { console.debug('[Import] custom handler failed:', e); } catch {} }
    }
    if (window.saveSystem && typeof window.saveSystem.coerceImportedPayload === 'function') {
        try {
            const resolution = await window.saveSystem.coerceImportedPayload(obj);
            if (resolution && resolution.status === 'signed-failed') {
                alert('Import failed: save integrity hash mismatch.');
                console.warn('[Import] Signed save rejected due to integrity failure.');
                return false;
            }
            if (resolution && resolution.status === 'signed-ok') {
                const key = (window.saveSystem && window.saveSystem.saveKey) ? window.saveSystem.saveKey : 'scrapMastersGameSave';
                localStorage.setItem(key, JSON.stringify(resolution.payload));
                try {
                    if (resolution.meta && resolution.meta.signature) {
                        console.debug('[Import] Signed save accepted. Signature:', resolution.meta.signature);
                    }
                } catch {}
                return true;
            }
        } catch (err) {
            console.error('[Import] Integrity resolution failed', err);
            alert('Import failed: could not verify save integrity.');
            return false;
        }
    }
    // Accept stringified JSON or { data: {...} } wrappers
    try {
        if (typeof obj === 'string') { console.debug('[Import] String input, parsing JSON'); obj = JSON.parse(obj); }
        if (obj && obj.data && typeof obj.data === 'object') { console.debug('[Import] Found data wrapper'); obj = obj.data; }
    } catch {}
    // 2) If this looks like a SaveSystem gameData (single object with fields), write to the core save key
    const looksLikeGameData = (o) => o && typeof o === 'object' && (
        ('scraps' in o && 'upgradeLevels' in o) || ('saveVersion' in o)
    );
    if (looksLikeGameData(obj)) {
        try {
            const key = (window.saveSystem && window.saveSystem.saveKey) ? window.saveSystem.saveKey : 'scrapMastersGameSave';
            try { console.debug('[Import] Detected SaveSystem gameData. Writing to', key); } catch {}
            localStorage.setItem(key, JSON.stringify(obj));
            return true;
        } catch {}
    }
    // 2b) If object looks like a full localStorage dump (has payload or explicit type), write ALL keys
    try {
        const looksLikeDump = (o) => !!(o && (o.type === 'localStorage' || (o.payload && typeof o.payload === 'object')));
        if (looksLikeDump(obj)) {
            const payload = obj.payload || {};
            try { console.debug('[Import] Detected localStorage dump. Keys:', Object.keys(payload).length); } catch {}
            if (!confirm('Import will overwrite your current save. Continue?')) return false;
            Object.keys(payload).forEach(k => {
                try {
                    const v = payload[k];
                    if (typeof v === 'string') localStorage.setItem(k, v);
                    else localStorage.setItem(k, JSON.stringify(v));
                } catch(e) {}
            });
            try { console.debug('[Import] LocalStorage dump written successfully'); } catch {}
            return true;
        }
    } catch {}
    // 3) Map that contains the core save key only
    try {
        const key = (window.saveSystem && window.saveSystem.saveKey) ? window.saveSystem.saveKey : 'scrapMastersGameSave';
        if (obj && typeof obj === 'object' && obj[key] !== undefined) {
            const val = obj[key];
            try { console.debug('[Import] Map contains core key. Writing to', key, 'type:', typeof val); } catch {}
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            return true;
        }
        if (obj && obj.payload && obj.payload[key] !== undefined) {
            const val = obj.payload[key];
            try { console.debug('[Import] Payload contains core key. Writing to', key, 'type:', typeof val); } catch {}
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            return true;
        }
    } catch {}
    // 4) Otherwise, treat as a plain map of keys to import
    const payload = obj && obj.payload ? obj.payload : obj;
    if (!payload || typeof payload !== 'object') return false;
    try { console.debug('[Import] Treating input as plain key map. Keys:', Object.keys(payload).length); } catch {}
    if (!confirm('Import will overwrite your current save. Continue?')) return false;
    try {
        Object.keys(payload).forEach(k => {
            try {
                const v = payload[k];
                if (typeof v === 'string') localStorage.setItem(k, v);
                else localStorage.setItem(k, JSON.stringify(v));
            } catch(e) {}
        });
        try { console.debug('[Import] Key map written successfully'); } catch {}
        return true;
    } catch { return false; }
}
function bindSettingsHandlers() {
    const btn = document.getElementById('settings-btn');
    const win = document.getElementById('settings-window');
    const closeBtn = document.getElementById('close-settings');
    const exportBtn = document.getElementById('export-save-btn');
    const exportSimpleBtn = document.getElementById('export-simple-btn');
    const resetBtn = document.getElementById('reset-save-btn');
    const importBtn = document.getElementById('import-save-btn');
    const importInput = document.getElementById('import-save-input');
    const pasteBtn = document.getElementById('paste-save-btn');
    if (btn) btn.addEventListener('click', openSettings);
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (exportBtn) exportBtn.addEventListener('click', exportSave);
    if (exportSimpleBtn) exportSimpleBtn.addEventListener('click', exportSimpleSave);
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (!confirm('This will permanently reset ALL your progress (including local saves). Continue?')) return;
        try { if (typeof window.resetsave === 'function') window.resetsave(); } catch {}
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        // Clear caches (if SW used) and force a hard reload with cache-busting
        const reloadHard = () => {
            const url = new URL(location.href);
            url.searchParams.set('t', Date.now().toString());
            location.replace(url.toString());
        };
        try {
            if ('caches' in window) {
                caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(reloadHard);
            } else {
                reloadHard();
            }
        } catch { reloadHard(); }
    });
    if (importBtn) importBtn.addEventListener('click', () => {
        if (!importInput) return;
        // Temporarily make the input effectively visible and clickable for strict browsers
        const prev = {
            position: importInput.style.position,
            left: importInput.style.left,
            top: importInput.style.top,
            width: importInput.style.width,
            height: importInput.style.height,
            opacity: importInput.style.opacity,
            pointerEvents: importInput.style.pointerEvents,
            zIndex: importInput.style.zIndex,
        };
        importInput.classList.remove('hidden');
        importInput.classList.remove('visually-hidden');
        importInput.style.position = 'fixed';
        importInput.style.left = '0';
        importInput.style.top = '0';
        importInput.style.width = '1px';
        importInput.style.height = '1px';
        importInput.style.opacity = '0';
        importInput.style.pointerEvents = 'auto';
        importInput.style.zIndex = '2147483647';
        try { importInput.click(); } finally {
            // Restore styles and re-hide
            importInput.style.position = prev.position;
            importInput.style.left = prev.left;
            importInput.style.top = prev.top;
            importInput.style.width = prev.width;
            importInput.style.height = prev.height;
            importInput.style.opacity = prev.opacity;
            importInput.style.pointerEvents = prev.pointerEvents;
            importInput.style.zIndex = prev.zIndex;
            importInput.classList.add('visually-hidden');
        }
    });
    if (importInput) importInput.addEventListener('change', (e) => {
        // Force localStorage overwrite import (bypass SaveSystem.importSave)
        const f = e.target.files && e.target.files[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    try { console.debug('[Import] File selected:', f.name, f.size + ' bytes'); } catch {}
                    const data = JSON.parse(reader.result);
                    // Always try to apply by writing directly to localStorage (save key or full dump)
                    const ok = await applyImportedData(data);
                    if (ok) {
                        try { console.debug('[Import] Import OK. Reloading page...'); } catch {}
                        try { localStorage.setItem('sm_skip_next_save', '1'); } catch {}
                        // Patch out save on this page to avoid beforeunload overwrite even with older cached scripts
                        try { if (window.saveSystem && typeof window.saveSystem.saveGame === 'function') { window.saveSystem.saveGame = function(){ try { console.debug('[Import] saveGame suppressed for reload'); } catch {}; return true; }; } } catch {}
                        alert('Save imported. Reloading...');
                        const url = new URL(location.href);
                        url.searchParams.set('t', Date.now().toString());
                        location.replace(url.toString());
                    } else {
                        alert('Import failed: unrecognized save format.');
                    }
                } catch {
                    alert('Invalid file. Could not parse JSON.');
                }
            };
            reader.readAsText(f);
        }
        e.target.value = '';
    });
    if (pasteBtn) pasteBtn.addEventListener('click', async () => {
        try { console.debug('[Import] Paste flow initiated'); } catch {}
        let text = '';
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                text = await navigator.clipboard.readText();
            }
        } catch {}
        if (!text) {
            text = prompt('Paste your JSON save here:');
        }
        if (!text) return;
        try {
            const data = JSON.parse(text);
            const ok = await applyImportedData(data);
            if (ok) {
                try { localStorage.setItem('sm_skip_next_save', '1'); } catch {}
                // Patch out save on this page to avoid beforeunload overwrite even with older cached scripts
                try { if (window.saveSystem && typeof window.saveSystem.saveGame === 'function') { window.saveSystem.saveGame = function(){ try { console.debug('[Import] saveGame suppressed for reload'); } catch {}; return true; }; } } catch {}
                alert('Save imported. Reloading...');
                const url = new URL(location.href);
                url.searchParams.set('t', Date.now().toString());
                location.replace(url.toString());
            } else {
                alert('Import failed: unrecognized save format.');
            }
        } catch (e) {
            alert('Invalid JSON in pasted content.');
        }
    });
    if (win) win.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
}

// Funkcje
function checkUpgradeUnlock() {
    if (scraps >= UPGRADE_UNLOCK) {
        upgradeBtn.style.display = "block";
    }
}

function updateRebirthUI() {
    starBtn.style.display = (scrapyardPurchased || rebirthCount > 0) ? "block" : "none";
    if (rebirthCountDisplay) {
        rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
    }
        // Earth (chat) icon removed - this line is a comment and does not affect functionality
    // Dynamiczny koszt w oknie rebirth jeśli element istnieje
    const costPlaceholder = document.getElementById('rebirth-cost-placeholder');
    if (costPlaceholder) {
        costPlaceholder.textContent = getCurrentRebirthCost().toLocaleString();
    } else {
        // Fallback: stary sposób jeśli placeholder nie istnieje
        const rebirthWindowEl = document.getElementById('rebirth-window');
        if (rebirthWindowEl) {
            const desc = rebirthWindowEl.querySelector('.rebirth-description');
            if (desc) {
                const cost = getCurrentRebirthCost();
                desc.innerHTML = `Rebirth resets your progress and grants a rebirth point.<br>Required: ${cost.toLocaleString()} Scrap<br><br><strong>WARNING:</strong> This will reset all your upgrades and scrap!`;
            }
        }
    }
    if (blueUpgradeContainer) {
    const blueUnlocked = treeUpgrades && treeUpgrades[2] && treeUpgrades[2].level > 0;
        blueUpgradeContainer.classList.toggle('hidden', !blueUnlocked);
    }
    // Update chat icon visibility based on rebirths
    try { updateChatUnlockUI(); } catch {}
}

function updateGreenUpgradeUI() {
    const show = rebirthCount > 0;
    if (greenUpgradeContainer) {
        greenUpgradeContainer.classList.toggle('hidden', !show);
    }
    if (greenUpgradeBtn) {
        greenUpgradeBtn.disabled = !show;
    }
}

function updateGreenUpgradeBarrelAvailability() {
    document.querySelectorAll('.greenupgrade-item').forEach((item, index) => {
        const button = item.querySelector('.greenupgrade-button');
        const requiredRebirth = index;
        const isUnlocked = rebirthCount >= requiredRebirth;
        
        if (!isUnlocked) {
            button.disabled = true;
            button.textContent = `${requiredRebirth} Rebirth`;
            item.style.opacity = '0.5';
        } else {
            button.disabled = false;
            button.textContent = 'Equip';
            item.style.opacity = '1';
        }
    });
}

function updateScrapyardSectionsVisibility() {
    if (rebirthCount >= 5) {
        treeContainer.classList.remove('hidden');
        if (brickyardSection) brickyardSection.classList.remove('hidden');
        if (brickyardSeparator) brickyardSeparator.classList.remove('hidden');
    } else {
        treeContainer.classList.add('hidden');
        if (brickyardSection) brickyardSection.classList.add('hidden');
        if (brickyardSeparator) brickyardSeparator.classList.add('hidden');
    }
    // TilesYard visible in Book ONLY after purchase of tree upgrade index 2
    const tilesYardUnlocked = treeUpgrades && treeUpgrades[4] && treeUpgrades[4].level > 0; // updated index after swap
    if (tilesyardSection) tilesyardSection.classList.toggle('hidden', !tilesYardUnlocked);
    if (tilesyardSeparator) tilesyardSeparator.classList.toggle('hidden', !tilesYardUnlocked);
    // Blue Upgrades visibility still depends on tree upgrade 5
    if (blueUpgradeContainer) {
    const blueUnlocked = treeUpgrades && treeUpgrades[2] && treeUpgrades[2].level > 0; // index 2 now Blue Upgrades
        blueUpgradeContainer.classList.toggle('hidden', !blueUnlocked);
    }

    // Itemshop button visible after 6 rebirths
    if (itemshopBtn) {
        if (rebirthCount >= 6) itemshopBtn.classList.remove('hidden');
        else itemshopBtn.classList.add('hidden');
    }
    // Inventory button visible after 6 rebirths
    if (inventoryBtn) {
        if (rebirthCount >= 6) inventoryBtn.classList.remove('hidden');
        else inventoryBtn.classList.add('hidden');
    }
}

// Chat helpers removed

function updateUpgradeInfo() {
    const currentLevel0 = upgradeLevels[0];
    document.getElementById('upgrade-level-0').textContent = currentLevel0;
    // Infinite levels: always show next dynamic cost
    const nextCost0 = getUpgrade1Cost(currentLevel0);
    document.getElementById('upgrade-cost-0').textContent = `${nextCost0.toLocaleString()} Scrap`;
    
    const currentLevel1 = upgradeLevels[1];
    document.getElementById('upgrade-level-1').textContent = currentLevel1;
    
    if (currentLevel1 < AUTOCLICKER_MAX_LEVEL) {
        document.getElementById('upgrade-cost-1').textContent = `${upgrade2Cost} Scrap`;
    } else {
        document.getElementById('upgrade-cost-1').textContent = 'MAX';
    }
    
    const currentLevel2 = upgradeLevels[2];
    document.getElementById('upgrade-level-2').textContent = currentLevel2;
    
    if (currentLevel2 < upgrade3Costs.length) {
        document.getElementById('upgrade-cost-2').textContent = 
            `${upgrade3Costs[currentLevel2]} Scrap`;
    } else {
        document.getElementById('upgrade-cost-2').textContent = "MAX";
    }

    // Funny Joke (index 3)
    const currentLevel3 = upgradeLevels[3] || 0;
    const lvlEl3 = document.getElementById('upgrade-level-3');
    const costEl3 = document.getElementById('upgrade-cost-3');
    if (lvlEl3) lvlEl3.textContent = currentLevel3;
    if (costEl3) {
        if (currentLevel3 < upgrade4Costs.length) {
            const c = upgrade4Costs[currentLevel3] ?? Infinity;
            costEl3.textContent = isFinite(c) ? `${c} Scrap` : 'MAX';
        } else {
            costEl3.textContent = 'MAX';
        }
    }

    // Mass Scrap (index 4)
    const currentLevel4 = upgradeLevels[4] || 0;
    const lvlEl4 = document.getElementById('upgrade-level-4');
    const costEl4 = document.getElementById('upgrade-cost-4');
    if (lvlEl4) lvlEl4.textContent = currentLevel4;
    if (costEl4) {
        if (currentLevel4 < upgrade5Costs.length) {
            const c = upgrade5Costs[currentLevel4] ?? Infinity;
            costEl4.textContent = isFinite(c) ? `${c.toLocaleString()} Scrap` : 'MAX';
        } else {
            costEl4.textContent = 'MAX';
        }
    }

    // Bomblike removed
}

// Upewnia się, że ukryte kafelki upgrade'ów są odsłaniane zgodnie z poziomami (np. cooldown po autoclickerze)
function refreshUpgradeVisibility() {
    const upg1 = document.querySelector('.upgrade-item[data-index="1"]'); // Autoclicker
    const upg2 = document.querySelector('.upgrade-item[data-index="2"]'); // Cooldown
    const upg3 = document.querySelector('.upgrade-item[data-index="3"]'); // Funny Joke
    const upg4 = document.querySelector('.upgrade-item[data-index="4"]'); // Mass Scrap
    if (upg1) {
        // Autoclicker pokazuje się po osiągnięciu 2 poziomów pierwszego upgrade lub jeśli już został kupiony
        if (upgradeLevels[0] >= 2 || upgradeLevels[1] > 0) {
            upg1.classList.remove('hidden');
        } else {
            upg1.classList.add('hidden');
        }
    }
    if (upg2) {
        // Cooldown pokazuje się TYLKO po kupieniu Autoclickera (>=1)
        if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL) {
            showCooldownUpgrade();
        } else {
            upg2.classList.add('hidden');
        }
    }
    if (upg3) {
        // Funny Joke odblokowuje się po osiągnięciu cooldown level >= 5
        if (upgradeLevels[2] >= 5) {
            upg3.classList.remove('hidden');
            upg3.style.display = '';
        } else {
            upg3.classList.add('hidden');
        }
    }
    if (upg4) {
    // Mass Scrap odblokowuje się po osiągnięciu Funny Joke level >= 4
        if (upgradeLevels[3] >= 4) {
            upg4.classList.remove('hidden');
            upg4.style.display = '';
        } else {
            upg4.classList.add('hidden');
        }
    }
    // Bomblike removed
}

// Wymusza limit poziomu Autoclickera oraz aktualizuje kafelek na stan MAX
function enforceAutoclickerCap() {
    if (upgradeLevels[1] > AUTOCLICKER_MAX_LEVEL) {
        upgradeLevels[1] = AUTOCLICKER_MAX_LEVEL;
    }
    if (upgradeLevels[1] === AUTOCLICKER_MAX_LEVEL) {
        const tile = document.querySelector('.upgrade-item[data-index="1"]');
        if (tile) {
            tile.classList.add('max');
            tile.style.pointerEvents = 'none';
        }
        const costEl = document.getElementById('upgrade-cost-1');
        if (costEl) costEl.textContent = 'MAX';
    }
}

// Pokazuje kafelek cooldown (index 2) niezależnie od wcześniejszego inline display
function showCooldownUpgrade() {
    const tile = document.querySelector('.upgrade-item[data-index="2"]');
    if (!tile) return;
    tile.classList.remove('hidden');
    tile.style.display = '';
}

function updateScrapyardUI() {
    if (scrapyardPurchased) {
        scrapyardImage.src = "assets/goldscrapyard.png";
        scrapyardImage.classList.add('purchased');
        buyScrapyardBtn.disabled = true;
        buyScrapyardBtn.textContent = "Purchased";
        scrapyardCostDisplay.textContent = "MAX";
    } else {
        scrapyardImage.src = "assets/scrapyard.png";
        scrapyardImage.classList.remove('purchased');
        scrapyardCostDisplay.textContent = `${scrapyardCost} Scrap`;
        buyScrapyardBtn.disabled = scraps < scrapyardCost;
    }
}

function openScrapyardWindow() {
    scrapyardWindow.classList.remove('hidden'); // Dodaj to!
    scrapyardWindow.classList.add('active');
    updateScrapyardUI();
    // Ensure TilesYard/BrickYard visibility reflects current upgrades
    if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
}

function openRebirthWindow() {
    rebirthWindow.classList.remove('hidden');
    rebirthWindow.classList.add('active');
}

function buyScrapyard() {
    if (!scrapyardPurchased && scraps >= scrapyardCost) {
        if (STATS) STATS.scrapSpent += scrapyardCost;
        scraps -= scrapyardCost;
        scrapyardPurchased = true;
    updateScrapCounter();
        
        // Determine scrapyard rate based on upgrades
        const better = treeUpgrades && treeUpgrades[0] && treeUpgrades[0].level > 0;
        const best = treeUpgrades && treeUpgrades[3] && treeUpgrades[3].level > 0;
        const perSecond = best ? 300 : (better ? 100 : 100/60); // if none, 100 per minute
        const intervalTime = 1000; // tick every second; compute add based on perSecond
        
        // Clear any existing interval first
        if (scrapyardInterval) {
            clearInterval(scrapyardInterval);
        }
        
        scrapyardInterval = setInterval(() => {
            if (STATS) {
                STATS.scrapyardTicks += 1;
                STATS.totalScrapEarned += perSecond;
                STATS.sessionScrapEarned = (STATS.sessionScrapEarned || 0) + perSecond;
                STATS.scrapyardOwnedSeconds += 1;
                bumpHighestScraps(perSecond);
            }
            scraps += perSecond;
            updateScrapCounter();
        }, intervalTime);
        
        updateScrapyardUI();
        updateRebirthUI(); // <-- dodaj to!
        if (window.saveSystem) saveSystem.saveGame();
    }
}

function buyBrick() {
    const brickCostScrap = 10;
    const brickCostTokens = 5;
    
    if (rebirthCount >= 5 && scraps >= brickCostScrap && masterTokens >= brickCostTokens) {
    if (STATS) STATS.scrapSpent += brickCostScrap;
    scraps -= brickCostScrap;
        masterTokens -= brickCostTokens;
        bricks += 1;
    if (STATS) STATS.bricksBought += 1;
        
    updateScrapCounter();
        updateMasterTokenUI();
        updateBrickUI();
        
    console.log(`🧱 Bought 1 Brick! Cost: ${brickCostScrap} Scrap + ${brickCostTokens} Master Tokens`);
    if (window.saveSystem) saveSystem.saveGame();
    } else {
        if (rebirthCount < 5) {
            alert('You need at least 5 rebirths to buy Brick!');
        } else if (scraps < brickCostScrap) {
            alert(`You need ${brickCostScrap} Scrap to buy Brick!`);
        } else if (masterTokens < brickCostTokens) {
            alert(`You need ${brickCostTokens} Master Tokens to buy Brick!`);
        }
    }
}

function performRebirth() {
    const cost = getCurrentRebirthCost();
    if (scraps >= cost) {
        scraps = 0;
        scrapPerClick = 1;
        currentCooldownTime = 5.00;
        upgradeLevels[0] = 0;
        upgradeLevels[1] = 0;
    upgradeLevels[2] = 0; // reset cooldown level
    upgradeLevels[3] = 0; // reset Funny Joke level
        scrapyardPurchased = false;

        if (autoClickerInterval) clearInterval(autoClickerInterval);
        if (scrapyardInterval) clearInterval(scrapyardInterval);
        // Po rebirth odblokuj natychmiast możliwość klikania
        canClick = true;
        if (cooldownTimer) cooldownTimer.textContent = 'READY';
        if (cooldownBar) cooldownBar.style.width = '100%';
        autoClickerInterval = null;
        scrapyardInterval = null;

    rebirthCount++;
    if (STATS) { STATS.rebirths += 1; STATS.lastRebirthAt = Date.now(); }
    try { requestSyncLeaderboard(); } catch {}
        if (rebirthCountDisplay) {
            rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
        }
        const earth = document.getElementById('earth-btn');
        if (earth && rebirthCount >= 1) earth.classList.remove('hidden');

        // Dodaj 1 Brick za każdy rebirth (tylko od 5 rebirth)
        if (rebirthCount >= 5) {
            bricks += 1;
        }

        counter.textContent = `Scrap: ${scraps}`;
        updateUpgradeInfo();
        updateScrapyardUI();
        updateGreenUpgradeUI();
        updateGreenUpgradeBarrelAvailability(); // Dodano aktualizację dostępności barrel
    updateScrapyardSectionsVisibility(); // Odśwież widoczność sekcji w Book
        // Toggle itemshop visibility based on new rebirth count
        if (itemshopBtn) itemshopBtn.classList.toggle('hidden', rebirthCount < 6);
        updateMysteryBookUI(); // Dodano aktualizację UI dla Mystery Book
        updateBrickUI(); // Dodano aktualizację UI dla Brick
        rebirthWindow.classList.remove('active');
        rebirthWindow.classList.add('hidden');

        upgradeBtn.style.display = scraps >= UPGRADE_UNLOCK ? "block" : "none";
        bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);
    starBtn.style.display = rebirthCount > 0 ? "block" : "none";
    // Zaktualizuj koszt po zwiększeniu rebirthCount
    updateRebirthUI();
    if (window.saveSystem) saveSystem.saveGame();

        document.querySelector('.upgrade-item[data-index="1"]').classList.toggle('hidden', upgradeLevels[0] < 2);
        const cooldownTile = document.querySelector('.upgrade-item[data-index="2"]');
        if (cooldownTile) cooldownTile.classList.add('hidden');
    } else {
        alert(`You need ${cost.toLocaleString()} Scrap for next rebirth!`);
    }
}

function buyUpgrade(index) {
    if (index === 0) {
        const currentLevel = upgradeLevels[0] || 0;
        const cost = getUpgrade1Cost(currentLevel);
        if (scraps < cost) return;
        if (STATS) { STATS.scrapSpent += cost; STATS.upgradesBought += 1; }
        scraps -= cost;
        upgradeLevels[0] = currentLevel + 1;
        scrapPerClick += 1; // now +1 Scrap/click per level
        updateScrapCounter();

        if (upgradeLevels[0] >= 2 && upgradeLevels[1] === 0) {
            const autoclickerTile = document.querySelector('.upgrade-item[data-index="1"]');
            if (autoclickerTile) autoclickerTile.classList.remove('hidden');
        }

        updateUpgradeInfo();
        updateScrapyardUI();
        if (window.saveSystem) saveSystem.saveGame();
        return;
    }
    if (index === 1) {
        if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL) return;
        if (scraps < upgrade2Cost) return;
        if (STATS) { STATS.scrapSpent += upgrade2Cost; STATS.upgradesBought += 1; }
        scraps -= upgrade2Cost;
        upgradeLevels[1] += 1;
        updateScrapCounter();

        if (!autoClickerInterval) {
            autoClickerInterval = setInterval(() => {
                if (STATS) {
                    STATS.autoClicks += 1;
                    STATS.autoClicksSession = (STATS.autoClicksSession || 0) + 1;
                    STATS.totalScrapEarned += 1;
                    STATS.sessionScrapEarned = (STATS.sessionScrapEarned || 0) + 1;
                    bumpHighestScraps(1);
                }
                scraps += 1;
                updateScrapCounter();
                checkUpgradeUnlock();
                updateScrapyardUI();
            }, 1000);
        }

        updateUpgradeInfo();
        enforceAutoclickerCap();
        updateScrapyardUI();
        if (window.saveSystem) saveSystem.saveGame();

        if (upgradeLevels[2] === 0) {
            showCooldownUpgrade();
            if (typeof refreshUpgradeVisibility === 'function') refreshUpgradeVisibility();
        }
        return;
    }
    else if (index === 2) {
    const currentLevel = upgradeLevels[index];
    if (currentLevel >= upgrade3Costs.length) return;
    
    const cost = upgrade3Costs[currentLevel];
    if (scraps >= cost) {
        if (STATS) { STATS.scrapSpent += cost; STATS.upgradesBought += 1; }
        scraps -= cost;
        upgradeLevels[index]++;
        
        currentCooldownTime = Math.max(0.10, currentCooldownTime - 0.10);
        
        // Book pojawia się dopiero przy 2 poziomie cooldown
        if (upgradeLevels[2] >= 2) {
    bookContainer.classList.remove('hidden');
}
        // Reveal Funny Joke when cooldown reaches level 5
        if (upgradeLevels[2] >= 5) {
            const funnyTile = document.querySelector('.upgrade-item[data-index="3"]');
            if (funnyTile) funnyTile.classList.remove('hidden');
        }
        
    updateScrapCounter();
    updateUpgradeInfo();
    updateScrapyardUI();
    if (window.saveSystem) saveSystem.saveGame();
    }
}
    else if (index === 4) {
        // Require Funny Joke level >= 4
        if ((upgradeLevels[3] || 0) < 4) return;
        const currentLevel = upgradeLevels[4] || 0;
        if (currentLevel >= 10) return; // now 10 levels
        const cost = upgrade5Costs[currentLevel] ?? Infinity;
        if (scraps >= cost) {
            if (STATS) { STATS.scrapSpent += cost; STATS.upgradesBought += 1; }
            scraps -= cost;
            upgradeLevels[4] = currentLevel + 1;
            updateScrapCounter();
            updateUpgradeInfo();
            updateScrapyardUI();
            if (window.saveSystem) saveSystem.saveGame();
            // Bomblike removed
        }
    }
    else if (index === 3) {
        // Require cooldown level >= 5
        if ((upgradeLevels[2] || 0) < 5) return;
        const currentLevel = upgradeLevels[3] || 0;
        if (currentLevel >= upgrade4Costs.length) return; // cap at 10 levels
        const cost = upgrade4Costs[currentLevel] ?? Infinity;
        if (scraps >= cost) {
            if (STATS) { STATS.scrapSpent += cost; STATS.upgradesBought += 1; }
            scraps -= cost;
            upgradeLevels[3] = currentLevel + 1;
            updateScrapCounter();
            updateUpgradeInfo();
            updateScrapyardUI();
            if (window.saveSystem) saveSystem.saveGame();

            // When Funny Joke reaches level 2, show one-time message (English), only once per profile
            try {
                const SEEN_KEY = 'fj_lvl2_seen';
                if ((upgradeLevels[3] >= 2) && !localStorage.getItem(SEEN_KEY)) {
                    const msg = [
                        'Yes, I know :3',
                        'I took it from Shgabb Clicker',
                        "Don't you know why?",
                        'This game is inspired by Shgabb Clicker',
                        'So keep playing :3',
                        'Thanks, Schrottii <3'
                    ].join('\n');
                    const modal = document.getElementById('funnyjoke-window');
                    const body = document.getElementById('funnyjoke-message');
                    const btn = document.getElementById('funnyjoke-close');
                    const xbtn = document.getElementById('close-funnyjoke');
                    if (modal && body && btn && xbtn) {
                        body.textContent = msg;
                        modal.classList.remove('hidden');
                        modal.classList.add('active');
                        const closeFn = () => {
                            modal.classList.remove('active');
                            modal.classList.add('hidden');
                            try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
                            btn.removeEventListener('click', closeFn);
                            xbtn.removeEventListener('click', closeFn);
                        };
                        btn.addEventListener('click', closeFn);
                        xbtn.addEventListener('click', closeFn);
                    } else {
                        // Fallback alert if modal nodes missing
                        alert(msg);
                        localStorage.setItem(SEEN_KEY, '1');
                    }
                }
            } catch {}

            // Reveal Mass Trash when Funny Joke reaches level 4
            try {
                if (upgradeLevels[3] >= 4) {
                    const mtTile = document.querySelector('.upgrade-item[data-index="4"]');
                    if (mtTile) mtTile.classList.remove('hidden');
                }
            } catch {}
        }
    }
}

// Extended barrels (0..8) -> bonus equals index value (0 scrap, 1..8 per click)
const barrelImages = [
    "assets/scrap.png",
    "assets/barrel1.png",
    "assets/barrel2.png",
    "assets/barrel3.png",
    "assets/barrel4.png",
    "assets/barrel5.png",
    "assets/Barrel6.png",
    "assets/Barrel7.png",
    "assets/Barrel8.png"
];
// Aktualnie wybrana beczka (0 = domyślna). Zapisywana w save.
let selectedBarrelIndex = 0;

function updateBarrelImage(index) {
    if (index >= 0 && index < barrelImages.length) {
        scrapImage.src = barrelImages[index];
        selectedBarrelIndex = index;
        // Ustaw bonus (index = bonus) jeśli logika nie nadpisze później
        scrapBonusPercent = index;
        applyBarrelHighlight();
    }
}

let scrapBonusPercent = 0;
// Blue Upgrades system (permanent Tires-based)
const BLUE_COST_GROWTH = 1.15;
const BLUE_BETTER_BASE_COST = 50;   // starts at 50 Tires, +15% each level
const BLUE_EARNINGS_BASE_COST = 150; // starts at 150 Tires, +15% each level
const BLUE_TIRES_BASE_COST = 200;   // starts at 200 Tires, +15% each level
const blueUpgrades = {
    // Better: special total multipliers for the first three levels
    // L0=1.00, L1=1.30, L2=1.35, L3=1.45; from L4 use base increment 0.25 per level
    better: { level: 0, max: 16, multipliers: [1.00, 1.30, 1.35, 1.45], baseIncrement: 0.25 },
    // The Tires upgrade (now multi-level)
    tires: { level: 0, max: 30, perLevelBonus: 2 },
    earnings: { level: 0, max: 10, scrapPerLevel: 10 }
};
// expose for UI readout
window.blueUpgrades = blueUpgrades;
// Safety clamp in case save had higher level
if (blueUpgrades.better.level > blueUpgrades.better.max) {
    blueUpgrades.better.level = blueUpgrades.better.max;
}
function getBlueUpgradeCost(key) {
    if (key === 'better') {
        const lvl = blueUpgrades.better.level;
        if (lvl >= blueUpgrades.better.max) return Infinity;
        return Math.round(BLUE_BETTER_BASE_COST * Math.pow(BLUE_COST_GROWTH, lvl));
    } else if (key === 'tires') {
        const lvl = blueUpgrades.tires.level;
        if (lvl >= blueUpgrades.tires.max) return Infinity;
        return Math.round(BLUE_TIRES_BASE_COST * Math.pow(BLUE_COST_GROWTH, lvl));
    } else if (key === 'earnings') {
        const lvl = blueUpgrades.earnings.level;
        if (lvl >= blueUpgrades.earnings.max) return Infinity;
        return Math.round(BLUE_EARNINGS_BASE_COST * Math.pow(BLUE_COST_GROWTH, lvl));
    }
    return Infinity;
}
function getClickMultiplier() {
    const b = blueUpgrades.better;
    const lvl = Math.max(0, Math.min(b.level || 0, b.max));
    const mults = b.multipliers;
    if (Array.isArray(mults) && mults[lvl] != null) return mults[lvl];
    // Beyond L3, keep original scaling: 1 + 0.25 * level
    return 1 + 0.25 * lvl;
}

function updateScrapBonus(index) {
    // Każda beczka daje stały bonus, indeks = bonus (0..8 po rozszerzeniu)
    scrapBonusPercent = index; // 0..8
}

function calculateTotalScrap() {
    // Bazowy bonus z wybranej beczki (scrap=0, barrel1=1, itd.) + upgrady Mystery Book
    const baseBarrelBonus = scrapBonusPercent; // Teraz scrapBonusPercent to indeks (0,1,2,3,4,5) = bonus (0,1,2,3,4,5)
    const earningsFlat = (blueUpgrades.earnings ? blueUpgrades.earnings.level * blueUpgrades.earnings.scrapPerLevel : 0);
    // If Sunny Day is active, treat the currently displayed barrel as max level for the sum
    let sumBarrelLevels = barrelLevels.reduce((sum, level) => sum + level, 0);
    if (typeof isSunnyDayActive === 'function' && isSunnyDayActive() && sunnyDayCurrentIndex != null) {
        const curLevel = barrelLevels[sunnyDayCurrentIndex] || 0;
        const extra = Math.max(0, (typeof barrelMaxLevel !== 'undefined' ? barrelMaxLevel : 5) - curLevel);
        sumBarrelLevels += extra;
    }
    const additive = scrapPerClick + baseBarrelBonus + sumBarrelLevels + earningsFlat;
    let total = additive * getClickMultiplier();
    // Star Power tree upgrade: multiplies final scrap per click by 1.05^rebirthCount when purchased
    const starPower = treeUpgrades.find(t => t.name === 'Star Power');
    if (starPower && starPower.level > 0 && rebirthCount > 0) {
        total *= Math.pow(1.05, rebirthCount); // 1.05^rebirths (~+5% per rebirth)
    }
    return total;
}

function handleBarrelButtonClick(index) {
    // Sprawdź wymagany rebirth dla tego barrel
    const requiredRebirth = index;
    if (rebirthCount < requiredRebirth) {
        alert(`You need at least ${requiredRebirth} rebirths to use this barrel!`);
        return;
    }
    
    updateBarrelImage(index);
    if (window.saveSystem) saveSystem.saveGame(); // natychmiast zapisz wybór beczki
}

function applyBarrelHighlight() {
    const items = document.querySelectorAll('.greenupgrade-item');
    items.forEach((item, idx) => {
        if (idx === selectedBarrelIndex) {
            item.classList.add('equipped');
        } else {
            item.classList.remove('equipped');
        }
    });
}

let bricks = 0;
let masterTokens = 0;
const barrelLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // added barrels 6,7,8
const BASE_BARREL_MAX_LEVEL = 5;
const BUFFED_BARREL_MAX_LEVEL = 10;
let barrelMaxLevel = BASE_BARREL_MAX_LEVEL;
const INITIAL_BARREL_COSTS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const barrelCosts = INITIAL_BARREL_COSTS.slice();

// Tree upgrades system
//const treeUpgrades = [false]; // false = nie kupione, true = kupione
//const treeUpgradeCosts = [25]; // Koszt każdego upgrade w Master Tokens

// define tree upgrades
const treeUpgrades = [
    {
        img: 'scrapyard.png', name: 'Better Scrapyard', desc: "Upgrade your Scrapyard from 100 Scrap per minute to 100 Scrap per second!",
        rebirth: 4, price: 500, scrapPrice: 500, brickPrice: 3, level: 0, maxLevel: 1, requiresScrapyard: true
    },
    {
        img: 'tires.png', name: 'Tires', desc: "Unlocks Tires currency! Every 60 seconds, 1 tire falls down giving +1 Tires when hovered!",
        rebirth: 8, price: 35, scrapPrice: 3000, brickPrice: 10, level: 0, maxLevel: 1, requiresPrevious: true
    },
    { // SWAPPED: Blue Upgrades now index 2 (central chain)
        img: 'blueupgrade.png', name: 'Tires Upgrades', desc: "Unlocks Blue Upgrades menu where you spend Tires on permanent upgrades (persist through rebirth).",
        rebirth: 10, scrapPrice: 20000, brickPrice: 15, tilesPrice: 100, level: 0, maxLevel: 1
    },
    {
        img: 'goldscrapyard.png', name: 'Best Scrapyard', desc: "Upgrade your Scrapyard from 100 Scrap/s to 300 Scrap/s!",
        rebirth: 8, scrapPrice: 25000, brickPrice: 12, tilesPrice: 120, level: 0, maxLevel: 1
    },
    { // SWAPPED: TiresYard now index 4 (right dashed branch)
        img: 'tilesyard.png', name: 'TiresYard', desc: "Unlocks TiresYard in the Book as the 3rd option.",
        rebirth: 6, price: 60, scrapPrice: 8000, tilesPrice: 20, level: 0, maxLevel: 1, requiresTwoUpgrades: true
    },
    {
        img: 'Cloud.png', name: 'Storm', desc: 'Every 4 minutes a giant cloud drops 30 Tires across the screen.',
        rebirth: 12, price: 50, scrapPrice: 40000, tilesPrice: 150, level: 0, maxLevel: 1
    },
    {
        img: 'brickyard.png', name: 'Brick Storm', desc: '3.5% chance that a Storm becomes a BrickStorm: falling Bricks instead of Tires. Each collected Brick grants +1 Brick.',
        rebirth: 12, price: 0, brickPrice: 50, scrapPrice: 50000, level: 0, maxLevel: 1
    },
    {
    img: 'star.png', name: 'Star Power', desc: 'Each Rebirth gives +5% Scrap gain (multiplicative).',
        rebirth: 0, price: 300, scrapPrice: 10000000, brickPrice: 0, tilesPrice: 1400, level: 0, maxLevel: 1
    },
    {
        img: 'master.png', name: 'Master Tokens Storm', desc: '3.5% chance Storm becomes a Master Token Storm. Each collected token grants +10 Master Tokens.',
        rebirth: 0, price: 60, scrapPrice: 0, brickPrice: 0, tilesPrice: 0, level: 0, maxLevel: 1
    },
    {
    img: 'mysterybook.png',
        name: 'ScrapYard Mastery',
    desc: 'Unlocks Scrapyard Mastery training. Each level reduces Rebirth cost by 0.20%.',
        rebirth: 0,
        price: 450,
        scrapPrice: 12000000,
        brickPrice: 0,
        tilesPrice: 2000,
        level: 0,
        maxLevel: 1,
        path: [7]
    },
    {
        img: 'mysterybook.png',
        name: 'Buffed Barrels',
        desc: 'Extends Mystery Book barrel cap to level 10',
        rebirth: 0,
        price: 0,
        scrapPrice: 15000000,
        brickPrice: 0,
        tilesPrice: 2000,
        level: 0,
        maxLevel: 1,
        path: [7]
    },
];

function isBuffedBarrelsUnlocked() {
    return !!(treeUpgrades[10] && treeUpgrades[10].level > 0);
}

function getBuffedBarrelMultiplier(levelAchieved) {
    if (!isBuffedBarrelsUnlocked()) return 2;
    if (levelAchieved < 5) return 2;
    if (levelAchieved < 7) return 1.8;
    if (levelAchieved < 9) return 1.6;
    return 1.5;
}

function calculateBarrelCostForLevel(index, level) {
    let cost = INITIAL_BARREL_COSTS[index] || 1;
    for (let lvl = 1; lvl <= level; lvl++) {
        cost = Math.ceil(cost * getBuffedBarrelMultiplier(lvl));
    }
    return cost;
}

function refreshBarrelCost(index) {
    barrelCosts[index] = calculateBarrelCostForLevel(index, barrelLevels[index] || 0);
}

function refreshAllBarrelCosts() {
    for (let i = 0; i < barrelCosts.length; i++) refreshBarrelCost(i);
}

function updateBarrelMaxLevelFromTree() {
    barrelMaxLevel = isBuffedBarrelsUnlocked() ? BUFFED_BARREL_MAX_LEVEL : BASE_BARREL_MAX_LEVEL;
    refreshAllBarrelCosts();
}

var selectedTreeUpgrade = 0;

// Storm system variables
const STORM_INTERVAL_MS = 4 * 60 * 1000;
const STORM_DROP_COUNT = 30;
const STORM_DROP_SPACING_MS = 200; // ms between each tire drop
let nextStormTime = null;
let stormActive = false;
let stormPurchased = false;

// NOTE: Storm no longer persists mid-flight across page refresh.
// On load, if a storm was active it is discarded and a fresh full timer starts (see savescript.js loadGame logic).

function showStormTimer() {
    const el = document.getElementById('storm-timer');
    if (el) {
        el.classList.add('storm-owned');
        el.style.display = 'block';
    }
}

function scheduleNextStorm(fromNow) {
    const now = Date.now();
    if (fromNow || !nextStormTime || nextStormTime <= now) {
        nextStormTime = now + STORM_INTERVAL_MS;
    }
}

function spawnStormCloud() {
    let cloud = document.getElementById('storm-cloud');
    if (!cloud) {
        cloud = document.createElement('div');
        cloud.id = 'storm-cloud';
        document.body.appendChild(cloud);
    }
    cloud.classList.add('active');
    if (STATS) STATS.stormsOccurred += 1;
    stormActive = true;
    const brickStormUnlocked = treeUpgrades && treeUpgrades[6] && treeUpgrades[6].level > 0;
    const starPowerUnlocked = treeUpgrades && treeUpgrades[7] && treeUpgrades[7].level > 0; // not used here, just example
    const masterStormUnlocked = treeUpgrades && treeUpgrades[8] && treeUpgrades[8].level > 0;
    // Determine storm variant using disjoint ranges so both can appear across storms
    // When both are unlocked: 3.5% Master, next 3.5% Brick (total 7%)
    // When only one unlocked: that one gets 3.5%
    const roll = Math.random();
    let isMasterStorm = false;
    let isBrickStorm = false;
    if (masterStormUnlocked && brickStormUnlocked) {
        if (roll < 0.035) {
            isMasterStorm = true;
        } else if (roll < 0.07) {
            isBrickStorm = true;
        }
    } else if (masterStormUnlocked) {
        if (roll < 0.035) isMasterStorm = true;
    } else if (brickStormUnlocked) {
        if (roll < 0.035) isBrickStorm = true;
    }
    for (let i = 0; i < STORM_DROP_COUNT; i++) {
        setTimeout(() => {
            if (STATS) STATS.tiresSpawned += 1;
            if (isMasterStorm) {
                if (typeof createFallingMasterToken === 'function') createFallingMasterToken();
                else if (typeof createFallingTire === 'function') createFallingTire();
            } else if (isBrickStorm && typeof createFallingBrick === 'function') {
                createFallingBrick();
            } else if (typeof createFallingTire === 'function') {
                createFallingTire();
            }
            if (i === STORM_DROP_COUNT - 1) {
                setTimeout(() => {
                    cloud.classList.remove('active');
                    stormActive = false;
                    scheduleNextStorm(true);
                }, 1500);
            }
        }, i * STORM_DROP_SPACING_MS);
    }
}
// Brick falling entity for BrickStorm
function createFallingBrick() {
    const el = document.createElement('img');
    el.src = 'assets/brick.png';
    el.style.cssText = `
        position: fixed;
        width: 64px; height: 64px; /* +~15% size */
        z-index: 999;
        pointer-events: auto; cursor: pointer;
        top: -80px; left: ${Math.random() * (window.innerWidth - 64)}px;
        animation: fallDown 3s linear; transition: transform 0.1s;
    `;
    let handled = false;
    const collect = () => {
        if (handled) return; handled = true;
        const mult = (typeof getDropMultiplier === 'function') ? getDropMultiplier() : 1;
        bricks += (1 * mult);
        updateBrickUI();
        el.style.transform = 'scale(1.15)';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 100);
        if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
    };
    el.addEventListener('mouseenter', collect);
    el.addEventListener('click', collect);
    el.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} collect(); }, { passive: false });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1.0)'; });
    if (!document.getElementById('tire-animation')) {
        const style = document.createElement('style');
        style.id = 'tire-animation';
        style.textContent = `@keyframes fallDown { from { top: -70px; } to { top: ${window.innerHeight + 70}px; } }`;
        document.head.appendChild(style);
    }
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
}

// Master Token falling entity for Master Tokens Storm
function createFallingMasterToken() {
    const el = document.createElement('div');
    el.className = 'falling-master-token';
    el.style.left = Math.random() * (window.innerWidth - 48) + 'px';
    const speed = 4 + Math.random() * 3;
    let y = -48;
    // 20% larger inner icon
    el.innerHTML = '<img src="assets/master.png" alt="Master Token" style="width:38px;height:38px;image-rendering:pixelated;" />';
    document.body.appendChild(el);
    function step() {
        y += speed;
        el.style.top = y + 'px';
        if (y > window.innerHeight) {
            el.remove();
            return;
        }
        requestAnimationFrame(step);
    }
    // Collect on hover (mouseenter) and also on click/touch for mobile
    const collect = () => {
        const dropMult = (typeof getDropMultiplier === 'function') ? getDropMultiplier() : 1;
        const tokenMult = (typeof getMasterTokenMultiplier === 'function') ? getMasterTokenMultiplier() : 1;
        const gain = 10 * dropMult * tokenMult; // base +10 per token, modified by active boosts (non-stacking due to single-item rule)
        masterTokens += gain;
        if (STATS) STATS.masterTokensCollected = (STATS.masterTokensCollected||0) + gain;
        updateMasterTokenUI && updateMasterTokenUI();
        el.remove();
    };
    el.addEventListener('mouseenter', collect);
    el.addEventListener('click', collect);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); collect(); }, { passive: false });
    requestAnimationFrame(step);
}

function updateStormTimer() {
    if (!stormPurchased) return;
    const el = document.getElementById('storm-timer');
    if (!el) return;
    const now = Date.now();

    // Catch-up: if time passed, trigger storm immediately (one cycle at a time)
    if (!stormActive && nextStormTime && now >= nextStormTime) {
        spawnStormCloud();
        return; // cloud schedule will set nextStormTime
    }

    const remaining = nextStormTime ? (nextStormTime - now) : 0;
    if (remaining <= 0) {
        el.textContent = '00:00';
    } else {
        const totalSec = Math.floor(remaining / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
}

setInterval(updateStormTimer, 1000);

function initStormAfterLoad() {
    const stormIndex = treeUpgrades.findIndex(t => t.name === 'Storm');
    if (stormIndex !== -1 && treeUpgrades[stormIndex].level > 0) {
        stormPurchased = true;
        showStormTimer();
        if (!nextStormTime) scheduleNextStorm(true);
    }
}

// Tire system functions
function startTireInterval() {
    if (tireInterval) clearInterval(tireInterval);
    tireInterval = setInterval(() => {
        if (STATS) STATS.tiresSpawned += 1;
        createFallingTire();
    console.log(`🛞 Tire spawned! Hover it to get +1 Tires!`);
    }, 60000); // Every 60 seconds
}

function stopTireInterval() {
    if (tireInterval) {
        clearInterval(tireInterval);
        tireInterval = null;
    }
}

function createFallingTire() {
    const tire = document.createElement('img');
    tire.src = 'assets/tires.png';
    tire.style.cssText = `
        position: fixed;
        width: 69px; /* +15% */
        height: 69px; /* +15% */
        z-index: 999;
        pointer-events: auto;
        cursor: pointer;
        top: -80px;
        left: ${Math.random() * (window.innerWidth - 69)}px;
        animation: fallDown 3s linear;
        transition: transform 0.1s;
    `;
    
    // Add hover/touch/click handler for +Tiles (zbierasz po nakierowaniu kursora lub tapnięciu)
    let handled = false;
    const collect = () => {
        if (handled) return; handled = true;
        // Tiles gained per tire is Level + 1 (so Level 0 -> 1 Tiles, Level 4 -> 5 Tiles)
        let tilesPerPickup = (typeof tilesLevel !== 'undefined') ? (tilesLevel + 1) : 1;
        if (blueUpgrades.tires && blueUpgrades.tires.level >= 1) {
            tilesPerPickup += (blueUpgrades.tires.perLevelBonus * blueUpgrades.tires.level); // +2 per level
        }
        const mult = (typeof getDropMultiplier === 'function') ? getDropMultiplier() : 1;
        const gainTiles = tilesPerPickup * mult;
        tiles += gainTiles;
        if (STATS) {
            STATS.tiresCollected += 1;
            STATS.tilesEarned += gainTiles;
            STATS.peakTiles = Math.max(STATS.peakTiles || 0, tiles);
        }
        try { updatePeaksAfterTilesChange(); requestSyncLeaderboard(); } catch {}
        tires += 1; // Keep track of total tires collected
        updateTilesUI();
    console.log(`🛞 Tire hovered! +${gainTiles} Tires! Total tires currency: ${tiles}, Tires collected: ${tires}`);
        
        // Visual feedback
        tire.style.transform = 'scale(1.2)';
        setTimeout(() => {
            if (tire.parentNode) {
                tire.parentNode.removeChild(tire);
            }
        }, 100);
        
        // Save progress
        if (typeof saveSystem !== 'undefined') {
            saveSystem.saveGame();
        }
    };
    tire.addEventListener('mouseenter', collect);
    tire.addEventListener('click', collect);
    tire.addEventListener('touchstart', (e) => { try { e.preventDefault(); } catch {} collect(); }, { passive: false });
    
    // Add additional hover effect for visual feedback
    tire.addEventListener('mouseleave', () => {
        tire.style.transform = 'scale(1.0)';
    });
    
    // Add CSS animation if not exists
    if (!document.getElementById('tire-animation')) {
        const style = document.createElement('style');
        style.id = 'tire-animation';
        style.textContent = `
            @keyframes fallDown {
                from { top: -80px; transform: rotate(0deg); }
                to { top: ${window.innerHeight + 80}px; transform: rotate(720deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(tire);
    
    // Remove tire after animation
    setTimeout(() => {
        if (tire.parentNode) {
            tire.parentNode.removeChild(tire);
        }
    }, 3000);
}

function updateBrickUI() {
    if (brickCounter) {
        brickCounter.textContent = `Brick: ${bricks}`;
        // Pokazuj Brick od 5 rebirth
        if (rebirthCount >= 5) {
            brickCounter.classList.remove('hidden');
        } else {
            brickCounter.classList.add('hidden');
        }
    }
}

function updateTilesUI() {
    // Tiles counter visibility still depends on Tires tree upgrade (index 1)
    if (tilesCounter) {
        tilesCounter.textContent = `Tires: ${tiles}`;
        const tiresUnlocked = treeUpgrades && treeUpgrades[1] && treeUpgrades[1].level > 0;
        tilesCounter.classList.toggle('hidden', !tiresUnlocked);
        if (tilesContainer) tilesContainer.classList.toggle('hidden', !tiresUnlocked);
        if (tiresUnlocked) {
            clearInterval(tireInterval);
            tireInterval = setInterval(() => { if (STATS) STATS.tiresSpawned += 1; createFallingTire(); }, 60000);
        } else {
            clearInterval(tireInterval);
        }
    }

    // TilesYard purchase gating by TiresYard tree upgrade (index 4)
    const tilesYardUnlocked = treeUpgrades && treeUpgrades[4] && treeUpgrades[4].level > 0;
    if (tilesyardStatus && !tilesYardUnlocked) {
        tilesyardStatus.textContent = 'Locked: Buy TiresYard in Tree';
    } else if (tilesyardStatus && tilesYardUnlocked) {
        const cost = getTilesTierCost();
        tilesyardStatus.textContent = `Cost: ${cost} Tires`;
    }

    if (tilesUpgradeLevelLabel) tilesUpgradeLevelLabel.textContent = `Tier: ${tilesTier}/${tilesTierMax}`;
    if (tilesLevelLabel) tilesLevelLabel.textContent = `Level: ${tilesLevel}`;
    if (tilesUpgradeBtn) {
        if (!tilesYardUnlocked) {
            tilesUpgradeBtn.disabled = true;
            tilesUpgradeBtn.textContent = 'Locked';
            tilesUpgradeBtn.title = 'Unlock via TiresYard in Tree';
        } else {
            const cost = getTilesTierCost();
            const canUpgrade = (tilesTier < tilesTierMax) && (tiles >= cost);
            tilesUpgradeBtn.disabled = !canUpgrade;
            tilesUpgradeBtn.textContent = (tilesTier < tilesTierMax) ? 'Upgrade' : 'Tier Maxed';
            tilesUpgradeBtn.title = `Cost: ${cost} Tires`;
        }
    }
}

function updateMasterTokenUI() {
    if (masterTokenCount) {
        masterTokenCount.textContent = `Master Tokens: ${masterTokens}`;
    }
}

function updateScrapyardMasteryUI() {
    const unlocked = isScrapyardMasteryUnlocked();
    const reductionPercent = getScrapyardMasteryReductionPercent().toFixed(2);

    if (scrapyardMasteryIcon) {
        scrapyardMasteryIcon.classList.toggle('hidden', !unlocked);
        const title = unlocked
            ? `Scrapyard Mastery: -${reductionPercent}% Rebirth cost`
            : 'Unlock Scrapyard Mastery in the Tree to train it.';
        scrapyardMasteryIcon.setAttribute('title', title);
    }

    if (scrapyardMasteryBadge) {
        if (unlocked) {
            scrapyardMasteryBadge.textContent = `-${reductionPercent}%`;
            scrapyardMasteryBadge.style.display = 'inline-block';
        } else {
            scrapyardMasteryBadge.style.display = 'none';
        }
    }

    if (scrapyardMasteryTierLabel) {
        scrapyardMasteryTierLabel.textContent = `Tier: ${scrapyardMasteryTier}/${SCRAPYARD_MASTERY_TIER_MAX}`;
    }
    if (scrapyardMasteryLevelLabel) {
        scrapyardMasteryLevelLabel.textContent = `Level: ${scrapyardMasteryLevel}`;
    }
    if (scrapyardMasteryReductionLabel) {
        scrapyardMasteryReductionLabel.textContent = `Rebirth Cost Bonus: -${reductionPercent}%`;
    }
    if (scrapyardMasteryMultiplierLabel) {
        const nextLevelIndex = scrapyardMasteryLevel + 1;
        const nextMultiplier = getScrapyardMasteryLevelMultiplier(nextLevelIndex);
        scrapyardMasteryMultiplierLabel.textContent = `Next Level Cost Multiplier: x${nextMultiplier.toFixed(2)}`;
    }
    const tierCost = getScrapyardMasteryTierCost();
    if (scrapyardMasteryCostLabel) {
        scrapyardMasteryCostLabel.textContent = `Cost per Tier: ${tierCost.toLocaleString()} Scrap`;
        if (unlocked) {
            scrapyardMasteryCostLabel.classList.toggle('insufficient', scraps < tierCost);
        } else {
            scrapyardMasteryCostLabel.classList.remove('insufficient');
        }
    }
    if (scrapyardMasteryButton) {
        scrapyardMasteryButton.disabled = !unlocked;
    }
    if (!unlocked && scrapyardMasteryWindow && scrapyardMasteryWindow.classList.contains('active')) {
        closeScrapyardMasteryWindow();
    }
}

function openScrapyardMasteryWindow() {
    if (!isScrapyardMasteryUnlocked() || !scrapyardMasteryWindow) return;
    scrapyardMasteryWindow.classList.remove('hidden');
    scrapyardMasteryWindow.classList.add('active');
    updateScrapyardMasteryUI();
}

function closeScrapyardMasteryWindow() {
    if (!scrapyardMasteryWindow) return;
    scrapyardMasteryWindow.classList.add('hidden');
    scrapyardMasteryWindow.classList.remove('active');
}

function attemptScrapyardMasteryTier() {
    if (!isScrapyardMasteryUnlocked()) return;
    const tierCost = getScrapyardMasteryTierCost();
    if (scraps < tierCost) {
        if (scrapyardMasteryCostLabel) scrapyardMasteryCostLabel.classList.add('insufficient');
        alert(`You need ${tierCost.toLocaleString()} Scrap to train a tier.`);
        return;
    }

    scraps -= tierCost;
    if (scrapyardMasteryCostLabel) scrapyardMasteryCostLabel.classList.remove('insufficient');
    scrapyardMasteryTier += 1;
    if (scrapyardMasteryTier >= SCRAPYARD_MASTERY_TIER_MAX) {
        scrapyardMasteryTier = 0;
        scrapyardMasteryLevel += 1;
        scrapyardMasteryTierCostCache.clear();
        console.log(`🏗️ Scrapyard Mastery leveled up! Level ${scrapyardMasteryLevel} (-${getScrapyardMasteryReductionPercent().toFixed(2)}% rebirth cost).`);
    } else {
        console.log(`⚙️ Scrapyard Mastery tier ${scrapyardMasteryTier}/${SCRAPYARD_MASTERY_TIER_MAX}.`);
    }

    persistScrapyardMasteryProgress();
    updateScrapCounter();
    updateScrapyardMasteryUI();
    updateRebirthUI();
    if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
}

function updateMysteryBookUI() {
    document.querySelectorAll('.mysterybook-item').forEach((item, index) => {
        const levelElement = item.querySelector('.mysterybook-level');
        const costElement = item.querySelector('.mysterybook-cost');
        const button = item.querySelector('.mysterybook-button');
        
        // Sprawdź wymagany rebirth dla tego barrel (scrap=0, barrel1=1, barrel2=2, itd.)
        const requiredRebirth = index;
        const isUnlocked = rebirthCount >= requiredRebirth;
        
        levelElement.textContent = `Level: ${barrelLevels[index]}/${barrelMaxLevel}`;
        costElement.textContent = `Cost: ${barrelCosts[index]} Master Token`;
        
        if (!isUnlocked) {
            button.disabled = true;
            button.textContent = `Requires ${requiredRebirth} Rebirth`;
            item.style.opacity = '0.5';
        } else {
            button.textContent = 'Upgrade';
            item.style.opacity = '1';
            button.disabled = barrelLevels[index] >= barrelMaxLevel || masterTokens < barrelCosts[index];
        }
    });
    if (scrapyardStatusIcon) {
        const hasScrapyardMystery = (barrelLevels[0] || 0) > 0;
        scrapyardStatusIcon.classList.toggle('hidden', !hasScrapyardMystery);
    }
    updateScrapyardMasteryUI();
}

function updateGreenUpgradeBonus(index) {
    const greenUpgradeText = document.querySelectorAll('.greenupgrade-text')[index];
    const baseBonus = index; // Bazowy bonus: scrap=0, barrel1=1, barrel2=2, itd.
    const totalBonus = baseBonus + barrelLevels[index]; // Każdy poziom dodaje +1 Scrap/Click
    greenUpgradeText.textContent = `+${totalBonus} Scrap/Click`;
}

function handleMysteryBookUpgrade(index) {
    // Sprawdź wymagany rebirth dla tego barrel
    const requiredRebirth = index;
    if (rebirthCount < requiredRebirth) {
        alert(`You need at least ${requiredRebirth} rebirths to upgrade this barrel!`);
        return;
    }
    
    if (barrelLevels[index] < barrelMaxLevel) {
        const cost = barrelCosts[index];
        if (masterTokens >= cost) {
            if (STATS) STATS.masterTokensSpent += cost;
            masterTokens -= cost;
            barrelLevels[index]++;
            refreshBarrelCost(index); // Recalculate cost based on current scaling tier
            updateMasterTokenUI();
            updateMysteryBookUI();
            updateGreenUpgradeBonus(index); // Update greenupgrade bonus
        } else {
            alert('You don\'t have enough Master Tokens!');
        }
    } else {
        alert('Maximum level reached for this barrel!');
    }
}

// TilesYard upgrade handler: spend 1 Tiles to increase Tier (0..10). When Tier reaches 10, reset Tier to 0 and increase Level by 1.
function handleTilesUpgrade() {
    // Disallow if Tree Upgrade 3 (index 2) not purchased
    if (!treeUpgrades || !treeUpgrades[2] || treeUpgrades[2].level === 0) return;
    if (tilesTier >= tilesTierMax) return;
    const cost = getTilesTierCost();
    if (tiles < cost) return;
    if (STATS) STATS.tilesSpent += cost;
    tiles -= cost;
    tilesTier += 1;
    if (tilesTier >= tilesTierMax) {
        tilesTier = 0;
        tilesLevel += 1;
    }
    updateTilesUI();
    if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
}

// Tree functions
function updateTreeUI() {
    updateBarrelMaxLevelFromTree();
    // Render each upgrade into its fixed slot to match the SVG lines
    const slots = [0,1,2,3,4,5,6,7,8,9,10];
    // Direct mapping now aligns with numeric slot order
    const SLOT_FOR = { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10 };
    // Clear previous items
    slots.forEach(i => {
        const slot = document.getElementById(`slot-${i}`);
        if (slot) slot.innerHTML = '';
    });

    // Insert items
    for (let i = 0; i < treeUpgrades.length; i++) {
    const slotId = SLOT_FOR[i] ?? i;
        const slot = document.getElementById(`slot-${slotId}`);
        if (!slot) continue;
        const upg = treeUpgrades[i];
        const cls = getTreeItemClass(i);
        const div = document.createElement('div');
        div.className = `tree-item ${cls}`;
        div.id = `tree-item-${i}`;
        const img = document.createElement('img');
        img.src = `assets/${upg.img}`;
        img.alt = 'Tree Upgrade';
        img.id = `tree-item-${i}-img`;
        div.appendChild(img);
        slot.appendChild(div);
    }

    addTreeListeners();
}

function getTreeItemClass(index) {
    const upgrade = treeUpgrades[index];
    if (upgrade.level > 0) return 'purchased';
    
    // Check dependencies based on the tree structure
    switch(index) {
        case 0: // Better Scrapyard (1) - no dependencies
            return 'available';
        case 1: // Tires - requires Better Scrapyard
            return treeUpgrades[0].level > 0 ? 'available' : 'locked';
        case 2: // Blue Upgrades (central chain) - requires Tires
            return treeUpgrades[1].level > 0 ? 'available' : 'locked';
        case 3: // Best Scrapyard - requires Better
            return treeUpgrades[0].level > 0 ? 'available' : 'locked';
        case 4: // TiresYard (prawa odnoga) - requires Tires
            return treeUpgrades[1].level > 0 ? 'available' : 'locked';
        case 5: // Storm - requires Blue Upgrades (index 2)
            return treeUpgrades[2].level > 0 ? 'available' : 'locked';
        case 6: // Brick Storm - requires Storm
            return treeUpgrades[5].level > 0 ? 'available' : 'locked';
        case 8: // Master Tokens Storm - requires Storm
            return treeUpgrades[5].level > 0 ? 'available' : 'locked';
        case 7: // Star Power - requires Brick Storm AND Master Tokens Storm
            return (treeUpgrades[6].level > 0 && treeUpgrades[8].level > 0) ? 'available' : 'locked';
        case 9: // ScrapYard Mastery - requires Star Power
    case 10: // Buffed Barrels - requires Star Power
            return treeUpgrades[7].level > 0 ? 'available' : 'locked';
        default:
            return 'locked';
    }
}

function updateTreeInfoWindow(index) {
    let upg = treeUpgrades[index];
    
    // Do not block opening the window on missing dependencies; just show requirements and let click handler validate
    
    selectedTreeUpgrade = index;

    treeInfoWindow.classList.remove('hidden');
    treeInfoWindow.classList.add('active');

    // add tree dependencies
    let requiredUpgrades = [];
    let requiredUpgradesText = "";
    let allPaths = true;

    if (upg.path != undefined) requiredUpgrades = upg.path;
    for (let p in requiredUpgrades) {
        requiredUpgradesText = requiredUpgradesText + (p != 0 ? ", " : "") + treeUpgrades[requiredUpgrades[p]].name;
        if (treeUpgrades[requiredUpgrades[p]].level < 1) allPaths = false;
    }

    // Check special requirements for upgrades
    let canAfford = true;
    let requirementText = `Required: ${upg.rebirth} Rebirth`;
    if (index === 0) { // Better Scrapyard
        requirementText += `, Scrapyard, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap`;
        canAfford = scrapyardPurchased && bricks >= upg.brickPrice && scraps >= upg.scrapPrice;
    } else if (index === 1) { // Tires
        requirementText += `, Better Scrapyard, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.price} Master Tokens`;
        canAfford = treeUpgrades[0].level >= 1 && bricks >= upg.brickPrice && scraps >= upg.scrapPrice && masterTokens >= upg.price;
    } else if (index === 2) { // Blue Upgrades unlock (requires Tires)
        const tiresOwned = treeUpgrades[1].level >= 1;
        requirementText += `, Tires Upgrade, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = tiresOwned && bricks >= (upg.brickPrice||0) && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (index === 3) { // Best Scrapyard - multi-currency cost (index 3 now)
        requirementText += `, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (index === 4) { // TiresYard unlock (requires Tires)
        const tiresOwned = treeUpgrades[1].level >= 1;
        requirementText += `, Tires Upgrade, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = tiresOwned && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= (upg.price||0);
    } else if (upg.name === 'Storm') {
        requirementText += `, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= upg.price;
    } else if (upg.name === 'Brick Storm') {
        requirementText += `, requires Storm, ${upg.brickPrice} Brick, ${upg.scrapPrice.toLocaleString()} Scrap`;
        canAfford = (treeUpgrades[5] && treeUpgrades[5].level > 0) && bricks >= (upg.brickPrice||0) && scraps >= (upg.scrapPrice||0);
    } else if (upg.name === 'Master Tokens Storm') {
        requirementText += `, requires Storm, ${upg.price} Master Tokens`;
        canAfford = (treeUpgrades[5] && treeUpgrades[5].level > 0) && masterTokens >= upg.price;
    } else if (upg.name === 'Star Power') {
        requirementText += `, requires Brick Storm & Master Tokens Storm, ${upg.scrapPrice.toLocaleString()} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = (treeUpgrades[6] && treeUpgrades[6].level > 0) && (treeUpgrades[8] && treeUpgrades[8].level > 0) && scraps >= (upg.scrapPrice||0) && tiles >= (upg.tilesPrice||0) && masterTokens >= upg.price;
    } else if (upg.name === 'ScrapYard Mastery') {
        requirementText += `, requires Star Power, ${upg.scrapPrice.toLocaleString()} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = (treeUpgrades[7] && treeUpgrades[7].level > 0) && scraps >= (upg.scrapPrice||0) && tiles >= (upg.tilesPrice||0) && masterTokens >= (upg.price||0);
    } else if (upg.name === 'Buffed Barrels') {
        requirementText += `, requires Star Power, ${upg.scrapPrice.toLocaleString()} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = (treeUpgrades[7] && treeUpgrades[7].level > 0) && scraps >= (upg.scrapPrice||0) && tiles >= (upg.tilesPrice||0) && masterTokens >= (upg.price||0);
    } else {
        requirementText += `, ${upg.price} Master Tokens`;
        canAfford = masterTokens >= upg.price;
    }

    // Aktualizuj informacje w oknie
    if (treeInfoStatus) {
        treeInfoStatus.textContent = `Current Rebirth: ${rebirthCount}`;
    }
    if (treeInfoTokens) {
        treeInfoTokens.textContent = `Master Tokens: ${masterTokens}`;
    }
    if (treeInfoRequirement2) {
        treeInfoRequirement2.textContent = (requiredUpgrades.length > 0 ? "Upgrades: " + requiredUpgradesText : "");
    }
    if (treeInfoRequirement) {
        if (upg.level == upg.maxLevel) treeInfoRequirement.textContent = "Maxed!";
        else treeInfoRequirement.textContent = requirementText;
    }
    if (treeInfoTitle) {
        treeInfoTitle.textContent = upg.name;
    }
    if (treeInfoDescription) {
        treeInfoDescription.textContent = upg.desc;
    }
    
    // Pokaż przycisk upgrade - zawsze widoczny, ale zmienia stan
    if (treeInfoBuyBtn) {
        treeInfoBuyBtn.removeAttribute('data-state');
        if (upg.level >= upg.maxLevel) {
            // Już kupiony
            treeInfoBuyBtn.textContent = "Bought";
            treeInfoBuyBtn.disabled = true;
            treeInfoBuyBtn.setAttribute('data-state', 'bought');
            treeInfoBuyBtn.classList.remove('hidden');
    } else if (rebirthCount >= upg.rebirth && allPaths) {
            // Dostępny do kupna
            treeInfoBuyBtn.removeAttribute('data-state');
            if (index === 0) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap`;
            } else if (index === 1) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.price} Master Tokens`;
            } else if (index === 2) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 3) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 4) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Brick Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice.toLocaleString()} Scrap`;
            } else if (upg.name === 'Master Tokens Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            } else if (upg.name === 'Star Power') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'ScrapYard Mastery') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Buffed Barrels') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires`;
            } else {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            }
            treeInfoBuyBtn.disabled = !canAfford;
            treeInfoBuyBtn.classList.remove('hidden');
        } else {
            // Zablokowany (rebirth/paths) – nadal pokaż przycisk i pozwól kliknąć, handler pokaże komunikat
            treeInfoBuyBtn.removeAttribute('data-state');
            if (index === 0) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap`;
            } else if (index === 1) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.price} Master Tokens`;
            } else if (index === 2) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 3) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 4) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Brick Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice.toLocaleString()} Scrap`;
            } else if (upg.name === 'Master Tokens Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            } else if (upg.name === 'Star Power') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'ScrapYard Mastery') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Buffed Barrels') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice.toLocaleString()} Scrap + ${upg.tilesPrice} Tires`;
            } else {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            }
            treeInfoBuyBtn.disabled = false;
            treeInfoBuyBtn.classList.remove('hidden');
        }
    }
}

function handleTreeUpgrade(index) {
    let upg = treeUpgrades[index];

    if (index === 9) {
        const starPowerUnlocked = treeUpgrades[7] && treeUpgrades[7].level > 0;
        if (!starPowerUnlocked) {
            alert('Unlock Star Power first!');
            return;
        }
        if (upg.level >= upg.maxLevel) {
            alert('Scrapyard Mastery is already unlocked!');
            return;
        }

        const costScrap = upg.scrapPrice || 0;
        const costTiles = upg.tilesPrice || 0;
        const costTokens = upg.price || 0;
        if ((scraps || 0) < costScrap) {
            alert('You don\'t have enough Scrap! Need: ' + costScrap.toLocaleString());
            return;
        }
        if ((tiles || 0) < costTiles) {
            alert('You don\'t have enough Tires! Need: ' + costTiles);
            return;
        }
        if ((masterTokens || 0) < costTokens) {
            alert('You don\'t have enough Master Tokens! Need: ' + costTokens);
            return;
        }

        if (STATS) {
            STATS.scrapSpent += costScrap;
            STATS.tilesSpent = (STATS.tilesSpent || 0) + costTiles;
            STATS.masterTokensSpent += costTokens;
        }
        scraps -= costScrap;
        tiles -= costTiles;
        masterTokens -= costTokens;

        upg.level = upg.maxLevel;
        if (treeInfoBuyBtn) treeInfoBuyBtn.classList.add('hidden');
        updateScrapCounter();
        updateTilesUI();
        updateMasterTokenUI();
        updateTreeUI();
        updateScrapyardMasteryUI();
        if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();
        if (typeof updateRebirthUI === 'function') updateRebirthUI();
        if (typeof saveSystem !== 'undefined') {
            try { saveSystem.saveGame(); } catch {}
        }
        console.log('🏗️ Scrapyard Mastery unlocked. Training available.');
        return;
    }

    if (index === 10) {
        const starPowerUnlocked = treeUpgrades[7] && treeUpgrades[7].level > 0;
        if (!starPowerUnlocked) {
            alert('Unlock Star Power first!');
            return;
        }
        if (upg.level >= upg.maxLevel) {
            alert('Buffed Barrels upgrade already purchased!');
            return;
        }

        const costScrap = upg.scrapPrice || 0;
        const costTiles = upg.tilesPrice || 0;
        const costTokens = upg.price || 0;
        if ((scraps || 0) < costScrap) {
            alert('You don\'t have enough Scrap! Need: ' + costScrap.toLocaleString());
            return;
        }
        if ((tiles || 0) < costTiles) {
            alert('You don\'t have enough Tires! Need: ' + costTiles);
            return;
        }
        if ((masterTokens || 0) < costTokens) {
            alert('You don\'t have enough Master Tokens! Need: ' + costTokens);
            return;
        }

        if (STATS) {
            STATS.scrapSpent += costScrap;
            STATS.tilesSpent = (STATS.tilesSpent || 0) + costTiles;
            STATS.masterTokensSpent += costTokens;
        }
        scraps -= costScrap;
        tiles -= costTiles;
        masterTokens -= costTokens;

        upg.level = upg.maxLevel;
        updateBarrelMaxLevelFromTree();
        if (treeInfoBuyBtn) treeInfoBuyBtn.classList.add('hidden');
        updateScrapCounter();
        updateTilesUI();
        updateMasterTokenUI();
        updateMysteryBookUI();
        refreshAllBarrelCosts();
        updateTreeUI();
        console.log('📚 Buffed Barrels unlocked! Mystery Book barrels can now reach level 10 with softened scaling.');
        if (typeof saveSystem !== 'undefined') {
            try { saveSystem.saveGame(); } catch {}
        }
        return;
    }

    if (index === 0) { // Better Scrapyard - special requirements
        if (rebirthCount >= upg.rebirth && scrapyardPurchased && bricks >= upg.brickPrice && scraps >= upg.scrapPrice && upg.level < upg.maxLevel) {
            // Handle upgrade - deduct Brick and Scrap instead of Master Tokens
            bricks -= upg.brickPrice;
            if (STATS) STATS.scrapSpent += upg.scrapPrice;
            scraps -= upg.scrapPrice;
            upg.level++;

            // Better Scrapyard effect - apply best available rate (respect Best Scrapyard if owned)
            if (scrapyardPurchased) {
                const better = true; // we just purchased Better
                const best = treeUpgrades && treeUpgrades[3] && treeUpgrades[3].level > 0;
                const perSecond = best ? 300 : (better ? 100 : 100/60);
                if (scrapyardInterval) clearInterval(scrapyardInterval);
                scrapyardInterval = setInterval(() => {
                    scraps += perSecond;
                    counter.textContent = `Scrap: ${scraps}`;
                }, 1000);
            }

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            if (counter) updateScrapCounter();
            updateTreeUI();

            console.log('🌳 Better Scrapyard upgraded!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (!scrapyardPurchased) {
            alert('You need to own a Scrapyard first!');
        } else if (bricks < upg.brickPrice) {
            alert('You don\'t have enough Bricks!');
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap!');
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (index === 1) { // Tires upgrade - special requirements
        if (rebirthCount >= upg.rebirth && 
            treeUpgrades[0].level >= 1 && // Requires previous upgrade (Better Scrapyard)
            bricks >= upg.brickPrice && 
            scraps >= upg.scrapPrice && 
            masterTokens >= upg.price && 
            upg.level < upg.maxLevel) {
            
            // Handle upgrade - deduct all currencies
            bricks -= upg.brickPrice;
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.masterTokensSpent += upg.price; }
            scraps -= upg.scrapPrice;
            masterTokens -= upg.price;
            upg.level++;

            // Start tire system
            startTireInterval();

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            updateTilesUI(); // Refresh Tires counter visibility
            updateMasterTokenUI();
            if (counter) updateScrapCounter();
            updateTreeUI();

            console.log('🛞 Tires upgrade activated! Tires will fall every 60 seconds.');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (treeUpgrades[0].level < 1) {
            alert('You need to purchase Better Scrapyard first!');
        } else if (bricks < upg.brickPrice) {
            alert('You don\'t have enough Bricks! Need: ' + upg.brickPrice);
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (masterTokens < upg.price) {
            alert('You don\'t have enough Master Tokens! Need: ' + upg.price);
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (index === 2) { // Blue Upgrades unlock
        const tiresOwned = treeUpgrades[1].level >= 1;
        if (rebirthCount >= upg.rebirth && tiresOwned && bricks >= (upg.brickPrice||0) && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && upg.level < upg.maxLevel) {
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.tilesSpent = (STATS.tilesSpent||0) + upg.tilesPrice; }
            bricks -= (upg.brickPrice||0);
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            upg.level++;

            // Unlock Blue Upgrades UI
            if (blueUpgradeContainer) blueUpgradeContainer.classList.remove('hidden');

            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            updateTreeUI();
            console.log('🔵 Blue Upgrades unlocked!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (!tiresOwned) {
            alert('You need the Tires upgrade first!');
        } else if (bricks < (upg.brickPrice||0)) {
            alert('You don\'t have enough Bricks! Need: ' + (upg.brickPrice||0));
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (tiles < upg.tilesPrice) {
            alert('You don\'t have enough Tires! Need: ' + upg.tilesPrice);
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (index === 3) { // Best Scrapyard
        if (rebirthCount >= upg.rebirth && bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && upg.level < upg.maxLevel) {
            bricks -= upg.brickPrice;
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.tilesSpent = (STATS.tilesSpent||0) + upg.tilesPrice; }
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            upg.level++;

            // If scrapyard purchased, set its tick to 300 scrap per second
            if (scrapyardPurchased) {
                if (scrapyardInterval) clearInterval(scrapyardInterval);
                scrapyardInterval = setInterval(() => {
                    scraps += 300;
                    updateScrapCounter();
                }, 1000);
            }

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            updateTreeUI();
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (bricks < upg.brickPrice) {
            alert('You don\'t have enough Bricks! Need: ' + upg.brickPrice);
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (tiles < upg.tilesPrice) {
            alert('You don\'t have enough Tires! Need: ' + upg.tilesPrice);
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (index === 4) { // TiresYard unlock
        const tiresOwned = treeUpgrades[1].level >= 1;
        if (rebirthCount >= upg.rebirth && tiresOwned && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= (upg.price||0) && upg.level < upg.maxLevel) {
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.tilesSpent = (STATS.tilesSpent||0) + upg.tilesPrice; STATS.masterTokensSpent += (upg.price||0); }
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            masterTokens -= (upg.price||0);
            upg.level++;

            // Reveal TilesYard in UI
            if (tilesyardSection) tilesyardSection.classList.remove('hidden');
            if (tilesyardSeparator) tilesyardSeparator.classList.remove('hidden');
            if (tilesyardStatus) tilesyardStatus.textContent = 'Unlocked';

            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
            updateTilesUI();
            console.log('🏁 TiresYard unlocked!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (!tiresOwned) {
            alert('You need the Tires upgrade first!');
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (tiles < upg.tilesPrice) {
            alert('You don\'t have enough Tires! Need: ' + upg.tilesPrice);
        } else if (masterTokens < (upg.price||0)) {
            alert('You don\'t have enough Master Tokens! Need: ' + (upg.price||0));
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (upg.name === 'Storm') {
        if (rebirthCount >= upg.rebirth && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= upg.price && upg.level < upg.maxLevel) {
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            masterTokens -= upg.price;
            upg.level++;
            stormPurchased = true;
            showStormTimer();
            scheduleNextStorm(true);
            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            updateTreeUI();
            console.log('⛈️ Storm upgrade purchased!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (tiles < upg.tilesPrice) {
            alert('You don\'t have enough Tires! Need: ' + upg.tilesPrice);
        } else if (masterTokens < upg.price) {
            alert('You don\'t have enough Master Tokens! Need: ' + upg.price);
        } else {
            alert('This upgrade is already purchased!');
        }
    } else if (upg.name === 'Brick Storm') {
        // Requires Storm purchased and costs Brick + Scrap
        if (!(treeUpgrades[5] && treeUpgrades[5].level > 0)) {
            alert('You need to purchase Storm first!');
        } else if (upg.level >= upg.maxLevel) {
            alert('This upgrade is already purchased!');
        } else if ((bricks || 0) < (upg.brickPrice || 0)) {
            alert('You don\'t have enough Bricks! Need: ' + (upg.brickPrice||0));
        } else if ((scraps || 0) < (upg.scrapPrice || 0)) {
            alert('You don\'t have enough Scrap! Need: ' + (upg.scrapPrice||0).toLocaleString());
        } else {
            bricks -= (upg.brickPrice || 0);
            if (STATS) STATS.scrapSpent += (upg.scrapPrice || 0);
            scraps -= (upg.scrapPrice || 0);
            upg.level++;
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            if (counter) updateScrapCounter();
            updateTreeUI();
            console.log('🧱 Brick Storm purchased! 3.5% chance for BrickStorm activated.');
        }
    } else if (upg.name === 'Master Tokens Storm') {
        // Requires Storm and costs Master Tokens
        if (!(treeUpgrades[5] && treeUpgrades[5].level > 0)) {
            alert('You need to purchase Storm first!');
        } else if (upg.level >= upg.maxLevel) {
            alert('This upgrade is already purchased!');
        } else if ((masterTokens || 0) < (upg.price || 0)) {
            alert('You don\'t have enough Master Tokens! Need: ' + (upg.price || 0));
        } else {
            masterTokens -= (upg.price || 0);
            upg.level++;
            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTreeUI();
            console.log('💠 Master Tokens Storm purchased! 3.5% chance for Token Storm activated.');
        }
    } else if (upg.name === 'Star Power') {
        // Requires Brick Storm & Master Tokens Storm and costs Scrap + Tires + MT
        if (!(treeUpgrades[6] && treeUpgrades[6].level > 0)) {
            alert('You need to purchase Brick Storm first!');
        } else if (!(treeUpgrades[8] && treeUpgrades[8].level > 0)) {
            alert('You need to purchase Master Tokens Storm first!');
        } else if (upg.level >= upg.maxLevel) {
            alert('This upgrade is already purchased!');
        } else if ((scraps || 0) < (upg.scrapPrice || 0)) {
            alert('You don\'t have enough Scrap! Need: ' + (upg.scrapPrice || 0).toLocaleString());
        } else if ((tiles || 0) < (upg.tilesPrice || 0)) {
            alert('You don\'t have enough Tires! Need: ' + (upg.tilesPrice || 0));
        } else if ((masterTokens || 0) < (upg.price || 0)) {
            alert('You don\'t have enough Master Tokens! Need: ' + (upg.price || 0));
        } else {
            if (STATS) { STATS.scrapSpent += (upg.scrapPrice || 0); STATS.tilesSpent = (STATS.tilesSpent||0) + (upg.tilesPrice || 0); STATS.masterTokensSpent += (upg.price || 0); }
            scraps -= (upg.scrapPrice || 0);
            tiles -= (upg.tilesPrice || 0);
            masterTokens -= (upg.price || 0);
            upg.level++;
            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            updateTreeUI();
            console.log('⭐ Star Power acquired! 1.05^rebirth (~+5% per rebirth) Scrap multiplier active.');
        }
    } else {
        // Standard tree upgrade with Master Tokens
        if (rebirthCount >= upg.rebirth && masterTokens >= upg.price && upg.level < upg.maxLevel) {
            // Handle upgrade
            masterTokens -= upg.price;
            upg.level++;

            // UI
            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTreeUI();
            if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();

            // log
            console.log('🌳 Tree upgrade ' + index + ' purchased! ' + upg.name + ' unlocked!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (masterTokens < upg.price) {
            alert('You don\'t have enough Master Tokens!');
        } else {
            alert('This upgrade is already purchased!');
        }
    }

}

document.querySelectorAll('.mysterybook-button').forEach((button, index) => {
    button.addEventListener('click', () => handleMysteryBookUpgrade(index));
});

// Event listeners
upgradeBtn.addEventListener('click', () => {
    if (!upgradeWindow) return;
    upgradeWindow.classList.remove('hidden');
    upgradeWindow.classList.add('active');
    if (typeof updateUpgradeInfo === 'function') updateUpgradeInfo();
    if (typeof refreshUpgradeVisibility === 'function') refreshUpgradeVisibility();
    if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL && typeof showCooldownUpgrade === 'function') showCooldownUpgrade();
});
scrapImage.addEventListener('click', () => {
    if (!canClick) return;
    // Base gain
    let gained = calculateTotalScrap();
    // Funny Joke: every 3rd click gets multiplier x1.25 per level
    window.__clickCounter = (window.__clickCounter || 0) + 1;
    if (upgradeLevels[3] && (window.__clickCounter % 3 === 0)) {
        const fjLevel = Math.min(20, upgradeLevels[3]);
        const mult = Math.pow(1.25, fjLevel);
        gained *= mult;
    }
    // Mass Scrap: multiply the whole gain (including Funny Joke). 10 levels up to x12.
    if (upgradeLevels[4] && upgradeLevels[4] > 0) {
        const level = Math.min(10, upgradeLevels[4]);
        // Smooth curve to x12 at level 10. Example mapping: [1,1.2,1.5,2,3,4,6,8,10,12,12]
        const multByLevel = [1, 1.2, 1.5, 2, 3, 4, 6, 8, 10, 12, 12];
        const massMult = multByLevel[level];
        gained *= massMult;
    }
    // Stats
    if (STATS) {
        STATS.clicks.session += 1;
        STATS.clicks.total += 1;
        STATS.totalScrapEarned += gained;
        STATS.sessionScrapEarned = (STATS.sessionScrapEarned || 0) + gained;
        bumpHighestScraps(gained);
        bumpBestClick(gained);
    }

    // Apply scrap and update UI (after all multipliers)
    scraps += gained;
    if (counter) updateScrapCounter();
    if (typeof checkUpgradeUnlock === 'function') checkUpgradeUnlock();
    if (typeof updateScrapyardUI === 'function') updateScrapyardUI();
    // Prompt a debounced server sync so the leaderboard refreshes more promptly
    try { requestSyncLeaderboard(800); } catch {}

    // Bomblike removed

    // Master token gain rule (existing logic)
    if (Math.floor(scraps / 5) > masterTokens) {
        masterTokens++;
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
    }

    try {
        if (typeof isBoostActive === 'function' && isBoostActive('boost_master_tokens')) {
            masterTokens += 5;
            if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        }
    } catch {}

    // Start cooldown
    canClick = false;
    if (cooldownBar) cooldownBar.style.width = '0%';

    // Respect temporary cooldown override from boosts
    const overrideCd = (typeof getCooldownOverride === 'function') ? getCooldownOverride() : null;
    const effectiveCooldown = overrideCd != null ? overrideCd : currentCooldownTime;
    let timeLeft = effectiveCooldown;
    if (cooldownTimer) cooldownTimer.textContent = timeLeft.toFixed(2);

    const cooldownInterval = setInterval(() => {
        timeLeft -= 0.01;
    const percentage = Math.max(0, Math.min(100, (effectiveCooldown - timeLeft) / effectiveCooldown * 100));
        if (cooldownBar) cooldownBar.style.width = `${percentage}%`;
        if (cooldownTimer) cooldownTimer.textContent = Math.max(0, timeLeft).toFixed(2);

        if (timeLeft <= 0) {
            clearInterval(cooldownInterval);
            canClick = true;
            if (cooldownTimer) cooldownTimer.textContent = 'READY';
            if (cooldownBar) cooldownBar.style.width = '100%';
        }
    }, 10);
});

closeUpgrades.addEventListener('click', () => {
    upgradeWindow.classList.remove('active');
    upgradeWindow.classList.add('hidden'); // <-- dodaj to
});

greenUpgradeBtn.addEventListener('click', () => {
    greenUpgradeWindow.classList.remove('hidden');
    greenUpgradeWindow.classList.add('active');
    updateGreenUpgradeBarrelAvailability(); // Dodano aktualizację dostępności barrel
});
closeGreenUpgrade.addEventListener('click', () => {
    greenUpgradeWindow.classList.remove('active');
    greenUpgradeWindow.classList.add('hidden');
});

document.querySelector('.upgrade-item[data-index="0"]').addEventListener('click', () => {
    buyUpgrade(0);
});

document.querySelector('.upgrade-item[data-index="1"]').addEventListener('click', () => {
    buyUpgrade(1);
});

document.querySelector('.upgrade-item[data-index="2"]').addEventListener('click', () => {
    buyUpgrade(2);
});
document.querySelector('.upgrade-item[data-index="3"]').addEventListener('click', () => {
    buyUpgrade(3);
});
document.querySelector('.upgrade-item[data-index="4"]').addEventListener('click', () => {
    buyUpgrade(4);
});
// Bomblike removed

bookBtn.addEventListener('click', openScrapyardWindow);

closeScrapyard.addEventListener('click', () => {
    scrapyardWindow.classList.remove('active');
    scrapyardWindow.classList.add('hidden'); // Dodaj to!
});
buyScrapyardBtn.addEventListener('click', buyScrapyard);

buyBrickBtn.addEventListener('click', buyBrick);

// TilesYard upgrade events
if (typeof tilesUpgradeBtn !== 'undefined' && tilesUpgradeBtn) {
    tilesUpgradeBtn.addEventListener('click', handleTilesUpgrade);
}

starBtn.addEventListener('click', openRebirthWindow);

closeRebirth.addEventListener('click', () => {
    rebirthWindow.classList.remove('active');
    rebirthWindow.classList.add('hidden');
});

confirmRebirthBtn.addEventListener('click', performRebirth);

mysteryBookBtn.addEventListener('click', () => {
    const mysteryBookWindow = document.getElementById('mysterybook-window');
    mysteryBookContainer.classList.remove('hidden'); // Ensure visibility
    mysteryBookWindow.classList.remove('hidden');
    mysteryBookWindow.classList.add('active');
});

document.getElementById('close-mysterybook').addEventListener('click', () => {
    const mysteryBookWindow = document.getElementById('mysterybook-window');
    mysteryBookWindow.classList.remove('active');
    mysteryBookWindow.classList.add('hidden');
});

if (scrapyardMasteryIcon) {
    scrapyardMasteryIcon.addEventListener('click', () => {
        if (scrapyardMasteryIcon.classList.contains('hidden')) return;
        openScrapyardMasteryWindow();
    });
}
if (scrapyardMasteryButton) {
    scrapyardMasteryButton.addEventListener('click', attemptScrapyardMasteryTier);
}
if (closeScrapyardMastery) {
    closeScrapyardMastery.addEventListener('click', closeScrapyardMasteryWindow);
}
if (scrapyardMasteryWindow) {
    scrapyardMasteryWindow.addEventListener('click', (e) => {
        if (e.target === scrapyardMasteryWindow) closeScrapyardMasteryWindow();
    });
}

// Inicjalizacja
updateUpgradeInfo();
updateScrapyardUI();
updateRebirthUI();
updateGreenUpgradeUI();
updateGreenUpgradeBarrelAvailability(); // Dodano aktualizację dostępności barrel
updateScrapyardSectionsVisibility();
updateMysteryBookUI();
updateMasterTokenUI();
updateBrickUI();
updateTilesUI(); // Initialize Tiles UI
// Initialize Blue Upgrades visibility
if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
// Wyrównaj widoczność kafelków upgrade'ów (np. cooldown po re-loadzie gry)
if (typeof refreshUpgradeVisibility === 'function') refreshUpgradeVisibility();
// Wymuś limit poziomu Autoclickera po wczytaniu stanu
if (typeof enforceAutoclickerCap === 'function') enforceAutoclickerCap();
// Jeśli warunek spełniony pokaż cooldown od razu
// Pokaż cooldown tylko jeśli Autoclicker został kupiony (zgodnie z zasadą TYLKO po zakupie Autoclickera)
if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL) {
    if (typeof showCooldownUpgrade === 'function') showCooldownUpgrade();
}
// Zastosuj highlight wybranej beczki po wczytaniu/save
if (typeof applyBarrelHighlight === 'function') applyBarrelHighlight();

// Inicjalizacja Green Upgrade bonusów
for (let i = 0; i < 6; i++) {
    updateGreenUpgradeBonus(i);
}

// Make buyBrick globally accessible for HTML onclick
window.buyBrick = buyBrick;

bookContainer.classList.toggle('hidden', rebirthCount < 3); // Ensure correct visibility based on rebirthCount
mysteryBookContainer.classList.toggle('hidden', rebirthCount < 3); // Ensure correct visibility based on rebirthCount

// Event listeners for greenupgrade buttons
document.querySelectorAll('.greenupgrade-button').forEach((button, index) => {
    button.addEventListener('click', () => handleBarrelButtonClick(index));
});

// Event listeners for tree
treeBtn.addEventListener('click', () => {
    treeWindow.classList.remove('hidden');
    treeWindow.classList.add('active');
    updateTreeUI();
});
// Event listeners for Blue Upgrades
if (blueUpgradeBtn) {
    blueUpgradeBtn.addEventListener('click', () => {
        if (blueUpgradeWindow) {
            blueUpgradeWindow.classList.remove('hidden');
            blueUpgradeWindow.classList.add('active');
            if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
        }
    });
}
if (closeBlueUpgrade) {
    closeBlueUpgrade.addEventListener('click', () => {
        if (blueUpgradeWindow) {
            blueUpgradeWindow.classList.remove('active');
            blueUpgradeWindow.classList.add('hidden');
        }
    });
}

// Blue better upgrade button listener
const blueBetterBtn = document.getElementById('blue-better-buy');
if (blueBetterBtn) {
    blueBetterBtn.addEventListener('click', () => {
        buyBlueBetterUpgrade();
    });
}

closeTree.addEventListener('click', () => {
    treeWindow.classList.remove('active');
    treeWindow.classList.add('hidden');
});

// Event listener for tree items click (opens info window)
function addTreeListeners() {
    for (let x = 0; x < treeUpgrades.length; x++) {
        const element = document.getElementById('tree-item-' + x);
        if (element) { // Check if element exists before adding listener
            element.addEventListener('click', () => {
                updateTreeInfoWindow(x);
            });
        }
    }
}

// Event listener for closing tree info window
closeTreeInfo.addEventListener('click', () => {
    treeInfoWindow.classList.remove('active');
    treeInfoWindow.classList.add('hidden');
});

// Event listener for tree upgrade purchase
treeInfoBuyBtn.addEventListener('click', () => {
    handleTreeUpgrade(selectedTreeUpgrade);
    updateTreeInfoWindow(selectedTreeUpgrade);
});

// Inicjalizacja bonusów na starcie gry
for (let i = 0; i < 6; i++) {
    updateGreenUpgradeBonus(i);
}

// Blue Upgrades UI update
function updateBlueUpgradeUI() {
    // Better Upgrades
    const betterLevelEl = document.getElementById('blue-better-level');
    const betterEffectEl = document.getElementById('blue-better-effect');
    const betterCostEl = document.getElementById('blue-better-cost');
    const betterTile = document.getElementById('blue-better-upgrades');
    if (betterLevelEl && betterTile) {
        const b = blueUpgrades.better;
        betterLevelEl.textContent = `Level: ${b.level}/${b.max}`;
        const mult = getClickMultiplier();
        const fmt = (v) => Number(v.toFixed(2)).toString();
        const multText = fmt(mult);
        // Next level preview (if any)
        let nextText = '';
        if (b.level < b.max) {
            const nextLvl = b.level + 1;
            const nextMult = (Array.isArray(b.multipliers) && b.multipliers[nextLvl] != null)
                ? b.multipliers[nextLvl]
                : (1 + 0.25 * nextLvl);
            nextText = ` → x${fmt(nextMult)}`;
        }
        betterEffectEl.textContent = `Current: x${multText}${nextText}`;
        if (b.level >= b.max) {
            betterCostEl.textContent = 'MAX';
            betterTile.style.opacity = 0.6;
            betterTile.style.pointerEvents = 'none';
        } else {
            const cost = getBlueUpgradeCost('better');
            betterCostEl.textContent = `Cost: ${cost} Tires`;
            betterTile.style.pointerEvents = 'auto';
            betterTile.style.opacity = tiles >= cost ? 1 : 0.5;
        }
    }

    // The Earnings
    const earnLevelEl = document.getElementById('blue-earnings-level');
    const earnEffectEl = document.getElementById('blue-earnings-effect');
    const earnCostEl = document.getElementById('blue-earnings-cost');
    const earnTile = document.getElementById('blue-earnings-upgrade');
    if (earnLevelEl && earnTile && blueUpgrades.earnings) {
        const e = blueUpgrades.earnings;
        earnLevelEl.textContent = `Level: ${e.level}/${e.max}`;
    earnEffectEl.textContent = `Current: +${e.level * e.scrapPerLevel} Scrap/click (+${e.scrapPerLevel} / lvl)`;
        if (e.level >= e.max) {
            earnCostEl.textContent = 'MAX';
            earnTile.style.opacity = 0.6;
            earnTile.style.pointerEvents = 'none';
        } else {
            const cost = getBlueUpgradeCost('earnings');
            earnCostEl.textContent = `Cost: ${cost} Tires`;
            earnTile.style.pointerEvents = 'auto';
            earnTile.style.opacity = tiles >= cost ? 1 : 0.5;
        }
    }

    // The Tires
    const tiresLevelEl = document.getElementById('blue-tires-level');
    const tiresEffectEl = document.getElementById('blue-tires-effect');
    const tiresCostEl = document.getElementById('blue-tires-cost');
    const tiresTile = document.getElementById('blue-tires-upgrade');
    if (tiresLevelEl && tiresTile && blueUpgrades.tires) {
        const t = blueUpgrades.tires;
        tiresLevelEl.textContent = `Level: ${t.level}/${t.max}`;
        const currentBonus = t.level * t.perLevelBonus;
        const nextBonus = (t.level + 1) * t.perLevelBonus;
        if (t.level >= t.max) {
            tiresEffectEl.textContent = `Active: +${currentBonus} Tires/level total (x${currentBonus})`;
            tiresCostEl.textContent = 'MAX';
            tiresTile.style.opacity = 0.6;
            tiresTile.style.pointerEvents = 'none';
        } else {
            tiresEffectEl.textContent = `Current: +${currentBonus} Tires/pickup → +${nextBonus} ( +${t.perLevelBonus} / lvl )`;
            const cost = getBlueUpgradeCost('tires');
            tiresCostEl.textContent = `Cost: ${cost} Tires`;
            tiresTile.style.pointerEvents = 'auto';
            tiresTile.style.opacity = tiles >= cost ? 1 : 0.5;
        }
    }
}

function buyBlueBetterUpgrade() {
    const u = blueUpgrades.better;
    if (u.level >= u.max) return;
    const cost = getBlueUpgradeCost('better');
    if (tiles < cost) return;
    tiles -= cost;
    u.level++;
    if (STATS) STATS.blueUpgradesBought += 1;
    updateTilesUI();
    updateBlueUpgradeUI();
    if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
}

function buyBlueEarningsUpgrade() {
    const u = blueUpgrades.earnings;
    if (!u || u.level >= u.max) return;
    const cost = getBlueUpgradeCost('earnings');
    if (tiles < cost) return;
    tiles -= cost;
    u.level++;
    if (STATS) STATS.blueUpgradesBought += 1;
    updateTilesUI();
    updateBlueUpgradeUI();
    if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
}

function buyBlueTiresUpgrade() {
    const u = blueUpgrades.tires;
    if (!u || u.level >= u.max) return;
    const cost = getBlueUpgradeCost('tires');
    if (tiles < cost) return;
    tiles -= cost;
    u.level++;
    if (STATS) STATS.blueUpgradesBought += 1;
    updateTilesUI();
    updateBlueUpgradeUI();
    if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
}

// Listener dla kafelka (zamiast przycisku)
const blueBetterTile = document.getElementById('blue-better-upgrades');
if (blueBetterTile) {
    blueBetterTile.addEventListener('click', () => {
        buyBlueBetterUpgrade();
    });
}
const blueEarningsTile = document.getElementById('blue-earnings-upgrade');
if (blueEarningsTile) {
    blueEarningsTile.addEventListener('click', () => {
        buyBlueEarningsUpgrade();
    });
}
const blueTiresTile = document.getElementById('blue-tires-upgrade');
if (blueTiresTile) {
    blueTiresTile.addEventListener('click', () => {
        buyBlueTiresUpgrade();
    });
}

// === Global click-outside to close open modal windows ===
// Lista okien z klasą 'active' które mają być zamykane kliknięciem poza nimi
const CLOSE_ON_OUTSIDE = [
    { el: upgradeWindow, triggerIds: ['upgrade-btn'] },
    { el: scrapyardWindow, triggerIds: ['book-btn'] },
    { el: rebirthWindow, triggerIds: ['star-btn'] },
    { el: greenUpgradeWindow, triggerIds: ['greenupgrade-btn'] },
    { el: document.getElementById('mysterybook-window'), triggerIds: ['mysterybook-btn'] },
    { el: scrapyardMasteryWindow, triggerIds: ['scrapyard-mastery-icon'] },
    { el: blueUpgradeWindow, triggerIds: ['blueupgrade-btn'] },
    { el: treeWindow, triggerIds: ['tree-btn'] },
    { el: treeInfoWindow, triggerIds: [] },
    { el: document.getElementById('settings-window'), triggerIds: ['settings-btn'] }
];

function isTriggerSource(event, ids) {
    if (!ids || !ids.length) return false;
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return false;
    return ids.some(id => target.closest(`#${id}`));
}

document.addEventListener('mousedown', (e) => {
    // Jeżeli kliknięto na przycisk otwierający, nie zamykaj (pozwól jego handlerowi zadziałać)
    for (const cfg of CLOSE_ON_OUTSIDE) {
        if (!cfg.el) continue;
        if (!cfg.el.classList.contains('active')) continue;
        if (isTriggerSource(e, cfg.triggerIds)) return; // klik na trigger lub jego potomka
        if (cfg.el.contains(e.target)) continue; // klik wewnątrz okna
        // Zamknij okno
        cfg.el.classList.remove('active');
        cfg.el.classList.add('hidden');
    }
});

// Dodatkowy fallback (deploy np. GitHub Pages czasem gubi mousedown przez overlayy / focus)
function closeOnOutsideGeneric(e) {
    for (const cfg of CLOSE_ON_OUTSIDE) {
        if (!cfg.el || !cfg.el.classList.contains('active')) continue;
        if (isTriggerSource(e, cfg.triggerIds)) return;
        if (cfg.el.contains(e.target)) return; // wewnątrz – nie zamykaj
    }
    // Jeśli dotarliśmy tutaj – klik poza wszystkimi aktywnymi oknami -> zamknij wszystkie aktywne
    CLOSE_ON_OUTSIDE.forEach(cfg => {
        if (cfg.el && cfg.el.classList.contains('active')) {
            cfg.el.classList.remove('active');
            cfg.el.classList.add('hidden');
        }
    });
}

document.addEventListener('click', closeOnOutsideGeneric);
document.addEventListener('touchstart', closeOnOutsideGeneric, { passive: true });

// ========= Initialize Stats and Settings =========
STATS = loadStats();
ensureSettingsButton();
ensureSettingsWindow();
bindSettingsHandlers();

// Auto-claim username on load (if already saved) to restore inventory and enforce ownership
(function(){
    try {
        const proto = (location && location.protocol || '').toLowerCase();
        if (proto !== 'file:') {
            const n = getStoredNick();
            if (n) claimUsernameOnServer(n);
        }
    } catch {}
})();

// Periodic ban heartbeat: ping server to detect ban even if user doesn't interact
(function initBanHeartbeat(){
    try {
        const proto = (location && location.protocol || '').toLowerCase();
        if (proto === 'file:') return; // no backend
        let timer = null;
        function tick(){
            try {
                if (!isBackendAvailable()) return;
                if (window.__SM_BANNED) return; // already banned
                const username = getStoredNick();
                if (!username) return; // nothing to check until a name is set
                const payload = { username, clientId: getClientId(), inventory: [] };
                fetch('/api/player/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    if (!res.ok && res.status === 403) {
                        disableBackendSyncAfterForbidden('Server sync disabled after heartbeat (403).');
                        let data = null; try { data = await res.json(); } catch {}
                        if (data && data.banned) {
                            window.__SM_BANNED = true;
                            showBanOverlay(data.message || 'You have been banned for not following the game rules (which do not exist). Please do not play unfairly.');
                        }
                    }
                }).catch(()=>{});
            } catch {}
        }
        // run soon after load and then every 30s
        setTimeout(tick, 2000);
        timer = setInterval(tick, 30000);
        // keep reference if we ever want to clear later
        window.__SM_BAN_TIMER = timer;
    } catch {}
})();

// ========= Themes: cycle via palette click =========
(function initThemes(){
    const THEME_KEY = 'sm_theme';
    const THEMES = ['theme-dark','theme-neon','theme-solar','theme-forest','theme-ocean','theme-candy','theme-retro','theme-midnight'];
    const root = document.documentElement;
    function applyTheme(name){
        // remove old theme classes
        THEMES.forEach(t => root.classList.remove(t));
        // default to first if invalid
        if (!THEMES.includes(name)) name = THEMES[0];
        root.classList.add(name);
        try { localStorage.setItem(THEME_KEY, name); } catch {}
        const pal = document.getElementById('settings-palette');
        const pretty = name.replace('theme-','');
        if (pal) pal.title = `Theme: ${pretty}. Click to change`;
        const label = document.getElementById('settings-theme-name');
        if (label) label.textContent = capitalize(pretty);
        // push to save system if available
        if (window.saveSystem && typeof window.saveSystem.setTheme === 'function') {
            window.saveSystem.setTheme(name);
        }
    }
    function nextTheme(){
        const current = [...root.classList].find(c=>THEMES.includes(c)) || localStorage.getItem(THEME_KEY) || THEMES[0];
        const idx = THEMES.indexOf(current);
        const next = THEMES[(idx + 1) % THEMES.length];
        applyTheme(next);
    }
    function capitalize(s){ return (s && s[0].toUpperCase() + s.slice(1)) || s; }
    // load saved theme on boot
    const saved = (function(){ try { return localStorage.getItem(THEME_KEY); } catch { return null; } })();
    applyTheme(saved || THEMES[0]);
    // bind click on palette image
    const pal = document.getElementById('settings-palette');
    if (pal) pal.addEventListener('click', (e) => { e.stopPropagation(); nextTheme(); });
})();

