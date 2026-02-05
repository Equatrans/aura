<?php
// server.php
header('Content-Type: application/json');

$chatsFile = 'chats.json';
$chats = file_exists($chatsFile) ? json_decode(file_get_contents($chatsFile), true) : [];
if (empty($chats)) {
    file_put_contents($chatsFile, json_encode([]));
}

// ────────────────────────────────────────────────
// Обработка загрузки аватарки (multipart/form-data)
// ────────────────────────────────────────────────
if (isset($_GET['action']) && $_GET['action'] === 'uploadAvatar' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['user'] ?? '');

    if (!$username) {
        http_response_code(400);
        echo json_encode(['error' => 'Имя пользователя не указано']);
        exit;
    }

    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        http_response_code(400);
        echo json_encode(['error' => "Имя пользователя должно быть от 1 до " . MAX_USERNAME_LENGTH . " символов"]);
        exit;
    }

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'Файл не загружен или произошла ошибка']);
        exit;
    }

    $file = $_FILES['avatar'];

    if ($file['size'] > MAX_AVATAR_SIZE) {
        http_response_code(400);
        echo json_encode(['error' => 'Файл слишком большой (максимум 1 МБ)']);
        exit;
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, ALLOWED_AVATAR_TYPES)) {
        http_response_code(400);
        echo json_encode(['error' => 'Неподдерживаемый формат (только JPG/PNG)']);
        exit;
    }

    $uploadDir = __DIR__ . '/uploads/avatars/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            http_response_code(500);
            echo json_encode(['error' => 'Не удалось создать директорию для аватарок']);
            exit;
        }
    }

    // Имя файла — username.jpg (перезаписываем старый аватар)
    $filePath = $uploadDir . htmlspecialchars($username) . '.jpg';

    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        $avatarUrl = 'uploads/avatars/' . htmlspecialchars($username) . '.jpg?' . time(); // ?time чтобы сбросить кэш
        echo json_encode([
            'success' => true,
            'avatarUrl' => $avatarUrl
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Не удалось сохранить файл. Проверьте права на папку uploads/avatars/']);
    }
    exit;
}

// ────────────────────────────────────────────────
// Дальше идёт обычная обработка JSON-запросов
// ────────────────────────────────────────────────

function getMessagesFile($chatId) {
    return "messages_$chatId.json";
}

$action = $_GET['action'] ?? '';
$input = ($_SERVER['REQUEST_METHOD'] === 'POST') 
    ? json_decode(file_get_contents('php://input'), true) 
    : [];

// Ограничения
const MAX_USERNAME_LENGTH = 64;
const MIN_USERNAME_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 4096;
const MAX_CHAT_NAME_LENGTH = 100;
const MAX_AVATAR_SIZE = 1048576; // 1 МБ
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png'];

if ($action === 'create' && isset($input['user'], $input['name'])) {
    $username = trim($input['user']);
    $chatName = trim($input['name']);

    // Проверка имени пользователя
    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        echo json_encode(['error' => "Имя пользователя должно быть от 1 до " . MAX_USERNAME_LENGTH . " символов"]);
        exit;
    }

    // Проверка имени чата
    if (strlen($chatName) < 1 || strlen($chatName) > MAX_CHAT_NAME_LENGTH) {
        echo json_encode(['error' => "Имя чата должно быть от 1 до " . MAX_CHAT_NAME_LENGTH . " символов"]);
        exit;
    }

    $chatId = count($chats) + 1;
    $password = bin2hex(random_bytes(8));
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $chats[] = [
        'id' => $chatId,
        'admin' => htmlspecialchars($username),
        'password_hash' => $hash,
        'participants' => [htmlspecialchars($username)],
        'name' => htmlspecialchars($chatName)
    ];

    file_put_contents($chatsFile, json_encode($chats, JSON_PRETTY_PRINT));
    file_put_contents(getMessagesFile($chatId), json_encode([]));

    echo json_encode([
        'success' => true,
        'chatId' => $chatId,
        'password' => $password
    ]);
    exit;
}

if ($action === 'join' && isset($input['chatId'], $input['password'], $input['user'])) {
    $username = trim($input['user']);

    // Проверка имени пользователя при присоединении
    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        echo json_encode(['error' => "Имя пользователя должно быть от 1 до " . MAX_USERNAME_LENGTH . " символов"]);
        exit;
    }

    $chatId = intval($input['chatId']);
    $chat = array_values(array_filter($chats, fn($c) => $c['id'] === $chatId))[0] ?? null;

    if ($chat && password_verify($input['password'], $chat['password_hash']) && !in_array($username, $chat['participants'])) {
        $chat['participants'][] = htmlspecialchars($username);
        foreach ($chats as &$c) {
            if ($c['id'] === $chatId) $c = $chat;
        }
        file_put_contents($chatsFile, json_encode($chats, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Неверный ID чата или пароль']);
    }
    exit;
}

if ($action === 'getChats' && isset($input['user'])) {
    $userChats = array_filter($chats, fn($c) => in_array($input['user'], $c['participants']));
    echo json_encode(array_values($userChats));
    exit;
}

if ($action === 'send' && isset($input['chatId'], $input['user'], $input['message'])) {
    $username = trim($input['user']);
    $message = trim($input['message']);

    // Проверка имени пользователя
    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        echo json_encode(['error' => "Имя пользователя должно быть от 1 до " . MAX_USERNAME_LENGTH . " символов"]);
        exit;
    }

    // Проверка длины сообщения
    if (strlen($message) > MAX_MESSAGE_LENGTH) {
        echo json_encode(['error' => "Сообщение слишком длинное (максимум " . MAX_MESSAGE_LENGTH . " символов)"]);
        exit;
    }

    if (strlen($message) === 0) {
        echo json_encode(['error' => 'Сообщение не может быть пустым']);
        exit;
    }

    $chatId = intval($input['chatId']);
    $chat = array_values(array_filter($chats, fn($c) => $c['id'] === $chatId))[0] ?? null;

    if ($chat && in_array($username, $chat['participants'])) {
        $msgFile = getMessagesFile($chatId);
        $data = file_exists($msgFile) ? json_decode(file_get_contents($msgFile), true) : [];

        $id = count($data) + 1;
        $data[] = [
            'id' => $id,
            'user' => htmlspecialchars($username),
            'message' => htmlspecialchars($message),
            'timestamp' => time()
        ];

        file_put_contents($msgFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Доступ запрещён']);
    }
    exit;
}

if ($action === 'get') {
    $chatId = intval($_GET['chatId'] ?? 0);
    $user = $_GET['user'] ?? '';

    // Проверка имени пользователя при запросе сообщений
    if (strlen($user) < MIN_USERNAME_LENGTH || strlen($user) > MAX_USERNAME_LENGTH) {
        echo json_encode(['error' => 'Недопустимое имя пользователя']);
        exit;
    }

    $chat = array_values(array_filter($chats, fn($c) => $c['id'] === $chatId))[0] ?? null;

    if ($chat && in_array($user, $chat['participants'])) {
        $msgFile = getMessagesFile($chatId);
        $data = file_exists($msgFile) ? json_decode(file_get_contents($msgFile), true) : [];

        $lastId = intval($_GET['lastId'] ?? 0);
        $limit = intval($_GET['limit'] ?? 50);

        $filtered = array_filter($data, fn($msg) => $msg['id'] > $lastId);
        $messages = array_slice($filtered, -$limit);

        if (empty($filtered) && $lastId === 0) {
            $messages = array_slice($data, -$limit);
        }

        echo json_encode($messages);
    } else {
        echo json_encode(['error' => 'Доступ запрещён']);
    }
    exit;
}

// server.php — добавляем новый блок в конец, перед финальным echo

if ($action === 'deleteChat' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['chatId'], $input['user'])) {
        echo json_encode(['error' => 'Не указан chatId или user']);
        exit;
    }

    $chatId = intval($input['chatId']);
    $user = trim($input['user']);

    // Находим чат
    $chatIndex = array_search($chatId, array_column($chats, 'id'));
    if ($chatIndex === false) {
        echo json_encode(['error' => 'Чат не найден']);
        exit;
    }

    $chat = $chats[$chatIndex];

    // Проверяем, что пользователь — администратор чата
    if ($chat['admin'] !== htmlspecialchars($user)) {
        echo json_encode(['error' => 'Удалять чат может только администратор']);
        exit;
    }

    // Удаляем файл сообщений
    $msgFile = getMessagesFile($chatId);
    if (file_exists($msgFile)) {
        unlink($msgFile);
    }

    // Удаляем чат из списка
    array_splice($chats, $chatIndex, 1);

    // Сохраняем обновлённый список чатов
    file_put_contents($chatsFile, json_encode($chats, JSON_PRETTY_PRINT));

    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'renameChat' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['chatId'], $input['user'], $input['newName'])) {
        echo json_encode(['error' => 'Не переданы необходимые данные']);
        exit;
    }

    $chatId = intval($input['chatId']);
    $user = trim($input['user']);
    $newName = trim($input['newName']);

    if (strlen($newName) < 1 || strlen($newName) > 100) {
        echo json_encode(['error' => 'Название должно быть от 1 до 100 символов']);
        exit;
    }

    $chatIndex = array_search($chatId, array_column($chats, 'id'));
    if ($chatIndex === false) {
        echo json_encode(['error' => 'Чат не найден']);
        exit;
    }

    $chat = &$chats[$chatIndex];

    // Только админ может менять название
    if ($chat['admin'] !== htmlspecialchars($user)) {
        echo json_encode(['error' => 'Изменять название может только администратор']);
        exit;
    }

    // Обновляем название
    $chat['name'] = htmlspecialchars($newName);

    file_put_contents($chatsFile, json_encode($chats, JSON_PRETTY_PRINT));

    echo json_encode(['success' => true]);
    exit;
}

// Установка статуса "печатает"
if ($action === 'setTyping' && isset($input['chatId'], $input['user'], $input['typing'])) {
    $chatId = intval($input['chatId']);
    $user = trim($input['user']);
    $typing = (bool) $input['typing'];

    $statusFile = "typing_$chatId.json";
    $status = file_exists($statusFile) ? json_decode(file_get_contents($statusFile), true) : [];

    if ($typing) {
        $status[$user] = time(); // timestamp
    } else {
        unset($status[$user]);
    }

    file_put_contents($statusFile, json_encode($status));
    echo json_encode(['success' => true]);
    exit;
}

// Получение статусов "печатает"
if ($action === 'getTyping' && isset($input['chatId'])) {
    $chatId = intval($input['chatId']);
    $statusFile = "typing_$chatId.json";
    $status = file_exists($statusFile) ? json_decode(file_get_contents($statusFile), true) : [];

    // Удаляем старые (более 5 сек)
    $now = time();
    foreach ($status as $u => $t) {
        if ($now - $t > 5) unset($status[$u]);
    }
    file_put_contents($statusFile, json_encode($status));

    echo json_encode(['typingUsers' => array_keys($status)]);
    exit;
}

// Сигнализация WebRTC: сохранение offer/answer/ICE
if ($action === 'signalWebRTC' && isset($input['chatId'], $input['user'], $input['type'], $input['data'])) {
    $chatId = intval($input['chatId']);
    $user = trim($input['user']);
    $type = $input['type']; // 'offer', 'answer', 'ice'
    $data = $input['data'];

    $signalFile = "signal_$chatId.json";
    $signals = file_exists($signalFile) ? json_decode(file_get_contents($signalFile), true) : [];

    // Сохраняем сигнал от пользователя
    $signals[$user][$type] = $data;
    $signals[$user]['timestamp'] = time();

    // Очищаем старые сигналы (TTL 60 сек)
    foreach ($signals as $u => $s) {
        if (time() - $s['timestamp'] > 60) unset($signals[$u]);
    }

    file_put_contents($signalFile, json_encode($signals));

    echo json_encode(['success' => true]);
    exit;
}

// Получение сигналов от других пользователей
if ($action === 'getWebRTCSignals' && isset($input['chatId'], $input['user'])) {
    $chatId = intval($input['chatId']);
    $user = trim($input['user']);

    $signalFile = "signal_$chatId.json";
    $signals = file_exists($signalFile) ? json_decode(file_get_contents($signalFile), true) : [];

    // Возвращаем сигналы от других пользователей
    unset($signals[$user]); // исключаем свои

    echo json_encode(['signals' => $signals]);
    exit;
}

echo json_encode(['error' => 'Неверный запрос']);