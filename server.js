const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5500;
const JSON_PATH = path.join(__dirname, 'menu.json');

const RESERVATIONS_PATH = path.join(__dirname, 'reservations.json');

// Вспомогательные функции для работы с JSON-базой заявок
const readReservations = () => {
    if (!fs.existsSync(RESERVATIONS_PATH)) fs.writeFileSync(RESERVATIONS_PATH, '[]', 'utf8');
    try {
        return JSON.parse(fs.readFileSync(RESERVATIONS_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeReservations = (data) => fs.writeFileSync(RESERVATIONS_PATH, JSON.stringify(data, null, 2), 'utf8');

// Middleware для обработки JSON и раздачи статики (HTML, CSS, JS)
app.use(express.json());
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка хранилища Multer для загружаемых картинок
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Настраиваем приём одного главного файла 'img' и нескольких файлов галереи 'gallery'
const upload = multer({ storage }).fields([
    { name: 'img', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);

// Вспомогательные функции для работы с JSON-базой данных
const readMenu = () => {
    if (!fs.existsSync(JSON_PATH)) fs.writeFileSync(JSON_PATH, '[]', 'utf8');
    try {
        return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeMenu = (data) => fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');

/* ─────────────────────────────────────────────────────────
   API ЭНДПОИНТЫ (МЕНЮ)
   ───────────────────────────────────────────────────────── */

// 1. Получить все блюда
app.get('/api/menu', (req, res) => {
    res.json(readMenu());
});

// 2. Добавить новое блюдо (POST)
app.post('/api/menu', upload, (req, res) => {
    try {
        const menu = readMenu();
        
        // Формируем пути к загруженным файлам
        let mainImgPath = '';
        if (req.files && req.files['img']) {
            mainImgPath = '/uploads/' + req.files['img'][0].filename;
        }

        let galleryPaths = [];
        if (req.files && req.files['gallery']) {
            galleryPaths = req.files['gallery'].map(file => '/uploads/' + file.filename);
        }

        const newDish = {
            id: Date.now(), // Уникальный числовой ID
            category: req.body.category || 'Без категории',
            name: req.body.name || 'Без названия',
            price: req.body.price ? `${req.body.price} ₽` : '0 ₽',
            weight: req.body.weight ? `${req.body.weight} г` : '',
            calories: req.body.calories ? `${req.body.calories} ккал` : '',
            desc: req.body.desc || '',
            img: mainImgPath,
            gallery: galleryPaths
        };

        menu.push(newDish);
        writeMenu(menu);
        res.status(201).json({ success: true, dish: newDish });
    } catch (err) {
        res.status(500).json({ error: 'Не удалось сохранить блюдо' });
    }
});

// 3. Редактировать блюдо (PUT)
app.put('/api/menu/:id', upload, (req, res) => {
    try {
        const id = Number(req.params.id);
        let menu = readMenu();
        const dishIndex = menu.findIndex(item => Number(item.id) === id);

        if (dishIndex === -1) {
            return res.status(404).json({ error: 'Блюдо не найдено' });
        }

        // Картинки, которые фронтенд просил оставить
        let mainImgPath = req.body.keptMainImg || '';
        let galleryPaths = req.body.keptGallery ? JSON.parse(req.body.keptGallery) : [];

        // Если загружены новые файлы — перезаписываем пути
        if (req.files && req.files['img']) {
            mainImgPath = '/uploads/' + req.files['img'][0].filename;
        }
        if (req.files && req.files['gallery']) {
            const newPhotos = req.files['gallery'].map(file => '/uploads/' + file.filename);
            galleryPaths = [...galleryPaths, ...newPhotos];
        }

        menu[dishIndex] = {
            ...menu[dishIndex],
            category: req.body.category,
            name: req.body.name,
            price: req.body.price ? `${parseInt(req.body.price)} ₽` : menu[dishIndex].price,
            weight: req.body.weight ? `${parseInt(req.body.weight)} г` : menu[dishIndex].weight,
            calories: req.body.calories ? `${parseInt(req.body.calories)} ккал` : menu[dishIndex].calories,
            desc: req.body.desc,
            img: mainImgPath,
            gallery: galleryPaths
        };

        writeMenu(menu);
        res.json({ success: true, dish: menu[dishIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при обновлении блюда' });
    }
});

// 4. Удалить блюдо (DELETE)
app.delete('/api/menu/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        let menu = readMenu();
        const initialLength = menu.length;
        
        menu = menu.filter(item => Number(item.id) !== id);
        
        if (menu.length === initialLength) {
            return res.status(404).json({ error: 'Блюдо не найдено' });
        }

        writeMenu(menu);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при удалении' });
    }
});

// 💡 Заглушка для бронирований, чтобы у фронтенда не падали запросы fetch('/api/reservations')
app.get('/api/reservations', (req, res) => {
    res.json(readReservations());
});

// 2. Изменить статус заявки (PATCH)
app.patch('/api/reservations/:id/status', (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        let reservations = readReservations();
        
        const bookingIndex = reservations.findIndex(b => Number(b.id) === id);
        if (bookingIndex === -1) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }

        reservations[bookingIndex].status = status;
        writeReservations(reservations);
        
        res.json({ success: true, reservation: reservations[bookingIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при обновлении статуса' });
    }
});

// 3. Создать новую заявку (этот эндпоинт пригодится для клиентской части сайта)
app.post('/api/reservations', (req, res) => {
    try {
        const reservations = readReservations();
        const newBooking = {
            id: Date.now(),
            name: req.body.name,
            phone: req.body.phone,
            guests: req.body.guests || '1',
            comment: req.body.comment || '',
            date: req.body.date, // формат YYYY-MM-DD
            time: req.body.time, // формат HH:MM
            status: 'ожидает ответа' // дефолтный статус
        };

        reservations.push(newBooking);
        writeReservations(reservations);
        res.status(201).json({ success: true, reservation: newBooking });
    } catch (err) {
        res.status(500).json({ error: 'Не удалось создать заявку' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 БЭКЕНД СЕРВЕРА RESTAURANT ЗАПУЩЕН!`);
    console.log(`🌍 Адрес панели управления: http://localhost:${PORT}/admin.html`);
    console.log(`==============================================\n`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`💥 ОШИБКА: Порт ${PORT} уже занят!`);
        console.error(`👉 Выполните в терминале: Stop-Process -Name node -Force`);
    } else {
        console.error('💥 Ошибка при запуске:', err);
    }
});