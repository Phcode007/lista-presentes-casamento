const initialGifts = [
    { id: 1, name: 'Geladeira', category: 'Eletrodomésticos', status: 'Pendente', priority: 'Alta', marca: 'Consul', link: '' },
    { id: 2, name: 'Máquina de lavar', category: 'Eletrodomésticos', status: 'Pendente', priority: 'Alta', marca: 'Whirlpool', link: '' },
    { id: 3, name: 'Fogão', category: 'Eletrodomésticos', status: 'Recebido', priority: 'Alta', marca: 'Consul', link: 'https://www.mercadolivre.com.br/fogo-cooktop-com-alimentaco-gas-consul-cd060be-cor-preto-4-queimadores/p/MLB56981705#polycard_client=search-desktop&search_layout=grid&position=1&type=product&tracking_id=26c0027c-1d28-43ae-aa78-b0fc6f560aba&wid=MLB5834699426&sid=search' },
    { id: 4, name: 'Cama', category: 'Eletrodomésticos', status: 'Pendente', priority: 'Média', marca: 'Consul', link: 'https://www.mercadolivre.com.br/forno-embutir-eletrico-consul-47l-funco-gratinar-cob47be-preto/p/MLB47712152#polycard_client=search-desktop&search_layout=grid&position=11&type=product&tracking_id=e5dd73cf-ddd9-4b39-a1fd-d1d2c0878dfb&wid=MLB5405008730&sid=search' },
    { id: 5, name: 'Airfryer', category: 'Eletroportáteis', status: 'Pendente', priority: 'Média', marca: 'Mondial', link: '' },
    { id: 6, name: 'Cama baú', category: 'Móveis', status: 'Pendente', priority: 'Alta', link: '' },
    { id: 7, name: 'Sofá', category: 'Móveis', status: 'Pendente', priority: 'Média', link: '' },
    { id: 8, name: 'Sanduicheira', category: 'Eletroportáteis', status: 'Pendente', priority: 'Baixa', marca: 'LG', link: 'https://www.mercadolivre.com.br/smart-tv-lg-43full-hd-processador-a5-ger6-ai-alexa-e-webos-23-43lr6700psa/p/MLB39205913#polycard_client=search-desktop&search_layout=grid&position=11&type=product&tracking_id=ded7b125-56ff-4260-840b-1e69d31ea40e&wid=MLB3845242735&sid=search' },
    { id: 9, name: 'Televisão', category: 'Eletrodomésticos', status: 'Pendente', priority: 'Média', link: '' },
    { id: 10, name: 'Ventilador', category: 'Eletroportáteis', status: 'Pendente', priority: 'Baixa', link: '' },
    { id: 11, name: 'Ferro de passar', category: 'Eletroportáteis', status: 'Pendente', priority: 'Baixa', link: 'https://www.mercadolivre.com.br/ferro-de-passar-roupa-black-decker-vfa1110tm2-com-base-de-aluminio/p/MLB15553602#polycard_client=search-desktop&search_layout=grid&position=8&type=product&tracking_id=46eb2376-c9cb-41bb-9ff2-cd8c8f5f0f74&wid=MLB3632374989&sid=search' },
    { id: 12, name: 'Jogo de toalhas', category: 'Roupas', status: 'Recebido', priority: 'Média', link: '' },
    { id: 13, name: 'Micro-ondas', category: 'Eletrodomésticos', status: 'Recebido', priority: 'Alta', link: '' },
    { id: 14, name: 'Aspirador de pó', category: 'Eletroportáteis', status: 'Pendente', priority: 'Média', link: '' },
    { id: 15, name: 'Jogo de panelas', category: 'Utensílios', status: 'Recebido', priority: 'Média', marca: 'Brinox', link: 'https://www.mercadolivre.com.br/jogo-de-panelas-smart-plus-vanilla-induco-cermico-5pecas-brinox-4774101/p/MLB32675228#polycard_client=search-desktop&search_layout=grid&position=7&type=product&tracking_id=0c44dbd8-e0df-4d71-82af-bda6e4e40068&wid=MLB3624589987&sid=search' },
    { id: 16, name: 'Pix', category: 'Contribuição', status: 'Pendente', priority: 'Alta', chave: '97b53aa3-239d-44af-b38e-ade7d94b7697', link: '' }
];

const STORAGE_KEY = 'lista-presentes-gifts';
const ADMIN_PASSWORD_KEY = 'lista-presentes-admin-password-hash';
const categories = ['Eletrodomésticos', 'Móveis', 'Eletroportáteis', 'Roupas', 'Utensílios', 'Contribuição', 'Outros'];
const giftsGrid = document.getElementById('gifts-grid');
const filterCategory = document.getElementById('filter-category');
const appMessage = document.getElementById('app-message');
const giftModal = document.getElementById('gift-modal');
const presentModal = document.getElementById('present-modal');
const adminModal = document.getElementById('admin-modal');
const giftForm = document.getElementById('gift-form');
const presentForm = document.getElementById('present-form');
const adminForm = document.getElementById('admin-form');
const adminModeRequested = new URLSearchParams(window.location.search).has('admin');
let gifts = loadGifts();
let editingGiftId = null;
let presentingGiftId = null;
let settingAdminPassword = false;
let isAdmin = false;

function normalizeGift(gift, index) {
    const status = gift.status === 'Recebido' || gift.status === 'Já presenteado' ? 'Recebido' : 'Pendente';
    const priority = ['Alta', 'Média', 'Baixa'].includes(gift.priority) ? gift.priority : 'Média';

    return {
        ...gift,
        id: Number.isFinite(Number(gift.id)) ? Number(gift.id) : Date.now() + index,
        name: typeof gift.name === 'string' ? gift.name : 'Item sem nome',
        category: typeof gift.category === 'string' && gift.category ? gift.category : 'Outros',
        priority,
        status,
        price: gift.price === '' || gift.price == null ? '' : String(gift.price),
        link: typeof gift.link === 'string' ? gift.link : '',
        reservedBy: typeof gift.reservedBy === 'string' ? gift.reservedBy : '',
        message: typeof gift.message === 'string' ? gift.message : ''
    };
}

function loadGifts() {
    try {
        const savedGifts = localStorage.getItem(STORAGE_KEY);
        if (savedGifts === null) return initialGifts.map(normalizeGift);

        const parsedGifts = JSON.parse(savedGifts);
        if (!Array.isArray(parsedGifts)) throw new Error('O conteúdo salvo não é uma lista.');
        return parsedGifts.map(normalizeGift);
    } catch (error) {
        showMessage(`Não foi possível carregar a lista salva: ${error.message}`, true);
        return initialGifts.map(normalizeGift);
    }
}

function saveGifts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
        showMessage('');
        return true;
    } catch (error) {
        showMessage(`Não foi possível salvar as alterações neste navegador: ${error.message}`, true);
        return false;
    }
}

function showMessage(message, isError = false) {
    appMessage.textContent = message;
    appMessage.classList.toggle('is-error', isError);
}

function appendText(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
}

function renderGifts(filter = 'all') {
    giftsGrid.replaceChildren();

    const filteredGifts = gifts.filter(gift => filter === 'all' || gift.category === filter);
    filteredGifts.forEach(gift => {
        const card = document.createElement('article');
        card.className = 'gift-card glass-panel';

        const header = document.createElement('div');
        header.className = 'gift-card-header';
        appendText(header, 'span', 'gift-category', gift.category);
        appendText(header, 'span', `gift-priority priority-${gift.priority}`, gift.priority);
        card.appendChild(header);

        appendText(card, 'h3', 'gift-name', gift.name);
        if (gift.price !== '') {
            const price = Number(gift.price);
            if (Number.isFinite(price)) {
                appendText(card, 'p', 'gift-price', price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            }
        }

        if (gift.link && isSafeProductLink(gift.link)) {
            const link = appendText(card, 'a', 'gift-link', 'Ver produto');
            link.href = gift.link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }

        const received = gift.status === 'Recebido';
        const status = document.createElement('div');
        status.className = `gift-status status-${received ? 'recebido' : 'pendente'}`;
        status.textContent = `${received ? '✅' : '⏳'} ${received ? 'Presenteado' : 'Pendente'}`;
        card.appendChild(status);

        if (received && gift.reservedBy) {
            appendText(card, 'p', 'gift-reserved-by', `Presenteado por ${gift.reservedBy}`);
        }
        if (received && gift.message) {
            appendText(card, 'p', 'gift-message', gift.message);
        }

        const footer = document.createElement('div');
        footer.className = 'gift-footer';

        if (!received) {
            const presentButton = appendText(footer, 'button', 'btn-presentear', 'Quero Presentear');
            presentButton.type = 'button';
            presentButton.addEventListener('click', () => openPresentModal(gift.id));
        }

        if (isAdmin) {
            const adminActions = document.createElement('div');
            adminActions.className = 'gift-admin-actions';
            const editButton = appendText(adminActions, 'button', 'btn btn-secondary', 'Editar');
            editButton.type = 'button';
            editButton.addEventListener('click', () => openGiftModal(gift.id));
            const removeButton = appendText(adminActions, 'button', 'btn btn-danger', 'Remover');
            removeButton.type = 'button';
            removeButton.addEventListener('click', () => removeGift(gift.id));
            footer.appendChild(adminActions);
        }

        card.appendChild(footer);
        giftsGrid.appendChild(card);
    });

    if (filteredGifts.length === 0) {
        appendText(giftsGrid, 'p', 'empty-state', 'Nenhum item encontrado nesta categoria.');
    }
}

function isSafeProductLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

function openGiftModal(giftId = null) {
    editingGiftId = giftId;
    giftForm.reset();
    document.getElementById('gift-form-error').textContent = '';
    document.getElementById('gift-modal-title').textContent = giftId === null ? 'Adicionar item' : 'Editar item';

    if (giftId !== null) {
        const gift = gifts.find(item => item.id === giftId);
        if (!gift) return;
        giftForm.elements.name.value = gift.name;
        giftForm.elements.category.value = categories.includes(gift.category) ? gift.category : 'Outros';
        giftForm.elements.priority.value = gift.priority;
        giftForm.elements.price.value = gift.price;
        giftForm.elements.link.value = gift.link;
    }

    giftModal.showModal();
    document.getElementById('gift-name').focus();
}

function openPresentModal(giftId) {
    const gift = gifts.find(item => item.id === giftId);
    if (!gift || gift.status !== 'Pendente') {
        showMessage('Este item já foi presenteado por outra pessoa.', true);
        return;
    }
    presentingGiftId = giftId;
    presentForm.reset();
    document.getElementById('present-form-error').textContent = '';
    presentModal.showModal();
    document.getElementById('guest-name').focus();
}

function removeGift(giftId) {
    const gift = gifts.find(item => item.id === giftId);
    if (!gift || !isAdmin) return;
    if (!window.confirm(`Remover "${gift.name}" da lista?`)) return;
    gifts = gifts.filter(item => item.id !== giftId);
    saveGifts();
    renderGifts(filterCategory.value);
}

function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') {
        throw new Error('Este navegador não oferece suporte à proteção de senha necessária. Abra a página em HTTPS ou localhost.');
    }
    const key = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const hash = await window.crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: Uint8Array.from(salt.match(/.{2}/g), byte => parseInt(byte, 16)),
        iterations: 150000,
        hash: 'SHA-256'
    }, key, 256);
    return bytesToHex(hash);
}

async function openAdminAccess() {
    let passwordHash;
    try {
        passwordHash = localStorage.getItem(ADMIN_PASSWORD_KEY);
    } catch (error) {
        showMessage(`Não foi possível acessar o armazenamento do navegador: ${error.message}`, true);
        return;
    }

    settingAdminPassword = passwordHash === null;
    document.getElementById('admin-modal-title').textContent = settingAdminPassword ? 'Criar senha de administrador' : 'Acesso administrador';
    document.getElementById('admin-modal-description').textContent = settingAdminPassword
        ? 'Defina uma senha com pelo menos 8 caracteres. Ela será salva neste navegador.'
        : 'Informe a senha configurada neste navegador.';
    document.getElementById('admin-password').autocomplete = settingAdminPassword ? 'new-password' : 'current-password';
    document.getElementById('admin-confirm-group').hidden = !settingAdminPassword;
    document.getElementById('admin-password-confirm').required = settingAdminPassword;
    document.getElementById('admin-submit').textContent = settingAdminPassword ? 'Criar senha e entrar' : 'Entrar';
    document.getElementById('admin-form-error').textContent = '';
    adminForm.reset();
    adminModal.showModal();
    document.getElementById('admin-password').focus();
}

document.getElementById('btn-add').addEventListener('click', () => openGiftModal());
filterCategory.addEventListener('change', event => renderGifts(event.target.value));

giftForm.addEventListener('submit', event => {
    event.preventDefault();
    const errorElement = document.getElementById('gift-form-error');
    const formData = new FormData(giftForm);
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || '');
    const priority = String(formData.get('priority') || '');
    const priceValue = String(formData.get('price') || '').trim();
    const link = String(formData.get('link') || '').trim();

    if (!name || !category || !priority) {
        errorElement.textContent = 'Preencha nome, categoria e prioridade.';
        return;
    }
    if (priceValue && (!Number.isFinite(Number(priceValue)) || Number(priceValue) < 0)) {
        errorElement.textContent = 'Informe um preço válido maior ou igual a zero.';
        return;
    }
    if (link && !isSafeProductLink(link)) {
        errorElement.textContent = 'O link precisa começar com http:// ou https://.';
        return;
    }

    const existingGift = editingGiftId === null ? null : gifts.find(gift => gift.id === editingGiftId);
    const updatedGift = {
        ...(existingGift || {}),
        id: existingGift ? existingGift.id : Date.now(),
        name,
        category,
        priority,
        price: priceValue,
        link,
        status: existingGift ? existingGift.status : 'Pendente'
    };

    gifts = existingGift
        ? gifts.map(gift => gift.id === editingGiftId ? updatedGift : gift)
        : [...gifts, updatedGift];
    saveGifts();
    giftModal.close();
    renderGifts(filterCategory.value);
});

presentForm.addEventListener('submit', event => {
    event.preventDefault();
    const errorElement = document.getElementById('present-form-error');
    const guestName = String(new FormData(presentForm).get('guestName') || '').trim();
    const message = String(new FormData(presentForm).get('message') || '').trim();
    const gift = gifts.find(item => item.id === presentingGiftId);

    if (!guestName) {
        errorElement.textContent = 'Informe seu nome para confirmar o presente.';
        return;
    }
    if (!gift || gift.status !== 'Pendente') {
        errorElement.textContent = 'Este item não está mais disponível.';
        return;
    }

    gifts = gifts.map(item => item.id === presentingGiftId
        ? { ...item, status: 'Recebido', reservedBy: guestName, message }
        : item);
    saveGifts();
    presentModal.close();
    renderGifts(filterCategory.value);
});

adminForm.addEventListener('submit', async event => {
    event.preventDefault();
    const errorElement = document.getElementById('admin-form-error');
    const password = String(new FormData(adminForm).get('password') || '');
    const passwordConfirm = String(new FormData(adminForm).get('passwordConfirm') || '');

    try {
        if (settingAdminPassword) {
            if (password.length < 8) {
                errorElement.textContent = 'A senha deve ter pelo menos 8 caracteres.';
                return;
            }
            if (password !== passwordConfirm) {
                errorElement.textContent = 'As senhas não correspondem.';
                return;
            }
            const salt = bytesToHex(window.crypto.getRandomValues(new Uint8Array(16)));
            const passwordHash = await hashPassword(password, salt);
            localStorage.setItem(ADMIN_PASSWORD_KEY, `${salt}:${passwordHash}`);
        } else {
            const savedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || '';
            const [salt, savedHash] = savedPassword.split(':');
            if (!salt || !savedHash || await hashPassword(password, salt) !== savedHash) {
                errorElement.textContent = 'Senha incorreta.';
                return;
            }
        }

        isAdmin = true;
        document.getElementById('btn-add').hidden = false;
        adminModal.close();
        renderGifts(filterCategory.value);
        showMessage('Modo administrador ativo neste acesso.');
    } catch (error) {
        errorElement.textContent = `Não foi possível validar ou salvar a senha: ${error.message}`;
    }
});

document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
});

document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
});

renderGifts();
if (adminModeRequested) openAdminAccess();
