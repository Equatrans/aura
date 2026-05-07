# P2P Мессенджер с Supabase Realtime

## Переменные окружения

Для локальной разработки создайте файл `.env` со следующими переменными:

```env
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Развёртывание на Cloudflare Pages

1. Добавьте переменную окружения в настройках Cloudflare Pages:
   - Имя: `VITE_SUPABASE_ANON_KEY`
   - Значение: ваш ключ Supabase anon key

2. Задеплойте проект через Wrangler:
```bash
npx wrangler pages deploy .
```

## Локальный запуск

Используйте любой статический сервер, например:

```bash
npx serve .
```

или

```bash
python3 -m http.server 8080
```

## Безопасность

- Ключи хранятся в переменных окружения
- XSS атаки предотвращены экранированием сообщений
- Ограничение размера файлов: 2MB
