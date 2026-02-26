/* ========================================
   LIAR'S DICE - Oyun Yöneticisi
======================================== */

const Game = {
    players: [],
    currentPlayerIndex: 0,
    roundStarterIndex: 0,  // Her turda başlayan oyuncu değişir
    roundNumber: 1,
    jokerRule: true,
    gameStarted: false,
    gameOver: false,

    /**
     * Oyunu başlatır
     * @param {string[]} playerNames - Oyuncu isimleri
     * @param {boolean} jokerRule - 1'ler joker mi?
     */
    init(playerNames, jokerRule = true) {
        this.players = [];
        this.jokerRule = jokerRule;
        this.roundNumber = 1;
        this.currentPlayerIndex = 0;
        this.roundStarterIndex = 0;
        this.gameStarted = true;
        this.gameOver = false;

        // Oyuncuları oluştur
        playerNames.forEach((name, index) => {
            this.players.push(new Player(index, name));
        });

        // Teklif sistemini sıfırla
        BidManager.resetAll();

        // İlk turu başlat
        this.startRound();
    },

    /**
     * Yeni tur başlatır
     */
    startRound() {
        // Tüm oyuncuların zarlarını at
        this.players.forEach(player => {
            if (!player.isEliminated()) {
                player.rollDice();
            }
        });

        // Teklif sistemini tur için sıfırla
        BidManager.resetRound();
        
        // Tur başlatanı ayarla (elenmemiş olmalı)
        this.currentPlayerIndex = this.roundStarterIndex;
        while (this.players[this.currentPlayerIndex].isEliminated()) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }

        // UI'ı güncelle
        UI.updateTable(this.players, this.currentPlayerIndex);
        UI.updateGameInfo(this.roundNumber, null, this.getCurrentPlayer().name);
        UI.showBidPanel(true);
        UI.updateBidPanel(null, Dice.getTotalDiceCount(this.players));
        UI.addLog(`🎲 Tur ${this.roundNumber} başladı!`);
    },

    /**
     * Mevcut oyuncuyu döndürür
     * @returns {Player}
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    },

    /**
     * Aktif (elenmeyen) oyuncu sayısını döndürür
     * @returns {number}
     */
    getActivePlayerCount() {
        return this.players.filter(p => !p.isEliminated()).length;
    },

    /**
     * Sıradaki oyuncuya geçer
     */
    nextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isEliminated());

        UI.updateTable(this.players, this.currentPlayerIndex);
        UI.updateGameInfo(this.roundNumber, BidManager.getCurrentBid(), this.getCurrentPlayer().name);
    },

    /**
     * Teklif yapar
     * @param {number} quantity - Miktar
     * @param {number} value - Değer
     * @returns {boolean} - Başarılı mı
     */
    makeBid(quantity, value) {
        if (!BidManager.isValidBid(quantity, value)) {
            UI.showMessage('Geçersiz teklif! Miktarı veya değeri artırmalısınız.', 'error');
            return false;
        }

        const player = this.getCurrentPlayer();
        const bid = new Bid(quantity, value, player);
        BidManager.setBid(bid);

        UI.addLog(`${player.name}: ${bid.toString()}`);
        UI.updateGameInfo(this.roundNumber, bid, null);

        // Sıradaki oyuncuya geç
        this.nextPlayer();
        UI.updateBidPanel(bid, Dice.getTotalDiceCount(this.players));

        return true;
    },

    /**
     * LIAR! meydan okuması
     */
    callLiar() {
        const challenger = this.getCurrentPlayer();
        const bidder = BidManager.getCurrentBid().player;
        
        UI.addLog(`🏴‍☠️ ${challenger.name} "LIAR!" dedi!`);

        // Tüm kapları aç
        this.players.forEach(player => {
            if (!player.isEliminated()) {
                player.openCup();
            }
        });

        // Teklifi doğrula
        const result = BidManager.verifyBid(this.players, this.jokerRule);
        
        // Sonucu göster
        this.showChallengeResult(result, challenger, bidder);
    },

    /**
     * Meydan okuma sonucunu gösterir
     */
    showChallengeResult(result, challenger, bidder) {
        const allDice = Dice.getAllDice(this.players);
        
        let loser;
        let message;

        if (result.isCorrect) {
            // Teklif doğruydu, meydan okuyan kaybeder
            loser = challenger;
            message = `Teklif DOĞRU! Masada ${result.actualCount} tane ${result.bid.value} var. ${challenger.name} bir zar kaybetti!`;
        } else {
            // Teklif yanlıştı, teklif yapan kaybeder
            loser = bidder;
            message = `Teklif YANLIŞ! Masada sadece ${result.actualCount} tane ${result.bid.value} var. ${bidder.name} bir zar kaybetti!`;
        }

        // Zar kaybetme
        const eliminated = loser.loseDie();
        
        if (eliminated) {
            message += ` ${loser.name} oyundan elendi!`;
            UI.addLog(`❌ ${loser.name} elendi!`);
        }

        // Sonuç ekranını göster
        UI.showResultScreen(allDice, message, result.isCorrect, result.bid);

        // Oyun bitti mi kontrol et
        if (this.getActivePlayerCount() <= 1) {
            this.endGame();
        }
    },

    /**
     * Meydan okumadan sonra devam eder
     */
    continueAfterChallenge() {
        // Oyun bittiyse
        if (this.gameOver) {
            return;
        }

        // Yeni tur
        this.roundNumber++;
        
        // Sonraki tur için başlayan oyuncuyu değiştir (round-robin)
        this.roundStarterIndex = (this.roundStarterIndex + 1) % this.players.length;
        
        // Eğer bu oyuncu elendiyse, sıradaki aktif oyuncuyu bul
        while (this.players[this.roundStarterIndex].isEliminated()) {
            this.roundStarterIndex = (this.roundStarterIndex + 1) % this.players.length;
        }

        // Yeni turu başlat
        this.startRound();
    },

    /**
     * Oyunu bitirir
     */
    endGame() {
        this.gameOver = true;
        const winner = this.players.find(p => !p.isEliminated());
        UI.addLog(`🏆 ${winner.name} oyunu kazandı!`);
        
        // Kısa bir gecikme sonra kazanan ekranını göster
        setTimeout(() => {
            UI.showGameOverScreen(winner.name);
        }, 2000);
    },

    /**
     * Oyunu sıfırlar
     */
    reset() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.roundStarterIndex = 0;
        this.roundNumber = 1;
        this.gameStarted = false;
        this.gameOver = false;
        BidManager.resetAll();
    }
};
