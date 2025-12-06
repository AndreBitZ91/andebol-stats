// js/fileLoader.js - Módulo dedicado à leitura de ficheiros

export function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // 1. Verificar se a biblioteca existe
        if (typeof XLSX === 'undefined') {
            return reject(new Error("A biblioteca Excel (SheetJS) não foi carregada. Verifique a internet."));
        }

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const result = parseWorkbook(workbook);
                resolve(result);
            } catch (err) {
                reject(new Error("Falha ao processar o ficheiro Excel: " + err.message));
            }
        };

        reader.onerror = () => reject(new Error("Erro de leitura do ficheiro."));
        reader.readAsArrayBuffer(file);
    });
}

function parseWorkbook(workbook) {
    const sheetNames = workbook.SheetNames;
    const roster = { players: [], officials: [] };

    // Tentar encontrar a aba de oficiais
    const oficiaisSheetName = sheetNames.find(name => 
        name.toLowerCase().includes('oficiais') || name.toLowerCase().includes('officials')
    );
    
    let jogadoresSheetName = sheetNames[0];
    
    // Se a primeira aba for a de oficiais e houver outra, a segunda é a de jogadores
    if (oficiaisSheetName && jogadoresSheetName === oficiaisSheetName && sheetNames.length > 1) {
        jogadoresSheetName = sheetNames[1];
    }

    // --- 1. Processar Jogadores ---
    if (jogadoresSheetName) {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[jogadoresSheetName]);
        json.forEach(row => {
            const num = row.Numero ? String(row.Numero).trim() : '';
            const nome = row.Nome || '';
            const pos = row.Posicao || '';

            // Se não houver aba separada, usamos a lógica de deteção mista
            if (!oficiaisSheetName) {
                const isOfficial = num.match(/^[A-Z]$/i) || 
                                 (pos && (pos.toLowerCase().includes('treinador') || pos.toLowerCase().includes('oficial')));
                
                if (isOfficial) {
                    roster.officials.push({ Numero: num, Nome: nome, Posicao: pos });
                } else {
                    roster.players.push({ Numero: num, Nome: nome, Posicao: pos });
                }
            } else {
                // Se houver aba separada, tudo aqui é jogador
                roster.players.push({ Numero: num, Nome: nome, Posicao: pos });
            }
        });
    }

    // --- 2. Processar Oficiais (Aba dedicada) ---
    if (oficiaisSheetName) {
        const jsonOff = XLSX.utils.sheet_to_json(workbook.Sheets[oficiaisSheetName]);
        jsonOff.forEach(row => {
            let id = '';
            // Tenta encontrar o ID na coluna Posicao (Letra) ou Numero
            if (row.Posicao && String(row.Posicao).trim().length <= 2) {
                id = String(row.Posicao).trim();
            } else if (row.Numero) {
                id = String(row.Numero).trim();
            }
            
            const nome = row.Nome || '';
            const cargo = 'Oficial';
            
            roster.officials.push({ Numero: id, Nome: nome, Posicao: cargo });
        });
    }

    return roster;
}
