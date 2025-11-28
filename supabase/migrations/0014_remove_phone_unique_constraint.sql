-- Remove UNIQUE constraint from phone field in loyalty_cards
-- since we're now using it for document numbers
ALTER TABLE loyalty_cards 
DROP CONSTRAINT IF EXISTS loyalty_cards_phone_key;

-- Make phone nullable since document might not always be required
ALTER TABLE loyalty_cards 
ALTER COLUMN phone DROP NOT NULL;
