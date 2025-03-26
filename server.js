const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from the current directory
app.use(express.static('./'));

// Store connected players
let players = [];

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

    // Handle hint usage
    socket.on('useHint', (data) => {
        io.emit('hintUpdate', {
            row: data.row,
            col: data.col,
            playerId: socket.id
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 