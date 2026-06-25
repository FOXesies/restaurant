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
let globalSpecialOffersIds = []; // Хранит ID спец. предложений

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
window.switchTab = switchTab;

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
   2. УПРАВЛЕНИЕ СПЕЦ. ПРЕДЛОЖЕНИЯМИ
   ───────────────────────────────────────────────────────── */

async function loadSpecialOffersIds() {
    try {
        const response = await fetch('/api/special-offers');
        if (response.ok) {
            globalSpecialOffersIds = await response.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки сез. предложений:', err);
    }
}

async function toggleSpecialOffer(dishId, isSpecial) {
    try {
        if (isSpecial) {
            const response = await fetch(`/api/special-offers/${dishId}`, { method: 'DELETE' });
            if (response.ok) {
                globalSpecialOffersIds = globalSpecialOffersIds.filter(id => id !== dishId);
                alert('Блюдо убрано из сезонных предложений');
            }
        } else {
            const response = await fetch('/api/special-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dish_id: dishId })
            });
            if (response.ok) {
                globalSpecialOffersIds.push(dishId);
                alert('Блюдо добавлено в сез. предложения!');
            }
        }
        loadAdminMenu(); // Перерисовываем список админки, чтобы обновить кнопки
    } catch (err) {
        alert('Не удалось изменить статус сез. предложения');
    }
}
window.toggleSpecialOffer = toggleSpecialOffer;

/* ─────────────────────────────────────────────────────────
   3. УПРАВЛЕНИЕ РАЗДЕЛОМ МЕНЮ (БЛЮДА)
   ───────────────────────────────────────────────────────── */

// Загрузка блюд с сервера
async function loadAdminMenu() {
    if (!container) return;
    try {
        // Загружаем спецпредложения перед отрисовкой кнопок
        await loadSpecialOffersIds();

        const res = await fetch('/api/menu');
        globalMenuData = await res.json();
        
        container.innerHTML = globalMenuData.map(item => {
            const isSpecial = globalSpecialOffersIds.includes(item.id) || globalSpecialOffersIds.includes(Number(item.id));
            const specialBtnText = isSpecial ? '❌ Убрать из сезонных' : '⭐️ В сезонные блюда';
            const specialBtnStyle = isSpecial 
                ? 'background-color: #e74c3c; color: white; border: none;' 
                : 'background-color: transparent; color: #ffc107; border: 1px solid #ffc107;';

            return `
                <div class="dish-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); gap: 16px;">
                    <div>
                        <strong>[${item.category}] ${item.name}</strong> — ${item.price} ₽
                    </div>
                    <div class="action-btns" style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="toggleSpecialOffer(${item.id}, ${isSpecial})" style="padding: 6px 10px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: 500; transition: all 0.2s; ${specialBtnStyle}">
                            ${specialBtnText}
                        </button>
                        <button class="edit-btn" onclick="startEditDish(${item.id})">Редактировать</button>
                        <button class="delete-btn" onclick="deleteDish(${item.id})">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Ошибка загрузки меню:', err);
    }
}
window.loadAdminMenu = loadAdminMenu;

// Отображение менеджера фотографий при редактировании
function renderPhotoManagers() {
    if (!mainPhotoManager || !galleryManager || !mainImgInput) return;

    if (currentServerMainImg) {
        mainPhotoManager.innerHTML = `
            <div class="photo-card">
                <img src="${currentServerMainImg}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px;">
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
                <img src="${url}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px;">
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
window.deleteMainPhotoState = deleteMainPhotoState;

function deleteGalleryPhotoState(index) {
    currentServerGallery.splice(index, 1);
    renderPhotoManagers();
}
window.deleteGalleryPhotoState = deleteGalleryPhotoState;

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
window.startEditDish = startEditDish;

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
window.deleteDish = deleteDish;

/* ─────────────────────────────────────────────────────────
   4. УПРАВЛЕНИЕ ЗАЯВКАМИ НА БРОНИРОВАНИЕ
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
window.loadReservations = loadReservations;

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
            <div class="res-item ${currentClass}" style="display: flex; flex-direction: column; gap: 12px; align-items: stretch; padding: 16px; margin-bottom: 12px; border-radius: 6px; background: rgba(255,255,255,0.03);">
                <div class="res-info">
                    <h3 style="margin: 0 0 8px 0; font-size: 1.2rem;">${booking.name} (Стол на ${booking.guests} чел.)</h3>
                    <p style="margin: 4px 0; color: #ccc;"><strong>Телефон:</strong> ${booking.phone}</p>
                    ${booking.comment ? `<p style="margin: 6px 0 0 0; color: #aaa;"><strong>Комментарий:</strong> <em>${booking.comment}</em></p>` : ''}
                </div>
                
                <div class="res-meta" style="
                    display: flex; 
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px; 
                    padding-top: 12px; 
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="font-size: 1.2rem;">📅</div>
                        <div>${booking.date} в ${booking.time}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.9rem; color: #888;">Статус:</span>
                        <select onchange="updateReservationStatus(${booking.id}, this.value)" style="padding: 6px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; cursor: pointer;">
                            <option value="ожидает ответа" ${booking.status === 'ожидает ответа' ? 'selected' : ''}>Ожидает ответа</option>
                            <option value="завершена" ${booking.status === 'завершена' ? 'selected' : ''}>Завершена</option>
                            <option value="отменена" ${booking.status === 'отменена' ? 'selected' : ''}>Отменена</option>
                            <option value="просрочена" ${booking.status === 'просрочена' ? 'selected' : ''}>Просрочена</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
window.applyReservationsFilters = applyReservationsFilters;

// Изменение статуса заявки бронирования
async function updateReservationStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            alert('Статус заявки успешно обновлен!');
            loadReservations(); // Перезагружаем список
        } else {
            alert('Не удалось обновить статус на сервере');
        }
    } catch (err) {
        console.error('Ошибка изменения статуса:', err);
        alert('Ошибка сети при попытке изменить статус');
    }
}
window.updateReservationStatus = updateReservationStatus;

/* ─────────────────────────────────────────────────────────
   5. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
   ───────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // Первичный вывод меню админки
    loadAdminMenu();

    // Привязка слушателей событий для фильтров бронирования (если элементы на текущей вкладке)
    const filterStatus = document.getElementById('filterStatus');
    const filterDate = document.getElementById('filterDate');
    const filterSort = document.getElementById('filterSort');
    
    if (filterStatus) filterStatus.addEventListener('change', applyReservationsFilters);
    if (filterDate) filterDate.addEventListener('change', applyReservationsFilters);
    if (filterSort) filterSort.addEventListener('change', applyReservationsFilters);
});