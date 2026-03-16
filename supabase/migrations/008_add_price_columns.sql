-- Verify and add price_min and price_max columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS price_min integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_max integer DEFAULT 500000;

-- Verify columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('price_min', 'price_max');
