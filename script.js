// === НОВЫЙ script.js — Native Supabase Realtime + Presence ===

const SUPABASE_URL = 'https://dlvlruldmaomehvcdofx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...твой_реальный_anon_key...'; // ← вставь свой

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRoom = null;
let currentChannel = null;
let myPeerId = 'user-' + Math.random().toString(36).substring(2, 10);
let myName = 'User_' + Math.random().toString(36).substring(2, 6);
let peers = new Map(); // peerId → name

// DOM элементы (остаются как были)
const roomIdInput = document.getElementById('roomIdInput');
const peerNameInput = document.getElementById('peerNameInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
// ... все остальные элементы (messages, video и т.д.) остаются без изменений

peerNameInput.value = myName;

// === Присоединение к комнате ===
joinBtn.addEventListener('click', async () => {
    const roomName = roomIdInput.value.trim() || 'test-room';
    myName = peerNameInput.value.trim() || myName;

    if (currentChannel) currentChannel.unsubscribe();

    currentChannel = supabase.channel(roomName, { config: { presence: { key: myPeerId } } });

    // Presence (список пиров)
    currentChannel.on('presence', { event: 'sync' }, () => {
        const newState = currentChannel.presenceState();
        peers.clear();
        Object.values(newState).flat().forEach(p => {
            peers.set(p.peerId, p.name);
        });
        updatePeersList();
    });

    currentChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => {
            peers.set(p.peerId, p.name);
            addMessage(`👋 ${p.name} присоединился`, null);
        });
        updatePeersList();
    });

    currentChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach(p => {
            peers.delete(p.peerId);
            addMessage(`👋 ${p.name} покинул комнату`, null);
        });
        updatePeersList();
    });

    // Broadcast (чат, файлы, WebRTC-сигналы)
    currentChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        addMessage(payload.text, payload.peerId, false);
    });

    currentChannel.on('broadcast', { event: 'webrtc' }, ({ payload }) => {
        // сюда придут offer, answer, ice-candidate
        console.log('WebRTC signal received:', payload);
        // TODO: обработка WebRTC (добавим позже)
    });

    await currentChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            console.log('✅ Подключились к комнате', roomName);

            // Отправляем своё presence
            await currentChannel.track({
                peerId: myPeerId,
                name: myName
            });

            updateUIAfterJoin();
            addMessage(`Вы присоединились к комнате "${roomName}"`, null, true);
        }
    });
});

// Вспомогательные функции (updatePeersList, addMessage и т.д.) — оставь как были, только слегка адаптируй

function updatePeersList() {
    const list = Array.from(peers.values()).join(', ') || 'только вы';
    peersListDiv.innerHTML = `👥 Пиры: ${list}`;
}

// sendMessage, sendFile, startVideoBtn — адаптируем под broadcast
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

// Аналогично для файлов и WebRTC — будем использовать broadcast

leaveBtn.addEventListener('click', () => {
    if (currentChannel) currentChannel.unsubscribe();
    currentChannel = null;
    updateUIAfterLeave();
});
