<?php
require_once __DIR__ . '/../db.php';

// Check if user is logged in
if (!isLoggedIn()) {
    redirect('index.php');
}

// Check if user has admin access
if (!isAdmin()) {
    redirect('menu.php');
}

// Get current user info
$currentUser = getCurrentUser();
$success = $_SESSION['settings_success'] ?? null;
$error = $_SESSION['settings_error'] ?? null;
unset($_SESSION['settings_success'], $_SESSION['settings_error']);

function flashAndRedirect($type, $message) {
    $_SESSION[$type === 'success' ? 'settings_success' : 'settings_error'] = $message;
    redirect('settings.php');
}

// Handle settings updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrfToken();
    $action = $_POST['action'];
    
    if ($action === 'update_settings') {
        $taxRate = max(0, min(100, (float)$_POST['tax_rate']));
        $shopName = sanitize($_POST['shop_name']);
        $shopAddress = sanitize($_POST['shop_address']);
        $shopPhone = sanitize($_POST['shop_phone']);
        $receiptFooter = sanitize($_POST['receipt_footer']);
        $businessHours = sanitize($_POST['business_hours']);
        
        try {
            if ($shopName === '') {
                throw new Exception('Shop name is required.');
            }
            updateSetting('tax_rate', $taxRate);
            updateSetting('shop_name', $shopName);
            updateSetting('shop_address', $shopAddress);
            updateSetting('shop_phone', $shopPhone);
            updateSetting('receipt_footer', $receiptFooter);
            updateSetting('business_hours', $businessHours);
            flashAndRedirect('success', 'Settings updated successfully.');
        } catch (Exception $e) {
            flashAndRedirect('error', 'Failed to update settings: ' . $e->getMessage());
        }
    } elseif ($action === 'update_time_menus') {
        try {
            $timeMenus = [];
            $titles = $_POST['time_menu_title'] ?? [];
            $times = $_POST['time_menu_time'] ?? [];
            $starts = $_POST['time_menu_start'] ?? [];
            $ends = $_POST['time_menu_end'] ?? [];
            $focuses = $_POST['time_menu_focus'] ?? [];
            $items = $_POST['time_menu_items'] ?? [];
            $itemNames = $_POST['time_menu_item_names'] ?? [];

            foreach ($titles as $index => $title) {
                $cleanTitle = sanitize($title);
                $cleanTime = sanitize($times[$index] ?? '');
                $cleanStart = sanitize($starts[$index] ?? '00:00');
                $cleanEnd = sanitize($ends[$index] ?? '23:59');
                $cleanFocus = sanitize($focuses[$index] ?? '');
                $lines = array_values(array_filter(array_map(
                    fn($line) => sanitize($line),
                    preg_split('/\r\n|\r|\n/', $items[$index] ?? '')
                )));
                $names = array_values(array_filter(array_map(
                    fn($line) => trim(strip_tags($line)),
                    preg_split('/\r\n|\r|\n/', $itemNames[$index] ?? '')
                )));

                if ($cleanTitle === '' && $cleanTime === '' && $cleanFocus === '' && empty($lines)) {
                    continue;
                }

                $timeMenus[] = [
                    'title' => $cleanTitle,
                    'time' => $cleanTime,
                    'start' => $cleanStart,
                    'end' => $cleanEnd,
                    'focus' => $cleanFocus,
                    'item_names' => $names,
                    'items' => $lines,
                ];
            }

            if (empty($timeMenus)) {
                throw new Exception('Please keep at least one time-based menu section.');
            }

            updateSetting('time_based_menus', json_encode($timeMenus, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            flashAndRedirect('success', 'Time-based menu updated successfully.');
        } catch (Exception $e) {
            flashAndRedirect('error', 'Failed to update time-based menu: ' . $e->getMessage());
        }
    } elseif ($action === 'add_user') {
        $employeeId = sanitize($_POST['employee_id']);
        $username = sanitize($_POST['username']);
        $password = preg_replace('/\D/', '', $_POST['password']);
        $fullName = sanitize($_POST['full_name']);
        $role = sanitize($_POST['role']);
        
        try {
            if (!in_array($role, ['admin', 'cashier'], true)) {
                throw new Exception('Invalid role selected.');
            }
            if ($employeeId === '' || $username === '' || $password === '' || $fullName === '') {
                throw new Exception('Please complete all required user fields.');
            }
            if (strlen($password) < 4 || strlen($password) > 8) {
                throw new Exception('PIN must be 4 to 8 digits.');
            }
            $stmt = $pdo->prepare("INSERT INTO users (employee_id, username, password, full_name, role) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$employeeId, $username, password_hash($password, PASSWORD_DEFAULT), $fullName, $role]);
            flashAndRedirect('success', 'User added successfully.');
        } catch (Exception $e) {
            flashAndRedirect('error', 'Failed to add user: ' . $e->getMessage());
        }
    } elseif ($action === 'update_user') {
        $userId = (int)$_POST['user_id'];
        $employeeId = sanitize($_POST['employee_id']);
        $username = sanitize($_POST['username']);
        $fullName = sanitize($_POST['full_name']);
        $role = sanitize($_POST['role']);
        $status = sanitize($_POST['status']);
        $password = preg_replace('/\D/', '', $_POST['password'] ?? '');
        
        try {
            if (!in_array($role, ['admin', 'cashier'], true) || !in_array($status, ['active', 'inactive'], true)) {
                throw new Exception('Invalid role or status selected.');
            }
            if ($password !== '' && (strlen($password) < 4 || strlen($password) > 8)) {
                throw new Exception('PIN must be 4 to 8 digits.');
            }
            if ($userId === (int)$currentUser['id'] && ($role !== 'admin' || $status !== 'active')) {
                throw new Exception('You cannot remove your own admin access.');
            }
            if ($status === 'inactive' || $role !== 'admin') {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active' AND id != ?");
                $stmt->execute([$userId]);
                if ((int)$stmt->fetchColumn() === 0) {
                    throw new Exception('At least one active admin is required.');
                }
            }
            if ($password !== '') {
                $stmt = $pdo->prepare("UPDATE users SET employee_id = ?, username = ?, password = ?, full_name = ?, role = ?, status = ? WHERE id = ?");
                $stmt->execute([$employeeId, $username, password_hash($password, PASSWORD_DEFAULT), $fullName, $role, $status, $userId]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET employee_id = ?, username = ?, full_name = ?, role = ?, status = ? WHERE id = ?");
                $stmt->execute([$employeeId, $username, $fullName, $role, $status, $userId]);
            }
            flashAndRedirect('success', 'User updated successfully.');
        } catch (Exception $e) {
            flashAndRedirect('error', 'Failed to update user: ' . $e->getMessage());
        }
    } elseif ($action === 'delete_user') {
        $userId = (int)$_POST['user_id'];
        
        try {
            if ($userId === (int)$currentUser['id']) {
                throw new Exception('You cannot deactivate your own account.');
            }
            $stmt = $pdo->prepare("SELECT role, status FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) {
                throw new Exception('User not found.');
            }
            if ($targetUser['role'] === 'admin' && $targetUser['status'] === 'active') {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active' AND id != ?");
                $stmt->execute([$userId]);
                if ((int)$stmt->fetchColumn() === 0) {
                    throw new Exception('At least one active admin is required.');
                }
            }
            $stmt = $pdo->prepare("UPDATE users SET status = 'inactive' WHERE id = ?");
            $stmt->execute([$userId]);
            flashAndRedirect('success', 'User deactivated successfully.');
        } catch (Exception $e) {
            flashAndRedirect('error', 'Failed to deactivate user: ' . $e->getMessage());
        }
    }
}

// Get current settings
$settings = [
    'tax_rate' => getSetting('tax_rate') ?? 12,
    'shop_name' => getSetting('shop_name') ?? 'Coffee at Yellow Hauz',
    'shop_address' => getSetting('shop_address') ?? 'Yellow Hauz, Philippines',
    'shop_phone' => getSetting('shop_phone') ?? '+63 912 345 6789',
    'receipt_footer' => getSetting('receipt_footer') ?? 'Thank you for visiting Coffee at Yellow Hauz!',
    'business_hours' => getSetting('business_hours') ?? '07:00-22:00'
];
$timeMenus = getTimeMenus();

// Get all users
$stmt = $pdo->query("SELECT * FROM users ORDER BY role, full_name ASC");
$users = $stmt->fetchAll();
$userStats = [
    'total' => count($users),
    'active' => count(array_filter($users, fn($user) => $user['status'] === 'active')),
    'admins' => count(array_filter($users, fn($user) => $user['role'] === 'admin' && $user['status'] === 'active')),
    'cashiers' => count(array_filter($users, fn($user) => $user['role'] === 'cashier' && $user['status'] === 'active')),
];
$stmt = $pdo->query("SELECT MAX(updated_at) as updated_at FROM settings");
$settingsUpdatedAt = $stmt->fetch()['updated_at'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Settings</title>
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    },
                    colors: {
                        brand: {
                            DEFAULT: '#FBBF24',
                            light: '#FEF9C3',
                            dark: '#D97706',
                            black: '#171717',
                        },
                        vintage: {
                            paper: '#F5F4F0',
                            border: '#E5E5E5'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #A3A3A3; }
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300 relative">
        
        <!-- LEFT SIDEBAR -->
        <aside id="sidebar" class="w-[80px] bg-white border-r border-vintage-border flex flex-col justify-between py-6 px-4 shrink-0 z-10 transition-all duration-300 ease-in-out">
            <div>
                <!-- Logo -->
                <div class="flex flex-col items-center justify-center mb-10 mt-2 text-center">
                    <span class="font-serif italic text-sm text-gray-500 mb-1">Coffee at</span>
                    <h1 class="font-serif font-bold text-2xl leading-none text-brand-black tracking-tight uppercase">Yellow Hauz</h1>
                    <div class="flex items-center gap-2 mt-2">
                        <div class="h-px w-4 bg-brand"></div>
                        <span class="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-semibold">Since 2007</span>
                        <div class="h-px w-4 bg-brand"></div>
                    </div>
                </div>

                <!-- Navigation -->
                <nav id="navigation" class="space-y-2">
                    <a href="menu.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-mug-hot w-5 text-center"></i> <span class="nav-text">Menu</span>
                    </a>
                    <a href="table.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-utensils w-5 text-center"></i> <span class="nav-text">Table Services</span>
                    </a>
                    <a href="ticket.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-receipt w-5 text-center"></i> <span class="nav-text">Tickets</span>
                    </a>
                    <a href="items.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-clipboard-list w-5 text-center"></i> <span class="nav-text">Manage Food Items</span>
                    </a>
                    <a href="sales.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-line w-5 text-center"></i> <span class="nav-text">Sales Report</span>
                    </a>
                    <a href="analysis.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-pie w-5 text-center"></i> <span class="nav-text">Product Analytics</span>
                    </a>
                    <a href="settings.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
                        <i class="fa-solid fa-gear w-5 text-center"></i> <span class="nav-text">Settings</span>
                    </a>
                </nav>
            </div>

            <!-- Bottom Users / Logout -->
            <div class="space-y-4">
                <div class="space-y-3 px-2">
                    <a href="profile.php" class="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-100">
                        <div class="w-8 h-8 rounded-full bg-brand text-brand-black flex items-center justify-center text-xs font-bold relative">
                            <?php echo strtoupper(substr($currentUser['full_name'], 0, 2)); ?>
                            <span class="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                        <span class="text-sm font-medium nav-text"><?php echo htmlspecialchars($currentUser['full_name']); ?></span>
                    </a>
                </div>
                <hr class="border-gray-200">
                <a href="#" onclick="showLogoutModal()" class="flex items-center gap-3 text-gray-500 hover:text-brand-black px-4 py-2 font-medium transition-all">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> <span class="nav-text">Logout</span>
                </a>
            </div>
        </aside>

        <main class="flex-1 min-w-0 flex flex-col relative bg-vintage-paper">
            <!-- Top Header -->
            <header class="min-h-[88px] flex flex-wrap items-center justify-between gap-4 px-8 py-4 shrink-0 border-b border-gray-200/50">
                <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black">
                    <i class="fa-solid fa-bars"></i>
                </button>
                
                <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide">SETTINGS</h2>
                
                <div class="text-right">
                    <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Last Settings Update</p>
                    <p class="text-sm font-bold text-brand-black"><?php echo $settingsUpdatedAt ? date('M d, Y h:i A', strtotime($settingsUpdatedAt)) : 'Not recorded'; ?></p>
                </div>
            </header>

            <div class="flex-1 min-w-0 overflow-y-auto px-8 pb-8 pt-6">
                <?php if ($success): ?>
                <div class="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <i class="fa-solid fa-circle-check"></i>
                    <span class="font-bold text-sm"><?php echo htmlspecialchars($success); ?></span>
                </div>
                <?php endif; ?>
                <?php if ($error): ?>
                <div class="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span class="font-bold text-sm"><?php echo htmlspecialchars($error); ?></span>
                </div>
                <?php endif; ?>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Users</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo $userStats['total']; ?></p>
                    </div>
                    <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Active</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo $userStats['active']; ?></p>
                    </div>
                    <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Admins</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo $userStats['admins']; ?></p>
                    </div>
                    <div class="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                        <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Tax Rate</p>
                        <p class="font-serif text-3xl font-bold text-brand-black mt-1"><?php echo number_format((float)$settings['tax_rate'], 2); ?>%</p>
                    </div>
                </div>

                <!-- General Settings -->
                <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div class="flex items-center gap-3 mb-5">
                        <div class="w-11 h-11 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center border border-brand/30">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">General Settings</h3>
                            <p class="text-xs text-gray-500">Business details used by receipts and checkout totals</p>
                        </div>
                    </div>
                    <form action="settings.php" method="POST" class="space-y-4">
                        <?php echo csrfField(); ?>
                        <input type="hidden" name="action" value="update_settings">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shop Name</label>
                                <input type="text" name="shop_name" value="<?php echo htmlspecialchars($settings['shop_name']); ?>" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                                <input type="number" min="0" max="100" step="0.01" name="tax_rate" value="<?php echo htmlspecialchars($settings['tax_rate']); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shop Address</label>
                                <input type="text" name="shop_address" value="<?php echo htmlspecialchars($settings['shop_address']); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Shop Phone</label>
                                <input type="text" name="shop_phone" value="<?php echo htmlspecialchars($settings['shop_phone']); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Business Hours</label>
                                <input type="text" name="business_hours" value="<?php echo htmlspecialchars($settings['business_hours']); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Receipt Footer</label>
                                <textarea name="receipt_footer" rows="2" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"><?php echo htmlspecialchars($settings['receipt_footer']); ?></textarea>
                            </div>
                        </div>
                        
                        <div class="flex justify-end pt-4">
                            <button type="submit" class="bg-brand-black text-brand px-6 py-2.5 rounded-xl font-bold text-sm shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none uppercase tracking-wide border border-transparent">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div class="flex items-center gap-3 mb-5">
                        <div class="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
                            <i class="fa-solid fa-receipt"></i>
                        </div>
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">Receipt Preview</h3>
                            <p class="text-xs text-gray-500">How printed headers will read</p>
                        </div>
                    </div>
                    <div class="border border-gray-200 rounded-2xl bg-gray-50 p-5 font-mono text-sm text-brand-black">
                        <div class="text-center">
                            <p class="font-bold text-base"><?php echo htmlspecialchars($settings['shop_name']); ?></p>
                            <p class="text-xs text-gray-500 mt-1"><?php echo htmlspecialchars($settings['shop_address']); ?></p>
                            <p class="text-xs text-gray-500"><?php echo htmlspecialchars($settings['shop_phone']); ?></p>
                            <p class="text-xs text-gray-500"><?php echo htmlspecialchars($settings['business_hours']); ?></p>
                        </div>
                        <div class="border-t border-dashed border-gray-300 my-4"></div>
                        <div class="space-y-2">
                            <div class="flex justify-between"><span>Subtotal</span><span><?php echo formatCurrency(500); ?></span></div>
                            <div class="flex justify-between"><span>Tax <?php echo number_format((float)$settings['tax_rate'], 2); ?>%</span><span><?php echo formatCurrency(500 * ((float)$settings['tax_rate'] / 100)); ?></span></div>
                            <div class="flex justify-between font-bold border-t border-gray-300 pt-2"><span>Total</span><span><?php echo formatCurrency(500 + (500 * ((float)$settings['tax_rate'] / 100))); ?></span></div>
                        </div>
                        <div class="border-t border-dashed border-gray-300 my-4"></div>
                        <p class="text-center text-xs text-gray-500"><?php echo htmlspecialchars($settings['receipt_footer']); ?></p>
                    </div>
                </div>
                </div>

                <!-- Time-Based Menu Editor -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                    <div class="flex items-center justify-between gap-4 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center border border-brand/30">
                                <i class="fa-solid fa-clock"></i>
                            </div>
                            <div>
                                <h3 class="font-serif text-xl font-bold text-brand-black">Time-Based Menu</h3>
                                <p class="text-xs text-gray-500">Edit the Morning, Lunch/Afternoon, and Dinner guide shown beside the POS menu</p>
                            </div>
                        </div>
                    </div>

                    <form action="settings.php" method="POST" class="space-y-4">
                        <?php echo csrfField(); ?>
                        <input type="hidden" name="action" value="update_time_menus">
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <?php foreach ($timeMenus as $index => $timeMenu): ?>
                            <div class="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                                <div class="space-y-3">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Section Title</label>
                                        <input type="text" name="time_menu_title[]" value="<?php echo htmlspecialchars($timeMenu['title'] ?? ''); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time Range</label>
                                        <input type="text" name="time_menu_time[]" value="<?php echo htmlspecialchars($timeMenu['time'] ?? ''); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Start</label>
                                            <input type="time" name="time_menu_start[]" value="<?php echo htmlspecialchars($timeMenu['start'] ?? '00:00'); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">End</label>
                                            <input type="time" name="time_menu_end[]" value="<?php echo htmlspecialchars($timeMenu['end'] ?? '23:59'); ?>" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Focus</label>
                                        <textarea name="time_menu_focus[]" rows="3" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"><?php echo htmlspecialchars($timeMenu['focus'] ?? ''); ?></textarea>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Featured Item Names</label>
                                        <textarea name="time_menu_item_names[]" rows="8" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"><?php echo htmlspecialchars(implode("\n", $timeMenu['item_names'] ?? [])); ?></textarea>
                                        <p class="text-[10px] text-gray-500 mt-1">One exact menu item name per line.</p>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                                        <textarea name="time_menu_items[]" rows="4" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"><?php echo htmlspecialchars(implode("\n", $timeMenu['items'] ?? [])); ?></textarea>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="submit" class="bg-brand-black text-brand px-6 py-2.5 rounded-xl font-bold text-sm shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none uppercase tracking-wide border border-transparent">
                                Save Time Menu
                            </button>
                        </div>
                    </form>
                </div>

                <!-- User Management -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="font-serif text-xl font-bold text-brand-black">User Management</h3>
                            <p class="text-xs text-gray-500 mt-1">Edit accounts, roles, and login access</p>
                        </div>
                        <button onclick="showAddUserModal()" class="bg-brand-black text-brand px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                            <i class="fa-solid fa-plus mr-2"></i> Add User
                        </button>
                    </div>
                    
                    <div class="w-full overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-200">
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <?php foreach ($users as $user): ?>
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="py-4 px-6 font-bold text-sm text-brand-black"><?php echo htmlspecialchars($user['employee_id']); ?></td>
                                    <td class="py-4 px-6 text-sm text-gray-600"><?php echo htmlspecialchars($user['full_name']); ?></td>
                                    <td class="py-4 px-6 text-sm text-gray-600"><?php echo htmlspecialchars($user['username']); ?></td>
                                    <td class="py-4 px-6">
                                        <span class="text-xs font-bold px-2 py-1 rounded-md <?php echo $user['role'] === 'admin' ? 'bg-brand-light text-brand-dark' : 'bg-gray-100 text-gray-600'; ?> uppercase">
                                            <?php echo $user['role']; ?>
                                        </span>
                                    </td>
                                    <td class="py-4 px-6">
                                        <span class="text-xs font-bold px-2 py-1 rounded-md <?php echo $user['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'; ?> uppercase">
                                            <?php echo $user['status']; ?>
                                        </span>
                                    </td>
                                    <td class="py-4 px-6 text-center">
                                        <div class="flex items-center justify-center gap-2">
                                            <?php if ($user['id'] !== $currentUser['id']): ?>
                                            <button onclick="showEditUserModal(<?php echo $user['id']; ?>)" class="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-brand-light transition-colors" title="Edit user"><i class="fa-solid fa-pen"></i></button>
                                            <?php if ($user['status'] === 'active'): ?>
                                            <button onclick="confirmDeleteUser(<?php echo $user['id']; ?>)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:text-white hover:bg-red-600 transition-colors" title="Deactivate user"><i class="fa-solid fa-user-slash"></i></button>
                                            <?php endif; ?>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>

    </div>

    <!-- Add User Modal -->
    <div id="addUserModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center gap-3 mb-5">
                <div class="w-11 h-11 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center border border-brand/30">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
                <div>
                    <h3 class="text-xl font-serif font-bold text-brand-black">Add New User</h3>
                    <p class="text-xs text-gray-500">Create a cashier or admin account</p>
                </div>
            </div>
            <form action="settings.php" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="add_user">
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee ID</label>
                    <input type="text" name="employee_id" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" name="full_name" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                    <input type="text" name="username" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">PIN</label>
                    <input type="password" name="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                    <select name="role" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideAddUserModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Add User
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div id="editUserModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-start justify-between gap-4 mb-5">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
                        <i class="fa-solid fa-user-gear"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-serif font-bold text-brand-black">Edit User</h3>
                        <p class="text-xs text-gray-500">Update account access and profile details</p>
                    </div>
                </div>
                <button type="button" onclick="hideEditUserModal()" class="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:text-brand-black hover:bg-gray-200 transition-colors shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <form action="settings.php" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="update_user">
                <input type="hidden" id="edit_user_id" name="user_id">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee ID</label>
                        <input type="text" id="edit_employee_id" name="employee_id" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                        <input type="text" id="edit_username" name="username" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input type="text" id="edit_full_name" name="full_name" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New PIN</label>
                    <input type="password" name="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" placeholder="Leave blank to keep current PIN" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                        <select id="edit_role" name="role" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="cashier">Cashier</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                        <select id="edit_status" name="status" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideEditUserModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Save User
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Deactivate User Confirmation Modal -->
    <div id="deactivateUserModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <i class="fa-solid fa-user-slash text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Deactivate User?</h3>
            <p id="deactivateUserMessage" class="text-gray-600 text-center mb-6">This user will no longer be able to log in.</p>
            <div class="flex gap-3">
                <button onclick="hideDeactivateUserModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <button onclick="submitDeactivateUser()" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                    Deactivate
                </button>
            </div>
        </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <div id="logoutModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <i class="fa-solid fa-arrow-right-from-bracket text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Confirm Logout</h3>
            <p class="text-gray-600 text-center mb-6">Are you sure you want to logout? You will need to sign in again to access the system.</p>
            <div class="flex gap-3">
                <button onclick="hideLogoutModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <a href="logout.php" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors text-center">
                    Logout
                </a>
            </div>
        </div>
    </div>

    <script>
        const users = <?php echo json_encode(array_map(function ($user) {
            return [
                'id' => (int)$user['id'],
                'employee_id' => $user['employee_id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'role' => $user['role'],
                'status' => $user['status'],
            ];
        }, $users)); ?>;
        let pendingDeactivateUserId = null;

        function showAddUserModal() {
            document.getElementById('addUserModal').classList.remove('hidden');
        }

        function hideAddUserModal() {
            document.getElementById('addUserModal').classList.add('hidden');
        }

        function showEditUserModal(userId) {
            const user = users.find(item => item.id === Number(userId));
            if (!user) return;

            document.getElementById('edit_user_id').value = user.id;
            document.getElementById('edit_employee_id').value = user.employee_id;
            document.getElementById('edit_username').value = user.username;
            document.getElementById('edit_full_name').value = user.full_name;
            document.getElementById('edit_role').value = user.role;
            document.getElementById('edit_status').value = user.status;
            document.getElementById('editUserModal').classList.remove('hidden');
        }

        function hideEditUserModal() {
            document.getElementById('editUserModal').classList.add('hidden');
        }

        function confirmDeleteUser(userId) {
            const user = users.find(item => item.id === Number(userId));
            if (!user) return;

            pendingDeactivateUserId = user.id;
            document.getElementById('deactivateUserMessage').textContent = user.full_name + ' will no longer be able to log in. Sales and order history will be kept.';
            document.getElementById('deactivateUserModal').classList.remove('hidden');
        }

        function hideDeactivateUserModal() {
            pendingDeactivateUserId = null;
            document.getElementById('deactivateUserModal').classList.add('hidden');
        }

        function submitDeactivateUser() {
            if (!pendingDeactivateUserId) return;

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'settings.php';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'delete_user';
            
            const userIdInput = document.createElement('input');
            userIdInput.type = 'hidden';
            userIdInput.name = 'user_id';
            userIdInput.value = pendingDeactivateUserId;
            
            form.appendChild(actionInput);
            form.appendChild(userIdInput);
            document.body.appendChild(form);
            form.submit();
        }

        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        // Sidebar toggle functionality
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const navTexts = document.querySelectorAll('.nav-text');
        let isCollapsed = localStorage.getItem('sidebarCollapsed') !== 'false';

        // Apply collapsed state by default
        sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        navTexts.forEach(text => {
            text.classList.add('hidden');
        });
        const navItems = document.querySelectorAll('#navigation a');
        navItems.forEach(item => {
            item.classList.add('justify-center');
            item.classList.remove('gap-4');
        });
        const logoText = sidebar.querySelector('h1');
        const logoSubtext = sidebar.querySelector('span.text-gray-500');
        const logoDivider = sidebar.querySelectorAll('.h-px');
        const logoSince = sidebar.querySelector('span.text-gray-400');
        if (logoText) logoText.classList.add('hidden');
        if (logoSubtext) logoSubtext.classList.add('hidden');
        if (logoSince) logoSince.classList.add('hidden');
        logoDivider.forEach(div => div.classList.add('hidden'));
        const userName = sidebar.querySelector('.text-sm.font-medium');
        if (userName) userName.classList.add('hidden');

        if (!isCollapsed) {
            sidebar.classList.remove('w-[80px]');
            sidebar.classList.add('w-[240px]');
            sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
            navTexts.forEach(text => text.classList.remove('hidden'));
            navItems.forEach(item => {
                item.classList.remove('justify-center');
                item.classList.add('gap-4');
            });
            if (logoText) logoText.classList.remove('hidden');
            if (logoSubtext) logoSubtext.classList.remove('hidden');
            if (logoSince) logoSince.classList.remove('hidden');
            logoDivider.forEach(div => div.classList.remove('hidden'));
            if (userName) userName.classList.remove('hidden');
        }

        sidebarToggle.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            localStorage.setItem('sidebarCollapsed', String(isCollapsed));
            
            if (isCollapsed) {
                sidebar.classList.remove('w-[240px]');
                sidebar.classList.add('w-[80px]');
                sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                
                navTexts.forEach(text => {
                    text.classList.add('hidden');
                });
                
                const navItems = document.querySelectorAll('#navigation a');
                navItems.forEach(item => {
                    item.classList.add('justify-center');
                    item.classList.remove('gap-4');
                });
                
                const logoText = sidebar.querySelector('h1');
                const logoSubtext = sidebar.querySelector('span.text-gray-500');
                const logoDivider = sidebar.querySelectorAll('.h-px');
                const logoSince = sidebar.querySelector('span.text-gray-400');
                
                if (logoText) logoText.classList.add('hidden');
                if (logoSubtext) logoSubtext.classList.add('hidden');
                if (logoSince) logoSince.classList.add('hidden');
                logoDivider.forEach(div => div.classList.add('hidden'));
                
                const userName = sidebar.querySelector('.text-sm.font-medium');
                if (userName) userName.classList.add('hidden');
                
            } else {
                sidebar.classList.remove('w-[80px]');
                sidebar.classList.add('w-[240px]');
                sidebarToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
                
                navTexts.forEach(text => {
                    text.classList.remove('hidden');
                });
                
                const navItems = document.querySelectorAll('#navigation a');
                navItems.forEach(item => {
                    item.classList.remove('justify-center');
                    item.classList.add('gap-4');
                });
                
                const logoText = sidebar.querySelector('h1');
                const logoSubtext = sidebar.querySelector('span.text-gray-500');
                const logoDivider = sidebar.querySelectorAll('.h-px');
                const logoSince = sidebar.querySelector('span.text-gray-400');
                
                if (logoText) logoText.classList.remove('hidden');
                if (logoSubtext) logoSubtext.classList.remove('hidden');
                if (logoSince) logoSince.classList.remove('hidden');
                logoDivider.forEach(div => div.classList.remove('hidden'));
                
                const userName = sidebar.querySelector('.text-sm.font-medium');
                if (userName) userName.classList.remove('hidden');
            }
        });
    </script>
    <?php include __DIR__ . '/staff_chatbot.php'; ?>
</body>
</html>
