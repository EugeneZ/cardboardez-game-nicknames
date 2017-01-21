const _ = require('lodash');
const words = require('./words');

module.exports.setup = function (game) {
    game.redwordsleft = 8;
    game.bluewordsleft = 8;
    game.guesses = 0;
    game._hidden.words = {};
    game.revealed = {};
    game.board = [];
    while (game.board.length < 25) {
        const word = words[_.random(399)];
        if (!game.board.includes(word)) {
            game.board.push(word);
            game._hidden.words[word] = 'neutral';
        }
    }

    let used = [];
    const getUnusedWord = ()=> {
        let word;
        while (!word || used.includes(word)) {
            word = game.board[_.random(24)];
        }
        used.push(word);
        return word;
    };

    ['red', 'blue'].forEach(color =>
        _.times(8, () => game._hidden.words[getUnusedWord()] = color)
    );

    let lastword = getUnusedWord();
    if (_.random()) {
        game._hidden.words[lastword] = 'red';
        game.redturn = true;
        game.redwordsleft++;
    } else {
        game._hidden.words[lastword] = 'blue';
        game.blueturn = false;
        game.bluewordsleft++;
    }

    game._hidden.assassin = getUnusedWord();
    game._hidden.words[game._hidden.assassin] = 'assassin';

    game._players.forEach((player, i) => {
        if (i === 0) {
            player.redleader = true;
            player._private.words = game._hidden.words;
            game.redleader = player.id;
        } else if (i === 1) {
            player.blueleader = true;
            player._private.words = game._hidden.words;
            game.blueleader = player.id;
        } else if (i === game._players.length - 1 && game._players.length % 2 !== 0) {
            _.random() ? player.red = true : player.blue = true;
        } else {
            i % 2 ? player.blue = true : player.red = true;
        }
    });

    game.mode = 'clue';
};

module.exports.clue = function (clue, game) {
    if ((game.redturn && clue.user.id !== game.redleader) || (!game.redturn && clue.user.id !== game.blueleader)) {
        throw new Error('Cheating (or bug?) detected for ' + clue.user.id);
    }

    game.guesses = 0;
    game.maxguesses = 0;
    game.rejectedClue = false;
    game._hidden.clue = clue.clue;

    clue.clue.split(' ').forEach(piece => {
        let number = parseInt(piece, 10);
        if (number) {
            game.maxguesses = number;
        }
    });

    game._players
        .filter(player => player.redleader || player.blueleader)
        .forEach(player => player._private.clue = clue.clue);

    game.mode = 'verify'
};

module.exports.verify = function (verify, game) {
    if ((!game.redturn && verify.user.id !== game.redleader) || (game.redturn && verify.user.id !== game.blueleader)) {
        throw new Error('Cheating (or bug?) detected for ' + verify.user.id);
    }

    if (verify.verified) {
        game.clue = game._hidden.clue;
        game.mode = 'guess';
    } else {
        game.rejectedClue = true;
        game.mode = 'clue';
    }
};

module.exports.guess = function (guess, game) {
    if ((!guess.pass && (!game.board.includes(guess.word) || game.revealed[guess.word])) ||
        (game.redturn && !game._players.filter(p=>p.red && p.id===guess.user.id).length) ||
        (!game.redturn && !game._players.filter(p=>p.blue && p.id===guess.user.id).length)) {
        throw new Error('Cheating (or bug?) detected for ' + guess.user.id);
    }

    if (guess.pass && game.guesses > 0) {
        game.redturn = !game.redturn;
        game.mode = 'clue';
        return;
    }

    if (guess.word === game._hidden.assassin) {
        game.revealed = game._hidden.words;
        game.assassinated = true;
        game.mode = 'gameover';
        return;
    }

    let endturn = false;

    if (game._hidden.words[guess.word] === 'neutral') {
        endturn = true;
    } else if (game.redturn && game._hidden.words[guess.word] === 'red') { // correct!
        game.guesses++;
    } else if (!game.redturn && game._hidden.words[guess.word] === 'blue') { // correct!
        game.guesses++;
    } else { // incorrect :(
        endturn = true;
    }

    if (game.maxguesses && game.guesses > game.maxguesses) {
        endturn = true;
    }

    const team = game.revealed[guess.word] = game._hidden.words[guess.word];

    if (team === 'red') {
        game.redwordsleft--;
    } else if (team === 'blue') {
        game.bluewordsleft--;
    }

    // check for end game
    if (!game.redwordsleft || !game.bluewordsleft) {
        game.revealed = game._hidden.words;
        game.mode = 'gameover';
        return;
    }

    if (endturn) {
        game.redturn = !game.redturn;
        game.mode = 'clue';
    }
};