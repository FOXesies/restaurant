// ССЫЛКИ НА HTML ЭЛЕМЕНТЫ ФОРМЫ И МЕНЮ
const form = document.getElementById('addDishForm');
const container = document.getElementById('adminMenuContainer');
const dishNameInput = document.getElementById('dishNameInput');
const charCounter = document.getElementById('charCounter');

const formTitle = document.getElementById('formTitle');
const createNewBtn = document.getElementById('createNewBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const dishIdInput = document.getElementById('dishIdInput');

const mainImgInput = form ? form.querySelector('input[name="img"]') : null;
const mainImgLabel = document.getElementById('mainImgLabel');
const mainPhotoManager = document.getElementById('mainPhotoManager');
const galleryManager = document.getElementById('galleryManager');

// ГЛОБАЛЬНЫЕ ДАННЫЕ В ПАМЯТИ ФРОНТЕНДА
let globalMenuData = [];
let globalReservationsData = [];

// СОСТОЯНИЕ КАРТИНОК РЕДАКТИРУЕМОГО БЛЮДА
let currentServerMainImg = '';
let currentServerGallery = [];

/* ─────────────────────────────────────────────────────────
   1. ЛОГИКА ТАБОВ И ИНТЕРФЕЙСА
   ───────────────────────────────────────────────────────── */

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
                           .find(btn => btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'reservations-tab') {
        loadReservations();
    }
}

// Живой счётчик букв в названии блюда
if (dishNameInput) {
    dishNameInput.addEventListener('input', () => {
        const length = dishNameInput.value.length;
        if (!charCounter) return;
        charCounter.textContent = `${length} / 50 символов`;
        charCounter.style.color = length >= 50 ? '#ff4d4d' : length >= 40 ? '#e2ba43' : '#888';
    });
}

/* ─────────────────────────────────────────────────────────
   2. УПРАВЛЕНИЕ РАЗДЕЛОМ МЕНЮ (БЛЮДА)
   ───────────────────────────────────────────────────────── */

// Загрузка блюд с сервера
async function loadAdminMenu() {
    if (!container) return;
    try {
        const res = await fetch('/api/menu');
        globalMenuData = await res.json();
        container.innerHTML = globalMenuData.map(item => `
            <div class="dish-item">
                <div>
                    <strong>[${item.category}] ${item.name}</strong> — ${item.price}
                </div>
                <div class="action-btns">
                    <button class="edit-btn" onclick="startEditDish(${item.id})">Редактировать</button>
                    <button class="delete-btn" onclick="deleteDish(${item.id})">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Ошибка загрузки меню:', err);
    }
}

// Отображение менеджера фотографий при редактировании
function renderPhotoManagers() {
    if (!mainPhotoManager || !galleryManager || !mainImgInput) return;

    if (currentServerMainImg) {
        mainPhotoManager.innerHTML = `
            <div class="photo-card">
                <img src="${currentServerMainImg}">
                <button type="button" class="remove-badge" onclick="deleteMainPhotoState()">✕</button>
            </div>
        `;
        mainPhotoManager.style.display = 'flex';
        mainImgInput.removeAttribute('required');
        if (mainImgLabel) mainImgLabel.textContent = 'Заменить главное превью (необязательно):';
    } else {
        mainPhotoManager.style.display = 'none';
        mainPhotoManager.innerHTML = '';
        mainImgInput.setAttribute('required', '');
        if (mainImgLabel) mainImgLabel.textContent = 'Главное превью (1 photo) *Обязательно*:';
    }

    if (currentServerGallery.length > 0) {
        galleryManager.innerHTML = currentServerGallery.map((url, idx) => `
            <div class="photo-card">
                <img src="${url}">
                <button type="button" class="remove-badge" onclick="deleteGalleryPhotoState(${idx})">✕</button>
            </div>
        `).join('');
        galleryManager.style.display = 'flex';
    } else {
        galleryManager.style.display = 'none';
        galleryManager.innerHTML = '';
    }
}

function deleteMainPhotoState() {
    currentServerMainImg = '';
    renderPhotoManagers();
}

function deleteGalleryPhotoState(index) {
    currentServerGallery.splice(index, 1);
    renderPhotoManagers();
}

// Включение режима редактирования блюда
function startEditDish(id) {
    const dish = globalMenuData.find(item => Number(item.id) === Number(id));
    if (!dish || !form) return;

    if (formTitle) formTitle.textContent = 'Редактировать блюдо';
    if (createNewBtn) createNewBtn.style.display = 'inline-block';
    if (submitBtn) submitBtn.textContent = 'Сохранить изменения';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
    if (dishIdInput) dishIdInput.value = dish.id;

    currentServerMainImg = dish.img || '';
    currentServerGallery = dish.gallery ? [...dish.gallery] : [];
    renderPhotoManagers();

    form.querySelector('select[name="category"]').value = dish.category;
    dishNameInput.value = dish.name;
    form.querySelector('input[name="price"]').value = parseInt(dish.price) || '';
    form.querySelector('input[name="weight"]').value = parseInt(dish.weight) || '';
    form.querySelector('input[name="calories"]').value = parseInt(dish.calories) || '';
    form.querySelector('textarea[name="desc"]').value = dish.desc;

    if (charCounter) charCounter.textContent = `${dish.name.length} / 50 символов`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Очистка формы и сброс состояния к режиму создания
function resetFormMode() {
    if (!form) return;
    form.reset();
    if (formTitle) formTitle.textContent = 'Добавить новое блюдо';
    if (createNewBtn) createNewBtn.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Сохранить блюдо в меню';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    if (dishIdInput) dishIdInput.value = '';
    
    currentServerMainImg = '';
    currentServerGallery = [];
    if (mainPhotoManager) mainPhotoManager.style.display = 'none';
    if (galleryManager) galleryManager.style.display = 'none';
    
    if (mainImgInput) {
        mainImgInput.setAttribute('required', '');
        if (mainImgLabel) mainImgLabel.textContent = 'Главное превью (1 фото)';
    }
    
    if (charCounter) {
        charCounter.textContent = '0 / 50 символов';
        charCounter.style.color = '#888';
    }
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetFormMode);
if (createNewBtn) createNewBtn.addEventListener('click', resetFormMode);

// Отправка данных формы блюда (POST/PUT)
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = dishNameInput.value.trim();
        const price = form.querySelector('input[name="price"]').value;
        const weight = form.querySelector('input[name="weight"]').value;
        const calories = form.querySelector('input[name="calories"]').value;

        if (!name || name.length > 50) return alert('Ошибка в названии!');
        if (!price || isNaN(price) || Number(price) <= 0) return alert('Укажите корректную цену!');
        if (!weight || isNaN(weight) || Number(weight) <= 0) return alert('Укажите корректный вес!');
        if (!calories || isNaN(calories) || Number(calories) < 0) return alert('Укажите корректные калории!');

        const editId = dishIdInput ? dishIdInput.value : '';
        const formData = new FormData();

        // Передаем информацию по старым картинкам бэкенду
        if (editId) {
            formData.append('keptMainImg', currentServerMainImg);
            formData.append('keptGallery', JSON.stringify(currentServerGallery));
        }

        const internalFields = new FormData(form);
        internalFields.forEach((value, key) => {
            if (key !== 'keptMainImg' && key !== 'keptGallery') {
                formData.append(key, value);
            }
        });

        const url = editId ? `/api/menu/${editId}` : '/api/menu';
        const method = editId ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, { method: method, body: formData });
            if (res.ok) {
                alert(editId ? 'Блюдо успешно обновлено!' : 'Блюдо успешно добавлено!');
                resetFormMode();
                loadAdminMenu();
            } else {
                const errorData = await res.json();
                alert(`Ошибка сервера: ${errorData.error || 'Не удалось сохранить'}`);
            }
        } catch (err) {
            alert('Произошла сетевая ошибка.');
        }
    });
}

// Удаление блюда
async function deleteDish(id) {
    if (!confirm('Удалить это блюдо?')) return;
    try {
        const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
        if (res.ok) loadAdminMenu();
        else alert('Ошибка при удалении');
    } catch (err) {
        alert('Ошибка сети');
    }
}

/* ─────────────────────────────────────────────────────────
   3. УПРАВЛЕНИЕ ЗАЯВКАМИ НА БРОНИРОВАНИЕ
   ───────────────────────────────────────────────────────── */

async function loadReservations() {
    const resContainer = document.getElementById('adminReservationsContainer');
    if (!resContainer) return;
    try {
        const res = await fetch('/api/reservations');
        globalReservationsData = await res.json();
        applyReservationsFilters();
    } catch (err) {
        resContainer.innerHTML = '<p style="color: #ff4d4d;">Ошибка загрузки бронирований</p>';
    }
}

function applyReservationsFilters() {
    const resContainer = document.getElementById('adminReservationsContainer');
    if (!resContainer) return;
    
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'all';
    const dateFilter = document.getElementById('filterDate') ? document.getElementById('filterDate').value : '';
    const sortOrder = document.getElementById('filterSort') ? document.getElementById('filterSort').value : 'asc';

    let filtered = globalReservationsData.filter(booking => {
        const matchStatus = (statusFilter === 'all' || booking.status === statusFilter);
        const matchDate = (!dateFilter || booking.date === dateFilter);
        return matchStatus && matchDate;
    });

    filtered.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return sortOrder === 'asc' ? dateTimeA - dateTimeB : dateTimeB - dateTimeA;
    });

    if (filtered.length === 0) {
        resContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Заявок с такими фильтрами не найдено.</p>';
        return;
    }

    resContainer.innerHTML = filtered.map(booking => {
        const statusClasses = {
            'ожидает ответа': 'status-pending',
            'завершена': 'status-completed',
            'отменена': 'status-cancelled',
            'просрочена': 'status-expired'
        };
        const currentClass = statusClasses[booking.status] || '';

        return `
            <div class="res-item ${currentClass}">
                <div class="res-info">
                    <h3>${booking.name} (Стол на ${booking.guests} чел.)</h3>
                    <p><strong>Телефон:</strong> ${booking.phone}</p>
                    ${booking.comment ? `<p><strong>Комментарий:</strong> <em>${booking.comment}</em></p>` : ''}
                    <div class="res-meta">
                        <span>📅 ${booking.date}</span>
                        <span>⏰ ${booking.time}</span>
                    </div>
                </div>
                <div>
                    <select class="status-select" onchange="updateReservationStatus(${booking.id}, this.value)">
                        <option value="ожидает ответа" ${booking.status === 'ожидает ответа' ? 'selected' : ''}>⏳ Ожидает ответа</option>
                        <option value="завершена" ${booking.status === 'завершена' ? 'selected' : ''}>✅ Завершена</option>
                        <option value="отменена" ${booking.status === 'отменена' ? 'selected' : ''}>❌ Отменена</option>
                        <option value="просрочена" ${booking.status === 'просрочена' ? 'selected' : ''} disabled>💀 Просрочена</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function clearFilterDate() {
    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.value = '';
        applyReservationsFilters();
    }
}

async function updateReservationStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/reservations/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            const target = globalReservationsData.find(b => b.id === id);
            if (target) target.status = newStatus;
            applyReservationsFilters();
        } else {
            alert('Не удалось обновить статус');
        }
    } catch (err) {
        alert('Ошибка сети при обновлении статуса');
    }
}

/* ─────────────────────────────────────────────────────────
   4. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ СТРАНИЦЫ
   ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    loadAdminMenu();
});

// Экспорт необходимых HTML-инлайну функций в глобальную область видимости
window.switchTab = switchTab;
window.startEditDish = startEditDish;
window.deleteDish = deleteDish;
window.deleteMainPhotoState = deleteMainPhotoState;
window.deleteGalleryPhotoState = deleteGalleryPhotoState;
window.updateReservationStatus = updateReservationStatus;
window.clearFilterDate = clearFilterDate;
window.applyReservationsFilters = applyReservationsFilters;