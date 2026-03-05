import express from 'express';
import { ExpressPeerServer } from 'peer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Простой корневой маршрут для проверки
app.get('/', (req, res) => {
  res.send('✅ Сигнальный сервер работает!');
});

// Создаем HTTP сервер
const server = app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Настраиваем PeerJS
const peerServer = ExpressPeerServer(server, {
  path: '/',
  allow_discovery: true
});

app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log('📱 Клиент подключился:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('📱 Клиент отключился:', client.getId());
});
