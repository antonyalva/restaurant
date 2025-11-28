-- Fix deduct_stock_on_order function to use correct order_id
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct ingredients for each order item
  INSERT INTO stock_logs (ingredient_id, order_id, change_amount, reason)
  SELECT 
    pi.ingredient_id,
    NEW.order_id, -- FIXED: Use NEW.order_id instead of NEW.id
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
