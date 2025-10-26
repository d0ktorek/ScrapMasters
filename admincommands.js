(function(){
    function ensureSave() { if (typeof saveSystem !== 'undefined') saveSystem.saveGame(); }

    window.SetScrap = function(amount){
        if (typeof amount !== 'number' || amount < 0) { console.log('SetScrap() error: Provide positive number'); return; }
        if (typeof scraps === 'undefined') { console.log('SetScrap(): scraps not defined yet'); return; }
        scraps = amount;
        if (typeof counter !== 'undefined' && counter) {
            try { counter.textContent = `Scrap: ${Math.floor(scraps).toLocaleString()}`; } catch { counter.textContent = `Scrap: ${Math.floor(scraps)}`; }
        }
        if (typeof saveSystem !== 'undefined') { saveSystem.updateAllUI(); ensureSave(); }
        console.log(`SetScrap(): ${scraps}`);
    };

    window.SetRebirth = function(amount){
        if (typeof amount !== 'number' || amount < 0) { console.log('SetRebirth() error: Provide positive number'); return; }
        if (typeof rebirthCount === 'undefined') { console.log('SetRebirth(): rebirthCount not defined yet'); return; }
        rebirthCount = amount;
        if (typeof rebirthCountDisplay !== 'undefined' && rebirthCountDisplay) rebirthCountDisplay.textContent = `Rebirth: ${rebirthCount}`;
        if (typeof saveSystem !== 'undefined') { saveSystem.updateAllUI(); ensureSave(); }
        console.log(`SetRebirth(): ${rebirthCount}`);
    };

    window.setbrick = function(amount){
        if (typeof amount === 'undefined') { console.log(`Current Brick: ${typeof bricks !== 'undefined' ? bricks : 0}`); return; }
        if (typeof amount !== 'number' || amount < 0) { console.log('setbrick(): Provide positive number'); return; }
        if (typeof bricks === 'undefined') { console.log('setbrick(): bricks not defined yet'); return; }
        bricks = amount;
        if (typeof updateBrickUI === 'function') updateBrickUI();
        ensureSave();
        console.log(`setbrick(): Set Brick to ${bricks}`);
    };

    window.settokens = function(amount){
        if (typeof amount === 'undefined') { console.log(`Current Master Tokens: ${typeof masterTokens !== 'undefined' ? masterTokens : 0}`); return; }
        if (typeof amount !== 'number' || amount < 0) { console.log('settokens(): Provide positive number'); return; }
        if (typeof masterTokens === 'undefined') { console.log('settokens(): masterTokens not defined yet'); return; }
        masterTokens = amount;
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        ensureSave();
        console.log(`settokens(): Set Master Tokens to ${masterTokens}`);
    };

    window.droptire = function(){
        if (typeof createFallingTire === 'function') {
            createFallingTire();
            if (typeof tires !== 'undefined') tires += 1;
            const total = (typeof tires !== 'undefined') ? tires : '?';
            console.log(`droptire(): Spawned 1 tire! Total tires: ${total}`);
            ensureSave();
        } else {
            console.log('droptire(): Tire system not available.');
        }
    };

    window.settires = function(amount){
        if (typeof amount === 'undefined') { console.log(`Current Tires (tiles): ${typeof tiles !== 'undefined' ? tiles : 0}`); return; }
        if (typeof amount !== 'number' || amount < 0) { console.log('settires(): Provide non-negative number'); return; }
        if (typeof tiles === 'undefined') { console.log('settires(): tiles not defined yet'); return; }
        tiles = amount;
        if (typeof updateTilesUI === 'function') updateTilesUI();
        ensureSave();
        console.log(`settires(): Set Tires (tiles) to ${tiles}`);
    };

    window.resetblueupgrade = function(){
        if (typeof blueUpgrades === 'undefined' || !blueUpgrades.better) { console.log('resetblueupgrade(): Blue upgrades not initialized'); return; }
        blueUpgrades.better.level = 0;
        if (blueUpgrades.tires) blueUpgrades.tires.level = 0;
        if (blueUpgrades.earnings) blueUpgrades.earnings.level = 0;
        if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
        ensureSave();
        console.log('resetblueupgrade(): All blue upgrade levels reset to 0');
    };

    window.SendStorm = function(){
        if (typeof spawnStormCloud !== 'function') { console.log('SendStorm(): Storm system not available'); return; }
        if (typeof stormPurchased !== 'undefined' && !stormPurchased) { console.log('SendStorm(): Storm upgrade not purchased'); return; }
        if (typeof stormActive !== 'undefined' && stormActive) { console.log('SendStorm(): Storm already active'); return; }
        console.log('SendStorm(): Manual storm triggered');
        spawnStormCloud();
        ensureSave();
    };

    // Reset all Tree Upgrades (developer utility)
    window.resettree = function(){
        if (typeof treeUpgrades === 'undefined' || !Array.isArray(treeUpgrades)) { console.log('resettree(): treeUpgrades not available'); return; }
        // Reset levels for all tree upgrades to 0
        for (let i = 0; i < treeUpgrades.length; i++) {
            if (treeUpgrades[i] && typeof treeUpgrades[i].level !== 'undefined') {
                treeUpgrades[i].level = 0;
            }
        }
        // Stop tires and storm systems if they rely on purchases
        if (typeof stopTireInterval === 'function') stopTireInterval();
        if (typeof stormPurchased !== 'undefined') stormPurchased = false;
        // Hide storm timer if visible
        try { const st = document.getElementById('storm-timer'); if (st) st.style.display = 'none'; } catch {}
        // Refresh related UIs
        if (typeof updateTreeUI === 'function') updateTreeUI();
        if (typeof updateTilesUI === 'function') updateTilesUI();
        if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
        if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
        if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
        ensureSave();
        console.log('resettree(): All tree upgrades reset to level 0');
    };

    // Full reset: wipe all progress and localStorage save
    window.resetsave = function(){
        try {
            console.log('resetsave(): Starting full reset...');

            // Stop autosave to avoid re-saving after wipe
            if (typeof saveSystem !== 'undefined' && typeof saveSystem.stopAutoSave === 'function') {
                saveSystem.stopAutoSave();
            }

            // Clear runtime timers/intervals
            if (typeof autoClickerInterval !== 'undefined' && autoClickerInterval) { try { clearInterval(autoClickerInterval); } catch {} autoClickerInterval = null; }
            if (typeof scrapyardInterval !== 'undefined' && scrapyardInterval) { try { clearInterval(scrapyardInterval); } catch {} scrapyardInterval = null; }
            if (typeof tireInterval !== 'undefined' && tireInterval) { try { clearInterval(tireInterval); } catch {} tireInterval = null; }

            // Reset basic resources and states
            if (typeof scraps !== 'undefined') scraps = 0;
            if (typeof scrapPerClick !== 'undefined') scrapPerClick = 1;
            if (typeof canClick !== 'undefined') canClick = true;
            if (typeof currentCooldownTime !== 'undefined') currentCooldownTime = 5.00;
            if (typeof scrapyardPurchased !== 'undefined') scrapyardPurchased = false;
            if (typeof bricks !== 'undefined') bricks = 0;
            if (typeof masterTokens !== 'undefined') masterTokens = 0;
            if (typeof rebirthCount !== 'undefined') rebirthCount = 0;
            if (typeof tiles !== 'undefined') tiles = 0;
            if (typeof tires !== 'undefined') tires = 0;
            if (typeof tilesTier !== 'undefined') tilesTier = 0;
            if (typeof tilesLevel !== 'undefined') tilesLevel = 0;
            if (typeof selectedBarrelIndex !== 'undefined') selectedBarrelIndex = 0;

            // Reset upgrades
            if (typeof upgradeLevels !== 'undefined' && Array.isArray(upgradeLevels)) {
                for (let i = 0; i < upgradeLevels.length; i++) upgradeLevels[i] = 0;
            }
            if (typeof blueUpgrades !== 'undefined') {
                if (blueUpgrades.better) blueUpgrades.better.level = 0;
                if (blueUpgrades.tires) blueUpgrades.tires.level = 0;
                if (blueUpgrades.earnings) blueUpgrades.earnings.level = 0;
            }
            if (typeof barrelLevels !== 'undefined' && Array.isArray(barrelLevels)) {
                for (let i = 0; i < barrelLevels.length; i++) barrelLevels[i] = 0;
            }
            if (typeof treeUpgrades !== 'undefined' && Array.isArray(treeUpgrades)) {
                for (let i = 0; i < treeUpgrades.length; i++) {
                    if (treeUpgrades[i] && typeof treeUpgrades[i].level !== 'undefined') treeUpgrades[i].level = 0;
                }
            }

            // Reset storm system
            if (typeof stormPurchased !== 'undefined') stormPurchased = false;
            if (typeof stormActive !== 'undefined') stormActive = false;
            if (typeof nextStormTime !== 'undefined') nextStormTime = null;
            try { const st = document.getElementById('storm-timer'); if (st) st.style.display = 'none'; } catch {}

            // Wipe localStorage save and stats
            try {
                const SAVE_KEY = (typeof saveSystem !== 'undefined' && saveSystem.saveKey) ? saveSystem.saveKey : 'scrapMastersGameSave';
                localStorage.removeItem(SAVE_KEY);
                localStorage.removeItem('sm_stats');
                localStorage.removeItem('fj_lvl2_seen');
            } catch (e) { console.warn('resetsave(): localStorage wipe failed', e); }

            // UI refreshes
            try {
                if (typeof counter !== 'undefined' && counter) counter.textContent = 'Scrap: 0'; // no decimals
                if (typeof cooldownTimer !== 'undefined' && cooldownTimer) cooldownTimer.textContent = '5.00';
                if (typeof cooldownBar !== 'undefined' && cooldownBar) cooldownBar.style.width = '100%';

                if (typeof updateUpgradeInfo === 'function') updateUpgradeInfo();
                if (typeof updateScrapyardUI === 'function') updateScrapyardUI();
                if (typeof updateRebirthUI === 'function') updateRebirthUI();
                if (typeof updateGreenUpgradeUI === 'function') updateGreenUpgradeUI();
                if (typeof updateGreenUpgradeBarrelAvailability === 'function') updateGreenUpgradeBarrelAvailability();
                if (typeof updateScrapyardSectionsVisibility === 'function') updateScrapyardSectionsVisibility();
                if (typeof updateMysteryBookUI === 'function') updateMysteryBookUI();
                if (typeof updateMasterTokenUI === 'function') updateMasterTokenUI();
                if (typeof updateBrickUI === 'function') updateBrickUI();
                if (typeof updateTilesUI === 'function') updateTilesUI();
                if (typeof updateBlueUpgradeUI === 'function') updateBlueUpgradeUI();
                if (typeof updateTreeUI === 'function') updateTreeUI();
            } catch {}

            // Hide any open modals/windows
            try {
                const ids = ['upgrade-window','scrapyard-window','rebirth-window','greenupgrade-window','mysterybook-window','blueupgrade-window','tree-window','tree-info-window','funnyjoke-window'];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.classList.remove('active');
                    el.classList.add('hidden');
                });
            } catch {}

            console.log('resetsave(): All progress reset and save wiped from localStorage.');
        } catch (e) {
            console.error('resetsave(): Failed to reset save', e);
        }
    };

    // Force restock shop globally (server-side) and refresh client UI
    window.Refreshstore = async function(){
        try {
            const proto = (location && location.protocol || '').toLowerCase();
            if (proto === 'file:') { console.log('Refreshstore(): requires server (http/https)'); return; }
            const res = await fetch('/api/shop/restock', { method: 'POST' });
            const data = await res.json().catch(()=>null);
            if (!res.ok || !data || data.ok !== true) { console.log('Refreshstore(): failed', data); return; }
            console.log('Refreshstore(): restocked OK at server');
            try { if (window.refreshItemShop) window.refreshItemShop(); } catch {}
        } catch (e) {
            console.log('Refreshstore(): error', e);
        }
    };

    console.log('Admin commands loaded (developer utilities).');
    console.log('Available admin commands: SetScrap(x), SetRebirth(x), setbrick(x), settokens(x), droptire(), settires(x), resetblueupgrade(), SendStorm(), resettree(), resetsave(), Refreshstore()');
})();
