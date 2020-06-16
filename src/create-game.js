const createGame = (res, players, games) => {
    const playerID = res.playerID;
    const gameDate = new Date();
    const gameID = `${gameDate.getTime()}-s${gameDate.getFullYear()}n${gameDate.getMonth()}-a${gameDate.getDate()}`;
    games[gameID] = {
        'id': gameID,
        'players': []
    }
    const con = players[playerID].connection;

    return { players, games, con }
}

module.exports = createGame;