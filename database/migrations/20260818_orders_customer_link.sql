USE yellow_hauz_pos;

-- Links online orders to the signed-in guest account that placed them, so the
-- account page can show accurate order history instead of matching by name.
-- NULL for orders placed by guests who checked out without signing in.
ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER table_id;
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE SET NULL;
ALTER TABLE orders ADD INDEX idx_orders_customer (customer_id);
