-- Migration: add currency columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency     VARCHAR(3)     DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS hourly_rate  NUMERIC(10,2);

-- Back-fill existing rows
UPDATE orders SET currency = 'INR', hourly_rate = hourly_rate_inr WHERE currency IS NULL;
