// ─── MENU DATA ───
const menuData = [
  { cat: 'zakuski', img: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=120&q=70', name: 'Тар-тар из лосося', desc: 'С авокадо, огурцом и соусом цитронет', price: '1 650 ₽' },
  { cat: 'pasta', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=120&q=70', name: 'Паста с морепродуктами', desc: 'Паста ручной работы с креветками, мидиями и томатным нерро', price: '1 850 ₽' },
  { cat: 'main', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=120&q=70', name: 'Стейк Рибай', desc: 'С соусом из чёрного перца и запечёнными овощами', price: '2 950 ₽' },
  { cat: 'dessert', img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=120&q=70', name: 'Чизкейк Сан-Себастьян', desc: 'Нежный чизкейк с карамельной корочкой и ягодами', price: '650 ₽' },
  { cat: 'salaty', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&q=70', name: 'Салат Нисуаз', desc: 'Тунец, яйца, оливки, томаты черри, зелёная фасоль', price: '890 ₽' },
  { cat: 'supy', img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=120&q=70', name: 'Крем-суп из тыквы', desc: 'С семенами тыквы и трюфельным маслом', price: '590 ₽' },
  { cat: 'drinks', img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=120&q=70', name: 'Авторский коктейль Bella', desc: 'Просекко, личи, мята, лайм', price: '750 ₽' },
  { cat: 'zakuski', img: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=120&q=70', name: 'Карпаччо из говядины', desc: 'С пармезаном, рукколой и каперсами', price: '1 200 ₽' },
  { cat: 'main', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=120&q=70', name: 'Дорадо на гриле', desc: 'С лимонным маслом, каперсами и тимьяном', price: '2 100 ₽' },
  { cat: 'dessert', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=120&q=70', name: 'Тирамису', desc: 'Классический итальянский рецепт с маскарпоне', price: '580 ₽' },
];

const modalOverlay = document.getElementById('modalOverlay');
const mobileMenu = document.getElementById('mobileMenu');
const navbar = document.getElementById('navbar');
const burgerBtn = document.getElementById('burgerBtn');
const menuItemsContainer = document.getElementById('menuItems');
const videoButton = document.getElementById('videoBtn');
const bookingForm = document.getElementById('bookingForm');
const modalBookingForm = document.getElementById('modalBookingForm');

function renderMenu(filter) {
  const items = filter === 'all' ? menuData : menuData.filter((item) => item.cat === filter);

  menuItemsContainer.innerHTML = items.map((item) => `
    <div class="menu-item reveal visible">
      <img src="${item.img}" alt="${item.name}">
      <div class="menu-item-info">
        <h4>${item.name}</h4>
        <p>${item.desc}</p>
      </div>
      <div class="menu-item-price">${item.price}</div>
      <button class="add-btn" type="button" title="Добавить ${item.name}" data-dish="${item.name}">+</button>
    </div>
  `).join('');
}

function filterMenu(cat, btn) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
  btn.classList.add('active');
  renderMenu(cat);
}

window.filterMenu = filterMenu;

function openModal() {
  modalOverlay.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
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
  mobileMenu.classList.remove('open');
  document.body.classList.remove('menu-open');
}

window.closeMobile = closeMobile;

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

function validateForm(form) {
  const nameInput = form.querySelector('input[name="name"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const dateInput = form.querySelector('input[type="date"]');
  const timeInput = form.querySelector('input[type="time"]');

  if (!nameInput.value.trim()) {
    showToast('Пожалуйста, укажите имя.');
    nameInput.focus();
    return false;
  }

  if (!phoneInput.value.trim()) {
    showToast('Пожалуйста, укажите телефон.');
    phoneInput.focus();
    return false;
  }

  if (!dateInput.value) {
    showToast('Пожалуйста, выберите дату бронирования.');
    dateInput.focus();
    return false;
  }

  if (!timeInput.value) {
    showToast('Пожалуйста, выберите время бронирования.');
    timeInput.focus();
    return false;
  }

  return true;
}

function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!validateForm(form)) return;

  const guestField = form.querySelector('select');
  const dateField = form.querySelector('input[type="date"]');
  const timeField = form.querySelector('input[type="time"]');

  closeModal();
  form.reset();
  setDefaultDates();

  showToast(`✓ Бронь на ${guestField.value.toLowerCase()} оформлена на ${dateField.value} в ${timeField.value}.`);
}

function initRevealAnimation() {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

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

function initSmoothActions() {
  if (videoButton) {
    videoButton.addEventListener('click', () => {
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      showToast('Переходим к галерее ресторана.');
    });
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('.add-btn');
    if (!addButton) return;

    const dishName = addButton.dataset.dish || 'блюдо';
    showToast(`«${dishName}» добавлено в ваш виртуальный заказ.`);
  });
}

function initNavigation() {
  burgerBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    document.body.classList.toggle('menu-open', mobileMenu.classList.contains('open'));
  });

  mobileMenu.querySelectorAll('a, button').forEach((element) => {
    element.addEventListener('click', () => {
      closeMobile();
    });
  });

  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 60 ? 'rgba(0,0,0,0.98)' : 'rgba(0,0,0,0.92)';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeMobile();
    }
  });
}

function initForms() {
  bookingForm.addEventListener('submit', submitBooking);
  modalBookingForm.addEventListener('submit', submitBooking);
}

function initPage() {
  renderMenu('all');
  setDefaultDates();
  initRevealAnimation();
  initSmoothActions();
  initNavigation();
  initForms();
}

document.addEventListener('DOMContentLoaded', initPage);
