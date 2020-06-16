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

const ws = new WebSocket({ "httpServer": httpServer });

const createGame = (res) => {
    const playerID = res.playerID;
    const gameDate = new Date();
    const gameID = `${gameDate.getTime()}-s${gameDate.getFullYear()}n${gameDate.getMonth()}-a${gameDate.getDate()}`;
    games[gameID] = {
        'id': gameID,
        'players': []
    }
    food = { x: 3, y: 4 };
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
        xPositions.push(body[body.length - 1].x);
        yPositions.push(body[body.length - 1].y);
    }
    xPositions.push(food.x);
    yPositions.push(body.y);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);
    game.players.push({
        'playerID': playerID,
        'color': color,
        'body': [{ x: maxX + 10, y: maxY + 10 }, { x: maxX + 20, y: maxY + 20 }]
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
        xPositions.push(body[body.length - 1].x);
        yPositions.push(body[body.length - 1].y);
        if (item.playerID === playerID) {
            game.players[index].body.push({ x: 30, y: 40 });
        }
    }

    xPositions.push(food.x);
    yPositions.push(body.y);
    const maxX = Math.max(...xPositions);
    const maxY = Math.max(...yPositions);

    food = { x: maxX + 20, y: maxY + 20 }

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
            head = { x: head.x + 2, y: head.y };
            break;
        case 'LEFT':
            head = { x: head.x - 2, y: head.y };
            break;
        case 'DOWN':
            head = { x: head.x, y: head.y + 2 };
            break;
        case 'UP':
            head = { x: head.x, y: head.y - 2 };
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

httpServer.listen(8080, () => {
    console.log('listening on 8080')
})