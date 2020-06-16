const http = require('http');
const WebSocket = require('websocket').server;
const METHODS = require('./src/consts/game-consts');
const express = require("express");
const app = express();

app.use(express.static(__dirname + "/"))

let connection = null;
const players = {};
const games = {};
let food = {};

const httpServer = http.createServer((req, res) => {
    console.log('HTTP request');
})

httpServer.listen(8080, () => {
    console.log('listening on 8080')
})

const ws = new WebSocket({ "httpServer": httpServer });

const createGame = (res) => {
    const playerID = res.playerID;
    const gameDate = new Date();
    const gameID = `${gameDate.getTime()}-s${gameDate.getFullYear()}n${gameDate.getMonth()}-a${gameDate.getDate()}`;
    games[gameID] = {
        'id': gameID,
        'players': []
    }
    food = [3, 4];
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
    const game = games[gameID];
    if (game.players.length > 3) {
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
    game.players.push({
        'playerID': playerID,
        'color': color,
        'body': [[maxX + 10, maxY + 10], [maxX + 20, maxY + 20]]
    })

    const payLoad = {
        'method': METHODS.JOINED,
        'game': game,
        'food': food
    }

    for (let item of game.players) {
        players[item.playerID].connection.send(JSON.stringify(payLoad));
    }
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
            game.players[index].body.push([30, 40]);
        }
    }

    xPositions.push(food[0]);
    yPositions.push(food[1]);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);

    food = [maxX + 20, maxY + 20]

    const payLoad = {
        'method': METHODS.UPDATE,
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
    players[playerID] = {
        'connection': connection
    }

    const payLoad = {
        'method': METHODS.CONNECT,
        'playerID': playerID
    }

    connection.send(JSON.stringify(payLoad));
}

ws.on('request', (req) => {
    connection = req.accept(null, req.origin);
    connection.on('open', () => {
        console.log('Connection opened!')
    })
    connection.on('close', () => {
        console.log('Connection closed!')
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
        }
    })
    connect();
})