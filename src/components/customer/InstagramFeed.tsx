import React, { useState, useEffect } from 'react';
import { INSTAGRAM_POSTS, InstagramPost } from '../../data/instagramPosts';
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  ExternalLink, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Bookmark, 
  MapPin, 
  Sparkles,
  Check
} from 'lucide-react';

interface InstagramFeedProps {
  onNavigateMenu?: () => void;
  onNavigateReservation?: () => void;
}

export const InstagramFeed: React.FC<InstagramFeedProps> = ({
  onNavigateMenu,
  onNavigateReservation,
}) => {
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'brews' | 'moments'>('all');

  // Filter posts if needed
  const filteredPosts = INSTAGRAM_POSTS.filter(post => {
    if (filter === 'brews') {
      return post.id % 2 === 1 || [1, 5, 6, 8, 9, 10, 11, 13, 14, 15].includes(post.id);
    }
    if (filter === 'moments') {
      return [2, 3, 4, 7, 12, 16].includes(post.id);
    }
    return true;
  });

  // Handle like toggle
  const toggleLike = (postId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Handle keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPost) return;
      if (e.key === 'Escape') {
        setSelectedPost(null);
      } else if (e.key === 'ArrowRight') {
        navigateModal(1);
      } else if (e.key === 'ArrowLeft') {
        navigateModal(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPost]);

  const navigateModal = (direction: number) => {
    if (!selectedPost) return;
    const currentIndex = INSTAGRAM_POSTS.findIndex(p => p.id === selectedPost.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + direction + INSTAGRAM_POSTS.length) % INSTAGRAM_POSTS.length;
    setSelectedPost(INSTAGRAM_POSTS[nextIndex]);
  };

  const handleShare = (post: InstagramPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText?.(window.location.href);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-amber-300 text-xs font-bold shadow-xs">
              <Camera className="h-3.5 w-3.5 text-amber-400" />
              <span>@coffeeatyellowhauz</span>
            </span>
            <span className="text-xs font-bold text-stone-500">• Official Shop Posts</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-baskerville">
            Instagram Feed &amp; Daily Stories
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 max-w-xl">
            Live snippets from our coffee bar, latte art experiments, cozy corners, and community moments in Davao City.
          </p>
        </div>

        {/* Action button & Filter tabs */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-stone-200/70 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All 16 Posts
            </button>
            <button
              onClick={() => setFilter('brews')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'brews'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Artisan Brews
            </button>
            <button
              onClick={() => setFilter('moments')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'moments'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Café Moments
            </button>
          </div>

          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-stone-950 shadow-xs transition active:scale-95"
          >
            <Camera className="h-4 w-4" />
            <span>Follow on Instagram</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* 16-Post Mosaic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[190px] sm:auto-rows-[220px] lg:auto-rows-[240px] gap-3 sm:gap-4 grid-flow-dense">
        {filteredPosts.map((post) => {
          const isLiked = likedPosts[post.id];
          const totalLikes = post.likes + (isLiked ? 1 : 0);

          // Dynamic Mosaic Bento Spans for 16 posts
          let spanClasses = 'col-span-1 row-span-1';
          let isHero = false;
          let isTall = false;
          let isWide = false;

          if (post.id === 1) {
            // Hero Latte Art post (2x2)
            spanClasses = 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2';
            isHero = true;
          } else if (post.id === 4) {
            // Cozy Corner Tall (1x2)
            spanClasses = 'col-span-1 row-span-2 sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2';
            isTall = true;
          } else if (post.id === 8) {
            // Cold brew Wide (2x1)
            spanClasses = 'col-span-2 row-span-1 sm:col-span-2 sm:row-span-1 lg:col-span-2 lg:row-span-1';
            isWide = true;
          } else if (post.id === 13) {
            // Specialty Drink Tall (1x2)
            spanClasses = 'col-span-1 row-span-2 sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2';
            isTall = true;
          } else if (post.id === 16) {
            // Yellow Hauz Family Passion Hero (2x2)
            spanClasses = 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2';
            isHero = true;
          }

          return (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-stone-200 border border-stone-300/80 shadow-xs cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-amber-400 ${spanClasses}`}
            >
              {/* Image */}
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = post.thumbnail;
                }}
              />

              {/* Gradient Scrim at bottom for always-readable preview on larger cards */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent opacity-60 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none" />

              {/* Persistent Bottom Label for Large/Hero/Tall cards */}
              {(isHero || isTall || isWide) && (
                <div className="absolute bottom-3 left-3 right-3 z-10 text-white transition-opacity duration-200 group-hover:opacity-0 pointer-events-none">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="rounded-full bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 shadow-xs">
                      {isHero ? 'Featured Post' : isTall ? 'Cozy Corner' : 'Artisan Craft'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-50 drop-shadow-xs line-clamp-1">
                    {post.title}
                  </h3>
                </div>
              )}

              {/* Instagram top badge */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-stone-950/60 backdrop-blur-xs text-white transition group-hover:bg-amber-500 group-hover:text-stone-950 shadow-xs">
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </div>

              {/* Number indicator */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                <span className="rounded-full bg-stone-950/70 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-amber-300 shadow-xs">
                  #{post.id}
                </span>
              </div>

              {/* Hover Dark Overlay with Stats & Caption */}
              <div className="absolute inset-0 bg-stone-950/80 opacity-0 backdrop-blur-[3px] transition-opacity duration-200 group-hover:opacity-100 flex flex-col justify-between p-4 sm:p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300">
                    {post.timeAgo}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-stone-200">
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-[10px] sm:text-xs truncate max-w-[120px]">Davao City</span>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5 my-auto">
                  <p className="text-xs sm:text-sm font-extrabold text-amber-300 line-clamp-1">{post.title}</p>
                  <p className={`text-[11px] sm:text-xs text-stone-200 leading-snug ${isHero ? 'line-clamp-4' : isTall ? 'line-clamp-4' : 'line-clamp-2'}`}>
                    {post.caption}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-stone-700/80 pt-2.5 text-xs font-bold">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-white">
                      <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-stone-300'}`} />
                      <span className="text-[11px] sm:text-xs">{totalLikes}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-stone-300">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="text-[11px] sm:text-xs">{post.comments}</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-amber-400 underline font-bold group-hover:text-amber-300">
                    View Post ↗
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instagram Post Detail Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 z-20 grid h-8 w-8 place-items-center rounded-full bg-stone-900/80 text-white hover:bg-stone-900 transition shadow-md"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left Column: Image with Nav Buttons */}
            <div className="relative flex-1 bg-stone-950 flex items-center justify-center min-h-[300px] md:min-h-[500px]">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="max-h-[70vh] w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = selectedPost.thumbnail;
                }}
              />

              {/* Prev / Next controls */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateModal(-1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900 hover:scale-110 transition shadow-lg"
                title="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateModal(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900 hover:scale-110 transition shadow-lg"
                title="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Image index counter badge */}
              <div className="absolute bottom-4 left-4 z-10">
                <span className="rounded-full bg-stone-950/80 backdrop-blur-xs px-3 py-1 text-xs font-bold text-amber-300">
                  Post {selectedPost.id} of {INSTAGRAM_POSTS.length}
                </span>
              </div>
            </div>

            {/* Right Column: Instagram Post Info */}
            <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col justify-between p-6 bg-white overflow-y-auto">
              <div>
                {/* Profile Header */}
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-500 text-stone-950 font-black text-xs shadow-xs border-2 border-amber-300">
                      YH
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-stone-900">coffeeatyellowhauz</span>
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-stone-950 text-[9px] font-black">
                          ✓
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-amber-600" />
                        {selectedPost.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Caption & Post Body */}
                <div className="py-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] shrink-0 mt-0.5">
                      YH
                    </div>
                    <div className="text-xs leading-relaxed text-stone-800">
                      <span className="font-extrabold mr-1.5 text-stone-900">coffeeatyellowhauz</span>
                      {selectedPost.caption}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-9">
                    {selectedPost.tags.map((tag, idx) => (
                      <span key={idx} className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md hover:underline cursor-pointer">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Simulated comments */}
                  <div className="pt-3 border-t border-stone-100 pl-9 space-y-2">
                    <div className="text-xs text-stone-700">
                      <span className="font-bold mr-1.5 text-stone-900">davaocoffeelover</span>
                      The best coffee spot in town! Always love the atmosphere here ☕💛
                    </div>
                    <div className="text-xs text-stone-700">
                      <span className="font-bold mr-1.5 text-stone-900">baristalife_ph</span>
                      That crema &amp; latte art looks pristine! 🔥
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction Bar & Quick Actions */}
              <div className="border-t border-stone-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleLike(selectedPost.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200 transition active:scale-90"
                    >
                      <Heart 
                        className={`h-5 w-5 transition ${
                          likedPosts[selectedPost.id] 
                            ? 'fill-red-500 text-red-500 scale-110' 
                            : 'text-stone-700'
                        }`} 
                      />
                    </button>
                    <button 
                      onClick={() => handleShare(selectedPost)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200 transition text-stone-700"
                      title="Share link"
                    >
                      {copiedId === selectedPost.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </button>
                    <button 
                      className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 hover:bg-stone-200 transition text-stone-700"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    {selectedPost.timeAgo}
                  </span>
                </div>

                <div className="text-xs font-bold text-stone-900">
                  {selectedPost.likes + (likedPosts[selectedPost.id] ? 1 : 0)} likes
                </div>

                {/* Quick actions for ordering / visiting */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onNavigateMenu && (
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        onNavigateMenu();
                      }}
                      className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-black text-stone-950 shadow-xs transition text-center"
                    >
                      Order Coffee
                    </button>
                  )}
                  {onNavigateReservation && (
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        onNavigateReservation();
                      }}
                      className="w-full rounded-xl bg-stone-900 hover:bg-stone-800 py-2.5 text-xs font-bold text-amber-300 transition text-center"
                    >
                      Reserve Spot
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
