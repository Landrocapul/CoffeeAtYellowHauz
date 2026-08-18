<?php
require_once __DIR__ . '/includes/bootstrap.php';

requireCustomerLogin('account');
$activeNav = 'account';
$pageTitle = 'My Account | ' . YH_STORE_NAME;
$customer = currentCustomer();

// Orders placed while signed in are linked by customer_id. Older orders (or
// ones placed as a guest before signing in) are matched by name as a fallback.
$orders = $pdo->prepare("SELECT o.id, o.order_number, o.order_type, o.status, o.total_amount, o.created_at, t.table_number
    FROM orders o LEFT JOIN tables t ON t.id = o.table_id
    WHERE o.customer_id = ? OR (o.customer_id IS NULL AND o.customer_name = ?)
    ORDER BY o.created_at DESC LIMIT 10");
$orders->execute([(int)$customer['id'], $customer['full_name']]);
$orders = $orders->fetchAll();

$reservations = $pdo->prepare("SELECT r.reservation_code, r.guest_count, r.reservation_at, r.status, r.notes, t.table_number
    FROM reservations r JOIN tables t ON t.id = r.table_id
    WHERE r.customer_id = ? ORDER BY r.reservation_at DESC LIMIT 10");
$reservations->execute([(int)$customer['id']]);
$reservations = $reservations->fetchAll();

$orderStatusStyles = [
    'pending'    => 'bg-brand-soft text-brand-deep',
    'processing' => 'bg-blue-100 text-blue-700',
    'completed'  => 'bg-green-100 text-green-700',
    'cancelled'  => 'bg-red-100 text-red-700',
];
$reservationStatusStyles = [
    'pending'   => 'bg-brand-soft text-brand-deep',
    'confirmed' => 'bg-green-100 text-green-700',
    'cancelled' => 'bg-red-100 text-red-700',
    'completed' => 'bg-line text-ink-soft',
];

include __DIR__ . '/includes/header.php';
?>
<style>
  #toast { transition: opacity .25s ease, transform .25s ease; opacity: 0; transform: translateY(8px); }
  #toast.is-open { opacity: 1; transform: translateY(0); }
  .tab-panel[hidden] { display: none; }
  .tab-btn[aria-selected="true"] { background: #1A1613; color: #FBBF24; }
</style>

<div class="flex-1 px-4 pb-10 lg:px-8 lg:pb-16">

  <div class="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-strong bg-white p-5 lg:mt-8">
    <div class="flex items-center gap-4">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-2xl font-extrabold text-brand"><?= escape(strtoupper(substr($customer['full_name'], 0, 1))) ?></span>
      <div>
        <p class="font-display text-xl font-extrabold leading-tight"><?= escape($customer['full_name']) ?></p>
        <p class="text-[13px] text-ink-mute"><?= escape($customer['email']) ?></p>
      </div>
    </div>
    <a href="../actions/customer_logout.php" class="btn inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-[13px] font-bold text-ink-soft transition hover:text-ink">
      <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>Sign out
    </a>
  </div>

  <!-- Tabs -->
  <div role="tablist" aria-label="Account sections" class="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
    <button type="button" class="tab-btn shrink-0 rounded-xl border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft" data-tab="profile" role="tab" aria-selected="true" aria-controls="panel-profile">Profile</button>
    <button type="button" class="tab-btn shrink-0 rounded-xl border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft" data-tab="orders" role="tab" aria-selected="false" aria-controls="panel-orders">Order history</button>
    <button type="button" class="tab-btn shrink-0 rounded-xl border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft" data-tab="reservations" role="tab" aria-selected="false" aria-controls="panel-reservations">Reservations</button>
    <button type="button" class="tab-btn shrink-0 rounded-xl border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-ink-soft" data-tab="security" role="tab" aria-selected="false" aria-controls="panel-security">Password</button>
  </div>

  <!-- Profile panel -->
  <section id="panel-profile" class="tab-panel mt-5 rounded-2xl border border-line-strong bg-white p-5" role="tabpanel">
    <h2 class="font-display text-lg font-extrabold">Profile details</h2>
    <p class="mt-1 text-[13px] text-ink-soft">Keep this up to date so staff can reach you about orders and reservations.</p>
    <form id="profile-form" class="mt-4 grid gap-3 sm:grid-cols-2">
      <?= csrfField() ?>
      <label class="text-[13px] font-bold text-ink sm:col-span-2">Full name
        <input required name="full_name" maxlength="100" value="<?= escape($customer['full_name']) ?>"
          class="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
      </label>
      <label class="text-[13px] font-bold text-ink">Email address
        <input required name="email" type="email" maxlength="150" value="<?= escape($customer['email']) ?>"
          class="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
      </label>
      <label class="text-[13px] font-bold text-ink">Contact number
        <input required name="contact_number" maxlength="30" value="<?= escape($customer['contact_number']) ?>"
          class="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
      </label>
      <p class="sm:col-span-2 text-[12px] text-ink-mute">Member since <?= escape((new DateTime($customer['created_at']))->format('F Y')) ?></p>
      <p data-profile-error class="hidden sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700"></p>
      <button type="submit" class="sm:col-span-2 h-11 rounded-xl bg-ink text-[14px] font-extrabold text-brand transition hover:bg-black">Save changes</button>
    </form>
  </section>

  <!-- Orders panel -->
  <section id="panel-orders" class="tab-panel mt-5 rounded-2xl border border-line-strong bg-white p-5" role="tabpanel" hidden>
    <h2 class="font-display text-lg font-extrabold">Order history</h2>
    <p class="mt-1 text-[13px] text-ink-soft">Your most recent orders placed under this name.</p>
    <?php if (!$orders): ?>
      <p class="mt-6 py-8 text-center text-[13px] text-ink-mute"><i class="fa-regular fa-clipboard mb-2 block text-2xl text-line-strong"></i>No orders yet. <a href="menu.php" class="font-bold text-brand-deep">Browse the menu &rarr;</a></p>
    <?php else: ?>
      <ul class="mt-4 divide-y divide-line">
        <?php foreach ($orders as $order):
          $created = DateTime::createFromFormat('Y-m-d H:i:s', $order['created_at']); ?>
          <li class="flex items-center justify-between gap-3 py-3">
            <div class="min-w-0">
              <p class="truncate text-[14px] font-bold text-ink"><?= escape($order['order_number']) ?></p>
              <p class="text-[12px] text-ink-mute">
                <?= $order['order_type'] === 'dine_in' ? 'Dine-in' . ($order['table_number'] ? ' &middot; Table ' . (int)$order['table_number'] : '') : 'Take away' ?>
                &middot; <?= $created ? escape($created->format('M j, Y g:i A')) : '' ?>
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-[14px] font-bold tabular-nums text-ink">&#8369;<?= number_format((float)$order['total_amount'], 2) ?></p>
              <span class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase <?= $orderStatusStyles[$order['status']] ?? 'bg-line text-ink-soft' ?>"><?= escape($order['status']) ?></span>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </section>

  <!-- Reservations panel -->
  <section id="panel-reservations" class="tab-panel mt-5 rounded-2xl border border-line-strong bg-white p-5" role="tabpanel" hidden>
    <h2 class="font-display text-lg font-extrabold">Reservation history</h2>
    <p class="mt-1 text-[13px] text-ink-soft">Every table request you've made with this account.</p>
    <?php if (!$reservations): ?>
      <p class="mt-6 py-8 text-center text-[13px] text-ink-mute"><i class="fa-regular fa-calendar mb-2 block text-2xl text-line-strong"></i>No reservations yet. <a href="reservation.php" class="font-bold text-brand-deep">Reserve a table &rarr;</a></p>
    <?php else: ?>
      <ul class="mt-4 divide-y divide-line">
        <?php foreach ($reservations as $reservation):
          $when = DateTime::createFromFormat('Y-m-d H:i:s', $reservation['reservation_at']); ?>
          <li class="flex items-center justify-between gap-3 py-3">
            <div class="min-w-0">
              <p class="truncate text-[14px] font-bold text-ink">Table <?= (int)$reservation['table_number'] ?> &middot; <?= (int)$reservation['guest_count'] ?> guests</p>
              <p class="text-[12px] text-ink-mute"><?= $when ? escape($when->format('M j, Y g:i A')) : '' ?> &middot; Ref <?= escape($reservation['reservation_code']) ?></p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize <?= $reservationStatusStyles[$reservation['status']] ?? 'bg-line text-ink-soft' ?>"><?= escape($reservation['status']) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </section>

  <!-- Security panel -->
  <section id="panel-security" class="tab-panel mt-5 rounded-2xl border border-line-strong bg-white p-5" role="tabpanel" hidden>
    <h2 class="font-display text-lg font-extrabold">Change password</h2>
    <p class="mt-1 text-[13px] text-ink-soft">Use at least 8 characters. You'll stay signed in on this device.</p>
    <form id="password-form" class="mt-4 grid gap-3 sm:max-w-sm">
      <?= csrfField() ?>
      <label class="text-[13px] font-bold text-ink">Current password
        <input required name="current_password" type="password" minlength="8" class="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
      </label>
      <label class="text-[13px] font-bold text-ink">New password
        <input required name="new_password" type="password" minlength="8" class="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
      </label>
      <p data-password-error class="hidden rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700"></p>
      <button type="submit" class="h-11 rounded-xl bg-ink text-[14px] font-extrabold text-brand transition hover:bg-black">Update password</button>
    </form>
  </section>
</div>

<div id="toast" class="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-bold text-brand shadow-panel lg:bottom-6"></div>

<script>
(function () {
  var CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;
  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));

  function activate(name) {
    tabButtons.forEach(function (btn) { btn.setAttribute('aria-selected', String(btn.dataset.tab === name)); });
    panels.forEach(function (panel) { panel.hidden = panel.id !== 'panel-' + name; });
  }
  tabButtons.forEach(function (btn) { btn.addEventListener('click', function () { activate(btn.dataset.tab); }); });

  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-open'); }, 2600);
  }

  function bindForm(formId, endpoint, errorSelector, onSuccess) {
    var form = document.getElementById(formId);
    var errorBox = form.querySelector(errorSelector);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      errorBox.classList.add('hidden');
      var button = form.querySelector('button[type=submit]');
      var originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Saving\u2026';
      try {
        var payload = Object.fromEntries(new FormData(form));
        payload.csrf_token = CSRF_TOKEN;
        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var result = await response.json();
        if (!result.success) throw new Error(result.error || 'Something went wrong.');
        if (onSuccess) onSuccess(result, form);
      } catch (error) {
        errorBox.textContent = error.message || 'Something went wrong. Please try again.';
        errorBox.classList.remove('hidden');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  bindForm('profile-form', '../actions/customer_profile.php', '[data-profile-error]', function () {
    showToast('Profile updated');
  });
  bindForm('password-form', '../actions/customer_password.php', '[data-password-error]', function (result, form) {
    showToast('Password updated');
    form.reset();
  });
})();
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
