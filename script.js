<script type="module">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://dlvlruldmaomehvcdofx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdmxydWxkbWFvbWVodmNkb2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzQyMDAsImV4cCI6MjA5MDA1MDIwMH0.pwEQNa_yVGAg2SsQn92qyeZlCqF__303eoFxKkNvufA'; // ← твой реальный ключ

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentChannel = null;
let myPeerId = 'user-' + Math.random().toString(36).substring(2, 11);
let myName = 'User_' + Math.random().toString(36).substring(2, 6);
let localStream = null;
const peerConnections = new Map(); // peerId → RTCPeerConnection

// DOM
const roomIdInput = document.getElementById('roomIdInput');
const peerNameInput = document.getElementById('peerNameInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const connectionStatus = document.getElementById('connectionStatus');
const peersListDiv = document.getElementById('peersList');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const startVideoBtn = document.getElementById('startVideoBtn');
const stopVideoBtn = document.getElementById('stopVideoBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');

peerNameInput.value = myName;

function addMessage(text, isOwn = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    const name = isOwn ? 'Вы' : 'Пользователь';
    msgDiv.innerHTML = `<strong>${name}:</strong> ${text} <small>${new Date().toLocaleTimeString()}</small>`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUIAfterJoin() {
    joinBtn.disabled = true;
    leaveBtn.disabled = false;
    messageInput.disabled = false;
    sendMsgBtn.disabled = false;
    fileInput.disabled = false;
    sendFileBtn.disabled = false;
    startVideoBtn.disabled = false;
    connectionStatus.innerHTML = '🟢 Подключено';
    connectionStatus.style.color = '#0f0';
    addMessage('✅ Вы присоединились к комнате', true);
}

function updateUIAfterLeave() {
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
    messageInput.disabled = true;
    sendMsgBtn.disabled = true;
    fileInput.disabled = true;
    sendFileBtn.disabled = true;
    startVideoBtn.disabled = true;
    stopVideoBtn.disabled = true;
    connectionStatus.innerHTML = '🔴 Отключено';
    connectionStatus.style.color = 'red';
}

function updatePeersList(state) {
    const count = Object.keys(state || {}).length;
    peersListDiv.innerHTML = `👥 В комнате: ${count} участник${count !== 1 ? 'ов' : ''}`;
}

// ==================== JOIN ROOM ====================
joinBtn.addEventListener('click', async () => {
    const roomName = roomIdInput.value.trim() || 'test-room';
    myName = peerNameInput.value.trim() || myName;

    if (currentChannel) currentChannel.unsubscribe();

    currentChannel = supabase.channel(roomName, {
        config: { presence: { key: myPeerId } }
    });

    currentChannel.on('presence', { event: 'sync' }, () => {
        updatePeersList(currentChannel.presenceState());
    });

    currentChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => addMessage(`👋 ${p.name || 'Пользователь'} присоединился`));
    });

    currentChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (payload.peerId !== myPeerId) addMessage(payload.text);
    });

    currentChannel.on('broadcast', { event: 'file' }, ({ payload }) => {
        const blob = new Blob([payload.data], { type: payload.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = payload.name;
        a.textContent = `📎 Скачать файл: ${payload.name}`;
        a.style.display = 'block';
        messagesDiv.appendChild(a);
    });

    // WebRTC signaling
    currentChannel.on('broadcast', { event: 'webrtc' }, ({ payload }) => {
        handleWebRTCSignal(payload);
    });

    await currentChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            currentChannel.track({ peerId: myPeerId, name: myName });
            updateUIAfterJoin();
        }
    });
});

// ==================== SEND MESSAGE ====================
sendMsgBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChannel) return;

    await currentChannel.send({
        type: 'broadcast',
        event: 'chat',
        payload: { text, peerId: myPeerId }
    });

    addMessage(text, true);
    messageInput.value = '';
});

// ==================== SEND FILE ====================
sendFileBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file || !currentChannel) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        await currentChannel.send({
            type: 'broadcast',
            event: 'file',
            payload: {
                data: e.target.result,
                name: file.name,
                type: file.type || 'application/octet-stream'
            }
        });
        addMessage(`📎 Вы отправили файл: ${file.name}`, true);
        fileInput.value = '';
    };
    reader.readAsArrayBuffer(file);
});

// ==================== WebRTC (базовая сигнализация) ====================
async function handleWebRTCSignal(payload) {
    console.log('Received WebRTC signal:', payload);
    // Здесь будет полная реализация RTCPeerConnection — добавим в следующем шаге, если нужно
}

// Start/Stop Video — пока заглушка
startVideoBtn.addEventListener('click', () => {
    addMessage('🎥 Видеозвонок пока в разработке', true);
});

stopVideoBtn.addEventListener('click', () => {
    addMessage('⏹️ Видеозвонок остановлен', true);
});

leaveBtn.addEventListener('click', () => {
    if (currentChannel) currentChannel.unsubscribe();
    currentChannel = null;
    updateUIAfterLeave();
});

updateUIAfterLeave();
</script>
