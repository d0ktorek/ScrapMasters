let scraps = 0;
let canClick = true;
let scrapPerClick = 1;
let autoClickerInterval = null;
let currentCooldownTime = 5.00;
let scrapyardInterval = null;
let scrapyardPurchased = false;
const scrapyardCost = 2000;
let rebirthCount = 0;
// Dynamiczny koszt rebirth: pierwszy 2000, potem x2 za każdy kolejny (2000 * 2^rebirthCount)
function getCurrentRebirthCost() {
    // Zwracaj koszt jako liczba całkowita (ucięcie części po przecinku)
    return Math.floor(2000 * Math.pow(1.35, rebirthCount));
}

const upgrade1Costs = [5, 15, 35, 80, 120, 160, 320, 850, 1000, 1500, 2000, 2500, 3000, 3200, 3500, 4500, 5500, 6600, 8800, 10000];
const upgrade2Cost = 50;
const upgrade3Costs = [30, 80, 300, 500, 600, 800, 900, 1000, 1300, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 18000, 22000, 26000, 30000, 35000, 40000, 45000, 50000, 60000, 70000];
const upgradeLevels = [0, 0, 0];

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
// Blue upgrade UI elements
const blueUpgradeContainer = document.getElementById('blueupgrade-container');
const blueUpgradeBtn = document.getElementById('blueupgrade-btn');
const blueUpgradeWindow = document.getElementById('blueupgrade-window');
const closeBlueUpgrade = document.getElementById('close-blueupgrade');

const UPGRADE_UNLOCK = 10;

// Inicjalizacja - ukryj przyciski na starcie
upgradeBtn.style.display = "none";
bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);  // Ukryj książkę na starcie
starBtn.style.display = "none";         // Gwiazda ukryta na starcie
mysteryBookContainer.classList.add('hidden'); // Ukryj mystery book na starcie
treeContainer.classList.add('hidden'); // Ukryj tree na starcie

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
        const blueUnlocked = treeUpgrades && treeUpgrades[4] && treeUpgrades[4].level > 0;
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
    const tilesYardUnlocked = treeUpgrades && treeUpgrades[2] && treeUpgrades[2].level > 0;
    if (tilesyardSection) tilesyardSection.classList.toggle('hidden', !tilesYardUnlocked);
    if (tilesyardSeparator) tilesyardSeparator.classList.toggle('hidden', !tilesYardUnlocked);
    // Blue Upgrades visibility still depends on tree upgrade 5
    if (blueUpgradeContainer) {
        const blueUnlocked = treeUpgrades && treeUpgrades[4] && treeUpgrades[4].level > 0;
        blueUpgradeContainer.classList.toggle('hidden', !blueUnlocked);
    }
}

function updateUpgradeInfo() {
    const currentLevel0 = upgradeLevels[0];
    document.getElementById('upgrade-level-0').textContent = currentLevel0;
    
    if (currentLevel0 < upgrade1Costs.length) {
        document.getElementById('upgrade-cost-0').textContent = 
            `${upgrade1Costs[currentLevel0]} Scrap`;
    } else {
        document.getElementById('upgrade-cost-0').textContent = "MAX";
    }
    
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
}

// Upewnia się, że ukryte kafelki upgrade'ów są odsłaniane zgodnie z poziomami (np. cooldown po autoclickerze)
function refreshUpgradeVisibility() {
    const upg1 = document.querySelector('.upgrade-item[data-index="1"]'); // Autoclicker
    const upg2 = document.querySelector('.upgrade-item[data-index="2"]'); // Cooldown
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
        scraps -= scrapyardCost;
        scrapyardPurchased = true;
        counter.textContent = `Scrap: ${scraps}`;
        
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
            scraps += perSecond;
            counter.textContent = `Scrap: ${scraps}`;
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
        scraps -= brickCostScrap;
        masterTokens -= brickCostTokens;
        bricks += 1;
        
        counter.textContent = `Scrap: ${scraps}`;
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
        if (rebirthCountDisplay) {
            rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
        }

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
        
        const cost = upgrade1Costs[currentLevel];
        if (scraps >= cost) {
            scraps -= cost;
            upgradeLevels[index]++;
            scrapPerClick += 2;
            counter.textContent = `Scrap: ${scraps}`;
            
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
            scraps -= upgrade2Cost;
            upgradeLevels[index]++;
            counter.textContent = `Scrap: ${scraps}`;
            
            if (!autoClickerInterval) {
                autoClickerInterval = setInterval(() => {
                    scraps += 1;
                    counter.textContent = `Scrap: ${scraps}`;
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
        scraps -= cost;
        upgradeLevels[index]++;
        
        currentCooldownTime = Math.max(0.10, currentCooldownTime - 0.10);
        
        // Book pojawia się dopiero przy 2 poziomie cooldown
        if (upgradeLevels[2] >= 2) {
    bookContainer.classList.remove('hidden');
}
        
        counter.textContent = `Scrap: ${scraps}`;
    updateUpgradeInfo();
    updateScrapyardUI();
    if (window.saveSystem) saveSystem.saveGame();
    }
}
}

const barrelImages = ["assets/scrap.png", "assets/barrel1.png", "assets/barrel2.png", "assets/barrel3.png", "assets/barrel4.png", "assets/barrel5.png"];
// Aktualnie wybrana beczka (0 = domyślna). Zapisywana w save.
let selectedBarrelIndex = 0;

function updateBarrelImage(index) {
    if (index >= 0 && index < barrelImages.length) {
        scrapImage.src = barrelImages[index];
        selectedBarrelIndex = index;
    }
}

let scrapBonusPercent = 0;
// Blue Upgrades system (permanent Tires-based)
// Explicit cost list provided by user for Better Upgrades
const blueBetterCosts = [
    100, 300, 800, 1000, 1400, 6000, 10000, 15000, 30000,
    40000, 100000, 300000, 800000, 1000000, 3000000, 5000000
]; // 16 levels
// New Blue Upgrade: The Earnings (adds flat +10 scrap per click per level)
const blueEarningsCosts = [
    3000,        // L1
    15000,       // L2
    90000,       // L3
    450000,      // L4
    2500000,     // L5
    12000000,    // L6
    60000000,    // L7
    350000000,   // L8
    1500000000,  // L9
    6000000000   // L10
];
const blueUpgrades = {
    better: { level: 0, max: blueBetterCosts.length, multiplierPerLevel: 0.25 },
    // The Tires upgrade (now multi-level)
    tires: { level: 0, max: 30, perLevelBonus: 100 },
    earnings: { level: 0, max: 10, scrapPerLevel: 1000 }
};
// Costs for The Tires upgrade levels 1..30 (progressively large)
const blueTiresCosts = [
    35000, 70000, 140000, 245000, 350000, 525000, 700000, 1050000, 1400000, 2100000,
    3150000, 4200000, 5600000, 7000000, 9100000, 11900000, 15400000, 19600000, 24500000, 30100000,
    36400000, 43400000, 52500000, 63000000, 73500000, 87500000, 105000000, 126000000, 150500000, 178500000
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
    const better = 1 + blueUpgrades.better.level * blueUpgrades.better.multiplierPerLevel; // +0.25x per level
    return better;
}

function updateScrapBonus(index) {
    // Każda beczka daje stały bonus, scrap = 0, barrel1 = 1, barrel2 = 2, itd.
    scrapBonusPercent = index; // 0, 1, 2, 3, 4, 5
}

function calculateTotalScrap() {
    // Bazowy bonus z wybranej beczki (scrap=0, barrel1=1, itd.) + upgrady Mystery Book
    const baseBarrelBonus = scrapBonusPercent; // Teraz scrapBonusPercent to indeks (0,1,2,3,4,5) = bonus (0,1,2,3,4,5)
    const earningsFlat = (blueUpgrades.earnings ? blueUpgrades.earnings.level * blueUpgrades.earnings.scrapPerLevel : 0);
    const additive = scrapPerClick + baseBarrelBonus + (barrelLevels.reduce((sum, level) => sum + level, 0)) + earningsFlat;
    // Apply blue upgrade multiplier
    return additive * getClickMultiplier();
}

function handleBarrelButtonClick(index) {
    // Sprawdź wymagany rebirth dla tego barrel
    const requiredRebirth = index;
    if (rebirthCount < requiredRebirth) {
        alert(`You need at least ${requiredRebirth} rebirths to use this barrel!`);
        return;
    }
    
    updateBarrelImage(index);
    updateScrapBonus(index);
    if (window.saveSystem) saveSystem.saveGame(); // natychmiast zapisz wybór beczki
}

let bricks = 0;
let masterTokens = 0;
const barrelLevels = [0, 0, 0, 0, 0, 0];
const barrelMaxLevel = 5;
const barrelCosts = [1, 2, 4, 8, 16, 32];

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
    {
        img: 'tilesyard.png', name: 'TiresYard', desc: "Unlocks TiresYard in the Book as the 3rd option.",
        rebirth: 10, price: 120, scrapPrice: 15000, tilesPrice: 25, level: 0, maxLevel: 1, requiresTwoUpgrades: true
    },
    {
        img: 'goldscrapyard.png', name: 'Best Scrapyard', desc: "Upgrade your Scrapyard from 100 Scrap/s to 300 Scrap/s!",
        rebirth: 12, scrapPrice: 80000, brickPrice: 30, tilesPrice: 500, level: 0, maxLevel: 1
    },
    {
    img: 'blueupgrade.png', name: 'Tires Upgrades', desc: "Unlocks Blue Upgrades menu where you spend Tires on permanent upgrades (persist through rebirth).",
    rebirth: 14, scrapPrice: 2000000, brickPrice: 120, tilesPrice: 800, level: 0, maxLevel: 1
    },
    {
        img: 'Cloud.png', name: 'Storm', desc: 'Every 4 minutes a giant cloud drops 30 Tires across the screen.',
        rebirth: 16, price: 100, scrapPrice: 300000, tilesPrice: 500, level: 0, maxLevel: 1
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
    stormActive = true;
    for (let i = 0; i < STORM_DROP_COUNT; i++) {
        setTimeout(() => {
            if (typeof createFallingTire === 'function') createFallingTire();
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
            tireInterval = setInterval(createFallingTire, 60000);
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
    // Pierwsza pozycja tree
    let render = "";
    let upgImage = "star.png";
    let upgName = "";

    for (let upg in treeUpgrades) {
        // Always render TilesYard now (index 2); gating done in info window/purchase logic
        
        // go through tree upgrades and add them to the render
        // if you don't have enough rebirts they show specific star images based on rebirth requirement
        if (rebirthCount < treeUpgrades[upg].rebirth) {
            // Show specific star image based on rebirth requirement when locked
            upgImage = `star${treeUpgrades[upg].rebirth}.png`;
            upgName = ""; // Remove the text below stars
        } else {
            // Show actual upgrade image when unlocked
            upgImage = treeUpgrades[upg].img;
            upgName = treeUpgrades[upg].name;
        }
        
        // Add style to make star images 20% larger and add locked class for visual feedback
        const imageStyle = upgImage.includes('star') && upgImage !== 'star.png' ? 'style="transform: scale(1.2);"' : '';
        const lockedClass = rebirthCount < treeUpgrades[upg].rebirth ? 'tree-item-locked' : '';
        
        render = render + `<div class="tree-item ${lockedClass}" id="tree-item-${upg}">
                <img src="assets/${upgImage}" alt="Tree Upgrade" id="tree-item-${upg}-img" ${imageStyle}/>
                <div class="tree-text" id="tree-item-${upg}-text">${upgName}</div></div>`;
    }

    treeGeneration.innerHTML = render; // insert render into UI
    addTreeListeners(); // make buttons clickable
}

function updateTreeInfoWindow(index) {
    let upg = treeUpgrades[index];
    
    // Don't allow clicking on upgrades that require more rebirths than player has
    if (rebirthCount < upg.rebirth) {
        return false; // Block interaction completely
    }

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
    } else if (index === 3) { // Best Scrapyard - multi-currency cost
        requirementText += `, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (index === 4) { // Tires Upgrades - multi-currency cost
        requirementText += `, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires`;
        canAfford = bricks >= upg.brickPrice && scraps >= upg.scrapPrice && tiles >= upg.tilesPrice;
    } else if (upg.name === 'Storm') {
        requirementText += `, ${upg.scrapPrice} Scrap, ${upg.tilesPrice} Tires, ${upg.price} Master Tokens`;
        canAfford = scraps >= upg.scrapPrice && tiles >= upg.tilesPrice && masterTokens >= upg.price;
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
            } else {
                treeInfoBuyBtn.textContent = `Buy for ${upg.price} Master Tokens`;
            }
            if (index !== 4) {
                treeInfoBuyBtn.disabled = !canAfford;
            }
            treeInfoBuyBtn.classList.remove('hidden');
        } else {
            // Zablokowany
            treeInfoBuyBtn.classList.add('hidden');
        }
    }
}

function handleTreeUpgrade(index) {
    let upg = treeUpgrades[index];

    if (index === 0) { // Better Scrapyard - special requirements
        if (rebirthCount >= upg.rebirth && scrapyardPurchased && bricks >= upg.brickPrice && scraps >= upg.scrapPrice && upg.level < upg.maxLevel) {
            // Handle upgrade - deduct Brick and Scrap instead of Master Tokens
            bricks -= upg.brickPrice;
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
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
    } else if (index === 2 && upg.requiresTwoUpgrades) { // TilesYard upgrade now requires Tires upgrade only
        const tiresOwned = treeUpgrades[1].level >= 1;
        if (rebirthCount >= upg.rebirth && 
            tiresOwned && 
            scraps >= upg.scrapPrice &&
            tiles >= upg.tilesPrice &&
            masterTokens >= upg.price && 
            upg.level < upg.maxLevel) {
            
            // Handle upgrade - deduct Scrap, Tiles and Master Tokens
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
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            upg.level++;

            // If scrapyard purchased, set its tick to 300 scrap per second
            if (scrapyardPurchased) {
                if (scrapyardInterval) clearInterval(scrapyardInterval);
                scrapyardInterval = setInterval(() => {
                    scraps += 300;
                    counter.textContent = `Scrap: ${scraps}`;
                }, 1000);
            }

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            updateTilesUI();
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
            scraps -= upg.scrapPrice;
            tiles -= upg.tilesPrice;
            upg.level++;

            // Unlock Blue Upgrades UI
            if (blueUpgradeContainer) blueUpgradeContainer.classList.remove('hidden');

            // UI updates
            treeInfoBuyBtn.classList.add('hidden');
            updateBrickUI();
            updateTilesUI();
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
            if (counter) counter.textContent = `Scrap: ${scraps}`;
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
scrapImage.addEventListener('click', () => {
    if (canClick) {
        scraps += calculateTotalScrap();
        counter.textContent = `Scrap: ${scraps.toFixed(2)}`;
        checkUpgradeUnlock();
        updateScrapyardUI();

        if (Math.floor(scraps / 5) > masterTokens) {
            masterTokens++;
            updateMasterTokenUI();
        }

        canClick = false;
        cooldownBar.style.width = '0%';

        let timeLeft = currentCooldownTime;
        cooldownTimer.textContent = timeLeft.toFixed(2);

        const cooldownInterval = setInterval(() => {
            timeLeft -= 0.01;
            const percentage = (currentCooldownTime - timeLeft) / currentCooldownTime * 100;
            cooldownBar.style.width = `${percentage}%`;
            cooldownTimer.textContent = timeLeft.toFixed(2);

            if (timeLeft <= 0) {
                clearInterval(cooldownInterval);
                canClick = true;
                cooldownTimer.textContent = "READY";
            }
        }, 10);
    }
});

upgradeBtn.addEventListener('click', () => {
    upgradeWindow.classList.remove('hidden'); // <-- dodaj to
    upgradeWindow.classList.add('active');
    updateUpgradeInfo();
    if (typeof refreshUpgradeVisibility === 'function') refreshUpgradeVisibility();
    if (upgradeLevels[1] >= AUTOCLICKER_MAX_LEVEL && typeof showCooldownUpgrade === 'function') showCooldownUpgrade();
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
        const mult = (1 + b.level * b.multiplierPerLevel).toFixed(2);
        betterEffectEl.textContent = `Current: x${mult} ( +0.25x / lvl )`;
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
    { el: treeInfoWindow, triggerIds: [] }
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
