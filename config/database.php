<?php
// Keep this file outside the web root when deploying. Environment variables let
// production credentials stay out of source control.
define('DB_HOST', getenv('YH_DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('YH_DB_NAME') ?: 'yellow_hauz_pos');
define('DB_USER', getenv('YH_DB_USER') ?: 'root');
define('DB_PASS', getenv('YH_DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    exit('Service temporarily unavailable.');
}
