import PlayArea from './component/PlayArea';

export function getPlayArea() {
    return PlayArea;
}

export function getConfiguration() {
    return {
        name: 'Nicknames',
        minPlayers: 4,
        maxPlayers: 10
    }
}