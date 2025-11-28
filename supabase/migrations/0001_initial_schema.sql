-- Coffee Shop POS - Database Schema
-- Migration 0001: Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (User Management)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CATEGORIES (Product Organization)
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT, -- Lucide icon name
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PRODUCTS (Menu Items)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. VARIANTS (Size Options: Small/Medium/Large)
-- ============================================
CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Small", "Medium", "Large"
  price_modifier DECIMAL(10, 2) DEFAULT 0.00, -- Extra cost
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. MODIFIERS (Add-ons: Extra shot, Almond milk, etc.)
-- ============================================
CREATE TABLE modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: Products can have multiple modifiers
CREATE TABLE product_modifiers (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_id)
);

-- ============================================
-- 6. INGREDIENTS (Inventory Items)
-- ============================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- e.g., "ml", "g", "units"
  current_stock DECIMAL(10, 2) DEFAULT 0.00,
  min_stock DECIMAL(10, 2) DEFAULT 0.00, -- Alert threshold
  cost_per_unit DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PRODUCT_INGREDIENTS (Recipe)
-- ============================================
CREATE TABLE product_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE, -- Nullable for base product
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL, -- Amount used per sale
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_variant ON product_ingredients(variant_id);

-- ============================================
-- 8. ORDERS (Sales Transactions)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL, -- Human-readable: "2024-001"
  cashier_id UUID REFERENCES profiles(id),
  total DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'qr')) NOT NULL,
  amount_paid DECIMAL(10, 2),
  change_amount DECIMAL(10, 2) DEFAULT 0.00,
  loyalty_phone TEXT, -- Optional: link to loyalty program
  synced BOOLEAN DEFAULT false, -- For offline mode
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_synced ON orders(synced);

-- ============================================
-- 9. ORDER_ITEMS (Line Items in Order)
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. ORDER_ITEM_MODIFIERS (Track modifiers per item)
-- ============================================
CREATE TABLE order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES modifiers(id),
  modifier_price DECIMAL(10, 2) NOT NULL
);

-- ============================================
-- 11. STOCK_LOGS (Audit Trail for Inventory)
-- ============================================
CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  change_amount DECIMAL(10, 2) NOT NULL, -- Negative for deduction
  reason TEXT, -- e.g., "Sale", "Manual Adjustment", "Waste"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. LOYALTY_CARDS (Simple Points System)
-- ============================================
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only admins can write (except orders/order_items)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_all" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_admin_all" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "variants_select" ON variants FOR SELECT USING (true);
CREATE POLICY "variants_admin_all" ON variants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "modifiers_select" ON modifiers FOR SELECT USING (true);
CREATE POLICY "modifiers_admin_all" ON modifiers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "product_modifiers_select" ON product_modifiers FOR SELECT USING (true);

CREATE POLICY "ingredients_select" ON ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_admin_all" ON ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "product_ingredients_select" ON product_ingredients FOR SELECT USING (true);
CREATE POLICY "product_ingredients_admin_all" ON product_ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders: Anyone authenticated can create, select own or all if admin
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "orders_select" ON orders FOR SELECT USING (
  auth.uid() = cashier_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);

CREATE POLICY "order_item_modifiers_insert" ON order_item_modifiers FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "order_item_modifiers_select" ON order_item_modifiers FOR SELECT USING (true);

CREATE POLICY "stock_logs_select" ON stock_logs FOR SELECT USING (true);
CREATE POLICY "stock_logs_insert" ON stock_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "loyalty_cards_select" ON loyalty_cards FOR SELECT USING (true);
CREATE POLICY "loyalty_cards_insert" ON loyalty_cards FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "loyalty_cards_update" ON loyalty_cards FOR UPDATE USING (true);

-- ============================================
-- TRIGGERS (Auto Stock Deduction)
-- ============================================

-- Function to deduct stock when order is created
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct ingredients for each order item
  INSERT INTO stock_logs (ingredient_id, order_id, change_amount, reason)
  SELECT 
    pi.ingredient_id,
    NEW.id,
    -(pi.quantity * NEW.quantity),
    'Sale'
  FROM product_ingredients pi
  WHERE pi.product_id = NEW.product_id
    AND (pi.variant_id = NEW.variant_id OR pi.variant_id IS NULL);

  -- Update current stock
  UPDATE ingredients
  SET current_stock = current_stock + sl.total_change,
      updated_at = NOW()
  FROM (
    SELECT ingredient_id, SUM(change_amount) as total_change
    FROM stock_logs
    WHERE order_id = NEW.order_id
    GROUP BY ingredient_id
  ) sl
  WHERE ingredients.id = sl.ingredient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_order();

-- ============================================
-- INITIAL SEED DATA (Optional, for testing)
-- ============================================

-- Categories
INSERT INTO categories (name, icon, sort_order) VALUES
('Bebidas Calientes', 'Coffee', 1),
('Bebidas Frías', 'IceCream', 2),
('Comida', 'Sandwich', 3),
('Postres', 'Cake', 4);

-- Sample modifiers
INSERT INTO modifiers (name, price) VALUES
('Leche de Almendra', 0.50),
('Leche de Avena', 0.50),
('Extra Shot Espresso', 0.80),
('Crema Batida', 0.30),
('Jarabe de Vainilla', 0.40);

-- Sample ingredients
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES
('Café Molido', 'g', 5000, 500, 0.02),
('Leche Entera', 'ml', 10000, 1000, 0.001),
('Azúcar', 'g', 3000, 300, 0.005),
('Hielo', 'g', 5000, 500, 0.001);

COMMIT;
