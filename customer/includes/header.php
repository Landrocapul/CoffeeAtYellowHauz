<?php
/**
 * Shared chrome for every customer page.
 * Expects (all optional except $activeNav): $pageTitle, $activeNav, $pageDescription
 */
$pageTitle = $pageTitle ?? YH_STORE_NAME;
$activeNav = $activeNav ?? 'home';
$customer = currentCustomer();
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#F7F5F0">
<title><?= escape($pageTitle) ?></title>
<link rel="icon" href="../images/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;600;700;800&family=Nunito+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        shell: '#E7E3DA',
        paper: '#F7F5F0',
        line: { DEFAULT: '#E4DED2', strong: '#D3C9B8' },
        ink: { DEFAULT: '#1A1613', soft: '#544B42', mute: '#857A6D' },
        brand: { DEFAULT: '#FBBF24', soft: '#FEF3C7', deep: '#B45309', ink: '#432C06' }
      },
      fontFamily: {
        display: ['Alegreya', 'Georgia', 'serif'],
        body: ['"Nunito Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,22,19,.05)',
        shell: '0 30px 70px -40px rgba(26,22,19,.55)',
        panel: '0 -10px 40px -12px rgba(26,22,19,.28)'
      }
    }
  }
};
</script>
<style>
  ::-webkit-scrollbar { width: 8px; height: 8px }
  ::-webkit-scrollbar-thumb { background: #D3C9B8; border-radius: 10px }
  .no-scrollbar { scrollbar-width: none }
  .no-scrollbar::-webkit-scrollbar { display: none }
  :focus-visible { outline: 2px solid #B45309; outline-offset: 2px }
  @media (prefers-reduced-motion: no-preference) {
    body { animation: page-in .35s ease-out both }
    @keyframes page-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
    button, a.btn { transition: transform .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease }
    button:active:not(:disabled), a.btn:active { transform: scale(.97) }
  }
</style>
</head>
<body class="min-h-screen bg-shell font-body text-ink antialiased">
<div class="mx-auto w-full max-w-[1440px] lg:p-4">
<div class="flex w-full overflow-hidden bg-paper lg:min-h-[calc(100vh-32px)] lg:rounded-[28px] lg:border lg:border-line-strong lg:shadow-shell">

  <!-- Desktop rail -->
  <aside class="hidden w-[240px] shrink-0 flex-col border-r border-line bg-white lg:flex">
    <a href="./" class="block px-6 pb-5 pt-7">
      <span class="block font-display text-sm italic text-ink-mute">Coffee at</span>
      <h1 class="font-display text-[24px] font-extrabold uppercase leading-none tracking-tight">Yellow Hauz</h1>
      <div class="mt-2.5 flex items-center gap-2">
        <span class="h-px w-5 bg-brand"></span>
        <span class="text-[10px] font-bold tracking-[.22em] text-ink-mute">SINCE 2007</span>
      </div>
    </a>
    <nav aria-label="Guest sections" class="space-y-1 px-3">
      <?php foreach (customerNavItems() as $item):
        $isActive = $item['match'] === $activeNav; ?>
        <a href="<?= escape($item['href']) ?>" <?= $isActive ? 'aria-current="page"' : '' ?>
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition <?= $isActive ? 'bg-ink text-brand' : 'text-ink-soft hover:bg-paper hover:text-ink' ?>">
          <i class="fa-solid <?= escape($item['icon']) ?> w-4 text-center" aria-hidden="true"></i><?= escape($item['label']) ?>
        </a>
      <?php endforeach; ?>
    </nav>
    <div class="mt-auto border-t border-line px-6 py-4">
      <?php if ($customer): ?>
        <p class="truncate text-[13px] font-bold text-ink"><?= escape($customer['full_name']) ?></p>
        <p class="truncate text-[12px] text-ink-mute"><?= escape($customer['email']) ?></p>
        <a href="../actions/customer_logout.php" class="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-mute transition hover:text-ink">
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>Sign out
        </a>
      <?php else: ?>
        <a href="login.php" class="flex items-center gap-2 text-[13px] font-bold text-brand-deep transition hover:text-ink">
          <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>Sign in
        </a>
      <?php endif; ?>
      <a href="../" class="mt-3 flex items-center gap-2 text-[12px] font-semibold text-ink-mute transition hover:text-ink">
        <i class="fa-solid fa-user-lock" aria-hidden="true"></i>Staff login
      </a>
    </div>
  </aside>

  <main class="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
    <header class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3.5 backdrop-blur lg:hidden">
      <a href="./" class="flex items-center gap-2">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-ink text-brand"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span>
        <span class="font-display text-lg font-extrabold uppercase leading-none">Yellow Hauz</span>
      </a>
      <?php if ($customer): ?>
        <a href="account.php" class="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-3 text-[13px] font-bold text-ink-soft">
          <i class="fa-solid fa-user" aria-hidden="true"></i><?= escape(explode(' ', $customer['full_name'])[0]) ?>
        </a>
      <?php else: ?>
        <a href="login.php" class="flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-[13px] font-bold text-brand">
          <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>Sign in
        </a>
      <?php endif; ?>
    </header>
