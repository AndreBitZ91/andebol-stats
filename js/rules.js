// js/rules.js - Regras Oficiais de Sanções

export const SANCTION_LIMITS = {
    TEAM_YELLOW_CARDS: 3,
    PLAYER_TWO_MINUTES: 3,
    OFFICIALS: {
        YELLOW: 1,
        TWO_MIN: 1,
        RED: 1
    }
};

export const Rules = {
    // Verifica se a equipa ainda pode receber amarelos
    canTeamReceiveYellow(teamStats) {
        return teamStats.teamYellowCards < SANCTION_LIMITS.TEAM_YELLOW_CARDS;
    },

    // Verifica se um jogador específico pode receber amarelo (opcional, mas boa prática)
    canPlayerReceiveYellow(player) {
        return player.sanctions.yellow === 0;
    },

    // Verifica estado do jogador nos 2 minutos
    checkPlayerTwoMinStatus(player) {
        // Retorna: 'normal', 'risk' (tem 2), 'disqualified' (vai ser expulso)
        if (player.sanctions.twoMin >= 2) return 'disqualified'; // O próximo será o 3º
        return 'normal';
    },

    // Verifica sanções da equipa técnica (Coletivo)
    canOfficialsReceive(type, officialsStats) {
        if (type === 'yellow') return officialsStats.yellow < SANCTION_LIMITS.OFFICIALS.YELLOW;
        if (type === '2min') return officialsStats.twoMin < SANCTION_LIMITS.OFFICIALS.TWO_MIN;
        if (type === 'red') return officialsStats.red < SANCTION_LIMITS.OFFICIALS.RED;
        return true;
    },

    // Define se uma sanção implica redução de equipa (sacrificar jogador)
    requiresPlayerReduction(personType, sanctionType) {
        // Jogador leva 2min ou Vermelho -> Sim (já tratado pela suspensão do próprio)
        // Oficial leva 2min ou Vermelho -> SIM (Regra específica pedida)
        if (personType === 'official' && (sanctionType === '2min' || sanctionType === 'red')) {
            return true;
        }
        return false;
    }
};
