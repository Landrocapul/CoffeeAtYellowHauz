<?php
require_once __DIR__ . '/includes/bootstrap.php';

$activeNav = 'menu';
$pageTitle = 'Order Online | ' . YH_STORE_NAME;
$customer = currentCustomer();
$tableNumber = max(0, (int)($_GET['table'] ?? 0));
$taxRate = (float)(getSetting('tax_rate') ?: 12);

$items = $pdo->query("SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url, mi.is_best_seller, c.name AS category_name FROM menu_items mi JOIN categories c ON c.id = mi.category_id WHERE mi.is_available = 1 AND c.status = 'active' ORDER BY c.sort_order, mi.sort_order, mi.name")->fetchAll();

function localPhotos(): array
{
    static $map = [
        'longganisa' => 'porklonganisa.webp',
        'pork adobo flakes' => 'porkadoboflakes.webp',
        'chicken sandwich' => 'chickensandwich.webp',
        'grilled garlic cheese' => 'grilledgarliccheese.webp',
        'tuna & garlic pasta' => 'tunagarlic.webp',
        'blueberry cheesecake cake' => 'blueberrycheesecake.webp',
        'cheesecake' => 'cheesecakeduo.webp',
        'tiramisu' => 'tiramisu.webp',
        'latte' => 'latte.webp',
        'iced latte' => 'icelatte.webp',
    ];
    return $map;
}
function itemPhoto(array $item): ?string
{
    $key = strtolower(trim((string)$item['name']));
    $local = localPhotos();
    if (isset($local[$key])) return '../images/' . $local[$key];
    $remote = trim((string)($item['image_url'] ?? ''));
    return $remote !== '' ? $remote : null;
}
function slugify(string $value): string
{
    return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($value)), '-');
}

$groups = [];
foreach ($items as $item) {
    $groups[$item['category_name']][] = $item;
}
$categories = array_keys($groups);
$itemCount = count($items);

include __DIR__ . '/includes/header.php';
?>
<style>
  .chip[aria-current="true"] { background: #1A1613; color: #FBBF24; border-color: #1A1613 }
  .jump[aria-current="true"] { background: #FEF3C7; color: #432C06 }
  .jump[aria-current="true"] .jump-count { color: #B45309 }
  @media (prefers-reduced-motion: no-preference) {
    .menu-item { opacity: 0; transform: translateY(10px); transition: opacity .5s ease-out, transform .5s ease-out }
    .menu-item.is-visible { opacity: 1; transform: translateY(0) }
    .thumb img { transition: transform .4s cubic-bezier(.16,1,.3,1) }
    .menu-item:hover .thumb img { transform: scale(1.08) }
    [data-cart-count].pop { animation: count-pop .32s cubic-bezier(.34,1.56,.64,1) }
    @keyframes count-pop { 0% { transform: scale(1) } 40% { transform: scale(1.35) } 100% { transform: scale(1) } }
    #cart-panel [data-close-cart] { opacity: 0; transition: opacity .3s ease }
    #cart-panel > section { transition: transform .35s cubic-bezier(.16,1,.3,1); transform: translateY(100%) }
    @media (min-width: 640px) { #cart-panel > section { transform: translateX(100%) } }
    #cart-panel.is-open [data-close-cart] { opacity: 1 }
    #cart-panel.is-open > section { transform: translateY(0) }
    @media (min-width: 640px) { #cart-panel.is-open > section { transform: translateX(0) } }
    #cart-bar { transition: transform .3s ease-out, opacity .3s ease-out }
    #cart-bar.hidden { display: flex !important; pointer-events: none; opacity: 0; transform: translateY(16px) }
    #success { transition: background-color .25s ease }
    #success > div { transition: transform .3s cubic-bezier(.16,1,.3,1), opacity .3s ease; transform: scale(.94) translateY(6px); opacity: 0 }
    #success.is-open > div { transform: scale(1) translateY(0); opacity: 1 }
    [data-add], [data-step], [data-cart-step], [data-open-cart], [data-close-cart], [data-submit], .chip, [data-cart-remove] {
      transition-property: transform, background-color, color, border-color, box-shadow, opacity;
      transition-duration: .18s;
    }
    [data-add]:active, [data-step]:active, [data-cart-step]:active, [data-submit]:active:not(:disabled) { transform: scale(.94) }
  }
  @media (prefers-reduced-motion: reduce) { #cart-bar.hidden { display: none !important } }
</style>

<a href="#menu" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-bold focus:text-brand">Skip to menu</a>

<header class="sticky top-[57px] z-20 border-b border-line bg-paper/95 backdrop-blur lg:top-0">
  <div class="flex items-center gap-3 px-4 pb-3 pt-4 lg:px-8 lg:pt-6">
    <div class="min-w-0 flex-1">
      <p class="font-display text-xl font-extrabold leading-none lg:text-[26px]">Order menu</p>
      <p class="mt-1.5 truncate text-[12px] text-ink-soft lg:mt-2 lg:text-[13px]">
        <?php if ($tableNumber): ?>
          Dine-in at <strong class="font-bold text-ink">Table <?= $tableNumber ?></strong> &middot; <?= $itemCount ?> items available
        <?php else: ?>
          <?= $itemCount ?> items &middot; choose dine-in or take away at checkout
        <?php endif; ?>
      </p>
    </div>
    <button type="button" data-open-cart class="flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-brand transition hover:bg-black">
      <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
      <span class="hidden sm:inline">Cart</span>
      <span class="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-[12px] font-extrabold text-brand-ink" data-cart-count aria-hidden="true">0</span>
      <span class="sr-only" data-cart-label aria-live="polite">Cart is empty</span>
    </button>
  </div>

  <div class="px-4 pb-3 lg:px-8">
    <div class="relative">
      <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-mute" aria-hidden="true"></i>
      <label for="search" class="sr-only">Search the menu</label>
      <input id="search" type="search" autocomplete="off" placeholder="Search coffee, pizza, cheesecake&hellip;"
        class="h-11 w-full rounded-xl border border-line-strong bg-white pl-11 pr-11 text-[15px] placeholder:text-ink-mute focus:border-brand-deep focus:outline-none">
      <button type="button" data-clear-search class="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-lg text-ink-mute hover:bg-paper hover:text-ink" aria-label="Clear search">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  </div>

  <div id="chip-rail" class="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 lg:px-8" aria-label="Menu categories">
    <?php foreach ($categories as $category): ?>
      <button type="button" class="chip shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-white px-3.5 py-2 text-[13px] font-bold text-ink-soft transition" data-chip="cat-<?= slugify($category) ?>"><?= escape($category) ?></button>
    <?php endforeach; ?>
  </div>
</header>

<div id="menu" class="flex-1 px-4 pb-40 lg:px-8 lg:pb-16">
  <?php foreach ($groups as $category => $categoryItems): ?>
    <section id="cat-<?= slugify($category) ?>" data-section class="scroll-mt-[220px] pt-7 lg:scroll-mt-[132px]">
      <div class="flex items-baseline justify-between gap-3 border-b-2 border-ink/10 pb-2">
        <h2 class="font-display text-[22px] font-extrabold tracking-tight lg:text-2xl"><?= escape($category) ?></h2>
        <span class="shrink-0 text-[11px] font-bold uppercase tracking-[.14em] text-ink-mute"><?= count($categoryItems) ?> items</span>
      </div>
      <ul class="lg:grid lg:grid-cols-2 lg:gap-x-10">
        <?php foreach ($categoryItems as $item):
          $photo = itemPhoto($item); ?>
          <li class="menu-item flex items-start gap-3.5 border-b border-line py-4"
            data-id="<?= (int)$item['id'] ?>"
            data-name="<?= escape($item['name']) ?>"
            data-price="<?= (float)$item['price'] ?>"
            data-search="<?= escape(strtolower($item['name'] . ' ' . $item['description'] . ' ' . $category)) ?>">
            <?php if ($photo): ?>
              <div class="thumb h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-brand-soft">
                <img src="<?= escape($photo) ?>" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover"
                  onerror="this.closest('.thumb').remove()">
              </div>
            <?php endif; ?>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 class="font-display text-[17px] font-bold leading-tight"><?= escape($item['name']) ?></h3>
                <?php if ($item['is_best_seller']): ?>
                  <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-ink">Popular</span>
                <?php endif; ?>
              </div>
              <p class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft"><?= escape($item['description']) ?></p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2">
              <span class="font-display text-[17px] font-bold tabular-nums">&#8369;<?= number_format($item['price'], 2) ?></span>
              <div data-qty-control>
                <button type="button" data-add class="h-11 rounded-xl bg-ink px-4 text-[13px] font-bold text-brand transition hover:bg-black">
                  Add<span class="sr-only"> <?= escape($item['name']) ?> to cart</span>
                </button>
                <div data-stepper class="hidden items-center rounded-xl bg-ink p-0.5">
                  <button type="button" data-step="-1" class="h-10 w-10 rounded-lg text-lg font-bold text-brand transition hover:bg-white/10" aria-label="Remove one <?= escape($item['name']) ?>">&minus;</button>
                  <span data-qty class="w-7 text-center text-sm font-extrabold tabular-nums text-white">0</span>
                  <button type="button" data-step="1" class="h-10 w-10 rounded-lg text-lg font-bold text-brand transition hover:bg-white/10" aria-label="Add one <?= escape($item['name']) ?>">+</button>
                </div>
              </div>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    </section>
  <?php endforeach; ?>

  <p id="no-results" class="hidden py-16 text-center text-[15px] text-ink-soft">
    <i class="fa-solid fa-mug-saucer mb-3 block text-2xl text-line-strong" aria-hidden="true"></i>
    Nothing matches &ldquo;<span data-query class="font-bold text-ink"></span>&rdquo;. Try a shorter word.
  </p>
</div>

<!-- Sticky order summary for phones -->
<div id="cart-bar" class="fixed inset-x-0 bottom-[64px] z-30 hidden p-3 lg:bottom-0 lg:hidden">
  <button type="button" data-open-cart class="flex w-full items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left shadow-panel">
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-extrabold text-brand-ink" data-cart-count>0</span>
    <span class="min-w-0 flex-1">
      <span class="block text-[13px] font-bold text-white">View order</span>
      <span class="block text-[12px] text-white/70"><span data-cart-count></span> item(s) &middot; &#8369;<span data-cart-subtotal>0.00</span></span>
    </span>
    <i class="fa-solid fa-arrow-right text-brand" aria-hidden="true"></i>
  </button>
</div>

<!-- Cart / checkout sheet -->
<div id="cart-panel" class="fixed inset-0 z-40 hidden">
  <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" data-close-cart></div>
  <section role="dialog" aria-modal="true" aria-labelledby="cart-heading"
    class="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-white shadow-panel sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none">
    <header class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 id="cart-heading" class="font-display text-2xl font-extrabold">Your order</h2>
        <p class="mt-0.5 text-[13px] text-ink-soft">Sent straight to the counter.</p>
      </div>
      <button type="button" data-close-cart class="h-11 w-11 rounded-xl bg-paper text-ink-soft transition hover:text-ink" aria-label="Close order panel">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </header>

    <div id="cart-items" class="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4"></div>

    <div class="border-t border-line px-5 py-4">
      <dl class="space-y-1.5 text-[13px]">
        <div class="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd class="tabular-nums">&#8369;<span data-cart-subtotal>0.00</span></dd></div>
        <div class="flex justify-between text-ink-soft"><dt>Tax (<?= rtrim(rtrim(number_format($taxRate, 2), '0'), '.') ?>%)</dt><dd class="tabular-nums">&#8369;<span data-cart-tax>0.00</span></dd></div>
        <div class="flex justify-between border-t border-line pt-2 font-display text-lg font-extrabold text-ink"><dt>Total</dt><dd class="tabular-nums">&#8369;<span data-cart-total>0.00</span></dd></div>
      </dl>

      <form id="checkout" class="mt-4 space-y-3">
        <?= csrfField() ?>
        <div>
          <label for="customer_name" class="text-[12px] font-bold text-ink-soft">Name for the order</label>
          <input required id="customer_name" name="customer_name" maxlength="100"
            value="<?= $customer ? escape($customer['full_name']) : '' ?>"
            class="mt-1 h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] focus:border-brand-deep focus:outline-none" placeholder="Your name">
        </div>
        <fieldset class="flex gap-2">
          <legend class="sr-only">Order type</legend>
          <label class="flex-1 cursor-pointer rounded-xl border border-line-strong bg-white p-2.5 text-center text-[13px] font-bold text-ink-soft has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-brand">
            <input type="radio" name="order_type" value="dine_in" class="sr-only" <?= $tableNumber ? 'checked' : '' ?>>Dine in
          </label>
          <label class="flex-1 cursor-pointer rounded-xl border border-line-strong bg-white p-2.5 text-center text-[13px] font-bold text-ink-soft has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-brand">
            <input type="radio" name="order_type" value="take_away" class="sr-only" <?= $tableNumber ? '' : 'checked' ?>>Take away
          </label>
        </fieldset>
        <div id="table-field">
          <label for="table_number" class="text-[12px] font-bold text-ink-soft">Table number</label>
          <input id="table_number" name="table_number" type="number" min="1" value="<?= $tableNumber ?: '' ?>"
            class="mt-1 h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] focus:border-brand-deep focus:outline-none" placeholder="e.g. 4">
        </div>
        <p id="checkout-error" class="hidden rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700"></p>
        <button type="submit" data-submit disabled class="h-12 w-full rounded-xl bg-ink text-sm font-extrabold text-brand transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
          <span data-submit-label>Send order</span>
        </button>
      </form>
    </div>
  </section>
</div>

<!-- Success modal -->
<div id="success" class="fixed inset-0 z-50 hidden place-items-center bg-ink/40 p-4 backdrop-blur-sm">
  <div class="w-full max-w-sm rounded-3xl bg-white p-8 text-center">
    <i class="fa-solid fa-circle-check text-4xl text-green-500" aria-hidden="true"></i>
    <h2 class="mt-3 font-display text-2xl font-extrabold">Order sent!</h2>
    <p class="mt-2 text-[13px] text-ink-soft">Order number <strong id="order-number" class="text-ink"></strong> &middot; Total &#8369;<span id="order-total"></span></p>
    <p class="mt-1 text-[13px] text-ink-soft">Staff will call your order when it's ready.</p>
    <a href="./" class="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-ink font-extrabold text-brand">Start a new order</a>
  </div>
</div>

<script>
(function () {
  'use strict';

  var CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;
  var TAX_RATE = <?= json_encode($taxRate) ?>;
  var STORAGE_KEY = 'yh_customer_cart';

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch (e) { cart = []; }
  cart = cart.filter(function (line) { return line && line.id && line.quantity > 0; });

  var rows = Array.prototype.slice.call(document.querySelectorAll('.menu-item'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  var cartPanel = document.getElementById('cart-panel');
  var cartBar = document.getElementById('cart-bar');
  var cartItems = document.getElementById('cart-items');
  var searchInput = document.getElementById('search');
  var clearSearch = document.querySelector('[data-clear-search]');
  var noResults = document.getElementById('no-results');
  var checkout = document.getElementById('checkout');
  var checkoutError = document.getElementById('checkout-error');
  var tableField = document.getElementById('table-field');
  var lastFocused = null;

  function money(value) { return value.toFixed(2); }
  function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) { node.textContent = value; });
  }
  function findLine(id) {
    return cart.find(function (line) { return line.id === id; });
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ }
    render();
  }
  function changeQty(id, delta, meta) {
    var line = findLine(id);
    if (!line && delta > 0 && meta) {
      cart.push({ id: id, name: meta.name, price: meta.price, quantity: 0 });
      line = cart[cart.length - 1];
    }
    if (!line) return;
    line.quantity = Math.min(20, line.quantity + delta);
    if (line.quantity < 1) cart = cart.filter(function (other) { return other.id !== id; });
    persist();
  }

  function totals() {
    var subtotal = cart.reduce(function (sum, line) { return sum + line.price * line.quantity; }, 0);
    var tax = Math.round(subtotal * (TAX_RATE / 100) * 100) / 100;
    var count = cart.reduce(function (sum, line) { return sum + line.quantity; }, 0);
    return { subtotal: subtotal, tax: tax, total: subtotal + tax, count: count };
  }

  function renderRows() {
    rows.forEach(function (row) {
      var line = findLine(Number(row.dataset.id));
      var stepper = row.querySelector('[data-stepper]');
      var addButton = row.querySelector('[data-add]');
      if (line) {
        row.querySelector('[data-qty]').textContent = line.quantity;
        stepper.classList.remove('hidden');
        stepper.classList.add('flex');
        addButton.classList.add('hidden');
      } else {
        stepper.classList.add('hidden');
        stepper.classList.remove('flex');
        addButton.classList.remove('hidden');
      }
    });
  }

  function renderCartList() {
    if (!cart.length) {
      cartItems.innerHTML = '<p class="py-14 text-center text-[14px] text-ink-mute"><i class="fa-regular fa-clipboard mb-3 block text-2xl text-line-strong"></i>Nothing here yet. Add something from the menu.</p>';
      return;
    }
    cartItems.textContent = '';
    cart.forEach(function (line) {
      var wrapper = document.createElement('div');
      wrapper.className = 'rounded-xl bg-paper p-3';
      var head = document.createElement('div');
      head.className = 'flex items-start justify-between gap-3';
      var name = document.createElement('strong');
      name.className = 'font-display text-[15px] font-bold leading-snug';
      name.textContent = line.name;
      var amount = document.createElement('span');
      amount.className = 'shrink-0 text-[14px] font-bold tabular-nums';
      amount.textContent = '\u20B1' + money(line.price * line.quantity);
      head.appendChild(name);
      head.appendChild(amount);

      var controls = document.createElement('div');
      controls.className = 'mt-2 flex items-center justify-between';
      var stepper = document.createElement('div');
      stepper.className = 'flex items-center rounded-xl border border-line-strong bg-white p-0.5';
      [['-1', '\u2212', 'Remove one '], ['1', '+', 'Add one ']].forEach(function (config, index) {
        if (index === 1) {
          var count = document.createElement('span');
          count.className = 'w-8 text-center text-sm font-extrabold tabular-nums';
          count.textContent = line.quantity;
          stepper.appendChild(count);
        }
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'h-10 w-10 rounded-lg text-lg font-bold text-ink transition hover:bg-paper';
        button.dataset.cartStep = config[0];
        button.dataset.cartId = line.id;
        button.textContent = config[1];
        button.setAttribute('aria-label', config[2] + line.name);
        stepper.appendChild(button);
      });
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'h-10 rounded-lg px-2 text-[13px] font-bold text-ink-mute transition hover:text-red-700';
      remove.dataset.cartRemove = line.id;
      remove.textContent = 'Remove';
      controls.appendChild(stepper);
      controls.appendChild(remove);

      wrapper.appendChild(head);
      wrapper.appendChild(controls);
      cartItems.appendChild(wrapper);
    });
  }

  var lastCount = null;
  function render() {
    var sums = totals();
    setAll('[data-cart-count]', String(sums.count));
    setAll('[data-cart-subtotal]', money(sums.subtotal));
    setAll('[data-cart-tax]', money(sums.tax));
    setAll('[data-cart-total]', money(sums.total));
    setAll('[data-cart-label]', sums.count ? sums.count + ' item(s) in your order' : 'Cart is empty');
    cartBar.classList.toggle('hidden', sums.count === 0);
    document.querySelector('[data-submit]').disabled = sums.count === 0;
    renderRows();
    renderCartList();

    if (lastCount !== null && sums.count !== lastCount) {
      document.querySelectorAll('[data-cart-count]').forEach(function (node) {
        node.classList.remove('pop');
        void node.offsetWidth;
        node.classList.add('pop');
      });
    }
    lastCount = sums.count;
  }

  document.addEventListener('click', function (event) {
    var row = event.target.closest('.menu-item');
    if (row) {
      var meta = { name: row.dataset.name, price: parseFloat(row.dataset.price) };
      var id = Number(row.dataset.id);
      if (event.target.closest('[data-add]')) return changeQty(id, 1, meta);
      var step = event.target.closest('[data-step]');
      if (step) return changeQty(id, Number(step.dataset.step), meta);
    }
    var cartStep = event.target.closest('[data-cart-step]');
    if (cartStep) return changeQty(Number(cartStep.dataset.cartId), Number(cartStep.dataset.cartStep));
    var cartRemove = event.target.closest('[data-cart-remove]');
    if (cartRemove) {
      cart = cart.filter(function (line) { return line.id !== Number(cartRemove.dataset.cartRemove); });
      return persist();
    }
    if (event.target.closest('[data-open-cart]')) return openCart();
    if (event.target.closest('[data-close-cart]')) return closeCart();
    var jump = event.target.closest('[data-jump], [data-chip]');
    if (jump) {
      event.preventDefault();
      var target = document.getElementById(jump.dataset.jump || jump.dataset.chip);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  function applySearch() {
    var query = searchInput.value.trim().toLowerCase();
    clearSearch.classList.toggle('hidden', query === '');
    rows.forEach(function (row) {
      row.hidden = query !== '' && row.dataset.search.indexOf(query) === -1;
    });
    var visible = 0;
    sections.forEach(function (section) {
      var matches = section.querySelectorAll('.menu-item:not([hidden])').length;
      section.hidden = matches === 0;
      visible += matches;
    });
    noResults.querySelector('[data-query]').textContent = searchInput.value.trim();
    noResults.classList.toggle('hidden', visible > 0);
  }
  searchInput.addEventListener('input', applySearch);
  clearSearch.addEventListener('click', function () {
    searchInput.value = '';
    applySearch();
    searchInput.focus();
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        document.querySelectorAll('[data-jump], [data-chip]').forEach(function (node) {
          var active = (node.dataset.jump || node.dataset.chip) === id;
          node.setAttribute('aria-current', active ? 'true' : 'false');
          if (active && node.classList.contains('chip')) {
            var rail = document.getElementById('chip-rail');
            rail.scrollTo({ left: node.offsetLeft - (rail.clientWidth - node.offsetWidth) / 2, behavior: 'smooth' });
          }
        });
      });
    }, { rootMargin: '-220px 0px -70% 0px' });
    sections.forEach(function (section) { observer.observe(section); });

    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -60px 0px' });
    rows.forEach(function (row) { revealObserver.observe(row); });
  } else {
    rows.forEach(function (row) { row.classList.add('is-visible'); });
  }

  function openCart() {
    lastFocused = document.activeElement;
    cartPanel.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { cartPanel.classList.add('is-open'); });
    document.getElementById('customer_name').focus();
  }
  function closeCart() {
    cartPanel.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { cartPanel.classList.add('hidden'); }, 300);
    if (lastFocused) lastFocused.focus();
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !cartPanel.classList.contains('hidden')) closeCart();
  });

  function syncTableField() {
    var dineIn = checkout.querySelector('input[name="order_type"]:checked').value === 'dine_in';
    tableField.classList.toggle('hidden', !dineIn);
  }
  checkout.querySelectorAll('input[name="order_type"]').forEach(function (input) {
    input.addEventListener('change', syncTableField);
  });
  syncTableField();

  function showError(message) {
    checkoutError.textContent = message;
    checkoutError.classList.remove('hidden');
  }

  checkout.addEventListener('submit', async function (event) {
    event.preventDefault();
    checkoutError.classList.add('hidden');
    var submit = checkout.querySelector('[data-submit]');
    var label = checkout.querySelector('[data-submit-label]');
    var payload = Object.fromEntries(new FormData(checkout));

    if (!payload.customer_name || !payload.customer_name.trim()) {
      document.getElementById('customer_name').focus();
      return showError('Please enter your name so staff can call your order.');
    }
    if (payload.order_type === 'dine_in' && !(Number(payload.table_number) > 0)) {
      document.getElementById('table_number').focus();
      return showError('Enter your table number, or switch to take away.');
    }

    submit.disabled = true;
    label.textContent = 'Sending\u2026';
    try {
      var response = await fetch('../actions/customer_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, payload, { cart: cart, csrf_token: CSRF_TOKEN }))
      });
      var result = await response.json();
      if (!result.success) throw new Error(result.error);
      cart = [];
      persist();
      closeCart();
      document.getElementById('order-number').textContent = result.order_number;
      document.getElementById('order-total').textContent = money(Number(result.total));
      var success = document.getElementById('success');
      success.classList.remove('hidden');
      success.classList.add('grid');
      requestAnimationFrame(function () { success.classList.add('is-open'); });
    } catch (error) {
      showError(error.message || 'Could not place the order. Please ask a staff member.');
    } finally {
      submit.disabled = false;
      label.textContent = 'Send order';
    }
  });

  render();
})();
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
