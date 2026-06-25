const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5500;

// Подключаемся к базе данных
const DB_PATH = path.join(__dirname, 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

const JSON_PATH = path.join(__dirname, 'menu.json');

// Инициализация таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY,
        category TEXT,
        name TEXT,
        price TEXT,
        weight TEXT,
        calories TEXT,
        desc TEXT,
        img TEXT,
        gallery TEXT
    )`);

    // Добавили поле created_at в таблицу бронирований
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY,
        name TEXT,
        phone TEXT,
        date TEXT,
        time TEXT,
        guests TEXT,
        comment TEXT,
        status TEXT,
        created_at TEXT 
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS special_offers (
        dish_id INTEGER PRIMARY KEY
    )`);

    // Авто-перенос меню из JSON (если база пустая)
    db.get("SELECT COUNT(*) as count FROM menu", (err, row) => {
        if (!err && row.count === 0 && fs.existsSync(JSON_PATH)) {
            try {
                const localMenu = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                const stmt = db.prepare(`INSERT INTO menu (id, category, name, price, weight, calories, desc, img, gallery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                localMenu.forEach(item => {
                    stmt.run([
                        item.id, item.category, item.name, item.price, 
                        item.weight, item.calories, item.desc, item.img, 
                        JSON.stringify(item.gallery || [])
                    ]);
                });
                stmt.finalize();
                console.log('📌 Данные меню успешно перенесены в SQLite!');
            } catch (e) { console.error('Ошибка миграции меню:', e); }
        }
    });
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка Multer
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

const upload = multer({ storage }).fields([
    { name: 'img', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
]);

/* ─────────────────────────────────────────────────────────
   API ЭНДПОИНТЫ (МЕНЮ)
   ───────────────────────────────────────────────────────── */

app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка чтения из БД' });
        const menu = rows.map(row => ({
            ...row,
            gallery: JSON.parse(row.gallery || '[]')
        }));
        res.json(menu);
    });
});

app.post('/api/menu', upload, (req, res) => {
    try {
        let mainImgPath = '';
        if (req.files && req.files['img']) mainImgPath = '/uploads/' + req.files['img'][0].filename;

        let galleryPaths = [];
        if (req.files && req.files['gallery']) galleryPaths = req.files['gallery'].map(file => '/uploads/' + file.filename);

        const id = Date.now();
        const category = req.body.category || 'Без категории';
        const name = req.body.name || 'Без названия';
        const price = req.body.price ? `${req.body.price} ₽` : '0 ₽';
        const weight = req.body.weight ? `${req.body.weight} г` : '';
        const calories = req.body.calories ? `${req.body.calories} ккал` : '';
        const desc = req.body.desc || '';

        db.run(
            `INSERT INTO menu (id, category, name, price, weight, calories, desc, img, gallery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, category, name, price, weight, calories, desc, mainImgPath, JSON.stringify(galleryPaths)],
            function(err) {
                if (err) return res.status(500).json({ error: 'Не удалось сохранить в БД' });
                res.status(201).json({ success: true, dish: { id, category, name, price, weight, calories, desc, img: mainImgPath, gallery: galleryPaths } });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Не удалось сохранить блюдо' });
    }
});

app.put('/api/menu/:id', upload, (req, res) => {
    const id = Number(req.params.id);
    db.get("SELECT * FROM menu WHERE id = ?", [id], (err, currentDish) => {
        if (err || !currentDish) return res.status(404).json({ error: 'Блюдо не найдено в БД' });

        let mainImgPath = req.body.keptMainImg || '';
        let galleryPaths = req.body.keptGallery ? JSON.parse(req.body.keptGallery) : [];

        if (req.files && req.files['img']) mainImgPath = '/uploads/' + req.files['img'][0].filename;
        if (req.files && req.files['gallery']) {
            const newPhotos = req.files['gallery'].map(file => '/uploads/' + file.filename);
            galleryPaths = [...galleryPaths, ...newPhotos];
        }

        const price = req.body.price ? `${parseInt(req.body.price)} ₽` : currentDish.price;
        const weight = req.body.weight ? `${parseInt(req.body.weight)} г` : currentDish.weight;
        const calories = req.body.calories ? `${parseInt(req.body.calories)} ккал` : currentDish.calories;

        db.run(
            `UPDATE menu SET category = ?, name = ?, price = ?, weight = ?, calories = ?, desc = ?, img = ?, gallery = ? WHERE id = ?`,
            [req.body.category, req.body.name, price, weight, calories, req.body.desc, mainImgPath, JSON.stringify(galleryPaths), id],
            function(err) {
                if (err) return res.status(500).json({ error: 'Ошибка при обновлении БД' });
                res.json({ success: true, dish: { id, category: req.body.category, name: req.body.name, price, weight, calories, desc: req.body.desc, img: mainImgPath, gallery: galleryPaths } });
            }
        );
    });
});

app.delete('/api/menu/:id', (req, res) => {
    const id = Number(req.params.id);
    db.run("DELETE FROM menu WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка при удалении' });
        res.json({ success: true });
    });
});

/* ─────────────────────────────────────────────────────────
   API ЭНДПОИНТЫ (СПЕЦ. ПРЕДЛОЖЕНИЯ)
   ───────────────────────────────────────────────────────── */

// 1. Получить ID всех блюд в спец. предложениях
app.get('/api/special-offers', (req, res) => {
    db.all("SELECT dish_id FROM special_offers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка чтения спец. предложений' });
        // Возвращаем просто чистый массив ID: [17193, 17195, ...]
        const ids = rows.map(row => row.dish_id);
        res.json(ids);
    });
});

// 2. Добавить блюдо в спец. предложения
app.post('/api/special-offers', (req, res) => {
    const { dish_id } = req.body;
    if (!dish_id) return res.status(400).json({ error: 'Не указан ID блюда' });

    db.run("INSERT OR IGNORE INTO special_offers (dish_id) VALUES (?)", [Number(dish_id)], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка добавления в спец. предложения' });
        res.json({ success: true });
    });
});

// 3. Удалить блюдо из спец. предложений
app.delete('/api/special-offers/:id', (req, res) => {
    const dish_id = Number(req.params.id);
    db.run("DELETE FROM special_offers WHERE dish_id = ?", [dish_id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка удаления из спец. предложений' });
        res.json({ success: true });
    });
});

/* ─────────────────────────────────────────────────────────
   API ЭНДПОИНТЫ (ЗАЯВКИ / БРОНИРОВАНИЯ)
   ───────────────────────────────────────────────────────── */

// 1. Получить все заявки
app.get('/api/reservations', (req, res) => {
    db.all("SELECT * FROM reservations", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка чтения заявок из БД' });
        res.json(rows);
    });
});

// 2. Изменить статус заявки (PATCH)
app.patch('/api/reservations/:id/status', (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    db.run("UPDATE reservations SET status = ? WHERE id = ?", [status, id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка при обновлении статуса' });
        db.get("SELECT * FROM reservations WHERE id = ?", [id], (err, row) => {
            if (err) return res.status(500).json({ error: 'Ошибка получения данных' });
            res.json({ success: true, reservation: row });
        });
    });
});

// 3. Создать новую заявку (POST) — ТЕПЕРЬ С АВТО-ДАТОЙ СОЗДАНИЯ
app.post('/api/reservations', (req, res) => {
    const id = Date.now();
    const { name, phone, guests, comment, date, time } = req.body;
    const status = 'ожидает ответа';
    
    // Автоматически генерируем текущую дату и время сервера в читаемом формате
    const created_at = new Date().toLocaleString('ru-RU'); 

    db.run(
        `INSERT INTO reservations (id, name, phone, date, time, guests, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, phone, date, time, guests || '1', comment || '', status, created_at],
        function(err) {
            if (err) return res.status(500).json({ error: 'Не удалось создать заявку в БД' });
            res.status(201).json({ 
                success: true, 
                reservation: { id, name, phone, date, time, guests, comment, status, created_at } 
            });
        }
    );
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 БЭКЕНД НА СУБД SQLITE ЗАПУЩЕН!`);
    console.log(`🌍 Адрес панели управления: http://localhost:${PORT}/admin.html`);
    console.log(`==============================================\n`);
});