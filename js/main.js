import { store } from './state.js';
import { GameTimer } from './timer.js';
import { POINT_SYSTEM } from './constants.js';
import { exportToExcel } from './export.js';

let timer;
let currentPersonForAction = null;
let currentShotType = null;
let currentShotZone = null;
let currentShotCoords = null; 
let els = {}; 
let tempRoster = { players: [], officials: [] };

// Função de Arranque
function startApp() {
    console.log("Aplicação a iniciar...");
    initDOMElements();
    
    // Configurar Timer
    timer = new GameTimer((seconds) => {
        store.state.totalSeconds = seconds;
        updateDisplay();
        checkTimeEvents(seconds);
    });

    // Carregar Estado
    try {
        if (store.loadFromLocalStorage()) {
            initUI();
            // Restaurar estado do timer visual
            if (!store.state.isRunning && store.state.totalSeconds > 0) {
                if(els.editTimerBtn) els.editTimerBtn.disabled = false;
            }
            if (timer && !store.state.isRunning) {
                timer.elapsedPaused = store.state.totalSeconds;
            }
            if (!store.state.gameData.B.history) store.state.gameData.B.history = [];
        } else {
            showWelcomeScreen();
        }
    } catch (e) {
        console.error("Erro ao carregar estado:", e);
        showWelcomeScreen();
    }

    setupEventListeners();
}

// Garantir carregamento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

function initDOMElements() {
    const getEl = (id) => document.getElementById(id);
    els = {
        // Ecrãs
        welcomeModal: getEl('welcomeModal'),
        mainApp: getEl('main-app'),
        
        // Inputs Ficheiro
        welcomeFileInput: getEl('welcome-file-input-A'),
        fileNameDisplay: getEl('file-name-A'),
        welcomeTeamBName: getEl('welcome-team-b-name'),
        startGameBtn: getEl('startGameBtn'),

        // Jogo
        timerDisplay: getEl('timer'),
        scoreA: getEl('scoreA'),
        scoreB: getEl('scoreB'),
        teamAName: getEl('teamAName'),
        teamBName: getEl('teamBName'),
        
        // Botões Controlo
        startBtn: getEl('startBtn'),
        pauseBtn: getEl('pauseBtn'),
        editTimerBtn: getEl('editTimerBtn'),
        undoBtn: getEl('undoBtn'),
        exportExcelBtn: getEl('exportExcelBtn'),
        resetGameBtn: getEl('resetGameBtn'),
        
        // Modais
        shotModal: getEl('shotModal'),
        rosterModal: getEl('rosterModal'),
        sanctionsModal: getEl('sanctionsModal'),
        positiveModal: getEl('positiveActionModal'),
        negativeModal: getEl('negativeActionModal'),
        correctionModal: getEl('correctionModal'),
        
        // Elementos Específicos
        rosterPlayersBody: getEl('roster-players-body'),
        rosterOfficialsBody: getEl('roster-officials-body'),
        shotZoneContainer: getEl('shotZoneContainer'),
        shotGoalContainer: getEl('shotGoalContainer'),
        shotOutcomeContainer: getEl('shotOutcomeContainer'),
        goalSvg: getEl('goalSvg'),
        shotMarker: getEl('shotMarker'),
        
        // Inputs Correção Tempo
        correctMin: getEl('correctMin'),
        correctSec: getEl('correctSec'),
        saveCorrectionBtn: getEl('saveCorrectionBtn'),
        closeCorrectionBtn: getEl('closeCorrectionBtn'),

        // Abas
        tabData: getEl('tab-data'),
        tabStats: getEl('tab-stats'),
        tabHeatmap: getEl('tab-heatmap'),
        statsComparisonContainer: getEl('stats-comparison-container'),
        heatmapPointsAttack: getEl('heatmap-points-attack'),
        heatmapPointsDefense: getEl('heatmap-points-defense'),
        
        // Botões Roster
        addPlayerBtn: getEl('addPlayerBtn'),
        addOfficialBtn: getEl('addOfficialBtn'),
        cancelRosterBtn: getEl('cancelRosterBtn'),
        confirmRosterBtn: getEl('confirmRosterBtn'),
        closeRosterBtn: getEl('closeRosterBtn'),
        officialsListA: getEl('officials-list-A'),
        
        // Outros Botões
        passivePlayBtn: getEl('passivePlayBtn'),
        opponent7v6Btn: getEl('opponent7v6Btn'),
        goalOpponentBtn: getEl('goalOpponentBtn'),
        saveOpponentBtn: getEl('saveOpponentBtn'),
        missOpponentBtn: getEl('missOpponentBtn'),
        twoMinOpponentBtn: getEl('twoMinOpponentBtn')
    };
}

function setupEventListeners() {
    // --- Ficheiro ---
    if(els.welcomeFileInput) {
        els.welcomeFileInput.addEventListener('change', handleFileSelect);
    } else {
        console.error("Input de ficheiro não encontrado!");
    }

    if(els.welcomeTeamBName) els.welcomeTeamBName.addEventListener('input', checkStart);

    // --- Roster ---
    if(els.addPlayerBtn) els.addPlayerBtn.addEventListener('click', () => addRosterRow('player'));
    if(els.addOfficialBtn) els.addOfficialBtn.addEventListener('click', () => addRosterRow('official'));
    if(els.cancelRosterBtn) els.cancelRosterBtn.addEventListener('click', () => els.rosterModal.classList.add('hidden'));
    if(els.closeRosterBtn) els.closeRosterBtn.addEventListener('click', () => els.rosterModal.classList.add('hidden'));
    if(els.confirmRosterBtn) {
        els.confirmRosterBtn.addEventListener('click', () => {
            saveRosterFromModal();
            els.rosterModal.classList.add('hidden');
            checkStart();
        });
    }

    // --- Start Game ---
    if(els.startGameBtn) {
        els.startGameBtn.addEventListener('click', () => {
            const durationEl = document.querySelector('input[name="gameDuration"]:checked');
            const duration = durationEl ? durationEl.value : 30;
            store.update(s => { 
                s.teamBName = els.welcomeTeamBName.value;
                s.halfDuration = parseInt(duration);
                s.gameData.B.history = [];
            });
            initUI();
        });
    }

    // --- Abas ---
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-link').forEach(b => {
                b.classList.remove('bg-gray-700', 'border-b-4', 'border-blue-500', 'text-white');
                b.classList.add('bg-gray-800', 'text-gray-400');
            });
            const clicked = e.target.closest('button');
            clicked.classList.remove('bg-gray-800', 'text-gray-400');
            clicked.classList.add('bg-gray-700', 'border-b-4', 'border-blue-500', 'text-white');

            const tabName = clicked.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const target = document.getElementById(`tab-${tabName}`);
            if(target) target.classList.remove('hidden');

            if (tabName === 'stats') updateStatsTab();
            if (tabName === 'heatmap') updateHeatmapTab();
        });
    });

    // --- Timer Controls ---
    if(els.startBtn) els.startBtn.addEventListener('click', () => { 
        const playersOnCourt = store.state.gameData.A.players.filter(p => p.onCourt).length;
        const duration = store.state.halfDuration || 30; 
        const baseRequired = (duration === 25) ? 6 : 7;
        const suspendedCount = store.state.gameData.A.players.filter(p => p.isSuspended).length;
        const requiredPlayers = baseRequired - suspendedCount;

        if (playersOnCourt !== requiredPlayers) {
            alert(`⚠️ Atenção: ${requiredPlayers} jogadores necessários em campo (tem ${playersOnCourt}).`);
            return; 
        }
        timer.start(); 
        store.update(s => s.isRunning = true); 
        if(els.editTimerBtn) els.editTimerBtn.disabled = true;
    });

    if(els.pauseBtn) els.pauseBtn.addEventListener('click', () => { 
        timer.pause(store.state.totalSeconds); 
        store.update(s => s.isRunning = false); 
        if(els.editTimerBtn) els.editTimerBtn.disabled = false;
    });

    if(els.editTimerBtn) {
        els.editTimerBtn.addEventListener('click', () => {
            if (store.state.isRunning) return;
            const total = store.state.totalSeconds;
            if(els.correctMin) els.correctMin.value = Math.floor(total / 60);
            if(els.correctSec) els.correctSec.value = total % 60;
            if(els.correctionModal) els.correctionModal.classList.remove('hidden');
        });
    }

    if(els.saveCorrectionBtn) {
        els.saveCorrectionBtn.addEventListener('click', () => {
            const min = parseInt(els.correctMin.value) || 0;
            const sec = parseInt(els.correctSec.value) || 0;
            const newTotalSeconds = (min * 60) + sec;
            const oldTotalSeconds = store.state.totalSeconds;
            const diff = newTotalSeconds - oldTotalSeconds;

            if (diff !== 0) {
                store.update(s => {
                    s.totalSeconds = newTotalSeconds;
                    // Ajustar Jogadores
                    s.gameData.A.players.forEach(p => {
                        if (p.onCourt) p.timeOnCourt = Math.max(0, p.timeOnCourt + diff);
                        if (p.isSuspended && p.suspensionTimer > 0) {
                            p.suspensionTimer = Math.max(0, p.suspensionTimer - diff);
                            if (p.suspensionTimer === 0) p.isSuspended = false;
                        }
                    });
                    // Ajustar Adversário
                    if (s.gameData.B.isSuspended && s.gameData.B.suspensionTimer > 0) {
                        s.gameData.B.suspensionTimer = Math.max(0, s.gameData.B.suspensionTimer - diff);
                        if (s.gameData.B.suspensionTimer === 0) s.gameData.B.isSuspended = false;
                    }
                });
                if (timer) {
                    timer.elapsedPaused = newTotalSeconds;
                    timer.startTime = 0;
                }
            }
            updateDisplay();
            updateSuspensionsDisplay();
            renderPlayers();
            els.correctionModal.classList.add('hidden');
        });
    }

    if(els.closeCorrectionBtn) {
        els.closeCorrectionBtn.addEventListener('click', () => els.correctionModal.classList.add('hidden'));
    }

    // --- Botões Gerais ---
    if(els.undoBtn) els.undoBtn.addEventListener('click', handleUndo);
    if(els.exportExcelBtn) els.exportExcelBtn.addEventListener('click', () => exportToExcel(store.state.gameData, store.state.gameEvents));
    if(els.resetGameBtn) els.resetGameBtn.addEventListener('click', handleReset);

    if(els.passivePlayBtn) els.passivePlayBtn.addEventListener('click', (e) => {
        store.update(s => s.isPassivePlay = !s.isPassivePlay);
        e.target.classList.toggle('bg-red-600');
        e.target.classList.toggle('bg-gray-700');
    });
    if(els.opponent7v6Btn) els.opponent7v6Btn.addEventListener('click', (e) => {
        store.update(s => s.isOpponent7v6 = !s.isOpponent7v6);
        e.target.classList.toggle('bg-orange-600');
        e.target.classList.toggle('bg-gray-700');
    });

    // Botões Adversário
    if(els.goalOpponentBtn) els.goalOpponentBtn.addEventListener('click', () => registerOpponentAction('goal'));
    if(els.saveOpponentBtn) els.saveOpponentBtn.addEventListener('click', () => registerOpponentAction('save'));
    if(els.missOpponentBtn) els.missOpponentBtn.addEventListener('click', () => registerOpponentAction('miss'));
    if(els.twoMinOpponentBtn) els.twoMinOpponentBtn.addEventListener('click', () => registerOpponentAction('2min'));

    setupModals();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    // Feedback visual imediato
    if(els.fileNameDisplay) {
        els.fileNameDisplay.textContent = "A carregar: " + file.name;
        els.fileNameDisplay.classList.add("text-yellow-400");
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            // Verificar se XLSX existe
            if (typeof XLSX === 'undefined') {
                alert("Erro Crítico: A biblioteca XLSX não carregou.");
                return;
            }
            processWorkbook(data, file.name);
            
            // Sucesso visual
            if(els.fileNameDisplay) {
                els.fileNameDisplay.textContent = file.name;
                els.fileNameDisplay.classList.remove("text-yellow-400");
                els.fileNameDisplay.classList.add("text-green-400");
            }

        } catch (err) {
            console.error(err);
            alert("Erro ao processar ficheiro: " + err.message);
        }
    };
    reader.onerror = () => alert("Erro ao ler o ficheiro.");
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
}

function processWorkbook(data, fileName) {
    const workbook = XLSX.read(data, {type: 'array'});
    const sheetNames = workbook.SheetNames;
    tempRoster = { players: [], officials: [] };
    
    const oficiaisSheetName = sheetNames.find(name => name.toLowerCase().includes('oficiais') || name.toLowerCase().includes('officials'));
    let jogadoresSheetName = sheetNames[0];
    if (oficiaisSheetName && jogadoresSheetName === oficiaisSheetName && sheetNames.length > 1) {
        jogadoresSheetName = sheetNames[1];
    }

    // Ler Jogadores
    if (jogadoresSheetName) {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[jogadoresSheetName]);
        json.forEach(row => {
            const num = row.Numero ? String(row.Numero).trim() : '';
            const nome = row.Nome || '';
            const pos = row.Posicao || '';
            
            if (!oficiaisSheetName) {
                const isOfficial = num.match(/^[A-Z]$/i) || (pos && pos.toLowerCase().includes('oficial'));
                if (isOfficial) {
                    tempRoster.officials.push({ Numero: num, Nome: nome, Posicao: pos });
                } else {
                    tempRoster.players.push({ Numero: num, Nome: nome, Posicao: pos });
                }
            } else {
                tempRoster.players.push({ Numero: num, Nome: nome, Posicao: pos });
            }
        });
    }

    // Ler Oficiais
    if (oficiaisSheetName) {
        const jsonOff = XLSX.utils.sheet_to_json(workbook.Sheets[oficiaisSheetName]);
        jsonOff.forEach(row => {
            let id = '';
            if (row.Posicao && String(row.Posicao).trim().length <= 2) id = String(row.Posicao).trim(); 
            else if (row.Numero) id = String(row.Numero).trim();
            const nome = row.Nome || '';
            tempRoster.officials.push({ Numero: id, Nome: nome, Posicao: 'Oficial' });
        });
    }

    renderRosterEdit();
    if(els.rosterModal) els.rosterModal.classList.remove('hidden');
}

// --- FUNÇÕES GLOBAIS E AUXILIARES ---

// Funções para os botões HTML do Modal (window scope)
window.addRosterRow = (type) => {
    if (type === 'player') tempRoster.players.push({ Numero: '', Nome: '', Posicao: '' });
    else tempRoster.officials.push({ Numero: '', Nome: '', Posicao: '' });
    renderRosterEdit();
};
window.removeRosterRow = (type, index) => {
    if (type === 'player') tempRoster.players.splice(index, 1);
    else tempRoster.officials.splice(index, 1);
    renderRosterEdit();
};
window.updateTempRoster = (type, index, field, value) => {
    if (type === 'player') tempRoster.players[index][field] = value;
    else tempRoster.officials[index][field] = value;
};
// Funções para os botões HTML do Jogo
window.togglePlayer = (num) => togglePlayer(num);
window.openModal = (type, num) => openModal(type, num);


function renderRosterEdit() {
    if(!els.rosterPlayersBody) return;
    els.rosterPlayersBody.innerHTML = '';
    tempRoster.players.forEach((p, index) => {
        els.rosterPlayersBody.innerHTML += `
            <tr>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded text-center" value="${p.Numero}" onchange="updateTempRoster('player', ${index}, 'Numero', this.value)"></td>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded" value="${p.Nome}" onchange="updateTempRoster('player', ${index}, 'Nome', this.value)"></td>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded text-center" value="${p.Posicao}" onchange="updateTempRoster('player', ${index}, 'Posicao', this.value)"></td>
                <td class="p-1 text-center"><button class="text-red-500 font-bold" onclick="removeRosterRow('player', ${index})">&times;</button></td>
            </tr>`;
    });
    els.rosterOfficialsBody.innerHTML = '';
    tempRoster.officials.forEach((o, index) => {
        els.rosterOfficialsBody.innerHTML += `
            <tr>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded text-center" value="${o.Numero}" onchange="updateTempRoster('official', ${index}, 'Numero', this.value)"></td>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded" value="${o.Nome}" onchange="updateTempRoster('official', ${index}, 'Nome', this.value)"></td>
                <td class="p-1"><input type="text" class="w-full bg-gray-700 p-1 rounded text-center" value="${o.Posicao}" onchange="updateTempRoster('official', ${index}, 'Posicao', this.value)"></td>
                <td class="p-1 text-center"><button class="text-red-500 font-bold" onclick="removeRosterRow('official', ${index})">&times;</button></td>
            </tr>`;
    });
}

// ... RESTO DO CÓDIGO IGUAL AO ANTERIOR (Funções de jogo, renderPlayers, etc) ...
// Certifica-te de incluir as funções:
// saveRosterFromModal, checkStart, initUI, renderOfficials, renderPlayers
// togglePlayer (função interna), openModal (função interna), handleShotOutcome, etc.
// e checkTimeEvents, updateDisplay, etc.

function saveRosterFromModal() {
    const finalPlayers = tempRoster.players.filter(p => p.Numero && p.Nome).map(p => ({
        ...p,
        goals: 0, performanceScore: 0, onCourt: false, isSuspended: false, suspensionTimer: 0, timeOnCourt: 0,
        sanctions: { yellow: 0, twoMin: 0, red: 0 },
        positiveActions: [], negativeActions: [], disqualified: false
    }));
    const finalOfficials = tempRoster.officials.filter(o => o.Nome).map(o => ({
        ...o,
        sanctions: { yellow: 0, twoMin: 0, red: 0 }
    }));
    store.loadPlayers(finalPlayers, finalOfficials);
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

function renderOfficials() {
    if (!els.officialsListA) return;
    els.officialsListA.innerHTML = '';
    store.state.gameData.A.officials.forEach(off => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-2 mb-1 rounded-lg bg-gray-800 text-sm';
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-gray-400 w-6">${off.Numero || '-'}</span>
                <span class="font-medium">${off.Nome}</span>
            </div>
            <div class="flex gap-1">
                <button class="bg-yellow-600 px-2 py-1 rounded" onclick="window.openModal('sanction', 'OFF_${off.Nome}')">⚠️</button>
            </div>
        `;
        els.officialsListA.appendChild(div);
    });
}

function renderPlayers() {
    if(!els.playerListA || !els.goalkeeperListA) return;
    els.playerListA.innerHTML = '';
    els.goalkeeperListA.innerHTML = '';
    store.state.gameData.A.players.forEach(p => {
        const div = document.createElement('div');
        const isSuspended = p.isSuspended;
        const isDisqualified = p.disqualified;
        
        let statusClass = 'bg-gray-700';
        if (p.onCourt) statusClass = 'bg-green-900 border-l-4 border-green-500';
        if (isSuspended) statusClass = 'bg-red-900/50 opacity-75';
        if (isDisqualified) statusClass = 'bg-red-950 opacity-50 grayscale';

        div.className = `flex justify-between items-center p-2 mb-1 rounded-lg text-sm ${statusClass}`;
        
        const disabledAttr = isDisqualified ? 'disabled' : '';
        const opacityClass = isDisqualified ? 'opacity-30 cursor-not-allowed' : '';

        div.innerHTML = `
            <div class="flex items-center gap-2 w-1/3">
                <span class="font-bold text-gray-400 w-6">${p.Numero}</span>
                <span class="truncate font-medium">${p.Nome}</span>
                ${p.sanctions.yellow > 0 ? '<span class="text-yellow-400">▮</span>' : ''}
                ${p.sanctions.twoMin > 0 ? `<span class="text-red-400 font-bold">${'✌️'.repeat(p.sanctions.twoMin)}</span>` : ''}
                ${p.sanctions.red > 0 ? '<span class="text-red-600 text-xl">🟥</span>' : ''}
            </div>
            
            <div class="flex items-center justify-end gap-1 w-2/3">
                <span id="time-p-${p.Numero}" class="text-xs font-mono text-gray-300 mr-1">${formatTime(p.timeOnCourt)}</span>
                <span class="text-xs font-mono text-yellow-500 mr-2">PTS:${p.performanceScore || 0}</span>
                <button class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded ${opacityClass}" ${disabledAttr} onclick="window.openModal('shot', '${p.Numero}')">🎯</button>
                <button class="bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded ${opacityClass}" ${disabledAttr} onclick="window.openModal('positive', '${p.Numero}')">👍</button>
                <button class="bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded ${opacityClass}" ${disabledAttr} onclick="window.openModal('negative', '${p.Numero}')">👎</button>
                <button class="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded ${opacityClass}" ${disabledAttr} onclick="window.openModal('sanction', '${p.Numero}')">⚠️</button>
                ${isDisqualified 
                    ? `<span class="text-xs px-2 py-1 bg-red-950 text-red-500 font-bold">FORA</span>` 
                    : `<button class="text-xs px-2 py-1 rounded ${p.onCourt ? 'bg-gray-600' : 'bg-green-600'}" onclick="window.togglePlayer('${p.Numero}')">${p.onCourt ? 'Sai' : 'Entra'}</button>`
                }
            </div>
        `;
        if(p.Posicao && p.Posicao.includes('GR')) els.goalkeeperListA.appendChild(div);
        else els.playerListA.appendChild(div);
    });
    renderOfficials();
}

function setupModals() {
    document.querySelectorAll('.shot-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shot-type-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
            e.target.classList.replace('bg-gray-700', 'bg-blue-600');
            currentShotType = e.target.innerText;
            els.shotZoneContainer.classList.remove('hidden');
            els.shotGoalContainer.classList.add('hidden');
            els.shotOutcomeContainer.classList.add('hidden');
            document.querySelectorAll('.shot-zone-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
            currentShotZone = null;
            currentShotCoords = null;
            els.shotMarker.classList.add('hidden');
        });
    });
    document.querySelectorAll('.shot-zone-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.shot-zone-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
            e.target.classList.replace('bg-gray-700', 'bg-blue-600');
            currentShotZone = e.target.dataset.zone;
            els.shotGoalContainer.classList.remove('hidden');
            els.shotOutcomeContainer.classList.add('hidden');
        });
    });
    if (els.goalSvg) {
        els.goalSvg.addEventListener('click', (e) => {
            const rect = els.goalSvg.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            currentShotCoords = { x: xPercent.toFixed(1), y: yPercent.toFixed(1) };
            els.shotMarker.style.left = x + 'px';
            els.shotMarker.style.top = y + 'px';
            els.shotMarker.classList.remove('hidden');
            els.shotOutcomeContainer.classList.remove('hidden');
        });
    }
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

function togglePlayer(num) {
    const duration = store.state.halfDuration || 30; 
    const baseLimit = (duration === 25) ? 6 : 7;
    const suspendedCount = store.state.gameData.A.players.filter(p => p.isSuspended).length;
    const currentLimit = baseLimit - suspendedCount;
    const player = store.state.gameData.A.players.find(pl => pl.Numero == num);
    if (player) {
        if (player.disqualified) {
            alert("Jogador desclassificado.");
            return;
        }
        if (player.isSuspended) {
            alert("Jogador suspenso.");
            return;
        }
        if (!player.onCourt) {
            const playersOnCourt = store.state.gameData.A.players.filter(p => p.onCourt).length;
            if (playersOnCourt >= currentLimit) {
                alert(`Limite de ${currentLimit} jogadores atingido.`);
                return;
            }
        }
    }
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == num);
        if(p && !p.isSuspended && !p.disqualified) p.onCourt = !p.onCourt;
    });
    refreshUI();
}

function openModal(type, num) {
    currentPersonForAction = num;
    if (typeof num === 'string' && num.startsWith('OFF_')) {
        document.getElementById('shotPlayerName').textContent = num.replace('OFF_', 'Oficial: ');
        els.sanctionsModal.classList.remove('hidden');
        return;
    }
    if (num === 'OPPONENT') {
        document.getElementById('shotPlayerName').textContent = "Equipa Adversária";
    } else {
        const p = store.state.gameData.A.players.find(pl => pl.Numero == num);
        if(p && p.disqualified) return alert("Jogador desclassificado.");
        const name = p ? p.Nome : '';
        document.getElementById('shotPlayerName').textContent = name;
    }
    document.querySelectorAll('.shot-type-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
    document.querySelectorAll('.shot-zone-btn').forEach(b => b.classList.replace('bg-blue-600', 'bg-gray-700'));
    els.shotZoneContainer.classList.add('hidden');
    els.shotOutcomeContainer.classList.add('hidden');
    els.shotGoalContainer.classList.add('hidden'); 
    els.shotMarker.classList.add('hidden'); 
    currentShotType = null;
    currentShotZone = null;
    currentShotCoords = null;
    if(type === 'shot') els.shotModal.classList.remove('hidden');
    else if(type === 'sanction') els.sanctionsModal.classList.remove('hidden');
    else if(type === 'positive') els.positiveModal.classList.remove('hidden');
    else if(type === 'negative') els.negativeModal.classList.remove('hidden');
}

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

function handleShotOutcome(outcome) {
    store.update(s => {
        const typeKey = currentShotType || 'Default';
        const zoneKey = currentShotZone || '0';
        const coords = currentShotCoords || { x: 0, y: 0 }; 
        if (currentPersonForAction === 'OPPONENT') {
            if (outcome === 'goal') {
                s.gameData.B.stats.goals++;
                s.gameData.A.stats.gkGoalsAgainst++;
                logGameEvent(s, 'B', 'shot', `Golo Adversário (${typeKey}, Z${zoneKey})`);
            } else if (outcome === 'saved') {
                s.gameData.B.stats.savedShots++;
                s.gameData.A.stats.gkSaves++;
                logGameEvent(s, 'B', 'shot', `Defesa GR (${typeKey}, Z${zoneKey})`);
            } else if (outcome === 'miss') {
                s.gameData.B.stats.misses++;
                logGameEvent(s, 'B', 'shot', `Remate Fora Adv (${typeKey}, Z${zoneKey})`);
            }
            if (!s.gameData.B.history) s.gameData.B.history = [];
            s.gameData.B.history.push({ type: typeKey, zone: zoneKey, coords, outcome, time: s.totalSeconds });
        } else {
            const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
            if(!p) return;
            if(outcome === 'goal') { p.goals++; s.gameData.A.stats.goals++; }
            if(outcome === 'miss') s.gameData.A.stats.misses++;
            if(outcome === 'saved') s.gameData.A.stats.savedShots++;
            const outcomeKey = outcome === 'goal' ? 'goal' : 'fail';
            const points = POINT_SYSTEM.field_player.shot[typeKey]?.[outcomeKey] || 0;
            p.performanceScore = (p.performanceScore || 0) + points;
            if (!p.history) p.history = [];
            p.history.push({ type: typeKey, zone: zoneKey, coords, outcome, time: s.totalSeconds });
            logGameEvent(s, 'A', 'shot', `${p.Nome}: ${outcome} (${typeKey}, Z${zoneKey})`);
        }
    });
    els.shotModal.classList.add('hidden');
    refreshUI();
}

function handleSanctionOutcome(type) {
    store.update(s => {
        if (currentPersonForAction === 'OPPONENT') {
            if (type === '2min') {
                s.gameData.B.isSuspended = true;
                s.gameData.B.suspensionTimer = 120;
            }
            logGameEvent(s, 'B', 'sanction', `Adversário: ${type}`);
        } else if (typeof currentPersonForAction === 'string' && currentPersonForAction.startsWith('OFF_')) {
            const officialName = currentPersonForAction.replace('OFF_', '');
            const official = s.gameData.A.officials.find(o => o.Nome === officialName);
            if (official) {
                if(type === 'yellow') official.sanctions.yellow++;
                if(type === '2min') official.sanctions.twoMin++;
                if(type === 'red') official.sanctions.red++;
                logGameEvent(s, 'A', 'sanction', `Oficial ${officialName}: ${type}`);
            }
        } else {
            const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
            if(!p) return;
            if (type === 'yellow') {
                if (s.gameData.A.teamYellowCards >= 3) alert("Atenção: A equipa já tem 3 cartões amarelos!");
                p.sanctions.yellow++;
                s.gameData.A.teamYellowCards++;
            }
            if (type === 'red') { 
                p.sanctions.red++; 
                p.onCourt = false;
                p.isSuspended = true; 
                p.suspensionTimer = 120;
                p.disqualified = true;
            }
            if (type === '2min') {
                p.sanctions.twoMin++;
                if (p.sanctions.twoMin >= 3) {
                    alert(`O jogador #${p.Numero} atingiu 3 exclusões e foi desqualificado (Vermelho)!`);
                    p.sanctions.red++; 
                    p.onCourt = false; 
                    p.isSuspended = true; 
                    p.suspensionTimer = 120;
                    p.disqualified = true;
                } else {
                    p.isSuspended = true;
                    p.suspensionTimer = 120;
                    p.onCourt = false;
                }
            }
            logGameEvent(s, 'A', 'sanction', `${p.Nome}: ${type}`);
        }
    });
    els.sanctionsModal.classList.add('hidden');
    refreshUI();
}

function handleGenericAction(action, type) {
    store.update(s => {
        if (currentPersonForAction === 'OPPONENT') {
            if(type === 'negative') {
                if(action === 'technical_fault') s.gameData.B.stats.technical_faults++;
                if(action === 'turnover') s.gameData.B.stats.turnovers++;
            }
            logGameEvent(s, 'B', action, `Adversário: ${action}`);
        } else {
            const p = s.gameData.A.players.find(pl => pl.Numero == currentPersonForAction);
            if(!p) return;
            const points = POINT_SYSTEM.field_player[`${type}_actions`][action] || 0;
            p.performanceScore = (p.performanceScore || 0) + points;
            if(type === 'negative') {
                p.negativeActions.push({ action, time: s.totalSeconds });
                if(action === 'technical_fault') s.gameData.A.stats.technical_faults++;
            } else {
                p.positiveActions.push({ action, time: s.totalSeconds });
            }
            logGameEvent(s, 'A', action, `${p.Nome}: ${action}`);
        }
    });
    els.positiveModal.classList.add('hidden');
    els.negativeModal.classList.add('hidden');
    refreshUI();
}

function checkTimeEvents(totalSeconds) {
    if (!store.state.isRunning) return;
    const halfDurationSeconds = store.state.halfDuration * 60; 
    if (store.state.currentGamePart === 1 && totalSeconds >= halfDurationSeconds) {
        timer.pause(totalSeconds);
        store.update(s => {
            s.isRunning = false;
            s.currentGamePart = 2; 
        });
        alert("Fim da 1ª Parte!");
        if(els.editTimerBtn) els.editTimerBtn.disabled = false; 
        return; 
    }
    if (store.state.currentGamePart === 2 && totalSeconds >= halfDurationSeconds * 2) {
        timer.pause(totalSeconds);
        store.update(s => {
            s.isRunning = false;
        });
        alert("Fim do Jogo!");
        if(els.editTimerBtn) els.editTimerBtn.disabled = false; 
        return;
    }
    let needsUpdate = false;
    store.state.gameData.A.players.forEach(p => {
        if (p.isSuspended && p.suspensionTimer > 0) {
            p.suspensionTimer--;
            if (p.suspensionTimer <= 0) p.isSuspended = false;
            needsUpdate = true;
        }
        if (p.onCourt) p.timeOnCourt++;
    });
    if(store.state.gameData.B.isSuspended && store.state.gameData.B.suspensionTimer > 0) {
        store.state.gameData.B.suspensionTimer--;
        if(store.state.gameData.B.suspensionTimer <= 0) store.state.gameData.B.isSuspended = false;
        needsUpdate = true;
    }
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
    if(store.state.gameData.B.isSuspended && store.state.gameData.B.suspensionTimer > 0) {
        const div = document.createElement('div');
        div.className = 'bg-orange-700 px-2 py-1 rounded text-white font-bold animate-pulse';
        div.textContent = `ADV - ${formatTime(store.state.gameData.B.suspensionTimer)}`;
        els.suspensionContainer.appendChild(div);
    }
}

function refreshUI() {
    updateDisplay();
    renderPlayers();
    updateTeamStats();
    renderTimeline();
    updateSuspensionsDisplay();
    if(!els.tabStats.classList.contains('hidden')) updateStatsTab();
    if(!els.tabHeatmap.classList.contains('hidden')) updateHeatmapTab();
}

function updateStatsTab() {
    const statsA = store.state.gameData.A.stats;
    const statsB = store.state.gameData.B.stats;
    const teamA = store.state.teamAName;
    const teamB = store.state.teamBName;
    const totalShotsA = statsA.goals + statsA.misses + statsA.savedShots;
    const totalShotsB = statsB.goals + statsB.misses + statsB.savedShots;
    const effA = totalShotsA > 0 ? ((statsA.goals / totalShotsA) * 100).toFixed(0) : 0;
    const effB = totalShotsB > 0 ? ((statsB.goals / totalShotsB) * 100).toFixed(0) : 0;
    const gkEffA = (statsA.gkSaves + statsA.gkGoalsAgainst) > 0 
        ? ((statsA.gkSaves / (statsA.gkSaves + statsA.gkGoalsAgainst)) * 100).toFixed(0) : 0;
    const gkEffB = (statsB.gkSaves + statsB.gkGoalsAgainst) > 0 
        ? ((statsB.gkSaves / (statsB.gkSaves + statsB.gkGoalsAgainst)) * 100).toFixed(0) : 0;
    const rows = [
        { label: "Golos", valA: statsA.goals, valB: statsB.goals },
        { label: "Eficácia Remate", valA: `${effA}%`, valB: `${effB}%` },
        { label: "Eficácia GR", valA: `${gkEffA}%`, valB: `${gkEffB}%` },
        { label: "Faltas Técnicas", valA: store.state.gameData.A.stats.technical_faults, valB: statsB.technical_faults },
        { label: "Perdas de Bola", valA: statsA.turnovers, valB: statsB.turnovers }
    ];
    let html = '';
    rows.forEach(row => {
        html += `
            <div class="grid grid-cols-3 items-center text-center border-b border-gray-700 py-3">
                <div class="text-xl font-bold text-blue-400">${row.valA}</div>
                <div class="text-sm text-gray-400 font-medium uppercase tracking-wide">${row.label}</div>
                <div class="text-xl font-bold text-orange-400">${row.valB}</div>
            </div>
        `;
    });
    const header = `
        <div class="grid grid-cols-3 text-center mb-4 border-b border-gray-600 pb-2">
            <div class="font-bold text-white truncate px-2 text-lg">${teamA}</div>
            <div></div>
            <div class="font-bold text-white truncate px-2 text-lg">${teamB}</div>
        </div>
    `;
    els.statsComparisonContainer.innerHTML = header + html;
}

function updateHeatmapTab() {
    els.heatmapPointsAttack.innerHTML = '';
    els.heatmapPointsDefense.innerHTML = '';
    store.state.gameData.A.players.forEach(p => {
        if (p.history) {
            p.history.forEach(shot => {
                drawDot(els.heatmapPointsAttack, shot);
            });
        }
    });
    if (store.state.gameData.B.history) {
        store.state.gameData.B.history.forEach(shot => {
            drawDot(els.heatmapPointsDefense, shot);
        });
    }
}

function drawDot(container, shot) {
    if (!shot.coords || !shot.coords.x) return;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", (shot.coords.x / 100) * 300);
    circle.setAttribute("cy", (shot.coords.y / 100) * 200);
    circle.setAttribute("r", 5);
    if (shot.outcome === 'goal') circle.setAttribute("fill", "#22c55e");
    else if (shot.outcome === 'saved') circle.setAttribute("fill", "#3b82f6");
    else circle.setAttribute("fill", "#ef4444");
    circle.setAttribute("stroke", "white");
    circle.setAttribute("stroke-width", "1");
    circle.setAttribute("opacity", "0.9");
    container.appendChild(circle);
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
