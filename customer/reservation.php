<?php
require_once __DIR__ . '/includes/bootstrap.php';

$activeNav = 'reservation';
$pageTitle = 'Reserve a Table | ' . YH_STORE_NAME;

$customer = currentCustomer();
$tables = $pdo->query("SELECT id, table_number, capacity, area FROM tables WHERE status <> 'cleaning' ORDER BY table_number")->fetchAll();

$myReservations = [];
if ($customer) {
    $stmt = $pdo->prepare("SELECT r.reservation_code, r.guest_count, r.reservation_at, r.status, t.table_number
        FROM reservations r JOIN tables t ON t.id = r.table_id
        WHERE r.customer_id = ? AND r.reservation_at >= NOW() - INTERVAL 1 DAY
        ORDER BY r.reservation_at ASC LIMIT 5");
    $stmt->execute([(int)$customer['id']]);
    $myReservations = $stmt->fetchAll();
}

$statusStyles = [
    'pending'   => 'bg-brand-soft text-brand-deep',
    'confirmed' => 'bg-green-100 text-green-700',
    'cancelled' => 'bg-red-100 text-red-700',
    'completed' => 'bg-line text-ink-soft',
];

include __DIR__ . '/includes/header.php';
?>
<style>
  @media (prefers-reduced-motion: no-preference) {
    .table-card { transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease }
    .table-card:active { transform: scale(.97) }
    .table-card.is-selected { transform: scale(1.015) }
    #error.shake { animation: shake .4s ease }
    @keyframes shake { 10%,90% { transform: translateX(-2px) } 20%,80% { transform: translateX(3px) } 30%,50%,70% { transform: translateX(-5px) } 40%,60% { transform: translateX(5px) } }
    #success { transition: background-color .25s ease }
    #success > div { transition: transform .3s cubic-bezier(.16,1,.3,1), opacity .3s ease; transform: scale(.94) translateY(6px); opacity: 0 }
    #success.is-open > div { transform: scale(1) translateY(0); opacity: 1 }
  }
</style>

<div class="flex-1 px-4 pb-10 lg:px-8 lg:pb-16">
  <div class="mt-4 rounded-2xl border border-brand/40 bg-brand-soft p-5 lg:mt-8">
    <p class="text-[11px] font-bold uppercase tracking-widest text-brand-deep">Table services</p>
    <h1 class="mt-1 font-display text-[26px] font-extrabold lg:text-3xl">Choose your table</h1>
    <p class="mt-2 text-[14px] text-ink-soft">Select a table, then add your date, time, and party size. We'll confirm before you arrive.</p>
  </div>

  <?php if ($myReservations): ?>
    <div class="mt-5 rounded-2xl border border-line-strong bg-white p-4">
      <p class="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Your upcoming reservations</p>
      <ul class="mt-2 divide-y divide-line">
        <?php foreach ($myReservations as $reservation):
          $when = DateTime::createFromFormat('Y-m-d H:i:s', $reservation['reservation_at']); ?>
          <li class="flex items-center justify-between gap-3 py-2.5 text-[13px]">
            <div class="min-w-0">
              <p class="truncate font-bold text-ink">Table <?= (int)$reservation['table_number'] ?> &middot; <?= (int)$reservation['guest_count'] ?> guests</p>
              <p class="text-ink-mute"><?= $when ? escape($when->format('M j, Y g:i A')) : '' ?> &middot; Ref <?= escape($reservation['reservation_code']) ?></p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize <?= $statusStyles[$reservation['status']] ?? 'bg-line text-ink-soft' ?>"><?= escape($reservation['status']) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  <?php endif; ?>

  <form id="reservation-form" class="mt-6">
    <input id="table-id" name="table_id" type="hidden">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <?php foreach ($tables as $table): ?>
        <button type="button" class="table-card rounded-2xl border border-line-strong bg-white p-5 text-left shadow-card transition hover:border-brand-deep" data-id="<?= (int)$table['id'] ?>" data-capacity="<?= (int)$table['capacity'] ?>" aria-pressed="false">
          <div class="flex items-start justify-between">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-deep"><i class="fa-solid fa-chair" aria-hidden="true"></i></span>
            <span class="rounded-full bg-paper px-2 py-1 text-[10px] font-bold uppercase text-ink-mute"><?= escape($table['area']) ?></span>
          </div>
          <h2 class="mt-5 font-display text-2xl font-bold">Table <?= (int)$table['table_number'] ?></h2>
          <p class="mt-1 text-[13px] text-ink-soft"><i class="fa-solid fa-users mr-1" aria-hidden="true"></i><?= (int)$table['capacity'] ?> seats</p>
        </button>
      <?php endforeach; ?>
    </div>

    <section class="mt-6 rounded-2xl border border-line-strong bg-white p-5 shadow-card">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="text-[13px] font-bold text-ink">Party size
          <input required name="guest_count" type="number" min="1" max="30" placeholder="Number of guests"
            class="mt-2 w-full rounded-xl border border-line-strong p-3 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
        </label>
        <label class="text-[13px] font-bold text-ink">Date and time
          <input required name="reservation_at" type="datetime-local"
            class="mt-2 w-full rounded-xl border border-line-strong p-3 text-[15px] font-normal focus:border-brand-deep focus:outline-none">
        </label>
        <label class="text-[13px] font-bold text-ink sm:col-span-2">Notes <span class="font-normal text-ink-mute">(optional)</span>
          <textarea name="notes" maxlength="500" placeholder="Anything staff should know?"
            class="mt-2 min-h-24 w-full rounded-xl border border-line-strong p-3 text-[15px] font-normal focus:border-brand-deep focus:outline-none"></textarea>
        </label>
      </div>
      <p id="error" class="mt-4 hidden text-[13px] text-red-600"></p>
      <?php if ($customer): ?>
        <button class="mt-5 w-full rounded-xl bg-brand py-3 text-[15px] font-extrabold text-brand-ink">Confirm reservation <i class="fa-solid fa-check ml-1" aria-hidden="true"></i></button>
      <?php else: ?>
        <a href="login.php?return=reservation" class="mt-5 block w-full rounded-xl bg-brand py-3 text-center text-[15px] font-extrabold text-brand-ink">Sign in to confirm reservation <i class="fa-solid fa-arrow-right ml-1" aria-hidden="true"></i></a>
      <?php endif; ?>
    </section>
  </form>
</div>

<div id="success" class="fixed inset-0 z-50 hidden place-items-center bg-ink/40 p-4 backdrop-blur-sm">
  <div class="w-full max-w-sm rounded-3xl bg-white p-8 text-center">
    <i class="fa-solid fa-calendar-check text-4xl text-green-500" aria-hidden="true"></i>
    <h2 class="mt-3 font-display text-2xl font-extrabold">Reservation requested</h2>
    <p class="mt-3 text-[13px] text-ink-soft">Reference: <strong id="code" class="text-ink"></strong></p>
    <p class="mt-1 text-[13px] text-ink-soft">We'll confirm it shortly &mdash; check your account for status.</p>
    <a href="account.php" class="mt-6 inline-block w-full rounded-xl bg-ink px-5 py-3 font-extrabold text-brand">View my reservations</a>
  </div>
</div>

<script>
(function () {
  var signedIn = <?= $customer ? 'true' : 'false' ?>;
  var csrfToken = <?= json_encode(csrfToken()) ?>;
  var selected = null;

  function showError(message) {
    var err = document.getElementById('error');
    err.textContent = message;
    err.classList.remove('hidden');
    err.classList.remove('shake');
    void err.offsetWidth;
    err.classList.add('shake');
  }

  document.querySelectorAll('.table-card').forEach(function (button) {
    button.addEventListener('click', function () {
      selected = button;
      document.getElementById('table-id').value = button.dataset.id;
      document.querySelectorAll('.table-card').forEach(function (other) {
        other.className = 'table-card rounded-2xl border border-line-strong bg-white p-5 text-left shadow-card transition hover:border-brand-deep';
        other.setAttribute('aria-pressed', 'false');
      });
      button.className = 'table-card is-selected rounded-2xl border-2 border-brand-deep bg-brand-soft p-5 text-left shadow-card';
      button.setAttribute('aria-pressed', 'true');
    });
  });

  document.getElementById('reservation-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var err = document.getElementById('error');
    if (!selected) return showError('Please choose a table.');
    if (!signedIn) { location.href = 'login.php?return=reservation'; return; }
    err.classList.add('hidden');

    var button = event.target.querySelector('button[type=submit], button:not([type])');
    var originalHtml = button ? button.innerHTML : '';
    if (button) { button.disabled = true; button.classList.add('opacity-70'); button.innerHTML = 'Sending\u2026'; }

    try {
      var response = await fetch('../actions/customer_reservation.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, Object.fromEntries(new FormData(event.target)), { csrf_token: csrfToken }))
      });
      var result = await response.json();
      if (!result.success) throw new Error(result.error);
      document.getElementById('code').textContent = result.reservation_code;
      var success = document.getElementById('success');
      success.classList.remove('hidden');
      success.classList.add('grid');
      requestAnimationFrame(function () { success.classList.add('is-open'); });
    } catch (error) {
      showError(error.message || 'Could not request reservation.');
    } finally {
      if (button) { button.disabled = false; button.classList.remove('opacity-70'); button.innerHTML = originalHtml; }
    }
  });
})();
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
