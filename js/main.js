// js/main.js - O Maestro da Aplicação
import { store } from './state.js';
import { GameTimer } from './timer.js';
import { POINT_SYSTEM } from './constants.js'; // Importar regras de pontuação

let timer;
let currentPlayerForShot = null;
let currentShotType = null; // Variável para guardar o tipo de remate selecionado (ex: "Ponta")

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Configurar Cronómetro
    timer = new GameTimer((seconds) => {
        store.state.totalSeconds = seconds;
        updateDisplay();
    });

    // Verificar se há jogo guardado no LocalStorage
    if (store.loadFromLocalStorage()) {
        initUI();
    } else {
        document.getElementById('welcomeModal').classList.remove('hidden');
    }

    setupEvents();
});

function setupEvents() {
    // 1. Carregar Ficheiro Excel
    document.getElementById('welcome-file-input-A').addEventListener('change', handleFileSelect);
    document.getElementById('welcome-team-b-name').addEventListener('input', checkStart);
    
    // 2. Botão Começar Jogo
    document.getElementById('startGameBtn').addEventListener('click', () => {
        store.update(s => {
            s.teamBName = document.getElementById('welcome-team-b-name').value;
        });
        initUI();
    });

    // 3. Controlos do Cronómetro
    document.getElementById('startBtn').addEventListener('click', () => {
        timer.start();
        store.update(s => s.isRunning = true);
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        timer.pause(store.state.totalSeconds);
        store.update(s => s.isRunning = false);
    });

    // 4. Botão Undo (Desfazer)
    document.getElementById('undoBtn').addEventListener('click', () => {
        const oldState = store.undo();
        if (oldState) {
            timer.pause(oldState.totalSeconds);
            timer.elapsedPaused = oldState.totalSeconds; // Sincronizar timer interno
            updateDisplay();
            renderPlayers();
            alert("Ação desfeita com sucesso!");
        } else {
            alert("Não existem ações anteriores para desfazer.");
        }
    });

    // NOVO: Botão Reiniciar Jogo
    document.getElementById('resetGameBtn').addEventListener('click', () => {
        if (confirm("Tem a certeza que quer reiniciar? \n\nTodos os golos e estatísticas deste jogo serão perdidos permanentemente.")) {
            store.clearLocalStorage(); // Limpa os dados do telemóvel
            window.location.reload();  // Recarrega a página para o ecrã inicial
        }
    });

    // 5. Botões Rápidos do Adversário
    document.getElementById('goalOpponentBtn').addEventListener('click', () => {
        store.update(s => s.gameData.B.stats.goals++);
        updateDisplay();
    });

    // 6. Seleção do Tipo de Remate (Visual)
    document.querySelectorAll('.shot-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset visual dos botões
            document.querySelectorAll('.shot-type-btn').forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-700', 'text-white');
            });
            
            // Ativar botão clicado
            e.target.classList.remove('bg-gray-700');
            e.target.classList.add('bg-blue-600');
            
            currentShotType = e.target.innerText; // Guardar o tipo (ex: "Ponta")
        });
    });

    // 7. Confirmar Resultado do Remate (Golo/Defesa/Fora)
    document.querySelectorAll('.shot-outcome-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const outcome = e.target.dataset.outcome;
            
            store.update(s => {
                const p = s.gameData.A.players.find(pl => pl.Numero == currentPlayerForShot);
                if(p) {
                    // A. Atualizar Estatísticas Básicas
                    if(outcome === 'goal') { 
                        p.goals++; 
                        s.gameData.A.stats.goals++; 
                    }
                    
                    // B. Calcular Pontuação (Performance Score) usando constants.js
                    const playerType = (p.Posicao === 'GR') ? 'goalkeeper' : 'field_player';
                    
                    // Determinar chaves para procurar no objeto POINT_SYSTEM
                    const typeKey = currentShotType || 'Default'; // Usa 'Default' se não selecionou tipo
                    const outcomeKey = (outcome === 'goal') ? 'goal' : 'fail'; // Simplificação: miss/saved/post = fail ou saved
                    
                    let points = 0;
                    
                    // Lógica de segurança para encontrar os pontos
                    if (POINT_SYSTEM[playerType] && POINT_SYSTEM[playerType].shot[typeKey]) {
                        // Tenta buscar pontos específicos (ex: Ponta -> goal)
                        // Nota: Se for GR a sofrer golo, a lógica seria diferente (shot_faced), 
                        // aqui assumimos remate do jogador ativo.
                        if (playerType === 'goalkeeper' && outcome === 'saved') {
                             // GR defendeu (shot_faced logic seria aplicada noutro contexto, 
                             // aqui é o GR a rematar à baliza adversária se for shot normal)
                             points = POINT_SYSTEM[playerType].shot[outcomeKey] || -1;
                        } else {
                             points = POINT_SYSTEM[playerType].shot[typeKey][outcomeKey] || 0;
                        }
                    } else {
                        // Fallback genérico
                        points = POINT_SYSTEM['field_player'].shot['Default'][outcomeKey] || 0;
                    }

                    // Inicializar e somar score
                    if (!p.performanceScore) p.performanceScore = 0;
                    p.performanceScore += points;
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

// --- Funções Auxiliares de Lógica ---

function handleFileSelect(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        // Mapear dados do Excel para a estrutura da App
        const players = json.map(p => ({
            Numero: p.Numero,
            Nome: p.Nome,
            Posicao: p.Posicao,
            goals: 0,
            performanceScore: 0, // Novo campo para pontuação
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
    
    // Restaurar Timer se necessário
    timer.elapsedPaused = store.state.totalSeconds;
    if(store.state.isRunning) timer.start();
    
    updateDisplay();
    renderPlayers();
}

function updateDisplay() {
    // Placar
    document.getElementById('scoreA').textContent = store.state.gameData.A.stats.goals;
    document.getElementById('scoreB').textContent = store.state.gameData.B.stats.goals;
    
    // Timer Formatado
    const sec = store.state.totalSeconds;
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
}

function renderPlayers() {
    const list = document.getElementById('player-list-A');
    list.innerHTML = '';
    
    store.state.gameData.A.players.forEach(p => {
        if(p.Posicao === 'GR') return; // Ignorar GR na lista de campo para simplificar visualização
        
        const div = document.createElement('div');
        // Estilo dinâmico se estiver em campo ou no banco
        div.className = `flex justify-between items-center p-3 mb-2 rounded-lg ${p.onCourt ? 'bg-green-900 on-court' : 'bg-gray-700 on-bench'}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-400 w-6">${p.Numero}</span>
                <span class="font-medium truncate w-32">${p.Nome}</span>
            </div>
            <div class="flex items-center gap-2">
                <!-- Mostra a Pontuação calculada (Pts) -->
                <span class="text-xs font-mono text-yellow-400 mr-1">Pts:${p.performanceScore || 0}</span>
                <span class="font-bold text-white mr-2">${p.goals} G</span>
                
                <!-- Botão para abrir Modal de Remate -->
                <button class="shot-btn bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm font-bold transition" onclick="window.openShot('${p.Numero}', '${p.Nome}')">Remate</button>
                
                <!-- Botão Banco/Campo -->
                <button class="toggle-btn ${p.onCourt ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-500'} px-3 py-1 rounded text-sm transition" onclick="window.togglePlayer('${p.Numero}')">
                    ${p.onCourt ? 'Banco' : 'Campo'}
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- Funções Globais ---
// Necessárias porque os botões no HTML usam onclick="window.funcao()"

window.togglePlayer = (num) => {
    store.update(s => {
        const p = s.gameData.A.players.find(pl => pl.Numero == num);
        if(p) p.onCourt = !p.onCourt;
    });
    renderPlayers();
};

window.openShot = (num, name) => {
    currentPlayerForShot = num;
    currentShotType = null; // Reset ao tipo de remate ao abrir novo modal
    
    // Reset visual dos botões de tipo
    document.querySelectorAll('.shot-type-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-gray-700', 'text-white');
    });

    document.getElementById('shotPlayerName').textContent = name;
    document.getElementById('shotModal').classList.remove('hidden');
};
