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
            barrelLevels: [...barrelLevels],
            
            // Czas ostatniego zapisu
            lastSaveTime: Date.now(),
            
            // Wersja save'a (na przyszłość dla kompatybilności)
            saveVersion: 1.0
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

            // Przywracanie barrel levels
            if (gameData.barrelLevels && Array.isArray(gameData.barrelLevels)) {
                for (let i = 0; i < gameData.barrelLevels.length; i++) {
                    if (i < barrelLevels.length) {
                        barrelLevels[i] = gameData.barrelLevels[i];
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
            scrapyardInterval = setInterval(() => {
                const totalScrap = calculateTotalScrap();
                scraps += Math.floor(totalScrap * 100 / 60); // 100 scrap/min z bonusami
                counter.textContent = `Scrap: ${scraps}`;
            }, 1000);
        }
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

    // Aktualizacja całego interfejsu po wczytaniu
    updateAllUI() {
        // Aktualizacja counter
        counter.textContent = `Scrap: ${scraps}`;
        
        // Aktualizacja wszystkich UI funkcji z głównego skryptu
        if (typeof updateUpgradeInfo === 'function') updateUpgradeInfo();
        if (typeof updateScrapyardUI === 'function') updateScrapyardUI();
        if (typeof updateRebirthUI === 'function') updateRebirthUI();
        if (typeof updateGreenUpgradeUI === 'function') updateGreenUpgradeUI();
        if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        if (typeof checkUpgradeUnlock === 'function') checkUpgradeUnlock();
        
        // Aktualizacja rebirth count
        if (rebirthCountDisplay) {
            rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
        }

        // Pokazanie/ukrycie elementów na podstawie rebirth count
        if (bookContainer) {
            bookContainer.classList.toggle('hidden', rebirthCount < 3);
        }
        if (mysteryBookContainer) {
            mysteryBookContainer.classList.toggle('hidden', rebirthCount < 3);
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
            
            // Wczytaj normalnie grę (czyli nową grę)
            this.loadGame();
            
            console.log('🔄 Game reset to initial state');
        } catch (error) {
            console.error('❌ Error resetting save:', error);
        }
    }

    // Funkcja resetująca wszystkie zmienne gry do wartości początkowych
    resetAllGameVariables() {
        // Podstawowe zmienne
        scraps = 0;
        canClick = true;
        scrapPerClick = 1;
        currentCooldownTime = 5.00;
        rebirthCount = 0;
        
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
        
        // Reset upgradów
        for (let i = 0; i < upgradeLevels.length; i++) {
            upgradeLevels[i] = 0;
        }
        
        // Reset green upgrades i bonusów
        scrapBonusPercent = 0;
        
        // Reset Mystery Book
        masterTokens = 0;
        for (let i = 0; i < barrelLevels.length; i++) {
            barrelLevels[i] = 0;
        }
        
        // Resetuj obrazek do domyślnego
        if (document.getElementById('scrap-image')) {
            document.getElementById('scrap-image').src = 'assets/scrap.png';
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

console.log('💾 ScrapMasters Save System loaded!');
console.log('🔧 Available console commands: saveGame(), loadGame(), resetSave(), exportSave()');
