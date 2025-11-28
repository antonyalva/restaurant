-- Create loyalty_rules table for managing loyalty program rules
CREATE TABLE loyalty_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('monthly_spending', 'total_spending', 'visit_count')),
  condition_value DECIMAL(10, 2) NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_product', 'discount', 'points')),
  reward_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loyalty_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to view loyalty rules"
  ON loyalty_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert loyalty rules"
  ON loyalty_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update loyalty rules"
  ON loyalty_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete loyalty rules"
  ON loyalty_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert sample rule
INSERT INTO loyalty_rules (name, condition_type, condition_value, reward_type, reward_value, is_active)
VALUES ('Cliente VIP Mensual', 'monthly_spending', 500.00, 'free_product', 'PROMO FILETE Gratis', true);
