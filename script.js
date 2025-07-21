let scraps = 0;
let canClick = true;
let scrapPerClick = 1;
let autoClickerInterval = null;
let currentCooldownTime = 5.00;
let scrapyardInterval = null;
let scrapyardPurchased = false;
const scrapyardCost = 2000;
let rebirthCount = 0;
const rebirthCost = 4000;

const upgrade1Costs = [5, 15, 35, 80, 120, 160, 320, 850, 1000, 1500, 2000, 2500, 3000, 3200, 3500, 4500, 5500, 6600, 8800, 10000];
const upgrade2Cost = 50;
const upgrade3Costs = [30, 80, 300, 500, 600, 800, 900, 1000, 1300, 1600, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 18000, 22000, 26000, 30000, 35000, 40000, 45000, 50000, 60000, 70000];
const upgradeLevels = [0, 0, 0];

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

const UPGRADE_UNLOCK = 10;

// Inicjalizacja - ukryj przyciski na starcie
upgradeBtn.style.display = "none";
bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);  // Ukryj książkę na starcie
starBtn.style.display = "none";         // Gwiazda ukryta na starcie
mysteryBookContainer.classList.add('hidden'); // Ukryj mystery book na starcie

// Funkcje
function checkUpgradeUnlock() {
    if (scraps >= UPGRADE_UNLOCK) {
        upgradeBtn.style.display = "block";
    }
}

function updateRebirthUI() {
    starBtn.style.display = (scrapyardPurchased || rebirthCount > 0) ? "block" : "none";
}

function updateGreenUpgradeUI() {
    if (rebirthCount > 0) {
        greenUpgradeBtn.style.display = "block";
    } else {
        greenUpgradeBtn.style.display = "none";
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
    
    if (currentLevel1 < 1) {
        document.getElementById('upgrade-cost-1').textContent = 
            `${upgrade2Cost} Scrap`;
    } else {
        document.getElementById('upgrade-cost-1').textContent = "MAX";
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
        
        scrapyardInterval = setInterval(() => {
            scraps += 100;
            counter.textContent = `Scrap: ${scraps}`;
        }, 60000);
        
        updateScrapyardUI();
        updateRebirthUI(); // <-- dodaj to!
    }
}

function performRebirth() {
    if (scraps >= rebirthCost) {
        scraps = 0;
        scrapPerClick = 1;
        currentCooldownTime = 5.00;
        upgradeLevels[0] = 0;
        upgradeLevels[1] = 0;
        scrapyardPurchased = false;

        if (autoClickerInterval) clearInterval(autoClickerInterval);
        if (scrapyardInterval) clearInterval(scrapyardInterval);

        rebirthCount++;
        rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;

        counter.textContent = `Scrap: ${scraps}`;
        updateUpgradeInfo();
        updateScrapyardUI();
        updateGreenUpgradeUI();
        updateMysteryBookUI(); // Dodano aktualizację UI dla Mystery Book
        rebirthWindow.classList.remove('active');

        upgradeBtn.style.display = scraps >= UPGRADE_UNLOCK ? "block" : "none";
        bookContainer.classList.toggle('hidden', upgradeLevels[2] < 2);
        starBtn.style.display = rebirthCount > 0 ? "block" : "none";

        document.querySelector('.upgrade-item[data-index="1"]').classList.toggle('hidden', upgradeLevels[0] < 2);
        document.querySelector('.upgrade-item[data-index="2"]').classList.toggle('hidden', upgradeLevels[1] < 1);
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
        }
    } 
    else if (index === 1) {
        // Sprawdź czy autoclicker już na max poziomie (1)
        if (upgradeLevels[1] >= 1) {
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
            updateScrapyardUI();
            
            // DOPIERO PO UDANYM ZAKUPIE odblokowuj następny upgrade
            if (upgradeLevels[2] === 0) {
                document.querySelector('.upgrade-item[data-index="2"]').classList.remove('hidden');
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
    }
}
}

const barrelImages = ["assets/scrap.png", "assets/barrel1.png", "assets/barrel2.png", "assets/barrel3.png", "assets/barrel4.png", "assets/barrel5.png"];

function updateBarrelImage(index) {
    if (index >= 0 && index < barrelImages.length) {
        scrapImage.src = barrelImages[index];
    }
}

let scrapBonusPercent = 0;

function updateScrapBonus(index) {
    const bonusPercentages = [0, 2, 4, 6, 8, 10];
    scrapBonusPercent = bonusPercentages[index];
}

function calculateTotalScrap() {
    const bonusMultiplier = 1 + scrapBonusPercent / 100;
    const totalScrap = (scrapPerClick + (scrapyardPurchased ? 100 : 0)) * bonusMultiplier;
    return totalScrap;
}

function handleBarrelButtonClick(index) {
    if (rebirthCount >= index) {
        updateBarrelImage(index);
        updateScrapBonus(index);
    } else {
        alert(`Unlock this barrel with ${index} rebirth.`);
    }
}

let masterTokens = 0;
const barrelLevels = [0, 0, 0, 0, 0, 0];
const barrelMaxLevel = 5;
const barrelCosts = [1, 2, 4, 8, 16, 32];

function updateMasterTokenUI() {
    masterTokenCount.textContent = `Master Tokens: ${masterTokens}`;
}

function updateMysteryBookUI() {
    document.querySelectorAll('.mysterybook-item').forEach((item, index) => {
        const levelElement = item.querySelector('.mysterybook-level');
        const costElement = item.querySelector('.mysterybook-cost');
        levelElement.textContent = `Level: ${barrelLevels[index]}/${barrelMaxLevel}`;
        costElement.textContent = `Cost: ${barrelCosts[index]} Master Token`;
    });
}

function updateGreenUpgradeBonus(index) {
    const greenUpgradeText = document.querySelectorAll('.greenupgrade-text')[index];
    const bonusPercent = barrelLevels[index];
    greenUpgradeText.textContent = `+${bonusPercent}% Scrap`;
}

function handleMysteryBookUpgrade(index) {
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
});

closeUpgrades.addEventListener('click', () => {
    upgradeWindow.classList.remove('active');
    upgradeWindow.classList.add('hidden'); // <-- dodaj to
});

greenUpgradeBtn.addEventListener('click', () => {
    greenUpgradeWindow.classList.remove('hidden');
    greenUpgradeWindow.classList.add('active');
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
updateMysteryBookUI();
updateMasterTokenUI();
bookContainer.classList.toggle('hidden', rebirthCount < 3); // Ensure correct visibility based on rebirthCount
mysteryBookContainer.classList.toggle('hidden', rebirthCount < 3); // Ensure correct visibility based on rebirthCount

// Event listeners for greenupgrade buttons
document.querySelectorAll('.greenupgrade-button').forEach((button, index) => {
    button.addEventListener('click', () => handleBarrelButtonClick(index));
});