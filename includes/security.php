<?php
function escape($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrfField() {
    return '<input type="hidden" name="csrf_token" value="' . escape(csrfToken()) . '">';
}

function requireCsrfToken($token = null) {
    $token = $token ?? ($_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || !hash_equals(csrfToken(), $token)) {
        http_response_code(403);
        exit('Invalid request token. Please refresh and try again.');
    }
}

function sendSecurityHeaders() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()');

    // Only known, in-use third-party origins are allowed. Inline scripts/styles
    // are still needed because pages embed <script>/<style> blocks directly;
    // tightening that further would require an app-wide refactor to nonces.
    header(
        "Content-Security-Policy: default-src 'self'; " .
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " .
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " .
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " .
        "img-src 'self' data: https:; " .
        "connect-src 'self'; " .
        "object-src 'none'; " .
        "base-uri 'self'; " .
        "form-action 'self'; " .
        "frame-ancestors 'none'"
    );

    // HSTS only makes sense (and is only safe to promise) once the site is
    // actually being served over HTTPS.
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

/**
 * Simple per-session cooldown for sensitive POST endpoints (login, order,
 * reservation). This isn't a substitute for a proper distributed rate
 * limiter, but it stops the common case of a script or an impatient double
 * click hammering an endpoint, with zero extra infrastructure.
 */
function enforceCooldown(string $key, int $seconds, string $message = 'Please wait a moment before trying again.') {
    $sessionKey = 'cooldown_' . $key;
    $now = microtime(true);
    if (!empty($_SESSION[$sessionKey]) && ($now - $_SESSION[$sessionKey]) < $seconds) {
        http_response_code(429);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
    $_SESSION[$sessionKey] = $now;
}

/**
 * Persistent brute-force throttle, backed by the security_throttle table.
 * Used anywhere a short numeric PIN is checked (staff login, the admin-PIN
 * override on void ticket) where a session-only cooldown wouldn't be enough
 * to stop a script from grinding through the PIN space.
 */
function throttleMinutesRemaining(string $scope, string $token): ?int {
    global $pdo;
    $stmt = $pdo->prepare('SELECT locked_until FROM security_throttle WHERE scope = ? AND token = ?');
    $stmt->execute([$scope, $token]);
    $row = $stmt->fetch();
    if ($row && !empty($row['locked_until']) && strtotime($row['locked_until']) > time()) {
        return max(1, (int)ceil((strtotime($row['locked_until']) - time()) / 60));
    }
    return null;
}

function recordThrottleFailure(string $scope, string $token, int $maxAttempts, int $lockoutMinutes): void {
    global $pdo;
    $stmt = $pdo->prepare('SELECT failed_attempts FROM security_throttle WHERE scope = ? AND token = ?');
    $stmt->execute([$scope, $token]);
    $row = $stmt->fetch();
    $attempts = ($row['failed_attempts'] ?? 0) + 1;
    $lockUntil = $attempts >= $maxAttempts
        ? (new DateTime("+{$lockoutMinutes} minutes"))->format('Y-m-d H:i:s')
        : null;
    $pdo->prepare(
        'INSERT INTO security_throttle (scope, token, failed_attempts, locked_until) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE failed_attempts = VALUES(failed_attempts), locked_until = VALUES(locked_until)'
    )->execute([$scope, $token, $attempts, $lockUntil]);
}

function clearThrottle(string $scope, string $token): void {
    global $pdo;
    $pdo->prepare('DELETE FROM security_throttle WHERE scope = ? AND token = ?')->execute([$scope, $token]);
}
