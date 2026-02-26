/* ========================================
   LIAR'S DICE - Zar Modülü
======================================== */

const Dice = {
    /**
     * Tek bir zar atar (1-6)
     * @returns {number}
     */
    roll() {
        return Math.floor(Math.random() * CONSTANTS.DICE_SIDES) + 1;
    },

    /**
     * Birden fazla zar atar
     * @param {number} count - Atılacak zar sayısı
     * @returns {number[]}
     */
    rollMultiple(count) {
        const dice = [];
        for (let i = 0; i < count; i++) {
            dice.push(this.roll());
        }
        return dice;
    },

    /**
     * Zar değerini Unicode karaktere çevirir
     * @param {number} value - Zar değeri (1-6)
     * @returns {string}
     */
    toFace(value) {
        return CONSTANTS.DICE_FACES[value] || '?';
    },

    /**
     * Zar dizisini Unicode karakterlere çevirir
     * @param {number[]} dice - Zar değerleri dizisi
     * @returns {string[]}
     */
    toFaces(dice) {
        return dice.map(d => this.toFace(d));
    },

    /**
     * Belirli bir değerin kaç kez geçtiğini sayar
     * @param {number[]} dice - Zar değerleri dizisi
     * @param {number} value - Aranacak değer
     * @param {boolean} jokersCount - 1'ler joker mi?
     * @returns {number}
     */
    countValue(dice, value, jokersCount = true) {
        let count = 0;
        for (const d of dice) {
            if (d === value) {
                count++;
            } else if (jokersCount && d === 1 && value !== 1) {
                // 1'ler joker olarak sayılır (1 hariç diğer değerler için)
                count++;
            }
        }
        return count;
    },

    /**
     * Tüm oyuncuların zarlarını birleştirir
     * @param {Player[]} players - Oyuncu dizisi
     * @returns {number[]}
     */
    getAllDice(players) {
        let allDice = [];
        for (const player of players) {
            if (!player.isEliminated()) {
                allDice = allDice.concat(player.dice);
            }
        }
        return allDice;
    },

    /**
     * Masadaki toplam zar sayısını hesaplar
     * @param {Player[]} players - Oyuncu dizisi
     * @returns {number}
     */
    getTotalDiceCount(players) {
        let total = 0;
        for (const player of players) {
            if (!player.isEliminated()) {
                total += player.diceCount;
            }
        }
        return total;
    },

    /**
     * Zar dağılımını hesaplar (her değerden kaç tane var)
     * @param {number[]} dice - Zar değerleri dizisi
     * @returns {Object}
     */
    getDistribution(dice) {
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const d of dice) {
            dist[d]++;
        }
        return dist;
    }
};

// Freeze to prevent modifications
Object.freeze(Dice);
