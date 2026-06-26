let menuData = []; // Массив, который заполнится из JSON с сервера
let globalSpecialOffersIds = []; // Массив для ID спец. предложений

// Функция для загрузки списка спец. предложений с сервера
async function loadSpecialOffersIds() {
    try {
        const response = await fetch('/api/special-offers');
        if (response.ok) {
            globalSpecialOffersIds = await response.json();
        }
    } catch (err) {
        console.error('Ошибка загрузки спец. предложений:', err);
    }
}

// Функция для загрузки данных меню
async function loadMenuData() {
    try {
        // 1. Сначала дожидаемся загрузки ID всех спец. предложений
        await loadSpecialOffersIds();

        // 2. Затем загружаем основное меню, как и раньше
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

// Находим элементы модального окна детального просмотра блюда
const dishModal = document.getElementById('dish-modal');
const dishModalBody = document.getElementById('modal-body');
const closeDishModalBtn = document.getElementById('close-modal-btn');

// Состояние слайдера картинок внутри модального окна блюда
window.currentDishImages = [];
window.currentDishImgIndex = 0;

// ─── ИНТЕРАКТИВНОЕ МЕНЮ (Только для страницы menu.html) ───
function renderMenu(filter) {
    if (!menuItemsContainer || menuData.length === 0) return;
    
    let items = [];
    if (filter === 'all') {
        items = menuData;
    } else if (filter === 'seasonal') { 
        // Перехватываем фильтр 'seasonal' и сопоставляем с ID из вашей таблицы special_offers
        items = menuData.filter(item => globalSpecialOffersIds.includes(item.id) || globalSpecialOffersIds.includes(Number(item.id)));
    } else {
        items = menuData.filter((item) => item.category === filter);
    }

    menuItemsContainer.innerHTML = items.map((item) => {
        // Проверяем, входит ли блюдо в список специальных/сезонных предложений
        const isSeasonal = globalSpecialOffersIds.includes(item.id) || globalSpecialOffersIds.includes(Number(item.id));
        
        return `
            <div class="menu-item" onclick="openDishModal('${item.id}')" style="cursor: pointer; position: relative;">
                ${isSeasonal ? '<span class="special-badge" style="position: absolute; top: 10px; right: 10px; background: #c6a137; color: #000; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; z-index: 2;">🍁 Сезон</span>' : ''}
                <img src="${item.img}" alt="${item.name}">
                <div class="menu-item-info">
                    <h4>${item.name}</h4>
                    <div class="menu-item-meta" style="font-size: 0.85rem; color: #888; margin-bottom: 4px;">
                        ${item.weight ? `<span>${item.weight} г</span>` : ''} 
                        ${item.calories ? `&nbsp;·&nbsp;<span>${item.calories} ккал</span>` : ''}
                    </div>
                    <p>${item.desc}</p>
                </div>
                <div class="menu-item-price">${item.price} ₽</div>
            </div>
        `;
    }).join('');
}

// Функция открытия окна блюда с поддержкой слайдера
function openDishModal(id) {
    const dish = menuData.find(item => String(item.id) === String(id));
    if (!dish || !dishModal || !dishModalBody) return;

    window.currentDishImages = dish.gallery && dish.gallery.length > 0 ? dish.gallery : [dish.img];
    window.currentDishImgIndex = 0; 

    dishModalBody.innerHTML = `
        <div class="dish-detailed">
            <div class="dish-detailed-gallery">
                <div class="dish-main-img-container" style="position: relative;">
                    <img src="${window.currentDishImages[0]}" alt="${dish.name}" id="dishMainImg" class="dish-gallery-img">
                    
                    ${window.currentDishImages.length > 1 ? `
                      <button class="slider-arrow prev-arrow" onclick="switchDishImg(-1)" type="button" aria-label="Предыдущее foto" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <button class="slider-arrow next-arrow" onclick="switchDishImg(1)" type="button" aria-label="Следующее foto" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ` : ''}
                </div>
                
                ${window.currentDishImages.length > 1 ? `
                    <div class="dish-thumbnails" style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto;">
                        ${window.currentDishImages.map((imgUrl, idx) => `
                            <img src="${imgUrl}" alt="" class="thumb-img ${idx === 0 ? 'active' : ''}" onclick="jumpToDishImg(${idx})" style="width: 60px; height: 45px; object-fit: cover; cursor: pointer; border-radius: 4px; border: 2px solid transparent;">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="dish-detailed-info">
                <div>
                    <h3>${dish.name}</h3>
                    <div class="dish-detailed-meta" style="color: #888; font-size: 0.9rem; margin-bottom: 12px;">
                        ${dish.weight ? `<span>${dish.weight} г</span>` : ''}
                        ${dish.calories ? `<span>&nbsp;·&nbsp;${dish.calories} ккал</span>` : ''}
                    </div>
                    <p class="dish-detailed-desc">${dish.desc}</p>
                </div>
                <div class="dish-detailed-footer" style="margin-top: 20px; font-size: 1.4rem; font-weight: bold; color: #c6a137;">
                    <span class="dish-detailed-price">${dish.price} ₽</span>
                </div>
            </div>
        </div>
    `;

    dishModal.classList.add('open');
    dishModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

// Функция переключения по стрелкам (вперед/назад)
function switchDishImg(direction) {
    if (!window.currentDishImages || window.currentDishImages.length <= 1) return;
    
    window.currentDishImgIndex += direction;
    
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
    
    document.querySelectorAll('.dish-thumbnails .thumb-img').forEach((thumb, idx) => {
        if (idx === window.currentDishImgIndex) {
            thumb.style.borderColor = '#c6a137';
        } else {
            thumb.style.borderColor = 'transparent';
        }
    });
}

// Экспортируем функции в глобальную область видимости
window.switchDishImg = switchDishImg;
window.jumpToDishImg = jumpToDishImg;
window.openDishModal = openDishModal;

// Функция закрытия окна блюда
function closeDishModal() {
    if (!dishModal) return;
    dishModal.classList.remove('open');
    dishModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

// Слушатели событий для закрытия
if (closeDishModalBtn) {
    closeDishModalBtn.addEventListener('click', closeDishModal);
}

if (dishModal) {
    dishModal.addEventListener('click', (event) => {
        if (event.target === dishModal) closeDishModal();
    });
}

window.closeDishModal = closeDishModal;

function filterMenu(cat, btn) {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMenu(cat);
}

window.filterMenu = filterMenu;

// ─── УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ БРОНИРОВАНИЯ ───
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

    if (nameInput && !nameInput.value.trim()) {
        showToast('Пожалуйста, укажите ваше имя.');
        nameInput.focus();
        return false;
    }

    if (phoneInput) {
        const phoneVal = phoneInput.value.trim();
        const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[3489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
        const cleanPhone = phoneVal.replace(/\D/g, ''); 

        if (!phoneVal) {
            showToast('Пожалуйста, укажите номер телефона.');
            phoneInput.focus();
            return false;
        }
        if (cleanPhone.length < 11 || !phoneRegex.test(phoneVal)) {
            showToast('Некорректный номер телефона. Формат: +7 (999) 999-99-99');
            phoneInput.focus();
            return false;
        }
    }

    if (dateInput) {
        if (!dateInput.value) {
            showToast('Пожалуйста, выберите дату визита.');
            dateInput.focus();
            return false;
        }

        const selectedDate = dateInput.value; 
        const today = new Date().toISOString().split('T')[0];

        if (selectedDate < today) {
            showToast('Нельзя забронировать столик на прошедшую дату.');
            dateInput.focus();
            return false;
        }
    }

    if (timeInput) {
        if (!timeInput.value) {
            showToast('Пожалуйста, выберите время визита.');
            timeInput.focus();
            return false;
        }

        const [hours, minutes] = timeInput.value.split(':').map(Number);
        const selectedMinutesFromMidnight = hours * 60 + minutes;

        const openTime = 12 * 60;  
        const closeTime = 22 * 60; 

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
                    showToast('Бронирование на сегодня возможно минимум за 10 минут до визита.');
                    timeInput.focus();
                    return false;
                }
            }
        }
    }

    return true;
}

// ─── ИНТЕРАКТИВНАЯ МАСКА ДЛЯ ВВОДА ТЕЛЕФОНА ───
function initPhoneMask() {
    const phoneInputs = document.querySelectorAll('input[name="phone"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let el = e.target,
                matrix = "+7 (___) ___-__-__",
                i = 0,
                def = matrix.replace(/\D/g, ""),
                val = el.value.replace(/\D/g, "");
            
            if (def.length >= val.length) val = def;
            
            el.value = matrix.replace(/./g, function(a) {
                return /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? "" : a;
            });
        });
        
        input.addEventListener('focus', (e) => {
            if (!e.target.value) e.target.value = '+7 ';
        });
    });
}

async function submitBooking(event) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!validateForm(form)) return;

    const dateField = form.querySelector('input[name="date"]');
    const timeField = form.querySelector('input[name="time"]');
    const nameField = form.querySelector('input[name="name"]');
    const phoneField = form.querySelector('input[name="phone"]');
    const commentField = form.querySelector('textarea[name="comment"]');
    
    const guestValue = form.querySelector('select[name="guests"]').value;
    const guestsCount = parseInt(guestValue) || 2; 

    const bookingData = {
        name: nameField.value.trim(),
        phone: phoneField.value.trim(),
        guests: guestsCount,
        date: dateField.value,
        time: timeField.value || '19:00',
        comment: commentField ? commentField.value.trim() : ''
    };

    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            closeModal();
            form.reset();
            setDefaultDates();
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

// ─── АНИМАЦИЯ ПРИ СКРОЛЛЕ ───
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

function initNavigation() {
    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open', mobileMenu.classList.contains('open'));
        });
    }

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
            closeDishModal();
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
    const mainBookingForm = document.getElementById('bookingForm');
    if (mainBookingForm) {
        mainBookingForm.addEventListener('submit', submitBooking);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const promoGrid = document.getElementById('promoGrid');
    
    if (promoGrid) {
        fetch('/api/promotions')
            .then(res => res.json())
            .then(data => {
                if(data.length === 0) {
                    promoGrid.innerHTML = '<p style="color: #aaa; text-align:center; width:100%;">На данный момент нет активных акций.</p>';
                    return;
                }
                
                promoGrid.innerHTML = data.map(promo => `
                    <div class="promo-card reveal active" style="opacity: 1; transform: translate(0, 0);">
                        <div class="promo-tag">${promo.badge}</div>
                        <h3>${promo.title}</h3>
                        <p>${promo.description}</p>
                    </div>
                `).join('');
            })
            .catch(err => console.error('Ошибка загрузки акций на клиентской стороне:', err));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    fetchPopularDishes();
});

async function fetchPopularDishes() {
    const container = document.getElementById('popularDishesContainer');
    
    try {
        const response = await fetch('/api/menu/random');
        if (!response.ok) throw new Error('Ошибка при получении меню');
        
        const dishes = await response.json();
        
        if (dishes.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center; grid-column: 1/-1;">Пока нет доступных блюд</p>';
            return;
        }

        // Рендерим 3 карточки
        container.innerHTML = dishes.map(dish => `
            <div class="dish-card reveal">
                <div class="dish-img-wrap">
                    <img class="dish-img" src="${dish.image || 'images/default-dish.jpg'}" alt="${dish.name}">
                </div>
                <div class="dish-info">
                    <h4>${dish.name}</h4>
                    <p>${dish.description || ''}</p>
                    <div class="dish-price">${dish.price} ₽</div>
                </div>
            </div>
        `).join('');

        if (window.initRevealAnimations) {
            window.initRevealAnimations();
        }

    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<p style="color: #ff6b6b; text-align: center; grid-column: 1/-1;">Не удалось загрузить популярные блюда</p>';
    }
}

document.addEventListener('DOMContentLoaded', initPage);