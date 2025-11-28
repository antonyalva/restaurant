-- Add status to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Add name and email to loyalty_cards (Customers)
ALTER TABLE loyalty_cards
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing loyalty cards with placeholder if needed (optional)
-- UPDATE loyalty_cards SET name = 'Cliente ' || substr(phone, 1, 4) WHERE name IS NULL;
