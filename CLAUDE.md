# Swipely — Product & Engineering Bible

> Рабочее название: Swipely
> Тип: Swipe-based Discovery Platform
> Рынок: Россия
> Стадия: MVP

---

## 1. Суть продукта

Swipely — это персональная лента открытий где пользователь свайпает товары, события и места.
Каждый свайп обучает алгоритм. Со временем лента становится точным отражением вкуса пользователя.

**Главная идея:** люди не знают что хотят — но готовы открывать новое.
Swipely заполняет пространство между "я не ищу" и "мне это нравится".

**Что показываем в ленте:**
- Товары (локальные бренды, независимые продавцы)
- События (концерты, выставки, мастер-классы, вечеринки)
- Места (новые рестораны, магазины, пространства)

---

## 2. Бизнес-модель

### Источники дохода

**B2B — основной доход на старте**
Продавцы, бренды, организаторы событий платят подписку за размещение в ленте.
Никакой комиссии с продажи — только фиксированная подписка.

```
Тариф Старт   ₽1,990/мес — до 10 позиций
Тариф Бизнес  ₽4,990/мес — до 50 позиций + аналитика
Тариф Бренд   ₽12,000/мес — безлимит + приоритет в ленте
```

**B2C Premium — после набора аудитории**
```
Free     — лента с рекламными карточками
Premium  ₽299/мес — без рекламы, расширенные фильтры,
                    персональные подборки
```

**Data Intelligence — на масштабе**
Продажа агрегированных инсайтов брендам и исследовательским агентствам.
Только анонимизированные агрегированные данные — никаких персональных данных.

### Стратегия контента (гибридная модель)

**Фаза 1 — Наполнение (месяц 1-2)**
- Парсинг открытых источников: KudaGo API для событий
- Ручной онбординг первых 20-30 продавцов
- Цель: лента не пустая с первого дня

**Фаза 2 — Переключение (месяц 3-6)**
- Личный кабинет для продавцов
- Прямые продажи без маркетплейса
- Продавцы получают независимость от WB/Ozon

**Фаза 3 — Экосистема (месяц 6+)**
- Корзина и оплата внутри приложения
- Аналитика для брендов
- Swipely становится альтернативным каналом продаж

---

## 3. Технический стек

```
Frontend:     Next.js 14 (App Router), TypeScript strict, Tailwind CSS
Backend:      Supabase (Postgres + Auth + Storage + Edge Functions)
AI/ML:        pgvector (Supabase встроенный), Claude API (Anthropic)
Payments:     Stripe (подписки для продавцов + Premium для пользователей)
Deployment:   Vercel (frontend), Supabase Cloud (backend)
Parsing:      Node.js скрипты + KudaGo API
Mobile:       PWA первый приоритет, React Native позже
```

---

## 4. Архитектура данных

### Основные таблицы

```sql
-- Пользователи
users (auth.users от Supabase)

-- Профили пользователей
profiles
  id              uuid (FK auth.users)
  email           text
  city            text
  age_group       text  -- '18-24', '25-34', '35-44', '45+'
  gender          text
  stripe_customer_id    text
  subscription_status   text default 'free'
  taste_vector    vector(1536)  -- AI embedding вкуса пользователя
  created_at      timestamptz
  updated_at      timestamptz

-- Товары и события
items
  id              uuid
  source          text  -- 'uploaded' | 'parsed' | 'api'
  type            text  -- 'product' | 'event' | 'place'
  title           text
  description     text
  price           numeric
  currency        text default 'RUB'
  image_urls      text[]
  category        text
  subcategory     text
  brand           text
  city            text
  location        jsonb  -- { lat, lng, address }
  external_url    text  -- ссылка на товар/событие
  seller_id       uuid  -- FK sellers (если uploaded)
  content_vector  vector(1536)  -- AI embedding товара
  is_active       boolean default true
  starts_at       timestamptz  -- для событий
  ends_at         timestamptz
  created_at      timestamptz
  updated_at      timestamptz

-- Продавцы / организаторы
sellers
  id              uuid
  user_id         uuid (FK auth.users)
  business_name   text
  description     text
  logo_url        text
  city            text
  category        text
  stripe_customer_id    text
  subscription_status   text
  subscription_tier     text
  items_count     integer default 0
  created_at      timestamptz

-- Взаимодействия пользователя с контентом (ГЛАВНАЯ ТАБЛИЦА)
interactions
  id              uuid
  user_id         uuid (FK profiles)
  item_id         uuid (FK items)
  action          text  -- 'swipe_right' | 'swipe_left' | 'save' | 'share' | 'view_detail' | 'external_click'
  dwell_time_ms   integer  -- сколько миллисекунд смотрел
  swipe_speed     text  -- 'fast' | 'medium' | 'slow'
  session_id      uuid
  context         jsonb  -- { time_of_day, day_of_week, city }
  created_at      timestamptz

-- Эволюция вкуса пользователя (аналитическая таблица)
taste_snapshots
  id              uuid
  user_id         uuid
  week            date  -- начало недели
  category_weights      jsonb  -- { "одежда": 0.8, "электроника": 0.2 }
  price_sensitivity     jsonb  -- { "min": 500, "max": 5000, "sweet_spot": 2000 }
  active_hours    jsonb  -- когда активен
  top_signals     jsonb  -- сильнейшие сигналы за неделю
  created_at      timestamptz

-- Сессии
sessions
  id              uuid
  user_id         uuid
  started_at      timestamptz
  ended_at        timestamptz
  items_shown     integer
  swipes_right    integer
  swipes_left     integer
  saves           integer
  city            text
  device_type     text
```

---

## 5. AI-алгоритм персонализации

### Принцип: три слоя сигналов

**Слой 1 — Явные сигналы**
```
swipe_right       → вес +1.0
save              → вес +2.0
share             → вес +3.0
view_detail       → вес +0.5
external_click    → вес +1.5
swipe_left        → вес -1.0
swipe_left быстро → вес -2.0
```

**Слой 2 — Неявные сигналы**
```
dwell_time > 5s   → дополнительный +0.3
dwell_time < 1s   → дополнительный -0.3
повторный просмотр → +1.0
время суток       → контекстный вес
```

**Слой 3 — Контекст**
```
city              → локальный контент приоритет
time_of_day       → утро/вечер разные категории
day_of_week       → пятница/выходные = события
сезон             → сезонные категории
```

### Как работает рекомендация

```
1. Берём taste_vector пользователя (1536-мерный вектор)
2. Ищем items с похожим content_vector через pgvector
3. Фильтруем уже показанные items
4. Применяем контекстные веса (время, город)
5. Добавляем 20% exploration (новые категории)
   чтобы избежать фильтрационного пузыря
6. Возвращаем отсортированный список
```

### Обновление taste_vector

После каждых 10 взаимодействий:
```
новый_вектор = 0.7 * старый_вектор + 0.3 * вектор_новых_взаимодействий
```

Это даёт плавную эволюцию вкуса без резких скачков.

### Content vector для товаров

При добавлении нового товара — Claude API генерирует embedding:
```
input = title + description + category + subcategory + brand
vector = claude_embedding(input)  // 1536 dimensions
```

---

## 6. Структура проекта

```
swipely/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── feed/page.tsx          ← главный экран со свайпом
│   │   ├── saved/page.tsx         ← сохранённые
│   │   ├── profile/page.tsx       ← профиль и настройки вкуса
│   │   └── layout.tsx
│   ├── (seller)/
│   │   ├── dashboard/page.tsx     ← кабинет продавца
│   │   ├── items/page.tsx         ← управление товарами
│   │   └── analytics/page.tsx     ← аналитика
│   ├── api/
│   │   ├── recommendations/route.ts  ← AI рекомендации
│   │   ├── interactions/route.ts     ← запись взаимодействий
│   │   └── stripe/
│   │       └── webhook/route.ts
│   └── layout.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_vectors.sql
│   │   └── 004_functions.sql
│   └── functions/
│       ├── update-taste-vector/   ← обновление вектора вкуса
│       ├── generate-feed/         ← генерация ленты
│       └── stripe-webhook/
├── components/
│   ├── feed/
│   │   ├── SwipeCard.tsx          ← карточка для свайпа
│   │   ├── CardStack.tsx          ← стек карточек
│   │   └── SwipeActions.tsx
│   ├── items/
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts              ← anon key, браузер
│   │   └── server.ts              ← server only
│   ├── ai/
│   │   ├── embeddings.ts          ← генерация векторов
│   │   └── recommendations.ts     ← алгоритм рекомендаций
│   ├── stripe.ts
│   └── parsers/
│       └── kudago.ts              ← парсер событий
├── types/
│   └── index.ts
├── middleware.ts
├── .env.local
└── CLAUDE.md
```

---

## 7. Переменные окружения

```bash
# Публичные (браузер)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=

# Только сервер — НИКОГДА не NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
KUDAGO_API_URL=https://kudago.com/public-api/v1.4
```

---

## 8. Правила безопасности (КРИТИЧНО)

### Supabase
- ВСЕГДА включать RLS на каждой новой таблице — без исключений
- ВСЕГДА фильтровать запросы по auth.uid()
- НИКОГДА не использовать service_role key на клиенте
- НИКОГДА не добавлять NEXT_PUBLIC_ к секретным ключам
- Все запросы к БД только через server components или API routes
- Storage bucket всегда с политиками доступа

### RLS шаблон для каждой таблицы
```sql
alter table table_name enable row level security;

create policy "users_own_data" on table_name
  for all using (auth.uid() = user_id);
```

### Данные пользователей
- Собирать только то что нужно для алгоритма
- taste_snapshots — только агрегированные данные, не сырые
- Никогда не логировать персональные данные
- 152-ФЗ: явное согласие при онбординге
- Право на удаление всех данных пользователя

### Stripe
- Всегда верифицировать webhook signature
- Обновлять subscription_status только через webhook
- Никогда не доверять статусу подписки с клиента

---

## 8.1 Security Anti-patterns — NEVER DO THIS

### RLS — запрещено
- NEVER create RLS policy that allows public INSERT without auth
- NEVER create policy like: `WITH CHECK (source IN ('api', 'kudago'))` 
  This allows anyone to inject data into the database
- NEVER disable RLS on any table
- NEVER create policy FOR ALL without explicit user check

### Supabase clients — правила использования
- anon key + createBrowserClient → только браузер, только чтение с RLS
- anon key + createServerClient → серверные компоненты и API routes
- service_role key + createAdminClient → ТОЛЬКО server-side ingestion
  (парсеры, синхронизация, admin операции)
- NEVER use service_role key in client components
- NEVER use service_role key in user-facing API routes

### Data ingestion — правильный паттерн
- KudaGo, Timepad и любые парсеры используют ТОЛЬКО adminClient
- adminClient создаётся в lib/supabase/admin.ts
- adminClient импортируется ТОЛЬКО в /api/sync и серверных скриптах
- Ingestion routes защищены SYNC_SECRET токеном

### Что делать если нужно вставить данные без seller_id
- Использовать adminClient (service_role) в защищённом API route
- НЕ создавать дырявые RLS политики
- НЕ отключать RLS

### Checklist перед каждой миграцией
- [ ] Новая политика требует auth.uid()? Если нет — это красный флаг
- [ ] Политика ограничена конкретным пользователем? 
- [ ] service_role нигде не утёк на клиент?
- [ ] Все новые таблицы имеют RLS enabled?

---

## 9. Правила кода

- TypeScript strict mode — никаких any
- Zod для валидации всех форм и API inputs
- Обрабатывать ВСЕ ошибки явно — никаких пустых catch
- Server Components по умолчанию
- 'use client' только для useState, useEffect, обработчиков событий
- Все DB запросы на сервере
- Никогда не делать select * — только нужные колонки
- Компоненты в /components, утилиты в /lib, типы в /types

---

## 10. Что НЕ делать никогда

- Не хранить JWT в localStorage
- Не делать DB запросы из браузера напрямую
- Не коммитить .env.local в git
- Не деплоить без tsc --noEmit
- Не пропускать валидацию входящих данных
- Не создавать таблицу без RLS политик
- Не логировать sensitive данные в console
- Не использовать inline стили — только Tailwind классы
- Не строить сложный AI алгоритм до первых 1000 пользователей

---
## 10.1 Архитектура данных
 
### Принцип трёх слоёв
```
Слой 1: RAW      → raw_events (сырые данные из источников, никогда не удалять)
Слой 2: PROCESSED → items (нормализованный единый формат)
Слой 3: ENRICHED  → item_enrichments (AI теги, категории, аудитория)
```
 
### Источники данных (первая очередь)
- KudaGo API — культура, досуг, Москва (уже есть, улучшить)
- Timepad API — образование, мастер-классы, нишевые события
 
### AI провайдер для обогащения
- Groq API (бесплатный tier, Llama 3.3-70b)
- Провайдер-агностик архитектура — менять модель в одном файле lib/ai/provider.ts
- AI ТОЛЬКО выбирает из справочников БД — никогда не придумывает категории сам
 
### Справочники (единый источник правды)
- categories, tags, audiences — хранятся в БД
- AI получает список и выбирает из него
- Никогда не хардкодить категории в коде — только из БД
- Список категорий в коде (CATEGORIES константа) должен совпадать с БД
 
### Синхронизация данных
- KudaGo: polling каждые 6 часов через Supabase Edge Function
- Timepad: вебхуки + fallback polling
- Дедупликация по external_id + source (UNIQUE constraint)
- Upsert всегда, никогда не дублировать события
 
### Города для старта
- Только Москва (city = 'msk' для KudaGo)
 
---
 

## 11. Дизайн-система

### Визуальный стиль
Светлый, чистый, премиальный. Референсы: Airbnb, Apple, Luma.
Ощущение: "дорого и просто". Никакого мусора на экране.
Пользователь фокусируется на контенте — карточке товара или события.

### Цветовая палитра
```
Фон основной:     #FFFFFF
Фон вторичный:    #F7F7F5  — тёплый офф-вайт, не холодный серый
Текст основной:   #0F0F0F
Текст вторичный:  #6B6B6B
Акцент:           #FF4D4D  — свайп вправо (лайк)
Отказ:            #E0E0E0  — свайп влево
Сохранить:        #0F0F0F  — чёрная кнопка
Граница:          #EBEBEB
Тень карточки:    0 8px 40px rgba(0,0,0,0.10)
```

### Типографика
```
Display / заголовки:  Playfair Display — элегантно, запоминается
Body / интерфейс:     DM Sans — современно, читаемо
Цены / акценты:       DM Mono — технично, точно
```

### Карточка товара (главный элемент)
Это самый важный компонент — всё время и внимание сюда.

```
┌─────────────────────────────┐
│                             │
│      ФОТО ТОВАРА            │  ← занимает 65% карточки
│      (full bleed)           │    без отступов, до краёв
│                             │
│  ┌───────────────────────┐  │
│  │ Категория · Город     │  │  ← мелкий текст, полупрозрачный
│  │                       │  │
│  │ Название товара       │  │  ← Playfair Display, 22px
│  │                       │  │
│  │ Бренд          ₽4,900 │  │  ← DM Sans + DM Mono для цены
│  └───────────────────────┘  │
│                             │
│   ✕           ♡        →   │  ← три кнопки действий
└─────────────────────────────┘

Размер карточки: 100vw - 32px, максимум 400px
Border radius: 24px
Тень: 0 8px 40px rgba(0,0,0,0.10)
```

### Анимации свайпа
```
Свайп вправо → карточка улетает вправо + зелёный оверлей с ♡
Свайп влево  → карточка улетает влево + серый оверлей с ✕
Drag         → карточка наклоняется (rotate) следуя за пальцем
Следующая    → появляется снизу с scale(0.95) → scale(1.0)
Spring анимация: tension 300, friction 30
```

### Навигация
```
Нижний таб-бар (мобильный):
  🔥 Лента  |  ❤️ Сохранённые  |  👤 Профиль  |  🏪 Магазины

Высота: 64px + safe area
Активный таб: чёрная точка под иконкой
```

### Правила дизайна
- Mobile-first всегда — это мобильное приложение
- Минимум элементов на экране — пользователь думает о товаре
- Никаких border на карточках — только тени
- Никаких ярких градиентов — только тонкие оверлеи
- Белое пространство = роскошь, не пустота
- Каждое касание должно давать тактильный отклик (haptic feedback в PWA)
- Шрифты подключать через Google Fonts: Playfair Display + DM Sans + DM Mono

### Компоненты которые должны выглядеть идеально
1. SwipeCard — главный экран, 80% времени пользователя здесь
2. Онбординг — первое впечатление
3. Кабинет продавца — должен выглядеть профессионально

---

## 12. Приоритет разработки (MVP)

```
Sprint 1: Основа
  [ ] Next.js проект с Supabase auth
  [ ] Схема БД с миграциями
  [ ] Middleware защита роутов
  [ ] Базовый SwipeCard компонент

Sprint 2: Лента
  [ ] CardStack со свайп-жестами
  [ ] Запись interactions в БД
  [ ] Базовая рекомендация по категориям (без AI)
  [ ] KudaGo парсер для событий

Sprint 3: Монетизация
  [ ] Stripe подписка для продавцов
  [ ] Личный кабинет продавца
  [ ] Загрузка товаров продавцом

Sprint 4: AI
  [ ] pgvector для товаров
  [ ] Claude embeddings
  [ ] Умная рекомендация на основе taste_vector
  [ ] taste_snapshots обновление

Sprint 5: Аналитика
  [ ] Дашборд для продавца
  [ ] taste_evolution отслеживание
  [ ] Агрегированные инсайты для брендов
```