// js/state.js - Gestão de Dados e Undo
export class GameStore {
    constructor() {
        this.state = this.getInitialState();
        this.history = []; 
        this.maxHistory = 20; 
    }

    getInitialState() {
        return {
            gameData: {
                A: { 
                    stats: { goals: 0, misses: 0, savedShots: 0, turnovers: 0, gkSaves: 0, gkGoalsAgainst: 0, technical_faults: 0 }, 
                    players: [], 
                    officials: [], 
                    fileLoaded: false, 
                    teamYellowCards: 0, 
                    isTeamSuspended: false, 
                    teamSuspensionTimer: 0, 
                    timeouts: { total: 3, part1: 0, part2: 0, taken: [] }, 
                    officialsSanctions: { yellow: 0, twoMin: 0, red: 0 } 
                },
                B: { 
                    stats: { goals: 0, misses: 0, savedShots: 0, turnovers: 0, technical_faults: 0, transition_goals: 0, gkSaves: 0, gkGoalsAgainst: 0 }, 
                    isSuspended: false, 
                    suspensionTimer: 0, 
                    timeouts: { total: 3, part1: 0, part2: 0, taken: [] } 
                }
            },
            totalSeconds: 0,
            halfDuration: 30, // 30 ou 25 minutos (Configurável)
            currentGamePart: 1,
            isPassivePlay: false,
            isOpponent7v6: false,
            gameEvents: [],
            gameSituationLog: [{ startTime: 0, endTime: null, situationA: 'equality', situationB: 'equality' }],
            lastKnownSituations: { A: 'equality', B: 'equality' },
            teamAName: "Minha Equipa",
            teamBName: ""
        };
    }

    snapshot() {
        if (this.history.length >= this.maxHistory) {
            this.history.shift();
        }
        this.history.push(JSON.stringify(this.state));
    }

    undo() {
        if (this.history.length === 0) return null;
        const previousState = JSON.parse(this.history.pop());
        this.state = previousState;
        this.saveToSessionStorage();
        return this.state;
    }

    update(updaterFunction) {
        this.snapshot(); 
        updaterFunction(this.state); 
        this.saveToSessionStorage(); 
    }

    loadPlayers(players, officials = []) {
        this.state.gameData.A.players = players;
        this.state.gameData.A.officials = officials;
        this.state.gameData.A.fileLoaded = true;
        this.saveToSessionStorage();
    }

    saveToSessionStorage() {
        try {
            sessionStorage.setItem('handballGameSession', JSON.stringify(this.state));
        } catch (e) {
            console.error("Erro a guardar no SessionStorage", e);
        }
    }

    loadFromLocalStorage() {
        const saved = sessionStorage.getItem('handballGameSession');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                return true;
            } catch (e) {
                console.error("Erro ao ler dados guardados, a reiniciar...", e);
                return false;
            }
        }
        return false;
    }

    clearStorage() {
        sessionStorage.removeItem('handballGameSession');
    }
}

export const store = new GameStore();
