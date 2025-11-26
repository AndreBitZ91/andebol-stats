// js/constants.js - Regras e Pontuações do Andebol

export const SHOT_ZONE_RULES = { 
    'Ponta': [1, 5], 'Pivot': [2, 3, 4], 'Penetração': [2, 3, 4], 
    '6mt': [2, 3, 4], '9mt': [6, 7, 8], '7mt': [], 
    '1ª Vaga': [1, 2, 3, 4, 5, 6, 7, 8], '2ª Vaga': [1, 2, 3, 4, 5, 6, 7, 8], 
    '3ª Vaga': [1, 2, 3, 4, 5, 6, 7, 8], 'Após Golo': [1, 2, 3, 4, 5, 6, 7, 8], 
    'Baliza Aberta': [] 
};

export const POINT_SYSTEM = {
    goalkeeper: {
        shot: { goal: 10, fail: -1 },
        shot_faced: {
            'Ponta': { saved: 7, goal: -3 },
            'Pivot': { saved: 9, goal: -1 },
            'Penetração': { saved: 8, goal: -2 },
            '6mt': { saved: 8, goal: -2 },
            '9mt': { saved: 7, goal: -3 },
            '7mt': { saved: 8, goal: -2 },
            '1ª Vaga': { saved: 8, goal: -2 },
            '2ª Vaga': { saved: 8, goal: -2 },
            '3ª Vaga': { saved: 8, goal: -2 },
            'Após Golo': { saved: 8, goal: -2 },
            'Baliza Aberta': { saved: 10, goal: -1 },
            'Default': { saved: 5, goal: -2 } // Fallback
        },
        positive_actions: { '2min_provoked': 1, '2min_7m_provoked': 1 },
        negative_actions: {
            'technical_fault': -6, 'turnover': -8, '7m_foul': -1,
            'sanction_yellow': 0, 'sanction_2min': -1, 'sanction_red': -12, '2min_7m_foul': -2
        }
    },
    field_player: {
        shot: {
            'Ponta': { goal: 6, fail: -7 },
            'Pivot': { goal: 6, fail: -7 },
            'Penetração': { goal: 6, fail: -7 },
            '6mt': { goal: 6, fail: -7 },
            '9mt': { goal: 10, fail: -4 },
            '7mt': { goal: 6, fail: -8 },
            '1ª Vaga': { goal: 5, fail: -8 },
            '2ª Vaga': { goal: 5, fail: -8 },
            '3ª Vaga': { goal: 5, fail: -8 },
            'Após Golo': { goal: 5, fail: -8 },
            'Baliza Aberta': { goal: 10, fail: -1 },
            'Default': { goal: 5, fail: -5 } // Fallback
        },
        positive_actions: {
            'assist': 4, 'steal': 8, '2min_provoked': 1,
            '7m_provoked': 3, '2min_7m_provoked': 4
        },
        negative_actions: {
            'technical_fault': -6, 'turnover': -8, '7m_foul': -1,
            'sanction_yellow': 0, 'sanction_2min': -1, 'sanction_red': -12, '2min_7m_foul': -2
        }
    }
};
