USE yellow_hauz_pos;

CREATE TABLE IF NOT EXISTS customer_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contact_number VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reservations ADD COLUMN customer_id INT NULL AFTER table_id;
ALTER TABLE reservations ADD CONSTRAINT fk_reservations_customer FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE SET NULL;
