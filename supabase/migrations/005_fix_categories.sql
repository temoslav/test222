-- Fix missing categories for existing KudaGo items
UPDATE items 
SET category = 'События' 
WHERE category IS NULL 
  AND source = 'api'
  AND type = 'event';

-- Update any items with the old "Событие" category to the correct "События"
UPDATE items 
SET category = 'События' 
WHERE category = 'Событие';
