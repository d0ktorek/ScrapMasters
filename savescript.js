// System zapisywania gry - ScrapMasters Save System
class SaveSystem {
    constructor() {
        this.saveKey = 'scrapMastersGameSave';
        this.autoSaveInterval = null;
        this.saveIntervalTime = 60000; // 60 sekund (1 minuta)
    }

    // Inicjalizacja systemu zapisywania
    init() {
        this.loadGame();
        this.startAutoSave();
        this.setupBeforeUnloadSave();
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
            cooldownTimeLeft: this.getCurrentCooldownTimeLeft(),
            
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
            selectedBarrelIndex: this.getCurrentBarrelIndex(),
            
            // Mystery Book dane
            masterTokens: masterTokens,
            bricks: bricks,
            barrelLevels: [...barrelLevels],
            barrelCosts: [...barrelCosts], // Dodano koszty barrel
            
            // Tree upgrades dane
            treeUpgrades: [...treeUpgrades],
            selectedTreeUpgrade: selectedTreeUpgrade, // Dodano wybrany tree upgrade
            
            // Czas ostatniego zapisu
            lastSaveTime: Date.now(),
            
            // Wersja save'a (na przyszłość dla kompatybilności)
            saveVersion: 1.1 // Zwiększono wersję
        };
    }

    // Określenie aktualnego indeksu beczki na podstawie obrazka
    getCurrentBarrelIndex() {
        const scrapImageSrc = document.getElementById('scrap-image').src;
        const barrelImages = ["assets/scrap.png", "assets/barrel1.png", "assets/barrel2.png", "assets/barrel3.png", "assets/barrel4.png", "assets/barrel5.png"];
        
        for (let i = 0; i < barrelImages.length; i++) {
            if (scrapImageSrc.includes(barrelImages[i].replace('assets/', ''))) {
                return i;
            }
        }
        return 0; // domyślnie scrap
    }

    // Pobieranie aktualnego pozostałego czasu cooldown
    getCurrentCooldownTimeLeft() {
        const cooldownTimer = document.getElementById('cooldown-timer');
        if (!cooldownTimer || canClick) {
            return 0; // Brak cooldown lub gotowy do kliknięcia
        }
        
        const timerText = cooldownTimer.textContent;
        if (timerText === "READY") {
            return 0;
        }
        
        const timeLeft = parseFloat(timerText);
        return isNaN(timeLeft) ? 0 : timeLeft;
    }

    // Zapisywanie gry do localStorage
    saveGame() {
        try {
            const gameData = this.getGameData();
            localStorage.setItem(this.saveKey, JSON.stringify(gameData));
            console.log('✅ Game saved!', new Date().toLocaleTimeString());
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
            
            // Sprawdzenie wersji save'a
            if (!gameData.saveVersion) {
                console.log('⚠️ Old save format - errors may occur');
            }

            // Przywracanie podstawowych danych
            scraps = gameData.scraps || 0;
            scrapPerClick = gameData.scrapPerClick || 1;
            currentCooldownTime = gameData.currentCooldownTime || 5.00;
            rebirthCount = gameData.rebirthCount || 0;

            // Przywracanie stanu klikania i cooldown
            canClick = gameData.canClick !== undefined ? gameData.canClick : true;
            const savedCooldownTimeLeft = gameData.cooldownTimeLeft || 0;

            // Przywracanie upgradów
            if (gameData.upgradeLevels && Array.isArray(gameData.upgradeLevels)) {
                for (let i = 0; i < gameData.upgradeLevels.length; i++) {
                    if (i < upgradeLevels.length) {
                        upgradeLevels[i] = gameData.upgradeLevels[i];
                    }
                }
            }

            // Przywracanie stanów
            scrapyardPurchased = gameData.scrapyardPurchased || false;
            scrapBonusPercent = gameData.scrapBonusPercent || 0;
            masterTokens = gameData.masterTokens || 0;
            bricks = gameData.bricks || 0;
            selectedTreeUpgrade = gameData.selectedTreeUpgrade || 0;

            // Przywracanie barrel levels
            if (gameData.barrelLevels && Array.isArray(gameData.barrelLevels)) {
                for (let i = 0; i < gameData.barrelLevels.length; i++) {
                    if (i < barrelLevels.length) {
                        barrelLevels[i] = gameData.barrelLevels[i];
                    }
                }
            }

            // Przywracanie barrel costs
            if (gameData.barrelCosts && Array.isArray(gameData.barrelCosts)) {
                for (let i = 0; i < gameData.barrelCosts.length; i++) {
                    if (i < barrelCosts.length) {
                        barrelCosts[i] = gameData.barrelCosts[i];
                    }
                }
            }

            // Przywracanie tree upgrades
            if (gameData.treeUpgrades && Array.isArray(gameData.treeUpgrades)) {
                for (let i = 0; i < gameData.treeUpgrades.length; i++) {
                    if (i < treeUpgrades.length && typeof treeUpgrades !== 'undefined') {
                        treeUpgrades[i].level = gameData.treeUpgrades[i].level != undefined ? gameData.treeUpgrades[i].level : 0;
                    }
                }
            }

            // Przywracanie auto clickera
            if (gameData.hasAutoClicker && !autoClickerInterval) {
                this.restoreAutoClicker();
            }

            // Przywracanie scrapyard interval
            if (gameData.hasScrapyardInterval && scrapyardPurchased && !scrapyardInterval) {
                this.restoreScrapyardInterval();
            }

            // Przywracanie obrazka beczki
            if (gameData.selectedBarrelIndex !== undefined) {
                updateBarrelImage(gameData.selectedBarrelIndex);
            }

            // Obliczenie offline progress (opcjonalne)
            if (gameData.lastSaveTime) {
                this.calculateOfflineProgress(gameData.lastSaveTime);
            }

            // Aktualizacja interfejsu
            this.updateAllUI();

            // Przywróć cooldown timer jeśli był aktywny
            if (savedCooldownTimeLeft > 0) {
                this.restoreCooldownTimer(savedCooldownTimeLeft);
            }

            console.log('✅ Game loaded!', new Date().toLocaleTimeString());
            console.log('💰 Scraps:', scraps);
            console.log('🔄 Rebirth Count:', rebirthCount);
            
            return true;

        } catch (error) {
            console.error('❌ Error loading game:', error);
            console.log('🔄 Starting new game');
            return false;
        }
    }

    // Przywracanie auto clickera
    restoreAutoClicker() {
        if (upgradeLevels[1] > 0) {
            autoClickerInterval = setInterval(() => {
                scraps += 1;
                counter.textContent = `Scrap: ${scraps}`;
            }, 1000);
        }
    }

    // Przywracanie scrapyard interval
    restoreScrapyardInterval() {
        if (scrapyardPurchased) {
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
        const now = Date.now();
        const timeDifferenceMinutes = (now - lastSaveTime) / (1000 * 60);
        
        // Maksymalnie 8 godzin offline progress
        const maxOfflineHours = 8;
        const maxOfflineMinutes = maxOfflineHours * 60;
        const actualOfflineMinutes = Math.min(timeDifferenceMinutes, maxOfflineMinutes);

        if (actualOfflineMinutes > 1) { // Tylko jeśli był offline więcej niż minutę
            let offlineEarnings = 0;

            // Auto clicker earnings
            if (upgradeLevels[1] > 0) {
                offlineEarnings += actualOfflineMinutes * 60; // 1 scrap/s = 60 scrap/min
            }

            // Scrapyard earnings
            if (scrapyardPurchased) {
                const totalScrap = calculateTotalScrap();
                offlineEarnings += actualOfflineMinutes * (totalScrap * 100 / 60);
            }

            if (offlineEarnings > 0) {
                scraps += Math.floor(offlineEarnings);
                
                // Pokazanie powiadomienia o offline earnings
                this.showOfflineEarningsNotification(actualOfflineMinutes, offlineEarnings);
            }
        }
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
        counter.textContent = `Scrap: ${scraps}`;
        
        // NAJPIERW odblokuj elementy na podstawie postępu
        this.unlockUIElementsBasedOnProgress();
        
        // POTEM aktualizuj wszystkie UI funkcje z głównego skryptu
        if (typeof updateUpgradeInfo === 'function') updateUpgradeInfo();
        if (typeof updateScrapyardUI === 'function') updateScrapyardUI();
        if (typeof updateRebirthUI === 'function') updateRebirthUI();
        if (typeof updateGreenUpgradeUI === 'function') updateGreenUpgradeUI();
        if (typeof updateTreeUI === 'function') updateTreeUI();
        if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        if (typeof updateBrickUI === 'function') updateBrickUI();
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
        
        // Reset selected tree upgrade
        if (typeof selectedTreeUpgrade !== 'undefined') {
            selectedTreeUpgrade = 0;
        }
        
        // Resetuj obrazek do domyślnego
        if (document.getElementById('scrap-image')) {
            document.getElementById('scrap-image').src = 'assets/scrap.png';
        }
        
        // Resetuj wszystkie koszty barrel do początkowych wartości
        if (typeof barrelCosts !== 'undefined') {
            const initialBarrelCosts = [1, 2, 4, 8, 16, 32];
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
                // Upgrade 0: max 20 poziomów
                if (upgradeLevels[0] > 20) upgradeLevels[0] = 20;
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
                    if (barrelLevels[i] > 5) barrelLevels[i] = 5; // max 5 poziomów
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
                const maxBarrelCosts = [1024, 2048, 4096, 8192, 16384, 32768]; // maksymalne rozsądne koszty
                for (let i = 0; i < barrelCosts.length; i++) {
                    if (barrelCosts[i] > maxBarrelCosts[i]) {
                        // Przywróć do początkowego kosztu i podnieś zgodnie z poziomem
                        const initialCost = [1, 2, 4, 8, 16, 32][i];
                        barrelCosts[i] = initialCost * Math.pow(2, barrelLevels[i]);
                    }
                    if (barrelCosts[i] < 1) barrelCosts[i] = [1, 2, 4, 8, 16, 32][i];
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
}

// Tworzenie globalnej instancji systemu zapisywania
const saveSystem = new SaveSystem();

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

console.log('💾 ScrapMasters Save System loaded!');
console.log('🔧 Available console commands: saveGame(), loadGame(), resetSave(), exportSave(), Fix()');
console.log('🎯 Use Fix() to repair game errors and refresh the interface!');