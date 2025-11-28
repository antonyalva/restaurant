-- Add phone_number field to loyalty_cards for actual phone
-- (phone field is being used for document_number)
ALTER TABLE loyalty_cards
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Optionally add document_type
ALTER TABLE loyalty_cards
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'DNI';
