// System zapisywania gry - ScrapMasters Save System
class SaveSystem {
    constructor() {
        this.saveKey = 'scrapMastersGameSave';
        this.autoSaveInterval = null;
        this.saveIntervalTime = 60000; // 60 sekund (1 minuta)
        this.theme = null; // persisted theme class name (e.g., 'theme-dark')
    }

    // Zwraca pozostały czas cooldownu (w sekundach z dokładnością) lub 0 jeśli brak
    getCurrentCooldownTimeLeft() {
        // Jeśli można klikać, cooldown nie aktywny
        if (typeof canClick === 'undefined' || canClick) return 0;
        // Pobierz aktualny tekst timera jeśli istnieje
        const el = typeof cooldownTimer !== 'undefined' ? cooldownTimer : null;
        if (el && el.textContent) {
            const val = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
            return isNaN(val) ? 0 : val;
        }
        return 0;
    }

    // Zwraca aktualnie wybraną beczkę (indeks) jeśli globalna logika ją przechowuje
    getCurrentBarrelIndex() {
        // W głównym skrypcie może istnieć globalny selectedBarrelIndex albo logika w UI
        if (typeof selectedBarrelIndex !== 'undefined') return selectedBarrelIndex;
        // Fallback: brak informacji => 0
        return 0;
    }

    // Inicjalizacja systemu zapisywania
    init() {
        const loaded = this.loadGame();
        if (!loaded) {
            // Utwórz pierwszy zapis startowy
            this.saveGame();
        }
        this.startAutoSave();
        this.setupBeforeUnloadSave();
        window.__SAVE_SYSTEM_READY = true;
    }

    // Zbieranie wszystkich danych do zapisania
    getGameData() {
        return {
            // Podstawowe dane
            scraps: scraps,
            scrapPerClick: scrapPerClick,
            currentCooldownTime: currentCooldownTime,
            rebirthCount: rebirthCount,
            
            // Stan klikania i cooldown
            canClick: canClick,
            cooldownTimeLeft: (typeof this.getCurrentCooldownTimeLeft === 'function') ? this.getCurrentCooldownTimeLeft() : 0,
            
            // Stany upgradów
            upgradeLevels: [...upgradeLevels], // kopiujemy tablicę
            
            // Stany kupiona
            scrapyardPurchased: scrapyardPurchased,
            
            // Auto clicker
            hasAutoClicker: autoClickerInterval !== null,
            
            // Scrapyard
            hasScrapyardInterval: scrapyardInterval !== null,
            
            // Green upgrades i bonusy
            scrapBonusPercent: scrapBonusPercent,
            selectedBarrelIndex: (typeof this.getCurrentBarrelIndex === 'function') ? this.getCurrentBarrelIndex() : 0,
            
            // Mystery Book dane
            masterTokens: masterTokens,
            bricks: bricks,
            barrelLevels: [...barrelLevels],
            barrelCosts: [...barrelCosts], // Dodano koszty barrel
            
            // Tree upgrades dane
            treeUpgrades: [...treeUpgrades],
            selectedTreeUpgrade: selectedTreeUpgrade, // Dodano wybrany tree upgrade

            // Blue upgrades
            blueUpgrades: {
                better: { level: blueUpgrades && blueUpgrades.better ? blueUpgrades.better.level : 0 },
                tires: { level: blueUpgrades && blueUpgrades.tires ? blueUpgrades.tires.level : 0 },
                earnings: { level: blueUpgrades && blueUpgrades.earnings ? blueUpgrades.earnings.level : 0 }
            },

            // Storm system
            storm: {
                nextStormTime: (typeof nextStormTime !== 'undefined') ? nextStormTime : null,
                purchased: (typeof stormPurchased !== 'undefined') ? stormPurchased : false
            },
            
            // Tire system
            tires: tires,
            tiles: tiles, // New currency
            tilesTier: typeof tilesTier !== 'undefined' ? tilesTier : 0,
            tilesLevel: typeof tilesLevel !== 'undefined' ? tilesLevel : 0,
            hasTireInterval: tireInterval !== null,
            
            // Wybrany motyw
            theme: this.theme || (function(){ try { return localStorage.getItem('sm_theme'); } catch { return null; } })(),

            // Czas ostatniego zapisu
            lastSaveTime: Date.now(),
            
            // Active storm state (czy burza była w trakcie) – do odtworzenia
            stormActive: (typeof stormActive !== 'undefined') ? stormActive : false,

            // Chat username (persistujemy jeśli istnieje)
            chatUsername: (function(){
                try {
                    if (typeof chatUsername !== 'undefined' && chatUsername) return chatUsername;
                    const stored = localStorage.getItem('chat_username');
                    return stored ? stored : null;
                } catch { return null; }
            })(),

            // Wersja zapisu
            saveVersion: 1.5
        };
    }

    // Zapisywanie gry do localStorage
    saveGame() {
        try {
            const gameData = this.getGameData();
            // (saveVersion już dodany w getGameData)
            localStorage.setItem(this.saveKey, JSON.stringify(gameData));
            if (console && typeof console.log === 'function') {
                const size = JSON.stringify(gameData).length;
                console.log(`💾 Saved (${size} bytes) @ ${new Date().toLocaleTimeString()} (rebirths: ${rebirthCount}, scraps: ${scraps})`);
            }
            return true;
        } catch (error) {
            console.error('❌ Error saving game:', error);
            return false;
        }
    }

    // Wczytywanie gry z localStorage
    loadGame() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (!savedData) {
                console.log('📝 No saved game found - starting new game');
                return false;
            }
            const gameData = JSON.parse(savedData);
            const originalVersion = gameData.saveVersion || 1.0;
            if (!gameData.saveVersion) {
                console.log('⚠️ Old save format - errors may occur');
            }
            scraps = gameData.scraps || 0;
            scrapPerClick = gameData.scrapPerClick || 1;
            currentCooldownTime = gameData.currentCooldownTime || 5.00;
            rebirthCount = gameData.rebirthCount || 0;
            canClick = gameData.canClick !== undefined ? gameData.canClick : true;
            const savedCooldownTimeLeft = gameData.cooldownTimeLeft || 0;
            if (gameData.upgradeLevels && Array.isArray(gameData.upgradeLevels)) {
                for (let i = 0; i < gameData.upgradeLevels.length; i++) {
                    if (i < upgradeLevels.length) upgradeLevels[i] = gameData.upgradeLevels[i];
                }
            }
            scrapyardPurchased = gameData.scrapyardPurchased || false;
            scrapBonusPercent = gameData.scrapBonusPercent || 0;
            masterTokens = gameData.masterTokens || 0;
            bricks = gameData.bricks || 0;
            tires = gameData.tires || 0;
            tiles = gameData.tiles || 0;
            if (typeof tilesTier !== 'undefined') tilesTier = gameData.tilesTier || 0;
            if (typeof tilesLevel !== 'undefined') tilesLevel = gameData.tilesLevel || 0;
            selectedTreeUpgrade = gameData.selectedTreeUpgrade || 0;
            if (gameData.blueUpgrades && typeof blueUpgrades !== 'undefined') {
                if (gameData.blueUpgrades.better && blueUpgrades.better) blueUpgrades.better.level = gameData.blueUpgrades.better.level || 0;
                if (gameData.blueUpgrades.tires && blueUpgrades.tires) blueUpgrades.tires.level = gameData.blueUpgrades.tires.level || 0;
                if (gameData.blueUpgrades.earnings && blueUpgrades.earnings) blueUpgrades.earnings.level = gameData.blueUpgrades.earnings.level || 0;
            }
            if (gameData.barrelLevels && Array.isArray(gameData.barrelLevels)) {
                for (let i = 0; i < gameData.barrelLevels.length; i++) if (i < barrelLevels.length) barrelLevels[i] = gameData.barrelLevels[i];
            }
            if (gameData.barrelCosts && Array.isArray(gameData.barrelCosts)) {
                for (let i = 0; i < gameData.barrelCosts.length; i++) if (i < barrelCosts.length) barrelCosts[i] = gameData.barrelCosts[i];
            }
            if (gameData.treeUpgrades && Array.isArray(gameData.treeUpgrades)) {
                for (let i = 0; i < gameData.treeUpgrades.length; i++) if (i < treeUpgrades.length) treeUpgrades[i].level = gameData.treeUpgrades[i].level != undefined ? gameData.treeUpgrades[i].level : 0;
            }
            if (gameData.hasTireInterval && treeUpgrades[1] && treeUpgrades[1].level > 0 && typeof startTireInterval === 'function') startTireInterval();
            if (gameData.storm) {
                if (typeof stormPurchased !== 'undefined') stormPurchased = !!gameData.storm.purchased;
                if (typeof nextStormTime !== 'undefined') nextStormTime = gameData.storm.nextStormTime || null;
            }
            // Nie przywracamy trwającego sztormu po odświeżeniu – aktywny sztorm zostaje anulowany.
            if (typeof gameData.stormActive !== 'undefined' && gameData.stormActive) {
                console.log('⛈️ Active storm in save ignored (design: reset on refresh). Scheduling new cycle.');
                // Zaplanuj od nowa pełny interwał (reset timera)
                if (typeof nextStormTime !== 'undefined') {
                    try { nextStormTime = Date.now() + (4 * 60 * 1000); } catch {}
                }
                if (typeof stormActive !== 'undefined') stormActive = false;
            }
            if (gameData.hasAutoClicker && !autoClickerInterval) this.restoreAutoClicker();
            if (gameData.hasScrapyardInterval && scrapyardPurchased && !scrapyardInterval) this.restoreScrapyardInterval();
            if (gameData.hasTireInterval && typeof treeUpgrades !== 'undefined' && treeUpgrades[1].level >= 1 && !tireInterval) this.restoreTireInterval();
            if (gameData.selectedBarrelIndex !== undefined) updateBarrelImage(gameData.selectedBarrelIndex);
            if (typeof selectedBarrelIndex !== 'undefined' && gameData.selectedBarrelIndex !== undefined) {
                selectedBarrelIndex = gameData.selectedBarrelIndex;
            }
            // Theme restore
            try {
                this.theme = gameData.theme || this.theme || localStorage.getItem('sm_theme') || 'theme-dark';
                const root = document.documentElement;
                const allThemes = ['theme-dark','theme-neon','theme-solar','theme-forest','theme-ocean','theme-candy','theme-retro','theme-midnight'];
                allThemes.forEach(t => root.classList.remove(t));
                if (!allThemes.includes(this.theme)) this.theme = 'theme-dark';
                root.classList.add(this.theme);
                localStorage.setItem('sm_theme', this.theme);
            } catch {}

            this.updateAllUI();
            if (typeof initStormAfterLoad === 'function') initStormAfterLoad();
            if (savedCooldownTimeLeft > 0) this.restoreCooldownTimer(savedCooldownTimeLeft);
            if (originalVersion < 1.4 && typeof stormPurchased !== 'undefined' && stormPurchased && (!nextStormTime || nextStormTime < Date.now())) {
                if (typeof scheduleNextStorm === 'function') { scheduleNextStorm(true); console.log('🛠️ Migration 1.4: Scheduled new storm time'); }
            }
            // Przywróć chat username jeśli nie istnieje lokalnie
            try {
                if (gameData.chatUsername) {
                    const existing = localStorage.getItem('chat_username');
                    if (!existing) {
                        localStorage.setItem('chat_username', gameData.chatUsername);
                        console.log(`💬 Przywrócono chat username z zapisu: ${gameData.chatUsername}`);
                    }
                }
            } catch {}

            console.log('✅ Game loaded!', new Date().toLocaleTimeString(), `(save v${originalVersion} -> runtime v1.5)`);
            return true;
        } catch (e) {
            console.error('❌ Error loading game:', e); console.log('🔄 Starting new game'); return false;
        }
    }

    // External setter used by theme switcher
    setTheme(themeClassName) {
        this.theme = themeClassName;
        // Optionally auto-save quickly after theme change
        this.saveGame();
    }

    // Przywracanie auto clickera
    restoreAutoClicker() {
        if (upgradeLevels[1] > 0) {
            autoClickerInterval = setInterval(() => {
                scraps += 1;
                    try { counter.textContent = `Scrap: ${Math.floor(scraps).toLocaleString()}`; } catch { counter.textContent = `Scrap: ${Math.floor(scraps)}`; }
            }, 1000);
        }
    }

    // Przywracanie scrapyard interval
    restoreScrapyardInterval() {
        if (scrapyardPurchased) {
            // Determine rate based on tree upgrades (Better/Best Scrapyard)
            const better = treeUpgrades && treeUpgrades[0] && treeUpgrades[0].level > 0;
            const best = treeUpgrades && treeUpgrades[3] && treeUpgrades[3].level > 0;
            const perSecond = best ? 300 : (better ? 100 : 100/60); // default 100/min if none

            // Clear any existing interval first
            if (scrapyardInterval) clearInterval(scrapyardInterval);

            // Tick every second and add computed amount
            scrapyardInterval = setInterval(() => {
                scraps += perSecond;
                    try { counter.textContent = `Scrap: ${Math.floor(scraps).toLocaleString()}`; } catch { counter.textContent = `Scrap: ${Math.floor(scraps)}`; }
            }, 1000);
        }
    }

    // Przywracanie tire interval
    restoreTireInterval() {
        if (typeof startTireInterval === 'function') {
            startTireInterval();
            console.log('🛞 Tire interval restored');
        }
    }

    // Przywracanie cooldown timera po wczytaniu gry
    restoreCooldownTimer(timeLeft) {
        if (timeLeft <= 0 || canClick) {
            return; // Nie ma potrzeby przywracania
        }

        canClick = false;
        const cooldownBar = document.getElementById('cooldown-bar');
        const cooldownTimer = document.getElementById('cooldown-timer');
        
        if (!cooldownBar || !cooldownTimer) return;

        cooldownBar.style.width = '0%';
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
        
        console.log('🕐 Cooldown timer restored:', timeLeft.toFixed(2), 'seconds left');
    }

    // Obliczanie offline progress (ile gracz zarobił będąc offline)
    calculateOfflineProgress(lastSaveTime) {
        // Offline earnings feature removed
        return;
    }

    // Powiadomienie o zarobkach offline
    showOfflineEarningsNotification(minutes, earnings) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.floor(minutes % 60);
        
        let timeString = '';
        if (hours > 0) {
            timeString = `${hours}h ${remainingMinutes}m`;
        } else {
            timeString = `${remainingMinutes}m`;
        }

        // Tworzenie powiadomienia
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: black;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.5s ease;
        `;
        
        notification.innerHTML = `
            <div style="font-size: 16px;">🎉 Welcome back!</div>
            <div style="font-size: 14px; margin-top: 5px;">
                You were offline: ${timeString}<br>
                You earned: ${Math.floor(earnings)} Scrap!
            </div>
        `;

        // Dodanie animacji CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Usunięcie powiadomienia po 5 sekundach
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.5s ease reverse';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }

    // Odblokowuje elementy UI na podstawie postępu w grze
    unlockUIElementsBasedOnProgress() {
        // Odblokuj upgrade button jeśli masz wystarczająco scrapów
        if (scraps >= 10 && upgradeBtn) {
            upgradeBtn.style.display = "block";
        }
        
        // Odblokuj autoclicker upgrade (upgrade index 1) jeśli pierwszy upgrade >= 2
        const upgradeItem1 = document.querySelector('.upgrade-item[data-index="1"]');
        if (upgradeItem1 && upgradeLevels[0] >= 2) {
            upgradeItem1.classList.remove('hidden');
        }
        
        // Odblokuj cooldown upgrade (upgrade index 2) jeśli autoclicker został kupiony
        const upgradeItem2 = document.querySelector('.upgrade-item[data-index="2"]');
        if (upgradeItem2 && upgradeLevels[1] >= 1) {
            upgradeItem2.classList.remove('hidden');
        }
        // Odblokuj Funny Joke (upgrade index 3) jeśli cooldown >= 5
        const upgradeItem3 = document.querySelector('.upgrade-item[data-index="3"]');
        if (upgradeItem3 && upgradeLevels[2] >= 5) {
            upgradeItem3.classList.remove('hidden');
        }
        // Odblokuj Mass Trash (upgrade index 4) jeśli Funny Joke >= 4
        const upgradeItem4 = document.querySelector('.upgrade-item[data-index="4"]');
        if (upgradeItem4 && upgradeLevels[3] >= 4) {
            upgradeItem4.classList.remove('hidden');
        }
        // Bomblike removed
        
        // Odblokuj book (scrapyard) jeśli cooldown upgrade >= 2
        if (bookContainer && upgradeLevels[2] >= 2) {
            bookContainer.classList.remove('hidden');
        }
        
        // Odblokuj star button (rebirth) jeśli scrapyard kupiony lub już masz rebirthy
        if (starBtn && (scrapyardPurchased || rebirthCount > 0)) {
            starBtn.style.display = "block";
        }
        
        // Odblokuj green upgrade button jeśli masz rebirthy
        if (greenUpgradeBtn && rebirthCount > 0) {
            greenUpgradeBtn.style.display = "block";
        }
        
        // Odblokuj Mystery Book jeśli masz >= 3 rebirthy
        if (mysteryBookContainer && rebirthCount >= 3) {
            mysteryBookContainer.classList.remove('hidden');
        }
        
        // Odblokuj Tree jeśli masz >= 5 rebirthy
        if (typeof treeContainer !== 'undefined' && treeContainer && rebirthCount >= 5) {
            treeContainer.classList.remove('hidden');
        }
        
        // Odblokuj Brickyard section w oknie scrapyard jeśli masz >= 5 rebirthy
        const brickyardSection = document.getElementById('brickyard-section');
        const brickyardSeparator = document.getElementById('brickyard-separator');
        if (brickyardSection && rebirthCount >= 5) {
            brickyardSection.classList.remove('hidden');
            if (brickyardSeparator) {
                brickyardSeparator.classList.remove('hidden');
            }
        } else if (brickyardSection) {
            brickyardSection.classList.add('hidden');
            if (brickyardSeparator) {
                brickyardSeparator.classList.add('hidden');
            }
        }
        
        // Analizuj i pokaż Brick jeśli gracz ma >= 5 rebirthy
        if (rebirthCount >= 5) {
            const brickCounter = document.getElementById('brick-counter');
            if (brickCounter) {
                brickCounter.classList.remove('hidden');
                brickCounter.textContent = `Brick: ${bricks || 0}`;
                console.log(`💎 Brick unlocked! Player has ${rebirthCount} rebirths, showing ${bricks || 0} Brick`);
            }
        } else {
            const brickCounter = document.getElementById('brick-counter');
            if (brickCounter) {
                brickCounter.classList.add('hidden');
            }
        }
        
        console.log('🔓 UI elements unlocked based on progress');
    }

    // Aktualizacja całego interfejsu po wczytaniu
    updateAllUI() {
        // Aktualizacja counter
            try { counter.textContent = `Scrap: ${Math.floor(scraps).toLocaleString()}`; } catch { counter.textContent = `Scrap: ${Math.floor(scraps)}`; }
        
        // NAJPIERW odblokuj elementy na podstawie postępu
        this.unlockUIElementsBasedOnProgress();
        
        // POTEM aktualizuj wszystkie UI funkcje z głównego skryptu
        if (typeof updateUpgradeInfo === 'function') updateUpgradeInfo();
        if (typeof updateScrapyardUI === 'function') updateScrapyardUI();
    if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
        if (typeof updateRebirthUI === 'function') updateRebirthUI();
        if (typeof updateGreenUpgradeUI === 'function') updateGreenUpgradeUI();
        if (typeof updateGreenUpgradeBarrelAvailability === 'function') updateGreenUpgradeBarrelAvailability();
        if (typeof updateTreeUI === 'function') updateTreeUI();
        if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        if (typeof updateBrickUI === 'function') updateBrickUI();
        if (typeof updateTilesUI === 'function') updateTilesUI();
    if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
        if (typeof checkUpgradeUnlock === 'function') checkUpgradeUnlock();
        
        // Aktualizuj bonusy na wszystkich beczkach po wczytaniu gry
        if (typeof updateGreenUpgradeBonus === 'function') {
            for (let i = 0; i < 6; i++) {
                updateGreenUpgradeBonus(i);
            }
        }
        
        // Aktualizacja rebirth count
        if (rebirthCountDisplay) {
            rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
        }
    }

    // Rozpoczęcie automatycznego zapisywania
    startAutoSave() {
        // Zatrzymaj poprzedni interval jeśli istnieje
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Rozpocznij nowy interval
        this.autoSaveInterval = setInterval(() => {
            this.saveGame();
        }, this.saveIntervalTime);

        console.log('🔄 Auto-save started (every 60 seconds)');
    }

    // Zatrzymanie automatycznego zapisywania
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('⏹️ Auto-save stopped');
        }
    }

    // Zapisywanie przed zamknięciem strony
    setupBeforeUnloadSave() {
        window.addEventListener('beforeunload', (event) => {
            this.saveGame();
        });

        // Również zapisuj przy opuszczeniu strony (np. zmiana karty)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveGame();
            }
        });
    }

    // Resetowanie zapisu (przydatne do debugowania)
    resetSave() {
        try {
            // Usuń zapis z localStorage
            localStorage.removeItem(this.saveKey);
            console.log('🗑️ Save deleted');
            
            // Resetuj wszystkie zmienne do wartości początkowych
            this.resetAllGameVariables();
            
            // Aktualizuj cały interfejs użytkownika jak w normalnej grze
            this.updateAllUI();
            
            console.log('🔄 Game reset to initial state');
        } catch (error) {
            console.error('❌ Error resetting save:', error);
        }
    }

    // Funkcja resetująca wszystkie zmienne gry do wartości początkowych
    resetAllGameVariables() {
        // Podstawowe zmienne - PRAWDZIWIE początkowe wartości (nie testowe)
        scraps = 0;                        // Zaczynamy od 0, nie 1000000
        canClick = true;
        scrapPerClick = 1;
        currentCooldownTime = 5.00;
        rebirthCount = 0;                  // Zaczynamy od 0, nie 10000
        
        // Stany zakupów
        scrapyardPurchased = false;
        
        // Wyczyść wszystkie intervale
        if (autoClickerInterval) {
            clearInterval(autoClickerInterval);
            autoClickerInterval = null;
        }
        
        if (scrapyardInterval) {
            clearInterval(scrapyardInterval);
            scrapyardInterval = null;
        }
        
        // Reset upgradów - wszystkie poziomy na 0
        if (typeof upgradeLevels !== 'undefined') {
            for (let i = 0; i < upgradeLevels.length; i++) {
                upgradeLevels[i] = 0;
            }
        }
        
        // Reset green upgrades i bonusów
        scrapBonusPercent = 0;
        
        // Reset Mystery Book
        masterTokens = 0;
        bricks = 0; // Dodano reset dla bricks
        if (typeof barrelLevels !== 'undefined') {
            for (let i = 0; i < barrelLevels.length; i++) {
                barrelLevels[i] = 0;
            }
        }
        
        // Reset Tree upgrades
        if (typeof treeUpgrades !== 'undefined') {
            for (let i = 0; i < treeUpgrades.length; i++) {
                treeUpgrades[i].level = 0;
            }
        }

        // Reset Tire system
        tires = 0;
        tiles = 0; // Reset tiles
    if (typeof tilesTier !== 'undefined') tilesTier = 0; // Reset tiles tier
    if (typeof tilesLevel !== 'undefined') tilesLevel = 0; // Reset tiles level
        if (tireInterval) {
            clearInterval(tireInterval);
            tireInterval = null;
        }

        // Reset selected tree upgrade
        if (typeof selectedTreeUpgrade !== 'undefined') {
            selectedTreeUpgrade = 0;
        }        // Resetuj obrazek do domyślnego
        if (document.getElementById('scrap-image')) {
            document.getElementById('scrap-image').src = 'assets/scrap.png';
        }
        
        // Resetuj wszystkie koszty barrel do początkowych wartości
        if (typeof barrelCosts !== 'undefined') {
            const initialBarrelCosts = [1, 2, 4, 8, 16, 32, 64, 128, 256];
            for (let i = 0; i < barrelCosts.length && i < initialBarrelCosts.length; i++) {
                barrelCosts[i] = initialBarrelCosts[i];
            }
        }
        
        // Resetuj widoczność elementów UI - ukryj wszystko co powinno być ukryte na początku
        if (typeof upgradeBtn !== 'undefined' && upgradeBtn) {
            upgradeBtn.style.display = "none";
        }
        if (typeof starBtn !== 'undefined' && starBtn) {
            starBtn.style.display = "none";
        }
        if (typeof greenUpgradeBtn !== 'undefined' && greenUpgradeBtn) {
            greenUpgradeBtn.style.display = "none";
        }
        
        // Ukryj upgrade items które powinny być ukryte na początku
        const upgradeItem1 = document.querySelector('.upgrade-item[data-index="1"]');
        if (upgradeItem1) {
            upgradeItem1.classList.add('hidden');
        }
        
        const upgradeItem2 = document.querySelector('.upgrade-item[data-index="2"]');
        if (upgradeItem2) {
            upgradeItem2.classList.add('hidden');
        }
        
        // Ukryj książkę i Mystery Book
        if (typeof bookContainer !== 'undefined' && bookContainer) {
            bookContainer.classList.add('hidden');
        }
        if (typeof mysteryBookContainer !== 'undefined' && mysteryBookContainer) {
            mysteryBookContainer.classList.add('hidden');
        }
        if (typeof treeContainer !== 'undefined' && treeContainer) {
            treeContainer.classList.add('hidden');
        }
    }

    // Funkcja naprawiająca błędy w grze i resetująca nieprawidłowe wartości
    fixGame() {
        try {
            console.log('🔧 Starting game fix...');
            
            // Naprawa podstawowych wartości
            if (scraps < 0) scraps = 0;
            if (scrapPerClick < 1) scrapPerClick = 1;
            if (currentCooldownTime < 0.10) currentCooldownTime = 0.10;
            if (currentCooldownTime > 5.00) currentCooldownTime = 5.00;
            if (rebirthCount < 0) rebirthCount = 0;
            
            // Naprawa upgradów - ustaw maksymalne limity
            if (typeof upgradeLevels !== 'undefined') {
                // Upgrade 0: now unlimited levels; only clamp below 0
                if (upgradeLevels[0] < 0) upgradeLevels[0] = 0;
                
                // Upgrade 1 (autoclicker): max 1 poziom
                if (upgradeLevels[1] > 1) upgradeLevels[1] = 1;
                if (upgradeLevels[1] < 0) upgradeLevels[1] = 0;
                
                // Upgrade 2: max 30 poziomów
                if (upgradeLevels[2] > 30) upgradeLevels[2] = 30;
                if (upgradeLevels[2] < 0) upgradeLevels[2] = 0;
            }
            
            // Naprawa barrel levels
            if (typeof barrelLevels !== 'undefined') {
                for (let i = 0; i < barrelLevels.length; i++) {
                    if (barrelLevels[i] > 5) barrelLevels[i] = 5; // max 5 poziomów (unchanged)
                    if (barrelLevels[i] < 0) barrelLevels[i] = 0;
                }
            }
            
            // Naprawa master tokens i bricks
            if (masterTokens < 0) masterTokens = 0;
            if (bricks < 0) bricks = 0;
            
            // Naprawa scrapBonusPercent
            if (scrapBonusPercent < 0) scrapBonusPercent = 0;
            if (scrapBonusPercent > 10) scrapBonusPercent = 10; // max 10%
            
            // Naprawa barrel costs - przywróć do normalnych wartości jeśli są zbyt wysokie
            if (typeof barrelCosts !== 'undefined') {
                const maxBarrelCosts = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]; // maksymalne rozsądne koszty (extended)
                for (let i = 0; i < barrelCosts.length; i++) {
                    if (barrelCosts[i] > maxBarrelCosts[i]) {
                        // Przywróć do początkowego kosztu i podnieś zgodnie z poziomem
                        const initialCost = [1, 2, 4, 8, 16, 32][i];
                        barrelCosts[i] = initialCost * Math.pow(2, barrelLevels[i]);
                    }
                    if (barrelCosts[i] < 1) barrelCosts[i] = [1, 2, 4, 8, 16, 32, 64, 128, 256][i];
                }
            }
            
            // Wyczyść błędne intervale
            if (autoClickerInterval && upgradeLevels[1] === 0) {
                clearInterval(autoClickerInterval);
                autoClickerInterval = null;
            }
            
            if (scrapyardInterval && !scrapyardPurchased) {
                clearInterval(scrapyardInterval);
                scrapyardInterval = null;
            }
            
            // Przywróć intervale jeśli powinny działać
            if (!autoClickerInterval && upgradeLevels[1] > 0) {
                this.restoreAutoClicker();
            }
            
            if (!scrapyardInterval && scrapyardPurchased) {
                this.restoreScrapyardInterval();
            }
            
            // Zapisz naprawione dane
            this.saveGame();
            
            // Odśwież cały interfejs
            this.updateAllUI();
            
            console.log('✅ Game fixed successfully!');
            console.log('💰 Scraps:', scraps);
            console.log('🔧 Upgrade Levels:', upgradeLevels);
            console.log('🔄 Rebirth Count:', rebirthCount);
            console.log('🎯 Scrapyard Purchased:', scrapyardPurchased);
            console.log('🎪 Master Tokens:', masterTokens);
            
        } catch (error) {
            console.error('❌ Error during game fix:', error);
        }
    }

    // Eksportowanie zapisu (do pliku)
    exportSave() {
        try {
            const gameData = this.getGameData();
            const dataStr = JSON.stringify(gameData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `scrapMasters_save_${new Date().toISOString().slice(0,10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            console.log('📤 Save exported');
        } catch (error) {
            console.error('❌ Error exporting save:', error);
        }
    }

    // Importowanie zapisu (z pliku)
    importSave(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const gameData = JSON.parse(e.target.result);
                localStorage.setItem(this.saveKey, JSON.stringify(gameData));
                console.log('📥 Save imported');
                location.reload(); // Przeładuj stronę
            } catch (error) {
                console.error('❌ Error importing save:', error);
                alert('Error: Invalid save file!');
            }
        };
        reader.readAsText(file);
    }

    // Diagnostyka stanu systemu zapisu
    diagnose() {
        const methods = [
            'getCurrentCooldownTimeLeft',
            'getCurrentBarrelIndex',
            'saveGame',
            'loadGame'
        ];
        const report = {};
        methods.forEach(m => {
            report[m] = (typeof this[m] === 'function');
        });
        report.instanceType = this.constructor.name;
        report.readyFlag = !!window.__SAVE_SYSTEM_READY;
        report.sampleCooldown = typeof this.getCurrentCooldownTimeLeft === 'function' ? this.getCurrentCooldownTimeLeft() : null;
        console.table(report);
        return report;
    }
}

// Tworzenie globalnej instancji systemu zapisywania
const saveSystem = new SaveSystem();

// Wersja runtime SaveSystem (do diagnozy cache)
console.log('[SaveSystem Runtime] v1.5 build', new Date().toISOString());

// Monkey patch (awaryjnie) jeśli pomocnicze metody nie istnieją w instancji
if (typeof saveSystem.getCurrentCooldownTimeLeft !== 'function') {
    console.warn('[SaveSystem] Missing getCurrentCooldownTimeLeft on instance – patching');
    saveSystem.getCurrentCooldownTimeLeft = function() {
        if (typeof canClick === 'undefined' || canClick) return 0;
        const el = (typeof cooldownTimer !== 'undefined') ? cooldownTimer : null;
        if (el && el.textContent) {
            const v = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
            return isNaN(v) ? 0 : v;
        }
        return 0;
    };
}
if (typeof saveSystem.getCurrentBarrelIndex !== 'function') {
    console.warn('[SaveSystem] Missing getCurrentBarrelIndex on instance – patching');
    saveSystem.getCurrentBarrelIndex = function() {
        if (typeof selectedBarrelIndex !== 'undefined') return selectedBarrelIndex;
        return 0;
    };
}

// Funkcje pomocnicze dostępne globalnie
function saveGame() {
    return saveSystem.saveGame();
}

function loadGame() {
    return saveSystem.loadGame();
}

function resetSave() {
    if (confirm('Are you sure you want to reset the entire game? This action cannot be undone!')) {
        saveSystem.resetSave();
    }
}

function exportSave() {
    saveSystem.exportSave();
}

function Fix() {
    saveSystem.fixGame();
    console.log('🎯 Fix() completed! All game errors should be resolved.');
}


// Automatyczne uruchomienie systemu po załadowaniu DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        saveSystem.init();
    });
} else {
    // DOM już załadowany
    saveSystem.init();
}

// Dodatkowe opcje dla deweloperów (dostępne w konsoli)
window.saveSystem = saveSystem;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.resetSave = resetSave;
window.exportSave = exportSave;
window.Fix = Fix;
window.saveSystemDiagnose = () => saveSystem.diagnose();
console.log('💾 ScrapMasters Save System loaded!');
console.log('🔧 Core console commands: saveGame(), loadGame(), resetSave(), exportSave(), Fix()');
console.log('ℹ️ Developer/admin commands przeniesione do admincommands.js');