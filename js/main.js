// js/main.js - O Maestro da Aplicação
import { store } from './state.js';
import { GameTimer } from './timer.js';

let timer;
let currentPlayerForShot = null;

// Inicializar quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    // Configurar Cronómetro
    timer = new GameTimer((seconds) => {
        store.state.totalSeconds = seconds;
        updateDisplay();
    });

    // Verificar se há jogo guardado
    if (store.loadFromLocalStorage()) {
        initUI();
    } else {
        document.getElementById('welcomeModal').classList.remove('hidden');
    }

    setupEvents();
});

function setupEvents() {
    // Carregar Excel
    document.getElementById('welcome-file-input-A').addEventListener('change', handleFileSelect);
    document.getElementById('welcome-team-b-name').addEventListener('input', checkStart);
    
    // Botão Começar
    document.getElementById('startGameBtn').addEventListener('click', () => {
        store.update(s => {
            s.teamBName = document.getElementById('welcome-team-b-name').value;
        });
        initUI();
    });

    // Botões Cronómetro
    document.getElementById('startBtn').addEventListener('click', () => {
        timer.start();
        store.update(s => s.isRunning = true);
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        timer.pause(store.state.totalSeconds);
        store.update(s => s.isRunning = false);
    });

    // Botão Undo
    document.getElementById('undoBtn').addEventListener('click', () => {
        const oldState = store.undo();
        if (oldState) {
            timer.pause(oldState.totalSeconds);
            timer.elapsedPaused = oldState.totalSeconds; // Corrigir timer interno
            updateDisplay();
            renderPlayers();
            alert("Ação desfeita!");
        } else {
            alert("Nada para desfazer.");
        }
    });

    // Botões Adversário
    document.getElementById('goalOpponentBtn').addEventListener('click', () => {
        store.update(s => s.gameData.B.stats.goals++);
        updateDisplay();
    });

    // Modal de Remate
    document.querySelectorAll('.shot-outcome-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const outcome = e.target.dataset.outcome;
            store.update(s => {
                const p = s.gameData.A.players.find(pl => pl.Numero == currentPlayerForShot);
                if(p) {
                    if(outcome === 'goal') { p.goals++; s.gameData.A.stats.goals++; }
                    // Aqui podes adicionar mais lógica de estatística
                }
            });
            document.getElementById('shotModal').classList.add('hidden');
            updateDisplay();
            renderPlayers();
        });
    });
    
    document.getElementById('closeShotModal').addEventListener('click', () => {
        document.getElementById('shotModal').classList.add('hidden');
    });
}

// Funções de Lógica
function handleFileSelect(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        // Preparar jogadores
        const players = json.map(p => ({
            Numero: p.Numero,
            Nome: p.Nome,
            Posicao: p.Posicao,
            goals: 0,
            onCourt: false
        }));
        
        store.loadPlayers(players);
        document.getElementById('file-name-A').textContent = file.name;
        checkStart();
    };
    reader.readAsArrayBuffer(file);
}

function checkStart() {
    const ready = store.state.gameData.A.fileLoaded && document.getElementById('welcome-team-b-name').value !== "";
    document.getElementById('startGameBtn').disabled = !ready;
    if(ready) document.getElementById('startGameBtn').classList.remove('opacity-50');
}

function initUI() {
    document.getElementById('welcomeModal').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('teamAName').value = store.state.teamAName;
    document.getElementById('teamBName').value = store.state.teamBName;
    
    // Restaurar Timer
    timer.elapsedPaused = store.state.totalSeconds;
    if(store.state.isRunning) timer.start();
    
    updateDisplay();
    renderPlayers();
}

function updateDisplay() {
    // Placar
    document.getElementById('scoreA').textContent = store.state.gameData.A.stats.goals;
    document.getElementById('scoreB').textContent = store.state.gameData.B.stats.goals;
    
    // Timer
    const sec = store.state.totalSeconds;
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
}

function renderPlayers() {
    const list = document.getElementById('player-list-A');
    list.innerHTML = '';
    
    store.state.gameData.A.players.forEach(p => {
        if(p.Posicao === 'GR') return; // Ignorar GR na lista normal para simplificar
        
        const div = document.createElement('div');
        div.className = `flex justify-between items-center p-3 mb-2 rounded-lg ${p.onCourt ? 'bg-green-900 on-court' : 'bg-gray-700 on-bench'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-400 w-6">${p.Numero}</span>
                <span class="font-medium truncate w-32">${p.Nome}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-white mr-2">${p.goals} G</span>
                <button class="shot-btn bg-blue-600 px-3 py-1 rounded text-sm font-bold" onclick="window.openShot('${p.Numero}', '${p.Nome}')">Remate</button>
                <button class="toggle-btn ${p.onCourt ? 'bg-gray-500' : 'bg-green-600'} px-3 py-1 rounded text-sm" onclick="window.togglePlayer('${p.Numero}')">${p.onCourt ? 'Banco' : 'Campo'}</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Funções Globais (para os botões HTML funcionarem com módulos)
window.togglePlayer = (num) => {
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == num);
        if(p) p.onCourt = !p.onCourt;
    });
    renderPlayers();
};

window.openShot = (num, name) => {
    currentPlayerForShot = num;
    document.getElementById('shotPlayerName').textContent = name;
    document.getElementById('shotModal').classList.remove('hidden');
};
