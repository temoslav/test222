-- Canonical categories (single source of truth)
CREATE TABLE IF NOT EXISTS categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ru text not null,
  emoji text,
  sort_order integer default 0,
  is_active boolean default true
);

INSERT INTO categories (slug, name_ru, emoji, sort_order) VALUES
  ('music', 'Музыка', '🎵', 1),
  ('art', 'Искусство', '🎨', 2),
  ('theatre', 'Театр', '🎭', 3),
  ('sport', 'Спорт', '🏋️', 4),
  ('education', 'Образование', '📚', 5),
  ('food', 'Еда', '🍕', 6),
  ('party', 'Вечеринки', '🎉', 7),
  ('kids', 'Детям', '👶', 8),
  ('exhibition', 'Выставки', '🖼️', 9),
  ('festival', 'Фестивали', '🎪', 10),
  ('business', 'Бизнес', '💼', 11),
  ('other', 'Другое', '📌', 12);

-- Tags vocabulary
CREATE TABLE IF NOT EXISTS tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ru text not null,
  category_slug text references categories(slug)
);

INSERT INTO tags (slug, name_ru, category_slug) VALUES
  ('jazz', 'Джаз', 'music'),
  ('rock', 'Рок', 'music'),
  ('classical', 'Классика', 'music'),
  ('electronic', 'Электронная', 'music'),
  ('live-music', 'Живая музыка', 'music'),
  ('contemporary-art', 'Современное искусство', 'art'),
  ('photography', 'Фотография', 'art'),
  ('standup', 'Стендап', 'theatre'),
  ('comedy', 'Комедия', 'theatre'),
  ('networking', 'Нетворкинг', 'business'),
  ('masterclass', 'Мастер-класс', 'education'),
  ('workshop', 'Воркшоп', 'education'),
  ('family', 'Семейное', 'kids'),
  ('outdoor', 'На улице', 'festival'),
  ('free', 'Бесплатно', 'other'),
  ('premium', 'Премиум', 'other'),
  ('romantic', 'Романтичное', 'other'),
  ('for-adults', 'Для взрослых', 'other');

-- Audiences
CREATE TABLE IF NOT EXISTS audiences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ru text not null
);

INSERT INTO audiences (slug, name_ru) VALUES
  ('youth', 'Молодёжь 18-25'),
  ('adults', 'Взрослые 25-40'),
  ('mature', '40+'),
  ('families', 'Семьи с детьми'),
  ('business', 'Бизнес аудитория'),
  ('couples', 'Пары');

-- RLS (read-only for all authenticated users)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read categories" ON categories
  FOR SELECT USING (true);
CREATE POLICY "public read tags" ON tags
  FOR SELECT USING (true);
CREATE POLICY "public read audiences" ON audiences
  FOR SELECT USING (true);
