const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from the current directory
app.use(express.static('./'));

// Store connected players
let players = [];
// Track current player index
let currentPlayerIndex = 0;

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
            // Reset current player index to 0 when game starts
            currentPlayerIndex = 0;
            io.emit('gameStart', players);
        }
    });

    // Handle tile selection
    socket.on('tileSelect', (data) => {
        io.emit('tileUpdate', {
            row: data.row,
            col: data.col,
            playerId: socket.id,
            isPattern: data.isPattern
        });
    });

    // Handle turn updates
    socket.on('turnUsed', (turnsRemaining) => {
        // Advance to next player
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        // Broadcast both turns remaining and current player index
        io.emit('turnUpdate', {
            turnsRemaining: turnsRemaining,
            currentPlayerIndex: currentPlayerIndex
        });
    });

    // Handle hint usage
    socket.on('useHint', (data) => {
        io.emit('hintUpdate', {
            row: data.row,
            col: data.col,
            playerId: data.playerId
        });
    });
    
    // Handle level completion
    socket.on('levelComplete', (data) => {
        // Reset current player index for next level
        currentPlayerIndex = 0;
        io.emit('levelComplete', {
            level: data.level,
            nextLevelExists: data.nextLevelExists
        });
    });
    
    // Handle starting next level
    socket.on('startNextLevel', (data) => {
        io.emit('nextLevelStarted', {
            level: data.level
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
