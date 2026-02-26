/* ========================================
   LIAR'S DICE - Teklif Sistemi
======================================== */

class Bid {
    /**
     * Yeni teklif oluşturur
     * @param {number} quantity - Miktar (kaç tane)
     * @param {number} value - Zar değeri (1-6)
     * @param {Player} player - Teklifi yapan oyuncu
     */
    constructor(quantity, value, player) {
        this.quantity = quantity;
        this.value = value;
        this.player = player;
        this.timestamp = Date.now();
    }

    /**
     * Teklifi string olarak döndürür
     * @returns {string}
     */
    toString() {
        return `${this.quantity} × ${this.value}`;
    }

    /**
     * Teklifi detaylı string olarak döndürür
     * @returns {string}
     */
    toDetailedString() {
        return `${this.player.name}: ${this.quantity} tane ${this.value} (${Dice.toFace(this.value)})`;
    }
}

const BidManager = {
    currentBid: null,
    bidHistory: [],

    /**
     * Yeni teklifi kayıt eder
     * @param {Bid} bid
     */
    setBid(bid) {
        this.currentBid = bid;
        this.bidHistory.push(bid);
    },

    /**
     * Mevcut teklifi döndürür
     * @returns {Bid|null}
     */
    getCurrentBid() {
        return this.currentBid;
    },

    /**
     * Teklif geçmişini döndürür
     * @returns {Bid[]}
     */
    getHistory() {
        return [...this.bidHistory];
    },

    /**
     * Teklif geçerli mi kontrol eder
     * (Bir önceki tekliften yüksek olmalı)
     * @param {number} quantity - Yeni miktar
     * @param {number} value - Yeni değer
     * @returns {boolean}
     */
    isValidBid(quantity, value) {
        // İlk teklif her zaman geçerli
        if (!this.currentBid) {
            return quantity >= 1 && value >= 1 && value <= 6;
        }

        const prevQty = this.currentBid.quantity;
        const prevVal = this.currentBid.value;

        // Miktar artırılmışsa: değer aynı veya farklı olabilir
        if (quantity > prevQty) {
            return value >= 1 && value <= 6;
        }

        // Miktar aynıysa: değer artırılmış olmalı
        if (quantity === prevQty) {
            return value > prevVal && value <= 6;
        }

        // Miktar azaltılamaz
        return false;
    },

    /**
     * Teklif doğru mu kontrol eder
     * @param {Player[]} players - Tüm oyuncular
     * @param {boolean} jokersCount - 1'ler joker mi?
     * @returns {Object} - { isCorrect, actualCount, bid }
     */
    verifyBid(players, jokersCount = true) {
        if (!this.currentBid) {
            return { isCorrect: false, actualCount: 0, bid: null };
        }

        const allDice = Dice.getAllDice(players);
        const actualCount = Dice.countValue(allDice, this.currentBid.value, jokersCount);

        return {
            isCorrect: actualCount >= this.currentBid.quantity,
            actualCount: actualCount,
            bid: this.currentBid
        };
    },

    /**
     * Minimum geçerli teklifi hesaplar
     * @returns {Object} - { quantity, value }
     */
    getMinimumValidBid() {
        if (!this.currentBid) {
            return { quantity: 1, value: 2 };
        }

        const prevQty = this.currentBid.quantity;
        const prevVal = this.currentBid.value;

        // Değeri artırabilir miyiz?
        if (prevVal < 6) {
            return { quantity: prevQty, value: prevVal + 1 };
        }

        // Değer 6'daysa miktarı artır
        return { quantity: prevQty + 1, value: 1 };
    },

    /**
     * Turu sıfırlar
     */
    resetRound() {
        this.currentBid = null;
    },

    /**
     * Tüm geçmişi sıfırlar
     */
    resetAll() {
        this.currentBid = null;
        this.bidHistory = [];
    }
};
