<?php
require_once __DIR__ . '/../db.php';

// Redirect if already logged in
if (isLoggedIn()) {
    redirect('menu.php');
}

$error = '';
$success = '';

// Handle login form submission
define('STAFF_LOGIN_MAX_ATTEMPTS', 6);
define('STAFF_LOGIN_LOCKOUT_MINUTES', 15);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrfToken();
    enforceCooldown('staff_login', 1, 'Please wait a moment before trying again.');
    $pin = preg_replace('/\D/', '', $_POST['pin'] ?? '');
    $role = sanitize($_POST['role'] ?? 'cashier');

    if (empty($pin)) {
        $error = 'Please enter your PIN';
    } elseif (!in_array($role, ['cashier', 'admin'], true)) {
        $error = 'Invalid role selected';
    } else {
        // A PIN only identifies a role, not a specific employee, so brute
        // force is throttled per role+IP rather than per account.
        $throttleToken = $role . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $waitMinutes = throttleMinutesRemaining('staff_login', $throttleToken);

        if ($waitMinutes !== null) {
            $error = "Too many attempts. Try again in about {$waitMinutes} minute(s).";
        } else {
            try {
                $stmt = $pdo->prepare("SELECT id, employee_id, username, password, full_name, role, status FROM users WHERE role = ? AND status = 'active' ORDER BY id ASC");
                $stmt->execute([$role]);
                $users = $stmt->fetchAll();
                $user = null;

                foreach ($users as $candidate) {
                    // Supports existing local plaintext PINs once, then upgrades them.
                    $isValid = password_verify($pin, $candidate['password']);
                    if (!$isValid && !str_starts_with($candidate['password'], '$2y$') && hash_equals($candidate['password'], $pin)) {
                        $isValid = true;
                        $upgrade = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
                        $upgrade->execute([password_hash($pin, PASSWORD_DEFAULT), $candidate['id']]);
                    }
                    if ($isValid) {
                        $user = $candidate;
                        break;
                    }
                }

                if ($user) {
                    clearThrottle('staff_login', $throttleToken);

                    // Update last login
                    $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
                    $updateStmt->execute([$user['id']]);

                    session_regenerate_id(true);
                    // Set session variables
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['employee_id'] = $user['employee_id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['full_name'] = $user['full_name'];
                    $_SESSION['role'] = $user['role'];

                    // Redirect to menu
                    redirect('menu.php');
                } else {
                    recordThrottleFailure('staff_login', $throttleToken, STAFF_LOGIN_MAX_ATTEMPTS, STAFF_LOGIN_LOCKOUT_MINUTES);
                    $error = 'Invalid PIN';
                }
            } catch (PDOException $e) {
                $error = 'Login failed. Please try again.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Login</title>
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
        @media (prefers-reduced-motion: no-preference) {
            #login-error.shake { animation: shake .4s ease }
            @keyframes shake { 10%, 90% { transform: translateX(-2px) } 20%, 80% { transform: translateX(3px) } 30%, 50%, 70% { transform: translateX(-5px) } 40%, 60% { transform: translateX(5px) } }
            button:not(:disabled) { transition: transform .15s ease }
        }
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300 relative">
        
        <!-- LEFT SIDE (IMAGE & BRANDING) -->
        <div class="hidden lg:flex w-1/2 relative bg-brand-black items-center justify-center overflow-hidden">
            <div class="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80" alt="Vintage Coffee Shop" class="w-full h-full object-cover opacity-40">
                <div class="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/80 to-transparent"></div>
            </div>

            <div class="relative z-10 flex flex-col items-center justify-center text-center p-12">
                <div class="w-24 h-24 border-4 border-brand rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                    <i class="fa-solid fa-mug-hot text-4xl text-brand"></i>
                </div>
                <span class="font-serif italic text-xl text-brand-light mb-2">Coffee at</span>
                <h1 class="font-serif font-bold text-5xl md:text-6xl leading-none text-white tracking-tight uppercase shadow-black drop-shadow-md">Yellow Hauz</h1>
                <div class="flex items-center gap-4 mt-6 w-full max-w-[200px]">
                    <div class="h-px flex-1 bg-brand"></div>
                    <span class="text-xs tracking-[0.3em] text-brand uppercase font-bold">Since 2007</span>
                    <div class="h-px flex-1 bg-brand"></div>
                </div>
                <p class="text-gray-400 mt-8 max-w-sm text-sm leading-relaxed font-medium">
                    Point of Sale System.<br>Manage your orders, tables, and daily operations seamlessly.
                </p>
            </div>
        </div>

        <!-- RIGHT SIDE (LOGIN FORM) -->
        <div class="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 relative bg-vintage-paper">
            
            <!-- Mobile Logo (Hidden on Desktop) -->
            <div class="flex lg:hidden flex-col items-center justify-center mb-10 text-center">
                <span class="font-serif italic text-sm text-gray-500 mb-1">Coffee at</span>
                <h1 class="font-serif font-bold text-3xl leading-none text-brand-black tracking-tight uppercase">Yellow Hauz</h1>
                <div class="flex items-center gap-2 mt-2">
                    <div class="h-px w-4 bg-brand"></div>
                    <span class="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-semibold">Since 2007</span>
                    <div class="h-px w-4 bg-brand"></div>
                </div>
            </div>

            <!-- Form Wrapper -->
            <div class="w-full max-w-[420px]">
                
                <!-- Heading -->
                <div class="mb-8 text-center lg:text-left">
                    <h2 class="text-3xl font-serif font-bold text-brand-black mb-2">Enter PIN</h2>
                    <p class="text-gray-500 text-sm font-medium">Choose your role and use the keypad to access the POS.</p>
                </div>

                <!-- Error/Success Messages -->
                <?php if ($error): ?>
                <div id="login-error" class="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700 text-sm font-medium">
                    <i class="fa-solid fa-circle-exclamation mr-2"></i><?php echo $error; ?>
                </div>
                <?php endif; ?>

                <?php if ($success): ?>
                <div class="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl text-green-700 text-sm font-medium">
                    <i class="fa-solid fa-circle-check mr-2"></i><?php echo $success; ?>
                </div>
                <?php endif; ?>

                <!-- FORM -->
                <form action="index.php" method="POST" class="space-y-6" onsubmit="return validatePin()">
                    <?php echo csrfField(); ?>
                    
                    <!-- Hidden inputs -->
                    <input type="hidden" id="role-input" name="role" value="cashier">
                    <input type="hidden" id="pin-input" name="pin" value="">

                    <!-- ROLE TOGGLE -->
                    <div class="bg-white p-1.5 rounded-xl flex items-center justify-between border border-gray-200 shadow-sm relative">
                        <button type="button" id="btn-cashier" onclick="setRole('cashier')" class="flex-1 py-3 bg-brand-light rounded-lg shadow-sm border border-brand/30 text-brand-dark font-bold flex items-center justify-center gap-2 transition-all relative z-10">
                            <i class="fa-solid fa-cash-register"></i> Cashier
                        </button>
                        <button type="button" id="btn-admin" onclick="setRole('admin')" class="flex-1 py-3 text-gray-500 hover:text-brand-black font-bold flex items-center justify-center gap-2 transition-all border border-transparent relative z-10">
                            <i class="fa-solid fa-user-tie"></i> Admin
                        </button>
                    </div>

                    <!-- PIN Display -->
                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider text-center mb-3">PIN</label>
                        <div id="pin-display" class="h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center gap-3 text-2xl font-bold tracking-[0.35em] text-brand-black">
                            <span class="text-gray-300 tracking-normal text-sm">Enter PIN</span>
                        </div>
                    </div>

                    <!-- Numpad -->
                    <div class="grid grid-cols-3 gap-3">
                        <?php for ($digit = 1; $digit <= 9; $digit++): ?>
                        <button type="button" onclick="pressPin('<?php echo $digit; ?>')" class="h-16 bg-white border border-gray-200 rounded-xl text-2xl font-bold text-brand-black hover:bg-brand-light hover:border-brand transition-colors shadow-sm">
                            <?php echo $digit; ?>
                        </button>
                        <?php endfor; ?>
                        <button type="button" onclick="clearPin()" class="h-16 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shadow-sm">
                            Clear
                        </button>
                        <button type="button" onclick="pressPin('0')" class="h-16 bg-white border border-gray-200 rounded-xl text-2xl font-bold text-brand-black hover:bg-brand-light hover:border-brand transition-colors shadow-sm">
                            0
                        </button>
                        <button type="button" onclick="backspacePin()" class="h-16 bg-white border border-gray-200 rounded-xl text-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-brand-black transition-colors shadow-sm">
                            <i class="fa-solid fa-delete-left"></i>
                        </button>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" id="unlock-btn" class="w-full bg-brand-black text-brand py-4 rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 transition-all active:translate-y-1 active:translate-x-1 active:shadow-none border border-transparent uppercase tracking-widest mt-4 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                        <span id="unlock-btn-label">Unlock</span> <i class="fa-solid fa-arrow-right" id="unlock-btn-icon"></i>
                    </button>

                </form>
                
                <!-- Footer Note -->
                <p class="text-center text-xs font-medium text-gray-400 mt-10">
                    &copy; 2024 Coffee at Yellow Hauz.<br>System Access is restricted to authorized personnel only.
                </p>

            </div>
        </div>
    </div>

    <!-- JavaScript for Role Toggle Interaction -->
    <script>
        const pinInput = document.getElementById('pin-input');
        const pinDisplay = document.getElementById('pin-display');

        function setRole(role) {
            const adminBtn = document.getElementById('btn-admin');
            const cashierBtn = document.getElementById('btn-cashier');
            const roleInput = document.getElementById('role-input');

            roleInput.value = role;
            clearPin();

            if(role === 'admin') {
                adminBtn.className = "flex-1 py-3 bg-brand-light rounded-lg shadow-sm border border-brand/30 text-brand-dark font-bold flex items-center justify-center gap-2 transition-all relative z-10";
                cashierBtn.className = "flex-1 py-3 text-gray-500 hover:text-brand-black font-bold flex items-center justify-center gap-2 transition-all border border-transparent relative z-10";
            } else {
                cashierBtn.className = "flex-1 py-3 bg-brand-light rounded-lg shadow-sm border border-brand/30 text-brand-dark font-bold flex items-center justify-center gap-2 transition-all relative z-10";
                adminBtn.className = "flex-1 py-3 text-gray-500 hover:text-brand-black font-bold flex items-center justify-center gap-2 transition-all border border-transparent relative z-10";
            }
        }

        function updatePinDisplay() {
            const pin = pinInput.value;
            if (!pin) {
                pinDisplay.innerHTML = '<span class="text-gray-300 tracking-normal text-sm">Enter PIN</span>';
                return;
            }

            pinDisplay.textContent = '*'.repeat(pin.length);
        }

        function pressPin(digit) {
            if (pinInput.value.length >= 8) {
                return;
            }

            pinInput.value += digit;
            updatePinDisplay();
        }

        function backspacePin() {
            pinInput.value = pinInput.value.slice(0, -1);
            updatePinDisplay();
        }

        function clearPin() {
            pinInput.value = '';
            updatePinDisplay();
        }

        function validatePin() {
            if (pinInput.value.length === 0) {
                pinDisplay.classList.add('border-red-300', 'bg-red-50');
                setTimeout(() => pinDisplay.classList.remove('border-red-300', 'bg-red-50'), 900);
                return false;
            }

            const btn = document.getElementById('unlock-btn');
            const label = document.getElementById('unlock-btn-label');
            const icon = document.getElementById('unlock-btn-icon');
            if (btn) {
                btn.disabled = true;
                if (label) label.textContent = 'Checking\u2026';
                if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
            }
            return true;
        }

        (function () {
            const errorBox = document.getElementById('login-error');
            if (errorBox) {
                requestAnimationFrame(() => errorBox.classList.add('shake'));
            }
        })();
    </script>
</body>
</html>
