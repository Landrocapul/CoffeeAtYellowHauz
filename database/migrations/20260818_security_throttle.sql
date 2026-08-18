USE yellow_hauz_pos;

-- Generic brute-force throttle store, keyed by an arbitrary scope (which
-- endpoint) and token (who/what is attempting). Used for staff PIN login
-- (scope='staff_login', token='<role>:<ip>') and the admin-PIN override on
-- void ticket (scope='void_admin_pin', token='<cashier user id>:<ip>').
CREATE TABLE IF NOT EXISTS security_throttle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope VARCHAR(50) NOT NULL,
    token VARCHAR(150) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_scope_token (scope, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
