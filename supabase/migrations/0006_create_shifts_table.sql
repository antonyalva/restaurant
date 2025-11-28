-- Create Shifts Table for Cash Management
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID REFERENCES profiles(id) NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  initial_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  final_cash DECIMAL(10, 2),
  expected_cash DECIMAL(10, 2),
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can see all shifts
CREATE POLICY "shifts_admin_all" ON shifts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Cashiers can see their own shifts
CREATE POLICY "shifts_cashier_select_own" ON shifts FOR SELECT USING (
  auth.uid() = cashier_id
);

-- Cashiers can insert their own shifts
CREATE POLICY "shifts_cashier_insert_own" ON shifts FOR INSERT WITH CHECK (
  auth.uid() = cashier_id
);

-- Cashiers can update their own open shifts
CREATE POLICY "shifts_cashier_update_own" ON shifts FOR UPDATE USING (
  auth.uid() = cashier_id
);

-- Seed some sample data for visualization
DO $$
DECLARE
    admin_id UUID;
    cashier_id UUID;
BEGIN
    -- Try to get an admin and a cashier ID
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO cashier_id FROM profiles WHERE role = 'cashier' LIMIT 1;

    -- If no cashier, use admin for sample data
    IF cashier_id IS NULL THEN
        cashier_id := admin_id;
    END IF;

    IF cashier_id IS NOT NULL THEN
        -- Closed shift 1
        INSERT INTO shifts (cashier_id, start_time, end_time, initial_cash, final_cash, expected_cash, status)
        VALUES (cashier_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day' - INTERVAL '16 hours', 100.00, 531.00, 531.00, 'closed');

        -- Closed shift 2
        INSERT INTO shifts (cashier_id, start_time, end_time, initial_cash, final_cash, expected_cash, status)
        VALUES (cashier_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 hours', 150.00, 161.00, 161.00, 'closed');

        -- Open shift (Active)
        INSERT INTO shifts (cashier_id, start_time, initial_cash, status)
        VALUES (cashier_id, NOW(), 100.00, 'open');
    END IF;
END $$;
