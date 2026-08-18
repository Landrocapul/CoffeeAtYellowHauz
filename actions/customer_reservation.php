<?php
// Public reservation endpoint. Reservations are pending until staff confirms them.
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

function reservationError(string $message, int $status = 422): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reservationError('Method not allowed.', 405);
if (empty($_SESSION['customer_id'])) reservationError('Please sign in before confirming a reservation.', 401);
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) reservationError('Invalid request.');
requireCsrfToken($input['csrf_token'] ?? '');
enforceCooldown('customer_reservation', 4, 'Please wait a few seconds before trying again.');

$tableId = (int)($input['table_id'] ?? 0);
$guestCount = (int)($input['guest_count'] ?? 0);
$notes = sanitize($input['notes'] ?? '');
$reservationAt = DateTime::createFromFormat('Y-m-d\TH:i', (string)($input['reservation_at'] ?? ''));

if ($tableId < 1 || $guestCount < 1 || $guestCount > 30) reservationError('Choose a table and valid guest count.');
if (!$reservationAt || $reservationAt->format('Y-m-d\TH:i') !== ($input['reservation_at'] ?? '') || $reservationAt <= new DateTime()) reservationError('Choose a future reservation date and time.');
if (strlen($notes) > 500) reservationError('Notes must be 500 characters or less.');

try {
    $customerStmt = $pdo->prepare("SELECT full_name, contact_number FROM customer_accounts WHERE id = ? AND status = 'active' LIMIT 1");
    $customerStmt->execute([(int)$_SESSION['customer_id']]);
    $customer = $customerStmt->fetch();
    if (!$customer) reservationError('Please sign in again before confirming a reservation.', 401);
    $tableStmt = $pdo->prepare("SELECT id, capacity FROM tables WHERE id = ? AND status NOT IN ('cleaning') LIMIT 1");
    $tableStmt->execute([$tableId]);
    $table = $tableStmt->fetch();
    if (!$table || $guestCount > (int)$table['capacity']) reservationError('That table cannot accommodate your party.');
    $reservationCode = 'RSV-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $stmt = $pdo->prepare('INSERT INTO reservations (reservation_code, table_id, customer_id, customer_name, contact_number, guest_count, reservation_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$reservationCode, $tableId, (int)$_SESSION['customer_id'], $customer['full_name'], $customer['contact_number'], $guestCount, $reservationAt->format('Y-m-d H:i:s'), $notes ?: null]);
    echo json_encode(['success' => true, 'reservation_code' => $reservationCode]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') reservationError('That table is already requested for this time. Please select another table or time.');
    error_log('Customer reservation failed: ' . $error->getMessage());
    reservationError('We could not save your reservation. Please ask a staff member for help.', 500);
}
