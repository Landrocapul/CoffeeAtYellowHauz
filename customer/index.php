<?php
require_once __DIR__ . '/includes/bootstrap.php';

$activeNav = 'home';
$pageTitle = YH_STORE_NAME . ' | Coffee, Breakfast & Comfort Food';
$customer = currentCustomer();

$hours = (string)(getSetting('business_hours') ?: '07:00-22:00');
[$openTime, $closeTime] = array_pad(explode('-', $hours), 2, null);
function fmtTime(?string $value): string {
    if (!$value) return '';
    $time = DateTime::createFromFormat('H:i', trim($value));
    return $time ? $time->format('g:i A') : $value;
}
$phone = (string)(getSetting('shop_phone') ?: '');

$bestSellers = $pdo->query("SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url, c.name AS category_name
  FROM menu_items mi JOIN categories c ON c.id = mi.category_id
  WHERE mi.is_available = 1 AND c.status = 'active' AND mi.is_best_seller = 1
  ORDER BY c.sort_order, mi.sort_order LIMIT 6")->fetchAll();

$categoryCount = (int)$pdo->query("SELECT COUNT(DISTINCT c.id) FROM categories c
  JOIN menu_items mi ON mi.category_id = c.id
  WHERE mi.is_available = 1 AND c.status = 'active'")->fetchColumn();

function localPhotoFor(string $name): ?string {
    static $map = [
        'longganisa' => 'porklonganisa.webp', 'pork adobo flakes' => 'porkadoboflakes.webp',
        'chicken sandwich' => 'chickensandwich.webp', 'grilled garlic cheese' => 'grilledgarliccheese.webp',
        'tuna & garlic pasta' => 'tunagarlic.webp', 'blueberry cheesecake cake' => 'blueberrycheesecake.webp',
        'cheesecake' => 'cheesecakeduo.webp', 'tiramisu' => 'tiramisu.webp', 'latte' => 'latte.webp', 'iced latte' => 'icelatte.webp',
    ];
    $key = strtolower(trim($name));
    return isset($map[$key]) ? '../images/' . $map[$key] : null;
}
function bestSellerPhoto(array $item): ?string {
    $local = localPhotoFor($item['name']);
    if ($local) return $local;
    $remote = trim((string)($item['image_url'] ?? ''));
    return $remote !== '' ? $remote : null;
}

include __DIR__ . '/includes/header.php';
?>

<div class="flex-1 px-4 pb-10 lg:px-10 lg:pb-16">

  <!-- Hero -->
  <section class="mt-4 overflow-hidden rounded-3xl bg-ink lg:mt-8">
    <div class="grid gap-6 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-10 lg:px-14">
      <div>
        <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-brand">
          <i class="fa-solid fa-mug-hot" aria-hidden="true"></i>Since 2007
        </span>
        <h1 class="mt-4 font-display text-[34px] font-extrabold leading-[1.05] text-white sm:text-[44px]">
          Coffee, breakfast &amp; comfort food made for lingering.
        </h1>
        <p class="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
          <?= escape(YH_STORE_TAGLINE) ?> Order ahead for pickup or dine-in, or reserve a table for you and your crew.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <a href="menu.php" class="btn inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-extrabold text-brand-ink">
            <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>Order online
          </a>
          <a href="reservation.php" class="btn inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10">
            <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>Reserve a table
          </a>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:gap-4">
        <?php
        $heroShots = ['latte.webp', 'tiramisu.webp', 'porklonganisa.webp', 'cheesecakeduo.webp'];
        foreach ($heroShots as $i => $shot): ?>
          <div class="aspect-square overflow-hidden rounded-2xl <?= $i === 1 || $i === 2 ? 'mt-6' : '' ?>">
            <img src="../images/<?= escape($shot) ?>" alt="" loading="lazy" class="h-full w-full object-cover">
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- Store info strip -->
  <section class="mt-6 grid gap-3 sm:grid-cols-3">
    <div class="flex items-start gap-3 rounded-2xl border border-line-strong bg-white p-4">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep"><i class="fa-solid fa-clock" aria-hidden="true"></i></span>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Open today</p>
        <p class="mt-0.5 font-display text-[15px] font-bold text-ink">
          <?php if ($openTime && $closeTime): ?>
            <?= escape(fmtTime($openTime)) ?> &ndash; <?= escape(fmtTime($closeTime)) ?>
          <?php else: ?>See counter for hours<?php endif; ?>
        </p>
      </div>
    </div>
    <div class="flex items-start gap-3 rounded-2xl border border-line-strong bg-white p-4">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep"><i class="fa-solid fa-utensils" aria-hidden="true"></i></span>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-ink-mute">On the menu</p>
        <p class="mt-0.5 font-display text-[15px] font-bold text-ink"><?= $categoryCount ?> categories to explore</p>
      </div>
    </div>
    <div class="flex items-start gap-3 rounded-2xl border border-line-strong bg-white p-4">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep"><i class="fa-solid fa-phone" aria-hidden="true"></i></span>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Reach us</p>
        <p class="mt-0.5 font-display text-[15px] font-bold text-ink"><?= $phone !== '' ? escape($phone) : 'Ask staff for contact info' ?></p>
      </div>
    </div>
  </section>

  <!-- Best sellers -->
  <?php if ($bestSellers): ?>
  <section class="mt-10">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-display text-[22px] font-extrabold tracking-tight lg:text-2xl">Fan favorites</h2>
      <a href="menu.php" class="shrink-0 text-[13px] font-bold text-brand-deep">See full menu &rarr;</a>
    </div>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <?php foreach ($bestSellers as $item): $photo = bestSellerPhoto($item); ?>
        <a href="menu.php" class="group overflow-hidden rounded-2xl border border-line-strong bg-white transition hover:shadow-card">
          <?php if ($photo): ?>
            <div class="aspect-[4/3] overflow-hidden bg-brand-soft">
              <img src="<?= escape($photo) ?>" alt="" loading="lazy" class="h-full w-full object-cover transition group-hover:scale-105" onerror="this.closest('a').querySelector('.aspect-\\[4\\/3\\]').remove()">
            </div>
          <?php endif; ?>
          <div class="p-4">
            <div class="flex items-center gap-2">
              <h3 class="font-display text-[16px] font-bold leading-tight"><?= escape($item['name']) ?></h3>
              <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-ink">Popular</span>
            </div>
            <p class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft"><?= escape($item['description']) ?></p>
            <p class="mt-2 font-display text-[15px] font-bold">&#8369;<?= number_format($item['price'], 2) ?></p>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endif; ?>

  <!-- Feature tiles -->
  <section class="mt-10 grid gap-4 sm:grid-cols-3">
    <a href="menu.php" class="group rounded-2xl border border-line-strong bg-white p-5 transition hover:shadow-card">
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-ink text-brand"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i></span>
      <h3 class="mt-4 font-display text-[17px] font-bold">Order ahead</h3>
      <p class="mt-1.5 text-[13px] leading-relaxed text-ink-soft">Browse the full menu, build your order, and send it straight to the counter for dine-in or take away.</p>
      <span class="mt-3 inline-block text-[13px] font-bold text-brand-deep">Start an order &rarr;</span>
    </a>
    <a href="reservation.php" class="group rounded-2xl border border-line-strong bg-white p-5 transition hover:shadow-card">
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-ink text-brand"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i></span>
      <h3 class="mt-4 font-display text-[17px] font-bold">Reserve a table</h3>
      <p class="mt-1.5 text-[13px] leading-relaxed text-ink-soft">Pick a table, party size, and time. We'll hold it for you and confirm before you arrive.</p>
      <span class="mt-3 inline-block text-[13px] font-bold text-brand-deep">Reserve now &rarr;</span>
    </a>
    <a href="account.php" class="group rounded-2xl border border-line-strong bg-white p-5 transition hover:shadow-card">
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-ink text-brand"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
      <h3 class="mt-4 font-display text-[17px] font-bold">Your account</h3>
      <p class="mt-1.5 text-[13px] leading-relaxed text-ink-soft">Save your details, track your order and reservation history, and check in faster next visit.</p>
      <span class="mt-3 inline-block text-[13px] font-bold text-brand-deep"><?= $customer ? 'View account' : 'Sign in / create account' ?> &rarr;</span>
    </a>
  </section>

</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
