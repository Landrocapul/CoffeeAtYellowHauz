<?php
// Customer-only logout. Deliberately does not call session_destroy() so a
// staff member testing the guest site from the same browser/session isn't
// signed out of the POS by accident; it only clears the customer keys.
require_once __DIR__ . '/../db.php';

unset($_SESSION['customer_id'], $_SESSION['customer_name']);
session_regenerate_id(true);

redirect('../customer/');
