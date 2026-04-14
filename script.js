const initialGifts = [
    { id: 1, name: 'Geladeira', category: 'Eletrodomésticos', status: 'Pendente' },
    { id: 2, name: 'Máquina de lavar', category: 'Eletrodomésticos', status: 'Pendente' },
    { id: 3, name: 'Cooktop', category: 'Eletrodomésticos', status: 'Pendente' },
    { id: 4, name: 'Forno Consul a gás', category: 'Eletrodomésticos', status: 'Pendente' },
    { id: 5, name: 'Airfryer', category: 'Eletroportáteis', status: 'Pendente' },
    { id: 6, name: 'Cama baú', category: 'Móveis', status: 'Pendente' },
    { id: 7, name: 'Sofá', category: 'Móveis', status: 'Pendente' },
    { id: 8, name: 'Sanduicheira', category: 'Eletroportáteis', status: 'Pendente' },
    { id: 9, name: 'Televisão', category: 'Eletrodomésticos', status: 'Pendente' },
    { id: 10, name: 'Ventilador', category: 'Eletroportáteis', status: 'Pendente' }
];

let gifts = [...initialGifts];

const giftsGrid = document.getElementById('gifts-grid');
const filterCategory = document.getElementById('filter-category');

function renderGifts(filter = 'all') {
    giftsGrid.innerHTML = '';

    const filteredGifts = gifts.filter(gift =>
        filter === 'all' ? true : gift.category === filter
    );

    filteredGifts.forEach(gift => {
        const card = document.createElement('div');
        card.className = 'gift-card glass-panel';

        card.innerHTML = `
            <div class="gift-card-header">
                <span class="gift-category">${gift.category}</span>
                <span class="gift-priority priority-${gift.priority}">${gift.priority}</span>
            </div>
            <h3 class="gift-name">${gift.name}</h3>
            <div class="gift-status status-${gift.status.toLowerCase()}">
                ${gift.status === 'Pendente' ? '⏳' : '✅'} ${gift.status}
            </div>
            <div class="gift-footer">
                <button class="btn-presentear" onclick="marcarPresente(${gift.id})">
                    ${gift.status === 'Pendente' ? 'Quero Presentear' : 'Já Recebido'}
                </button>
            </div>
        `;

        giftsGrid.appendChild(card);
    });
}

function marcarPresente(id) {
    const giftIndex = gifts.findIndex(g => g.id === id);
    if (giftIndex > -1) {
        if (gifts[giftIndex].status === 'Pendente') {
            const confirmar = confirm(`Deseja confirmar que irá presentear o item: ${gifts[giftIndex].name}?`);
            if (confirmar) {
                gifts[giftIndex].status = 'Recebido';
                renderGifts(filterCategory.value);
                alert("Obrigado pelo seu presente! Por favor, informe seus dados aos noivos ou adicione no painel de convidados.");
            }
        } else {
            alert('Este item já foi recebido/escolhido por outro convidado.');
        }
    }
}

// Event Listeners
filterCategory.addEventListener('change', (e) => {
    renderGifts(e.target.value);
});

document.getElementById('btn-add').addEventListener('click', () => {
    const name = prompt('Nome do novo presente:');
    if (!name) return;

    const category = prompt('Categoria (ex: Móveis, Eletrodomésticos):') || 'Outros';
    const priority = prompt('Prioridade (Alta, Média, Baixa):') || 'Média';

    const newGift = {
        id: Date.now(),
        name,
        category,
        priority,
        status: 'Pendente'
    };

    gifts.push(newGift);
    renderGifts(filterCategory.value);
});

// Init
renderGifts();
