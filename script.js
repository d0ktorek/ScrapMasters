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
const brickCount = document.getElementById('brick-count');
const brickContainer = document.getElementById('brick-container');
const brickCounter = document.getElementById('brick-counter');
const brickyardSection = document.getElementById('brickyard-section');
const brickyardSeparator = document.getElementById('brickyard-separator');
const brickyardImage = document.getElementById('brickyard-image');
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
}

function updateGreenUpgradeUI() {
    if (rebirthCount > 0) {
        greenUpgradeBtn.style.display = "block";
    } else {
        greenUpgradeBtn.style.display = "none";
    }
}

function updateTreeUI() {
    if (rebirthCount >= 5) {
        treeContainer.classList.remove('hidden');
        // Show brickyard section and separator in scrapyard window
        if (brickyardSection) {
            brickyardSection.classList.remove('hidden');
        }
        if (brickyardSeparator) {
            brickyardSeparator.classList.remove('hidden');
        }
    } else {
        treeContainer.classList.add('hidden');
        // Hide brickyard section and separator in scrapyard window
        if (brickyardSection) {
            brickyardSection.classList.add('hidden');
        }
        if (brickyardSeparator) {
            brickyardSeparator.classList.add('hidden');
        }
    }
    
    // Brick counter jest zarządzany przez updateBrickUI()
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
        
        // Check if Tree Upgrade 1 (Better Scrapyard) is purchased
        const scrapyardUpgradeActive = treeUpgrades && treeUpgrades[0] && treeUpgrades[0].level > 0;
        const intervalTime = scrapyardUpgradeActive ? 1000 : 60000; // 1s if upgraded, 60s if not
        
        // Clear any existing interval first
        if (scrapyardInterval) {
            clearInterval(scrapyardInterval);
        }
        
        scrapyardInterval = setInterval(() => {
            scraps += 100;
            counter.textContent = `Scrap: ${scraps}`;
        }, intervalTime);
        
        updateScrapyardUI();
        updateRebirthUI(); // <-- dodaj to!
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
        
        // Dodaj 1 Brick za każdy rebirth (tylko od 5 rebirth)
        if (rebirthCount >= 5) {
            bricks += 1;
        }

        counter.textContent = `Scrap: ${scraps}`;
        updateUpgradeInfo();
        updateScrapyardUI();
        updateGreenUpgradeUI();
        updateTreeUI(); // Dodano aktualizację UI dla Tree
        updateMysteryBookUI(); // Dodano aktualizację UI dla Mystery Book
        updateBrickUI(); // Dodano aktualizację UI dla Brick
        rebirthWindow.classList.remove('active');
        rebirthWindow.classList.add('hidden');

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
    // Każda beczka daje stały bonus +1 Scrap/Click (zamiast procentów)
    scrapBonusPercent = index; // 0, 1, 2, 3, 4, 5
}

function calculateTotalScrap() {
    // Bazowy bonus z wybranej beczki (scrap=1, barrel1=2, itd.) + upgrady Mystery Book
    const baseBarrelBonus = scrapBonusPercent + 1; // +1 bo scrapBonusPercent to indeks (0,1,2,3,4,5)
    const totalScrap = scrapPerClick + baseBarrelBonus + (barrelLevels.reduce((sum, level) => sum + level, 0));
    return totalScrap;
}

function handleBarrelButtonClick(index) {
    updateBarrelImage(index);
    updateScrapBonus(index);
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
        img: 'scrapyard.png', name: 'Tree Upgrade 2', desc: "",
        rebirth: 8, price: 50, level: 0, maxLevel: 1
    },
    {
        img: 'scrapyard.png', name: 'Tree Upgrade 3', desc: "",
        rebirth: 10, price: 100, level: 0, maxLevel: 1
    },
    {
        img: 'scrapyard.png', name: 'Tree Upgrade 4', desc: "",
        rebirth: 12, price: 200, level: 0, maxLevel: 1
    },
    {
        img: 'scrapyard.png', name: 'Tree Upgrade 5', desc: "",
        rebirth: 14, price: 400, level: 0, maxLevel: 1
    },
    {
        img: 'scrapyard.png', name: 'Tree Upgrade 6', desc: "",
        rebirth: 16, price: 800, level: 0, maxLevel: 1
    },
];

var selectedTreeUpgrade = 0;

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
        
        levelElement.textContent = `Level: ${barrelLevels[index]}/${barrelMaxLevel}`;
        costElement.textContent = `Cost: ${barrelCosts[index]} Master Token`;
        
        button.disabled = barrelLevels[index] >= barrelMaxLevel || masterTokens < barrelCosts[index];
    });
}

function updateGreenUpgradeBonus(index) {
    const greenUpgradeText = document.querySelectorAll('.greenupgrade-text')[index];
    const baseBonus = index + 1; // Bazowy bonus: scrap=1, barrel1=2, barrel2=3, itd.
    const totalBonus = baseBonus + barrelLevels[index]; // Każdy poziom dodaje +1 Scrap/Click
    greenUpgradeText.textContent = `+${totalBonus} Scrap/Click`;
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

// Tree functions
function updateTreeUI() {
    // Pierwsza pozycja tree
    let render = "";
    let upgImage = "star.png";
    let upgName = "";

    for (let upg in treeUpgrades) {
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

    // Check special requirements for Better Scrapyard
    let canAfford = true;
    let requirementText = `Required: ${upg.rebirth} Rebirth`;
    
    if (index === 0) { // Better Scrapyard
        requirementText += `, Scrapyard, ${upg.brickPrice} Brick, ${upg.scrapPrice} Scrap`;
        canAfford = scrapyardPurchased && bricks >= upg.brickPrice && scraps >= upg.scrapPrice;
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
    
    // Pokaż przycisk upgrade tylko jeśli rebirth >= 6 i nie kupione
    if (treeInfoBuyBtn) {
        if (index === 0) {
            treeInfoBuyBtn.textContent = `Upgrade for ${upg.brickPrice} Brick + ${upg.scrapPrice} Scrap`;
        } else {
            treeInfoBuyBtn.textContent = `Upgrade for ${upg.price} Master Tokens`;
        }
        
        if (rebirthCount >= upg.rebirth && upg.level < upg.maxLevel && allPaths) {
            treeInfoBuyBtn.classList.remove('hidden');
            treeInfoBuyBtn.disabled = !canAfford;
        } else {
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

            // Better Scrapyard effect - change from 60s to 1s interval
            if (scrapyardPurchased && scrapyardInterval) {
                clearInterval(scrapyardInterval);
                scrapyardInterval = setInterval(() => {
                    scraps += 100;
                    counter.textContent = `Scrap: ${scraps}`;
                }, 1000); // Change to 1 second interval
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

        // Dodaj Brick co 50 Scrap (tylko po 5 rebirth)
        if (rebirthCount >= 5 && Math.floor(scraps / 50) > Math.floor((scraps - calculateTotalScrap()) / 50)) {
            bricks++;
            updateBrickUI();
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
updateTreeUI();
updateMysteryBookUI();
updateMasterTokenUI();
updateBrickUI();

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

closeTree.addEventListener('click', () => {
    treeWindow.classList.remove('active');
    treeWindow.classList.add('hidden');
});

// Event listener for tree items click (opens info window)
function addTreeListeners() {
    for (let x = 0; x < treeUpgrades.length; x++) {
        document.getElementById('tree-item-' + x).addEventListener('click', () => {
            updateTreeInfoWindow(x);
        });
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