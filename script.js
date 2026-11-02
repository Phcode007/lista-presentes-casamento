const API_URL = 'http://localhost:3000';
const ADMIN_TOKEN_KEY = 'lista-presentes-admin-token';
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
let gifts = [];
let editingGiftId = null;
let presentingGiftId = null;
let isAdmin = false;

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

function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    isAdmin = false;
    document.getElementById('btn-add').hidden = true;
    renderGifts(filterCategory.value);
}

async function apiRequest(path, { method = 'GET', body, admin = false, headers: extraHeaders = {} } = {}) {
    const headers = { Accept: 'application/json', ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (admin) {
        const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    let payload = null;
    if (response.status !== 204) {
        try {
            payload = await response.json();
        } catch {
            throw new Error('A API retornou uma resposta inválida.');
        }
    }

    if (!response.ok) {
        const error = new Error(payload?.error || `A API respondeu com erro (${response.status}).`);
        error.status = response.status;
        if (response.status === 401) clearAdminSession();
        throw error;
    }
    return payload;
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
        if (gift.brand) appendText(card, 'p', 'gift-brand', gift.brand);

        if (gift.price !== '' && gift.price != null) {
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

        if (gift.pixKey) {
            appendText(card, 'p', 'gift-pix-key', `Chave Pix: ${gift.pixKey}`);
            const copyButton = appendText(card, 'button', 'btn btn-secondary', 'Copiar chave');
            copyButton.type = 'button';
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(gift.pixKey);
                    copyButton.textContent = 'Copiado!';
                } catch {
                    showMessage('Não foi possível copiar a chave Pix neste navegador.', true);
                }
            });
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
            if (received) {
                const releaseButton = appendText(adminActions, 'button', 'btn btn-secondary', 'Desmarcar presente');
                releaseButton.type = 'button';
                releaseButton.addEventListener('click', () => releaseGift(gift.id));
            }
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

async function loadGifts({ propagateError = false } = {}) {
    giftsGrid.replaceChildren();
    appendText(giftsGrid, 'p', 'empty-state', 'Carregando...');
    try {
        const result = await apiRequest('/api/gifts');
        if (!Array.isArray(result)) throw new Error('A API retornou uma lista de presentes inválida.');
        gifts = result;
        renderGifts(filterCategory.value);
    } catch (error) {
        gifts = [];
        giftsGrid.replaceChildren();
        appendText(giftsGrid, 'p', 'empty-state', 'Não foi possível carregar a lista. Tente novamente em instantes.');
        showMessage(error.message, true);
        if (propagateError) throw error;
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
        giftForm.elements.price.value = gift.price ?? '';
        giftForm.elements.brand.value = gift.brand || '';
        giftForm.elements.link.value = gift.link || '';
        giftForm.elements.pixKey.value = gift.pixKey || '';
        giftForm.elements.reusable.checked = gift.reusable === true;
    }

    giftModal.showModal();
    document.getElementById('gift-name').focus();
}

function openPresentModal(giftId) {
    const gift = gifts.find(item => item.id === giftId);
    if (!gift || gift.status !== 'Pendente') {
        showMessage('Este item já foi presenteado por outra pessoa', true);
        return;
    }
    presentingGiftId = giftId;
    presentForm.reset();
    document.getElementById('present-form-error').textContent = '';
    presentModal.showModal();
    document.getElementById('guest-name').focus();
}

async function removeGift(giftId) {
    const gift = gifts.find(item => item.id === giftId);
    if (!gift || !isAdmin || !window.confirm(`Remover "${gift.name}" da lista?`)) return;
    try {
        await apiRequest(`/api/gifts/${giftId}`, { method: 'DELETE', admin: true });
        await loadGifts({ propagateError: true });
        showMessage('Item removido.');
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function releaseGift(giftId) {
    try {
        await apiRequest(`/api/gifts/${giftId}/release`, { method: 'POST', admin: true });
        await loadGifts({ propagateError: true });
        showMessage('Presente desmarcado.');
    } catch (error) {
        showMessage(error.message, true);
    }
}

function openAdminAccess(errorMessage = '') {
    document.getElementById('admin-form-error').textContent = errorMessage;
    adminForm.reset();
    adminModal.showModal();
    document.getElementById('admin-token').focus();
}

document.getElementById('btn-add').addEventListener('click', () => openGiftModal());
filterCategory.addEventListener('change', event => renderGifts(event.target.value));

giftForm.addEventListener('submit', async event => {
    event.preventDefault();
    const errorElement = document.getElementById('gift-form-error');
    const formData = new FormData(giftForm);
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || '');
    const priority = String(formData.get('priority') || '');
    const priceValue = String(formData.get('price') || '').trim();
    const brand = String(formData.get('brand') || '').trim();
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

    const giftData = {
        name,
        category,
        priority,
        price: priceValue,
        brand,
        link,
        pixKey: String(formData.get('pixKey') || '').trim(),
        reusable: formData.get('reusable') === 'on'
    };

    try {
        if (editingGiftId === null) {
            await apiRequest('/api/gifts', { method: 'POST', body: giftData, admin: true });
        } else {
            await apiRequest(`/api/gifts/${editingGiftId}`, { method: 'PUT', body: giftData, admin: true });
        }
        giftModal.close();
        await loadGifts({ propagateError: true });
        showMessage(editingGiftId === null ? 'Item adicionado.' : 'Item atualizado.');
    } catch (error) {
        errorElement.textContent = error.message;
    }
});

presentForm.addEventListener('submit', async event => {
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

    try {
        await apiRequest(`/api/gifts/${presentingGiftId}/reserve`, {
            method: 'POST',
            body: { guestName, message }
        });
        presentModal.close();
        await loadGifts({ propagateError: true });
        showMessage(gift.reusable ? 'Agradecemos muito pela sua contribuição!' : 'Presente confirmado. Muito obrigado!');
    } catch (error) {
        if (error.status === 409) {
            presentModal.close();
            try {
                await loadGifts({ propagateError: true });
            } catch (reloadError) {
                errorElement.textContent = reloadError.message;
                return;
            }
            showMessage('Este item já foi presenteado por outra pessoa', true);
            return;
        }
        errorElement.textContent = error.message;
    }
});

adminForm.addEventListener('submit', async event => {
    event.preventDefault();
    const errorElement = document.getElementById('admin-form-error');
    const token = String(new FormData(adminForm).get('token') || '').trim();
    if (!token) {
        errorElement.textContent = 'Informe o token de administrador.';
        return;
    }

    try {
        await apiRequest('/api/admin/check', {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        errorElement.textContent = error.message;
        return;
    }

    try {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        isAdmin = true;
        document.getElementById('btn-add').hidden = false;
        adminModal.close();
        await loadGifts({ propagateError: true });
        showMessage('Modo administrador ativo neste acesso.');
    } catch (error) {
        errorElement.textContent = `Não foi possível guardar o token nesta sessão: ${error.message}`;
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

async function initialize() {
    await loadGifts();
    if (!adminModeRequested) return;

    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
        openAdminAccess();
        return;
    }

    try {
        await apiRequest('/api/admin/check', { admin: true });
        isAdmin = true;
        document.getElementById('btn-add').hidden = false;
        renderGifts(filterCategory.value);
        showMessage('Modo administrador ativo neste acesso.');
    } catch (error) {
        openAdminAccess(error.message);
    }
}

initialize();
