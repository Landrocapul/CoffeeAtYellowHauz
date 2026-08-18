-- Run this once on an existing working yellow_hauz_pos database.
USE yellow_hauz_pos;

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_code VARCHAR(50) UNIQUE NOT NULL,
    table_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    guest_count INT NOT NULL,
    reservation_at DATETIME NOT NULL,
    notes VARCHAR(500) NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_reservation_table_time (table_id, reservation_at),
    INDEX idx_reservation_at (reservation_at),
    INDEX idx_reservation_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
