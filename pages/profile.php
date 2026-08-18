<?php
require_once __DIR__ . '/../db.php';

if (!isLoggedIn()) {
    redirect('index.php');
}

$currentUser = getCurrentUser();
$success = $_SESSION['profile_success'] ?? null;
$error = $_SESSION['profile_error'] ?? null;
unset($_SESSION['profile_success'], $_SESSION['profile_error']);

function profileFlashAndRedirect($type, $message) {
    $_SESSION[$type === 'success' ? 'profile_success' : 'profile_error'] = $message;
    redirect('profile.php');
}

$stmt = $pdo->prepare("SELECT id, employee_id, username, password, full_name, role, status, created_at, last_login FROM users WHERE id = ?");
$stmt->execute([$currentUser['id']]);
$profileUser = $stmt->fetch();

if (!$profileUser || $profileUser['status'] !== 'active') {
    session_destroy();
    redirect('index.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    requireCsrfToken();
    $action = $_POST['action'];

    if ($action === 'update_profile') {
        $fullName = sanitize($_POST['full_name'] ?? '');
        $username = sanitize($_POST['username'] ?? '');

        try {
            if ($fullName === '' || $username === '') {
                throw new Exception('Full name and username are required.');
            }

            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $stmt->execute([$username, $profileUser['id']]);
            if ($stmt->fetch()) {
                throw new Exception('That username is already used by another account.');
            }

            $stmt = $pdo->prepare("UPDATE users SET full_name = ?, username = ? WHERE id = ?");
            $stmt->execute([$fullName, $username, $profileUser['id']]);
            $_SESSION['full_name'] = $fullName;
            $_SESSION['username'] = $username;
            profileFlashAndRedirect('success', 'Profile updated successfully.');
        } catch (Exception $e) {
            profileFlashAndRedirect('error', 'Failed to update profile: ' . $e->getMessage());
        }
    } elseif ($action === 'change_password') {
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';

        try {
            if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
                throw new Exception('Please complete all password fields.');
            }
            if (!password_verify($currentPassword, $profileUser['password'])) {
                throw new Exception('Current password is incorrect.');
            }
            if (strlen($newPassword) < 6) {
                throw new Exception('New password must be at least 6 characters.');
            }
            if ($newPassword !== $confirmPassword) {
                throw new Exception('New passwords do not match.');
            }

            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $profileUser['id']]);
            profileFlashAndRedirect('success', 'Password changed successfully.');
        } catch (Exception $e) {
            profileFlashAndRedirect('error', 'Failed to change password: ' . $e->getMessage());
        }
    }
}

$initials = strtoupper(substr($profileUser['full_name'], 0, 2));
$roleLabel = $profileUser['role'] === 'admin' ? 'Admin' : 'Cashier';
$homeUrl = hasAdminAccess() ? 'menu.php' : 'menu.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Profile</title>
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
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
        <aside id="sidebar" class="w-[80px] bg-white border-r border-vintage-border flex flex-col justify-between py-6 px-4 shrink-0 z-10 transition-all duration-300 ease-in-out">
            <div>
                <div class="flex flex-col items-center justify-center mb-10 mt-2 text-center">
                    <span class="font-serif italic text-sm text-gray-500 mb-1">Coffee at</span>
                    <h1 class="font-serif font-bold text-2xl leading-none text-brand-black tracking-tight uppercase">Yellow Hauz</h1>
                    <div class="flex items-center gap-2 mt-2">
                        <div class="h-px w-4 bg-brand"></div>
                        <span class="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-semibold">Since 2007</span>
                        <div class="h-px w-4 bg-brand"></div>
                    </div>
                </div>

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
                    <?php if (isAdmin()): ?>
                    <a href="items.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-clipboard-list w-5 text-center"></i> <span class="nav-text">Manage Food Items</span>
                    </a>
                    <a href="sales.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-line w-5 text-center"></i> <span class="nav-text">Sales Report</span>
                    </a>
                    <a href="analysis.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-chart-pie w-5 text-center"></i> <span class="nav-text">Product Analytics</span>
                    </a>
                    <a href="settings.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-gear w-5 text-center"></i> <span class="nav-text">Settings</span>
                    </a>
                    <?php endif; ?>
                </nav>
            </div>

            <div class="space-y-4">
                <div class="space-y-3 px-2">
                    <a href="profile.php" class="flex items-center gap-3 cursor-pointer p-2 rounded-xl bg-brand-light border border-brand/30">
                        <div class="w-8 h-8 rounded-full bg-brand text-brand-black flex items-center justify-center text-xs font-bold relative">
                            <?php echo htmlspecialchars($initials); ?>
                            <span class="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                        <span class="text-sm font-medium nav-text"><?php echo htmlspecialchars($profileUser['full_name']); ?></span>
                    </a>
                </div>
                <hr class="border-gray-200">
                <a href="#" onclick="showLogoutModal()" class="flex items-center gap-3 text-gray-500 hover:text-brand-black px-4 py-2 font-medium transition-all">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> <span class="nav-text">Logout</span>
                </a>
            </div>
        </aside>

        <main class="flex-1 min-w-0 flex flex-col relative bg-vintage-paper">
            <header class="min-h-[88px] flex flex-wrap items-center justify-between gap-4 px-8 py-4 shrink-0 border-b border-gray-200/50">
                <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide">PROFILE</h2>
                <a href="<?php echo htmlspecialchars($homeUrl); ?>" class="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:text-brand-black hover:border-brand-black transition-colors">
                    <i class="fa-solid fa-arrow-left mr-2"></i>Back to POS
                </a>
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

                <div class="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                    <section class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div class="flex flex-col items-center text-center">
                            <div class="w-24 h-24 rounded-full bg-brand text-brand-black flex items-center justify-center text-3xl font-bold border-4 border-brand-light shadow-sm">
                                <?php echo htmlspecialchars($initials); ?>
                            </div>
                            <h3 class="font-serif text-2xl font-bold text-brand-black mt-4"><?php echo htmlspecialchars($profileUser['full_name']); ?></h3>
                            <p class="text-sm text-gray-500 mt-1"><?php echo htmlspecialchars($profileUser['employee_id']); ?></p>
                            <span class="mt-4 text-xs font-bold px-3 py-1.5 rounded-full <?php echo $profileUser['role'] === 'admin' ? 'bg-brand-light text-brand-dark' : 'bg-gray-100 text-gray-600'; ?> uppercase">
                                <?php echo htmlspecialchars($roleLabel); ?>
                            </span>
                        </div>

                        <div class="mt-6 space-y-3 text-sm">
                            <div class="flex justify-between border-t border-gray-100 pt-3">
                                <span class="text-gray-500">Username</span>
                                <span class="font-bold"><?php echo htmlspecialchars($profileUser['username']); ?></span>
                            </div>
                            <div class="flex justify-between border-t border-gray-100 pt-3">
                                <span class="text-gray-500">Status</span>
                                <span class="font-bold text-green-600"><?php echo htmlspecialchars($profileUser['status']); ?></span>
                            </div>
                            <div class="flex justify-between border-t border-gray-100 pt-3">
                                <span class="text-gray-500">Last Login</span>
                                <span class="font-bold text-right"><?php echo $profileUser['last_login'] ? date('M d, h:i A', strtotime($profileUser['last_login'])) : 'Not recorded'; ?></span>
                            </div>
                        </div>
                    </section>

                    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div class="flex items-center gap-3 mb-5">
                                <div class="w-11 h-11 rounded-xl bg-brand-light text-brand-dark flex items-center justify-center border border-brand/30">
                                    <i class="fa-solid fa-user-pen"></i>
                                </div>
                                <div>
                                    <h3 class="font-serif text-xl font-bold text-brand-black">Profile Details</h3>
                                    <p class="text-xs text-gray-500">Update your display name and username</p>
                                </div>
                            </div>
                            <form action="profile.php" method="POST" class="space-y-4">
                                <?php echo csrfField(); ?>
                                <input type="hidden" name="action" value="update_profile">
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee ID</label>
                                    <input type="text" value="<?php echo htmlspecialchars($profileUser['employee_id']); ?>" disabled class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                                    <input type="text" name="full_name" value="<?php echo htmlspecialchars($profileUser['full_name']); ?>" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                                    <input type="text" name="username" value="<?php echo htmlspecialchars($profileUser['username']); ?>" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                </div>
                                <button type="submit" class="w-full bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                                    Save Profile
                                </button>
                            </form>
                        </div>

                        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div class="flex items-center gap-3 mb-5">
                                <div class="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
                                    <i class="fa-solid fa-lock"></i>
                                </div>
                                <div>
                                    <h3 class="font-serif text-xl font-bold text-brand-black">Password</h3>
                                    <p class="text-xs text-gray-500">Change your own login password</p>
                                </div>
                            </div>
                            <form action="profile.php" method="POST" class="space-y-4">
                                <?php echo csrfField(); ?>
                                <input type="hidden" name="action" value="change_password">
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Password</label>
                                    <input type="password" name="current_password" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Password</label>
                                    <input type="password" name="new_password" minlength="6" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                                    <input type="password" name="confirm_password" minlength="6" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                                </div>
                                <button type="submit" class="w-full bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                                    Change Password
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    </div>

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
        function showLogoutModal() {
            document.getElementById('logoutModal').classList.remove('hidden');
        }
        
        function hideLogoutModal() {
            document.getElementById('logoutModal').classList.add('hidden');
        }

        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const navTexts = document.querySelectorAll('.nav-text');
        let isCollapsed = localStorage.getItem('sidebarCollapsed') !== 'false';

        sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        navTexts.forEach(text => text.classList.add('hidden'));
        const navItems = document.querySelectorAll('#navigation a');
        navItems.forEach(item => {
            item.classList.add('justify-center');
            item.classList.remove('gap-4');
        });
        const logoText = sidebar.querySelector('h1');
        const logoSubtext = sidebar.querySelector('span.text-gray-500');
        const logoDivider = sidebar.querySelectorAll('.h-px');
        const logoSince = sidebar.querySelector('span.text-gray-400');
        const userName = sidebar.querySelector('.text-sm.font-medium');
        if (logoText) logoText.classList.add('hidden');
        if (logoSubtext) logoSubtext.classList.add('hidden');
        if (logoSince) logoSince.classList.add('hidden');
        if (userName) userName.classList.add('hidden');
        logoDivider.forEach(div => div.classList.add('hidden'));

        function expandSidebar() {
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
            if (userName) userName.classList.remove('hidden');
            logoDivider.forEach(div => div.classList.remove('hidden'));
        }

        function collapseSidebar() {
            sidebar.classList.remove('w-[240px]');
            sidebar.classList.add('w-[80px]');
            sidebarToggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            navTexts.forEach(text => text.classList.add('hidden'));
            navItems.forEach(item => {
                item.classList.add('justify-center');
                item.classList.remove('gap-4');
            });
            if (logoText) logoText.classList.add('hidden');
            if (logoSubtext) logoSubtext.classList.add('hidden');
            if (logoSince) logoSince.classList.add('hidden');
            if (userName) userName.classList.add('hidden');
            logoDivider.forEach(div => div.classList.add('hidden'));
        }

        if (!isCollapsed) {
            expandSidebar();
        }

        sidebarToggle.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            localStorage.setItem('sidebarCollapsed', String(isCollapsed));
            if (isCollapsed) {
                collapseSidebar();
            } else {
                expandSidebar();
            }
        });
    </script>
    <?php include __DIR__ . '/staff_chatbot.php'; ?>
</body>
</html>
