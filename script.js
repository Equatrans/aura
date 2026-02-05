// script.js
let username = localStorage.getItem('username');
if (!username) {
    username = prompt('Введите ваше имя:') || 'Аноним';
    localStorage.setItem('username', username);
}
let currentChatId = localStorage.getItem('currentChatId') || 0;
let chats = [];

// Константа для максимальной длины сообщения (должна совпадать с сервером)
const MAX_MESSAGE_LENGTH = 4096;

// Функции для форм
function toggleCreateForm() {
    const form = document.getElementById('createForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function toggleJoinForm() {
    const form = document.getElementById('joinForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

// Функции для модалок
function showModal(id) {
    document.getElementById('modalOverlay').style.display = 'block';
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById(id).style.display = 'none';
}

function showError(msg) {
    document.getElementById('errorMessage').textContent = msg;
    showModal('errorModal');
}

function copyToClipboard(elementId) {
    const textElement = document.getElementById(elementId);
    const text = textElement.textContent || textElement.innerText;
    navigator.clipboard.writeText(text)
        .then(() => {
            const toast = document.getElementById('toast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        })
        .catch(err => {
            console.error('Ошибка копирования:', err);
            showError('Не удалось скопировать\nПопробуйте выделить текст вручную');
        });
}

// Создание и присоединение
function createChat() {
    const name = document.getElementById('chatName').value.trim();
    if (!name) return showError('Введите имя чата');
    fetch('server.php?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, name })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            document.getElementById('modalChatName').textContent = name;
            document.getElementById('modalChatId').textContent = data.chatId;
            document.getElementById('modalPassword').textContent = data.password;
            showModal('createSuccessModal');
            loadChats();
            toggleCreateForm();
            document.getElementById('chatName').value = '';
        } else showError('Не удалось создать чат');
    }).catch(() => showError('Ошибка соединения'));
}

function joinChat() {
    const chatId = document.getElementById('joinChatId').value.trim();
    const password = document.getElementById('joinPassword').value.trim();
    if (!chatId || !password) return showError('Введите ID чата и пароль');
    fetch('server.php?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, password, user: username })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            showModal('joinSuccessModal');
            loadChats();
            toggleJoinForm();
            document.getElementById('joinChatId').value = '';
            document.getElementById('joinPassword').value = '';
        } else showError(data.error || 'Неверный пароль или ID чата');
    }).catch(() => showError('Ошибка соединения'));
}

// Загрузка чатов
function loadChats() {
    fetch('server.php?action=getChats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username })
    }).then(res => res.json()).then(data => {
        chats = data;
        const list = document.getElementById('chatList');
        list.innerHTML = '';
        data.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item' + (chat.id == currentChatId ? ' selected' : '');
            div.textContent = chat.name;
            div.onclick = () => switchChat(chat.id);
            list.appendChild(div);
        });

        // Если есть текущий чат — обновляем заголовок и видимость кнопок
        if (currentChatId) {
            switchChat(currentChatId);
        } else if (data.length > 0) {
            switchChat(data[0].id);
        } else {
            document.getElementById('chatTitleText').textContent = 'Aura';
            document.getElementById('edit-chat-name-btn').style.display = 'none';
            document.getElementById('delete-chat-btn').style.display = 'none';
        }
    });
}

function switchChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    const chat = chats.find(c => c.id === chatId);
    const title = chat?.name || 'Чат';
    document.getElementById('chatTitleText').textContent = title;

    // Показываем кнопки только если пользователь — админ
    const editBtn = document.getElementById('edit-chat-name-btn');
    const deleteBtn = document.getElementById('delete-chat-btn');
    
    if (chat && chat.admin === username) {
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'block';
    } else {
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }

    document.getElementById('messages').innerHTML = '';
    loadMessages();
    fetchTyping();  // ← добавляем

    if (window.innerWidth <= 860) toggleSidebar();
}

// Отправка и загрузка сообщений
function sendMessage() {
    if (!currentChatId) return showError('Выберите чат');
    const msgInput = document.getElementById('message');
    const message = msgInput.value.trim();
    if (!message) return;

    fetch('server.php?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, user: username, message })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            msgInput.value = '';
            updateCharCounter(); // сбрасываем счётчик после отправки
            loadMessages();
        } else showError(data.error);
    }).catch(() => showError('Ошибка соединения'));
}

function loadMessages(lastId = 0) {
    if (!currentChatId) return;
    fetch(`server.php?action=get&chatId=${currentChatId}&lastId=${lastId}&limit=50&user=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return showError(data.error);
            const messagesDiv = document.getElementById('messages');
            const shouldScroll = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 50;

            data.forEach(msg => {
                if (document.getElementById(`msg-${msg.id}`)) return;

                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.user === username ? 'outgoing' : 'incoming'}`;
                messageDiv.id = `msg-${msg.id}`;

                const userDiv = document.createElement('div');
                userDiv.className = 'msg-user';
                userDiv.textContent = msg.user;

                const textDiv = document.createElement('div');
                textDiv.textContent = msg.message;

                const timeDiv = document.createElement('div');
                timeDiv.className = 'msg-time';
                timeDiv.textContent = new Date(msg.timestamp * 1000).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                messageDiv.appendChild(userDiv);
                messageDiv.appendChild(textDiv);
                messageDiv.appendChild(timeDiv);

                messagesDiv.appendChild(messageDiv);
            });

            if (shouldScroll) messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }).catch(() => showError('Ошибка загрузки сообщений'));
}

// Счётчик символов и управление кнопкой отправки
const messageInput = document.getElementById('message');
const charCounter = document.getElementById('char-counter');
const sendBtn = document.getElementById('send-btn');

function updateCharCounter() {
    const length = messageInput.value.length;
    charCounter.textContent = `${length} / ${MAX_MESSAGE_LENGTH}`;

    charCounter.classList.remove('warning', 'danger');

    if (length > MAX_MESSAGE_LENGTH * 0.95) {
        charCounter.classList.add('danger');
    } else if (length > MAX_MESSAGE_LENGTH * 0.80) {
        charCounter.classList.add('warning');
    }

    sendBtn.disabled = (length === 0 || length > MAX_MESSAGE_LENGTH);
}

// Обработчики для счётчика и Enter
messageInput.addEventListener('input', updateCharCounter);

// Отправка по Enter (без Shift)
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
});

// Инициализация счётчика при загрузке страницы
updateCharCounter();

// Сайдбар
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    sidebar.classList.toggle('hidden');
}

// Закрытие модалок и сайдбара при клике вне области
document.getElementById('modalOverlay').addEventListener('click', () => {
    closeModal('createSuccessModal');
    closeModal('joinSuccessModal');
    closeModal('errorModal');
    closeModal('deleteChatConfirmModal');
    closeModal('editChatNameModal');
});

document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    if (window.innerWidth > 860) return;
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('active')) {
        toggleSidebar();
    }
});

// Автообновление сообщений
setInterval(() => {
    const lastMsg = document.querySelector('#messages > div:last-child');
    const lastId = lastMsg ? parseInt(lastMsg.id.split('-')[1]) : 0;
    loadMessages(lastId);
}, 2000);

// Удаление текущего чата с подтверждением
function deleteCurrentChat() {
    if (!currentChatId) {
        showError('Нет активного чата');
        return;
    }

    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        showError('Чат не найден');
        return;
    }

    // Заполняем имя чата в модальном окне
    document.getElementById('deleteChatName').textContent = chat.name;

    // Показываем окно подтверждения
    showModal('deleteChatConfirmModal');
}

// Функция, которая выполняется при нажатии "Удалить" в модальном окне
function confirmDeleteChat() {
    closeModal('deleteChatConfirmModal');

    fetch('server.php?action=deleteChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, user: username })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Сбрасываем текущий чат
            currentChatId = 0;
            localStorage.removeItem('currentChatId');

            // Обновляем список чатов
            loadChats();

            // Очищаем область сообщений и заголовок
            document.getElementById('messages').innerHTML = '';
            document.getElementById('chatTitleText').textContent = 'Aura';
            document.getElementById('delete-chat-btn').style.display = 'none';
            document.getElementById('edit-chat-name-btn').style.display = 'none';

            // Показываем уведомление об успешном удалении
            const toast = document.getElementById('toast');
            toast.textContent = 'Чат успешно удалён';
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                toast.textContent = 'Скопировано в буфер обмена'; // возвращаем дефолтный текст
            }, 2500);
        } else {
            showError(data.error || 'Не удалось удалить чат');
        }
    })
    .catch(() => {
        showError('Ошибка соединения при удалении чата');
    });
}

function openEditChatNameModal() {
    if (!currentChatId) return;

    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.admin !== username) {
        showError('Редактировать название может только администратор');
        return;
    }

    // Заполняем текущее название
    document.getElementById('currentChatNameDisplay').textContent = chat.name;
    document.getElementById('newChatNameInput').value = chat.name;

    showModal('editChatNameModal');
}

function saveChatName() {
    const newName = document.getElementById('newChatNameInput').value.trim();
    
    if (!newName) {
        showError('Название не может быть пустым');
        return;
    }
    
    if (newName.length > 100) {
        showError('Название слишком длинное (максимум 100 символов)');
        return;
    }

    fetch('server.php?action=renameChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chatId: currentChatId, 
            user: username, 
            newName: newName 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeModal('editChatNameModal');
            
            // Обновляем локально
            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                chat.name = newName;
            }
            
            // Обновляем интерфейс
            document.getElementById('chatTitleText').textContent = newName;
            loadChats();  // обновляем список слева
            
            // Уведомление
            const toast = document.getElementById('toast');
            toast.textContent = 'Название чата изменено';
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                toast.textContent = 'Скопировано в буфер обмена';
            }, 2200);
        } else {
            showError(data.error || 'Не удалось изменить название');
        }
    })
    .catch(() => showError('Ошибка соединения'));
}

function uploadAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('user', username);  // ← передаём имя пользователя

        try {
            const res = await fetch('server.php?action=uploadAvatar', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Сервер ответил:', res.status, errorText);
                showError(`Ошибка сервера: ${res.status}`);
                return;
            }

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('avatarUrl', data.avatarUrl);
                const toast = document.getElementById('toast');
                toast.textContent = 'Аватарка успешно загружена!';
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                    toast.textContent = 'Скопировано в буфер обмена';
                }, 2500);
            } else {
                showError(data.error || 'Ошибка загрузки аватарки');
            }
        } catch (err) {
            console.error(err);
            showError('Ошибка соединения при загрузке');
        }
    };
    input.click();
}


// Индикатор "печатает..."
let typingTimeout = null;

messageInput.addEventListener('input', () => {
    if (messageInput.value.trim().length > 0) {
        sendTyping(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => sendTyping(false), 5000);
    } else {
        sendTyping(false);
    }
});

function sendTyping(typing) {
    fetch('server.php?action=setTyping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, user: username, typing })
    });
}

// В loadMessages добавь получение typing
function loadMessages(lastId = 0) {
    // ... существующий код ...

    // Получаем typing после загрузки сообщений
    fetchTyping();
}

// Отдельная функция для typing (вызывается в интервале)
function fetchTyping() {
    fetch('server.php?action=getTyping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId })
    }).then(res => res.json()).then(data => {
        const typingDiv = document.getElementById('typing-indicator') || createTypingDiv();
        const typingUsers = data.typingUsers.filter(u => u !== username); // исключаем себя

        if (typingUsers.length > 0) {
            typingDiv.textContent = `${typingUsers.join(', ')} печатает...`;
            typingDiv.style.display = 'block';
        } else {
            typingDiv.style.display = 'none';
        }
    });
}

function createTypingDiv() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.style.padding = '8px';
    div.style.color = '#8e8e93';
    div.style.fontSize = '14px';
    div.style.fontStyle = 'italic';
    document.getElementById('messages').appendChild(div);
    return div;
}

// В интервал автообновления добавь fetchTyping
setInterval(() => {
    const lastMsg = document.querySelector('#messages > div:last-child');
    const lastId = lastMsg ? parseInt(lastMsg.id.split('-')[1]) : 0;
    loadMessages(lastId);
    fetchTyping();
}, 2000);


// ────────────────────────────────────────────────
// WebRTC: P2P для файлов, звонков, видео, гиф
// ────────────────────────────────────────────────
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]  // Бесплатный STUN
};

let peerConnection = null;
let dataChannel = null;

// Инициация звонка (аудио или видео)
function startCall(type = 'audio') {
    if (!currentChatId) return showError('Выберите чат');

    navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true })
        .then(stream => {
            document.getElementById('localVideo').srcObject = stream;
            document.getElementById('localVideo').style.display = 'block';

            peerConnection = new RTCPeerConnection(config);

            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            dataChannel = peerConnection.createDataChannel('chatData');  // Для файлов/гиф

            peerConnection.onicecandidate = e => {
                if (e.candidate) sendSignal('ice', e.candidate);
            };

            peerConnection.ontrack = e => {
                document.getElementById('remoteVideo').srcObject = e.streams[0];
                document.getElementById('remoteVideo').style.display = 'block';
            };

            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => sendSignal('offer', peerConnection.localDescription));
        })
        .catch(err => showError('Доступ к камере/микрофону запрещён'));
}

// Отправка файла/гиф через DataChannel
function sendFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
        const file = input.files[0];
        if (!file) return;

        if (!dataChannel || dataChannel.readyState !== 'open') {
            showError('P2P-соединение не установлено');
            return;
        }

        // Разбиваем файл на чанки (по 64KB)
        const chunkSize = 65536;
        let offset = 0;
        dataChannel.send(JSON.stringify({ type: 'fileStart', name: file.name, size: file.size }));

        const reader = new FileReader();
        reader.onload = e => {
            dataChannel.send(e.target.result);
            offset += e.target.result.byteLength;
            if (offset < file.size) {
                readSlice(offset);
            } else {
                dataChannel.send(JSON.stringify({ type: 'fileEnd' }));
            }
        };

        function readSlice(o) {
            const slice = file.slice(offset, o + chunkSize);
            reader.readAsArrayBuffer(slice);
        }

        readSlice(0);
    };
    input.click();
}

// Функции сигнализации
function sendSignal(type, data) {
    fetch('server.php?action=signalWebRTC', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, user: username, type, data })
    });
}

setInterval(fetchSignals, 1000);  // Polling сигналов каждую секунду

function fetchSignals() {
    if (!currentChatId) return;

    fetch('server.php?action=getWebRTCSignals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, user: username })
    }).then(res => res.json()).then(data => {
        Object.entries(data.signals).forEach(([fromUser, signal]) => {
            if (signal.offer && !peerConnection.remoteDescription) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer))
                    .then(() => peerConnection.createAnswer())
                    .then(answer => peerConnection.setLocalDescription(answer))
                    .then(() => sendSignal('answer', peerConnection.localDescription));
            }

            if (signal.answer) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
            }

            if (signal.ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        });
    });
}

// Получение файлов через DataChannel
peerConnection.ondatachannel = e => {
    const channel = e.channel;
    let receiveBuffer = [];
    let receivedSize = 0;
    let fileName = '';
    let fileSize = 0;

    channel.onmessage = msg => {
        if (typeof msg.data === 'string') {
            const data = JSON.parse(msg.data);
            if (data.type === 'fileStart') {
                fileName = data.name;
                fileSize = data.size;
                receiveBuffer = [];
                receivedSize = 0;
            } else if (data.type === 'fileEnd') {
                const blob = new Blob(receiveBuffer);
                const url = URL.createObjectURL(blob);
                showFileLink(fileName, url);
            }
        } else {
            receiveBuffer.push(msg.data);
            receivedSize += msg.data.byteLength;
            // Обновление прогресса, если нужно
        }
    };
};

// Показать полученный файл (ссылка на скачивание)
function showFileLink(name, url) {
    const div = document.createElement('div');
    div.className = 'message incoming';
    div.innerHTML = `<a href="${url}" download="${name}">Скачать файл: ${name}</a>`;
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// Инициализация при загрузке страницы
window.onload = () => {
    loadChats();
    loadMessages();
};


// Инициализация при загрузке страницы
window.onload = () => {
    loadChats();
    loadMessages();
};