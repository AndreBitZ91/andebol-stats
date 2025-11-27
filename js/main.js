// js/main.js - Lógica Principal Atualizada
import { store } from './state.js';
import { GameTimer } from './timer.js';
import { POINT_SYSTEM } from './constants.js';
import { exportToExcel } from './export.js';

let timer;
let currentPersonForAction = null;
let currentShotType = null;
let els = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();

    timer = new GameTimer((seconds) => {
        store.state.totalSeconds = seconds;
        updateDisplay();
        checkTimeEvents(seconds);
    });

    const hasSavedGame = store.loadFromLocalStorage();
    
    if (hasSavedGame) {
        initUI();
    } else {
        showWelcomeScreen();
    }

    setupEventListeners();
});

function initDOMElements() {
    els = {
        welcomeModal: document.getElementById('welcomeModal'),
        mainApp: document.getElementById('main-app'),
        timerDisplay: document.getElementById('timer'),
        scoreA: document.getElementById('scoreA'),
        scoreB: document.getElementById('scoreB'),
        suspensionContainer: document.getElementById('suspension-container'),
        timelineList: document.getElementById('timeline-list'),
        shotModal: document.getElementById('shotModal'),
        sanctionsModal: document.getElementById('sanctionsModal'),
        positiveModal: document.getElementById('positiveActionModal'),
        negativeModal: document.getElementById('negativeActionModal'),
        effA: document.getElementById('effA'),
        shotsA: document.getElementById('shotsA'),
        savesA: document.getElementById('savesA'),
        techFaultsA: document.getElementById('techFaultsA'),
        welcomeFileInput: document.getElementById('welcome-file-input-A'),
        welcomeTeamBName: document.getElementById('welcome-team-b-name'),
        startGameBtn: document.getElementById('startGameBtn'),
        teamAName: document.getElementById('teamAName'),
        teamBName: document.getElementById('teamBName')
    };
}

function setupEventListeners() {
    if(els.welcomeFileInput) els.welcomeFileInput.addEventListener('change', handleFileSelect);
    if(els.welcomeTeamBName) els.welcomeTeamBName.addEventListener('input', checkStart);
    
    if(els.startGameBtn) {
        els.startGameBtn.addEventListener('click', () => {
            // Capturar a duração selecionada (NOVO)
            const selectedDuration = document.querySelector('input[name="gameDuration"]:checked').value;
            
            store.update(s => { 
                s.teamBName = els.welcomeTeamBName.value;
                s.halfDuration = parseInt(selectedDuration); // Guardar 30 ou 25
            });
            initUI();
        });
    }

    document.getElementById('startBtn')?.addEventListener('click', () => { timer.start(); store.update(s => s.isRunning = true); });
    document.getElementById('pauseBtn')?.addEventListener('click', () => { timer.pause(store.state.totalSeconds); store.update(s => s.isRunning = false); });

    document.getElementById('undoBtn')?.addEventListener('click', handleUndo);
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => exportToExcel(store.state.gameData, store.state.gameEvents));
    
    document.getElementById('resetGameBtn')?.addEventListener('click', handleReset);

    document.getElementById('goalOpponentBtn')?.addEventListener('click', () => registerOpponentAction('goal'));
    document.getElementById('saveOpponentBtn')?.addEventListener('click', () => registerOpponentAction('save'));
    document.getElementById('missOpponentBtn')?.addEventListener('click', () => registerOpponentAction('miss'));
    document.getElementById('twoMinOpponentBtn')?.addEventListener('click', () => registerOpponentAction('2min'));

    document.getElementById('passivePlayBtn')?.addEventListener('click', (e) => {
        store.update(s => s.isPassivePlay = !s.isPassivePlay);
        e.target.classList.toggle('bg-red-600');
        e.target.classList.toggle('bg-gray-700');
    });
    document.getElementById('opponent7v6Btn')?.addEventListener('click', (e) => {
        store.update(s => s.isOpponent7v6 = !s.isOpponent7v6);
        e.target.classList.toggle('bg-orange-600');
        e.target.classList.toggle('bg-gray-700');
    });

    setupModals();
}

function setupModals() {
    document.querySelectorAll('.shot-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shot-type-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
            e.target.classList.replace('bg-gray-700', 'bg-blue-600');
            currentShotType = e.target.innerText;
        });
    });
    document.querySelectorAll('.shot-outcome-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleShotOutcome(e.target.dataset.outcome));
    });
    document.querySelectorAll('.sanction-confirm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleSanctionOutcome(e.target.dataset.sanction));
    });
    document.querySelectorAll('.positive-confirm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleGenericAction(e.target.dataset.action, 'positive'));
    });
    document.querySelectorAll('.negative-confirm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleGenericAction(e.target.dataset.action, 'negative'));
    });

    const closeIds = ['closeShotModal', 'closeSanctionsModal', 'closePositiveModal', 'closeNegativeModal'];
    closeIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onclick = () => {
            els.shotModal.classList.add('hidden');
            els.sanctionsModal.classList.add('hidden');
            els.positiveModal.classList.add('hidden');
            els.negativeModal.classList.add('hidden');
        };
    });
}

function handleReset() {
    const confirmacao = confirm("Tem a certeza que quer iniciar um Novo Jogo?\n\nTodos os dados da sessão atual serão apagados e voltará ao menu inicial.");
    if (confirmacao) {
        sessionStorage.clear(); 
        window.location.reload();
    }
}

function showWelcomeScreen() {
    if(els.welcomeModal) els.welcomeModal.classList.remove('hidden');
    if(els.mainApp) els.mainApp.classList.add('hidden');
}

function handleShotOutcome(outcome) {
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
        if(!p) return;

        if(outcome === 'goal') { p.goals++; s.gameData.A.stats.goals++; }
        if(outcome === 'miss') s.gameData.A.stats.misses++;
        if(outcome === 'saved') s.gameData.A.stats.savedShots++;

        const typeKey = currentShotType || 'Default';
        const outcomeKey = outcome === 'goal' ? 'goal' : 'fail';
        const points = POINT_SYSTEM.field_player.shot[typeKey]?.[outcomeKey] || 0;
        p.performanceScore = (p.performanceScore || 0) + points;

        logGameEvent(s, 'A', 'shot', `${p.Nome}: ${outcome} (${typeKey})`);
    });
    els.shotModal.classList.add('hidden');
    refreshUI();
}

function handleSanctionOutcome(type) {
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
        if(!p) return;

        if (type === 'yellow') p.sanctions.yellow++;
        if (type === 'red') { p.sanctions.red++; p.onCourt = false; }
        if (type === '2min') {
            p.sanctions.twoMin++;
            p.isSuspended = true;
            p.suspensionTimer = 120;
            p.onCourt = false;
        }
        logGameEvent(s, 'A', 'sanction', `${p.Nome}: ${type}`);
    });
    els.sanctionsModal.classList.add('hidden');
    refreshUI();
}

function handleGenericAction(action, type) {
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
        if(!p) return;

        const points = POINT_SYSTEM.field_player[`${type}_actions`][action] || 0;
        p.performanceScore = (p.performanceScore || 0) + points;

        if(type === 'negative') {
            p.negativeActions.push({ action, time: s.totalSeconds });
            if(action === 'technical_fault') s.gameData.A.stats.technical_faults = (s.gameData.A.stats.technical_faults || 0) + 1;
        } else {
            p.positiveActions.push({ action, time: s.totalSeconds });
        }
        logGameEvent(s, 'A', action, `${p.Nome}: ${action}`);
    });
    els.positiveModal.classList.add('hidden');
    els.negativeModal.classList.add('hidden');
    refreshUI();
}

function registerOpponentAction(action) {
    store.update(s => {
        if (action === 'goal') { s.gameData.B.stats.goals++; s.gameData.A.stats.gkGoalsAgainst++; }
        if (action === 'save') { s.gameData.B.stats.gkSaves++; s.gameData.A.stats.savedShots++; }
        if (action === 'miss') { s.gameData.B.stats.misses++; }
        if (action === '2min') { s.gameData.B.isSuspended = true; s.gameData.B.suspensionTimer = 120; }
        logGameEvent(s, 'B', action, `Adversário: ${action}`);
    });
    refreshUI();
}

function checkTimeEvents(totalSeconds) {
    if (!store.state.isRunning) return;

    // --- Lógica de Fim de Parte / Jogo Baseada na Duração ---
    const halfDurationSeconds = store.state.halfDuration * 60; // 25 ou 30 minutos em segundos
    
    // Fim da 1ª Parte
    if (store.state.currentGamePart === 1 && totalSeconds >= halfDurationSeconds) {
        timer.pause(totalSeconds);
        store.update(s => {
            s.isRunning = false;
            s.currentGamePart = 2; // Prepara para a 2ª parte
        });
        alert("Fim da 1ª Parte!");
        return; // Pára aqui para não incrementar suspensões neste tick
    }

    // Fim do Jogo
    if (store.state.currentGamePart === 2 && totalSeconds >= halfDurationSeconds * 2) {
        timer.pause(totalSeconds);
        store.update(s => {
            s.isRunning = false;
        });
        alert("Fim do Jogo!");
        return;
    }

    // --- Gestão de Suspensões ---
    let needsUpdate = false;
    store.state.gameData.A.players.forEach(p => {
        if (p.isSuspended && p.suspensionTimer > 0) {
            p.suspensionTimer--;
            if (p.suspensionTimer <= 0) p.isSuspended = false;
            needsUpdate = true;
        }
        if (p.onCourt) p.timeOnCourt++;
    });
    if(needsUpdate) updateSuspensionsDisplay();
}

function updateSuspensionsDisplay() {
    els.suspensionContainer.innerHTML = '';
    store.state.gameData.A.players.forEach(p => {
        if (p.isSuspended && p.suspensionTimer > 0) {
            const div = document.createElement('div');
            div.className = 'bg-red-900 px-2 py-1 rounded text-white font-bold animate-pulse';
            div.textContent = `#${p.Numero} - ${formatTime(p.suspensionTimer)}`;
            els.suspensionContainer.appendChild(div);
        }
    });
}

function refreshUI() {
    updateDisplay();
    renderPlayers();
    updateTeamStats();
    renderTimeline();
    updateSuspensionsDisplay();
}

function updateDisplay() {
    if(els.scoreA) els.scoreA.textContent = store.state.gameData.A.stats.goals;
    if(els.scoreB) els.scoreB.textContent = store.state.gameData.B.stats.goals;
    if(els.timerDisplay) els.timerDisplay.textContent = formatTime(store.state.totalSeconds);
}

function updateTeamStats() {
    const statsA = store.state.gameData.A.stats;
    const totalShots = statsA.goals + statsA.misses + statsA.savedShots;
    const techFaults = store.state.gameData.A.players.reduce((acc, p) => 
        acc + (p.negativeActions ? p.negativeActions.filter(a => a.action === 'technical_fault').length : 0), 0);

    if(els.shotsA) els.shotsA.textContent = totalShots;
    if(els.savesA) els.savesA.textContent = statsA.gkSaves;
    if(els.techFaultsA) els.techFaultsA.textContent = techFaults;
    if(els.effA) els.effA.textContent = totalShots > 0 ? Math.round((statsA.goals / totalShots) * 100) + '%' : '0%';
}

function renderTimeline() {
    const list = els.timelineList;
    if(!list) return;
    list.innerHTML = '';
    store.state.gameEvents.slice().reverse().slice(0, 10).forEach(e => {
        const div = document.createElement('div');
        div.className = `border-l-2 pl-2 ${e.team === 'A' ? 'border-blue-500' : 'border-orange-500'}`;
        div.innerHTML = `<span class="font-mono text-gray-500">${formatTime(e.time)}</span> ${e.details}`;
        list.appendChild(div);
    });
}

function renderPlayers() {
    const list = document.getElementById('player-list-A');
    const gkList = document.getElementById('goalkeeper-list-A');
    if(!list || !gkList) return;
    
    list.innerHTML = '';
    gkList.innerHTML = '';
    
    store.state.gameData.A.players.forEach(p => {
        const div = document.createElement('div');
        const isSuspended = p.isSuspended;
        div.className = `flex justify-between items-center p-2 mb-1 rounded-lg text-sm 
            ${p.onCourt ? 'bg-green-900 border-l-4 border-green-500' : 'bg-gray-700'}
            ${isSuspended ? 'opacity-50' : ''}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-2 w-1/3">
                <span class="font-bold text-gray-400 w-6">${p.Numero}</span>
                <span class="truncate font-medium">${p.Nome}</span>
                ${p.sanctions.yellow > 0 ? '<span class="text-yellow-400">▮</span>' : ''}
                ${p.sanctions.twoMin > 0 ? '<span class="text-red-400">✌️</span>' : ''}
            </div>
            
            <div class="flex items-center justify-end gap-1 w-2/3">
                <span class="text-xs font-mono text-yellow-500 mr-2">PTS:${p.performanceScore || 0}</span>
                <button class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded" onclick="window.openModal('shot', '${p.Numero}')">🎯</button>
                <button class="bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded" onclick="window.openModal('positive', '${p.Numero}')">👍</button>
                <button class="bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded" onclick="window.openModal('negative', '${p.Numero}')">👎</button>
                <button class="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded" onclick="window.openModal('sanction', '${p.Numero}')">⚠️</button>
                <button class="text-xs px-2 py-1 rounded ${p.onCourt ? 'bg-gray-600' : 'bg-green-600'}" onclick="window.togglePlayer('${p.Numero}')">
                    ${p.onCourt ? 'Sai' : 'Entra'}
                </button>
            </div>
        `;
        if(p.Posicao === 'GR') gkList.appendChild(div);
        else list.appendChild(div);
    });
}

// --- Funções Globais (Bridge) ---
window.togglePlayer = (num) => {
    const player = store.state.gameData.A.players.find(pl => pl.Numero == num);
    
    if (player) {
        if (player.isSuspended) {
            alert("O jogador está suspenso e não pode entrar em campo agora.");
            return;
        }

        if (!player.onCourt) {
            const playersOnCourt = store.state.gameData.A.players.filter(p => p.onCourt).length;
            if (playersOnCourt >= 7) {
                alert("Já tem 7 jogadores em campo! Retire um jogador antes de adicionar outro.");
                return;
            }
        }
    }

    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == num);
        if(p && !p.isSuspended) p.onCourt = !p.onCourt;
    });
    refreshUI();
};

window.openModal = (type, num) => {
    currentPersonForAction = num;
    const p = store.state.gameData.A.players.find(pl => pl.Numero == num);
    const name = p ? p.Nome : '';

    if(type === 'shot') {
        document.getElementById('shotPlayerName').textContent = name;
        els.shotModal.classList.remove('hidden');
    } else if(type === 'sanction') {
        els.sanctionsModal.classList.remove('hidden');
    } else if(type === 'positive') {
        els.positiveModal.classList.remove('hidden');
    } else if(type === 'negative') {
        els.negativeModal.classList.remove('hidden');
    }
};

function handleUndo() {
    const oldState = store.undo();
    if (oldState) {
        timer.pause(oldState.totalSeconds);
        refreshUI();
    } else alert("Nada para desfazer.");
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function logGameEvent(state, team, type, details) {
    state.gameEvents.push({ time: state.totalSeconds, team, type, details });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const players = json.map(p => ({
            Numero: p.Numero, Nome: p.Nome, Posicao: p.Posicao,
            goals: 0, performanceScore: 0, onCourt: false, isSuspended: false, suspensionTimer: 0, timeOnCourt: 0,
            sanctions: { yellow: 0, twoMin: 0, red: 0 },
            positiveActions: [], negativeActions: []
        }));
        
        store.loadPlayers(players);
        document.getElementById('file-name-A').textContent = file.name;
        checkStart();
    };
    reader.readAsArrayBuffer(file);
}

function checkStart() {
    const ready = store.state.gameData.A.fileLoaded && els.welcomeTeamBName.value !== "";
    els.startGameBtn.disabled = !ready;
    if(ready) els.startGameBtn.classList.remove('opacity-50');
}

function initUI() {
    els.welcomeModal.classList.add('hidden');
    els.mainApp.classList.remove('hidden');
    els.teamAName.value = store.state.teamAName;
    els.teamBName.value = store.state.teamBName;
    timer.elapsedPaused = store.state.totalSeconds;
    refreshUI();
}
