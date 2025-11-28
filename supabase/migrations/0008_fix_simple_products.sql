-- Fix existing simple products that don't have ingredients
-- This ensures they can be tracked in stock and used in recipes

DO $$
DECLARE
    prod RECORD;
    new_ing_id UUID;
BEGIN
    -- Loop through products that have NO ingredients linked to them
    FOR prod IN
        SELECT p.*
        FROM products p
        LEFT JOIN product_ingredients pi ON p.id = pi.product_id
        WHERE pi.id IS NULL
    LOOP
        -- Create a corresponding ingredient for this product
        INSERT INTO ingredients (name, unit, current_stock, cost_per_unit)
        VALUES (prod.name, 'UND', 0, 0) -- Defaulting to UND and 0 stock/cost
        RETURNING id INTO new_ing_id;

        -- Link the product to this new ingredient (1:1 relationship)
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
        VALUES (prod.id, new_ing_id, 1);
        
        RAISE NOTICE 'Fixed product: %', prod.name;
    END LOOP;
END $$;
