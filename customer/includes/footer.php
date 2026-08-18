  </main>
</div>
</div>

<!-- Mobile bottom nav -->
<nav aria-label="Guest sections" class="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-strong bg-white lg:hidden">
  <?php foreach (customerNavItems() as $item):
    $isActive = $item['match'] === $activeNav; ?>
    <a href="<?= escape($item['href']) ?>" <?= $isActive ? 'aria-current="page"' : '' ?>
      class="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition <?= $isActive ? 'text-brand-deep' : 'text-ink-mute' ?>">
      <i class="fa-solid <?= escape($item['icon']) ?> text-[17px]" aria-hidden="true"></i><?= escape($item['label']) ?>
    </a>
  <?php endforeach; ?>
</nav>
</body>
</html>
