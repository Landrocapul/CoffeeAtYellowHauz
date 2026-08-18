<?php
require_once __DIR__ . '/../db.php';

// Set JSON header
header('Content-Type: application/json');

// Check if user is logged in for protected endpoints
if (!isLoggedIn()) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Get current user
$currentUser = getCurrentUser();

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST') {
    requireCsrfToken();
}

try {
    switch ($action) {
        case 'get_menu_items':
            if ($method === 'GET') {
                $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
                
                if ($categoryId > 0) {
                    $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY sort_order ASC");
                    $stmt->execute([$categoryId]);
                } else {
                    $stmt = $pdo->query("SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category_id, sort_order ASC");
                }
                
                $items = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $items]);
            }
            break;

        case 'get_categories':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order ASC");
                $categories = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $categories]);
            }
            break;

        case 'get_tables':
            if ($method === 'GET') {
                $stmt = $pdo->query("SELECT * FROM tables ORDER BY table_number ASC");
                $tables = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $tables]);
            }
            break;

        case 'update_table_status':
            if ($method === 'POST') {
                if (!isAdmin()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Forbidden']); exit; }
                $input = json_decode(file_get_contents('php://input'), true);
                $tableId = (int)$input['table_id'];
                $status = sanitize($input['status']);
                
                $stmt = $pdo->prepare("UPDATE tables SET status = ? WHERE id = ?");
                $stmt->execute([$status, $tableId]);
                
                echo json_encode(['success' => true]);
            }
            break;

        case 'get_cart':
            if ($method === 'GET') {
                echo json_encode(['success' => true, 'data' => $_SESSION['cart'] ?? []]);
            }
            break;

        case 'add_to_cart':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $itemId = (int)$input['item_id'];
                $quantity = (int)$input['quantity'];
                
                $stmt = $pdo->prepare("SELECT id, name, price, image_url FROM menu_items WHERE id = ? AND is_available = 1");
                $stmt->execute([$itemId]);
                $item = $stmt->fetch();
                
                if (!$item) {
                    echo json_encode(['success' => false, 'error' => 'Item not found']);
                    exit;
                }
                
                if (!isset($_SESSION['cart'])) {
                    $_SESSION['cart'] = [];
                }
                
                if (isset($_SESSION['cart'][$itemId])) {
                    $_SESSION['cart'][$itemId]['quantity'] += $quantity;
                } else {
                    $_SESSION['cart'][$itemId] = [
                        'id' => $item['id'],
                        'name' => $item['name'],
                        'price' => $item['price'],
                        'image_url' => $item['image_url'],
                        'quantity' => $quantity
                    ];
                }
                
                echo json_encode(['success' => true, 'data' => $_SESSION['cart']]);
            }
            break;

        case 'update_cart_quantity':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $itemId = (int)$input['item_id'];
                $quantity = (int)$input['quantity'];
                
                if (!isset($_SESSION['cart'])) {
                    $_SESSION['cart'] = [];
                }
                
                if ($quantity <= 0) {
                    unset($_SESSION['cart'][$itemId]);
                } elseif (isset($_SESSION['cart'][$itemId])) {
                    $_SESSION['cart'][$itemId]['quantity'] = $quantity;
                }
                
                echo json_encode(['success' => true, 'data' => $_SESSION['cart']]);
            }
            break;

        case 'remove_from_cart':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $itemId = (int)$input['item_id'];
                
                if (isset($_SESSION['cart'][$itemId])) {
                    unset($_SESSION['cart'][$itemId]);
                }
                
                echo json_encode(['success' => true, 'data' => $_SESSION['cart'] ?? []]);
            }
            break;

        case 'clear_cart':
            if ($method === 'POST') {
                $_SESSION['cart'] = [];
                echo json_encode(['success' => true, 'data' => []]);
            }
            break;

        case 'create_order':
            if ($method === 'POST') {
                try {
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    if (empty($input['cart']) || !is_array($input['cart'])) {
                        echo json_encode(['success' => false, 'error' => 'Cart is empty']);
                        exit;
                    }
                    
                    $tableId = isset($input['table_id']) ? (int)$input['table_id'] : null;
                    $customerName = sanitize($input['customer_name'] ?? '');
                    $orderType = sanitize($input['order_type'] ?? 'dine_in');
                    $paymentMethod = sanitize($input['payment_method'] ?? 'cash');
                    $discountPercent = max(0, min(100, (float)($input['discount_percent'] ?? 0)));
                    if (!in_array($orderType, ['dine_in', 'takeout'], true) || !in_array($paymentMethod, ['cash', 'gcash', 'card'], true)) {
                        echo json_encode(['success' => false, 'error' => 'Invalid order details']);
                        exit;
                    }
                    
                    $orderNumber = generateOrderNumber();
                    $subtotal = 0;
                    $validatedCart = [];
                    $itemStmt = $pdo->prepare('SELECT id, price, is_available FROM menu_items WHERE id = ?');
                    foreach ($input['cart'] as $item) {
                        $itemId = (int)($item['id'] ?? 0);
                        $quantity = (int)($item['quantity'] ?? 0);
                        if ($itemId < 1 || $quantity < 1 || $quantity > 100) {
                            throw new RuntimeException('Invalid cart item.');
                        }
                        $itemStmt->execute([$itemId]);
                        $databaseItem = $itemStmt->fetch();
                        if (!$databaseItem || !(int)$databaseItem['is_available']) {
                            throw new RuntimeException('An item is no longer available.');
                        }
                        $price = (float)$databaseItem['price'];
                        $subtotal += $price * $quantity;
                        $validatedCart[] = ['id' => $itemId, 'quantity' => $quantity, 'price' => $price];
                    }
                    
                    $taxRate = getSetting('tax_rate') ? (float)getSetting('tax_rate') : 12;
                    $discountAmount = $subtotal * ($discountPercent / 100);
                    $discountedSubtotal = max(0, $subtotal - $discountAmount);
                    $taxAmount = $discountedSubtotal * ($taxRate / 100);
                    $totalAmount = $discountedSubtotal + $taxAmount;
                    
                    $stmt = $pdo->prepare("INSERT INTO orders (order_number, table_id, customer_name, order_type, payment_method, subtotal, tax_rate, tax_amount, total_amount, discount_amount, cashier_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')");
                    $stmt->execute([$orderNumber, $tableId, $customerName, $orderType, $paymentMethod, $subtotal, $taxRate, $taxAmount, $totalAmount, $discountAmount, $currentUser['id']]);
                    
                    $orderId = $pdo->lastInsertId();
                    
                    // Insert order items (stock already reduced when added to cart)
                    foreach ($validatedCart as $item) {
                        $totalPrice = $item['price'] * $item['quantity'];
                        $stmt = $pdo->prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
                        $stmt->execute([$orderId, $item['id'], $item['quantity'], $item['price'], $totalPrice]);
                    }
                    
                    // Keep dine-in orders active until the ticket is completed.
                    if ($tableId) {
                        $stmt = $pdo->prepare("UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?");
                        $stmt->execute([$orderId, $tableId]);
                    }
                    
                    echo json_encode(['success' => true, 'order_id' => $orderId, 'order_number' => $orderNumber]);
                } catch (Exception $e) {
                    error_log('Order creation failed: ' . $e->getMessage());
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Could not create the order.']);
                }
            }
            break;

        case 'get_active_orders':
            if ($method === 'GET') {
                $stmt = $pdo->prepare("SELECT o.*, t.table_number, u.full_name as cashier_name 
                                      FROM orders o 
                                      LEFT JOIN tables t ON o.table_id = t.id 
                                      LEFT JOIN users u ON o.cashier_id = u.id 
                                      WHERE o.status IN ('pending', 'processing') 
                                      ORDER BY o.created_at DESC");
                $stmt->execute();
                $orders = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $orders]);
            }
            break;

        case 'staff_chatbot':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true) ?: [];
                $message = trim((string)($input['message'] ?? ''));

                if ($message === '') {
                    echo json_encode(['success' => false, 'error' => 'Please enter a question.']);
                    exit;
                }

                require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'chatbot' . DIRECTORY_SEPARATOR . 'chatbot.php';
                $botResponse = (new StaffChatbot())->answer($message);

                echo json_encode([
                    'success' => true,
                    'reply' => $botResponse['reply'],
                    'matched_intent' => $botResponse['matched_intent'] ?? null,
                    'confidence' => $botResponse['confidence'] ?? null,
                    'needs_training' => $botResponse['needs_training'] ?? false,
                    'source' => $botResponse['source'] ?? null
                ]);
            }
            break;

        case 'staff_chatbot_learn':
            if ($method === 'POST') {
                if (!isAdmin()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Forbidden']); exit; }
                $input = json_decode(file_get_contents('php://input'), true) ?: [];
                $question = trim((string)($input['question'] ?? ''));
                $answer = trim((string)($input['answer'] ?? ''));

                if ($question === '' || $answer === '') {
                    echo json_encode(['success' => false, 'error' => 'Question and answer are required.']);
                    exit;
                }

                if (strlen($question) > 300 || strlen($answer) > 1000) {
                    echo json_encode(['success' => false, 'error' => 'Training text is too long.']);
                    exit;
                }

                $learnedBy = $currentUser['username'] ?? $currentUser['full_name'] ?? 'staff';
                require_once dirname(__DIR__) . DIRECTORY_SEPARATOR . 'chatbot' . DIRECTORY_SEPARATOR . 'chatbot.php';
                try {
                    $learnResponse = (new StaffChatbot())->learn($question, $answer, (string)$learnedBy);
                } catch (InvalidArgumentException | RuntimeException $e) {
                    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                    exit;
                }

                echo json_encode([
                    'success' => true,
                    'updated' => $learnResponse['updated'] ?? false,
                    'reply' => 'Got it. I learned that answer and will use it next time.'
                ]);
            }
            break;

        case 'update_order_status':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $orderId = (int)$input['order_id'];
                $status = sanitize($input['status']);

                $allowedStatuses = ['pending', 'processing', 'completed'];
                if (!in_array($status, $allowedStatuses, true)) {
                    echo json_encode(['success' => false, 'error' => 'Invalid order status']);
                    exit;
                }
                
                $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->execute([$status, $orderId]);

                if ($status === 'completed' || $status === 'cancelled') {
                    $stmt = $pdo->prepare("UPDATE tables SET status = 'available', current_order_id = NULL WHERE current_order_id = ?");
                    $stmt->execute([$orderId]);
                }
                
                echo json_encode(['success' => true]);
            }
            break;

        case 'void_ticket':
            if ($method === 'POST') {
                $input = json_decode(file_get_contents('php://input'), true);
                $orderId = (int)($input['order_id'] ?? 0);
                $adminPin = preg_replace('/\D/', '', (string)($input['admin_pin'] ?? ''));

                if ($orderId <= 0 || $adminPin === '') {
                    echo json_encode(['success' => false, 'error' => 'An order and administrator PIN are required.']);
                    exit;
                }

                // Throttled per requesting staff member + IP: this prevents a
                // logged-in cashier from scripting repeated guesses against
                // the admin override to escalate privileges.
                $voidThrottleToken = $currentUser['id'] . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
                $voidWaitMinutes = throttleMinutesRemaining('void_admin_pin', $voidThrottleToken);
                if ($voidWaitMinutes !== null) {
                    http_response_code(429);
                    echo json_encode(['success' => false, 'error' => "Too many attempts. Try again in about {$voidWaitMinutes} minute(s)."]);
                    exit;
                }

                $stmt = $pdo->prepare("SELECT password FROM users WHERE role = 'admin' AND status = 'active'");
                $stmt->execute();
                $approved = false;
                foreach ($stmt->fetchAll() as $admin) {
                    $storedPin = (string)$admin['password'];
                    if (password_verify($adminPin, $storedPin) || (!str_starts_with($storedPin, '$2y$') && hash_equals($storedPin, $adminPin))) {
                        $approved = true;
                        break;
                    }
                }
                if (!$approved) {
                    recordThrottleFailure('void_admin_pin', $voidThrottleToken, 5, 15);
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Administrator PIN was not approved.']);
                    exit;
                }
                clearThrottle('void_admin_pin', $voidThrottleToken);

                $pdo->beginTransaction();
                $stmt = $pdo->prepare('SELECT status FROM orders WHERE id = ? FOR UPDATE');
                $stmt->execute([$orderId]);
                $order = $stmt->fetch();
                if (!$order || $order['status'] === 'cancelled') {
                    $pdo->rollBack();
                    echo json_encode(['success' => false, 'error' => 'This ticket cannot be voided.']);
                    exit;
                }

                $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?");
                $stmt->execute([$orderId]);
                $stmt = $pdo->prepare("UPDATE tables SET status = 'available', current_order_id = NULL WHERE current_order_id = ?");
                $stmt->execute([$orderId]);
                $pdo->commit();

                echo json_encode(['success' => true]);
            }
            break;

        case 'get_order_details':
            if ($method === 'GET') {
                $orderId = (int)$_GET['order_id'];
                
                $stmt = $pdo->prepare("SELECT o.*, t.table_number 
                                      FROM orders o 
                                      LEFT JOIN tables t ON o.table_id = t.id 
                                      WHERE o.id = ?");
                $stmt->execute([$orderId]);
                $order = $stmt->fetch();
                
                if (!$order) {
                    echo json_encode(['success' => false, 'error' => 'Order not found']);
                    exit;
                }
                
                $stmt = $pdo->prepare("SELECT oi.*, mi.name, mi.image_url 
                                      FROM order_items oi 
                                      JOIN menu_items mi ON oi.menu_item_id = mi.id 
                                      WHERE oi.order_id = ?");
                $stmt->execute([$orderId]);
                $items = $stmt->fetchAll();
                
                echo json_encode(['success' => true, 'data' => ['order' => $order, 'items' => $items]]);
            }
            break;

        case 'add_category':
            if ($method === 'POST') {
                if (!isAdmin()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Forbidden']); exit; }
                $input = json_decode(file_get_contents('php://input'), true);
                $name = sanitize($input['name']);
                $icon = sanitize($input['icon']);
                
                // Check if category name already exists
                $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ? AND status = 'active'");
                $stmt->execute([$name]);
                if ($stmt->fetch()) {
                    echo json_encode(['success' => false, 'error' => 'Category name already exists']);
                    exit;
                }
                
                // Get the highest sort_order
                $stmt = $pdo->query("SELECT MAX(sort_order) as max_sort FROM categories WHERE status = 'active'");
                $maxSort = $stmt->fetch()['max_sort'] ?? 0;
                
                $stmt = $pdo->prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)");
                $stmt->execute([$name, $icon, $maxSort + 1]);
                
                $categoryId = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'data' => ['id' => $categoryId, 'name' => $name, 'icon' => $icon]]);
            }
            break;

        case 'update_category':
            if ($method === 'POST') {
                if (!isAdmin()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Forbidden']); exit; }
                $input = json_decode(file_get_contents('php://input'), true);
                $categoryId = (int)$input['id'];
                $name = sanitize($input['name']);
                $icon = sanitize($input['icon']);
                
                // Check if category name already exists (excluding current category)
                $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ? AND id != ? AND status = 'active'");
                $stmt->execute([$name, $categoryId]);
                if ($stmt->fetch()) {
                    echo json_encode(['success' => false, 'error' => 'Category name already exists']);
                    exit;
                }
                
                $stmt = $pdo->prepare("UPDATE categories SET name = ?, icon = ? WHERE id = ?");
                $stmt->execute([$name, $icon, $categoryId]);
                
                echo json_encode(['success' => true, 'data' => ['id' => $categoryId, 'name' => $name, 'icon' => $icon]]);
            }
            break;

        case 'delete_category':
            if ($method === 'POST') {
                if (!isAdmin()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Forbidden']); exit; }
                $input = json_decode(file_get_contents('php://input'), true);
                $categoryId = (int)$input['id'];
                
                // Check if category has menu items
                $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?");
                $stmt->execute([$categoryId]);
                $itemCount = $stmt->fetch()['count'];
                
                if ($itemCount > 0) {
                    echo json_encode(['success' => false, 'error' => 'Cannot delete category with existing menu items']);
                    exit;
                }
                
                // Soft delete by setting status to inactive
                $stmt = $pdo->prepare("UPDATE categories SET status = 'inactive' WHERE id = ?");
                $stmt->execute([$categoryId]);
                
                echo json_encode(['success' => true]);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (PDOException $e) {
    error_log('API database error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'A database error occurred.']);
}
?>
