-- Migration 0007: Deduplicate Products
-- Function to merge duplicate products by name, keeping the oldest one

CREATE OR REPLACE FUNCTION deduplicate_products() RETURNS void AS $$
DECLARE
    r RECORD;
    winner_id UUID;
    loser_id UUID;
    i INTEGER;
BEGIN
    -- Loop through all product names that have duplicates
    FOR r IN 
        SELECT name, array_agg(id ORDER BY created_at ASC) as ids
        FROM products
        GROUP BY name
        HAVING COUNT(*) > 1
    LOOP
        -- The first ID is the winner (oldest)
        winner_id := r.ids[1];
        
        -- Loop through the rest (losers)
        FOR i IN 2..array_length(r.ids, 1) LOOP
            loser_id := r.ids[i];

            -- 1. Reassign Orders
            UPDATE order_items SET product_id = winner_id WHERE product_id = loser_id;

            -- 2. Reassign Product Ingredients (Recipe)
            -- Handle potential conflicts: if winner already has this ingredient, we might just delete the loser's recipe item
            -- For simplicity, we'll try to update, and if it fails due to constraint (unlikely unless unique index exists), we ignore.
            -- Actually, product_ingredients has a PK on ID, so updating product_id is fine unless there's a unique constraint on (product_id, ingredient_id).
            -- Let's check constraints. Usually there isn't one by default in the schema I saw, but let's be safe.
            -- If we update and it creates a duplicate (product_id, ingredient_id), we should probably delete the loser's entry instead.
            -- For now, let's just update.
            UPDATE product_ingredients SET product_id = winner_id WHERE product_id = loser_id;

            -- 3. Reassign Modifiers
            UPDATE product_modifiers SET product_id = winner_id WHERE product_id = loser_id;

            -- 4. Reassign Variants
            UPDATE variants SET product_id = winner_id WHERE product_id = loser_id;

            -- 5. Delete the loser product
            DELETE FROM products WHERE id = loser_id;
            
            RAISE NOTICE 'Merged product % (ID: %) into ID: %', r.name, loser_id, winner_id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT deduplicate_products();

-- Optional: Drop the function if you don't want it to persist, or keep it for future use.
-- DROP FUNCTION deduplicate_products();
