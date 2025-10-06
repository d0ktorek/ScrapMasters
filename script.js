let scraps = 0;
let canClick = true;
let scrapPerClick = 1;
let autoClickerInterval = null;
let currentCooldownTime = 5.00;
let scrapyardInterval = null;
let scrapyardPurchased = false;
const scrapyardCost = 2000;
let rebirthCount = 0;
// Dynamiczny koszt rebirth: pierwszy 2000, potem x1.85 za każdy kolejny
function getCurrentRebirthCost() {
    return Math.floor(2000 * Math.pow(1.85, rebirthCount));
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
}

// Dynamic cost model for +1 Scrap/click: ultra low prices and very gentle growth, infinite levels
const UPG1_BASE_COST = 1;
const UPG1_GROWTH = 1.05;
function getUpgrade1Cost(level) {
    return Math.floor(UPG1_BASE_COST * Math.pow(UPG1_GROWTH, level));
}
const upgrade2Cost = 50;
const upgrade3Costs = [30, 80, 300, 500, 600, 800, 900, 1000, 1300, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 18000, 22000, 26000, 30000, 35000, 40000, 45000, 50000, 60000, 70000];
// Funny Joke costs: start small and scale; 20 levels (reduced from 40)
const upgrade4Costs = [
    100, 200, 350, 500, 750, 1100, 1600, 2200, 3000, 4000,
    5200, 6600, 8200, 10000, 12200, 14800, 17800, 21200, 25000, 29200
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
    return 1 + (tilesLevel * 2);
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
const greenUpgradeWindow = document.getElementById('greenupgrade-window');
const closeGreenUpgrade = document.getElementById('close-greenupgrade');
const mysteryBookContainer = document.getElementById('mysterybook-container');
const mysteryBookBtn = document.getElementById('mysterybook-btn');
const masterTokenCount = document.getElementById('master-token-count');
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
// Chat removed
// (All global chat UI & socket logic stripped)
// Blue upgrade UI elements
const blueUpgradeContainer = document.getElementById('blueupgrade-container');
const blueUpgradeBtn = document.getElementById('blueupgrade-btn');
const blueUpgradeWindow = document.getElementById('blueupgrade-window');
const closeBlueUpgrade = document.getElementById('close-blueupgrade');

const UPGRADE_UNLOCK = 10;

// Inicjalizacja - settings (upgrade) button widoczny od razu
upgradeBtn.style.display = "block";
bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);  // Ukryj książkę na starcie
starBtn.style.display = "none";         // Gwiazda ukryta na starcie
mysteryBookContainer.classList.add('hidden'); // Ukryj mystery book na starcie
treeContainer.classList.add('hidden'); // Ukryj tree na starcie

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

// ========= Settings UI (created dynamically to avoid HTML edits) =========
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
    wrap.innerHTML = `
        <div class="settings-content">
            <h3>Settings</h3>
            <div id="settings-stats" class="settings-stats">
                <div class="stat"><span class="label">Now:</span> <span id="stat-now">-</span></div>
                <div class="stat"><span class="label">Session start:</span> <span id="stat-session-start">-</span></div>
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
                <button id="import-save-btn">Import Save</button>
                <input type="file" id="import-save-input" accept="application/json" class="hidden" />
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
function applyImportedData(obj) {
    if (obj && obj.type === 'custom' && obj.payload && typeof window.gameImportSave === 'function') {
        try { window.gameImportSave(obj.payload); return true; } catch(e) {}
    }
    const payload = obj && obj.payload ? obj.payload : obj;
    if (!payload || typeof payload !== 'object') return false;
    if (!confirm('Import will overwrite your current save. Continue?')) return false;
    Object.keys(payload).forEach(k => { try { localStorage.setItem(k, String(payload[k])); } catch(e) {} });
    return true;
}
function bindSettingsHandlers() {
    const btn = document.getElementById('settings-btn');
    const win = document.getElementById('settings-window');
    const closeBtn = document.getElementById('close-settings');
    const exportBtn = document.getElementById('export-save-btn');
    const importBtn = document.getElementById('import-save-btn');
    const importInput = document.getElementById('import-save-input');
    if (btn) btn.addEventListener('click', openSettings);
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (exportBtn) exportBtn.addEventListener('click', exportSave);
    if (importBtn) importBtn.addEventListener('click', () => importInput && importInput.click());
    if (importInput) importInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (applyImportedData(data)) { alert('Save imported. Reloading...'); location.reload(); }
                } catch { alert('Invalid file. Could not parse JSON.'); }
            };
            reader.readAsText(f);
        }
        e.target.value = '';
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
    // Earth (chat) icon removed
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
}

function updateGreenUpgradeUI() {
    if (!greenUpgradeBtn) return;
    greenUpgradeBtn.style.display = (rebirthCount > 0) ? "block" : "none";
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
        if (currentLevel3 < 40) {
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
        const currentLevel = upgradeLevels[index];
        if (upgradeLevels[0] >= 2 && upgradeLevels[1] === 0) {
    document.querySelector('.upgrade-item[data-index="1"]').classList.remove('hidden');
}
        
        const cost = getUpgrade1Cost(currentLevel);
        if (scraps >= cost) {
            if (STATS) { STATS.scrapSpent += cost; STATS.upgradesBought += 1; }
            scraps -= cost;
            upgradeLevels[index]++;
            scrapPerClick += 1; // now +1 Scrap/click per level
            updateScrapCounter();
            
            if (upgradeLevels[0] >= 2 && upgradeLevels[1] === 0) {
                document.querySelector('.upgrade-item[data-index="1"]').classList.remove('hidden');
            }
            
            updateUpgradeInfo();
            updateScrapyardUI();
            if (window.saveSystem) saveSystem.saveGame();
        }
    } 
    else if (index === 1) {
        // Sprawdź czy autoclicker już na max poziomie (1)
            if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL) {
            return; // Już na max poziomie, nie pozwalaj na kolejny upgrade
        }
        
        // NAJPIERW sprawdź czy mamy wystarczająco scrapu
        if (scraps >= upgrade2Cost) {
            if (STATS) { STATS.scrapSpent += upgrade2Cost; STATS.upgradesBought += 1; }
            scraps -= upgrade2Cost;
            upgradeLevels[index]++;
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
            
            // DOPIERO PO UDANYM ZAKUPIE odblokowuj następny upgrade
            if (upgradeLevels[2] === 0) {
                showCooldownUpgrade();
                if (typeof refreshUpgradeVisibility === 'function') refreshUpgradeVisibility();
            }
        }
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
    if (currentLevel >= 20) return;
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
// Better Upgrades: keep original max levels; customize first three costs
// Costs for Better: [100, 120, 1000, ...rest as before]
const blueBetterCosts = [
    100,  // L1 (custom)
    120,  // L2 (custom)
    1000, // L3 (custom)
    1000, 1400, 6000, 10000, 15000, 30000, 40000, 100000,
    300000, 800000, 1000000, 3000000, 5000000
]; // 16 levels total
// New Blue Upgrade: The Earnings (adds flat +10 scrap per click per level)
const blueEarningsCosts = [
    2000,        // L1 (was 3000)
    10000,      // L2 (was 15000)
    30000,       // L3
    45000,      // L4
    90000,     // L5
    560000,    // L6
    8700000,    // L7
    10000000,   // L8
    150000000,  // L9
    200000000   // L10
];
const blueUpgrades = {
    // Better: special total multipliers for the first three levels
    // L0=1.00, L1=1.30, L2=1.35, L3=1.45; from L4 use base increment 0.25 per level
    better: { level: 0, max: blueBetterCosts.length, multipliers: [1.00, 1.30, 1.35, 1.45], baseIncrement: 0.25 },
    // The Tires upgrade (now multi-level)
    tires: { level: 0, max: 30, perLevelBonus: 100 },
    earnings: { level: 0, max: 10, scrapPerLevel: 1000 }
};
// expose for UI readout
window.blueUpgrades = blueUpgrades;
// Costs for The Tires upgrade levels 1..30 (progressively large)
const blueTiresCosts = [
    1000, 7000, 14000, 24500, 35000, 52500, 70000, 105000, 140000, 210000,
    305000, 420000, 560000, 700000, 910000, 1190000, 1540000, 1960000, 2450000, 3010000,
    3640000, 4340000, 5250000, 6300000, 7350000, 8750000, 10500000, 12600000, 15050000, 17850000
];
// Safety clamp in case save had higher level
if (blueUpgrades.better.level > blueUpgrades.better.max) {
    blueUpgrades.better.level = blueUpgrades.better.max;
}
function getBlueUpgradeCost(key) {
    if (key === 'better') {
        const lvl = blueUpgrades.better.level;
        return blueBetterCosts[lvl] !== undefined ? blueBetterCosts[lvl] : Infinity;
    } else if (key === 'tires') {
        const lvl = blueUpgrades.tires.level;
        return blueTiresCosts[lvl] !== undefined ? blueTiresCosts[lvl] : Infinity;
    } else if (key === 'earnings') {
        const lvl = blueUpgrades.earnings.level;
        return blueEarningsCosts[lvl] !== undefined ? blueEarningsCosts[lvl] : Infinity;
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
    const additive = scrapPerClick + baseBarrelBonus + (barrelLevels.reduce((sum, level) => sum + level, 0)) + earningsFlat;
    let total = additive * getClickMultiplier();
    // Star Power tree upgrade: now multiplies final scrap per click by 1.10^rebirthCount when purchased
    const starPower = treeUpgrades.find(t => t.name === 'Star Power');
    if (starPower && starPower.level > 0 && rebirthCount > 0) {
    total *= Math.pow(1.10, rebirthCount); // 1.10^rebirths (~+10% per rebirth)
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
const barrelMaxLevel = 5; // per barrel cap unchanged
const barrelCosts = [1, 2, 4, 8, 16, 32, 64, 128, 256];

// Tree upgrades system
//const treeUpgrades = [false]; // false = nie kupione, true = kupione
//const treeUpgradeCosts = [25]; // Koszt każdego upgrade w Master Tokens

// define tree upgrades
const treeUpgrades = [
    {
        img: 'scrapyard.png', name: 'Better Scrapyard', desc: "Upgrade your Scrapyard from 100 Scrap per minute to 100 Scrap per second!",
        rebirth: 6, price: 1000, scrapPrice: 1000, brickPrice: 5, level: 0, maxLevel: 1, requiresScrapyard: true
    },
    {
        img: 'tires.png', name: 'Tires', desc: "Unlocks Tires currency! Every 60 seconds, 1 tire falls down giving +1 Tires when hovered!",
        rebirth: 8, price: 35, scrapPrice: 3000, brickPrice: 10, level: 0, maxLevel: 1, requiresPrevious: true
    },
    { // SWAPPED: Blue Upgrades now index 2 (central chain)
        img: 'blueupgrade.png', name: 'Tires Upgrades', desc: "Unlocks Blue Upgrades menu where you spend Tires on permanent upgrades (persist through rebirth).",
        rebirth: 14, scrapPrice: 2000000, brickPrice: 120, tilesPrice: 800, level: 0, maxLevel: 1
    },
    {
        img: 'goldscrapyard.png', name: 'Best Scrapyard', desc: "Upgrade your Scrapyard from 100 Scrap/s to 300 Scrap/s!",
        rebirth: 12, scrapPrice: 80000, brickPrice: 30, tilesPrice: 500, level: 0, maxLevel: 1
    },
    { // SWAPPED: TiresYard now index 4 (right dashed branch)
        img: 'tilesyard.png', name: 'TiresYard', desc: "Unlocks TiresYard in the Book as the 3rd option.",
        rebirth: 10, price: 120, scrapPrice: 15000, tilesPrice: 25, level: 0, maxLevel: 1, requiresTwoUpgrades: true
    },
    {
        img: 'Cloud.png', name: 'Storm', desc: 'Every 4 minutes a giant cloud drops 30 Tires across the screen.',
        rebirth: 16, price: 100, scrapPrice: 300000, tilesPrice: 500, level: 0, maxLevel: 1
    },
    {
        img: 'brickyard.png', name: 'Brick Storm', desc: '3.5% chance that a Storm becomes a BrickStorm: falling Bricks instead of Tires. Each collected Brick grants +1 Brick.',
        rebirth: 0, price: 0, brickPrice: 100, scrapPrice: 2000000, level: 0, maxLevel: 1
    },
    {
    img: 'star.png', name: 'Star Power', desc: 'Each Rebirth gives +10% Scrap gain (multiplicative).',
        rebirth: 0, price: 0, scrapPrice: 0, brickPrice: 0, tilesPrice: 0, level: 0, maxLevel: 1
    },
    {
        img: 'master.png', name: 'Master Tokens Storm', desc: '3.5% chance Storm becomes a Master Token Storm. Each collected token grants +10 Master Tokens.',
        rebirth: 0, price: 0, scrapPrice: 0, brickPrice: 0, tilesPrice: 0, level: 0, maxLevel: 1
    },
];

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
    // Determine storm variant priority: Master Tokens Storm > Brick Storm > normal
    const roll = Math.random();
    let isMasterStorm = false;
    let isBrickStorm = false;
    if (masterStormUnlocked && roll < 0.035) {
        isMasterStorm = true;
    } else if (!isMasterStorm && brickStormUnlocked && roll < 0.035) {
        isBrickStorm = true;
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
        width: 56px; height: 56px;
        z-index: 999;
        pointer-events: auto; cursor: pointer;
        top: -70px; left: ${Math.random() * (window.innerWidth - 56)}px;
        animation: fallDown 3s linear; transition: transform 0.1s;
    `;
    el.addEventListener('mouseenter', () => {
        bricks += 1;
        updateBrickUI();
        el.style.transform = 'scale(1.15)';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 100);
        if (typeof saveSystem !== 'undefined') saveSystem.saveGame();
    });
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
    el.style.left = Math.random() * (window.innerWidth - 40) + 'px';
    const speed = 4 + Math.random() * 3;
    let y = -40;
    el.innerHTML = '<img src="assets/master.png" alt="Master Token" style="width:32px;height:32px;image-rendering:pixelated;" />';
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
    el.addEventListener('click', () => {
        masterTokens += 10; // +10 Master Tokens per collected
        if (STATS) STATS.masterTokensCollected = (STATS.masterTokensCollected||0) + 10;
        updateMasterTokenUI && updateMasterTokenUI();
        el.remove();
    });
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
        width: 60px;
        height: 60px;
        z-index: 999;
        pointer-events: auto;
        cursor: pointer;
        top: -70px;
        left: ${Math.random() * (window.innerWidth - 60)}px;
        animation: fallDown 3s linear;
        transition: transform 0.1s;
    `;
    
    // Add hover handler for +Tiles (zbierasz po nakierowaniu kursora)
    tire.addEventListener('mouseenter', () => {
        // Tiles gained per tire is Level + 1 (so Level 0 -> 1 Tiles, Level 4 -> 5 Tiles)
        let tilesPerPickup = (typeof tilesLevel !== 'undefined') ? (tilesLevel + 1) : 1;
        if (blueUpgrades.tires && blueUpgrades.tires.level >= 1) {
            tilesPerPickup *= (blueUpgrades.tires.perLevelBonus * blueUpgrades.tires.level); // 100 * level
        }
        tiles += tilesPerPickup;
        if (STATS) { STATS.tiresCollected += 1; STATS.tilesEarned += tilesPerPickup; }
        tires += 1; // Keep track of total tires collected
        updateTilesUI();
    console.log(`🛞 Tire hovered! +${tilesPerPickup} Tires! Total tires currency: ${tiles}, Tires collected: ${tires}`);
        
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
    });
    
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
                from { top: -70px; transform: rotate(0deg); }
                to { top: ${window.innerHeight + 70}px; transform: rotate(720deg); }
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

    // TilesYard purchase gating by tree upgrade #3 (index 2)
    const tilesYardUnlocked = treeUpgrades && treeUpgrades[2] && treeUpgrades[2].level > 0;
    if (tilesyardStatus && !tilesYardUnlocked) {
        tilesyardStatus.textContent = 'Locked: Buy TiresYard (Tree Upgrade 3)';
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
            tilesUpgradeBtn.title = 'Unlock via Tree Upgrade 3';
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
            barrelCosts[index] *= 2; // Double the cost for next upgrade
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
    // Render each upgrade into its fixed slot to match the SVG lines
    const slots = [0,1,2,3,4,5,6,7,8];
    // Direct mapping now aligns with numeric slot order
    const SLOT_FOR = { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8 };
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
    } else if (index === 2 && upg.requiresTwoUpgrades) { // TilesYard upgrade: now requires Tires (index 1)
        const tiresOwned = treeUpgrades[1].level >= 1;
        requirementText += `, Tires Upgrade, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = tiresOwned && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= upg.price;
    } else if (index === 3) { // Best Scrapyard - multi-currency cost (index 3 now)
        requirementText += `, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (index === 4) { // Tires Upgrades - multi-currency cost (index 4 now)
        requirementText += `, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (upg.name === 'Storm') {
        requirementText += `, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= upg.price;
    } else if (upg.name === 'Brick Storm') {
        requirementText += `, requires Storm, ${upg.brickPrice} Brick, ${upg.scrapPrice.toLocaleString()} Scrap`;
        canAfford = (treeUpgrades[5] && treeUpgrades[5].level > 0) && bricks >= (upg.brickPrice||0) && scraps >= (upg.scrapPrice||0);
    } else if (upg.name === 'Star Power') {
        requirementText += `, requires Storm & Brick Storm (free)`;
        canAfford = (treeUpgrades[5] && treeUpgrades[5].level > 0) && (treeUpgrades[6] && treeUpgrades[6].level > 0);
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
            } else if (index === 2 && upg.requiresTwoUpgrades) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (index === 3) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 4) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
                // Make clickable; handleTreeUpgrade will validate and show precise alerts
                const missingBrick = Math.max(0, upg.brickPrice - (bricks || 0));
                const missingScrap = Math.max(0, upg.scrapPrice - (scraps || 0));
                const missingTires = Math.max(0, upg.tilesPrice - (tiles || 0));
                const missingText = (missingBrick || missingScrap || missingTires)
                    ? `Missing: ${missingBrick} Brick, ${missingScrap} Scrap, ${missingTires} Tires`
                    : '';
                treeInfoBuyBtn.disabled = false;
                if (missingText) treeInfoBuyBtn.title = missingText; else treeInfoBuyBtn.removeAttribute('title');
            } else if (upg.name === 'Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Brick Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice.toLocaleString()} Scrap`;
            } else {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            }
            // Allow click, but show disabled if cannot afford (except special case index===4 handled above)
            if (index !== 4) treeInfoBuyBtn.disabled = !canAfford; else treeInfoBuyBtn.disabled = false;
            treeInfoBuyBtn.classList.remove('hidden');
        } else {
            // Zablokowany (rebirth/paths) – nadal pokaż przycisk i pozwól kliknąć, handler pokaże komunikat
            treeInfoBuyBtn.removeAttribute('data-state');
            if (index === 0) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap`;
            } else if (index === 1) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.price} Master Tokens`;
            } else if (index === 2 && upg.requiresTwoUpgrades) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (index === 3) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (index === 4) {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires`;
            } else if (upg.name === 'Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.scrapPrice} Scrap + ${upg.tilesPrice} Tires + ${upg.price} Master Tokens`;
            } else if (upg.name === 'Brick Storm') {
                treeInfoBuyBtn.textContent = `Buy for ${upg.brickPrice} Brick + ${upg.scrapPrice.toLocaleString()} Scrap`;
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
    } else if (index === 2 && upg.requiresTwoUpgrades) { // TiresYard upgrade now requires Tires upgrade only
        const tiresOwned = treeUpgrades[1].level >= 1;
        if (rebirthCount >= upg.rebirth && 
            tiresOwned && 
            scraps >= upg.scrapPrice &&
            tiles >= upg.tilesPrice &&
            masterTokens >= upg.price && 
            upg.level < upg.maxLevel) {
            
            // Handle upgrade - deduct Scrap, Tiles and Master Tokens
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.masterTokensSpent += upg.price; STATS.tilesSpent = (STATS.tilesSpent||0) + upg.tilesPrice; }
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            masterTokens -= upg.price;
            upg.level++;

            // Reveal TilesYard in UI
            if (tilesyardSection) tilesyardSection.classList.remove('hidden');
            if (tilesyardSeparator) tilesyardSeparator.classList.remove('hidden');
            if (tilesyardStatus) tilesyardStatus.textContent = 'Unlocked';

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateMasterTokenUI();
            updateTilesUI();
            if (counter) updateScrapCounter();
            if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
            // Refresh TilesYard gating status text explicitly
            updateTilesUI();

            console.log('🧱 TilesYard unlocked via Tree Upgrade 3!');
        } else if (rebirthCount < upg.rebirth) {
            alert('You need at least ' + upg.rebirth + ' rebirths to unlock this upgrade!');
        } else if (!tiresOwned) {
            alert('You need the Tires upgrade first!');
        } else if (scraps < upg.scrapPrice) {
            alert('You don\'t have enough Scrap! Need: ' + upg.scrapPrice);
        } else if (tiles < upg.tilesPrice) {
            alert('You don\'t have enough Tires! Need: ' + upg.tilesPrice);
        } else if (masterTokens < upg.price) {
            alert('You don\'t have enough Master Tokens! Need: ' + upg.price);
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
    } else if (index === 4) { // Tires Upgrades
        if (rebirthCount >= upg.rebirth && bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && upg.level < upg.maxLevel) {
            // Deduct currencies
            bricks -= upg.brickPrice;
            if (STATS) { STATS.scrapSpent += upg.scrapPrice; STATS.tilesSpent = (STATS.tilesSpent||0) + upg.tilesPrice; }
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            upg.level++;

            // Unlock Blue Upgrades UI
            if (blueUpgradeContainer) blueUpgradeContainer.classList.remove('hidden');

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
    } else if (upg.name === 'Star Power') {
        // Free upgrade, requires both Storm and Brick Storm
        if (!(treeUpgrades[5] && treeUpgrades[5].level > 0)) {
            alert('You need to purchase Storm first!');
        } else if (!(treeUpgrades[6] && treeUpgrades[6].level > 0)) {
            alert('You need to purchase Brick Storm first!');
        } else if (upg.level >= upg.maxLevel) {
            alert('This upgrade is already purchased!');
        } else {
            upg.level++;
            treeInfoBuyBtn.classList.add('hidden');
            updateTreeUI();
            console.log('⭐ Star Power acquired! 1.10^rebirth (~+10% per rebirth) Scrap multiplier active.');
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

    // Bomblike removed

    // Master token gain rule (existing logic)
    if (Math.floor(scraps / 5) > masterTokens) {
        masterTokens++;
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
    }

    // Start cooldown
    canClick = false;
    if (cooldownBar) cooldownBar.style.width = '0%';

    let timeLeft = currentCooldownTime;
    if (cooldownTimer) cooldownTimer.textContent = timeLeft.toFixed(2);

    const cooldownInterval = setInterval(() => {
        timeLeft -= 0.01;
        const percentage = Math.max(0, Math.min(100, (currentCooldownTime - timeLeft) / currentCooldownTime * 100));
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
    earnEffectEl.textContent = `Current: +${e.level * e.scrapPerLevel} Scrap/click (+1000 / lvl)`;
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
            tiresEffectEl.textContent = `Current: x${currentBonus || 1} → x${nextBonus} ( +${t.perLevelBonus} / lvl )`;
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
    { el: blueUpgradeWindow, triggerIds: ['blueupgrade-btn'] },
    { el: treeWindow, triggerIds: ['tree-btn'] },
    { el: treeInfoWindow, triggerIds: [] },
    { el: document.getElementById('settings-window'), triggerIds: ['settings-btn'] }
];

document.addEventListener('mousedown', (e) => {
    // Jeżeli kliknięto na przycisk otwierający, nie zamykaj (pozwól jego handlerowi zadziałać)
    const id = e.target && e.target.id;
    for (const cfg of CLOSE_ON_OUTSIDE) {
        if (!cfg.el) continue;
        if (!cfg.el.classList.contains('active')) continue;
        if (cfg.triggerIds.includes(id)) return; // klik na trigger
        if (cfg.el.contains(e.target)) continue; // klik wewnątrz okna
        // Zamknij okno
        cfg.el.classList.remove('active');
        cfg.el.classList.add('hidden');
    }
});

// Dodatkowy fallback (deploy np. GitHub Pages czasem gubi mousedown przez overlayy / focus)
function closeOnOutsideGeneric(e) {
    const id = e.target && e.target.id;
    for (const cfg of CLOSE_ON_OUTSIDE) {
        if (!cfg.el || !cfg.el.classList.contains('active')) continue;
        if (cfg.triggerIds.includes(id)) return;
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
