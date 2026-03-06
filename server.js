import express from 'express';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS - разрешаем запросы с любого домена
app.use(cors({
    origin: '*', // В продакшене лучше указать конкретные домены
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Добавляем middleware для всех запросов
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Обрабатываем preflight запросы
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Отдаем статические файлы из текущей папки
app.use(express.static(__dirname));

// Простой корневой маршрут для проверки
app.get('/', (req, res) => {
    res.send('✅ Сигнальный сервер работает!');
});

// Создаем HTTP сервер
const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Настраиваем PeerJS с поддержкой обнаружения пиров
const peerServer = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: true,  // Включаем обнаружение пиров
    debug: true
});

app.use('/peerjs', peerServer);

// Добавляем явный маршрут для получения списка пиров
app.get('/peerjs/peers', (req, res) => {
    // Этот маршрут должен возвращать список всех подключенных пиров
    res.json([]); // PeerJS сам обрабатывает этот маршрут через свой API
});

peerServer.on('connection', (client) => {
    console.log('📱 Клиент подключился:', client.getId());
});

peerServer.on('disconnect', (client) => {
    console.log('📱 Клиент отключился:', client.getId());
});

console.log('PeerJS server mounted on /peerjs with allow_discovery enabled');
