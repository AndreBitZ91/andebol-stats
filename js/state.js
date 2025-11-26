// js/state.js - Gestão de Dados e Undo
export class GameStore {
    constructor() {
        // Estado Inicial Vazio
        this.state = this.getInitialState();
        this.history = []; // Histórico para o Undo
    }

    getInitialState() {
        return {
            gameData: {
                A: { stats: { goals: 0 }, players: [], fileLoaded: false },
                B: { stats: { goals: 0 } }
            },
            totalSeconds: 0,
            isRunning: false,
            teamAName: "Minha Equipa",
            teamBName: "Adversário"
        };
    }

    // Tira uma "fotografia" dos dados antes de mudar (Snapshot)
    snapshot() {
        if (this.history.length > 20) this.history.shift(); // Limite de 20 ações
        this.history.push(JSON.stringify(this.state));
    }

    // Recupera a última fotografia
    undo() {
        if (this.history.length === 0) return null;
        const previousState = JSON.parse(this.history.pop());
        this.state = previousState;
        this.saveToLocalStorage();
        return this.state;
    }

    // Atualiza dados e guarda automaticamente
    update(updaterFunction) {
        this.snapshot(); // 1. Guarda histórico
        updaterFunction(this.state); // 2. Aplica mudança
        this.saveToLocalStorage(); // 3. Guarda no telemóvel
    }

    // Carregar jogadores do Excel
    loadPlayers(players) {
        this.state.gameData.A.players = players;
        this.state.gameData.A.fileLoaded = true;
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        localStorage.setItem('handballGameState_v2', JSON.stringify(this.state));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('handballGameState_v2');
        if (saved) {
            this.state = JSON.parse(saved);
            return true;
        }
        return false;
    }
}

export const store = new GameStore();
