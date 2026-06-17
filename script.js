let menuData = []; // Теперь это пустой массив, который заполнится из JSON

// Функция для загрузки данных из внешнего JSON-файла
async function loadMenuData() {
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
            throw new Error(`Ошибка сети: ${response.status}`);
        }
        menuData = await response.json();
    } catch (error) {
        console.error("Не удалось загрузить меню:", error);
        if (menuItemsContainer) {
            menuItemsContainer.innerHTML = `
                <p class="error-msg" style="text-align:center; color: #c6a137; padding: 40px;">
                    Не удалось загрузить меню. Пожалуйста, обновите страницу позже.
                </p>`;
        }
    }
}

// Кэширование DOM-нод
const modalOverlay = document.getElementById('modalOverlay');
const mobileMenu = document.getElementById('mobileMenu');
const navbar = document.getElementById('navbar');
const burgerBtn = document.getElementById('burgerBtn');
const menuItemsContainer = document.getElementById('menuItems');
const videoButton = document.getElementById('videoBtn');
const modalBookingForm = document.getElementById('modalBookingForm');

// ─── ИНТЕРАКТИВНОЕ МЕНЮ (Только для страницы menu.html) ───
function renderMenu(filter) {
    if (!menuItemsContainer || menuData.length === 0) return;
    
    const items = filter === 'all' ? menuData : menuData.filter((item) => item.category === filter);

    menuItemsContainer.innerHTML = items.map((item) => `
        <div class="menu-item" onclick="openDishModal('${item.id}')" style="cursor: pointer;">
            <img src="${item.img}" alt="${item.name}">
            <div class="menu-item-info">
                <h4>${item.name}</h4>
                <div class="menu-item-meta" style="font-size: 0.85rem; color: #888; margin-bottom: 4px;">
                    ${item.weight ? `<span>${item.weight}</span>` : ''} 
                    ${item.calories ? `&nbsp;·&nbsp;<span>${item.calories}</span>` : ''}
                </div>
                <p>${item.desc}</p>
            </div>
            <div class="menu-item-price">${item.price}</div>
        </div>
    `).join('');
}

// Находим элементы нового модального окна блюда
const dishModal = document.getElementById('dish-modal');
const dishModalBody = document.getElementById('modal-body');
const closeDishModalBtn = document.getElementById('close-modal-btn');

// Функция открытия окна блюда
window.currentDishImages = [];
window.currentDishImgIndex = 0;

// Функция открытия окна блюда с поддержкой слайдера
function openDishModal(id) {
    const dish = menuData.find(item => item.id === id || String(item.id) === String(id));
    if (!dish || !dishModal || !dishModalBody) return;

    // Смело берем массив картинок или создаем его из одной дефолтной
    window.currentDishImages = dish.gallery && dish.gallery.length > 0 ? dish.gallery : [dish.img];
    window.currentDishImgIndex = 0; // Сбрасываем индекс на первую картинку

    // Генерируем верстку внутри окна
    dishModalBody.innerHTML = `
        <div class="dish-detailed">
            <div class="dish-detailed-gallery">
                <div class="dish-main-img-container">
                    <img src="${window.currentDishImages[0]}" alt="${dish.name}" id="dishMainImg" class="dish-gallery-img">
                    
                    ${window.currentDishImages.length > 1 ? `
                      <button class="slider-arrow prev-arrow" onclick="switchDishImg(-1)" type="button" aria-label="Предыдущее фото">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <button class="slider-arrow next-arrow" onclick="switchDishImg(1)" type="button" aria-label="Следующее фото">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ` : ''}
                </div>
                
                ${window.currentDishImages.length > 1 ? `
                    <div class="dish-thumbnails">
                        ${window.currentDishImages.map((imgUrl, idx) => `
                            <img src="${imgUrl}" alt="" class="thumb-img ${idx === 0 ? 'active' : ''}" onclick="jumpToDishImg(${idx})">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="dish-detailed-info">
                <div>
                    <h3>${dish.name}</h3>
                    <div class="dish-detailed-meta">
                        ${dish.weight ? `<span>${dish.weight}</span>` : ''}
                        ${dish.calories ? `<span>&nbsp;·&nbsp;${dish.calories}</span>` : ''}
                    </div>
                    <p class="dish-detailed-desc">${dish.desc}</p>
                </div>
                <div class="dish-detailed-footer">
                    <span class="dish-detailed-price">${dish.price}</span>
                </div>
            </div>
        </div>
    `;

    dishModal.classList.add('open');
    document.body.classList.add('modal-open');
}

// Функция переключения по стрелкам (вперед/назад)
function switchDishImg(direction) {
    if (!window.currentDishImages || window.currentDishImages.length <= 1) return;
    
    window.currentDishImgIndex += direction;
    
    // Зацикливаем слайдер
    if (window.currentDishImgIndex >= window.currentDishImages.length) window.currentDishImgIndex = 0;
    if (window.currentDishImgIndex < 0) window.currentDishImgIndex = window.currentDishImages.length - 1;
    
    updateModalImageUI();
}

// Функция быстрого перехода при клике на миниатюру
function jumpToDishImg(index) {
    window.currentDishImgIndex = index;
    updateModalImageUI();
}

// Функция обновления картинок и активных классов в интерфейсе
function updateModalImageUI() {
    const mainImg = document.getElementById('dishMainImg');
    if (mainImg) {
        mainImg.src = window.currentDishImages[window.currentDishImgIndex];
    }
    
    // Подсвечиваем активную миниатюру
    document.querySelectorAll('.dish-thumbnails .thumb-img').forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === window.currentDishImgIndex);
    });
}

// Экспортируем функции в глобальную область видимости для onclick атрибутов
window.switchDishImg = switchDishImg;
window.jumpToDishImg = jumpToDishImg;

// Функция закрытия окна блюда
function closeDishModal() {
    if (!dishModal) return;
    dishModal.classList.add('hidden');
    dishModal.classList.remove('open');
    document.body.classList.remove('modal-open');
}

// Слушатели событий для закрытия
if (closeDishModalBtn) {
    closeDishModalBtn.addEventListener('click', closeDishModal);
}

if (dishModal) {
    dishModal.addEventListener('click', (event) => {
        // Закрываем, только если кликнули на темный фон (оверлей)
        if (event.target === dishModal) closeDishModal();
    });
}

// Добавляем функции в глобальную область (на случай вызова из HTML)
window.openDishModal = openDishModal;
window.closeDishModal = closeDishModal;

function filterMenu(cat, btn) {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMenu(cat);
}

// Экспорт в глобальную область видимости для обработки атрибутов onclick инлайн-элементов HTML
window.filterMenu = filterMenu;

// ─── УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ (Сквозной функционал) ───
function openModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('open');
    document.body.classList.add('modal-open');
}

function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.classList.remove('modal-open');
}

function maybeClose(event) {
    if (event.target === modalOverlay) closeModal();
}

window.openModal = openModal;
window.closeModal = closeModal;
window.maybeClose = maybeClose;

function closeMobile() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('open');
    document.body.classList.remove('menu-open');
}
window.closeMobile = closeMobile;

// ─── УВЕДОМЛЕНИЯ (TOAST) ───
function showToast(message) {
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ─── ВАЛИДАЦИЯ И ОТПРАВКА ФОРМЫ БРОНИРОВАНИЯ ───
function validateForm(form) {
    const nameInput = form.querySelector('input[name="name"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const dateInput = form.querySelector('input[type="date"]');
    const timeInput = form.querySelector('input[type="time"]');

    // 1. Валидация имени
    if (nameInput && !nameInput.value.trim()) {
        showToast('Пожалуйста, укажите ваше имя.');
        nameInput.focus();
        return false;
    }

    // 2. Валидация телефона (Строгий паттерн РФ: мобильные и городские)
    if (phoneInput) {
        const phoneVal = phoneInput.value.trim();
        // Регулярное выражение проверяет наличие кода оператора/города и полную длину номера
        const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[3489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
        const cleanPhone = phoneVal.replace(/\D/g, ''); // Только цифры

        if (!phoneVal) {
            showToast('Пожалуйста, укажите номер телефона.');
            phoneInput.focus();
            return false;
        }
        // В РФ номере должно быть ровно 11 цифр (включая 7 или 8)
        if (cleanPhone.length < 11 || !phoneRegex.test(phoneVal)) {
            showToast('Некорректный номер телефона. Формат: +7 (999) 999-99-99');
            phoneInput.focus();
            return false;
        }
    }

    // 3. Валидация даты
    if (dateInput) {
        if (!dateInput.value) {
            showToast('Пожалуйста, выберите дату визита.');
            dateInput.focus();
            return false;
        }

        const selectedDate = dateInput.value; // Строка YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        if (selectedDate < today) {
            showToast('Нельзя забронировать столик на прошедшую дату.');
            dateInput.focus();
            return false;
        }
    }

    // 4. Валидация времени (С учетом рабочих часов и текущего времени)
    if (timeInput) {
        if (!timeInput.value) {
            showToast('Пожалуйста, выберите время визита.');
            timeInput.focus();
            return false;
        }

        const [hours, minutes] = timeInput.value.split(':').map(Number);
        const selectedMinutesFromMidnight = hours * 60 + minutes;

        // Ресторан работает с 12:00 до 23:00. 
        // По правилам ресторанного бизнеса, брони сажают максимум за 1 час до закрытия (до 22:00)
        const openTime = 12 * 60;  // 12:00 в минутах
        const closeTime = 22 * 60; // 22:00 в минутах

        if (selectedMinutesFromMidnight < openTime || selectedMinutesFromMidnight > (23 * 60)) {
            showToast('Ресторан Belka Vilka открыт с 12:00 до 23:00.');
            timeInput.focus();
            return false;
        }

        if (selectedMinutesFromMidnight > closeTime) {
            showToast('Последнее бронирование принимается до 22:00 (за час до закрытия).');
            timeInput.focus();
            return false;
        }

        // Если бронируют на СЕГОДНЯ, время должно быть в будущем (минимум за 30 минут до визита)
        if (dateInput && dateInput.value) {
            const today = new Date().toISOString().split('T')[0];
            if (dateInput.value === today) {
                const now = new Date();
                const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

                if (selectedMinutesFromMidnight < currentMinutesFromMidnight) {
                    showToast('Вы выбрали прошедшее время для сегодняшней даты.');
                    timeInput.focus();
                    return false;
                }

                if (selectedMinutesFromMidnight < currentMinutesFromMidnight + 10) {
                    showToast('Бронирование на сегодня возможно минимум за 10 минут до визита, чтобы успеть подготовить столик.');
                    timeInput.focus();
                    return false;
                }
            }
        }
    }

    return true;
}

// ─── ИНТЕРАКТИВНАЯ МАСКА ДЛЯ ВВОДА ТЕЛЕФОНА (Продвинутый UX) ───
function initPhoneMask() {
    const phoneInputs = document.querySelectorAll('input[name="phone"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let el = e.target,
                clearVal = el.value.replace(/\D/g, ''),
                matrix = "+7 (___) ___-__-__",
                i = 0,
                def = matrix.replace(/\D/g, ""),
                val = el.value.replace(/\D/g, "");
            
            if (def.length >= val.length) val = def;
            
            el.value = matrix.replace(/./g, function(a) {
                return /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? "" : a;
            });
        });
        
        // Автоподстановка +7 при фокусе, если поле пустое
        input.addEventListener('focus', (e) => {
            if (!e.target.value) e.target.value = '+7 ';
        });
    });
}

async function submitBooking(event) {
    event.preventDefault();
    const form = event.currentTarget;

    // 1. Сначала запускаем вашу существующую валидацию
    if (!validateForm(form)) return;

    // 2. Вытаскиваем значения полей по атрибуту `name`
    const dateField = form.querySelector('input[name="date"]');
    const timeField = form.querySelector('input[name="time"]');
    const nameField = form.querySelector('input[name="name"]');
    const phoneField = form.querySelector('input[name="phone"]');
    const commentField = form.querySelector('textarea[name="comment"]');
    
    // Для селекта гостей достаем текстовое значение (например, "2 гостя") 
    // и превращаем его в чистое число для бэкенда
    const guestValue = form.querySelector('select[name="guests"]').value;
    const guestsCount = parseInt(guestValue) || 2; 

    // 3. Формируем JSON-объект для бэкенда
    const bookingData = {
        name: nameField.value.trim(),
        phone: phoneField.value.trim(),
        guests: guestsCount,
        date: dateField.value,
        time: timeField.value || '19:00',
        comment: commentField ? commentField.value.trim() : ''
    };

    try {
        // 4. Отправляем асинхронный запрос на сервер
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            // Если сервер сохранил заявку:
            const result = await response.json();
            
            // Закрываем, сбрасываем и ставим дефолтные даты
            closeModal();
            form.reset();
            if (typeof setDefaultDates === 'function') setDefaultDates();

            // Показываем уведомление об успешном бронировании
            showToast(`✓ Столик на ${guestValue.toLowerCase()} забронирован на ${bookingData.date} в ${bookingData.time}.`);
        } else {
            const errorData = await response.json();
            alert(`Ошибка сервера: ${errorData.error || 'Не удалось отправить заявку'}`);
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
        alert('Произошла сетевая ошибка. Проверьте соединение с сервером.');
    }
}

// ─── АНИМАЦИЯ ПРИ СКРОЛЛЕ (Intersection Observer) ───
function initRevealAnimation() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach((item) => observer.observe(item));
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach((input) => {
        input.min = today;
        if (!input.value) input.value = today;
    });
}

// ─── ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ СОБЫТИЙ ───
function initNavigation() {
    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open', mobileMenu.classList.contains('open'));
        });
    }

    // Закрытие меню при клике на ссылки с хэшами
    document.querySelectorAll('.mobile-menu a').forEach((link) => {
        link.addEventListener('click', closeMobile);
    });

    window.addEventListener('scroll', () => {
        if (!navbar) return;
        navbar.style.background = window.scrollY > 60 ? 'rgba(0,0,0,0.98)' : 'rgba(0,0,0,0.92)';
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            closeMobile();
        }
    });
}

function initGlobalActions() {
    if (videoButton) {
        videoButton.addEventListener('click', () => {
            const gallerySection = document.getElementById('gallery-preview');
            if (gallerySection) {
                gallerySection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = 'gallery.html';
            }
        });
    }

    // Слушатель виртуальной корзины (делегирование событий)
    document.addEventListener('click', (event) => {
        const addButton = event.target.closest('.add-btn');
        if (!addButton) return;
        const dishName = addButton.dataset.dish || 'блюдо';
        showToast(`«${dishName}» добавлено в ваш виртуальный заказ.`);
    });
}

async function initPage() {
    await loadMenuData();

    if (menuItemsContainer) {
        renderMenu('all');
    }
    setDefaultDates();
    initRevealAnimation();
    initNavigation();
    initGlobalActions();
    initPhoneMask();

    if (modalBookingForm) {
        modalBookingForm.addEventListener('submit', submitBooking);
    }
    // Если на главной странице осталась инлайн-форма #bookingForm, её тоже нужно слушать:
    const mainBookingForm = document.getElementById('bookingForm');
    if (mainBookingForm) {
        mainBookingForm.addEventListener('submit', submitBooking);
    }
}

document.addEventListener('DOMContentLoaded', initPage);