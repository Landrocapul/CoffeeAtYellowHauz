<?php
// Compatibility bootstrap for the existing pages. New code should include the
// smaller files from config/ and includes/ directly.
require_once __DIR__ . '/config/database.php';

if (!defined('APP_TIMEZONE')) {
    define('APP_TIMEZONE', 'Asia/Manila');
}
date_default_timezone_set(APP_TIMEZONE);

if (session_status() === PHP_SESSION_NONE) {
    session_name('yellow_hauz_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

require_once __DIR__ . '/includes/security.php';
require_once __DIR__ . '/includes/auth.php';
sendSecurityHeaders();

function redirect($url) { header('Location: ' . $url); exit(); }
function sanitize($data) { return trim(strip_tags((string)$data)); }
function formatCurrency($amount) { return "\u{20B1}" . number_format($amount, 2); }
function generateOrderNumber() { return 'ORD-' . date('Ymd') . '-' . bin2hex(random_bytes(4)); }

function getCurrentUser() {
    global $pdo;
    if (!isLoggedIn()) return null;
    $stmt = $pdo->prepare('SELECT id, employee_id, username, full_name, role FROM users WHERE id = ? AND status = \'active\'');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}
function getSetting($key) {
    global $pdo;
    $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $result = $stmt->fetch();
    return $result ? $result['setting_value'] : null;
}
function updateSetting($key, $value) {
    global $pdo;
    $stmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?');
    return $stmt->execute([$key, $value, $value]);
}

function getDefaultTimeMenus() {
    return [
        ['title' => 'Morning Menu', 'time' => 'Opening - 11:00 AM', 'focus' => 'Breakfast and coffee.', 'start' => '00:00', 'end' => '11:00', 'item_names' => [], 'items' => []],
        ['title' => 'Lunch & Afternoon Menu', 'time' => '11:00 AM - 5:00 PM', 'focus' => 'Meals and cold drinks.', 'start' => '11:00', 'end' => '17:00', 'item_names' => [], 'items' => []],
        ['title' => 'Sundown & Dinner Menu', 'time' => '5:00 PM - Closing', 'focus' => 'Dinner and shared plates.', 'start' => '17:00', 'end' => '23:59', 'item_names' => [], 'items' => []],
    ];
}
function getTimeMenus() {
    $stored = getSetting('time_based_menus');
    $decoded = $stored ? json_decode($stored, true) : null;
    return is_array($decoded) ? $decoded : getDefaultTimeMenus();
}
function isCashier() { $user = getCurrentUser(); return $user && $user['role'] === 'cashier'; }
function hasAdminAccess() { return isAdmin(); }
function hasCashierAccess() { return isAdmin() || isCashier(); }
