<?php
// Update the signed-in customer's own profile details (name, email, contact).
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

function profileError(string $message, int $status = 422): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') profileError('Method not allowed.', 405);
if (empty($_SESSION['customer_id'])) profileError('Please sign in again.', 401);

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) profileError('Invalid request.');
requireCsrfToken($input['csrf_token'] ?? '');
enforceCooldown('customer_profile', 2, 'Please wait a moment before trying again.');

$name = sanitize($input['full_name'] ?? '');
$email = strtolower(trim((string)($input['email'] ?? '')));
$contact = preg_replace('/[^0-9+\-() ]/', '', (string)($input['contact_number'] ?? ''));

if ($name === '' || strlen($name) > 100) profileError('Enter your full name.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) profileError('Enter a valid email address.');
if (strlen($contact) < 7 || strlen($contact) > 30) profileError('Enter a valid contact number.');

try {
    $stmt = $pdo->prepare("UPDATE customer_accounts SET full_name = ?, email = ?, contact_number = ? WHERE id = ? AND status = 'active'");
    $stmt->execute([$name, $email, $contact, (int)$_SESSION['customer_id']]);
    $_SESSION['customer_name'] = $name;
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') profileError('That email is already in use by another account.');
    error_log('Customer profile update failed: ' . $e->getMessage());
    profileError('We could not save your changes. Please try again.', 500);
}
