<?php
// Change the signed-in customer's password. Requires the current password.
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

function passwordError(string $message, int $status = 422): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') passwordError('Method not allowed.', 405);
if (empty($_SESSION['customer_id'])) passwordError('Please sign in again.', 401);

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) passwordError('Invalid request.');
requireCsrfToken($input['csrf_token'] ?? '');
enforceCooldown('customer_password', 3, 'Please wait a moment before trying again.');

$currentPassword = (string)($input['current_password'] ?? '');
$newPassword = (string)($input['new_password'] ?? '');

if (strlen($newPassword) < 8) passwordError('New password must be at least 8 characters.');

try {
    $stmt = $pdo->prepare("SELECT password FROM customer_accounts WHERE id = ? AND status = 'active' LIMIT 1");
    $stmt->execute([(int)$_SESSION['customer_id']]);
    $account = $stmt->fetch();
    if (!$account) passwordError('Please sign in again.', 401);
    if (!password_verify($currentPassword, $account['password'])) passwordError('Current password is incorrect.');

    $pdo->prepare('UPDATE customer_accounts SET password = ? WHERE id = ?')
        ->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int)$_SESSION['customer_id']]);
    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('Customer password update failed: ' . $e->getMessage());
    passwordError('We could not update your password. Please try again.', 500);
}
