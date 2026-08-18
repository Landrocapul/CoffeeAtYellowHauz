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

// Handle CRUD operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrfToken();
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add_item') {
        $name = sanitize($_POST['name']);
        $category_id = (int)$_POST['category_id'];
        $description = sanitize($_POST['description']);
        $price = (float)$_POST['price'];
        $image_url = sanitize($_POST['image_url']);
        $temperature = sanitize($_POST['temperature']);
        $quantity = max(0, (int)($_POST['quantity'] ?? 0));
        $is_available = isset($_POST['is_available']) ? 1 : 0;
        
        try {
            $stmt = $pdo->prepare("INSERT INTO menu_items (category_id, name, description, price, image_url, temperature, is_available, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$category_id, $name, $description, $price, $image_url, $temperature, $is_available, $quantity]);
            redirect('items.php?category=' . $category_id);
        } catch (PDOException $e) {
            $error = 'Failed to add item: ' . $e->getMessage();
        }
    } elseif ($action === 'update_item') {
        $id = (int)$_POST['item_id'];
        $name = sanitize($_POST['name']);
        $category_id = (int)$_POST['category_id'];
        $description = sanitize($_POST['description']);
        $price = (float)$_POST['price'];
        $image_url = sanitize($_POST['image_url']);
        $temperature = sanitize($_POST['temperature']);
        $quantity = max(0, (int)($_POST['quantity'] ?? 0));
        $is_available = isset($_POST['is_available']) ? 1 : 0;
        
        try {
            $stmt = $pdo->prepare("UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, temperature = ?, quantity = ?, is_available = ? WHERE id = ?");
            $stmt->execute([$category_id, $name, $description, $price, $image_url, $temperature, $quantity, $is_available, $id]);
            redirect('items.php?category=' . $category_id);
        } catch (PDOException $e) {
            $error = 'Failed to update item: ' . $e->getMessage();
        }
    } elseif ($action === 'delete_item') {
        $id = (int)$_POST['item_id'];
        try {
            $stmt = $pdo->prepare("UPDATE menu_items SET is_available = 0 WHERE id = ?");
            $stmt->execute([$id]);
            redirect('items.php');
        } catch (PDOException $e) {
            $error = 'Failed to archive item: ' . $e->getMessage();
        }
    } elseif ($action === 'restock_item') {
        $id = (int)$_POST['item_id'];
        $quantity = max(0, (int)$_POST['quantity']);
        try {
            $stmt = $pdo->prepare("UPDATE menu_items SET quantity = ? WHERE id = ?");
            $stmt->execute([$quantity, $id]);
            redirect('items.php');
        } catch (PDOException $e) {
            $error = 'Failed to update stock: ' . $e->getMessage();
        }
    } elseif ($action === 'quick_add_stock') {
        $id = (int)$_POST['item_id'];
        $addQty = max(1, (int)($_POST['add_quantity'] ?? 0));
        try {
            $stmt = $pdo->prepare("UPDATE menu_items SET quantity = quantity + ? WHERE id = ?");
            $stmt->execute([$addQty, $id]);
            redirect('items.php');
        } catch (PDOException $e) {
            $error = 'Failed to add stock: ' . $e->getMessage();
        }
    } elseif ($action === 'add_category') {
        $name = sanitize($_POST['category_name']);
        $icon = sanitize($_POST['category_icon']);
        $sort_order = (int)$_POST['sort_order'];
        
        try {
            $stmt = $pdo->prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)");
            $stmt->execute([$name, $icon, $sort_order]);
            $success = 'Category added successfully!';
        } catch (PDOException $e) {
            $error = 'Failed to add category: ' . $e->getMessage();
        }
    }
}

// Get categories
$stmt = $pdo->query("SELECT * FROM categories WHERE status = 'active' ORDER BY sort_order ASC");
$categories = $stmt->fetchAll();

// Get selected category (default to first category or 'all')
$selectedCategoryId = isset($_GET['category']) ? (int)$_GET['category'] : 0;
$searchTerm = sanitize($_GET['search'] ?? '');
$stockFilter = $_GET['filter'] ?? 'all';
$allowedStockFilters = ['all', 'available', 'unavailable', 'best_seller', 'low_stock', 'out_of_stock'];
if (!in_array($stockFilter, $allowedStockFilters, true)) {
    $stockFilter = 'all';
}
$viewMode = $_GET['view'] ?? 'grid';
if (!in_array($viewMode, ['grid', 'list'], true)) {
    $viewMode = 'grid';
}
$lowStockThreshold = 5;

function itemsUrl(array $overrides = []) {
    $params = array_merge($_GET, $overrides);
    foreach ($params as $key => $value) {
        if ($value === '' || $value === null || ($key === 'category' && (int)$value === 0) || ($key === 'filter' && $value === 'all') || ($key === 'view' && $value === 'grid')) {
            unset($params[$key]);
        }
    }
    return 'items.php' . (empty($params) ? '' : '?' . http_build_query($params));
}

// Get menu items
$where = [];
$params = [];
if ($selectedCategoryId > 0) {
    $where[] = 'mi.category_id = ?';
    $params[] = $selectedCategoryId;
}
if ($searchTerm !== '') {
    $where[] = '(mi.name LIKE ? OR mi.description LIKE ? OR c.name LIKE ?)';
    $searchLike = '%' . $searchTerm . '%';
    array_push($params, $searchLike, $searchLike, $searchLike);
}
if ($stockFilter === 'available') {
    $where[] = 'mi.is_available = 1';
} elseif ($stockFilter === 'unavailable') {
    $where[] = 'mi.is_available = 0';
} elseif ($stockFilter === 'best_seller') {
    $where[] = 'mi.is_best_seller = 1';
} elseif ($stockFilter === 'low_stock') {
    $where[] = 'mi.quantity > 0 AND mi.quantity <= ?';
    $params[] = $lowStockThreshold;
} elseif ($stockFilter === 'out_of_stock') {
    $where[] = 'mi.quantity <= 0';
}
$whereSql = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);
$stmt = $pdo->prepare("SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id {$whereSql} ORDER BY mi.category_id, mi.sort_order ASC, mi.name ASC");
$stmt->execute($params);
$menuItems = $stmt->fetchAll();
$categoryName = 'All Dishes';
foreach ($categories as $category) {
    if ((int)$category['id'] === $selectedCategoryId) {
        $categoryName = $category['name'];
        break;
    }
}

// Get category item counts
$categoryCounts = [];
foreach ($categories as $cat) {
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?");
    $stmt->execute([$cat['id']]);
    $categoryCounts[$cat['id']] = $stmt->fetch()['count'];
}
$totalItems = array_sum($categoryCounts);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yellow Hauz POS - Manage Food Items</title>
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
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-checkbox { accent-color: #171717; cursor: pointer; }
    </style>
</head>
<body class="bg-[#EAE8E3] h-screen w-screen p-3 font-sans text-brand-black overflow-hidden">

    <div class="bg-vintage-paper w-full h-full rounded-2xl shadow-2xl flex overflow-hidden border border-gray-300 relative">
        
        <!-- LEFT SIDEBAR -->
        <aside id="sidebar" class="w-[80px] bg-white border-r border-vintage-border flex flex-col justify-between py-6 px-4 shrink-0 z-20 relative transition-all duration-300 ease-in-out">
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
                <nav id="navigation" class="space-y-1.5">
                    <a href="menu.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-mug-hot w-5 text-center"></i> <span class="nav-text">Menu</span>
                    </a>
                    <a href="table.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-utensils w-5 text-center"></i> <span class="nav-text">Table Services</span>
                    </a>
                    <a href="ticket.php" class="flex items-center gap-4 text-gray-500 hover:text-brand-black hover:bg-gray-100 px-4 py-3.5 rounded-2xl font-medium transition-all">
                        <i class="fa-solid fa-receipt w-5 text-center"></i> <span class="nav-text">Tickets</span>
                    </a>
                    
                    <a href="items.php" class="flex items-center gap-4 bg-brand-black text-brand px-4 py-3.5 rounded-2xl font-semibold shadow-md transition-all">
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

        <!-- MAIN CONTENT -->
        <main class="flex-1 flex flex-col relative bg-vintage-paper overflow-hidden">
            
            <!-- Top Header -->
            <header class="h-[88px] flex items-center justify-between px-8 shrink-0 border-b border-gray-200/80 bg-white/60 backdrop-blur-md z-20">
                <div class="flex items-center gap-4">
                    <button id="sidebarToggle" class="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-black mr-4">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <h2 class="text-2xl font-serif font-bold text-brand-black tracking-wide">MANAGE FOOD ITEMS</h2>
                </div>
                
                <div class="flex items-center justify-between gap-4 flex-1 max-w-2xl">
                    <!-- Search Bar -->
                    <form method="GET" action="items.php" class="flex-1 relative max-w-md">
                        <input type="hidden" name="category" value="<?php echo (int)$selectedCategoryId; ?>">
                        <input type="hidden" name="filter" value="<?php echo htmlspecialchars($stockFilter); ?>">
                        <input type="hidden" name="view" value="<?php echo htmlspecialchars($viewMode); ?>">
                        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" name="search" value="<?php echo htmlspecialchars($searchTerm); ?>" placeholder="Search dishes..." class="w-full bg-white h-11 rounded-full pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand shadow-sm border border-gray-200">
                        <?php if ($searchTerm !== ''): ?>
                        <a href="<?php echo itemsUrl(['search' => '']); ?>" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-black transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </a>
                        <?php endif; ?>
                    </form>
                    
                    <!-- Action Button -->
                    <button onclick="showAddItemModal()" class="bg-brand-black text-brand px-6 py-2.5 rounded-full font-bold text-sm shadow-[2px_2px_0px_0px_rgba(251,191,36,1)] hover:bg-gray-800 transition-all active:translate-y-0.5 active:translate-x-0.5 active:shadow-none uppercase tracking-wide border border-transparent">
                        <i class="fa-solid fa-plus mr-2"></i> Add New Dish
                    </button>
                </div>
            </header>

            <!-- Workspace: Categories + Grid -->
            <div class="flex-1 flex overflow-hidden p-6 gap-6">
                
                <!-- LEFT PANEL: CATEGORIES -->
                <div class="w-[280px] bg-white rounded-[24px] border border-gray-200 shadow-sm flex flex-col shrink-0 overflow-hidden relative">
                    <div class="p-5 border-b border-gray-100">
                        <h3 class="font-serif text-lg font-bold text-brand-black">Dishes Category</h3>
                    </div>
                    
                    <!-- Category List -->
                    <div class="flex-1 overflow-y-auto p-3 space-y-1.5 hide-scrollbar">
                        
                        <!-- All Dishes -->
                        <button onclick="window.location.href='<?php echo itemsUrl(['category' => 0]); ?>'" class="w-full flex items-center justify-between p-3 rounded-xl <?php echo $selectedCategoryId == 0 ? 'bg-brand-light border-2 border-brand shadow-sm' : 'hover:bg-gray-50 border border-transparent'; ?> transition-all group">
                            <div class="flex items-center gap-3 text-sm font-bold <?php echo $selectedCategoryId == 0 ? 'text-brand-black font-serif' : 'text-gray-600 group-hover:text-brand-black'; ?>">
                                <i class="fa-solid fa-layer-group w-5 <?php echo $selectedCategoryId == 0 ? 'text-brand-dark' : 'text-gray-400 group-hover:text-brand-black'; ?>"></i>
                                All Dishes
                            </div>
                            <span class="<?php echo $selectedCategoryId == 0 ? 'bg-brand-black text-brand' : 'bg-gray-100 text-gray-500'; ?> text-[10px] font-bold px-2 py-0.5 rounded-full"><?php echo $totalItems; ?></span>
                        </button>

                        <?php foreach ($categories as $category): ?>
                        <button onclick="window.location.href='<?php echo itemsUrl(['category' => (int)$category['id']]); ?>'" class="w-full flex items-center justify-between p-3 rounded-xl <?php echo $selectedCategoryId == $category['id'] ? 'bg-brand-light border-2 border-brand shadow-sm' : 'hover:bg-gray-50 border border-transparent'; ?> transition-all group">
                            <div class="flex items-center gap-3 text-sm font-bold <?php echo $selectedCategoryId == $category['id'] ? 'text-brand-black font-serif' : 'text-gray-600 group-hover:text-brand-black'; ?>">
                                <i class="<?php echo htmlspecialchars($category['icon']); ?> w-5 <?php echo $selectedCategoryId == $category['id'] ? 'text-brand-dark' : 'text-gray-400 group-hover:text-brand-black'; ?>"></i>
                                <?php echo htmlspecialchars($category['name']); ?>
                            </div>
                            <span class="<?php echo $selectedCategoryId == $category['id'] ? 'bg-brand-black text-brand' : 'bg-gray-100 text-gray-500'; ?> text-[10px] font-bold px-2 py-0.5 rounded-full"><?php echo $categoryCounts[$category['id']] ?? 0; ?></span>
                        </button>
                        <?php endforeach; ?>

                    </div>
                    
                    <!-- Add Category Button -->
                    <div class="p-4 border-t border-gray-100 bg-white">
                        <button onclick="showAddCategoryModal()" class="w-full py-3 rounded-xl text-brand-black border border-brand-black bg-white hover:bg-brand-black hover:text-brand transition-colors font-bold text-sm uppercase tracking-wide">
                            <i class="fa-solid fa-plus mr-1"></i> Add Category
                        </button>
                    </div>
                </div>

                <!-- RIGHT PANEL: ITEMS GRID -->
                <div class="flex-1 flex flex-col overflow-hidden">
                    
                    <!-- Grid Header Tools -->
                    <div class="flex items-center justify-between mb-4 px-2">
                        <h3 class="font-serif text-2xl font-bold text-brand-black"><?php echo htmlspecialchars($categoryName); ?> <span class="text-gray-400 text-lg font-sans ml-1">(<?php echo count($menuItems); ?>)</span></h3>
                        
                        <div class="flex items-center gap-3">
                            <!-- Manage Categories Button -->
                            <button onclick="showManageCategoriesModal()" class="bg-brand text-brand-black border border-brand-black shadow-sm px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-black hover:text-brand transition-colors flex items-center gap-2">
                                <i class="fa-solid fa-layer-group"></i> Manage Categories
                            </button>
                            <!-- View Toggles -->
                            <div class="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                <a href="<?php echo itemsUrl(['view' => 'grid']); ?>" class="w-8 h-8 rounded <?php echo $viewMode === 'grid' ? 'text-brand border border-brand bg-brand-light' : 'text-gray-400 hover:text-brand-black'; ?> flex items-center justify-center"><i class="fa-solid fa-border-all"></i></a>
                                <a href="<?php echo itemsUrl(['view' => 'list']); ?>" class="w-8 h-8 rounded <?php echo $viewMode === 'list' ? 'text-brand border border-brand bg-brand-light' : 'text-gray-400 hover:text-brand-black'; ?> flex items-center justify-center"><i class="fa-solid fa-list-ul"></i></a>
                            </div>
                            <!-- Filter -->
                            <select onchange="window.location.href=this.value" class="bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-lg text-sm font-bold text-gray-600 hover:text-brand-black transition-colors focus:outline-none focus:ring-2 focus:ring-brand">
                                <option value="<?php echo itemsUrl(['filter' => 'all']); ?>" <?php echo $stockFilter === 'all' ? 'selected' : ''; ?>>All Items</option>
                                <option value="<?php echo itemsUrl(['filter' => 'available']); ?>" <?php echo $stockFilter === 'available' ? 'selected' : ''; ?>>Available</option>
                                <option value="<?php echo itemsUrl(['filter' => 'unavailable']); ?>" <?php echo $stockFilter === 'unavailable' ? 'selected' : ''; ?>>Unavailable</option>
                                <option value="<?php echo itemsUrl(['filter' => 'best_seller']); ?>" <?php echo $stockFilter === 'best_seller' ? 'selected' : ''; ?>>Best Seller</option>
                                <option value="<?php echo itemsUrl(['filter' => 'low_stock']); ?>" <?php echo $stockFilter === 'low_stock' ? 'selected' : ''; ?>>Low Stock</option>
                                <option value="<?php echo itemsUrl(['filter' => 'out_of_stock']); ?>" <?php echo $stockFilter === 'out_of_stock' ? 'selected' : ''; ?>>Out of Stock</option>
                            </select>
                        </div>
                    </div>

                    <!-- Scrollable Grid Area -->
                    <div class="flex-1 overflow-y-auto pb-10 px-2 hide-scrollbar">
                        <?php if ($viewMode === 'list'): ?>
                        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50 border-b border-gray-200">
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dish</th>
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <?php foreach ($menuItems as $item): ?>
                                    <?php
                                        $quantity = (int)($item['quantity'] ?? 0);
                                        $isOut = $quantity <= 0;
                                        $isLow = $quantity > 0 && $quantity <= $lowStockThreshold;
                                    ?>
                                    <tr class="hover:bg-gray-50 transition-colors">
                                        <td class="py-3 px-4">
                                            <div class="flex items-center gap-3">
                                                <img src="<?php echo htmlspecialchars($item['image_url']); ?>" alt="<?php echo htmlspecialchars($item['name']); ?>" class="w-11 h-11 rounded-lg object-cover border border-gray-100">
                                                <div>
                                                    <p class="font-bold text-sm text-brand-black"><?php echo htmlspecialchars($item['name']); ?></p>
                                                    <p class="text-xs text-gray-500"><?php echo htmlspecialchars($item['temperature']); ?></p>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4 text-sm text-gray-600"><?php echo htmlspecialchars($item['category_name']); ?></td>
                                        <td class="py-3 px-4 text-sm font-bold text-brand-black"><?php echo formatCurrency($item['price']); ?></td>
                                        <td class="py-3 px-4">
                                            <div class="flex items-center gap-2">
                                                <button onclick="showRestockModal(<?php echo (int)$item['id']; ?>, <?php echo $quantity; ?>)" class="text-sm font-bold <?php echo $isOut ? 'text-red-600' : ($isLow ? 'text-yellow-700' : 'text-gray-700'); ?> hover:underline">
                                                    <?php echo $quantity; ?>
                                                </button>
                                                <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 1)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+1</button>
                                                <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 5)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+5</button>
                                                <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 10)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+10</button>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4">
                                            <div class="flex flex-wrap gap-1">
                                                <?php if (!(int)$item['is_available']): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Unavailable</span><?php endif; ?>
                                                <?php if ((int)$item['is_best_seller']): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-brand-light text-brand-dark">Best Seller</span><?php endif; ?>
                                                <?php if ($isOut): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600">Out</span><?php elseif ($isLow): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-yellow-50 text-yellow-700">Low</span><?php endif; ?>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4 text-right">
                                            <button onclick="showEditItemModal(<?php echo (int)$item['id']; ?>)" class="text-gray-400 hover:text-brand-black mr-3"><i class="fa-solid fa-pen text-sm"></i></button>
                                            <button onclick="showRestockModal(<?php echo (int)$item['id']; ?>, <?php echo $quantity; ?>)" class="text-gray-400 hover:text-brand-black mr-3"><i class="fa-solid fa-boxes-stacked text-sm"></i></button>
                                            <button onclick="confirmDelete(<?php echo (int)$item['id']; ?>)" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-box-archive text-sm"></i></button>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                    <?php if (empty($menuItems)): ?>
                                    <tr><td colspan="6" class="py-10 text-center text-gray-400 text-sm">No items found</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php else: ?>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            
                            <!-- Add New Dish Box -->
                            <div onclick="showAddItemModal()" class="bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[220px] cursor-pointer hover:border-brand-black hover:bg-brand-light transition-colors group">
                                <div class="w-10 h-10 bg-gray-200 group-hover:bg-brand-black text-gray-500 group-hover:text-brand rounded-full flex items-center justify-center mb-3 transition-colors">
                                    <i class="fa-solid fa-plus text-lg"></i>
                                </div>
                                <span class="font-serif font-bold text-gray-500 group-hover:text-brand-black text-center">Add New Dish to<br><?php echo $selectedCategoryId > 0 ? htmlspecialchars($categoryName) : 'Category'; ?></span>
                            </div>

                            <?php foreach ($menuItems as $item): ?>
                            <?php
                                $quantity = (int)($item['quantity'] ?? 0);
                                $isOut = $quantity <= 0;
                                $isLow = $quantity > 0 && $quantity <= $lowStockThreshold;
                            ?>
                            <!-- Item Card -->
                            <div class="bg-white border <?php echo $isOut ? 'border-red-200' : ($isLow ? 'border-yellow-200' : 'border-gray-200'); ?> rounded-2xl p-4 flex flex-col items-center justify-between min-h-[240px] shadow-sm hover:shadow-md transition-shadow relative">
                                <!-- Top tools -->
                                <div class="w-full flex justify-between items-start mb-2">
                                    <input type="checkbox" class="custom-checkbox w-4 h-4 rounded border-gray-300">
                                    <div class="flex gap-1">
                                        <button onclick="showEditItemModal(<?php echo (int)$item['id']; ?>)" class="text-gray-400 hover:text-brand-black"><i class="fa-solid fa-pen text-sm"></i></button>
                                        <button onclick="showRestockModal(<?php echo (int)$item['id']; ?>, <?php echo $quantity; ?>)" class="text-gray-400 hover:text-brand-black"><i class="fa-solid fa-boxes-stacked text-sm"></i></button>
                                        <button onclick="confirmDelete(<?php echo (int)$item['id']; ?>)" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-box-archive text-sm"></i></button>
                                    </div>
                                </div>
                                <div class="absolute top-10 left-4 right-4 flex flex-wrap gap-1 justify-center">
                                    <?php if (!(int)$item['is_available']): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Unavailable</span><?php endif; ?>
                                    <?php if ((int)$item['is_best_seller']): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-brand-light text-brand-dark">Best Seller</span><?php endif; ?>
                                    <?php if ($isOut): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-600">Out of Stock</span><?php elseif ($isLow): ?><span class="text-[10px] font-bold px-2 py-1 rounded bg-yellow-50 text-yellow-700">Low Stock</span><?php endif; ?>
                                </div>
                                <!-- Image -->
                                <div class="w-24 h-24 rounded-full border border-gray-100 overflow-hidden shadow-sm mb-4 mt-5">
                                    <img src="<?php echo htmlspecialchars($item['image_url']); ?>" alt="<?php echo htmlspecialchars($item['name']); ?>" class="w-full h-full object-cover">
                                </div>
                                <!-- Info -->
                                <div class="w-full flex flex-col">
                                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5"><?php echo htmlspecialchars($item['category_name']); ?></span>
                                    <h4 class="font-serif font-bold text-brand-black text-sm leading-tight line-clamp-1"><?php echo htmlspecialchars($item['name']); ?></h4>
                                    <span class="font-bold text-brand-black mt-1"><?php echo formatCurrency($item['price']); ?></span>
                                    <div class="mt-0.5 flex items-center gap-1.5">
                                        <button onclick="showRestockModal(<?php echo (int)$item['id']; ?>, <?php echo $quantity; ?>)" class="text-xs <?php echo $isOut ? 'text-red-600 font-bold' : ($isLow ? 'text-yellow-700 font-bold' : 'text-gray-500'); ?> text-left hover:underline">Qty: <?php echo $quantity; ?></button>
                                        <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 1)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+1</button>
                                        <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 5)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+5</button>
                                        <button type="button" onclick="quickAddStock(<?php echo (int)$item['id']; ?>, 10)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100">+10</button>
                                    </div>
                                </div>
                            </div>
                            <?php endforeach; ?>

                        </div>
                        <?php if (empty($menuItems)): ?>
                        <div class="text-center py-16 text-gray-400">
                            <i class="fa-solid fa-magnifying-glass text-4xl mb-3"></i>
                            <p class="text-sm font-medium">No items found</p>
                        </div>
                        <?php endif; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
        </main>

    </div>

    <!-- Add Item Modal -->
    <div id="addItemModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div class="mb-4 pb-3 border-b border-gray-100">
                <h3 class="text-xl font-serif font-bold text-brand-black">Add New Dish</h3>
                <p class="text-xs text-gray-500 mt-1">Create item details and set opening stock quickly.</p>
            </div>
            <form action="<?php echo htmlspecialchars(itemsUrl()); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="add_item">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                    <input type="text" name="name" required placeholder="e.g. Spanish Latte" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select name="category_id" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <?php foreach ($categories as $cat): ?>
                        <option value="<?php echo $cat['id']; ?>" <?php echo (int)$cat['id'] === $selectedCategoryId ? 'selected' : ''; ?>><?php echo htmlspecialchars($cat['name']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price</label>
                    <input type="number" step="0.01" name="price" required placeholder="0.00" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input type="number" name="quantity" min="0" value="0" id="addItemQuantity" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    <div class="grid grid-cols-4 gap-2 mt-2">
                        <button type="button" onclick="setAddQuantity(0)" class="bg-gray-100 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">0</button>
                        <button type="button" onclick="setAddQuantity(5)" class="bg-gray-100 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">+5</button>
                        <button type="button" onclick="setAddQuantity(10)" class="bg-gray-100 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">+10</button>
                        <button type="button" onclick="setAddQuantity(20)" class="bg-gray-100 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">+20</button>
                    </div>
                </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Image URL</label>
                    <input type="url" name="image_url" placeholder="https://... or /images/item.webp" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea name="description" rows="2" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"></textarea>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Temperature</label>
                    <select name="temperature" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="hot">Hot</option>
                        <option value="iced">Iced</option>
                        <option value="both">Both</option>
                        <option value="blended iced">Blended Iced</option>
                    </select>
                </div>
                
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="is_available" checked class="w-4 h-4 rounded border-gray-300">
                        <span class="text-sm font-medium">Available</span>
                    </label>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideAddItemModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Add Item
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Item Modal -->
    <div id="editItemModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-serif font-bold text-brand-black mb-4">Edit Dish</h3>
            <form action="<?php echo htmlspecialchars(itemsUrl()); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="update_item">
                <input type="hidden" name="item_id" id="editItemId">

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                    <input type="text" name="name" id="editItemName" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select name="category_id" id="editItemCategory" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <?php foreach ($categories as $cat): ?>
                        <option value="<?php echo $cat['id']; ?>"><?php echo htmlspecialchars($cat['name']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price</label>
                        <input type="number" step="0.01" name="price" id="editItemPrice" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                        <input type="number" name="quantity" min="0" id="editItemQuantity" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Image URL</label>
                    <input type="url" name="image_url" id="editItemImage" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea name="description" id="editItemDescription" rows="2" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Temperature</label>
                    <select name="temperature" id="editItemTemperature" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="hot">Hot</option>
                        <option value="iced">Iced</option>
                        <option value="both">Both</option>
                        <option value="blended iced">Blended Iced</option>
                    </select>
                </div>

                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="is_available" id="editItemAvailable" class="w-4 h-4 rounded border-gray-300">
                        <span class="text-sm font-medium">Available</span>
                    </label>
                </div>

                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideEditItemModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Restock Modal -->
    <div id="restockModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200">
            <h3 class="text-xl font-serif font-bold text-brand-black mb-1">Update Stock</h3>
            <p id="restockItemName" class="text-sm text-gray-500 mb-5">Set current quantity</p>
            <form action="<?php echo htmlspecialchars(itemsUrl()); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="restock_item">
                <input type="hidden" name="item_id" id="restockItemId">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Quantity</label>
                    <input type="number" name="quantity" min="0" id="restockQuantity" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <button type="button" onclick="adjustRestock(5)" class="bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-bold hover:bg-gray-200">+5</button>
                    <button type="button" onclick="adjustRestock(10)" class="bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-bold hover:bg-gray-200">+10</button>
                    <button type="button" onclick="adjustRestock(20)" class="bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-bold hover:bg-gray-200">+20</button>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="hideRestockModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Category Modal -->
    <div id="addCategoryModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <h3 class="text-xl font-serif font-bold text-brand-black mb-4">Add New Category</h3>
            <form action="<?php echo htmlspecialchars(itemsUrl()); ?>" method="POST" class="space-y-4">
                <?php echo csrfField(); ?>
                <input type="hidden" name="action" value="add_category">
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category Name</label>
                    <input type="text" name="category_name" required class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Icon (Font Awesome)</label>
                    <input type="text" name="category_icon" placeholder="fa-solid fa-mug-saucer" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sort Order</label>
                    <input type="number" name="sort_order" value="0" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button type="button" onclick="hideAddCategoryModal()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-brand-black text-brand py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Add Category
                    </button>
                </div>
            </form>
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

    <!-- Manage Categories Modal -->
    <div id="manageCategoriesModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-2xl font-serif font-bold text-brand-black">Manage Categories</h3>
                <button onclick="hideManageCategoriesModal()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Add New Category Form -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-bold text-brand-black mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-plus-circle text-brand"></i> Add New Category
                    </h4>
                    <form onsubmit="addCategory(event)">
                        <div class="space-y-3">
                            <div>
                                <label class="text-sm font-medium text-gray-700 mb-1 block">Category Name</label>
                                <input type="text" id="newCategoryName" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" placeholder="e.g., Coffee, Desserts">
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700 mb-1 block">Icon Class</label>
                                <select id="newCategoryIcon" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent">
                                    <option value="fa-solid fa-mug-saucer">☕ Coffee</option>
                                    <option value="fa-solid fa-glass-water">💧 Cold Drinks</option>
                                    <option value="fa-solid fa-blender">🥤 Blended</option>
                                    <option value="fa-solid fa-fire">🔥 Hot Drinks</option>
                                    <option value="fa-solid fa-leaf">🍃 Milk Tea</option>
                                    <option value="fa-solid fa-cookie">🍪 Food/Pastries</option>
                                    <option value="fa-solid fa-cake-slice">🍰 Desserts</option>
                                    <option value="fa-solid fa-burger">🍔 Meals</option>
                                </select>
                            </div>
                            <button type="submit" class="w-full bg-brand text-brand-black font-bold py-2 rounded-lg hover:bg-brand-black hover:text-brand transition-colors">
                                <i class="fa-solid fa-plus mr-1"></i> Add Category
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Existing Categories List -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-bold text-brand-black mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-list text-brand"></i> Existing Categories
                    </h4>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        <?php foreach ($categories as $category): ?>
                        <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between group">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-brand text-brand-black rounded-lg flex items-center justify-center text-sm">
                                    <i class="<?php echo htmlspecialchars($category['icon']); ?>"></i>
                                </div>
                                <div>
                                    <span class="font-medium text-brand-black"><?php echo htmlspecialchars($category['name']); ?></span>
                                    <p class="text-xs text-gray-500"><?php echo (int)($categoryCounts[$category['id']] ?? 0); ?> items</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick='editCategory(<?php echo (int)$category['id']; ?>, <?php echo json_encode($category['name']); ?>, <?php echo json_encode($category['icon']); ?>)' class="text-gray-400 hover:text-brand-black">
                                    <i class="fa-solid fa-pen text-sm"></i>
                                </button>
                                <button onclick="deleteCategory(<?php echo $category['id']; ?>)" class="text-gray-400 hover:text-red-500">
                                    <i class="fa-solid fa-trash text-sm"></i>
                                </button>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Modal -->
    <div id="notificationModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <div class="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" id="notificationIcon">
                <i class="fa-solid fa-check text-2xl" id="notificationIconClass"></i>
            </div>
            <h3 class="text-xl font-serif font-bold text-center mb-2" id="notificationTitle">Success</h3>
            <p class="text-gray-600 text-center mb-6" id="notificationMessage">Operation completed successfully</p>
            <button onclick="hideNotificationModal()" class="w-full bg-brand text-brand-black font-bold py-3 rounded-xl hover:bg-brand-black hover:text-brand transition-colors">
                OK
            </button>
        </div>
    </div>

    <script>
        const itemsData = <?php echo json_encode(array_map(function ($item) {
            return [
                'id' => (int)$item['id'],
                'category_id' => (int)$item['category_id'],
                'name' => $item['name'],
                'description' => $item['description'],
                'price' => (float)$item['price'],
                'image_url' => $item['image_url'],
                'temperature' => $item['temperature'],
                'quantity' => (int)($item['quantity'] ?? 0),
                'is_best_seller' => (int)$item['is_best_seller'],
                'is_available' => (int)$item['is_available'],
            ];
        }, $menuItems)); ?>;
        const currentItemsUrl = <?php echo json_encode(itemsUrl()); ?>;

        function selectCategory(categoryId) {
            window.location.href = 'items.php?category=' + categoryId;
        }

        function showAddItemModal() {
            document.getElementById('addItemModal').classList.remove('hidden');
        }

        function hideAddItemModal() {
            document.getElementById('addItemModal').classList.add('hidden');
        }

        function setAddQuantity(value) {
            const input = document.getElementById('addItemQuantity');
            if (!input) return;
            input.value = Math.max(0, Number(value) || 0);
        }

        function showEditItemModal(itemId) {
            const item = itemsData.find(item => item.id === Number(itemId));
            if (!item) return;

            document.getElementById('editItemId').value = item.id;
            document.getElementById('editItemName').value = item.name || '';
            document.getElementById('editItemCategory').value = item.category_id;
            document.getElementById('editItemPrice').value = item.price.toFixed(2);
            document.getElementById('editItemQuantity').value = item.quantity;
            document.getElementById('editItemImage').value = item.image_url || '';
            document.getElementById('editItemDescription').value = item.description || '';
            document.getElementById('editItemTemperature').value = item.temperature || 'both';
            document.getElementById('editItemAvailable').checked = item.is_available === 1;
            document.getElementById('editItemModal').classList.remove('hidden');
        }

        function hideEditItemModal() {
            document.getElementById('editItemModal').classList.add('hidden');
        }

        function showRestockModal(itemId, quantity) {
            const item = itemsData.find(item => item.id === Number(itemId));
            document.getElementById('restockItemId').value = itemId;
            document.getElementById('restockQuantity').value = Number(quantity) || 0;
            document.getElementById('restockItemName').textContent = item ? item.name : 'Set current quantity';
            document.getElementById('restockModal').classList.remove('hidden');
        }

        function hideRestockModal() {
            document.getElementById('restockModal').classList.add('hidden');
        }

        function adjustRestock(amount) {
            const input = document.getElementById('restockQuantity');
            input.value = Math.max(0, (Number(input.value) || 0) + amount);
        }

        function quickAddStock(itemId, addQty) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = currentItemsUrl;

            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'quick_add_stock';

            const itemIdInput = document.createElement('input');
            itemIdInput.type = 'hidden';
            itemIdInput.name = 'item_id';
            itemIdInput.value = itemId;

            const addQtyInput = document.createElement('input');
            addQtyInput.type = 'hidden';
            addQtyInput.name = 'add_quantity';
            addQtyInput.value = addQty;

            form.appendChild(actionInput);
            form.appendChild(itemIdInput);
            form.appendChild(addQtyInput);
            document.body.appendChild(form);
            form.submit();
        }

        function showAddCategoryModal() {
            document.getElementById('addCategoryModal').classList.remove('hidden');
        }

        function hideAddCategoryModal() {
            document.getElementById('addCategoryModal').classList.add('hidden');
        }

        function confirmDelete(itemId) {
            if (confirm('Archive this item? It will be hidden from the cashier menu but kept for history.')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = currentItemsUrl;
                
                const actionInput = document.createElement('input');
                actionInput.type = 'hidden';
                actionInput.name = 'action';
                actionInput.value = 'delete_item';
                
                const itemIdInput = document.createElement('input');
                itemIdInput.type = 'hidden';
                itemIdInput.name = 'item_id';
                itemIdInput.value = itemId;
                
                form.appendChild(actionInput);
                form.appendChild(itemIdInput);
                document.body.appendChild(form);
                form.submit();
            }
        }

        function showManageCategoriesModal() {
            const form = document.querySelector('#manageCategoriesModal form');
            form.removeAttribute('data-edit-id');
            form.removeAttribute('data-original-name');
            form.removeAttribute('data-original-icon');
            form.reset();
            form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Add Category';
            document.getElementById('manageCategoriesModal').classList.remove('hidden');
        }

        function hideManageCategoriesModal() {
            document.getElementById('manageCategoriesModal').classList.add('hidden');
        }

        function showNotificationModal(title, message, isSuccess = true) {
            const modal = document.getElementById('notificationModal');
            const icon = document.getElementById('notificationIcon');
            const iconClass = document.getElementById('notificationIconClass');
            const titleElement = document.getElementById('notificationTitle');
            const messageElement = document.getElementById('notificationMessage');

            titleElement.textContent = title;
            messageElement.textContent = message;

            if (isSuccess) {
                icon.className = 'flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 bg-green-100';
                iconClass.className = 'fa-solid fa-check text-2xl text-green-600';
            } else {
                icon.className = 'flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 bg-red-100';
                iconClass.className = 'fa-solid fa-times text-2xl text-red-600';
            }

            modal.classList.remove('hidden');
        }

        function hideNotificationModal() {
            document.getElementById('notificationModal').classList.add('hidden');
        }

        function editCategory(id, name, icon) {
            // Use the existing add category form for editing
            document.getElementById('newCategoryName').value = name;
            document.getElementById('newCategoryIcon').value = icon;
            
            // Change the form action to update instead of add
            const form = document.querySelector('#manageCategoriesModal form');
            form.setAttribute('data-edit-id', id);
            form.setAttribute('data-original-name', name);
            form.setAttribute('data-original-icon', icon);
            
            // Update the button text
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fa-solid fa-pen mr-1"></i> Update Category';
            
            document.getElementById('manageCategoriesModal').classList.remove('hidden');
        }

        function addCategory(event) {
            event.preventDefault();
            const form = event.target;
            const editId = form.getAttribute('data-edit-id');
            const originalName = form.getAttribute('data-original-name');
            const originalIcon = form.getAttribute('data-original-icon');
            
            const name = document.getElementById('newCategoryName').value;
            const icon = document.getElementById('newCategoryIcon').value;
            
            if (editId) {
                // Update existing category
                fetch('api.php?action=update_category', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                    },
                    body: JSON.stringify({
                        id: parseInt(editId),
                        name: name,
                        icon: icon
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotificationModal('Success', 'Category updated successfully!', true);
                        hideManageCategoriesModal();
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotificationModal('Error', data.error, false);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotificationModal('Error', 'An error occurred while updating the category', false);
                });
            } else {
                // Add new category
                fetch('api.php?action=add_category', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                    },
                    body: JSON.stringify({
                        name: name,
                        icon: icon
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotificationModal('Success', 'Category "' + name + '" added successfully!', true);
                        hideManageCategoriesModal();
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotificationModal('Error', data.error, false);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotificationModal('Error', 'An error occurred while adding the category', false);
                });
            }
        }

        function deleteCategory(id) {
            // Create a custom confirmation modal
            const confirmModal = document.createElement('div');
            confirmModal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
            confirmModal.innerHTML = `
                <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
                    <div class="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                        <i class="fa-solid fa-trash text-red-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-serif font-bold text-brand-black text-center mb-2">Delete Category</h3>
                    <p class="text-gray-600 text-center mb-6">Are you sure you want to delete this category? This action cannot be undone.</p>
                    <div class="flex gap-3">
                        <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button id="confirmDeleteBtn" class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmModal);
            
            document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
                fetch('api.php?action=delete_category', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': '<?php echo csrfToken(); ?>',
                    },
                    body: JSON.stringify({
                        id: id
                    })
                })
                .then(response => response.json())
                .then(data => {
                    confirmModal.remove();
                    if (data.success) {
                        showNotificationModal('Success', 'Category deleted successfully!', true);
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotificationModal('Error', data.error, false);
                    }
                })
                .catch(error => {
                    confirmModal.remove();
                    console.error('Error:', error);
                    showNotificationModal('Error', 'An error occurred while deleting the category', false);
                });
            });
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
