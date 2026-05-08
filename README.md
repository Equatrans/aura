# P2P Мессенджер с Supabase Realtime

Децентрализованный веб-мессенджер с поддержкой видеозвонков, работающий через GitHub Pages.

## 🚀 Возможности

- 💬 Чат в реальном времени через Supabase Realtime
- 📹 Видеозвонки P2P через WebRTC
- 📎 Обмен файлами (до 2MB)
- 👥 Отображение списка участников
- 🔒 Безопасность: XSS защита, проверка размера файлов
- 💾 Сохранение имени пользователя
- 🔄 Автоматическое переподключение
- 📱 PWA поддержка (Service Worker)

## 🛠️ Установка и запуск

### 1. Клонирование репозитория
```bash
git clone <your-repo-url>
cd p2p-messenger
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Получение ключей Supabase:**
1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в Settings → API
3. Скопируйте `Project URL` и `anon public` ключ

### 4. Локальная разработка
```bash
npm run dev
```

Приложение откроется по адресу `http://localhost:5173`

### 5. Сборка для продакшена
```bash
npm run build
```

Собранные файлы появятся в папке `dist/`

## 🌐 Развёртывание на GitHub Pages

### Вариант 1: Автоматическое развёртывание

```bash
npm run deploy
```

Эта команда выполнит сборку и опубликует файлы в ветку `gh-pages`.

### Вариант 2: Ручное развёртывание

1. Выполните сборку:
   ```bash
   npm run build
   ```

2. В настройках репозитория на GitHub:
   - Перейдите в Settings → Pages
   - В разделе "Source" выберите ветку `gh-pages`
   - Нажмите Save

3. Приложение будет доступно по адресу:
   ```
   https://<username>.github.io/<repository>/
   ```

### Вариант 3: GitHub Actions

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Добавьте секреты в настройках репозитория (Settings → Secrets and variables → Actions):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## ⚙️ Конфигурация

### Настройка комнаты
- По умолчанию используется комната `test-room`
- Измените имя комнаты в поле "Имя комнаты" перед подключением

### Настройка видеозвонка
- Нажмите "🎥 Начать" для включения камеры
- Видеозвонок автоматически устанавливается с другими участниками

## 🔒 Безопасность

- ✅ XSS защита: все сообщения экранируются
- ✅ Ограничение размера файлов: максимум 2MB
- ✅ Обработка ошибок WebRTC: автоматическое восстановление
- ✅ Переменные окружения: ключи не хранятся в коде

## 📝 Структура проекта

```
p2p-messenger/
├── index.html          # Главная страница
├── app.js              # Основная логика приложения
├── style.css           # Стили
├── sw.js               # Service Worker
├── manifest.json       # PWA манифест
├── package.json        # Зависимости и скрипты
├── vite.config.js      # Конфигурация Vite
├── .env                # Переменные окружения (не коммитить!)
└── README.md           # Документация
```

## 🧪 Тестирование

1. Откройте приложение в двух разных вкладках браузера
2. Присоединитесь к одной комнате под разными именами
3. Проверьте:
   - Отправку сообщений
   - Видеозвонок
   - Отправку файлов
   - Отображение участников

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в удалённый репозиторий (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT

## 📞 Поддержка

При возникновении проблем создайте Issue в репозитории.
