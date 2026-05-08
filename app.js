// ============================================
// P2P Мессенджер с Supabase Realtime
// ============================================

import { createClient } from '@supabase/supabase-js';

// === КОНФИГУРАЦИЯ SUPABASE ===
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dlvlruldmaomehvcdofx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdmxydWxkbWFvbWVodmNkb2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzQyMDAsImV4cCI6MjA5MDA1MDIwMH0.pwEQNa_yVGAg2SsQn92qyeZlCqF__303eoFxKkNvufA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Глобальное состояние ===
let currentChannel = null;
let myPeerId = 'user-' + Math.random().toString(36).substring(2, 11);
let myName = localStorage.getItem('p2p_username') || 'User_' + Math.random().toString(36).substring(2, 6);
let localStream = null;
const peerConnections = new Map(); // peerId → RTCPeerConnection
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB лимит

// === DOM элементы ===
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
const fileProgress = document.getElementById('fileProgress');
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');

// Инициализация имени
peerNameInput.value = myName;

// Сохранение имени пользователя при изменении
peerNameInput.addEventListener('change', () => {
    const newName = peerNameInput.value.trim();
    if (newName) {
        myName = newName;
        localStorage.setItem('p2p_username', myName);
    }
});

// ============================================
// UI ФУНКЦИИ
// ============================================

function addMessage(text, peerId = null, isOwn = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    // XSS защита: экранируем HTML
    const safeText = text.replace(/&/g, '&amp;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;')
                         .replace(/"/g, '&quot;')
                         .replace(/'/g, '&#039;');
    
    const name = isOwn ? 'Вы' : (peerId ? peerId.substring(0, 8) : 'Система');
    msgDiv.innerHTML = `<strong>${name}:</strong> ${safeText} <small>${new Date().toLocaleTimeString()}</small>`;
    
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updatePeersList(state) {
    const count = Object.keys(state || {}).length;
    peersListDiv.innerHTML = `👥 В комнате: ${count} участник${count !== 1 ? 'ов' : ''}`;
}

function updateUIAfterJoin() {
    joinBtn.disabled = true;
    leaveBtn.disabled = false;
    messageInput.disabled = false;
    sendMsgBtn.disabled = false;
    fileInput.disabled = false;
    sendFileBtn.disabled = false;
    startVideoBtn.disabled = false;
    connectionStatus.innerHTML = '🟢 Подключено к комнате';
    connectionStatus.style.color = 'lime';
    addMessage('✅ Вы успешно присоединились к комнате', null, true);
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
    messagesDiv.innerHTML = '';
    remoteVideos.innerHTML = '';
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
}

// ============================================
// ПРИСОЕДИНЕНИЕ К КОМНАТЕ
// ============================================

joinBtn.addEventListener('click', async () => {
    const roomName = roomIdInput.value.trim() || 'test-room';
    myName = peerNameInput.value.trim() || myName;

    if (currentChannel) {
        currentChannel.unsubscribe();
    }

    console.log(`Попытка подключения к комнате: ${roomName}`);

    currentChannel = supabase.channel(roomName, {
        config: { presence: { key: myPeerId } }
    });

    // Presence events
    currentChannel.on('presence', { event: 'sync' }, () => {
        console.log('Presence sync:', currentChannel.presenceState());
        updatePeersList(currentChannel.presenceState());
    });

    currentChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New peer joined:', newPresences);
        newPresences.forEach(p => {
            addMessage(`👋 ${p.name || 'Пользователь'} присоединился`, null);
        });
    });

    currentChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Peer left:', leftPresences);
        leftPresences.forEach(p => {
            addMessage(`👋 ${p.name || 'Пользователь'} покинул комнату`, null);
        });
    });

    // Broadcast для чата
    currentChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (payload.peerId !== myPeerId) {
            addMessage(payload.text, payload.peerId, false);
        }
    });

    // Broadcast для файлов
    currentChannel.on('broadcast', { event: 'file' }, ({ payload }) => {
        if (payload.peerId !== myPeerId) {
            const blob = new Blob([payload.data], { type: payload.type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = payload.name;
            a.textContent = `📎 Скачать файл: ${payload.name}`;
            a.style.display = 'block';
            a.style.color = '#0066ff';
            a.style.marginTop = '5px';
            messagesDiv.appendChild(a);
            addMessage(`📎 Получен файл: ${payload.name}`, payload.peerId, false);
        }
    });

    // WebRTC signaling для видеозвонков
    currentChannel.on('broadcast', { event: 'webrtc-offer' }, handleWebRTCOffer);
    currentChannel.on('broadcast', { event: 'webrtc-answer' }, handleWebRTCAnswer);
    currentChannel.on('broadcast', { event: 'webrtc-ice-candidate' }, handleWebRTCIceCandidate);

    // Подписка
    const status = await currentChannel.subscribe(async (subStatus, err) => {
        console.log('Subscribe status:', subStatus);
        if (err) {
            console.error('Subscribe error:', err);
            addMessage(`❌ Ошибка подписки: ${err.message || 'Неизвестная ошибка'}`, null, true);
        }

        if (subStatus === 'SUBSCRIBED') {
            console.log('✅ Успешно подключены к Supabase Realtime');

            await currentChannel.track({
                peerId: myPeerId,
                name: myName
            });

            updateUIAfterJoin();
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
            addMessage('❌ Ошибка подключения к комнате. Проверьте консоль.', null, true);
        } else if (subStatus === 'CLOSED') {
            addMessage('🔴 Соединение закрыто', null, true);
            updateUIAfterLeave();
        }
    });
    
    // Обработка ошибок подписки
    status.then(subscription => {
        subscription.on('error', (error) => {
            console.error('Realtime connection error:', error);
            addMessage('⚠️ Ошибка соединения. Попытка переподключения...', null, true);
            
            // Автоматическое переподключение через 3 секунды
            setTimeout(() => {
                if (!currentChannel && roomIdInput.value.trim()) {
                    joinBtn.click();
                }
            }, 3000);
        });
    }).catch(err => {
        console.error('Subscription setup error:', err);
        addMessage('❌ Критическая ошибка подключения', null, true);
    });
});

// ============================================
// ОТПРАВКА СООБЩЕНИЙ
// ============================================

sendMsgBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChannel) return;

    await currentChannel.send({
        type: 'broadcast',
        event: 'chat',
        payload: { text, peerId: myPeerId }
    });

    addMessage(text, null, true);
    messageInput.value = '';
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMsgBtn.click();
});

// ============================================
// ОТПРАВКА ФАЙЛОВ
// ============================================

sendFileBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file || !currentChannel) return;

    // Проверка размера файла (макс. 2MB)
    if (file.size > MAX_FILE_SIZE) {
        addMessage(`❌ Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`, null, true);
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            await currentChannel.send({
                type: 'broadcast',
                event: 'file',
                payload: {
                    data: e.target.result,
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    senderPeerId: myPeerId
                }
            });
            addMessage(`📎 Вы отправили файл: ${file.name}`, null, true);
            fileInput.value = '';
        } catch (error) {
            addMessage('❌ Ошибка отправки файла', null, true);
            console.error('File send error:', error);
        }
    };
    reader.onerror = () => {
        addMessage('❌ Ошибка чтения файла', null, true);
    };
    reader.readAsArrayBuffer(file);
});

// ============================================
// ВИДЕОЗВОНОК (WebRTC)
// ============================================

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function startVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        stopVideoBtn.disabled = false;
        addMessage('🎥 Камера включена', null, true);

        // Создаем предложение для всех пиров в комнате
        const state = currentChannel.presenceState();
        const peerIds = Object.keys(state).filter(id => id !== myPeerId);

        for (const peerId of peerIds) {
            await createPeerConnection(peerId, true);
        }
    } catch (error) {
        addMessage('❌ Ошибка доступа к камере: ' + error.message, null, true);
        console.error('Video error:', error);
    }
}

async function stopVideo() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
    stopVideoBtn.disabled = true;

    // Закрываем все соединения
    peerConnections.forEach((pc, peerId) => {
        pc.close();
        peerConnections.delete(peerId);
    });

    addMessage('⏹️ Видеозвонок остановлен', null, true);
}

async function createPeerConnection(targetPeerId, isInitiator = false) {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(targetPeerId, pc);

    // Добавляем локальный поток
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    // Обработка удалённого потока
    pc.ontrack = (event) => {
        console.log('Received remote track from', targetPeerId);
        const video = document.createElement('video');
        video.id = `video-${targetPeerId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = event.streams[0];
        
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.appendChild(video);
        
        const label = document.createElement('span');
        label.textContent = targetPeerId.substring(0, 8);
        wrapper.appendChild(label);
        
        remoteVideos.appendChild(wrapper);
    };

    // ICE кандидаты
    pc.onicecandidate = (event) => {
        if (event.candidate && currentChannel) {
            currentChannel.send({
                type: 'broadcast',
                event: 'webrtc-ice-candidate',
                payload: {
                    candidate: event.candidate,
                    fromPeerId: myPeerId,
                    toPeerId: targetPeerId
                }
            });
        }
    };

    pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
        
        // Обработка ошибок WebRTC
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.warn('WebRTC connection failed for peer:', targetPeerId);
            addMessage('⚠️ Потеряно соединение с участником', null, true);
            
            // Удаляем видео элемент
            const videoElement = document.getElementById(`video-${targetPeerId}`);
            if (videoElement) {
                videoElement.closest('.video-wrapper')?.remove();
            }
            
            // Закрываем соединение и удаляем из мапы
            pc.close();
            peerConnections.delete(targetPeerId);
        } else if (pc.iceConnectionState === 'connected') {
            console.log('✅ WebRTC connection established with:', targetPeerId);
        }
    };

    // Если инициатор - создаём offer
    if (isInitiator) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await currentChannel.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: {
                    sdp: offer,
                    fromPeerId: myPeerId,
                    toPeerId: targetPeerId
                }
            });
        } catch (error) {
            console.error('Create offer error:', error);
        }
    }

    return pc;
}

async function handleWebRTCOffer({ payload }) {
    if (payload.toPeerId !== myPeerId) return;

    console.log('Received WebRTC offer from', payload.fromPeerId);

    const pc = await createPeerConnection(payload.fromPeerId, false);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await currentChannel.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: {
            sdp: answer,
            fromPeerId: myPeerId,
            toPeerId: payload.fromPeerId
        }
    });
}

async function handleWebRTCAnswer({ payload }) {
    if (payload.toPeerId !== myPeerId) return;

    console.log('Received WebRTC answer from', payload.fromPeerId);

    const pc = peerConnections.get(payload.fromPeerId);
    if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    }
}

async function handleWebRTCIceCandidate({ payload }) {
    if (payload.toPeerId !== myPeerId) return;

    const pc = peerConnections.get(payload.fromPeerId);
    if (pc && payload.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (error) {
            console.error('Add ICE candidate error:', error);
        }
    }
}

startVideoBtn.addEventListener('click', startVideo);
stopVideoBtn.addEventListener('click', stopVideo);

// ============================================
// ВЫХОД ИЗ КОМНАТЫ
// ============================================

leaveBtn.addEventListener('click', () => {
    if (currentChannel) {
        currentChannel.unsubscribe();
        currentChannel = null;
    }

    // Закрываем все WebRTC соединения
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();

    updateUIAfterLeave();
});

// ============================================
// PWA INSTALL PROMPT
// ============================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installPrompt.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
        installPrompt.style.display = 'none';
    }
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

updateUIAfterLeave();

console.log('🚀 P2P Messenger загружен');
console.log('Ваш Peer ID:', myPeerId);
