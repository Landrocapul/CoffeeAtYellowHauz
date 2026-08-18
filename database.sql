CREATE DATABASE IF NOT EXISTS yellow_hauz_pos;
USE yellow_hauz_pos;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('cashier', 'admin') NOT NULL DEFAULT 'cashier',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_employee_id (employee_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'fa-solid fa-utensils',
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    temperature ENUM('hot', 'iced', 'cold', 'room temp', 'both', 'blended', 'blended iced') DEFAULT 'both',
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 50,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category_id (category_id),
    INDEX idx_name (name),
    INDEX idx_price (price),
    INDEX idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tables Table (for table management)
CREATE TABLE IF NOT EXISTS tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    capacity INT DEFAULT 4,
    area ENUM('normal', 'airconditioned') DEFAULT 'normal',
    status ENUM('available', 'occupied', 'reserved', 'cleaning') DEFAULT 'available',
    current_order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_number (table_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer accounts are deliberately separate from staff accounts and roles.
CREATE TABLE IF NOT EXISTS customer_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contact_number VARCHAR(30) NOT NULL,
    password VARCHAR(255) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer table reservations are separate from active POS orders.
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_code VARCHAR(50) UNIQUE NOT NULL,
    table_id INT NOT NULL,
    customer_id INT NULL,
    customer_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    guest_count INT NOT NULL,
    reservation_at DATETIME NOT NULL,
    notes VARCHAR(500) NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
    UNIQUE KEY uq_reservation_table_time (table_id, reservation_at),
    INDEX idx_reservation_at (reservation_at),
    INDEX idx_reservation_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    table_id INT NULL,
    customer_id INT NULL,
    customer_name VARCHAR(255),
    order_type ENUM('dine_in', 'take_away', 'delivery') NOT NULL DEFAULT 'dine_in',
    payment_method ENUM('cash', 'card', 'gcash') NOT NULL DEFAULT 'cash',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) DEFAULT 12.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    cashier_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_cashier_id (cashier_id),
    INDEX idx_orders_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_menu_item_id (menu_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generic brute-force throttle store, keyed by scope (which endpoint) and
-- token (who/what is attempting). Used for staff PIN login and the
-- admin-PIN override on void ticket.
CREATE TABLE IF NOT EXISTS security_throttle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope VARCHAR(50) NOT NULL,
    token VARCHAR(150) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_scope_token (scope, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Data

-- Insert Default Users (PINs: admin 1234, cashier 0000)
INSERT INTO users (employee_id, username, password, full_name, role) VALUES
('ADMIN001', 'admin', '1234', 'System Administrator', 'admin'),
('CASHIER001', 'cashier', '0000', 'Sheila Mae Aledro', 'cashier');

-- Insert Default Categories
INSERT INTO categories (id, name, icon, sort_order) VALUES
(1, 'Breakfast', 'fa-solid fa-egg', 1),
(2, 'Appetizer', 'fa-solid fa-utensils', 2),
(3, 'Meal', 'fa-solid fa-bowl-rice', 3),
(4, 'Pasta', 'fa-solid fa-bowl-food', 4),
(5, 'Pizza', 'fa-solid fa-pizza-slice', 5),
(6, 'Sandwich', 'fa-solid fa-bread-slice', 6),
(7, 'Cakes/Pastries', 'fa-solid fa-cake-candles', 7),
(8, 'Add-on Food', 'fa-solid fa-plus', 8),
(9, 'Hot Coffee', 'fa-solid fa-mug-hot', 9),
(10, 'On The Rocks', 'fa-solid fa-glass-water', 10),
(11, 'Blended Coffee', 'fa-solid fa-blender', 11),
(12, 'Cream Blended', 'fa-solid fa-ice-cream', 12),
(13, 'Hot Drinks', 'fa-solid fa-fire', 13),
(14, 'Refreshers', 'fa-solid fa-lemon', 14),
(15, 'Milkshakes', 'fa-solid fa-whiskey-glass', 15),
(16, 'Milk Tea', 'fa-solid fa-leaf', 16),
(17, 'Drink Add-ons', 'fa-solid fa-plus', 17);
-- Insert Default Menu Items
INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(7, 'Banana Muffin', 'Freshly baked muffin made with ripe bananas', 120.00, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 18),
(7, 'Blueberry Cheesecake Cake', 'Rich layered cake combining classic cheesecake with fresh blueberry swirls', 170.00, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 8),
(7, 'Brownie Ala', 'Warm, fudgy brownie topped with a scoop of vanilla ice cream', 150.00, 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 12),
(7, 'Burnt Cheesecake', 'Basque-style cheesecake with a perfectly charred top and creamy center', 250.00, 'https://images.unsplash.com/photo-1510854438510-9080560702d0?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 6),
(7, 'Cheesecake', 'Classic, smooth, and creamy New York-style cheesecake', 140.00, 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 10),
(7, 'Cheese Cups', 'Bite-sized pastry cups filled with a sweet and savory cheese mixture', 140.00, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 14),
(7, 'Oreos & Cream', 'Decadent dessert layered with crushed Oreo cookies and smooth whipped cream', 160.00, 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 10),
(7, 'Affogato', 'A shot of hot espresso poured over a scoop of vanilla ice cream', 140.00, 'https://images.unsplash.com/photo-1594631252845-29fc4586d5d7?q=80&w=600&auto=format&fit=crop', 'blended', FALSE, TRUE, 16),

(7, 'Yema Cake', 'Sponge cake layered with sweet, creamy custard-like yema frosting', 130.00, 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 9),
(7, 'Oatmeal Fudge', 'Chewy oatmeal bars filled with a rich chocolate fudge center', 130.00, 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 16),
(7, 'Tiramisu', 'Traditional Italian coffee-flavored dessert with ladyfingers and mascarpone', 150.00, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 8),
(7, 'Oatmeal Cashew Cookie', 'Chewy oatmeal cookie packed with crunchy roasted cashew nuts', 95.00, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 24),
(7, 'Suman Plain', 'Traditional Filipino steamed sticky rice cake wrapped in banana leaves', 70.00, 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(7, 'Gourmet Cookie', 'Thick, bakery-style cookie made with premium chocolate and ingredients', 160.00, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 20),
(7, 'Banana Pudding', 'Creamy custard layered with vanilla wafers and sliced fresh bananas', 160.00, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 10),

(7, 'Ensaymada', 'Soft, buttery Filipino sweet dough topped with grated cheese and sugar', 140.00, 'https://images.unsplash.com/photo-1620921515286-90396499878a?q=80&w=600&auto=format&fit=crop', 'room temp' , FALSE, TRUE, 22),
(7, 'Nutella Bar', 'Decadent dessert bar layered with chocolate and hazelnut Nutella', 130.00, 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 14),
(7, 'Banana Bar', 'Moist and sweet bar cake bursting with natural banana flavor', 120.00, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 16),
(7, 'Biscoff', 'Sweet treat featuring the distinct caramelized flavor of Lotus Biscoff', 220.00, 'https://images.unsplash.com/photo-1590080874088-eec64895b423?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 9),
(7, 'Cheesecake Flan', 'A unique and indulgent combination of creamy leche flan and cheesecake', 210.00, 'https://images.unsplash.com/photo-1510854438510-9080560702d0?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 7),
(7, 'Chocolate Strawberries', 'Fresh, juicy strawberries hand-dipped in premium melted chocolate', 180.00, 'https://images.unsplash.com/photo-1599923384282-3d84a7e78d2b?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 12),
(7, 'ChocNut Cup', 'Filipino childhood favorite flavor in a creamy dessert cup', 100.00, 'https://images.unsplash.com/photo-1582231246141-e99d863f1ec2?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 15);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(8, 'Plain Rice', 'A single serving of steamed white jasmine rice', 50.00, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 35),
(8, 'Pesto Rice', 'Fragrant steamed rice tossed in a rich, herby basil pesto sauce', 70.00, 'https://images.unsplash.com/photo-1547496502-affa22d38842?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 22),
(8, 'Scrambled Egg', 'Fluffy, seasoned eggs cooked to a soft scramble', 40.00, 'https://images.unsplash.com/photo-1522751354508-24799651fd22?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 30),
(8, 'Sunny Side-up', 'A single egg fried with the yolk perfectly intact and runny', 40.00, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 30),
(8, 'Vanilla Ice Cream', 'A classic scoop of creamy, smooth vanilla bean ice cream', 40.00, 'https://images.unsplash.com/photo-1570197788417-0e82375c9391?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 24),
(8, 'Chili Garlic Bits', 'Extra crispy fried garlic bits in a spicy chili-infused oil', 25.00, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop', 'room temp' , FALSE, TRUE, 28),
(8, 'Chips', 'A side of crunchy, lightly salted potato chips', 60.00, 'https://images.unsplash.com/photo-1566478431375-73f1aea89e69?q=80&w=600&auto=format&fit=crop', 'room temp', FALSE, TRUE, 26),
(8, 'Cheese (35g)', 'A side serving of premium grated or sliced cheese', 45.00, 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 20);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(6, 'Club Sandwich', 'A classic triple-decker sandwich with chicken, ham, egg, lettuce, and tomato', 230.00, 'https://images.unsplash.com/photo-1567234665766-ee123c09874e?q=80&w=600&auto=format&fit=crop', 'room temp' , FALSE, TRUE, 12),
(6, 'Chicken Sandwich', 'Tender seasoned chicken breast with fresh greens and savory spread', 200.00, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 14),
(6, 'Egg Mayo', 'Creamy egg salad mixed with premium mayo and herbs on soft bread', 180.00, 'https://images.unsplash.com/photo-1509722747041-619f35d503cc?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 16),
(6, 'Grilled Garlic cheese', 'Gooey melted cheese blend with aromatic roasted garlic on toasted sourdough', 180.00, 'https://images.unsplash.com/photo-1528733918455-5a59687cedf0?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 15),
(6, 'Tuna Melt Sandwich', 'Savory tuna salad topped with melted cheddar cheese, served warm', 190.00, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 13),
(6, 'YH NoriDog', 'A unique specialty hotdog wrapped in crispy nori seaweed with a Japanese twist', 170.00, 'https://images.unsplash.com/photo-1627023411197-6851b6952c4c?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 10);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(5, 'All Meat Pizza', 'Loaded with pepperoni, ham, bacon, and ground beef on a thick crust', 300.00, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 9),
(5, 'Spicy Sardines Pizza', 'A unique savory blend of premium sardines with a spicy chili kick', 210.00, 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 7),
(5, 'Chili Chorizo Pizza', 'Zesty Spanish chorizo slices paired with fresh green chilies', 200.00, 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 8),
(5, 'Yellow Hauz Special Pizza', 'Our signature house pizza featuring a secret blend of toppings and gourmet cheese', 210.00, 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 10),
(5, 'Ham & Bacon Pizza', 'The classic duo of savory ham and crispy bacon bits on melted mozzarella', 200.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 9),
(5, 'Three Cheese Pizza', 'A rich, decadent combination of mozzarella, cheddar, and parmesan cheeses', 240.00, 'https://images.unsplash.com/photo-1573821663912-569905455b1c?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 8),
(5, 'Hawaiian Pizza', 'Sweet pineapple chunks and savory ham slices for a tropical flavor profile', 200.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 10);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(4, 'Chicken Pasta Salad', 'A refreshing blend of pasta, tender chicken chunks, and fresh vegetables in a light dressing', 120.00, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 12),
(4, 'Hungarian & Bacon', 'Savory pasta tossed with smokey Hungarian sausage slices and crispy bacon bits', 240.00, 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 10),
(4, 'Spaghetti Bolognese', 'Classic Italian-style meat sauce served over perfectly cooked al dente spaghetti', 230.00, 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 14),
(4, 'Tuna & Garlic Pasta', 'Light yet flavorful pasta infused with aromatic sautéed garlic and premium tuna flakes', 230.00, 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 11);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(3, 'Fried Bangus', 'Crispy fried milkfish marinated in vinegar and garlic, a Filipino favorite served with rice', 270.00, 'https://images.unsplash.com/photo-1626509135522-646d6767ab64?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 8),
(3, 'Rosemary Porkchop', 'Juicy pan-seared pork chop seasoned with fresh rosemary and garlic butter', 270.00, 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 7),
(3, 'Chicken Pesto', 'Grilled chicken breast topped with a rich and aromatic basil pesto sauce', 270.00, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 10),
(3, 'Papa Carlos Butifarra', 'Authentic Spanish-style pork sausage known for its savory and peppery flavor profile', 300.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 6),
(3, 'Lamb Adobo Flakes', 'Slow-cooked, shredded lamb meat fried to a crisp and served with a tangy adobo reduction', 420.00, 'https://images.unsplash.com/photo-1551185340-7d934824248f?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 5),
(3, 'Pork Adobo Flakes', 'Savory shredded pork adobo crisped to perfection for a satisfying crunch', 310.00, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 9),
(3, 'Marinated Tofu', 'Healthy and savory tofu blocks marinated in a special soy-ginger sauce and grilled', 250.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 12),
(3, 'Homemade Corned Beef', 'Premium beef brined and slow-cooked in-house, then hand-pulled and sautéed', 320.00, 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 6);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(1, 'Chicken Tocino', 'Sweet and savory cured chicken, traditionally served with garlic rice and egg', 230.00, 'https://images.unsplash.com/photo-1626132646529-500637532537?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 13),
(1, 'Hungarian Sausage', 'Grilled spicy Hungarian sausage with a snap, served with rice or bread', 230.00, 'https://images.unsplash.com/photo-1547050605-2f87fa0578db?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 10),
(1, 'Longganisa', 'Local Filipino sweet and garlic pork sausages, pan-fried to caramelized perfection', 230.00, 'https://images.unsplash.com/photo-1632778149175-9ab81e4c79b3?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 14),
(1, 'Waffles', 'Classic golden brown waffles served with butter and maple syrup', 160.00, 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(1, 'Nutella Waffles', 'Warm waffles topped with a generous spread of hazelnut cocoa cream', 200.00, 'https://images.unsplash.com/photo-1588613143003-899479e0018f?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 14),
(1, 'Chicken Waffles', 'The ultimate savory-sweet duo: crispy fried chicken paired with fluffy waffles', 270.00, 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 8);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(2, 'Garlic Bread', 'Toasted baguette slices brushed with herb-infused garlic butter', 120.00, 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 22),
(2, 'Hungarian Sausage w/ fries', 'Sliced spicy Hungarian sausage served with a side of crispy golden fries', 270.00, 'https://images.unsplash.com/photo-1599321955419-780170481d61?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 9),
(2, 'Pica Platter', 'An assortment of finger foods perfect for sharing', 350.00, 'https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 7),
(2, 'Potato Wedges', 'Thick-cut potato wedges seasoned with herbs and salt, served with a dip', 220.00, 'https://images.unsplash.com/photo-1592119747782-d8c12c2ea2b7?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(2, 'Kamote Fries', 'Sweet potato fries (kamote) - a healthier, naturally sweet local alternative to potato fries', 220.00, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 16),
(2, 'Fruits and Nuts Salad', 'Fresh seasonal fruits mixed with crunchy nuts over a bed of garden greens', 260.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 9),
(2, 'Mango Kani Salad', 'A Japanese-inspired salad with ripe mangoes, crab sticks, and creamy mayo dressing', 260.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 10),
(2, 'Garden Salad', 'A classic mix of fresh greens, tomatoes, and cucumbers with a light vinaigrette', 260.00, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 12),
(2, 'Tuna Salad', 'Hearty tuna flakes mixed with greens and a zesty dressing', 260.00, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 10);




INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(9, 'Espresso', 'A concentrated shot of bold, intense coffee with a rich crema', 100.00, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 36),
(9, 'Macchiato', 'Freshly pulled espresso "marked" with a dollop of frothy steamed milk', 110.00, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 28),
(9, 'Americano Hot', 'Rich espresso shots diluted with hot water for a classic black coffee experience', 140.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 34),
(9, 'Caramella', 'A sweet and buttery caramel-infused espresso drink topped with foam', 200.00, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 22),
(9, 'Cappuccino', 'Equal parts espresso, steamed milk, and thick milk foam', 170.00, 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 30),
(9, 'Cortado', 'A balanced 1:1 ratio of espresso and warm steamed milk to reduce acidity', 150.00, 'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 24),
(9, 'Doppio', 'Two shots of pure, high-quality espresso for double the energy', 180.00, 'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 20),
(9, 'Flat White', 'Smooth ristretto shots with a thin layer of velvety micro-foam', 170.00, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 26),
(9, 'Latte', 'Creamy steamed milk poured over a shot of rich espresso', 170.00, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 34),
(9, 'Nutty Coffee', 'Espresso-based drink with toasted nut flavors and creamy milk', 200.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 20),
(9, 'Toasted', 'Signature roasted coffee blend with deep, smoky undertones', 200.00, 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(9, 'Dirty Matcha', 'A vibrant matcha green tea latte "dirtied" with a shot of espresso', 250.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 16),
(9, 'Filtered Coffee', 'Freshly brewed pour-over coffee highlighting the beans'' natural notes', 160.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 24),
(9, 'YH Mocha', 'The house specialty mocha, blending premium cocoa with rich espresso', 200.00, 'https://images.unsplash.com/photo-1553909489-cd47e0907980?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 22),
(9, 'Spanish Latte', 'A sweet and creamy latte made with condensed milk for a silky finish', 200.00, 'https://images.unsplash.com/photo-1594631252845-29fc4586d5d7?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 32),
(9, 'Almond Creme', 'Espresso topped with a velvety, almond-infused cream', 200.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(9, 'Orange Mocha', 'A unique citrus twist on the classic chocolate and espresso pairing', 190.00, 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 16),
(9, 'Sapin-sapin', 'A local-inspired latte featuring the colorful, layered flavors of the traditional rice cake', 200.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 14),
(9, 'Bukidnon Arabica', 'Premium single-origin beans from the mountains of Bukidnon', 10.00, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 12);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(10, 'Iced Caramel', 'Chilled espresso and milk with a sweet caramel swirl over ice', 210.00, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 28),
(10, 'Milk Coffee w/ Jelly', 'Creamy iced coffee packed with chewy coffee jelly pearls', 220.00, 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 24),
(10, 'Iced Matcha', 'Premium Japanese green tea whisked and served over ice with milk', 260.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 20),
(10, 'Iced Dark Chocolate', 'Rich, decadent dark chocolate blend served chilled over ice', 210.00, 'https://images.unsplash.com/photo-1553909489-cd47e0907980?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 22),
(10, 'Strawberry Mocha Foam', 'A fusion of chocolate and espresso topped with a light strawberry cream foam', 230.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 16),
(10, 'Spanish Latte On The Rocks', 'Our signature sweet Spanish latte served over ice for a refreshing finish', 210.00, 'https://images.unsplash.com/photo-1594631252845-29fc4586dbd0?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 30),
(10, 'Iced Dirty Matcha', 'A layered iced matcha latte topped with a bold shot of espresso', 260.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 18),
(10, 'Iced Americano', 'Bold espresso shots diluted with cold water and served over ice', 150.00, 'https://images.unsplash.com/photo-1551030173-122adabb8158?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 34),
(10, 'Iced Latte', 'Smooth espresso and chilled milk poured over ice', 180.00, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 32),
(10, 'Iced Cappuccino', 'Iced espresso and milk topped with a layer of cold milk foam', 180.00, 'https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 24),
(10, 'Iced Nutty Coffee', 'Chilled coffee featuring toasted nut flavors and a creamy finish', 210.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 20),
(10, 'Iced YH Mocha', 'Our specialty house mocha recipe served refreshing and cold', 210.00, 'https://images.unsplash.com/photo-1559811814-e2c5c3276bbb?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 22),
(10, 'Iced Sapin-sapin', 'A cold version of our local-inspired latte with layered traditional flavors', 210.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 14),
(10, 'Iced Almond Creme', 'Iced espresso topped with our signature velvety almond-infused cream', 210.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 18),
(10, 'Iced Strawberry Matcha', 'Earthy matcha layered with sweet strawberry puree and milk over ice', 210.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 16),
(10, 'Iced Toasted Mallows', 'Iced coffee topped with toasted marshmallow flavor and a hint of smoke', 210.00, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 15),
(10, 'Hojicha', 'Chilled roasted Japanese green tea with a unique smoky and nutty profile', 210.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 14),
(10, 'Iced Kadayawan', 'A special floral and fruity iced blend celebrating the Davao festival', 160.00, 'https://images.unsplash.com/photo-1551030173-122adabb8158?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 12);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(11, 'Coffee tea or me', 'A unique blended fusion of coffee and tea notes for a refreshing kick', 230.00, 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 16),
(11, 'Coffeecat', 'A smooth and playful blended coffee treat with a rich, velvety texture', 230.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 14),
(11, 'Coffeelandia', 'A grand escape in a cup featuring deep espresso blended with ice and cream', 230.00, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 15),
(11, 'Coffeemate', 'The perfect companion: a balanced and creamy coffee-based frappe', 230.00, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 14),
(11, 'Coffeeright', 'Getting the blend just right with this signature chilled coffee concoction', 230.00, 'https://images.unsplash.com/photo-1551030173-122adabb8158?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 13),
(11, 'Coffeeteria', 'A cafeteria classic reimagined as a premium ice-blended coffee', 230.00, 'https://images.unsplash.com/photo-1594631252845-29fc4586dbd0?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 13),
(11, 'Coffeefornication', 'An irresistibly bold and indulgent blended coffee for the ultimate caffeine lover', 230.00, 'https://images.unsplash.com/photo-1559811814-e2c5c3276bbb?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 12);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(12, 'Blueberry Cheesecake Blended', 'A creamy, dessert-inspired frappe with real blueberry swirls and graham cracker notes', 230.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 14),
(12, 'Caramella Blended', 'A caffeine-free, velvety smooth cream-based blend with rich caramel sauce', 230.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 16),
(12, 'Chocomint', 'A refreshing ice-blended treat combining decadent chocolate with a cool mint finish', 210.00, 'https://images.unsplash.com/photo-1544145945-f904253d0c71?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 15);


INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(13, 'Babyccino', 'A warm, frothy milk drink topped with a dusting of cocoa powder—perfect for the little ones', 100.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 20),
(13, 'YH Dark Chocolate', 'Indulge in our signature house-blend dark chocolate, served hot and velvety smooth', 200.00, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 22),
(13, 'Earl Grey Latte', 'A soothing combination of aromatic Earl Grey tea and creamy steamed milk', 180.00, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(13, 'Matcha Latte', 'Premium grade Japanese matcha whisked with silky steamed milk for a zen-like experience', 250.00, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?q=80&w=600&auto=format&fit=crop', 'hot' , FALSE, TRUE, 20),
(13, 'YH White Chocolate', 'A sweet and creamy hot white chocolate blend, perfect for those with a sweet tooth', 200.00, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 18),
(13, 'Hot Milk', 'A simple, comforting cup of fresh steamed milk', 110.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 16);


INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(14, 'Calamansi', 'Freshly squeezed Philippine lime juice, a perfect balance of sweet and tart', 150.00, 'https://images.unsplash.com/photo-1513558161293-cdaf76589fd8?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 28),
(14, 'Yellow Passion', 'A vibrant and tropical passion fruit blend that packs a punch of flavor', 150.00, 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 22),
(14, 'Cucumber Lemonade', 'Cool and refreshing lemonade infused with crisp cucumber slices', 150.00, 'https://images.unsplash.com/photo-1517093157656-b99917bc5d18?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 26),
(14, 'YH Iced Tea', 'The house signature iced tea blend, brewed fresh and served chilled', 170.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 32),
(14, 'Strawberry Fizz', 'A bubbly and refreshing sparkling drink with sweet strawberry notes', 120.00, 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 20),
(14, 'Lemon Fizz', 'Zesty lemon sparkling soda for a crisp, effervescent pick-me-up', 120.00, 'https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 22),
(14, 'San Miguel Pilsen', 'Classic Filipino pale lager known for its smooth, full-bodied taste', 100.00, 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 18);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(15, 'Banana Strawberry', 'A classic creamy blend of fresh bananas and sweet strawberries', 240.00, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 14),
(15, 'Butterscotch', 'Rich and buttery smooth milkshake with deep brown sugar notes', 240.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 13),
(15, 'Cheese Taro', 'A unique Filipino-inspired blend of earthy taro and savory cheese cream', 240.00, 'https://images.unsplash.com/photo-1579954115545-a95591f28be0?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 12),
(15, 'Chocolate', 'Thick and indulgent milkshake made with premium cocoa', 230.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 16),
(15, 'Cookies and Cream', 'Vanilla base loaded with crushed chocolate sandwich cookies', 240.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 18),
(15, 'Mango Milkshake', 'Creamy shake made with ripe Philippine mangoes', 230.00, 'https://images.unsplash.com/photo-1537640538966-79f369b41e8f?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 15),
(15, 'Mocha java', 'A perfect blend of rich chocolate and bold coffee in a chilled shake', 180.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 14),
(15, 'Rocky Road', 'Chocolate shake mixed with nuts and marshmallows for that classic crunch', 240.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 12),
(15, 'Strawberry Mango', 'A tropical fusion of sweet strawberries and tangy mangoes', 180.00, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 13),
(15, 'Strawberry Milkshake', 'Sweet and creamy strawberry delight topped with a swirl of cream', 230.00, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 15),
(15, 'Vanilla', 'Pure, classic vanilla bean milkshake—simple and elegant', 230.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 18),
(15, 'Vanilla Fudge', 'Smooth vanilla shake rippled with thick chocolate fudge', 220.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 14);

INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(16, 'Caramel Vanilla Milktea', 'A smooth blend of classic tea with sweet caramel and fragrant vanilla notes', 180.00, 'https://images.unsplash.com/photo-1558857563-b371f30ca6a3?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 24),
(16, 'Cookies and Cream', 'Milk tea base mixed with crushed chocolate cookies for a delightful crunch', 180.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 18),
(16, 'Dark Chocolate', 'Rich and bold dark chocolate milk tea for the ultimate cocoa lover', 180.00, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 20),
(16, 'Oolong', 'A traditional, earthier tea profile with a smooth and creamy milk finish', 180.00, 'https://images.unsplash.com/photo-1563823251941-b9989d1e8d97?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 18),
(16, 'Wintermelon Milktea', 'The fan-favorite sweet and refreshing wintermelon flavored milk tea', 180.00, 'https://images.unsplash.com/photo-1558857563-b371f30ca6a3?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 28),
(16, 'Wintermelon w/ Coffee Jelly', 'Sweet wintermelon milk tea paired with chewy, bold coffee jelly cubes', 210.00, 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=600&auto=format&fit=crop', 'cold' , FALSE, TRUE, 22);

-- ADD ON DRINKS (Category 17)
INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_best_seller, is_available, quantity) VALUES
(17, 'Coffee Jelly', 'Chewy cubes of coffee-infused gelatin to add texture to your drink', 40.00, 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 35),
(17, 'Almond Milk', 'Substitute dairy with our creamy, lactose-free almond milk option', 40.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 24),
(17, 'Ice Cream', 'A scoop of premium vanilla ice cream to top off your shake or coffee', 40.00, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 28),
(17, 'Syrup', 'An extra pump of your favorite flavoring syrup', 20.00, 'https://images.unsplash.com/photo-1589733901241-5e56478f4797?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 40),
(17, 'Oatmilk', 'A rich and sustainable plant-based milk alternative', 40.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 22),
(17, 'Macadamia Milk', 'Luxuriously creamy macadamia nut milk for a nutty flavor profile', 30.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 16),
(17, 'Honey', 'Natural sweetener to add a floral touch to your tea or coffee', 35.00, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=600&auto=format&fit=crop', 'hot', FALSE, TRUE, 30),
(17, 'Bottled Water', 'Purified bottled water for simple hydration', 25.00, 'https://images.unsplash.com/photo-1560023907-5f339617ea30?q=80&w=600&auto=format&fit=crop', 'cold', FALSE, TRUE, 48);

-- Insert Default Tables
INSERT INTO tables (table_number, capacity, area, status) VALUES
 (1, 4, 'normal', 'available'),
 (2, 4, 'normal', 'available'),
 (3, 6, 'normal', 'available'),
 (4, 4, 'normal', 'available'),
 (5, 2, 'airconditioned', 'available'),
 (6, 8, 'airconditioned', 'available'),
 (7, 4, 'airconditioned', 'available'),
 (8, 4, 'airconditioned', 'available');

-- Insert Default Settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('tax_rate', '12', 'number', 'Default tax rate percentage'),
('currency', 'PHP', 'string', 'Currency symbol'),
('shop_name', 'Coffee at Yellow Hauz', 'string', 'Shop name for receipts'),
('shop_address', 'Yellow Hauz, Philippines', 'string', 'Shop address'),
('shop_phone', '+63 912 345 6789', 'string', 'Shop contact number'),
('receipt_footer', 'Thank you for visiting Coffee at Yellow Hauz!', 'string', 'Footer message for receipts'),
('business_hours', '07:00-22:00', 'string', 'Operating hours'),
('time_based_menus', '[{"title":"Morning Menu","time":"Opening - 11:00 AM","focus":"Heavy breakfast sales, premium coffee pairings, and quick pastries.","start":"00:00","end":"11:00","item_names":["Chicken Tocino","Hungarian Sausage","Longganisa","Homemade Corned Beef","Fried Bangus","Waffles","Nutella Waffles","Spanish Latte","Latte","Americano Hot","Matcha Latte","YH Dark Chocolate"],"items":["Featured Breakfasts: Chicken Tocino, Hungarian Sausage, Longganisa, Homemade Corned Beef, and Fried Bangus with eggs and rice.","Sweet Starts: Waffles, Nutella Waffles, and Cakes/Pastries.","Primary Drinks: Hot Coffee and Hot Drinks."]},{"title":"Lunch & Afternoon Menu","time":"11:00 AM - 5:00 PM","focus":"Savory meals, light bites for remote workers, and refreshing cold drinks.","start":"11:00","end":"17:00","item_names":["Rosemary Porkchop","Chicken Pesto","Lamb Adobo Flakes","Pork Adobo Flakes","Papa Carlos Butifarra","Marinated Tofu","Mango Kani Salad","Tuna Salad","Spaghetti Bolognese","Tuna & Garlic Pasta","Club Sandwich","Tuna Melt Sandwich","Iced Latte","Iced Kadayawan","Calamansi","Cucumber Lemonade"],"items":["Mid-day Meals: Rosemary Porkchop, Chicken Pesto, Lamb Adobo Flakes, Pork Adobo Flakes, Papa Carlos Butifarra, and Marinated Tofu.","Lighter Lunch: Salads, Pastas, and Sandwiches.","Beat-the-Heat Drinks: On The Rocks, Blended Coffee, Refreshers, Milkshakes, and Milk Tea."]},{"title":"Sundown & Dinner Menu","time":"5:00 PM - Closing","focus":"Shared plates, comfort food, groups, and casual evening drinking.","start":"17:00","end":"23:59","item_names":["Yellow Hauz Special Pizza","Chili Chorizo Pizza","Spicy Sardines Pizza","Three Cheese Pizza","Chicken Waffles","Pica Platter","Hungarian Sausage w/ fries","Kamote Fries","Potato Wedges","Rosemary Porkchop","Papa Carlos Butifarra","Fried Bangus","Affogato","San Miguel Pilsen","Iced YH Mocha"],"items":["Group Sharing: Pizzas, Chicken Waffles, Pica Platter, Hungarian w/ fries, Kamote Fries, and Potato Wedges.","Dinner Entrees: Rosemary Porkchop, Papa Carlos Butifarra, and Fried Bangus.","Night Cap Drinks: Affogato, San Miguel Pilsen, and premium iced coffee options."]}]', 'json', 'Editable time-based menu items shown on POS menu');
