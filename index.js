const http = require('http');
const WebSocket = require('websocket').server;
const METHODS = require('./src/consts/game-consts');
const express = require("express");
const app = express();

app.use(express.static(__dirname + "/"));

let connection = null;
const players = {};
const games = {};
let food = {};
let timeOut = '';
let gameIDForSnakeMove = '';
const directions = ['RIGHT', 'LEFT', 'UP', 'DOWN'];
const body = [50, 30];
const isGameStarted = false;

const httpServer = http.createServer(app);

httpServer.listen(process.env.PORT || 8080, () => {
    console.log('listening on 8080')
})

const ws = new WebSocket({ "httpServer": httpServer });

const createGame = (res) => {
    const playerID = res.playerID;
    const gameDate = new Date();
    const gameID = `${gameDate.getTime()}-s${gameDate.getFullYear()}n${gameDate.getMonth()}-a${gameDate.getDate()}`;
    games[gameID] = {
        'id': gameID,
        'players': [],
        'isGameStarted': false
    }
    food = [25, 15];
    players[playerID].playerName = res.playerName
    const payLoad = {
        'method': METHODS.CREATED,
        'game': games[gameID]
    }

    const con = players[playerID].connection;

    con.send(JSON.stringify(payLoad));
}

const joinGame = (res) => {
    const playerID = res.playerID;
    const gameID = res.gameID;
    gameIDForSnakeMove = res.gameID;
    players[playerID].playerName = res.playerName;
    const game = games[gameID];
    if (game.players.length > 4) {
        return;
    }
    const color = `hsla(${Math.random() * 360}, 100%, 70%, 1)`;
    const xPositions = [];
    const yPositions = []
    for (let item of game.players) {
        const body = item.body;
        xPositions.push(body[body.length - 1][0]);
        yPositions.push(body[body.length - 1][1]);
    }
    xPositions.push(food[0]);
    yPositions.push(food[1]);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);
    const direction = directions[parseInt(Math.random() * 4)];
    let body = [];
    if (direction === 'RIGHT') {
        body = [[maxX + 4, maxY + 2], [maxX + 3, maxY + 2], [maxX + 2, maxY + 2]];
    } else if (direction === 'LEFT') {
        body = [[maxX + 4, maxY + 2], [maxX + 3, maxY + 2], [maxX + 2, maxY + 2]];
    } else if (direction === 'DOWN') {
        body = [[maxX + 2, maxY + 4], [maxX + 2, maxY + 3], [maxX + 2, maxY + 2]];
    } else if (direction === 'UP') {
        body = [[maxX + 2, maxY + 4], [maxX + 2, maxY + 3], [maxX + 2, maxY + 2]];
    }
    game.players.push({
        'playerID': playerID,
        'color': color,
        'body': body,
        'direction': direction,
        'playerName': players[playerID].playerName
    })

    const payLoad = {
        'method': METHODS.JOINED,
        'game': game,
        'food': food
    }

    for (let item of game.players) {
        players[item.playerID].connection.send(JSON.stringify(payLoad));
    }

    timeOut = setInterval(() => {
        moveSnake();
    }, 500);
}

const foodAte = (res) => {
    const playerID = res.playerID;
    const gameID = res.gameID;
    const game = games[gameID];

    const xPositions = [];
    const yPositions = []

    for (let [index, item] of game.players.entries()) {
        const body = item.body;
        xPositions.push(body[body.length - 1][0]);
        yPositions.push(body[body.length - 1][1]);
        if (item.playerID === playerID) {
            const body = game.players[index].body;
            game.players[index].body.push([30, 40]);
        }
    }

    xPositions.push(food[0]);
    yPositions.push(food[1]);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);

    food = [maxX + 20, maxY + 20]

    const payLoad = {
        'method': METHODS.FOODCOLLISION,
        'game': game,
        'food': food
    }

    for (let item of game.players) {
        players[item.playerID].connection.send(JSON.stringify(payLoad));
    }
}

const directionChange = (res) => {
    const playerID = res.playerID;
    const gameID = res.gameID;
    const game = games[gameID];
    const direction = res.direction;
    const index = game.players.findIndex((item) => item.playerID === playerID);
    let head = game.players[index].body[game.players[index].body.length - 1];
    switch (direction) {
        case 'RIGHT':
            head = [head[0] + 2, head[1]];
            break;
        case 'LEFT':
            head = [head[0] - 2, head[1]];
            break;
        case 'DOWN':
            head = [head[0], head[1] + 2];
            break;
        case 'UP':
            head = [head[0], head[1] - 2];
            break;
    }

    game.players[index].body.push(head);
    game.players[index].body.shift();
    game.players[index].direction = res.direction;

    const payLoad = {
        'method': METHODS.DIRECTIONCHANGED,
        'game': game
    }

    for (let item of game.players) {
        players[item.playerID].connection.send(JSON.stringify(payLoad));
    }

}

const connect = () => {
    const date = new Date();
    const playerID = `${date.getTime()}-s${date.getFullYear()}n${date.getMonth()}-a${date.getDate()}`;
    connection.playerID = playerID;
    players[playerID] = {
        'connection': connection
    }

    const payLoad = {
        'method': METHODS.CONNECT,
        'playerID': playerID
    }

    connection.send(JSON.stringify(payLoad));
}

const moveSnake = () => {
    const game = games[gameIDForSnakeMove];

    if (game.isGameStarted) {
        for (let [index, player] of game.players.entries()) {
            const direction = player.direction;
            switch (direction) {
                case 'RIGHT':
                    const righthead = player.body[0];
                    if (righthead[0] === body[0] || righthead[1] === body[1] || player.body.length === 0) {
                        //removePlayer(connection.playerID);
                        //return;
                        game.players[index].body = [];
                    } else {
                        for (let [id, _] of game.players[index].body.entries()) {
                            game.players[index].body[id][0]++;
                        }
                    }
                    break;
                case 'LEFT':
                    const lefthead = player.body[player.body.length - 1];
                    if (lefthead[0] === 1 || lefthead[1] === 1 || player.body.length === 0) {
                        //removePlayer(connection.playerID);
                        //return;
                        game.players[index].body = [];
                    } else {
                        for (let [id, _] of game.players[index].body.entries()) {
                            game.players[index].body[id][0]--;
                        }
                    }
                    break;
                case 'DOWN':
                    const downhead = player.body[0];
                    if (downhead[0] === body[0] || downhead[1] === body[1] || player.body.length === 0) {
                        //removePlayer(connection.playerID);
                        //return;
                        game.players[index].body = [];
                    } else {
                        for (let [id, _] of game.players[index].body.entries()) {
                            game.players[index].body[id][1]++;
                        }
                    }
                    break;
                case 'UP':
                    const uphead = player.body[player.body.length - 1];
                    if (uphead[0] === 1 || uphead[1] === 1 || player.body.length === 0) {
                        //removePlayer(connection.playerID);
                        //return;
                        game.players[index].body = [];
                    } else {
                        for (let [id, _] of game.players[index].body.entries()) {
                            game.players[index].body[id][1]--;
                        }
                    }
                    break;
            }
        }
    }

    const payLoad = {
        'method': METHODS.UPDATE,
        'game': game,
        'food': food
    }

    for (let item of game.players) {
        players[item.playerID].connection.send(JSON.stringify(payLoad));
    }
}

const removePlayer = (playerID) => {
    for (let item of Object.keys(games)) {
        const game = games[item];
        const index = game.players.findIndex((item) => item.playerID === playerID);
        if (index >= 0) {
            games[item].players.splice(index, 1);
            break;
        }
    }

    delete players[playerID];
}

ws.on('request', (req) => {
    connection = req.accept(null, req.origin);
    connection.on('open', () => {
        console.log('Connection opened!')
    })
    connection.on('close', (res) => {
        console.log(res, 'Connection closed!');
        const playerID = connection.playerID;
        removePlayer(playerID);
    })
    connection.on("message", (message) => {
        const res = JSON.parse(message.utf8Data);
        if (res.method === METHODS.CREATE) {
            createGame(res);
        } else if (res.method === METHODS.JOIN) {
            joinGame(res);
        } else if (res.method === METHODS.FOODATE) {
            foodAte(res);
        } else if (res.method === METHODS.DIRECTIONCHANGE) {
            directionChange(res);
        } else if (res.method === METHODS.STARTGAME) {
            games[res.gameID].isGameStarted = true;
        }
    })
    connect();
})