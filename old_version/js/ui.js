/* ========================================
   LIAR'S DICE - UI Yöneticisi (Yeni UX)
======================================== */

const UI = {
    elements: {},

    init() {
        this.elements = {
            menuScreen: document.getElementById('menu-screen'),
            gameScreen: document.getElementById('game-screen'),
            resultScreen: document.getElementById('result-screen'),
            gameoverScreen: document.getElementById('gameover-screen'),
            
            playerCount: document.getElementById('player-count'),
            playerNames: document.getElementById('player-names'),
            jokerRule: document.getElementById('joker-rule'),
            startGameBtn: document.getElementById('start-game-btn'),
            
            roundNumber: document.getElementById('round-number'),
            lastBid: document.getElementById('last-bid'),
            activePlayerName: document.getElementById('active-player-name'),
            
            gameTable: document.getElementById('game-table'),
            
            bidPanel: document.getElementById('bid-panel'),
            bidQuantity: document.getElementById('bid-quantity'),
            qtyDecrease: document.getElementById('qty-decrease'),
            qtyIncrease: document.getElementById('qty-increase'),
            diceSelector: document.getElementById('dice-selector'),
            makeBidBtn: document.getElementById('make-bid-btn'),
            callLiarBtn: document.getElementById('call-liar-btn'),
            
            logList: document.getElementById('log-list'),
            
            revealedDice: document.getElementById('revealed-dice'),
            resultMessage: document.getElementById('result-message'),
            continueBtn: document.getElementById('continue-btn'),
            
            winnerName: document.getElementById('winner-name'),
            playAgainBtn: document.getElementById('play-again-btn'),
            mainMenuBtn: document.getElementById('main-menu-btn')
        };

        // Varsayılan zar seçimi
        this.selectedValue = 6;
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    },

    updatePlayerInputs(count) {
        const container = this.elements.playerNames;
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Oyuncu ${i + 1} ismi`;
            input.value = CONSTANTS.DEFAULT_NAMES[i] || `Oyuncu ${i + 1}`;
            input.dataset.playerIndex = i;
            container.appendChild(input);
        }
    },

    getPlayerNames() {
        const inputs = this.elements.playerNames.querySelectorAll('input');
        return Array.from(inputs).map((input, i) => 
            input.value.trim() || `Oyuncu ${i + 1}`
        );
    },

    /**
     * Masayı günceller - Yeni kart düzeni
     */
    updateTable(players, activeIndex) {
        const table = this.elements.gameTable;
        table.innerHTML = '';
        
        players.forEach((player, index) => {
            const card = document.createElement('div');
            card.className = 'player-area';
            card.dataset.playerId = player.id;
            
            if (index === activeIndex && !player.isEliminated()) {
                card.classList.add('active');
            }
            
            if (player.isEliminated()) {
                card.classList.add('eliminated');
            }
            
            // Header
            const header = document.createElement('div');
            header.className = 'player-header';
            
            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = player.name;
            header.appendChild(name);
            
            const diceCount = document.createElement('div');
            diceCount.className = 'player-dice-count';
            diceCount.textContent = `🎲 ${player.diceCount} zar`;
            header.appendChild(diceCount);
            
            card.appendChild(header);
            
            // Kap bölümü
            const cupSection = document.createElement('div');
            cupSection.className = 'cup-section';
            
            const cup = document.createElement('div');
            cup.className = 'cup' + (player.cupOpen ? ' open' : '');
            cup.innerHTML = '🍺';
            cup.onclick = () => this.handleCupClick(player);
            cupSection.appendChild(cup);
            
            const cupHint = document.createElement('div');
            cupHint.className = 'cup-hint';
            cupHint.textContent = player.cupOpen ? 
                '↑ Zarlar görünür' : 
                '← Zarları görmek için kaba tıkla';
            cupSection.appendChild(cupHint);
            
            card.appendChild(cupSection);
            
            // Zarlar
            const diceContainer = document.createElement('div');
            diceContainer.className = 'dice-container';
            
            if (player.cupOpen && !player.isEliminated()) {
                player.dice.forEach(d => {
                    const dice = document.createElement('div');
                    dice.className = 'dice';
                    dice.textContent = Dice.toFace(d);
                    diceContainer.appendChild(dice);
                });
            } else if (!player.isEliminated()) {
                for (let i = 0; i < player.diceCount; i++) {
                    const dice = document.createElement('div');
                    dice.className = 'dice hidden-dice';
                    dice.textContent = '?';
                    diceContainer.appendChild(dice);
                }
            }
            
            card.appendChild(diceContainer);
            
            // Son teklif göstergesi
            const currentBid = BidManager.getCurrentBid();
            if (currentBid && currentBid.player && currentBid.player.id === player.id) {
                const bidBadge = document.createElement('div');
                bidBadge.className = 'player-bid-badge';
                bidBadge.innerHTML = `<span class="bid-label">Son Teklif</span><span class="bid-value">${currentBid.quantity} × ${currentBid.value}</span>`;
                card.appendChild(bidBadge);
            }
            
            table.appendChild(card);
        });
    },

    handleCupClick(player) {
        player.toggleCup();
        this.updateTable(Game.players, Game.currentPlayerIndex);
    },

    updateGameInfo(round, bid, activePlayerName) {
        this.elements.roundNumber.textContent = round;
        this.elements.lastBid.textContent = bid ? bid.toString() : '-';
        if (activePlayerName) {
            this.elements.activePlayerName.textContent = activePlayerName;
        }
    },

    showBidPanel(show) {
        if (show) {
            this.elements.bidPanel.classList.remove('hidden');
        } else {
            this.elements.bidPanel.classList.add('hidden');
        }
    },

    updateBidPanel(currentBid, totalDice) {
        this.elements.callLiarBtn.disabled = !currentBid;
        
        const minBid = BidManager.getMinimumValidBid();
        this.selectedQuantity = minBid.quantity;
        this.selectedValue = minBid.value;
        this.maxQuantity = totalDice;
        
        this.elements.bidQuantity.textContent = this.selectedQuantity;
        this.updateDiceSelector();
    },

    updateDiceSelector() {
        const buttons = this.elements.diceSelector.querySelectorAll('.dice-btn');
        buttons.forEach(btn => {
            const value = parseInt(btn.dataset.value);
            btn.classList.toggle('selected', value === this.selectedValue);
        });
    },

    selectedQuantity: 1,
    selectedValue: 6,
    maxQuantity: 30,

    increaseQuantity() {
        if (this.selectedQuantity < this.maxQuantity) {
            this.selectedQuantity++;
            this.elements.bidQuantity.textContent = this.selectedQuantity;
        }
    },

    decreaseQuantity() {
        if (this.selectedQuantity > 1) {
            this.selectedQuantity--;
            this.elements.bidQuantity.textContent = this.selectedQuantity;
        }
    },

    selectDiceValue(value) {
        this.selectedValue = value;
        this.updateDiceSelector();
    },

    addLog(message) {
        const li = document.createElement('li');
        li.textContent = message;
        this.elements.logList.insertBefore(li, this.elements.logList.firstChild);
        
        while (this.elements.logList.children.length > 5) {
            this.elements.logList.removeChild(this.elements.logList.lastChild);
        }
    },

    clearLog() {
        this.elements.logList.innerHTML = '';
    },

    showMessage(message, type = 'info') {
        alert(message);
    },

    showResultScreen(allDice, message, bidWasCorrect, bid) {
        this.showScreen('result-screen');
        
        this.elements.revealedDice.innerHTML = '';
        const distribution = Dice.getDistribution(allDice);
        
        // Teklif bilgisi
        const bidInfo = document.createElement('div');
        bidInfo.className = 'result-bid-info';
        bidInfo.innerHTML = `
            <div class="result-bid-label">Yapılan Teklif:</div>
            <div class="result-bid-value">${bid.quantity} adet ${bid.value}</div>
        `;
        this.elements.revealedDice.appendChild(bidInfo);
        
        // Sayım özeti
        const targetCount = Dice.countValue(allDice, bid.value, Game.jokerRule);
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'result-summary';
        summaryDiv.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">Aranan (${bid.value}):</span>
                <span class="summary-count">${distribution[bid.value] || 0}</span>
            </div>
            ${Game.jokerRule && bid.value !== 1 ? `
            <div class="summary-item joker">
                <span class="summary-label">+ Joker (1):</span>
                <span class="summary-count">${distribution[1] || 0}</span>
            </div>
            ` : ''}
            <div class="summary-item total">
                <span class="summary-label">TOPLAM:</span>
                <span class="summary-count">${targetCount}</span>
            </div>
        `;
        this.elements.revealedDice.appendChild(summaryDiv);
        
        // Tüm zarları göster
        const allDiceDiv = document.createElement('div');
        allDiceDiv.className = 'result-all-dice';
        
        const allDiceLabel = document.createElement('div');
        allDiceLabel.className = 'all-dice-label';
        allDiceLabel.textContent = `Masadaki Tüm Zarlar (${allDice.length} adet):`;
        allDiceDiv.appendChild(allDiceLabel);
        
        const diceRow = document.createElement('div');
        diceRow.className = 'all-dice-row';
        
        // Zarları sırala ve göster
        const sortedDice = [...allDice].sort((a, b) => a - b);
        sortedDice.forEach(d => {
            const dice = document.createElement('span');
            dice.className = 'result-dice';
            dice.textContent = Dice.toFace(d);
            
            // Teklif edilen değeri vurgula
            if (d === bid.value) {
                dice.classList.add('highlight-bid');
            }
            // Joker vurgula
            if (Game.jokerRule && d === 1 && bid.value !== 1) {
                dice.classList.add('highlight-joker');
            }
            
            diceRow.appendChild(dice);
        });
        
        allDiceDiv.appendChild(diceRow);
        this.elements.revealedDice.appendChild(allDiceDiv);
        
        this.elements.resultMessage.textContent = message;
        this.elements.resultMessage.className = 'result-message ' + (bidWasCorrect ? 'win' : 'lose');
    },

    showGameOverScreen(winnerName) {
        this.showScreen('gameover-screen');
        this.elements.winnerName.textContent = `🏆 ${winnerName} Kazandı!`;
    }
};
