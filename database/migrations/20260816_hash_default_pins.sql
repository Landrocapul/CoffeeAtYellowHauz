-- Run once only on an existing local development database whose original seed
-- accounts still use the old admin123 placeholder.
-- Change these PINs immediately after signing in.
UPDATE users
SET password = '$2y$10$8yAL97YK2w/ZgozgknTMCuRlIJ9cBJbKwCvL4iwyB6aacavorOu0O'
WHERE employee_id = 'ADMIN001' AND password = 'admin123';

UPDATE users
SET password = '$2y$10$R/ilLsjISO8aBRkZZBFZyuapDyqCPbVe5pKxhalCqWusr/Obr3e6m'
WHERE employee_id = 'CASHIER001' AND password = 'admin123';
