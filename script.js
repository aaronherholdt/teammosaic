document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket.io
    const socket = io();
    let currentPlayerId = null;
    
    // Screen elements
    const nameScreen = document.getElementById('nameScreen');
    const waitingRoom = document.getElementById('waitingRoom');
    const gameScreen = document.getElementById('gameScreen');
    
    // Name entry elements
    const playerNameInput = document.getElementById('playerNameInput');
    const joinGameBtn = document.getElementById('joinGameBtn');
    
    // Waiting room elements
    const waitingPlayerList = document.getElementById('waitingPlayerList');
    const playerCountDisplay = document.getElementById('playerCount');
    const startGameBtn = document.getElementById('startGameBtn');
    
    // Game elements
    const tileGrid = document.getElementById('tileGrid');
    const playerList = document.getElementById('playerList');
    const hintButton = document.getElementById('hintButton');
    const hintCounter = document.getElementById('hintCounter');
    const columnLabels = document.getElementById('columnLabels');
    const rowLabels = document.getElementById('rowLabels');
    
    // Game state
    let players = [];
    let currentPlayerIndex = 0;
    let gameStarted = false;
    let hintsRemaining = 3;
    let currentLevel = 1;
    let totalTurns = 45;
    let turnsRemaining = totalTurns;
    let isMobileDevice = window.innerWidth < 768;
    
    // Team achievements tracking
    let teamAchievements = {
        discoveries: 0,
        hintsShared: 0,
        consecutiveFinds: 0
    };
    
    // Add responsive resize handler
    window.addEventListener('resize', handleResize);
    
    function handleResize() {
        isMobileDevice = window.innerWidth < 768;
        
        // Adjust game container layout based on screen size
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            if (isMobileDevice) {
                gameContainer.classList.add('mobile-layout');
            } else {
                gameContainer.classList.remove('mobile-layout');
            }
        }
        
        // Adjust tile size based on screen width
        if (gameStarted) {
            adjustTileSize();
        }
        
        // Setup touch controls based on device
        initializeTouchControls();
    }
    
    function adjustTileSize() {
        const gridContainer = document.querySelector('.grid-container');
        let tileSize = 40; // Default size
        
        if (isMobileDevice) {
            // Calculate tile size based on available width
            const containerWidth = gridContainer.clientWidth - 40; // Subtract padding
            tileSize = Math.floor((containerWidth - 30) / 15); // 15 columns, minus space for labels
        }
        
        // Update CSS variables for responsive sizing
        document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
        
        // Update grid template columns
        if (tileGrid) {
            tileGrid.style.gridTemplateColumns = `repeat(15, ${tileSize}px)`;
            tileGrid.style.gridAutoRows = `${tileSize}px`;
        }
    }
    
    // Level configurations
    const levelConfigs = {
        1: {
            pattern: [
                // Simple smiley face
                { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },  // Left eye
                { row: 3, col: 9 }, { row: 3, col: 10 }, { row: 3, col: 11 },  // Right eye
                { row: 8, col: 4 }, { row: 9, col: 3 }, { row: 10, col: 3 },  // Left smile
                { row: 11, col: 4 }, { row: 11, col: 5 }, { row: 11, col: 6 },
                { row: 11, col: 7 }, { row: 11, col: 8 }, { row: 11, col: 9 },
                { row: 11, col: 10 }, { row: 11, col: 11 }, 
                { row: 10, col: 12 }, { row: 9, col: 12 }, { row: 8, col: 11 }  // Right smile
            ],
            turns: 100,
            message: "Welcome to Team Mosaic! Your team has 100 turns total. Use them wisely!"
        },
        2: {
            pattern: [
                // Heart shape
                { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 2, col: 6 },
                { row: 2, col: 9 }, { row: 2, col: 10 }, { row: 2, col: 11 },
                { row: 3, col: 3 }, { row: 3, col: 7 }, { row: 3, col: 8 }, { row: 3, col: 12 },
                { row: 4, col: 3 }, { row: 4, col: 12 },
                { row: 5, col: 4 }, { row: 5, col: 11 },
                { row: 6, col: 5 }, { row: 6, col: 10 },
                { row: 7, col: 6 }, { row: 7, col: 9 },
                { row: 8, col: 7 }, { row: 8, col: 8 },
                { row: 9, col: 7 }, { row: 9, col: 8 },
                { row: 10, col: 6 }, { row: 10, col: 9 },
                { row: 11, col: 5 }, { row: 11, col: 10 },
                { row: 12, col: 4 }, { row: 12, col: 11 }
            ],
            turns: 90,
            message: "Getting warmed up! Your team has 90 shared turns for this level."
        },
        3: {
            pattern: [
                // Star pattern
                { row: 2, col: 7 }, { row: 2, col: 8 },  // Top point
                { row: 3, col: 7 }, { row: 3, col: 8 },
                { row: 4, col: 7 }, { row: 4, col: 8 },
                { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 },  // Left arm
                { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 },
                { row: 5, col: 9 }, { row: 5, col: 10 }, { row: 5, col: 11 }, { row: 5, col: 12 },  // Right arm
                { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 9 }, { row: 6, col: 10 },
                { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 },
                { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 9 }, { row: 8, col: 10 },
                { row: 9, col: 4 }, { row: 9, col: 5 },  // Bottom left point
                { row: 10, col: 3 }, { row: 10, col: 4 },
                { row: 9, col: 10 }, { row: 9, col: 11 },  // Bottom right point
                { row: 10, col: 11 }, { row: 10, col: 12 },
                { row: 11, col: 7 }, { row: 11, col: 8 },  // Bottom middle point
                { row: 12, col: 7 }, { row: 12, col: 8 }
            ],
            turns: 80,
            message: "Now we're getting somewhere! 80 team turns for this challenge."
        },
        4: {
            pattern: [
                // Diamond with inner details
                { row: 2, col: 7 },  // Top point
                { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 }, { row: 3, col: 9 },
                { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 }, { row: 4, col: 10 },
                { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 }, { row: 5, col: 11 },
                { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 },
                { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 },
                { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 },
                { row: 9, col: 3 }, { row: 9, col: 4 }, { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 }, { row: 9, col: 9 }, { row: 9, col: 10 }, { row: 9, col: 11 },
                { row: 10, col: 4 }, { row: 10, col: 5 }, { row: 10, col: 6 }, { row: 10, col: 7 }, { row: 10, col: 8 }, { row: 10, col: 9 }, { row: 10, col: 10 },
                { row: 11, col: 5 }, { row: 11, col: 6 }, { row: 11, col: 7 }, { row: 11, col: 8 }, { row: 11, col: 9 },
                { row: 12, col: 7 }  // Bottom point
            ],
            turns: 70,
            message: "This one requires careful observation! Your team has 70 turns total."
        },
        5: {
            pattern: [
                // Complex flower pattern
                { row: 2, col: 7 },  // Center
                { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 }, { row: 3, col: 9 },
                { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 }, { row: 4, col: 10 },
                { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 }, { row: 5, col: 11 },
                { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 },
                { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 }, { row: 7, col: 11 },
                { row: 8, col: 4 }, { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 }, { row: 8, col: 10 },
                { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 }, { row: 9, col: 9 },
                { row: 10, col: 6 }, { row: 10, col: 7 }, { row: 10, col: 8 },
                { row: 11, col: 7 }  // Bottom center
            ],
            turns: 60,
            message: "Can you see the petals forming?"
        },
        6: {
            pattern: [
                // Butterfly pattern
                { row: 2, col: 7 },  // Head
                { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 }, { row: 3, col: 9 },
                { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 }, { row: 4, col: 10 }, { row: 4, col: 11 },
                { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 }, { row: 5, col: 11 }, { row: 5, col: 12 },
                { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 },
                { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 },
                { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 },
                { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 },
                { row: 10, col: 7 }  // Tail
            ],
            turns: 50,
            message: "This one's taking flight!"
        },
        7: {
            pattern: [
                // Tree pattern
                { row: 2, col: 7 },  // Top
                { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 },
                { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 },
                { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 },
                { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 },
                { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 },
                { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 },
                { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 },
                { row: 10, col: 7 },  // Trunk
                { row: 11, col: 7 },
                { row: 12, col: 7 }
            ],
            turns: 40,
            message: "Growing more complex by the minute!"
        },
        8: {
            pattern: [
                // Castle pattern
                { row: 2, col: 7 },  // Top tower
                { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 },
                { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 },
                { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 },
                { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 },
                { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 }, { row: 7, col: 11 }, { row: 7, col: 12 },
                { row: 8, col: 3 }, { row: 8, col: 4 }, { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 }, { row: 8, col: 10 }, { row: 8, col: 11 },
                { row: 9, col: 4 }, { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 }, { row: 9, col: 9 }, { row: 9, col: 10 },
                { row: 10, col: 5 }, { row: 10, col: 6 }, { row: 10, col: 7 }, { row: 10, col: 8 }, { row: 10, col: 9 },
                { row: 11, col: 6 }, { row: 11, col: 7 }, { row: 11, col: 8 },
                { row: 12, col: 7 }  // Bottom center
            ],
            turns: 30,
            message: "A royal challenge awaits!"
        },
        9: {
            pattern: [
                // Dragon pattern
                { row: 2, col: 7 },  // Head
                { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 },
                { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 },
                { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 },
                { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 },
                { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 }, { row: 7, col: 11 }, { row: 7, col: 12 },
                { row: 8, col: 3 }, { row: 8, col: 4 }, { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 }, { row: 8, col: 10 }, { row: 8, col: 11 },
                { row: 9, col: 4 }, { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 }, { row: 9, col: 9 }, { row: 9, col: 10 },
                { row: 10, col: 5 }, { row: 10, col: 6 }, { row: 10, col: 7 }, { row: 10, col: 8 }, { row: 10, col: 9 },
                { row: 11, col: 6 }, { row: 11, col: 7 }, { row: 11, col: 8 },
                { row: 12, col: 7 }  // Tail
            ],
            turns: 20,
            message: "The final challenge is near!"
        },
        10: {
            pattern: [
                // Ultimate challenge - Complex geometric pattern
                { row: 2, col: 7 },  // Top
                { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 }, { row: 3, col: 8 }, { row: 3, col: 9 },
                { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }, { row: 4, col: 9 }, { row: 4, col: 10 },
                { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 5, col: 10 }, { row: 5, col: 11 },
                { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 }, { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 }, { row: 6, col: 12 },
                { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 }, { row: 7, col: 10 }, { row: 7, col: 11 }, { row: 7, col: 12 }, { row: 7, col: 13 },
                { row: 8, col: 2 }, { row: 8, col: 3 }, { row: 8, col: 4 }, { row: 8, col: 5 }, { row: 8, col: 6 }, { row: 8, col: 7 }, { row: 8, col: 8 }, { row: 8, col: 9 }, { row: 8, col: 10 }, { row: 8, col: 11 }, { row: 8, col: 12 },
                { row: 9, col: 3 }, { row: 9, col: 4 }, { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 }, { row: 9, col: 9 }, { row: 9, col: 10 }, { row: 9, col: 11 },
                { row: 10, col: 4 }, { row: 10, col: 5 }, { row: 10, col: 6 }, { row: 10, col: 7 }, { row: 10, col: 8 }, { row: 10, col: 9 }, { row: 10, col: 10 },
                { row: 11, col: 5 }, { row: 11, col: 6 }, { row: 11, col: 7 }, { row: 11, col: 8 }, { row: 11, col: 9 },
                { row: 12, col: 6 }, { row: 12, col: 7 }, { row: 12, col: 8 },
                { row: 13, col: 7 }  // Bottom
            ],
            turns: 10,
            message: "The Ultimate Challenge! Can you solve it?"
        }
    };

    // Get control buttons
    const restartButton = document.getElementById('restartButton');
    const nextLevelButton = document.getElementById('nextLevelButton');
    
    // Socket.io event handlers
    socket.on('playerListUpdate', (updatedPlayers) => {
        players = updatedPlayers;
        updateWaitingRoom();
    });

    socket.on('enableStartButton', () => {
        startGameBtn.disabled = false;
    });

    socket.on('disableStartButton', () => {
        startGameBtn.disabled = true;
    });

    socket.on('gameStart', (gamePlayers) => {
        players = gamePlayers;
        waitingRoom.style.display = 'none';
        gameScreen.style.display = 'flex';
        startGame();
    });

    socket.on('tileUpdate', (data) => {
        const tile = document.querySelector(`[data-row="${data.row}"][data-col="${data.col}"]`);
        if (tile) {
            processTileSelection(tile, data.isPattern, data.playerId);
        }
    });

    socket.on('turnUpdate', (data) => {
        turnsRemaining = data.turnsRemaining;
        currentPlayerIndex = data.currentPlayerIndex;
        updateTurnsDisplay();
        updatePlayerList();
        updateTeamMessage(`It's ${players[currentPlayerIndex].name}'s turn now.`);
        announceForScreenReader(`${players[currentPlayerIndex].name}'s turn`);
    });

    socket.on('hintUpdate', (data) => {
        const tile = document.querySelector(`[data-row="${data.row}"][data-col="${data.col}"]`);
        if (tile) {
            tile.classList.add('hint-flash');
            // Add sparkle effect on hint
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            tile.appendChild(sparkle);
            
            setTimeout(() => {
                tile.classList.remove('hint-flash');
                if (sparkle && sparkle.parentNode) {
                    sparkle.remove();
                }
            }, 1000);
            
            // Only decrease hints on the player who shared the hint
            if (data.playerId === socket.id) {
                hintsRemaining--;
                hintCounter.textContent = hintsRemaining;
                if (hintsRemaining <= 0) {
                    hintButton.disabled = true;
                }
            }
        }
    });

    // Name entry handling
    playerNameInput.addEventListener('input', () => {
        joinGameBtn.disabled = !playerNameInput.value.trim();
    });
    
    // Add keyboard support for name entry
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && playerNameInput.value.trim()) {
            joinGameBtn.click();
        }
    });
    
    joinGameBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            socket.emit('playerJoin', playerName);
            nameScreen.style.display = 'none';
            waitingRoom.style.display = 'flex';
            announceForScreenReader("Entered waiting room. Waiting for other players to join.");
        }
    });
    
    // Helper function for screen reader announcements
    function announceForScreenReader(message) {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'assertive');
        announcer.setAttribute('class', 'sr-only');
        announcer.textContent = message;
        document.body.appendChild(announcer);
        
        setTimeout(() => {
            document.body.removeChild(announcer);
        }, 1000);
    }
    
    function updateWaitingRoom() {
        waitingPlayerList.innerHTML = '';
        players.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'waiting-player-item';
            playerElement.innerHTML = `
                <div class="player-icon">${player.name[0].toUpperCase()}</div>
                <span>${player.name}</span>
            `;
            waitingPlayerList.appendChild(playerElement);
        });
        
        playerCountDisplay.textContent = players.length;
        startGameBtn.disabled = players.length < 2;
        
        const waitingMessage = document.querySelector('.waiting-message');
        if (players.length < 2) {
            waitingMessage.textContent = 'Gathering your team...';
        } else if (players.length < 4) {
            waitingMessage.textContent = 'Team ready! Waiting for more teammates...';
        } else {
            waitingMessage.textContent = 'Full team assembled! Ready for action!';
        }
    }
    
    // Start game button handling
    startGameBtn.addEventListener('click', () => {
        if (players.length >= 2) {
            socket.emit('startGame');
        }
    });
    
    function startGame() {
        gameStarted = true;
        hintButton.disabled = false;
        
        // Initialize responsive layout
        handleResize();
        
        // Initialize current player to first player (index 0)
        currentPlayerIndex = 0;
        updatePlayerList();
        createCoordinateLabels();
        loadLevel(1);
        generateTiles();
        
        // Emit initial turn count to all players
        if (socket.id === players[0].id) {
            socket.emit('turnUsed', turnsRemaining);
        }
        
        updateTeamMessage(`Game started! It's ${players[currentPlayerIndex].name}'s turn first. Your team has ${turnsRemaining} total turns.`);
        announceForScreenReader(`Game started! It's ${players[currentPlayerIndex].name}'s turn first. Your team has ${turnsRemaining} total turns.`);
    }
    
    // Define grid size
    const rows = 15;
    const cols = 15;
    const totalTiles = rows * cols;
    
    // Create coordinate labels
    function createCoordinateLabels() {
        // Create column labels (A-O)
        columnLabels.innerHTML = '<div class="column-label"></div>'; // Empty cell for corner
        for (let i = 0; i < cols; i++) {
            const label = document.createElement('div');
            label.className = 'column-label';
            label.textContent = String.fromCharCode(65 + i); // A = 65 in ASCII
            columnLabels.appendChild(label);
        }
        
        // Create row labels (1-15)
        rowLabels.innerHTML = '';
        for (let i = 0; i < rows; i++) {
            const label = document.createElement('div');
            label.className = 'row-label';
            label.textContent = (i + 1).toString();
            rowLabels.appendChild(label);
        }
    }
    
    // Hidden pattern - Example: Simple smiley face pattern
    // 1 represents part of the pattern, 0 represents regular tiles
    const hiddenPattern = Array(rows).fill().map(() => Array(cols).fill(0));
    
    // Track discovered tiles
    const discoveredTiles = new Set();
    
    // Track currently focused tile position
    let focusedRow = 0;
    let focusedCol = 0;

    // Function to generate a random bright color
    function getRandomColor() {
        const colors = [
            'linear-gradient(45deg, #FF6B6B, #FF8787)',
            'linear-gradient(45deg, #4ECDC4, #45B7AF)',
            'linear-gradient(45deg, #FFD93D, #F6C90E)',
            'linear-gradient(45deg, #4D96FF, #6BA6FF)',
            'linear-gradient(45deg, #98CE00, #86B404)',
            'linear-gradient(45deg, #FF96C5, #FF5F9E)',
            'linear-gradient(45deg, #C3AED6, #8675A9)',
            'linear-gradient(45deg, #00D2D3, #01A3A4)',
            'linear-gradient(45deg, #FFA41B, #FF9100)',
            'linear-gradient(45deg, #54BAB9, #439A97)',
            'linear-gradient(45deg, #FF9A8B, #FF6F91)',
            'linear-gradient(45deg, #95E1D3, #7FCEC5)',
            'linear-gradient(45deg, #B5EAEA, #95BDFF)',
            'linear-gradient(45deg, #E8F3D6, #FAAB78)',
            'linear-gradient(45deg, #FCF69C, #F7D794)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Function to get coordinate notation
    function getCoordNotation(row, col) {
        const colLetter = String.fromCharCode(65 + col);
        const rowNumber = row + 1;
        return `${colLetter}${rowNumber}`;
    }
    
    // Update the player list display
    function updatePlayerList() {
        playerList.innerHTML = '';
        players.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.classList.add('player-item');
            playerElement.setAttribute('role', 'listitem');
            if (index === currentPlayerIndex && gameStarted) {
                playerElement.classList.add('active');
                playerElement.style.animation = 'pulse 1.5s infinite';
                playerElement.setAttribute('aria-current', 'true');
            }
            playerElement.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <div class="score-change" id="score-${index}"></div>
                </div>
                <span class="player-score">${player.score}</span>
            `;
            playerList.appendChild(playerElement);
        });
    }
    
    // Move to next player's turn
    function nextTurn() {
        // This function is kept for backward compatibility but no longer changes the currentPlayerIndex
        // The server will tell us whose turn it is next
        updatePlayerList();
    }
    
    // Reveal a random hint
    function revealHint() {
        if (hintsRemaining <= 0) return;
        
        const unrevealedPatternTiles = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (hiddenPattern[row][col] === 1 && !discoveredTiles.has(`${row}-${col}`)) {
                    unrevealedPatternTiles.push({ row, col });
                }
            }
        }
        
        if (unrevealedPatternTiles.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * unrevealedPatternTiles.length);
        const { row, col } = unrevealedPatternTiles[randomIndex];
        
        // Emit hint to server with player ID
        socket.emit('useHint', { row, col, playerId: socket.id });
        
        // Don't process hint locally - let the server broadcast it back
        // to ensure consistency across all clients
        
        // Announce hint location for screen readers
        announceForScreenReader(`Hint revealed at position ${getCoordNotation(row, col)}`);
        
        // Note: hintsRemaining is now decremented in the hintUpdate socket handler
    }
    
    // Hint button click handler
    hintButton.addEventListener('click', revealHint);
    
    // Process tile click or selection
    function processTileSelection(tile, isPattern = null, playerId = null) {
        if (!gameStarted || tile.classList.contains('revealed') || tile.classList.contains('disabled')) {
            return;
        }
        
        const currentRow = parseInt(tile.dataset.row);
        const currentCol = parseInt(tile.dataset.col);
        
        // If isPattern is null, this is a local click
        if (isPattern === null) {
            // Check if it's this player's turn
            if (socket.id !== players[currentPlayerIndex].id) {
                // Not this player's turn
                const currentPlayerName = players[currentPlayerIndex].name;
                updateTeamMessage(`It's ${currentPlayerName}'s turn now. Please wait for your turn.`);
                
                // Add a subtle shake animation to indicate it's not the player's turn
                tile.classList.add('not-your-turn');
                setTimeout(() => {
                    tile.classList.remove('not-your-turn');
                }, 500);
                
                return;
            }
            
            // Decrease turns with every click
            turnsRemaining--;
            
            // Emit turn update to server so all players see it
            socket.emit('turnUsed', turnsRemaining);
            
            // Emit tile selection to server
            socket.emit('tileSelect', {
                row: currentRow,
                col: currentCol,
                isPattern: hiddenPattern[currentRow][currentCol] === 1
            });
            
            // Process the tile locally
            isPattern = hiddenPattern[currentRow][currentCol] === 1;
            playerId = socket.id;
        }
        
        if (isPattern) {
            // This tile is part of the pattern
            tile.style.background = 'linear-gradient(45deg, #000000, #2d3436)';
            tile.classList.add('revealed');
            tile.setAttribute('aria-label', `Tile ${getCoordNotation(currentRow, currentCol)} - Pattern piece found!`);
            discoveredTiles.add(`${currentRow}-${currentCol}`);
            
            // Update player score if it's the current player
            if (playerId === socket.id) {
                const playerIndex = players.findIndex(p => p.id === playerId);
                if (playerIndex !== -1) {
                    players[playerIndex].score++;
                    showScoreAnimation(playerIndex, 1);
                    updatePlayerList();
                }
            }
            
            // Check if pattern is complete
            if (checkPatternCompletion()) {
                return;
            }
        } else {
            // Change to a new random color when clicked
            tile.style.background = getRandomColor();
            
            // Update aria-label to indicate miss
            tile.setAttribute('aria-label', `Tile ${getCoordNotation(currentRow, currentCol)} - Not part of pattern`);
        }
        
        // Check if out of turns
        if (turnsRemaining <= 0) {
            endGame(false);
            return;
        }
        
        // NOTE: nextTurn() is no longer called here since the server controls turn order
    }
    
    // Generate the tiles
    function generateTiles() {
        tileGrid.innerHTML = '';
        
        // Create a focus trap that navigates in a grid using arrow keys
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.dataset.coord = getCoordNotation(row, col);
                
                // Add accessibility attributes
                tile.setAttribute('role', 'gridcell');
                tile.setAttribute('tabindex', row === 0 && col === 0 ? '0' : '-1'); // Make first tile focusable
                tile.setAttribute('aria-label', `Tile ${getCoordNotation(row, col)}`);
                
                tile.style.background = getRandomColor();
                
                // Handle click events (works for mouse)
                tile.addEventListener('click', () => {
                    processTileSelection(tile);
                });
                
                // Enhanced touch controls
                tile.addEventListener('touchstart', (e) => {
                    // Prevent default to avoid double-firing with click events
                    e.preventDefault();
                    
                    // Store touch start time for long press detection
                    tile.touchStartTime = Date.now();
                    tile.touchStarted = true;
                    
                    // Show coordinate tooltip on touch start
                    const tooltip = document.createElement('div');
                    tooltip.className = 'touch-tooltip';
                    tooltip.textContent = tile.dataset.coord;
                    tile.appendChild(tooltip);
                }, { passive: false });
                
                tile.addEventListener('touchend', (e) => {
                    // Remove any tooltips
                    const tooltip = tile.querySelector('.touch-tooltip');
                    if (tooltip) tooltip.remove();
                    
                    // Check for long press (for hint functionality)
                    const touchDuration = Date.now() - (tile.touchStartTime || 0);
                    if (touchDuration >= 500 && hintsRemaining > 0) {
                        // Long press detected, show hint dialog
                        if (confirm('Use a hint on this tile?')) {
                            // Use hint at this location
                            const row = parseInt(tile.dataset.row);
                            const col = parseInt(tile.dataset.col);
                            socket.emit('useHint', { row, col });
                            
                            hintsRemaining--;
                            hintCounter.textContent = hintsRemaining;
                            if (hintsRemaining === 0) {
                                hintButton.disabled = true;
                            }
                        }
                    } else if (tile.touchStarted) {
                        // Normal touch - process tile selection
                        processTileSelection(tile);
                    }
                    
                    tile.touchStarted = false;
                });
                
                tile.addEventListener('touchmove', (e) => {
                    // Cancel the touch action if the finger moves too much
                    const touch = e.touches[0];
                    const tileRect = tile.getBoundingClientRect();
                    const touchX = touch.clientX;
                    const touchY = touch.clientY;
                    
                    // If touch moves outside the tile, cancel the touch action
                    if (touchX < tileRect.left || touchX > tileRect.right || 
                        touchY < tileRect.top || touchY > tileRect.bottom) {
                        tile.touchStarted = false;
                        
                        // Remove any tooltips
                        const tooltip = tile.querySelector('.touch-tooltip');
                        if (tooltip) tooltip.remove();
                    }
                });
                
                // Add keyboard handling for accessibility
                tile.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        // Select tile with Enter or Space
                        processTileSelection(tile);
                        e.preventDefault();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                               e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        // Handle arrow key navigation
                        navigateGrid(e.key, parseInt(tile.dataset.row), parseInt(tile.dataset.col));
                        e.preventDefault();
                    }
                });
                
                tileGrid.appendChild(tile);
            }
        }
        
        // Initialize focus position
        focusedRow = 0;
        focusedCol = 0;
    }
    
    // Handle grid navigation with arrow keys
    function navigateGrid(key, currentRow, currentCol) {
        let newRow = currentRow;
        let newCol = currentCol;
        
        switch (key) {
            case 'ArrowUp':
                newRow = Math.max(0, currentRow - 1);
                break;
            case 'ArrowDown':
                newRow = Math.min(rows - 1, currentRow + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, currentCol - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(cols - 1, currentCol + 1);
                break;
        }
        
        if (newRow !== currentRow || newCol !== currentCol) {
            // Update focus to new tile
            const currentTile = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
            const newTile = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
            
            if (currentTile && newTile) {
                currentTile.setAttribute('tabindex', '-1');
                newTile.setAttribute('tabindex', '0');
                newTile.focus();
                
                // Update focused position
                focusedRow = newRow;
                focusedCol = newCol;
            }
        }
    }
    
    function showScoreAnimation(playerIndex, points) {
        const scoreElement = document.getElementById(`score-${playerIndex}`);
        scoreElement.textContent = `+${points}`;
        scoreElement.style.animation = 'scorePopup 1s ease-out';
        setTimeout(() => {
            scoreElement.textContent = '';
            scoreElement.style.animation = '';
        }, 1000);
    }
    
    function checkPatternCompletion() {
        let totalPatternTiles = 0;
        hiddenPattern.forEach(row => {
            totalPatternTiles += row.filter(cell => cell === 1).length;
        });
        
        if (discoveredTiles.size === totalPatternTiles) {
            const maxScore = Math.max(...players.map(p => p.score));
            const winners = players.filter(p => p.score === maxScore);
            
            // Create confetti effect
            createConfetti();
            
            setTimeout(() => {
                // Calculate team stats
                const teamwork_rating = Math.min(5, Math.floor((teamAchievements.discoveries / totalPatternTiles * 3) + 
                                                             (teamAchievements.hintsShared / 3) + 
                                                             (players.length / 2)));
                
                const stars = "⭐".repeat(teamwork_rating);
                const message = winners.length > 1 
                    ? `🎉 Amazing teamwork! ${winners.map(w => w.name).join(' and ')} led the team to victory! 🎉`
                    : `🎉 Fantastic team effort! ${winners[0].name} helped the most with ${winners[0].score} discoveries! 🎉`;
                    
                const scores = players.map(p => 
                    `${p.name}: ${p.score} ${p.score === maxScore ? '👑' : ''}`).join('\n');

                // Show more accessible level completion message
                const nextLevelExists = levelConfigs[currentLevel + 1] !== undefined;
                const nextLevelMsg = nextLevelExists ? "\n\nClick 'Next Level' to continue your journey!" : "\n\nCongratulations! You've completed all levels!";
                
                const completionMsg = `Level ${currentLevel} Complete!\n\n${message}\n\nTeam Performance: ${stars}\n\nContributions:\n${scores}${nextLevelMsg}`;
                    
                alert(completionMsg);
                announceForScreenReader(completionMsg.replace('\n', ' '));
                
                // End the current level
                endGame(true);
                
                gameStarted = false;
                hintButton.disabled = true;
                hintsRemaining = 3;
                hintCounter.textContent = hintsRemaining;
                
                // Emit level completion event to server so all players see it
                socket.emit('levelComplete', {
                    level: currentLevel,
                    nextLevelExists: nextLevelExists
                });
            }, 1000);

            return true;
        }
        return false;
    }
    
    function createConfetti() {
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = getRandomColor();
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    function updateTurnsDisplay() {
        const turnsCounter = document.getElementById('turnsCounter');
        const turnsMessage = document.getElementById('turnsMessage');
        const turnsCard = document.querySelector('.turns-card');
        
        turnsCounter.textContent = turnsRemaining;
        
        if (turnsRemaining <= 5) {
            turnsCard.classList.add('low-turns');
            turnsMessage.textContent = '⚠️ Final team turns! Make them count!';
        } else if (turnsRemaining <= 10) {
            turnsCard.classList.add('low-turns');
            turnsMessage.textContent = 'Hurry! Team turns are running out!';
        } else if (turnsRemaining <= 20) {
            turnsMessage.textContent = 'Choose carefully! Every team turn counts!';
        } else {
            turnsCard.classList.remove('low-turns');
            turnsMessage.textContent = 'Use your team turns wisely!';
        }
    }

    function loadLevel(level) {
        const config = levelConfigs[level];
        if (!config) return false;

        // Reset the pattern
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                hiddenPattern[row][col] = 0;
            }
        }

        // Set new pattern
        config.pattern.forEach(({row, col}) => {
            hiddenPattern[row][col] = 1;
        });

        // Update game state
        currentLevel = level;
        totalTurns = config.turns;
        turnsRemaining = totalTurns;
        hintsRemaining = 3;
        discoveredTiles.clear();
        teamAchievements = {
            discoveries: 0,
            hintsShared: 0,
            consecutiveFinds: 0
        };

        // Update UI
        document.getElementById('levelCounter').textContent = level;
        document.getElementById('levelMessage').textContent = config.message;
        document.getElementById('hintCounter').textContent = hintsRemaining;
        updateTurnsDisplay();
        
        // Broadcast initial turn count to all players
        // Only the first player should emit to avoid multiple events
        if (socket.id === players[0].id) {
            socket.emit('turnUsed', turnsRemaining);
        }
        
        // Announce level load for screen readers
        announceForScreenReader(`Level ${level} loaded. ${config.message}`);
        
        return true;
    }

    function restartLevel() {
        loadLevel(currentLevel);
        gameStarted = true;
        hintButton.disabled = false;
        restartButton.style.display = 'none';
        nextLevelButton.style.display = 'none';
        generateTiles();
        updatePlayerList();
        announceForScreenReader(`Restarting level ${currentLevel}. You have ${totalTurns} turns.`);
    }

    function startNextLevel() {
        if (loadLevel(currentLevel + 1)) {
            gameStarted = true;
            hintButton.disabled = false;
            restartButton.style.display = 'none';
            nextLevelButton.style.display = 'none';
            generateTiles();
            updatePlayerList();
            announceForScreenReader(`Starting level ${currentLevel}. You have ${totalTurns} turns.`);
            
            // Emit next level event to server so all players transition
            socket.emit('startNextLevel', {
                level: currentLevel
            });
        } else {
            alert("Congratulations! You've completed all levels! 🎉");
            announceForScreenReader("Congratulations! You've completed all levels!");
        }
    }

    // Add event listeners for control buttons
    restartButton.addEventListener('click', restartLevel);
    nextLevelButton.addEventListener('click', startNextLevel);

    function endGame(isWin) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            const row = parseInt(tile.dataset.row);
            const col = parseInt(tile.dataset.col);
            if (hiddenPattern[row][col] === 1) {
                tile.style.background = 'linear-gradient(45deg, #000000, #2d3436)';
                tile.classList.add('revealed');
                tile.setAttribute('aria-label', `Tile ${getCoordNotation(row, col)} - Part of the pattern`);
            }
            tile.classList.add('disabled');
        });
        
        if (isWin) {
            updateTeamMessage(`Level ${currentLevel} Complete! You've discovered the pattern with ${turnsRemaining} turns remaining! 🎉`);
            // Show next level button only if next level exists
            if (levelConfigs[currentLevel + 1]) {
                nextLevelButton.style.display = 'block';
                nextLevelButton.classList.add('pulse-button');
                nextLevelButton.focus(); // Focus on the next level button for keyboard users
            } else {
                updateTeamMessage("Congratulations! You've completed all levels! 🎉");
            }
        } else {
            updateTeamMessage("Game Over! You've run out of turns. Try again! 💪");
            restartButton.style.display = 'block';
            restartButton.classList.add('pulse-button');
            restartButton.focus(); // Focus on the restart button for keyboard users
        }
        
        gameStarted = false;
        hintButton.disabled = true;
    }

    // Add CSS for pulsing button animation
    const pulseButtonStyle = document.createElement('style');
    pulseButtonStyle.textContent = `
        .pulse-button {
            animation: pulseButton 2s infinite;
        }
        
        @keyframes pulseButton {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); }
            100% { transform: scale(1); }
        }
        
        /* Not your turn animation */
        .not-your-turn {
            animation: shakeTile 0.5s ease-in-out;
            border: 2px solid #ff3232 !important;
        }
        
        @keyframes shakeTile {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-3px); }
            100% { transform: translateX(0); }
        }
        
        /* Message highlight animation */
        .message-highlight {
            animation: highlightMessage 2s ease-in-out;
            background-color: rgba(255, 255, 0, 0.2) !important;
            color: #ffffff !important;
            font-weight: bold;
        }
        
        @keyframes highlightMessage {
            0% { transform: scale(1); background-color: rgba(255, 255, 0, 0.2); }
            50% { transform: scale(1.05); background-color: rgba(255, 255, 0, 0.3); }
            100% { transform: scale(1); background-color: rgba(255, 255, 0, 0.2); }
        }
        
        /* Screen reader only class */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        
        /* Define CSS variable for tile size */
        :root {
            --tile-size: 40px;
        }
        
        /* Mobile-specific styles */
        @media (max-width: 767px) {
            .game-container.mobile-layout {
                flex-direction: column;
                gap: 20px;
            }
            
            .tile-grid {
                gap: 2px;
            }
            
            .column-label, .row-label {
                font-size: 12px;
            }
        }
        
        /* Touch-specific improvements */
        @media (hover: none) {
            .tile:hover {
                transform: none;
            }
            
            .tile:active {
                transform: scale(1.1);
            }
            
            .tile:hover::after {
                display: none;
            }
            
            .tile:focus::after {
                content: attr(data-coord);
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(45deg, #2d3436, #636e72);
                color: white;
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                pointer-events: none;
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                animation: popIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
        }
        
        /* Focus styling for keyboard navigation */
        .tile:focus {
            outline: 3px solid #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
            position: relative;
            z-index: 2;
        }
    `;
    document.head.appendChild(pulseButtonStyle);
    
    // Initialize the game layout
    handleResize();

    // Add socket event handlers for level transitions
    socket.on('levelComplete', (data) => {
        // This event is received by all players when any player completes a level
        if (gameStarted) {
            endGame(true);
            gameStarted = false;
            hintButton.disabled = true;
            hintsRemaining = 3;
            hintCounter.textContent = hintsRemaining;
        }
    });

    socket.on('nextLevelStarted', (data) => {
        // This event is received by all players when any player starts the next level
        if (!gameStarted) {
            loadLevel(data.level);
            gameStarted = true;
            hintButton.disabled = false;
            restartButton.style.display = 'none';
            nextLevelButton.style.display = 'none';
            generateTiles();
            updatePlayerList();
        }
    });

    // Function to update team message
    function updateTeamMessage(message) {
        const teamMessage = document.getElementById('teamMessage');
        if (teamMessage) {
            teamMessage.textContent = message;
            teamMessage.classList.add('message-highlight');
            setTimeout(() => {
                teamMessage.classList.remove('message-highlight');
            }, 2000);
        }
    }

    // Add swipe detection for grid navigation on mobile/tablet
    function initializeSwipeNavigation() {
        if (!isMobileDevice) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        let currentFocusedTile = null;
        
        tileGrid.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            
            // Find the currently focused tile
            currentFocusedTile = document.querySelector('.tile[tabindex="0"]');
            if (!currentFocusedTile && tileGrid.firstChild) {
                // If no tile is focused, set focus to the first tile
                tileGrid.firstChild.setAttribute('tabindex', '0');
                currentFocusedTile = tileGrid.firstChild;
                focusedRow = parseInt(currentFocusedTile.dataset.row) || 0;
                focusedCol = parseInt(currentFocusedTile.dataset.col) || 0;
            }
        }, { passive: true });
        
        tileGrid.addEventListener('touchend', (e) => {
            if (!currentFocusedTile) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Detect swipe direction (if the movement is significant)
            const minSwipeDistance = 50; // Minimum distance for a swipe
            
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                // Horizontal swipe
                if (deltaX > 0) {
                    // Swipe right
                    navigateGrid('ArrowRight', focusedRow, focusedCol);
                } else {
                    // Swipe left
                    navigateGrid('ArrowLeft', focusedRow, focusedCol);
                }
            } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
                // Vertical swipe
                if (deltaY > 0) {
                    // Swipe down
                    navigateGrid('ArrowDown', focusedRow, focusedCol);
                } else {
                    // Swipe up
                    navigateGrid('ArrowUp', focusedRow, focusedCol);
                }
            }
        }, { passive: true });
    }

    // Add double-tap support for zoom/focus on mobile
    function initializeDoubleTapZoom() {
        if (!isMobileDevice) return;
        
        let lastTap = 0;
        let tapTimeout;
        
        tileGrid.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            const tapLength = currentTime - lastTap;
            
            clearTimeout(tapTimeout);
            
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                
                // Find the tile that was tapped
                const touch = e.changedTouches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (element && element.classList.contains('tile')) {
                    // Zoom effect on double tap
                    element.classList.add('zoomed');
                    
                    // Remove zoom after a short delay
                    setTimeout(() => {
                        element.classList.remove('zoomed');
                    }, 1000);
                }
            } else {
                // This is a single tap, wait to see if it becomes a double tap
                tapTimeout = setTimeout(() => {
                    // Single tap behavior can go here if needed
                }, 300);
            }
            
            lastTap = currentTime;
        });
    }

    // Add pinch-zoom support for the grid on mobile
    function initializePinchZoom() {
        if (!isMobileDevice) return;
        
        let initialDistance = 0;
        let initialScale = 1;
        let currentScale = 1;
        const MIN_SCALE = 0.8;
        const MAX_SCALE = 1.5;
        
        const gridContainer = document.querySelector('.grid-container');
        
        gridContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Two finger touch - potential pinch
                initialDistance = getDistance(
                    e.touches[0].clientX, e.touches[0].clientY,
                    e.touches[1].clientX, e.touches[1].clientY
                );
                initialScale = currentScale;
            }
        }, { passive: true });
        
        gridContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                // Calculate new distance between touch points
                const currentDistance = getDistance(
                    e.touches[0].clientX, e.touches[0].clientY,
                    e.touches[1].clientX, e.touches[1].clientY
                );
                
                // Calculate scale factor
                let newScale = initialScale * (currentDistance / initialDistance);
                
                // Limit scale to reasonable values
                newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
                
                // Apply scale transform to grid
                tileGrid.style.transform = `scale(${newScale})`;
                currentScale = newScale;
                
                // Prevent default to avoid page scaling
                e.preventDefault();
            }
        }, { passive: false });
        
        gridContainer.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                // End of pinch gesture
                // Optional: animate back to normal scale if needed
                if (currentScale < 0.9) {
                    tileGrid.style.transition = 'transform 0.3s ease-out';
                    tileGrid.style.transform = 'scale(1)';
                    currentScale = 1;
                    
                    setTimeout(() => {
                        tileGrid.style.transition = '';
                    }, 300);
                }
            }
        }, { passive: true });
        
        // Helper function to calculate distance between two points
        function getDistance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
    }

    // Initialize touch controls
    function initializeTouchControls() {
        // Add to existing handleResize function or call separately
        if (isMobileDevice) {
            document.body.classList.add('touch-device');
            initializeSwipeNavigation();
            initializeDoubleTapZoom();
            initializePinchZoom();
        } else {
            document.body.classList.remove('touch-device');
        }
    }
}); 
