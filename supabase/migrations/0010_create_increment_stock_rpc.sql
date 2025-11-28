-- Function to safely increment stock
CREATE OR REPLACE FUNCTION increment_stock(row_id UUID, quantity DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE ingredients
  SET current_stock = current_stock + quantity,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
