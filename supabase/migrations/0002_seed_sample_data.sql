-- Seed Data - Sample Products for Coffee Shop POS
-- Run this after the initial schema migration

-- Clear existing data (optional, for testing)
-- DELETE FROM order_items;
-- DELETE FROM orders;
-- DELETE FROM product_ingredients;
-- DELETE FROM products;

-- Insert sample products for each category
DO $$
DECLARE
    cat_hot UUID;
    cat_cold UUID;
    cat_food UUID;
    cat_desserts UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO cat_hot FROM categories WHERE name = 'Bebidas Calientes';
    SELECT id INTO cat_cold FROM categories WHERE name = 'Bebidas Frías';
    SELECT id INTO cat_food FROM categories WHERE name = 'Comida';
    SELECT id INTO cat_desserts FROM categories WHERE name = 'Postres';

    -- Bebidas Calientes
    INSERT INTO products (name, description, base_price, category_id, is_active) VALUES
    ('Espresso', 'Shot de café concentrado', 2.50, cat_hot, true),
    ('Americano', 'Espresso con agua caliente', 3.00, cat_hot, true),
    ('Latte', 'Espresso con leche vaporizada', 4.50, cat_hot, true),
    ('Cappuccino', 'Espresso con espuma de leche', 4.50, cat_hot, true),
    ('Mocha', 'Latte con chocolate', 5.00, cat_hot, true),
    ('Flat White', 'Espresso con microespuma de leche', 4.75, cat_hot, true),
    ('Macchiato', 'Espresso con un toque de leche', 3.50, cat_hot, true),
    ('Té Chai Latte', 'Té especiado con leche', 4.25, cat_hot, true);

    -- Bebidas Frías
    INSERT INTO products (name, description, base_price, category_id, is_active) VALUES
    ('Iced Latte', 'Latte servido con hielo', 5.00, cat_cold, true),
    ('Iced Americano', 'Americano con hielo', 3.50, cat_cold, true),
    ('Frappuccino de Vainilla', 'Bebida helada cremosa', 6.00, cat_cold, true),
    ('Cold Brew', 'Café de extracción en frío', 4.50, cat_cold, true),
    ('Iced Mocha', 'Mocha con hielo', 5.50, cat_cold, true),
    ('Smoothie de Fresa', 'Batido natural de frutas', 5.75, cat_cold, true),
    ('Limonada', 'Limonada natural', 3.50, cat_cold, true);

    -- Comida
    INSERT INTO products (name, description, base_price, category_id, is_active) VALUES
    ('Croissant', 'Croissant de mantequilla francés', 3.50, cat_food, true),
    ('Sándwich de Pollo', 'Pan ciabatta con pollo y pesto', 7.50, cat_food, true),
    ('Bagel con Queso Crema', 'Bagel tostado con queso', 4.00, cat_food, true),
    ('Wrap Vegetariano', 'Tortilla con vegetales frescos', 6.50, cat_food, true),
    ('Tostada con Aguacate', 'Pan integral con aguacate', 6.00, cat_food, true),
    ('Quiche de Espinaca', 'Porción de quiche casero', 5.50, cat_food, true);

    -- Postres
    INSERT INTO products (name, description, base_price, category_id, is_active) VALUES
    ('Brownie de Chocolate', 'Brownie casero con nueces', 4.00, cat_desserts, true),
    ('Cheesecake', 'Porción de cheesecake clásico', 5.50, cat_desserts, true),
    ('Cookie de Chispas', 'Galleta gigante recién horneada', 2.50, cat_desserts, true),
    ('Muffin de Arándanos', 'Muffin esponjoso', 3.50, cat_desserts, true),
    ('Tiramisu', 'Postre italiano clásico', 6.00, cat_desserts, true),
    ('Donut Glaseado', 'Donut artesanal', 2.75, cat_desserts, true);

END $$;

-- Insert variants (sizes) for beverages
DO $$
DECLARE
    prod RECORD;
BEGIN
    FOR prod IN 
        SELECT id FROM products 
        WHERE category_id IN (
            SELECT id FROM categories WHERE name IN ('Bebidas Calientes', 'Bebidas Frías')
        )
    LOOP
        INSERT INTO variants (product_id, name, price_modifier) VALUES
        (prod.id, 'Pequeño', -0.50),
        (prod.id, 'Mediano', 0.00),
        (prod.id, 'Grande', 0.75);
    END LOOP;
END $$;

-- Link some products to ingredients (recipes)
DO $$
DECLARE
    prod_latte UUID;
    prod_cappuccino UUID;
    ing_coffee UUID;
    ing_milk UUID;
    var_grande UUID;
BEGIN
    SELECT id INTO prod_latte FROM products WHERE name = 'Latte' LIMIT 1;
    SELECT id INTO prod_cappuccino FROM products WHERE name = 'Cappuccino' LIMIT 1;
    SELECT id INTO ing_coffee FROM ingredients WHERE name = 'Café Molido' LIMIT 1;
    SELECT id INTO ing_milk FROM ingredients WHERE name = 'Leche Entera' LIMIT 1;

    -- Latte recipe (base - mediano)
    IF prod_latte IS NOT NULL AND ing_coffee IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES
        (prod_latte, ing_coffee, 18),  -- 18g de café
        (prod_latte, ing_milk, 250);   -- 250ml de leche
    END IF;

    -- Cappuccino recipe
    IF prod_cappuccino IS NOT NULL AND ing_coffee IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity) VALUES
        (prod_cappuccino, ing_coffee, 18),
        (prod_cappuccino, ing_milk, 180);
    END IF;
END $$;

COMMIT;
