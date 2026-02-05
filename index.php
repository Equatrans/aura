<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Aura</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-main: #e4e7ec;
            --bg-chat: #ffffff;
            --bg-sidebar: #f0f2f5;
            --color-primary: #2481cc;
            --color-accent: #3390db;
            --incoming-bg: #ffffff;
            --outgoing-bg: #d9f0ff;
            --text-primary: #000;
            --text-secondary: #525252;
            --text-time: #8e8e93;
            --border-light: #e0e0e0;
            --vh: 1vh;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: var(--bg-main);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100dvh;
            min-height: -webkit-fill-available;
            overflow: hidden;
            color: var(--text-primary);
            height: calc(var(--vh, 1vh) * 100);
        }

        #chat {
            height: 100dvh;
            min-height: -webkit-fill-available;
            width: 100%;
            display: flex;
            background: var(--bg-chat);
            height: calc(var(--vh, 1vh) * 100);
        }

        #sidebar {
            width: 280px;
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border-light);
            display: flex;
            flex-direction: column;
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1000;
            transform: translateX(0);
        }

        #sidebar.hidden {
            transform: translateX(-100%);
        }

        #sidebar-header {
            padding: 16px 16px;
            background: var(--color-primary);
            color: white;
            font-size: 18px;
            font-weight: 500;
        }

        #sidebar-actions {
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        #sidebar button {
            background: transparent;
            border: none;
            padding: 12px 16px;
            border-radius: 10px;
            text-align: left;
            font-size: 15px;
            color: var(--color-primary);
            cursor: pointer;
        }

        #sidebar button:hover { background: rgba(0,0,0,0.06); }

        .form-container {
            background: white;
            border-radius: 10px;
            padding: 14px;
            margin: 0 12px 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .form-container input {
            width: 100%;
            padding: 11px;
            margin-bottom: 10px;
            border: 1px solid #d0d0d0;
            border-radius: 8px;
            font-size: 15px;
        }

        .form-container button {
            width: 100%;
            padding: 11px;
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 500;
        }

        #chatList .chat-item {
            padding: 14px 16px;
            cursor: pointer;
            border-bottom: 1px solid rgba(0,0,0,0.04);
            font-size: 15px;
            font-weight: 500;
        }

        #chatList .chat-item:hover,
        #chatList .chat-item.selected {
            background: #e3f2ff;
        }

        #main {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            height: 100dvh;
            min-height: -webkit-fill-available;
            height: calc(var(--vh, 1vh) * 100);
        }

        #header {
            background: var(--color-primary);
            color: white;
            padding: 12px 16px;
            font-size: 17px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
            z-index: 10;
        }

        #menu-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
        }

        #header .title {
            flex: 1;
        }

        #messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            background: url('https://web.telegram.org/a/img/Telegram-pattern-dark.svg') repeat;
            background-size: 320px;
            background-color: #e4e7ec;
            display: flex;
            flex-direction: column;
        }

        .message {
            max-width: 74%;
            margin-bottom: 8px;
            padding: 9px 14px;
            border-radius: 18px;
            position: relative;
            font-size: 15.2px;
            line-height: 1.38;
        }

        .incoming {
            background: var(--incoming-bg);
            align-self: flex-start;
            border-bottom-left-radius: 6px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .outgoing {
            background: var(--outgoing-bg);
            align-self: flex-end;
            border-bottom-right-radius: 6px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        }

        .incoming::before,
        .outgoing::before {
            content: "";
            position: absolute;
            bottom: 0;
            width: 10px;
            height: 10px;
        }

        .incoming::before { left: -6px; background: radial-gradient(circle at 0 100%, transparent 11px, var(--incoming-bg) 11px); }
        .outgoing::before  { right: -6px; background: radial-gradient(circle at 100% 100%, transparent 11px, var(--outgoing-bg) 11px); }

        .msg-user {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-primary);
            margin-bottom: 4px;
        }

        .msg-time {
            font-size: 11.5px;
            color: var(--text-time);
            text-align: right;
            margin-top: 4px;
        }

        #input {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            background: var(--bg-sidebar);
            border-top: 1px solid var(--border-light);
        }

        #input input {
            flex: 1;
            padding: 12px 18px;
            background: #f0f0f0;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
        }

        #input button {
            background: none;
            border: none;
            font-size: 26px;
            color: var(--color-primary);
            cursor: pointer;
            padding: 8px 12px;
        }

        /* Адаптив */
        @media (max-width: 860px) {
            #sidebar {
                transform: translateX(-100%);
                width: 80vw;
                max-width: 320px;
                box-shadow: 2px 0 12px rgba(0,0,0,0.25);
            }

            #sidebar.active {
                transform: translateX(0);
            }

            #menu-btn { display: block; }
            #sidebar-header { font-size: 19px; }
        }

        @media (min-width: 861px) {
            #menu-btn { display: none; }
            #sidebar { position: relative; transform: translateX(0) !important; }
        }

        @media (max-width: 500px) {
            .message { max-width: 82%; font-size: 15px; }
            #input input { font-size: 15.5px; padding: 11px 16px; }
        }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            backdrop-filter: blur(4px);
        }

        .modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            width: 90%;
            max-width: 380px;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        }

        .modal-content {
            padding: 24px 20px;
            text-align: center;
        }

        .modal-content h3 {
            margin: 0 0 16px;
            font-size: 20px;
            font-weight: 600;
        }

        .modal-content p {
            margin: 0 0 16px;
            font-size: 15px;
            color: #333;
        }

        .password-box {
            background: #f5f5f5;
            padding: 12px 16px;
            border-radius: 10px;
            margin: 12px 0 20px;
            font-family: monospace;
            font-size: 16px;
            word-break: break-all;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .copy-btn {
            background: var(--color-primary);
            color: white;
            border: none;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
        }

        .modal-close {
            background: var(--color-primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
        }

        .modal-content.error h3 {
            color: #d32f2f;
        }

        .modal-content.error .modal-close {
            background: #d32f2f;
        }

        /* Toast уведомление */
        #toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 500;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        #toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(-10px);
        }

        /* Иконка копирования */
        .copy-icon {
            width: 18px;
            height: 18px;
            fill: white;
            margin-right: 6px;
        }

        .copy-icon:hover {
            opacity: 0.85;
        }
        .input-wrapper {
            position: relative;
            flex: 1;
            display: flex;
            align-items: center;
        }

        #message {
            flex: 1;
            padding: 12px 80px 12px 18px;
            background: #f0f0f0;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
            resize: none;           /* отключаем ручной ресайз */
            min-height: 44px;
            max-height: 120px;
            line-height: 1.4;
        }
        #message:focus {
            background: #ffffff;
            box-shadow: 0 0 0 2px rgba(36,129,204,0.2);
        }


        .char-counter {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 13px;
            color: #8e8e93;
            pointer-events: none;
            user-select: none;
        }

        .char-counter.warning { color: #f59e0b; }
        .char-counter.danger   { color: #ef4444; }

        #send-btn {
            background: none;
            border: none;
            font-size: 26px;
            color: var(--color-primary);
            cursor: pointer;
            padding: 8px 12px;
            transition: opacity 0.2s;
        }

        #send-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .modal-content p strong {
            color: var(--color-primary);
        }

        /* Дополнительно для кнопок в модалке удаления */
        .modal-content button.modal-close {
            flex: 1;
            padding: 12px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 10px;
            color: white;
            cursor: pointer;
            transition: background 0.2s;
        }

        .modal-content button.modal-close:hover {
            opacity: 0.9;
        }
        #typing-indicator::after {
    content: '.';
    animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
    0%, 20% { content: '.'; }
    40%     { content: '..'; }
    60%     { content: '...'; }
    80%, 100% { content: ''; }
}
    </style>
</head>
<body>
    <div id="chat">
        <div id="sidebar" class="hidden">
            <div id="sidebar-header">Aura</div>
            <div id="sidebar-actions">
                <button onclick="toggleCreateForm()">Новый чат</button>
                <button onclick="toggleJoinForm()">Присоединиться</button>
                <button onclick="uploadAvatar()">Загрузить аватарку</button>
            </div>

            <div id="createForm" class="form-container" style="display:none;">
                <input type="text" id="chatName" placeholder="Имя чата">
                <button onclick="createChat()">Создать</button>
            </div>

            <div id="joinForm" class="form-container" style="display:none;">
                <input type="number" id="joinChatId" placeholder="ID чата">
                <input type="text" id="joinPassword" placeholder="Пароль">
                <button onclick="joinChat()">Присоединиться</button>
            </div>

            <div id="chatList"></div>
        </div>

        <div id="main">
            <div id="header">
    <button id="menu-btn" onclick="toggleSidebar()">☰</button>
    
    <div class="title" style="display: flex; align-items: center; gap: 8px;">
        <span id="chatTitleText">Aura</span>
        <button id="edit-chat-name-btn" 
                style="display:none; background:none; border:none; color:white; font-size:18px; cursor:pointer; padding:4px;" 
                title="Изменить название" 
                onclick="openEditChatNameModal()">
            ✏️
        </button>
    </div>
    
    <button id="delete-chat-btn" style="display:none; background:none; border:none; color:white; font-size:20px; cursor:pointer;" 
            title="Удалить чат" onclick="deleteCurrentChat()">
        🗑️
    </button>
</div>

            <div id="messages">
    <!-- сообщения -->
    
    <div id="typing-indicator" style="display: none; padding: 12px 16px; color: var(--text-secondary); font-size: 14px; font-style: italic; opacity: 0; transition: opacity 0.3s ease;">
        <span id="typing-users"></span> печатает...
    </div>
</div>

<div id="input">
    <div class="input-wrapper">
        <input type="text" id="message" placeholder="Сообщение" autocomplete="off" maxlength="4096">
        <div id="char-counter" class="char-counter">0 / 4096</div>
    </div>
    <button onclick="startCall('audio')">📞</button> <!-- Аудио-звонок -->
    <button onclick="startCall('video')">🎥</button> <!-- Видео-звонок -->
    <button onclick="sendFile()">📎</button> <!-- Отправка файла/гиф -->
    <button id="send-btn" onclick="sendMessage()" disabled>➤</button>
</div>
        </div>

        <!-- Модальные окна -->
        <div id="modalOverlay" class="modal-overlay" style="display:none;"></div>

        <div id="createSuccessModal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Чат создан</h3>
                <p>Имя чата: <strong id="modalChatName"></strong></p>
                <p>ID чата: <strong id="modalChatId"></strong></p>
                <p>Пароль (скопируйте и отправьте собеседнику):</p>
                <div class="password-box">
                    <span id="modalPassword"></span>
                    <button class="copy-btn" onclick="copyToClipboard('modalPassword')">
                        <svg class="copy-icon" viewBox="0 0 24 24">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Скопировать
                    </button>
                </div>
                <button class="modal-close" onclick="closeModal('createSuccessModal')">Закрыть</button>
            </div>
        </div>

        <div id="joinSuccessModal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Готово!</h3>
                <p>Вы успешно присоединились к чату.</p>
                <button class="modal-close" onclick="closeModal('joinSuccessModal')">Закрыть</button>
            </div>
        </div>

        <div id="errorModal" class="modal" style="display:none;">
            <div class="modal-content error">
                <h3>Ошибка</h3>
                <p id="errorMessage"></p>
                <button class="modal-close" onclick="closeModal('errorModal')">Закрыть</button>
            </div>
        </div>

        <!-- Модальное окно подтверждения удаления чата -->
<div id="deleteChatConfirmModal" class="modal" style="display:none;">
    <div class="modal-content">
        <h3>Удалить чат?</h3>
        <p>Вы уверены, что хотите удалить чат <strong id="deleteChatName"></strong>?<br>
           Все сообщения будут безвозвратно удалены.</p>
        <p style="color: #d32f2f; margin: 16px 0; font-weight: 500;">
            Это действие нельзя отменить.
        </p>
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="modal-close" 
                    style="background: #d32f2f;" 
                    onclick="confirmDeleteChat()">
                Удалить
            </button>
            <button class="modal-close" 
                    style="background: #6b7280;" 
                    onclick="closeModal('deleteChatConfirmModal')">
                Отмена
            </button>
        </div>
    </div>
</div>

     <!-- Модальное окно редактирования названия чата -->
<div id="editChatNameModal" class="modal" style="display:none;">
    <div class="modal-content">
        <h3>Изменить название чата</h3>
        <p>Текущее название: <strong id="currentChatNameDisplay"></strong></p>
        
        <input type="text" id="newChatNameInput" placeholder="Новое название чата" maxlength="100">
        
        <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="modal-close" 
                    style="background: var(--color-primary);" 
                    onclick="saveChatName()">
                Сохранить
            </button>
            <button class="modal-close" 
                    style="background: #6b7280;" 
                    onclick="closeModal('editChatNameModal')">
                Отмена
            </button>
        </div>
    </div>
</div>       

    </div>

    <div id="toast">Скопировано в буфер обмена</div>

<!-- Элементы для WebRTC звонков -->
<video id="localVideo" autoplay playsinline muted style="display:none; width:100%;"></video>
<video id="remoteVideo" autoplay playsinline style="display:none; width:100%;"></video>

    <script src="script.js"></script>
<script>
    // Быстрый фикс мобильной высоты
    function updateVH() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    window.addEventListener('resize', updateVH);
    window.addEventListener('orientationchange', updateVH);
    updateVH();
</script>



</body>
</html>