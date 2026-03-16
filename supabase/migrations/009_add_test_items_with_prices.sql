-- Add test items with prices to verify price display works
INSERT INTO items (
  id, source, status, type, title, description, price, currency, 
  category, image_urls, external_url, city, is_active, created_at, updated_at
) VALUES 
  (
    gen_random_uuid(),
    'uploaded',
    'active',
    'product',
    'Тестовый товар с ценой',
    'Это тестовый товар для проверки отображения цен в UI',
    2500,
    'RUB',
    'Одежда',
    ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
    'https://example.com/test-product',
    'Москва',
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'uploaded',
    'active',
    'event',
    'Тестовое событие с ценой',
    'Это тестовое событие для проверки отображения цен в UI',
    1500,
    'RUB',
    'Событие',
    ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
    'https://example.com/test-event',
    'Москва',
    true,
    NOW(),
    NOW()
  );

-- Verify the items were added
SELECT id, title, price, category, is_active 
FROM items 
WHERE price IS NOT NULL 
LIMIT 5;
