const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from the current directory
app.use(express.static('./'));

// Game state
let players = [];
let currentPlayerIndex = 0;
let currentLevel = 1;
let turnsRemaining = 0;

// Level configurations (consistent with client)
const levelConfigs = {
    1: { turns: 100 },
    2: { turns: 90 },
    3: { turns: 80 },
    4: { turns: 70 },
    5: { turns: 60 },
    6: { turns: 50 },
    7: { turns: 40 },
    8: { turns: 30 },
    9: { turns: 20 },
    10: { turns: 10 }
};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle player joining
    socket.on('playerJoin', (playerName) => {
        const player = {
            id: socket.id,
            name: playerName,
            score: 0
        };
        players.push(player);
        
        // Emit updated player list to all clients
        io.emit('playerListUpdate', players);
        
        // If we have 2-4 players, enable the start button
        if (players.length >= 2 && players.length <= 4) {
            io.emit('enableStartButton');
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        players = players.filter(player => player.id !== socket.id);
        io.emit('playerListUpdate', players);
        
        // If we have less than 2 players, disable the start button
        if (players.length < 2) {
            io.emit('disableStartButton');
        }
    });

    // Handle game start
    socket.on('startGame', () => {
        if (players.length >= 2 && players.length <= 4) {
            currentLevel = 1;
            turnsRemaining = levelConfigs[currentLevel].turns;
            currentPlayerIndex = 0;
            io.emit('gameStart', { players, currentLevel, turnsRemaining });
        }
    });

    // Handle tile selection
    socket.on('tileSelect', (data) => {
        if (socket.id === players[currentPlayerIndex].id) {
            // Valid turn
            io.emit('tileUpdate', {
                row: data.row,
                col: data.col,
                isPattern: data.isPattern,
                playerId: socket.id
            });
            turnsRemaining--;
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            io.emit('turnUpdate', { turnsRemaining, currentPlayerIndex });
            if (turnsRemaining <= 0) {
                io.emit('gameOver');
            }
        } else {
            socket.emit('notYourTurn');
        }
    });

    // Handle hint usage
    socket.on('useHint', (data) => {
        io.emit('hintUpdate', {
            row: data.row,
            col: data.col,
            playerId: socket.id
        });
    });
    
    // Handle level completion
    socket.on('levelComplete', (data) => {
        if (data.nextLevelExists) {
            currentLevel++;
            turnsRemaining = levelConfigs[currentLevel].turns;
            currentPlayerIndex = 0;
            io.emit('nextLevelStarted', { level: currentLevel, turnsRemaining });
        } else {
            io.emit('gameComplete');
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
