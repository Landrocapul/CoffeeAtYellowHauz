import React, { useState, useMemo } from 'react';
import { GalleryItem, LANDING_GALLERY_ITEMS } from '../../data/landingGallery';
import { 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  Maximize2, 
  X, 
  ShoppingBag, 
  Calendar, 
  Coffee, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Info,
  MapPin,
  Clock
} from 'lucide-react';

interface LandingGalleryProps {
  onNavigateMenu: () => void;
  onNavigateReservation: () => void;
}

const CATEGORIES = [
  'All',
  'Café Spaces & Ambiance',
  'Specialty Coffee',
  'Signature Drinks',
  'Savory Mains',
  'Handcrafted Treats',
  'Café Moments',
  'Community & Events',
] as const;

export const LandingGallery: React.FC<LandingGalleryProps> = ({
  onNavigateMenu,
  onNavigateReservation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalItem, setActiveModalItem] = useState<GalleryItem | null>(null);
  const [spotlightImageIndex, setSpotlightImageIndex] = useState<number>(0);

  const spaceHighlights = useMemo(() => {
    return LANDING_GALLERY_ITEMS.filter((i) => i.category === 'Café Spaces & Ambiance' || i.filename.startsWith('33_') || i.filename.startsWith('18_') || i.filename.startsWith('19_') || i.filename.startsWith('20_') || i.filename.startsWith('22_') || i.filename.startsWith('26_'));
  }, []);

  const activeSpotlight = spaceHighlights[spotlightImageIndex] || spaceHighlights[0] || LANDING_GALLERY_ITEMS[0];

  const filteredItems = useMemo(() => {
    return LANDING_GALLERY_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const currentIndex = activeModalItem
    ? LANDING_GALLERY_ITEMS.findIndex((i) => i.id === activeModalItem.id)
    : -1;

  const handlePrevItem = () => {
    if (currentIndex > 0) {
      setActiveModalItem(LANDING_GALLERY_ITEMS[currentIndex - 1]);
    } else {
      setActiveModalItem(LANDING_GALLERY_ITEMS[LANDING_GALLERY_ITEMS.length - 1]);
    }
  };

  const handleNextItem = () => {
    if (currentIndex < LANDING_GALLERY_ITEMS.length - 1) {
      setActiveModalItem(LANDING_GALLERY_ITEMS[currentIndex + 1]);
    } else {
      setActiveModalItem(LANDING_GALLERY_ITEMS[0]);
    }
  };

  return (
    <section id="cafe-gallery-section" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Café Visual Gallery • {LANDING_GALLERY_ITEMS.length} Photo Highlights
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">
            Spaces, Stories &amp; Handcrafted Moments
          </h2>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-stone-600 leading-relaxed">
            Take a visual tour through our garden patio, cozy timber interior, artisan espresso bar, signature drinks, and heritage café moments at V. Mapa &amp; Mabini St., Davao City.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            id="gallery-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces, drinks, food..."
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const count =
            cat === 'All'
              ? LANDING_GALLERY_ITEMS.length
              : LANDING_GALLERY_ITEMS.filter((i) => i.category === cat).length;
          const isSelected = selectedCategory === cat;

          return (
            <button
              key={cat}
              id={`filter-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Coffee className="mx-auto h-10 w-10 text-stone-400" />
          <h3 className="mt-3 text-base font-bold text-stone-900 font-display">No gallery items found</h3>
          <p className="mt-1 text-xs text-stone-500">
            Try adjusting your search query or choosing another category filter.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              id={`gallery-card-${item.id}`}
              onClick={() => setActiveModalItem(item)}
              className="group relative cursor-pointer flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-md hover:border-amber-300"
            >
              {/* Image Aspect Box */}
              <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-108"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/latte.webp';
                  }}
                />

                {/* Dark Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-2xs ${
                      item.badgeColor || 'bg-amber-500 text-stone-950'
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>

                {item.price && (
                  <div className="absolute top-3 right-3 rounded-lg bg-stone-950/80 backdrop-blur-xs px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-300 shadow-2xs">
                    {item.price}
                  </div>
                )}

                {/* Zoom Icon Hint */}
                <div className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-xl bg-stone-900/80 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-sm">
                  <Maximize2 className="h-4 w-4" />
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    {item.category}
                  </span>
                  <h3 className="mt-1 font-display text-sm sm:text-base font-bold text-stone-900 group-hover:text-amber-800 transition line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-500">
                  <span className="truncate font-medium text-stone-400">{item.subtitle}</span>
                  <span className="shrink-0 font-bold text-amber-700 group-hover:underline">
                    View Details →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Atmosphere / Customer Space Special Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 text-white p-6 sm:p-8 lg:p-10 shadow-lg border border-stone-800">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400 uppercase tracking-widest">
                <MapPin className="h-3.5 w-3.5" />
                Visit Our Space • Davao City
              </span>
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-mono text-stone-300">
                {spaceHighlights.length} Ambient Spaces
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl font-extrabold text-stone-50 leading-tight">
              &ldquo;Good things take time, sometime in a Cup!&rdquo;
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
              Step into Coffee at Yellow Hauz — featuring a lush garden patio, cozy airconditioned dining rooms, rustic timber woodwork, artisan espresso bar, and relaxing evening lighting.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-stone-300">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Open 7:00 AM - 10:00 PM Daily</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-300">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <span>V. Mapa &amp; Mabini St., Davao City</span>
              </div>
            </div>

            {/* Quick Interactive Thumbnail Strip */}
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
                Explore Café Corners ({spotlightImageIndex + 1}/{spaceHighlights.length}):
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {spaceHighlights.map((item, idx) => (
                  <button
                    key={item.id}
                    id={`spotlight-thumb-${item.id}`}
                    onClick={() => setSpotlightImageIndex(idx)}
                    className={`group relative shrink-0 overflow-hidden rounded-xl border transition-all ${
                      spotlightImageIndex === idx
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                        : 'border-stone-700 opacity-60 hover:opacity-100 hover:border-stone-500'
                    }`}
                    style={{ width: '56px', height: '42px' }}
                    title={item.title}
                  >
                    <img
                      src={item.src}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/latte.webp';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                id="gallery-banner-order-btn"
                onClick={onNavigateMenu}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition"
              >
                <ShoppingBag className="h-4 w-4" />
                Explore Online Menu
              </button>
              <button
                id="gallery-banner-reserve-btn"
                onClick={onNavigateReservation}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-800/80 px-5 py-2.5 text-xs sm:text-sm font-bold text-stone-100 hover:bg-stone-800 transition"
              >
                <Calendar className="h-4 w-4" />
                Reserve Table
              </button>
            </div>
          </div>

          {/* Featured Image Spotlight Card */}
          <div
            id="spotlight-active-card"
            onClick={() => setActiveModalItem(activeSpotlight)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-stone-800 shadow-2xl bg-stone-950"
          >
            <div className="relative aspect-4/3 overflow-hidden">
              <img
                src={activeSpotlight.src}
                alt={activeSpotlight.title}
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/latte.webp';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />

              {/* Prev / Next within Spotlight */}
              <button
                id="spotlight-prev-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpotlightImageIndex((prev) =>
                    prev > 0 ? prev - 1 : spaceHighlights.length - 1
                  );
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-stone-950/70 border border-stone-700 text-white hover:bg-amber-600 transition shadow-md"
                title="Previous Space"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id="spotlight-next-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpotlightImageIndex((prev) =>
                    prev < spaceHighlights.length - 1 ? prev + 1 : 0
                  );
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-stone-950/70 border border-stone-700 text-white hover:bg-amber-600 transition shadow-md"
                title="Next Space"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Top Category Badge */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-xs ${
                    activeSpotlight.badgeColor || 'bg-amber-500 text-stone-950'
                  }`}
                >
                  {activeSpotlight.tag}
                </span>
                {activeSpotlight.price && (
                  <span className="rounded-md bg-stone-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    {activeSpotlight.price}
                  </span>
                )}
              </div>

              {/* Bottom Details Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <p className="font-display text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition">
                  {activeSpotlight.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-300 line-clamp-1">
                  {activeSpotlight.subtitle}
                </p>
                <p className="mt-1 text-[11px] text-amber-400/90 font-medium">
                  Click image to expand in full view ↗
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Modal Viewer */}
      {activeModalItem && (
        <div
          id="gallery-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4 sm:p-6"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative flex flex-col md:flex-row max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-stone-900 border border-stone-800 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              id="lightbox-close-btn"
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-stone-950/70 border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 transition shadow-md"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Image View with Navigation Arrows */}
            <div className="relative flex-1 bg-stone-950 flex items-center justify-center min-h-[300px] md:min-h-[460px]">
              <img
                src={activeModalItem.src}
                alt={activeModalItem.title}
                className="max-h-[60vh] md:max-h-[80vh] w-full object-contain p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/latte.webp';
                }}
              />

              {/* Prev / Next Buttons */}
              <button
                id="lightbox-prev-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevItem();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-stone-900/80 border border-stone-700 text-white hover:bg-amber-600 transition shadow-md"
                title="Previous Highlight"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                id="lightbox-next-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextItem();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-stone-900/80 border border-stone-700 text-white hover:bg-amber-600 transition shadow-md"
                title="Next Highlight"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right Information Panel */}
            <div className="w-full md:w-84 lg:w-96 flex flex-col justify-between p-6 sm:p-8 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 overflow-y-auto">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      activeModalItem.badgeColor || 'bg-amber-500 text-stone-950'
                    }`}
                  >
                    {activeModalItem.tag}
                  </span>
                  <span className="text-xs text-stone-400">
                    {activeModalItem.category}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-xl sm:text-2xl font-bold text-stone-50">
                  {activeModalItem.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-amber-400">
                  {activeModalItem.subtitle}
                </p>

                {activeModalItem.price && (
                  <div className="mt-3 inline-block rounded-xl bg-stone-800/90 border border-stone-700 px-3 py-1 font-mono text-sm font-bold text-amber-300">
                    {activeModalItem.price}
                  </div>
                )}

                <div className="mt-4 border-t border-stone-800 pt-4">
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {activeModalItem.description}
                  </p>
                </div>

                <div className="mt-4 rounded-xl bg-stone-950/60 border border-stone-800 p-3 text-[11px] text-stone-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                    <Info className="h-3.5 w-3.5 text-amber-400" />
                    <span>Coffee at Yellow Hauz Story</span>
                  </div>
                  <p>
                    Handcrafted in our Davao City café. Freshly roasted beans, premium local ingredients, and artisanal kitchen recipes.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2 border-t border-stone-800 pt-4">
                <button
                  id="lightbox-order-btn"
                  onClick={() => {
                    setActiveModalItem(null);
                    onNavigateMenu();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 shadow-md hover:bg-amber-400 transition"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Order on Menu
                </button>
                <button
                  id="lightbox-reserve-btn"
                  onClick={() => {
                    setActiveModalItem(null);
                    onNavigateReservation();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-200 hover:bg-stone-700 transition"
                >
                  <Calendar className="h-4 w-4" />
                  Reserve a Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
