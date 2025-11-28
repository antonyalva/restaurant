-- Seed Data - Ingredients for Coffee Shop POS
-- Run this to populate the inventory

INSERT INTO ingredients (name, current_stock, unit, min_stock_level) VALUES
('Café Molido', 5000, 'g', 1000),
('Leche Entera', 20000, 'ml', 2000),
('Leche de Almendras', 5000, 'ml', 1000),
('Azúcar', 2000, 'g', 500),
('Jarabe de Vainilla', 1000, 'ml', 200),
('Jarabe de Chocolate', 1000, 'ml', 200),
('Polvo de Chocolate', 1000, 'g', 200),
('Té Chai Mix', 1000, 'g', 200),
('Fresas Congeladas', 2000, 'g', 500),
('Limones', 50, 'un', 10),
('Pan Ciabatta', 20, 'un', 5),
('Pollo Cocido', 1000, 'g', 200),
('Pesto', 500, 'g', 100),
('Bagels', 20, 'un', 5),
('Queso Crema', 1000, 'g', 200),
('Aguacate', 10, 'un', 3),
('Espinaca', 500, 'g', 100),
('Harina', 5000, 'g', 1000),
('Huevos', 60, 'un', 12),
('Mantequilla', 1000, 'g', 200);

-- Note: The previous seed (0002) referenced 'Café Molido' and 'Leche Entera' by name.
-- This insert ensures they exist so the recipes are valid.
