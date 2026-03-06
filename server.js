import express from 'express';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

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

// КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: добавляем allow_discovery: true
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true,  // ВАЖНО: разрешаем обнаружение пиров
  debug: true
});

app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log('📱 Клиент подключился:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('📱 Клиент отключился:', client.getId());
});

console.log('PeerJS server mounted on /peerjs with allow_discovery enabled');
