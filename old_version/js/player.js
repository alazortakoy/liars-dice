/* ========================================
   LIAR'S DICE - Oyuncu Sınıfı
======================================== */

class Player {
    /**
     * Yeni oyuncu oluşturur
     * @param {number} id - Oyuncu ID
     * @param {string} name - Oyuncu ismi
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.diceCount = CONSTANTS.STARTING_DICE;
        this.dice = [];
        this.cupOpen = false;
    }

    /**
     * Zarları atar
     */
    rollDice() {
        this.dice = Dice.rollMultiple(this.diceCount);
        this.cupOpen = false;
    }

    /**
     * Kabı aç/kapa toggle
     */
    toggleCup() {
        this.cupOpen = !this.cupOpen;
    }

    /**
     * Kabı aç
     */
    openCup() {
        this.cupOpen = true;
    }

    /**
     * Kabı kapat
     */
    closeCup() {
        this.cupOpen = false;
    }

    /**
     * Zar kaybeder
     * @returns {boolean} - Oyuncu elendiyse true
     */
    loseDie() {
        this.diceCount--;
        if (this.diceCount < 0) this.diceCount = 0;
        return this.isEliminated();
    }

    /**
     * Oyuncu elendi mi?
     * @returns {boolean}
     */
    isEliminated() {
        return this.diceCount <= 0;
    }

    /**
     * Oyuncuyu sıfırlar (yeni oyun için)
     */
    reset() {
        this.diceCount = CONSTANTS.STARTING_DICE;
        this.dice = [];
        this.cupOpen = false;
    }

    /**
     * Oyuncu bilgilerini döndürür
     * @returns {Object}
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            diceCount: this.diceCount,
            dice: [...this.dice],
            cupOpen: this.cupOpen,
            eliminated: this.isEliminated()
        };
    }
}
