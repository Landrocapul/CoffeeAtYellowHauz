<?php
// Public endpoint for the guest ordering portal. It intentionally does not use
// staff authentication; all prices and item availability are verified here.
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');

function customerOrderError(string $message, int $status = 422): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    customerOrderError('Method not allowed.', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    customerOrderError('Invalid request.');
}
requireCsrfToken($input['csrf_token'] ?? '');
enforceCooldown('customer_order', 4, 'Please wait a few seconds before sending another order.');

$customerName = sanitize($input['customer_name'] ?? '');
$orderType = sanitize($input['order_type'] ?? 'take_away');
$tableNumber = (int)($input['table_number'] ?? 0);
$cart = $input['cart'] ?? [];

if ($customerName === '' || strlen($customerName) > 100) {
    customerOrderError('Please enter your name.');
}
if (!in_array($orderType, ['dine_in', 'take_away'], true)) {
    customerOrderError('Invalid order type.');
}
if ($orderType === 'dine_in' && $tableNumber < 1) {
    customerOrderError('Please enter a valid table number.');
}
if (!is_array($cart) || count($cart) < 1 || count($cart) > 30) {
    customerOrderError('Your cart is empty or contains too many items.');
}

try {
    // This account cannot log in (inactive). It only keeps customer orders
    // compatible with the existing non-null cashier_id database constraint.
    $pdo->prepare("INSERT IGNORE INTO users (employee_id, username, password, full_name, role, status) VALUES ('ONLINE001', 'online_orders', ?, 'Online Orders', 'cashier', 'inactive')")
        ->execute([password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT)]);
    $onlineUser = $pdo->query("SELECT id FROM users WHERE employee_id = 'ONLINE001' LIMIT 1")->fetch();
    if (!$onlineUser) {
        throw new RuntimeException('Online order service account is unavailable.');
    }

    $quantities = [];
    foreach ($cart as $cartItem) {
        $itemId = (int)($cartItem['id'] ?? 0);
        $quantity = (int)($cartItem['quantity'] ?? 0);
        if ($itemId < 1 || $quantity < 1 || $quantity > 20) {
            customerOrderError('One of the selected items is invalid.');
        }
        $quantities[$itemId] = ($quantities[$itemId] ?? 0) + $quantity;
        if ($quantities[$itemId] > 20) customerOrderError('Maximum quantity per item is 20.');
    }

    $pdo->beginTransaction();
    $tableId = null;
    if ($orderType === 'dine_in') {
        $tableStmt = $pdo->prepare('SELECT id FROM tables WHERE table_number = ? LIMIT 1');
        $tableStmt->execute([$tableNumber]);
        $table = $tableStmt->fetch();
        if (!$table) throw new RuntimeException('That table could not be found.');
        $tableId = (int)$table['id'];
    }

    $itemStmt = $pdo->prepare('SELECT id, name, price FROM menu_items WHERE id = ? AND is_available = 1');
    $validatedItems = [];
    $subtotal = 0.0;
    foreach ($quantities as $itemId => $quantity) {
        $itemStmt->execute([$itemId]);
        $item = $itemStmt->fetch();
        if (!$item) throw new RuntimeException('An item in your cart is no longer available.');
        $price = (float)$item['price'];
        $subtotal += $price * $quantity;
        $validatedItems[] = ['id' => $itemId, 'quantity' => $quantity, 'price' => $price];
    }

    $taxRate = (float)(getSetting('tax_rate') ?: 12);
    $taxAmount = round($subtotal * ($taxRate / 100), 2);
    $totalAmount = round($subtotal + $taxAmount, 2);
    $orderNumber = generateOrderNumber();
    $accountId = !empty($_SESSION['customer_id']) ? (int)$_SESSION['customer_id'] : null;
    $orderStmt = $pdo->prepare("INSERT INTO orders (order_number, table_id, customer_id, customer_name, order_type, payment_method, subtotal, tax_rate, tax_amount, total_amount, discount_amount, cashier_id, status) VALUES (?, ?, ?, ?, ?, 'cash', ?, ?, ?, ?, 0, ?, 'pending')");
    $orderStmt->execute([$orderNumber, $tableId, $accountId, $customerName, $orderType, $subtotal, $taxRate, $taxAmount, $totalAmount, $onlineUser['id']]);
    $orderId = (int)$pdo->lastInsertId();

    $lineStmt = $pdo->prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)');
    foreach ($validatedItems as $item) {
        $lineStmt->execute([$orderId, $item['id'], $item['quantity'], $item['price'], $item['price'] * $item['quantity']]);
    }
    if ($tableId) {
        $pdo->prepare("UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?")->execute([$orderId, $tableId]);
    }
    $pdo->commit();
    echo json_encode(['success' => true, 'order_number' => $orderNumber, 'total' => $totalAmount]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Customer order failed: ' . $error->getMessage());
    customerOrderError('We could not place your order. Please ask a staff member for help.', 500);
}
