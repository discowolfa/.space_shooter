# Действующая публикация

Адрес: https://spaceshooter.discovolante.online/

Развёрнуто 2026-11-18 с разрешения владельца через SSH root@49.12.229.205. Игровая сборка: commit c787e44, версия 0.1.0-alpha.1. Сборка выполнена локально; на VPS работают только статические файлы Nginx, Node/backend/БД для игры не запускались.

- DNS A spaceshooter → 49.12.229.205.
- Release: /var/www/space-shooter/releases/c787e44-alpha1.
- Активная ссылка: /var/www/space-shooter/current.
- Отдельный virtual host: /etc/nginx/sites-available/spaceshooter, ссылка в sites-enabled.
- ACME webroot: /var/www/space-shooter/acme.
- Let's Encrypt: /etc/letsencrypt/live/spaceshooter.discovolante.online/, сертификат до 2027-02-16, certbot.timer включён. На сервере уже есть deploy hooks для nginx reload; они сохранены без изменений.
- HTTP → HTTPS 301; HTML, manifest и SW — no-cache; /assets/ — max-age=3600.
- Существующие virtual hosts и приложения не редактировались. Nginx проверен nginx -t и перечитан через reload.

Проверки: 5 unit tests и production build; внешний HTTPS 200 с валидным сертификатом; правильные MIME для manifest/SW/PNG; Chromium загрузка, старт боя, пауза и offline reload без ошибок в консоли. Физический iPhone и полный проход кампании ещё не проверены.

Следующие релизы: собирать через scripts/build.sh, публиковать scripts/deploy.sh с APP_URL=https://spaceshooter.discovolante.online. Первая публикация не имеет предыдущего игрового release; после следующей успешной публикации скрипт создаст previous для rollback. Не использовать этот каталог для других приложений.

## Обновление alpha.2 — адаптивный игровой экран

2026-11-18 опубликована версия 0.1.0-alpha.2. Активный release: /var/www/space-shooter/releases/20261118-responsive-alpha2. Ссылка previous сохраняет /var/www/space-shooter/releases/c787e44-alpha1 для отката. Nginx и TLS не менялись; переключена только current. Формат IndexedDB остался v1. Для вкладок со старой PWA-версией нужно закрыть старые вкладки игры и открыть снова, чтобы активировался ожидающий Service Worker. В новом интерфейсе обновление применяется автоматически вне боя, а во время миссии доступно по кнопке ↻.

Проверки адаптивности перечислены в TESTING.md. Доступность новой HTML-разметки подтверждена по HTTPS после атомарного переключения.

## Обновление alpha.3 — боевые усиления и длинные миссии

2026-11-18 опубликована 0.1.0-alpha.3. Активный release /var/www/space-shooter/releases/20261118-combat-alpha3; previous сохраняет alpha.2. Добавлены 8 типов подборов и снабжение, миссии 120–165 секунд с финальной зачисткой, расширенный HUD. Формат сохранения v1 не менялся. Проверки: 11 unit tests, production build и ускоренная симуляция Phaser (подборы, таймеры, минимальная длительность, финальные враги, босс). Полный ручной игровой баланс и физический iPhone ещё не проверены. Nginx/TLS не менялись.
