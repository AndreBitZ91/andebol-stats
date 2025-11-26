// js/export.js - Lógica de Exportação

export const exportToExcel = (gameData, gameEvents) => {
    if (!gameData.A.fileLoaded) {
        alert("Sem dados para exportar.");
        return;
    }

    const wb = XLSX.utils.book_new();
    const teamAName = "Minha Equipa"; // Pode vir do estado
    const teamBName = "Adversário";

    // 1. Folha Geral
    const statsData = [
        ["Métrica", teamAName, teamBName],
        ["Golos", gameData.A.stats.goals, gameData.B.stats.goals],
        ["Remates Totais", 
            gameData.A.stats.goals + gameData.A.stats.misses + gameData.A.stats.savedShots, 
            gameData.B.stats.goals + gameData.B.stats.misses + gameData.B.stats.savedShots
        ],
        ["Defesas GR", gameData.A.stats.gkSaves, gameData.B.stats.gkSaves],
        ["Faltas Técnicas", 
            gameData.A.players.reduce((acc, p) => acc + p.negativeActions.filter(a => a.action === 'technical_fault').length, 0), 
            gameData.B.stats.technical_faults
        ]
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, "Geral");

    // 2. Folha Individual
    const playersData = gameData.A.players.map(p => ({
        "Nº": p.Numero,
        "Nome": p.Nome,
        "Golos": p.goals,
        "Pontuação": p.performanceScore,
        "Amarelos": p.sanctions.yellow,
        "2 Minutos": p.sanctions.twoMin,
        "Tempo Jogo": Math.floor(p.timeOnCourt / 60) + "m"
    }));
    const wsPlayers = XLSX.utils.json_to_sheet(playersData);
    XLSX.utils.book_append_sheet(wb, wsPlayers, "Jogadores");

    // 3. Folha de Eventos (Timeline)
    const eventsData = gameEvents.map(e => ({
        "Tempo": formatTime(e.time),
        "Equipa": e.team === 'A' ? teamAName : teamBName,
        "Tipo": e.type,
        "Detalhes": e.details
    }));
    const wsEvents = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(wb, wsEvents, "Timeline");

    // Download
    XLSX.writeFile(wb, `Relatorio_Jogo_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// Helper simples para tempo
function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}
