import { db, doc, setDoc, getDoc } from './firebaseConfig.js';

// Objeto global para armazenar os índices
let ipcaIndices = {};
let tiposIndices = ['IPCA-E'];
let indiceAtual = 'IPCA-E';

// Função para carregar índices do Firebase
async function carregarIndices() {
    try {
        const docRef = doc(db, "indices", "dados_indices");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            ipcaIndices = data.ipcaIndices || {};
            tiposIndices = data.tiposIndices || ['IPCA-E'];
        } else {
            ipcaIndices = {};
            tiposIndices = ['IPCA-E'];
        }
    } catch (error) {
        console.error("Erro ao carregar índices:", error);
        ipcaIndices = {};
        tiposIndices = ['IPCA-E'];
    }
}

// Função para salvar índices no Firebase
async function salvarIndices() {
    try {
        await setDoc(doc(db, "indices", "dados_indices"), {
            ipcaIndices,
            tiposIndices
        });
        return true;
    } catch (error) {
        console.error("Erro ao salvar índices:", error);
        return false;
    }
}

// Editor de Índices
document.addEventListener('DOMContentLoaded', async function() {
    const tableBody = document.getElementById('table-body');
    const addYearBtn = document.getElementById('add-year');
    const saveBtn = document.getElementById('save-data');
    const importBtn = document.getElementById('import-data');
    const exportBtn = document.getElementById('export-data');
    const tipoIndiceSelect = document.getElementById('tipo-indice');
    const novoTipoIndiceInput = document.getElementById('novo-tipo-indice');
    const addTipoIndiceBtn = document.getElementById('add-tipo-indice');
    const deleteTipoBtn = document.getElementById('delete-tipo');

    // Carrega os índices ao iniciar
    await carregarIndices();
    
    // Atualizar select de tipos de índices
    function atualizarSelectTipos() {
        tipoIndiceSelect.innerHTML = '';
        tiposIndices.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            tipoIndiceSelect.appendChild(option);
        });
        
        // Atualizar visibilidade do botão de excluir
        deleteTipoBtn.style.display = tiposIndices.length > 1 ? 'inline-block' : 'none';
    }

    // Adicionar novo tipo de índice
    async function adicionarNovoTipo() {
        const novoTipo = novoTipoIndiceInput.value.trim();
        if (!novoTipo) {
            alert('Digite um nome para o novo tipo de índice');
            return;
        }
        
        if (tiposIndices.includes(novoTipo)) {
            alert('Este tipo de índice já existe');
            return;
        }
        
        tiposIndices.push(novoTipo);
        ipcaIndices[novoTipo] = {};
        
        const salvou = await salvarIndices();
        if (salvou) {
            atualizarSelectTipos();
            tipoIndiceSelect.value = novoTipo;
            indiceAtual = novoTipo;
            novoTipoIndiceInput.value = '';
            limparTabela();
            window.hasUnsavedChanges = true;
            alert(`Tipo de índice "${novoTipo}" adicionado com sucesso!`);
        } else {
            alert('Erro ao salvar o novo tipo de índice');
        }
    }

    // Excluir tipo de índice atual
    async function excluirTipoAtual() {
        if (tiposIndices.length <= 1) {
            alert('Não é possível excluir o único tipo de índice disponível');
            return;
        }
        
        showConfirmation(`Tem certeza que deseja excluir o tipo de índice "${indiceAtual}"? Esta ação não pode ser desfeita.`, async function() {
            // Encontrar um novo índice para selecionar
            const novoIndice = tiposIndices.find(tipo => tipo !== indiceAtual);
            
            // Remover da lista e dos dados
            tiposIndices = tiposIndices.filter(tipo => tipo !== indiceAtual);
            delete ipcaIndices[indiceAtual];
            
            // Salvar e atualizar
            const salvou = await salvarIndices();
            if (salvou) {
                indiceAtual = novoIndice;
                tipoIndiceSelect.value = novoIndice;
                atualizarSelectTipos();
                carregarTabela();
                window.hasUnsavedChanges = true;
                alert(`Tipo de índice excluído com sucesso!`);
            } else {
                alert('Erro ao excluir o tipo de índice');
            }
        });
    }

    // Limpar tabela
    function limparTabela() {
        tableBody.innerHTML = '';
    }

    // Carregar tabela com dados do índice atual
    function carregarTabela() {
        limparTabela();
        const indices = ipcaIndices[indiceAtual] || {};
        
        for (const year in indices) {
            adicionarLinhaAno(year, indices[year]);
        }
    }

    // Adicionar linha de ano na tabela
    function adicionarLinhaAno(year, monthsData) {
        const row = document.createElement('tr');
        row.id = `year-${year}`;
        
        const yearCell = document.createElement('td');
        yearCell.textContent = year;
        row.appendChild(yearCell);
        
        for (let month = 1; month <= 12; month++) {
            const monthCell = document.createElement('td');
            monthCell.contentEditable = true;
            monthCell.textContent = (monthsData[month] || 0).toFixed(2).replace('.', ',');
            monthCell.addEventListener('blur', validateCell);
            row.appendChild(monthCell);
        }
        
        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.addEventListener('click', () => {
            showConfirmation(`Tem certeza que deseja excluir o ano ${year}?`, function() {
                row.remove();
                delete ipcaIndices[indiceAtual][year];
                window.hasUnsavedChanges = true;
            });
        });
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
    }

    // Adicionar novo ano
    function addNewYear() {
        const currentYear = new Date().getFullYear();
        let newYear = currentYear;
        
        while (document.getElementById(`year-${newYear}`)) {
            newYear--;
        }
        
        // Adiciona ano vazio
        if (!ipcaIndices[indiceAtual]) {
            ipcaIndices[indiceAtual] = {};
        }
        
        ipcaIndices[indiceAtual][newYear] = {};
        for (let i = 1; i <= 12; i++) {
            ipcaIndices[indiceAtual][newYear][i] = 0;
        }
        
        adicionarLinhaAno(newYear, ipcaIndices[indiceAtual][newYear]);
        window.hasUnsavedChanges = true;
    }

    // Validar célula editada
    function validateCell(e) {
        const value = e.target.textContent.replace(',', '.');
        if (isNaN(value)) {
            e.target.textContent = '0,00';
            alert('Digite um valor numérico válido');
        } else {
            e.target.textContent = parseFloat(value).toFixed(2).replace('.', ',');
            window.hasUnsavedChanges = true;
            
            // Atualizar dados na memória
            const row = e.target.parentElement;
            const year = row.cells[0].textContent;
            const monthIndex = Array.from(row.cells).indexOf(e.target);
            const month = monthIndex; // A primeira célula é o ano
            
            if (!ipcaIndices[indiceAtual][year]) {
                ipcaIndices[indiceAtual][year] = {};
            }
            ipcaIndices[indiceAtual][year][month] = parseFloat(value);
        }
    }

    // Mostrar confirmação
    function showConfirmation(message, callback) {
        const event = new CustomEvent('show-confirmation', {
            detail: {
                message: message,
                callback: callback
            }
        });
        window.dispatchEvent(event);
    }

    // Event Listeners
    addYearBtn.addEventListener('click', addNewYear);
    saveBtn.addEventListener('click', async function() {
        const salvou = await salvarIndices();
        if (salvou) {
            window.hasUnsavedChanges = false;
            alert('Dados salvos com sucesso!');
        } else {
            alert('Erro ao salvar os dados. Tente novamente.');
        }
    });
    
    addTipoIndiceBtn.addEventListener('click', adicionarNovoTipo);
    deleteTipoBtn.addEventListener('click', excluirTipoAtual);
    
    tipoIndiceSelect.addEventListener('change', function() {
        indiceAtual = this.value;
        carregarTabela();
    });
    
    importBtn.addEventListener('click', function() {
        const excelData = prompt('Cole aqui os dados copiados do Excel (formato: Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez)');
        if (!excelData) return;
        
        try {
            const lines = excelData.split('\n');
            const newData = {};
            
            // Pula o cabeçalho se existir
            const startLine = lines[0].startsWith('Ano') ? 1 : 0;
            
            for (let i = startLine; i < lines.length; i++) {
                const cells = lines[i].split(';');
                if (cells.length >= 13) {
                    const year = cells[0].trim();
                    newData[year] = {};
                    
                    for (let month = 1; month <= 12; month++) {
                        const value = parseFloat(cells[month].replace(',', '.'));
                        newData[year][month] = isNaN(value) ? 0 : value;
                    }
                }
            }
            
            // Atualiza a tabela com os novos dados
            ipcaIndices[indiceAtual] = newData;
            limparTabela();
            carregarTabela();
            window.hasUnsavedChanges = true;
            alert('Dados importados com sucesso!');
        } catch (e) {
            alert('Erro ao importar dados. Verifique o formato e tente novamente.');
            console.error(e);
        }
    });
    
    exportBtn.addEventListener('click', function() {
        let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
        
        document.querySelectorAll('#table-body tr').forEach(row => {
            const rowData = [row.cells[0].textContent];
            for (let i = 1; i <= 12; i++) {
                rowData.push(row.cells[i].textContent);
            }
            csvContent += rowData.join(';') + "\n";
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `indices_${indiceAtual}.csv`;
        link.click();
    });

    // Inicializar
    atualizarSelectTipos();
    carregarTabela();
    
    // Ouvinte para eventos de confirmação
    window.addEventListener('show-confirmation', function(e) {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmAction = document.getElementById('confirm-action');
        
        confirmMessage.textContent = e.detail.message;
        confirmAction.onclick = function() {
            e.detail.callback();
            confirmModal.style.display = 'none';
        };
        
        confirmModal.style.display = 'block';
    });
});