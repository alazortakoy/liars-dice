/* ========================================
   LIAR'S DICE - Sabitler
======================================== */

const CONSTANTS = {
    // Oyuncu Limitleri
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 6,
    DEFAULT_PLAYERS: 4,
    
    // Zar Ayarları
    STARTING_DICE: 5,
    DICE_SIDES: 6,
    
    // Zar Unicode Karakterleri
    DICE_FACES: {
        1: '⚀',
        2: '⚁',
        3: '⚂',
        4: '⚃',
        5: '⚄',
        6: '⚅'
    },
    
    // Varsayılan Oyuncu İsimleri
    DEFAULT_NAMES: [
        'Kaptan Jack',
        'Will Turner',
        'Davy Jones',
        'Barbossa',
        'Elizabeth',
        'Gibbs'
    ],
    
    // Oyuncu Pozisyonları (Yüzdelik - Oval Masa)
    PLAYER_POSITIONS: {
        2: [
            { top: '10%', left: '50%', transform: 'translateX(-50%)' },
            { bottom: '10%', left: '50%', transform: 'translateX(-50%)' }
        ],
        3: [
            { top: '10%', left: '50%', transform: 'translateX(-50%)' },
            { bottom: '20%', left: '15%' },
            { bottom: '20%', right: '15%' }
        ],
        4: [
            { top: '5%', left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', left: '5%', transform: 'translateY(-50%)' },
            { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
            { top: '50%', right: '5%', transform: 'translateY(-50%)' }
        ],
        5: [
            { top: '5%', left: '50%', transform: 'translateX(-50%)' },
            { top: '30%', left: '5%' },
            { bottom: '15%', left: '15%' },
            { bottom: '15%', right: '15%' },
            { top: '30%', right: '5%' }
        ],
        6: [
            { top: '5%', left: '50%', transform: 'translateX(-50%)' },
            { top: '25%', left: '5%' },
            { bottom: '25%', left: '5%' },
            { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
            { bottom: '25%', right: '5%' },
            { top: '25%', right: '5%' }
        ]
    },
    
    // Animasyon Süreleri (ms)
    ANIMATION: {
        DICE_ROLL: 500,
        CUP_LIFT: 300,
        TURN_DELAY: 1000
    }
};

// Freeze to prevent modifications
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.DICE_FACES);
Object.freeze(CONSTANTS.DEFAULT_NAMES);
Object.freeze(CONSTANTS.PLAYER_POSITIONS);
Object.freeze(CONSTANTS.ANIMATION);
