/* ========================================
   LIAR'S DICE - Ana Modül
   Oyun başlatma ve event listener'lar
======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // UI'ı başlat
    UI.init();

    // Varsayılan oyuncu sayısına göre input'ları oluştur
    const defaultCount = parseInt(UI.elements.playerCount.value);
    UI.updatePlayerInputs(defaultCount);

    // ============================================
    // MENÜ EVENT LISTENER'LARI
    // ============================================

    // Oyuncu sayısı değişince input'ları güncelle
    UI.elements.playerCount.addEventListener('change', (e) => {
        const count = parseInt(e.target.value);
        UI.updatePlayerInputs(count);
    });

    // Oyunu başlat
    UI.elements.startGameBtn.addEventListener('click', () => {
        const playerNames = UI.getPlayerNames();
        const jokerRule = UI.elements.jokerRule.checked;

        // Oyunu başlat
        Game.init(playerNames, jokerRule);

        // Oyun ekranına geç
        UI.showScreen('game-screen');
        UI.clearLog();
        UI.addLog('⚓ Oyun başladı! Şansınız bol olsun!');
    });

    // ============================================
    // TEKLİF PANELİ EVENT LISTENER'LARI
    // ============================================

    // Miktar azalt
    UI.elements.qtyDecrease.addEventListener('click', () => {
        UI.decreaseQuantity();
    });

    // Miktar artır
    UI.elements.qtyIncrease.addEventListener('click', () => {
        UI.increaseQuantity();
    });

    // Zar değeri seç
    UI.elements.diceSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.dice-btn');
        if (btn) {
            const value = parseInt(btn.dataset.value);
            UI.selectDiceValue(value);
        }
    });

    // Teklif yap
    UI.elements.makeBidBtn.addEventListener('click', () => {
        const quantity = UI.selectedQuantity;
        const value = UI.selectedValue;
        Game.makeBid(quantity, value);
    });

    // LIAR! meydan okuma
    UI.elements.callLiarBtn.addEventListener('click', () => {
        Game.callLiar();
        UI.showBidPanel(false);
    });

    // ============================================
    // SONUÇ EKRANI EVENT LISTENER'LARI
    // ============================================

    // Devam et
    UI.elements.continueBtn.addEventListener('click', () => {
        UI.showScreen('game-screen');
        Game.continueAfterChallenge();
    });

    // ============================================
    // OYUN SONU EVENT LISTENER'LARI
    // ============================================

    // Tekrar oyna
    UI.elements.playAgainBtn.addEventListener('click', () => {
        const playerNames = UI.getPlayerNames();
        const jokerRule = UI.elements.jokerRule.checked;
        
        Game.init(playerNames, jokerRule);
        UI.showScreen('game-screen');
        UI.clearLog();
        UI.addLog('⚓ Yeni oyun başladı!');
    });

    // Ana menü
    UI.elements.mainMenuBtn.addEventListener('click', () => {
        Game.reset();
        UI.showScreen('menu-screen');
    });

    // ============================================
    // KLAVYE KISAYOLLARI
    // ============================================

    document.addEventListener('keydown', (e) => {
        // Sadece oyun ekranında aktif
        if (!UI.elements.gameScreen.classList.contains('active')) return;

        switch(e.key) {
            case 'Enter':
                // Teklif yap
                if (!UI.elements.bidPanel.classList.contains('hidden')) {
                    UI.elements.makeBidBtn.click();
                }
                break;
            case 'l':
            case 'L':
                // LIAR!
                if (!UI.elements.callLiarBtn.disabled) {
                    UI.elements.callLiarBtn.click();
                }
                break;
            case 'ArrowUp':
                UI.increaseQuantity();
                break;
            case 'ArrowDown':
                UI.decreaseQuantity();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                UI.selectDiceValue(parseInt(e.key));
                break;
        }
    });

    console.log('🎲 Liar\'s Dice - Yalancı Zarı yüklendi!');
});
