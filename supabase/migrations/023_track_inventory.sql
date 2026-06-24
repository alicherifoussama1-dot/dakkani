-- 023: Track Inventory
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
