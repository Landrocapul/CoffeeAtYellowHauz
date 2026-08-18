<?php
/**
 * Shared bootstrap for the customer-facing site. Every page under /customer
 * includes this first. It wires up the DB connection/session (via ../../db.php)
 * and adds small helpers specific to the guest-facing account system.
 */
require_once __DIR__ . '/../../db.php';

define('YH_STORE_NAME', 'Coffee at Yellow Hauz');
define('YH_STORE_TAGLINE', 'Neighborhood coffee, breakfast, and comfort food since 2007.');

/** Returns the signed-in customer's account row, or null if not signed in. */
function currentCustomer(): ?array
{
    global $pdo;
    static $cached = false;
    if ($cached !== false) return $cached ?: null;
    if (empty($_SESSION['customer_id'])) {
        return $cached = null;
    }
    $stmt = $pdo->prepare("SELECT id, full_name, email, contact_number, created_at FROM customer_accounts WHERE id = ? AND status = 'active' LIMIT 1");
    $stmt->execute([(int)$_SESSION['customer_id']]);
    $customer = $stmt->fetch();
    if (!$customer) {
        // Session points at an account that no longer exists/active — clear it.
        unset($_SESSION['customer_id'], $_SESSION['customer_name']);
        return $cached = null;
    }
    return $cached = $customer;
}

function requireCustomerLogin(string $return): void
{
    if (!currentCustomer()) {
        redirect('login.php?return=' . urlencode($return));
    }
}

/** Nav item definitions shared by the header partial, kept in one place. */
function customerNavItems(): array
{
    return [
        ['href' => './',              'match' => 'home',        'icon' => 'fa-house',           'label' => 'Home'],
        ['href' => 'menu.php',        'match' => 'menu',         'icon' => 'fa-mug-hot',         'label' => 'Order'],
        ['href' => 'reservation.php', 'match' => 'reservation',  'icon' => 'fa-calendar-check',  'label' => 'Reserve'],
        ['href' => 'account.php',     'match' => 'account',      'icon' => 'fa-user',            'label' => 'Account'],
    ];
}
