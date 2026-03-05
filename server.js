import express from 'express';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000; // Railway сам задает порт

// Включаем CORS для всех запросов - это решит вашу проблему!
app.use(cors());

// Создаем HTTP сервер
const server = app.listen(PORT, () => {
  console.log(`Сигнальный сервер запущен на порту ${PORT}`);
});

// Настраиваем PeerJS сервер
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true, // Позволяет получать список всех пиров (опционально)
});

// Монтируем PeerJS на путь /peerjs (как в примере)
app.use('/peerjs', peerServer);

// Простой тестовый маршрут, чтобы убедиться, что сервер жив
app.get('/', (req, res) => {
  res.send('Сигнальный сервер работает!');
});

// Опционально: логгирование подключений
peerServer.on('connection', (client) => {
  console.log('Клиент подключился:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('Клиент отключился:', client.getId());
});
