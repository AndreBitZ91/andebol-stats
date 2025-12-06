// js/fileLoader.js
export function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Verificar se a biblioteca SheetJS (XLSX) está carregada
        if (typeof XLSX === 'undefined') {
            return reject(new Error("A biblioteca Excel (SheetJS) não foi carregada. Verifique a ligação à internet."));
        }

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Processar os dados
                const roster = processWorkbookData(workbook);
                resolve(roster);
            } catch (err) {
                reject(new Error("Erro ao processar a estrutura do Excel: " + err.message));
            }
        };

        reader.onerror = () => reject(new Error("Erro de leitura do ficheiro local."));
        reader.readAsArrayBuffer(file);
    });
}

function processWorkbookData(workbook) {
    const sheetNames = workbook.SheetNames;
    const roster = { players: [], officials: [] };

    // 1. Detetar Abas
    const oficiaisSheetName = sheetNames.find(name => 
        name.toLowerCase().includes('oficiais') || name.toLowerCase().includes('officials')
    );
    
    let jogadoresSheetName = sheetNames[0];
    // Se a primeira aba for a de oficiais, e houver outra, assume a segunda como jogadores
    if (oficiaisSheetName && jogadoresSheetName === oficiaisSheetName && sheetNames.length > 1) {
        jogadoresSheetName = sheetNames[1];
    }

    // 2. Extrair Jogadores
    if (jogadoresSheetName) {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[jogadoresSheetName]);
        json.forEach(row => {
            // Tenta ler colunas comuns (Numero, Nome, Posicao)
            const num = row.Numero ? String(row.Numero).trim() : '';
            const nome = row.Nome || '';
            const pos = row.Posicao || '';

            // Se não houver aba separada, tenta separar por lógica
            if (!oficiaisSheetName) {
                const isOfficial = num.match(/^[A-Z]$/i) || 
                                 (pos && (pos.toLowerCase().includes('treinador') || pos.toLowerCase().includes('oficial')));
                
                if (isOfficial) {
                    roster.officials.push({ Numero: num, Nome: nome, Posicao: pos });
                } else {
                    // Adiciona flag 'disqualified' para controlo de jogo
                    roster.players.push({ Numero: num, Nome: nome, Posicao: pos, disqualified: false });
                }
            } else {
                roster.players.push({ Numero: num, Nome: nome, Posicao: pos, disqualified: false });
            }
        });
    }

    // 3. Extrair Oficiais
    if (oficiaisSheetName) {
        const jsonOff = XLSX.utils.sheet_to_json(workbook.Sheets[oficiaisSheetName]);
        jsonOff.forEach(row => {
            // Na aba de oficiais, às vezes o ID está na coluna 'Posicao' ou 'Numero'
            let id = '';
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
