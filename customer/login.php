<?php
require_once __DIR__ . '/includes/bootstrap.php';

$returnParam = $_GET['return'] ?? '';
$return = $returnParam === 'reservation' ? 'reservation.php' : ($returnParam === 'account' ? 'account.php' : './');
$error = '';
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_MINUTES', 15);

if (currentCustomer()) {
    redirect($return);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrfToken();
    enforceCooldown('customer_login', 2, 'Please wait a moment before trying again.');
    $mode = $_POST['mode'] ?? 'login';
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');
    try {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) throw new RuntimeException('Enter a valid email and a password with at least 8 characters.');
        if ($mode === 'register') {
            $name = sanitize($_POST['full_name'] ?? '');
            $contact = preg_replace('/[^0-9+\-() ]/', '', (string)($_POST['contact_number'] ?? ''));
            if ($name === '' || strlen($name) > 100 || strlen($contact) < 7) throw new RuntimeException('Enter your name and a valid contact number.');
            $stmt = $pdo->prepare('INSERT INTO customer_accounts (full_name, email, contact_number, password) VALUES (?, ?, ?, ?)');
            $stmt->execute([$name, $email, $contact, password_hash($password, PASSWORD_DEFAULT)]);
            session_regenerate_id(true);
            $_SESSION['customer_id'] = (int)$pdo->lastInsertId();
            $_SESSION['customer_name'] = $name;
        } else {
            $stmt = $pdo->prepare("SELECT id, full_name, password, failed_attempts, locked_until FROM customer_accounts WHERE email = ? AND status = 'active' LIMIT 1");
            $stmt->execute([$email]); $account = $stmt->fetch();

            $hashToCheck = $account['password'] ?? '$2y$10$invalidsaltinvalidsaltinvalidsal.uK3z1z1z1z1z1z1z1z1z1';
            $passwordOk = password_verify($password, $hashToCheck);

            if ($account && !empty($account['locked_until']) && strtotime($account['locked_until']) > time()) {
                $waitMinutes = max(1, (int)ceil((strtotime($account['locked_until']) - time()) / 60));
                throw new RuntimeException("Too many attempts. Try again in about {$waitMinutes} minute(s).");
            }

            if (!$account || !$passwordOk) {
                if ($account) {
                    $attempts = (int)$account['failed_attempts'] + 1;
                    $lockUntil = $attempts >= MAX_LOGIN_ATTEMPTS
                        ? (new DateTime('+' . LOCKOUT_MINUTES . ' minutes'))->format('Y-m-d H:i:s')
                        : null;
                    $pdo->prepare('UPDATE customer_accounts SET failed_attempts = ?, locked_until = ? WHERE id = ?')
                        ->execute([$attempts, $lockUntil, $account['id']]);
                }
                throw new RuntimeException('Invalid email or password.');
            }

            if ((int)$account['failed_attempts'] !== 0 || $account['locked_until'] !== null) {
                $pdo->prepare('UPDATE customer_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?')->execute([$account['id']]);
            }
            session_regenerate_id(true);
            $_SESSION['customer_id'] = (int)$account['id'];
            $_SESSION['customer_name'] = $account['full_name'];
        }
        redirect($return);
    } catch (PDOException $e) { $error = $e->getCode() === '23000' ? 'An account with that email already exists.' : 'Account service is unavailable.'; }
      catch (Throwable $e) { $error = $e->getMessage(); }
}

$pageTitle = 'Sign In | ' . YH_STORE_NAME;
$initialMode = ($_POST['mode'] ?? '') === 'register' ? 'register' : 'login';
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#F7F5F0">
<title><?= escape($pageTitle) ?></title>
<link rel="icon" href="../images/favicon.svg">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@600;700;800&family=Nunito+Sans:wght@400;500;600;700;800&display=swap">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = { theme: { extend: {
  colors: { paper: '#F7F5F0', line: { DEFAULT: '#E4DED2', strong: '#D3C9B8' }, ink: { DEFAULT: '#1A1613', soft: '#544B42', mute: '#857A6D' }, brand: { DEFAULT: '#FBBF24', soft: '#FEF3C7', deep: '#B45309', ink: '#432C06' } },
  fontFamily: { display: ['Alegreya', 'Georgia', 'serif'], body: ['"Nunito Sans"', 'system-ui', 'sans-serif'] }
} } };
</script>
<style>
  body { font-family: 'Nunito Sans', system-ui, sans-serif }
  @media (prefers-reduced-motion: no-preference) {
    main { animation: card-in .4s cubic-bezier(.16,1,.3,1) both }
    @keyframes card-in { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
    #form-error { animation: shake .4s ease }
    @keyframes shake { 10%,90% { transform: translateX(-2px) } 20%,80% { transform: translateX(3px) } 30%,50%,70% { transform: translateX(-5px) } 40%,60% { transform: translateX(5px) } }
    #register-fields { transition: max-height .3s ease, opacity .25s ease, margin .3s ease; max-height: 160px; opacity: 1; overflow: hidden }
    #register-fields.hidden { display: block !important; max-height: 0; opacity: 0; margin: 0 }
    .mode { transition: background-color .2s ease, color .2s ease, box-shadow .2s ease }
    button { transition: transform .15s ease }
    button:active:not(:disabled) { transform: scale(.97) }
    input { transition: border-color .15s ease, box-shadow .15s ease }
  }
</style>
</head>
<body class="grid min-h-screen place-items-center bg-shell p-4 text-ink">
<main class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
  <a href="./" class="text-sm font-bold text-brand-deep">&larr; Back to Yellow Hauz</a>
  <p class="mt-6 text-xs font-bold uppercase tracking-widest text-brand-deep">Yellow Hauz guest account</p>
  <h1 class="mt-1 font-display text-3xl font-bold">Sign in to order &amp; reserve</h1>
  <p class="mt-2 text-sm text-ink-mute">One account for online orders, reservations, and your profile.</p>

  <?php if ($error): ?><p id="form-error" class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"><?= escape($error) ?></p><?php endif; ?>

  <div class="mt-6 flex rounded-xl bg-paper p-1">
    <button type="button" class="mode flex-1 rounded-lg py-2 font-bold <?= $initialMode === 'login' ? 'bg-white shadow' : 'text-ink-mute' ?>" data-mode="login">Sign in</button>
    <button type="button" class="mode flex-1 rounded-lg py-2 font-bold <?= $initialMode === 'register' ? 'bg-white shadow' : 'text-ink-mute' ?>" data-mode="register">Create account</button>
  </div>

  <form method="post" class="mt-5 space-y-3">
    <input type="hidden" id="mode" name="mode" value="<?= escape($initialMode) ?>">
    <?= csrfField() ?>
    <div id="register-fields" class="<?= $initialMode === 'register' ? '' : 'hidden' ?> space-y-3" <?= $initialMode === 'register' ? '' : 'inert' ?>>
      <input name="full_name" maxlength="100" placeholder="Full name" value="<?= escape($_POST['full_name'] ?? '') ?>" class="w-full rounded-xl border border-line-strong p-3 focus:border-brand-deep focus:outline-none">
      <input name="contact_number" maxlength="30" placeholder="Contact number" value="<?= escape($_POST['contact_number'] ?? '') ?>" class="w-full rounded-xl border border-line-strong p-3 focus:border-brand-deep focus:outline-none">
    </div>
    <input required name="email" type="email" placeholder="Email address" value="<?= escape($_POST['email'] ?? '') ?>" class="w-full rounded-xl border border-line-strong p-3 focus:border-brand-deep focus:outline-none">
    <div class="relative">
      <input required id="password-input" name="password" type="password" minlength="8" placeholder="Password (at least 8 characters)" class="w-full rounded-xl border border-line-strong p-3 pr-16 focus:border-brand-deep focus:outline-none">
      <button type="button" id="toggle-password" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-brand-deep hover:bg-brand-soft">Show</button>
    </div>
    <button id="submit-btn" class="w-full rounded-xl bg-ink py-3 font-bold text-brand disabled:cursor-not-allowed disabled:opacity-70">Continue</button>
  </form>
</main>
<script>
document.querySelectorAll('.mode').forEach(function (button) {
  button.onclick = function () {
    var register = button.dataset.mode === 'register';
    document.getElementById('mode').value = button.dataset.mode;
    var fields = document.getElementById('register-fields');
    fields.classList.toggle('hidden', !register);
    fields.toggleAttribute('inert', !register);
    document.querySelectorAll('.mode').forEach(function (other) { other.className = 'mode flex-1 rounded-lg py-2 font-bold text-ink-mute'; });
    button.className = 'mode flex-1 rounded-lg bg-white py-2 font-bold shadow';
  };
});
document.getElementById('toggle-password').addEventListener('click', function () {
  var input = document.getElementById('password-input');
  var show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  this.textContent = show ? 'Hide' : 'Show';
});
document.querySelector('form').addEventListener('submit', function () {
  var button = document.getElementById('submit-btn');
  var register = document.getElementById('mode').value === 'register';
  button.disabled = true;
  button.textContent = register ? 'Creating account\u2026' : 'Signing in\u2026';
});
</script>
</body>
</html>
