// ССЫЛКИ НА HTML ЭЛЕМЕНТЫ ФОРМЫ И МЕНЮ (БЛЮДА)
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

// ССЫЛКИ НА ЭЛЕМЕНТЫ ФОРМЫ УПРАВЛЕНИЯ АКЦИЯМИ (ТРЕТЬЯ ВКЛАДКА)
const promoForm = document.getElementById('addPromoForm');
const promoIdInput = document.getElementById('promoIdInput');
const promoBadgeInput = document.getElementById('promoBadgeInput');
const promoTitleInput = document.getElementById('promoTitleInput');
const promoDescInput = document.getElementById('promoDescInput');
const promoFormTitle = document.getElementById('promoFormTitle');
const promoSubmitBtn = document.getElementById('promoSubmitBtn');
const cancelPromoEditBtn = document.getElementById('cancelPromoEditBtn');
const adminPromotionsContainer = document.getElementById('adminPromotionsContainer');

// ГЛОБАЛЬНЫЕ ДАННЫЕ В ПАМЯТИ ФРОНТЕНДА
let globalMenuData = [];
let globalReservationsData = [];
let globalSpecialOffersIds = []; // Хранит ID сезонных блюд
let globalPromotionsData = [];   // Хранит данные полноценных акций

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
    } else if (tabId === 'menu-tab') {
        loadAdminMenu();
    } else if (tabId === 'promotions-tab') {
        loadPromotions();
    }
}
window.switchTab = switchTab;

// Живой счётчик букв в названии блюда
if (dishNameInput) {
    dishNameInput.addEventListener('input', () => {
        const length = dishNameInput.value.length;
        if (!charCounter) return;
        charCounter.textContent = `${length} / 50 symbols`;
        charCounter.style.color = length >= 50 ? '#ff4d4d' : length >= 40 ? '#e2ba43' : '#888';
    });
}

/* ─────────────────────────────────────────────────────────
   2. УПРАВЛЕНИЕ ПОЛНОЦЕННЫМИ АКЦИЯМИ (НОВАЯ ВКЛАДКА)
   ───────────────────────────────────────────────────────── */

// Загрузка акций с сервера и их рендеринг
async function loadPromotions() {
    try {
        const response = await fetch('/api/promotions');
        const data = await response.json();
        globalPromotionsData = data; 

        if (!adminPromotionsContainer) return;

        if (data.length === 0) {
            adminPromotionsContainer.innerHTML = '<p style="color: #999;">Список акций пуст. Добавьте первую акцию слева.</p>';
            return;
        }

        adminPromotionsContainer.innerHTML = data.map(promo => `
            <div class="admin-promo-card" style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                    <span style="font-size: 11px; background: #e2ba43; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: bold; text-transform: uppercase;">${promo.badge}</span>
                    <h3 style="margin: 8px 0 4px 0; color: #fff;">${promo.title}</h3>
                    <p style="margin: 0; font-size: 14px; color: #aaa;">${promo.description}</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="startEditPromo(${promo.id})" style="padding: 6px 12px; background: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Редактировать</button>
                    <button onclick="deletePromo(${promo.id})" style="padding: 6px 12px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Удалить</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Ошибка при загрузке акций:', err);
    }
}
window.loadPromotions = loadPromotions;

// Обработка отправки формы акций (Создание / Обновление)
if (promoForm) {
    promoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = promoIdInput.value; 
        const payload = {
            badge: promoBadgeInput.value.trim(),
            title: promoTitleInput.value.trim(),
            description: promoDescInput.value.trim()
        };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/promotions/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch('/api/promotions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const result = await response.json();

            if (result.success) {
                alert(editId ? 'Акция успешно обновлена!' : 'Акция успешно добавлена!');
                resetPromoFormMode(); 
                loadPromotions();     
            } else {
                alert('Ошибка: ' + (result.error || 'Не удалось сохранить изменения'));
            }

        } catch (err) {
            console.error('Ошибка сохранения акции:', err);
            alert('Сбой сети или сервера при сохранении');
        }
    });
}

// Переход формы акций в режим редактирования
function startEditPromo(id) {
    const promo = globalPromotionsData.find(item => Number(item.id) === Number(id));
    if (!promo) return;

    promoIdInput.value = promo.id;
    promoBadgeInput.value = promo.badge;
    promoTitleInput.value = promo.title;
    promoDescInput.value = promo.description;

    if (promoFormTitle) promoFormTitle.innerText = 'Редактировать акцию';
    if (promoSubmitBtn) {
        promoSubmitBtn.innerText = 'Сохранить изменения';
        promoSubmitBtn.style.background = '#28a745'; 
        promoSubmitBtn.style.color = '#fff';
    }
    if (cancelPromoEditBtn) cancelPromoEditBtn.style.display = 'inline-block';
}
window.startEditPromo = startEditPromo;

// Сброс формы акций
function resetPromoFormMode() {
    if (!promoForm) return;
    promoForm.reset();
    if (promoIdInput) promoIdInput.value = ''; 
    
    if (promoFormTitle) promoFormTitle.innerText = 'Добавить новую акцию';
    if (promoSubmitBtn) {
        promoSubmitBtn.innerText = 'Сохранить акцию';
        promoSubmitBtn.style.background = '#e2ba43';
        promoSubmitBtn.style.color = '#000';
    }
    if (cancelPromoEditBtn) cancelPromoEditBtn.style.display = 'none'; 
}
if (cancelPromoEditBtn) cancelPromoEditBtn.addEventListener('click', resetPromoFormMode);

// Удаление акции
async function deletePromo(id) {
    if (!confirm('Вы уверены, что хотите удалить эту акцию?')) return;

    try {
        const response = await fetch(`/api/promotions/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            if (promoIdInput && Number(promoIdInput.value) === Number(id)) {
                resetPromoFormMode();
            }
            loadPromotions(); 
        } else {
            alert('Не удалось удалить акцию');
        }
    } catch (err) {
        console.error('Ошибка удаления:', err);
    }
}
window.deletePromo = deletePromo;


/* ─────────────────────────────────────────────────────────
   3. УПРАВЛЕНИЕ СЕЗОННЫМИ ПРЕДЛОЖЕНИЯМИ (БЛЮДА-ЗВЕЗДЫ)
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
                globalSpecialOffersIds = globalSpecialOffersIds.filter(id => Number(id) !== Number(dishId));
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
        loadAdminMenu(); 
    } catch (err) {
        alert('Не удалось изменить статус сез. предложения');
    }
}
window.toggleSpecialOffer = toggleSpecialOffer;

/* ─────────────────────────────────────────────────────────
   4. УПРАВЛЕНИЕ РАЗДЕЛОМ МЕНЮ (БЛЮДА)
   ───────────────────────────────────────────────────────── */

async function loadAdminMenu() {
    if (!container) return;
    try {
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
                        <strong>[${item.category}] ${item.name}</strong> — ${item.price}
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
    form.querySelector('textarea[name="desc"]').value = dish.desc || '';

    if (charCounter) charCounter.textContent = `${dish.name.length} / 50 symbols`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.startEditDish = startEditDish;

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
        if (mainImgLabel) mainImgLabel.textContent = 'Главное превью (1 photo) *Обязательно*:';
    }
    
    if (charCounter) {
        charCounter.textContent = '0 / 50 symbols';
        charCounter.style.color = '#888';
    }
}
if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetFormMode);
if (createNewBtn) createNewBtn.addEventListener('click', resetFormMode);

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
   5. УПРАВЛЕНИЕ ЗАЯВКАМИ НА БРОНИРОВАНИЕ
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
                
                <div class="res-meta" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
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

async function updateReservationStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            alert('Статус заявки успешно обновлен!');
            loadReservations(); 
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
   6. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
   ───────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('adminAuthModal');
    const loginForm = document.getElementById('adminLoginForm');
    
    const SECURE_LOGIN = "admin";
    const SECURE_PASSWORD = "admin"; 

    function checkAdminAuth() {
        if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
            if (authModal) authModal.classList.add('hidden');
            document.body.classList.remove('auth-locked'); 
            
            // Загружаем данные по умолчанию (первую вкладку меню)
            loadAdminMenu(); 
        } else {
            if (authModal) authModal.classList.remove('hidden');
            document.body.classList.add('auth-locked');    
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('authLogin').value.trim();
            const passwordInput = document.getElementById('authPassword').value.trim();

            if (usernameInput === SECURE_LOGIN && passwordInput === SECURE_PASSWORD) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                if (authModal) authModal.classList.add('hidden');
                document.body.classList.remove('auth-locked');
                
                loadAdminMenu();
            } else {
                alert('Неверный логин или пароль!');
                document.getElementById('authPassword').value = '';
            }
        });
    }

    checkAdminAuth();
});

window.logoutAdmin = function() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        sessionStorage.removeItem('isAdminAuthenticated');
        window.location.reload();
    }
}