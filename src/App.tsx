import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  Clapperboard,
  Tv,
  X,
  Send,
  Bookmark,
  BookmarkCheck,
  Calendar,
  User,
  Clock,
  Heart,
  Key,
  Compass,
  HelpCircle,
  CheckCircle,
  Sliders,
  Shuffle,
  Volume2,
  Play,
  Flame,
  Star,
  Film,
  Check,
  ArrowRight,
  Plus,
  AlertCircle
} from "lucide-react";

// Types matching the backend specification
interface CastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

interface Movie {
  title: string;
  year: number;
  matchReason: string;
  pacing: "slow" | "moderate" | "fast";
  genre: string;
  director?: string;
  whyYouWillLikeIt: string;
  rating?: string;
  durationMinutes?: number;
  tmdbId: number | null;
  posterPath: string;
  backdropPath: string;
  overview: string;
  voteAverage: number;
  genresOfMovie: string[];
  credits: CastMember[];
  trailerUrl: string | null;
}

interface ChatMessage {
  sender: "user" | "bub";
  text: string;
  timestamp: Date;
}

export default function App() {
  // Recommendation States
  const [prompt, setPrompt] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedEra, setSelectedEra] = useState<string>("any");
  const [selectedPacing, setSelectedPacing] = useState<string>("any");
  const [antiRecommendation, setAntiRecommendation] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Settings & Custom Keys
  const [customTmdbKey, setCustomTmdbKey] = useState(() => {
    return localStorage.getItem("moviebub_tmdb_key") || "";
  });
  const [showSettings, setShowSettings] = useState(false);

  // Focus Movie Modal State
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Conversion Funnels / Watchlist Stored in Local Storage
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    const saved = localStorage.getItem("moviebub_watchlist");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [isSignedUp, setIsSignedUp] = useState(false);

  // UI Active Navigation Section, Default is "discover"
  const [currentTab, setCurrentTab] = useState<"discover" | "watchlist" | "about">("discover");

  // Visual Baseline setup tracker for Progressive Profiling (3-Step setup)
  const [profilingStep, setProfilingStep] = useState<number>(1);
  const [showProfilingWizard, setShowProfilingWizard] = useState(false);

  // Suggestions for prompt box
  const promptSuggestions = [
    { text: "Mind-bending sci-fi with dark psychological dread and infinite timelines", category: "Sci-Fi" },
    { text: "A heartwarming cozy retro story with rain falling and rich color aesthetics", category: "Comfort" },
    { text: "Cinematic Slow-Burn historical investigation with high tense atmospheric details", category: "Slow-Burn" },
    { text: "Overlooked sharp dark comedy mystery with snappy dialogues and multiple twists", category: "Mystery" },
  ];

  // Available mood tags
  const moodTags = [
    { label: "🕯️ Cosmic Dread & Mystery", value: "Cosmic Dread" },
    { label: "🍂 Cozy Solitude", value: "Cozy Solitude" },
    { label: "⚡ Adrenaline Surge", value: "Adrenaline Surge" },
    { label: "🧠 Mind-Bending Puzzles", value: "Mind-Bending" },
    { label: "🎭 Cinematic Prestige & Drama", value: "High Art Drama" },
    { label: "🌌 Visual Escapism", value: "Dreamy Visuals" },
    { label: "❤️ Wholesome Warmth", value: "Wholesome Warmth" },
    { label: "🩸 Gritty Neo-Noir", value: "Neo-Noir" }
  ];

  // Era Labels
  const eras = [
    { label: "All Eras", value: "any" },
    { label: "Modern Marvels (2015-Present)", value: "2015s" },
    { label: "Indie Golden Era (2000-2014)", value: "2000s" },
    { label: "Nostalgic Masterpieces (1990s)", value: "1990s" },
    { label: "Neo-Classic & Cyber (1980s)", value: "1980s" },
    { label: "Auteur Rebellion (1970s)", value: "1970s" },
    { label: "Vintage Cinema Treasures (Pre-1970)", value: "vintage" }
  ];

  // Smooth Ref for messaging autoscroll
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch trending recommendations block on initial load
  useEffect(() => {
    fetchInitialDiscover();
  }, []);

  useEffect(() => {
    if (activeMovie && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeMovie]);

  // Persists local storage states
  const saveWatchlist = (updated: Movie[]) => {
    setWatchlist(updated);
    localStorage.setItem("moviebub_watchlist", JSON.stringify(updated));
  };

  const handleSaveTmdbKey = (keyVal: string) => {
    setCustomTmdbKey(keyVal);
    localStorage.setItem("moviebub_tmdb_key", keyVal);
    setShowSettings(false);
  };

  // Prepopulate standard recommendations on startup
  const fetchInitialDiscover = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Suggest highly acclaimed modern classic crowd pleasers with rich cinematography",
          moods: [],
          era: "any",
          pacing: "any",
          antiRecommendation: false,
          userApiKey: customTmdbKey
        })
      });

      if (!response.ok) throw new Error("Server communication broken.");
      const data = await response.json();
      setMovies(data.recommendations || []);
      setHasGeminiKey(data.hasGeminiKey !== false);
    } catch (err: any) {
      setErrorMessage("Could not connect to the projector room correctly. Displaying fallback projection.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform full search with options
  const triggerAIRecommendation = async (overridePrompt?: string) => {
    const activePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage("");
    
    // Auto collapse profiling setup wizard on trigger
    setShowProfilingWizard(false);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activePrompt,
          moods: selectedMoods,
          era: selectedEra,
          pacing: selectedPacing,
          antiRecommendation: antiRecommendation,
          userApiKey: customTmdbKey
        })
      });

      if (!response.ok) {
        throw new Error("Projection server returned bad signal");
      }

      const data = await response.json();
      setMovies(data.recommendations || []);
      setHasGeminiKey(data.hasGeminiKey !== false);
    } catch (err: any) {
      setErrorMessage("The AI projection booth timed out. Cinematic backups have been loaded for your viewing.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Item inside Watchlist
  const handleWatchlistToggle = (movie: Movie) => {
    const isBookmarked = watchlist.some(m => m.title === movie.title);
    if (isBookmarked) {
      const filtered = watchlist.filter(m => m.title !== movie.title);
      saveWatchlist(filtered);
    } else {
      const updated = [...watchlist, movie];
      saveWatchlist(updated);
    }
  };

  // Conversational Deep-Dive Chat inside focused Movie modal
  const handleSendChatMessage = async () => {
    if (!activeMovie || !chatPrompt.trim()) return;

    const movieTitle = activeMovie.title;
    const currentPrompt = chatPrompt;
    setChatPrompt("");

    const newMsg: ChatMessage = {
      sender: "user",
      text: currentPrompt,
      timestamp: new Date()
    };

    // Update messages local array visually
    const currentMovieMessages = chatMessages[movieTitle] || [];
    const updatedMessages = [...currentMovieMessages, newMsg];
    setChatMessages(prev => ({ ...prev, [movieTitle]: updatedMessages }));
    setIsSendingChat(true);

    try {
      // Build brief local taste summary object to pass down as context
      const tasteContext = {
        bookmarkCount: watchlist.length,
        selectedMoods,
        preferredEra: selectedEra,
        preferredPacing: selectedPacing
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieTitle: activeMovie.title,
          movieOverview: activeMovie.overview,
          prompt: currentPrompt,
          chatHistory: updatedMessages.map(m => ({ role: m.sender === "user" ? "user" : "model", text: m.text })),
          tasteProfile: tasteContext
        })
      });

      if (!res.ok) throw new Error("Vibe chat failed");
      const data = await res.json();

      const bubMsg: ChatMessage = {
        sender: "bub",
        text: data.response || "My visual reels failed to spool. Could you query that line once more?",
        timestamp: new Date()
      };

      setChatMessages(prev => ({
        ...prev,
        [movieTitle]: [...prev[movieTitle] || [], bubMsg]
      }));

    } catch (e) {
      console.error(e);
      const errMsg: ChatMessage = {
        sender: "bub",
        text: "I got a bit lost in the cinematic storage vaults. My projection is solid, but the dialogue tape was loose. Let's try again in a bit!",
        timestamp: new Date()
      };
      setChatMessages(prev => ({
        ...prev,
        [movieTitle]: [...prev[movieTitle] || [], errMsg]
      }));
    } finally {
      setIsSendingChat(false);
    }
  };

  // Fast select a preset Suggestion directly from the board
  const handleSelectSuggestion = (text: string) => {
    setPrompt(text);
    triggerAIRecommendation(text);
  };

  // Mood selection toggle handler
  const handleToggleMood = (val: string) => {
    if (selectedMoods.includes(val)) {
      setSelectedMoods(selectedMoods.filter(m => m !== val));
    } else {
      setSelectedMoods([...selectedMoods, val]);
    }
  };

  // Quick reset parameters
  const handleClearAllFilters = () => {
    setSelectedMoods([]);
    setSelectedEra("any");
    setSelectedPacing("any");
    setAntiRecommendation(false);
    setPrompt("");
  };

  const executeProgressiveProfiling = () => {
    // Collect all configurations and automatically run search
    triggerAIRecommendation();
  };

  return (
    <div className="min-h-screen bg-[#0a090e] text-slate-100 font-sans relative overflow-x-hidden selection:bg-rose-600 selection:text-white">
      {/* Cinematic Glowing Background Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-250px] left-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-rose-900/40 to-amber-600/10 blur-[130px]" />
        <div className="absolute top-[-100px] right-[15%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-indigo-900/30 to-violet-900/10 blur-[110px]" />
        <div className="absolute top-[350px] left-[30%] w-[600px] h-[300px] rounded-full bg-rose-500/5 blur-[150px]" />
      </div>

      {/* TOP GLOWING NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-slate-900/80 px-4 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* LOGO */}
          <div 
            onClick={() => { setCurrentTab("discover"); setHasSearched(false); fetchInitialDiscover(); }} 
            className="flex items-center gap-2.5 cursor-pointer group"
            id="header-logo-container"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-amber-500 shadow-lg shadow-rose-950/20 group-hover:scale-105 transition-all duration-300">
              <Film className="w-5.5 h-5.5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl blur-sm opacity-50 group-hover:opacity-85 transition-opacity pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-rose-400 bg-clip-text text-transparent">
                  Movie Bub
                </span>
                <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/20">
                  AI Cinema
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Cinematic Matchmaking Pro</p>
            </div>
          </div>

          {/* NAV OPTIONS */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121118] border border-slate-800/80 p-1.5 rounded-full" id="desktop-navbar">
            <button
              id="nav-tab-discover"
              onClick={() => { setCurrentTab("discover"); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                currentTab === "discover"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4 text-rose-500" />
              Discover Space
            </button>
            <button
              id="nav-tab-watchlist"
              onClick={() => { setCurrentTab("watchlist"); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all relative ${
                currentTab === "watchlist"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              My Lounge
              {watchlist.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-[#0a0a0f]">
                  {watchlist.length}
                </span>
              )}
            </button>
            <button
              id="nav-tab-about"
              onClick={() => { setCurrentTab("about"); }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                currentTab === "about"
                  ? "bg-slate-800 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Our Manifesto
            </button>
          </nav>

          {/* ACTIONS & SETTINGS */}
          <div className="flex items-center gap-2" id="header-actions">
            <button
              id="btn-open-settings"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900/60 p-2 md:px-3 md:py-2 rounded-lg border border-slate-800/80 transition-all cursor-pointer"
              title="TMDB Options & Settings"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              id="btn-hero-sign-up"
              onClick={() => {
                if (isSignedUp) {
                  setCurrentTab("watchlist");
                } else {
                  setShowSignUpModal(true);
                }
              }}
              className="relative overflow-hidden bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:from-rose-500 hover:to-rose-600 transition-all shadow-md shadow-rose-950/20 flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>{isSignedUp ? "Taste Lounge Live" : "Lock in Taste"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* OFFLINE WARNING IF NO GEMINI KEY */}
      {!hasGeminiKey && (
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/20 to-transparent border-y border-amber-500/20 text-amber-200 text-xs px-4 py-2.5 text-center relative z-10" id="offline-banner">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span><strong>Cinematic Offline Mode active:</strong> A fallback offline library with rich mock profiles is being projected beautifully because the primary Gemini API key is quiet. Put your key in settings to activate real-time custom prompts!</span>
          </div>
        </div>
      )}

      {/* MOBILE BAR (For Tablet & Mobile Views) */}
      <div className="md:hidden flex items-center justify-around bg-[#0c0b11] border-b border-slate-900/60 p-2.5 text-xs sticky top-15 z-30" id="mobile-navbar">
        <button 
          id="m-nav-discover"
          onClick={() => { setCurrentTab("discover"); }} 
          className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${currentTab === "discover" ? "bg-slate-800/80 text-white" : "text-slate-400"}`}
        >
          <Compass className="w-3.5 h-3.5 text-rose-500" />
          Discover
        </button>
        <button 
          id="m-nav-watchlist"
          onClick={() => { setCurrentTab("watchlist"); }} 
          className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all relative ${currentTab === "watchlist" ? "bg-slate-800/80 text-white" : "text-slate-400"}`}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          Watchlist
          {watchlist.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-600 text-[8px] flex items-center justify-center font-bold text-white">
              {watchlist.length}
            </span>
          )}
        </button>
        <button 
          id="m-nav-manifesto"
          onClick={() => { setCurrentTab("about"); }} 
          className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${currentTab === "about" ? "bg-slate-800/80 text-white" : "text-slate-400"}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          About
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* ======================= TAB: DISCOVER ======================= */}
        {currentTab === "discover" && (
          <div>
            
            {/* HERO SECTION WITH MASSIVE TITLE AND ZERO-CLICK SEARCH BOX */}
            <section className="text-center max-w-4xl mx-auto mt-4 mb-10" id="hero-heading-section">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-500 bg-rose-950/40 border border-rose-500/20 px-3.5 py-1.5 rounded-full mb-4 inline-block animate-fade-in">
                🚀 A Cinematic Matchmaking Intelligence
              </span>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                No Algorithms. <br className="hidden sm:inline" />
                Just pure <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 bg-clip-text text-transparent">cinematic magic</span>.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
                Tell Movie Bub exactly how you feel, what visual aesthetics you crave, or drop abstract metaphors. We will craft a masterclass projection list instantly.
              </p>

              {/* NATURAL LANGUAGE SEARCH BOX */}
              <div className="bg-[#111016]/90 border-2 border-slate-800/80 rounded-2xl p-2 shadow-2xl shadow-rose-950/5 focus-within:border-rose-500/50 transition-all relative group max-w-3xl mx-auto" id="search-box-element">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full flex items-center gap-3 px-3 min-h-12">
                    <Sparkles className="w-5 h-5 text-rose-500 shrink-0 group-focus-within:animate-bounce" />
                    <input
                      id="input-prompter"
                      type="text"
                      className="w-full bg-transparent text-slate-100 text-sm focus:outline-none placeholder:text-slate-500 focus:placeholder:text-slate-600"
                      placeholder="e.g. Find me a slow-burn film like Shutter Island, but more psychological mystery set in cold weather..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") triggerAIRecommendation();
                      }}
                    />
                    {prompt && (
                      <button
                        onClick={() => setPrompt("")}
                        className="p-1 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* SEARCH TRIGGER */}
                  <button
                    id="btn-trigger-recommendations"
                    disabled={isLoading}
                    onClick={() => triggerAIRecommendation()}
                    className="w-full sm:w-auto bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white font-semibold text-xs py-3 px-6 sm:px-7 rounded-xl hover:from-rose-500 hover:to-amber-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 shrink-0 select-none cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4.5 h-4.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4.5 h-4.5" />
                    )}
                    <span>Project Match</span>
                  </button>
                </div>

                {/* ADVANCED ADVOCATE TOGGLE IN SEARCH FOR REDUCING FORM FRICTION */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-900/80 pt-2 px-3.5 mt-2 gap-4">
                  
                  <div className="flex items-center gap-4 text-xs select-none">
                    <button
                      id="btn-wizard-toggle"
                      onClick={() => setShowProfilingWizard(!showProfilingWizard)}
                      className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-medium transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{showProfilingWizard ? "Hide Interactive Vibe Panel" : "Build Vibe Tailor"}</span>
                    </button>

                    <label className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer group transition-all">
                      <input
                        type="checkbox"
                        checked={antiRecommendation}
                        onChange={(e) => setAntiRecommendation(e.target.checked)}
                        className="rounded accent-rose-600 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                      />
                      <span className="group-hover:text-rose-400 transition-colors flex items-center gap-1">
                        <Shuffle className="w-3 h-3 text-rose-500" />
                        Anti-Recommendation Mode
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Gemini-3.5 Projection Core Feed</span>
                  </div>
                </div>
              </div>

              {/* PROGRESSIVE INTEREST PROFILING WIZARD */}
              {showProfilingWizard && (
                <div className="bg-[#0f0e14] border border-slate-800/80 rounded-2xl p-5 mt-4 text-left shadow-xl max-w-3xl mx-auto relative animate-fade-in" id="progressive-profiling-wizard">
                  <div className="flex items-center justify-between border-b border-slate-900/80 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-rose-500" />
                      <h3 className="font-bold text-sm text-slate-200">Interactive Taste Tailor Panel</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-6 rounded-full transition-all ${profilingStep >= 1 ? "bg-rose-500" : "bg-slate-800"}`} />
                      <span className={`h-1.5 w-6 rounded-full transition-all ${profilingStep >= 2 ? "bg-amber-400" : "bg-slate-800"}`} />
                      <span className={`h-1.5 w-6 rounded-full transition-all ${profilingStep >= 3 ? "bg-indigo-400" : "bg-slate-800"}`} />
                    </div>
                  </div>

                  {/* STEP 1: CHOOSE CURRENT MOODS OR ABSTRACT VIBES */}
                  {profilingStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">Step 1 of 3</span>
                        <h4 className="font-semibold text-sm text-white mb-2">What is the emotional signature or atmosphere you desire?</h4>
                        <p className="text-xs text-slate-400 mb-4">Select as many vibe notes as applicable to construct your profile.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {moodTags.map((mood) => {
                          const isSelected = selectedMoods.includes(mood.value);
                          return (
                            <button
                              key={mood.value}
                              onClick={() => handleToggleMood(mood.value)}
                              className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-rose-950/40 border-rose-500 text-rose-100"
                                  : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/80 hover:text-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? "bg-rose-500" : "bg-transparent"}`} />
                                <span className="line-clamp-1">{mood.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-3">
                        <button
                          onClick={() => setProfilingStep(2)}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>Step 2: Cinematic Era</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: CHOOSE THE CINEMATIC ERA */}
                  {profilingStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">Step 2 of 3</span>
                        <h4 className="font-semibold text-sm text-white mb-2">Select the Era of Filmmaking</h4>
                        <p className="text-xs text-slate-400 mb-4">Targeting vintage gold, nostalgic VHS classics, or bleeding-edge streaming releases.</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {eras.map((era) => {
                          const isSelected = selectedEra === era.value;
                          return (
                            <button
                              key={era.value}
                              onClick={() => setSelectedEra(era.value)}
                              className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-950/40 border-amber-500 text-amber-100"
                                  : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/80 hover:text-slate-100"
                              }`}
                            >
                              <span>{era.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          onClick={() => setProfilingStep(1)}
                          className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-2 transition-all"
                        >
                          Back to Vibe Moods
                        </button>
                        <button
                          onClick={() => setProfilingStep(3)}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                        >
                          <span>Step 3: Rhythm & Pacing</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SELECT PACING AND DISCOVER */}
                  {profilingStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Step 3 of 3</span>
                        <h4 className="font-semibold text-sm text-white mb-2">Rhythm & Narrative Pacing</h4>
                        <p className="text-xs text-slate-400 mb-4">Select the pace of storytelling match.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: "any", desc: "No Preference", sub: "Let story dictate pace" },
                          { val: "slow", desc: "🧘 Slow-Burn", sub: "Heavy build, moody atmospheric scenery" },
                          { val: "moderate", desc: "🚂 Moderate", sub: "Balanced development, active tension" },
                          { val: "fast", desc: "🏎️ Fast-Paced", sub: "Quick action, dialogue or plots" }
                        ].map((pace) => {
                          const isSelected = selectedPacing === pace.val;
                          return (
                            <button
                              key={pace.val}
                              onClick={() => setSelectedPacing(pace.val)}
                              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-950/40 border-indigo-500 text-indigo-100"
                                  : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/80 hover:text-slate-100"
                              }`}
                            >
                              <p className="font-bold text-xs">{pace.desc}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{pace.sub}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* CLEAR OR SUBMIT INTERACTIVE PROFILER */}
                      <div className="flex justify-between border-t border-slate-900/80 pt-4 mt-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setProfilingStep(2)}
                            className="bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg border border-slate-800/80"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleClearAllFilters}
                            className="text-slate-500 hover:text-rose-400 text-xs font-semibold px-2 py-2"
                          >
                            Reset Tailor
                          </button>
                        </div>

                        <button
                          onClick={executeProgressiveProfiling}
                          className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Cast Recommendations Layout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QUICK PROMPT BOARD / SUGGESTIONS LIST RECRUITS ANONYMOUS SESSIONS */}
              <div className="mt-6 flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto" id="inline-suggestions-panel">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Vibe Quick Select:</span>
                {promptSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSuggestion(sug.text)}
                    className="text-[11px] bg-slate-950/50 hover:bg-[#121118] text-slate-400 hover:text-rose-400 px-3.5 py-1.5 rounded-full border border-slate-800/80 hover:border-rose-500/20 transition-all text-left truncate max-w-xs cursor-pointer"
                  >
                    <span>💡 {sug.category}: </span>
                    <span className="italic">"{sug.text}"</span>
                  </button>
                ))}
              </div>
            </section>

            {/* MAIN RECOMMENDATION FEED */}
            <section className="mt-14" id="main-recommendations-feed">
              
              <div className="flex items-center justify-between border-b border-slate-900/80 pb-3 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <Clapperboard className="w-5 h-5 text-rose-500" />
                    <span>{hasSearched ? "Tailored AI Projections" : "Trending Right Now"}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {hasSearched 
                      ? `Displaying cinematic pairings built dynamically on your bespoke prompt query.` 
                      : `Highly curated initial recommendations from the Movie Bub lounge archives.`}
                  </p>
                </div>

                {hasSearched && (
                  <button
                    onClick={() => { setHasSearched(false); fetchInitialDiscover(); }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-all font-semibold flex items-center gap-1.5"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Reset to Trending</span>
                  </button>
                )}
              </div>

              {/* ERROR STATE */}
              {errorMessage && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 text-rose-200 text-xs mb-8 flex items-start gap-3" id="error-callout">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-1">Could not project matches fully</h5>
                    <p className="opacity-90">{errorMessage}</p>
                    <button 
                      onClick={fetchInitialDiscover}
                      className="underline text-rose-400 font-semibold mt-2 hover:text-rose-300 block text-left"
                    >
                      Reload Curated Library
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING SHIM / SKELETON FEED */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" id="shimmer-projection-loader">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-slate-950/40 rounded-2xl border border-slate-900/80 p-3 space-y-4 animate-pulse">
                      <div className="aspect-[2/3] bg-slate-900/80 rounded-xl w-full" />
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-900 w-3/4 rounded" />
                        <div className="h-3 bg-slate-900 w-1/2 rounded" />
                        <div className="h-2 bg-slate-900 w-5/6 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : movies.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-900/80 rounded-2xl bg-slate-950/20" id="empty-state-results">
                  <Compass className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-spin-slow" />
                  <h3 className="text-base font-bold text-slate-300">Quiet in the Screening Room</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
                    We crawled our index but couldn’t secure matching spools. Give us a broader prompt description or reset taste settings below!
                  </p>
                  <button
                    onClick={fetchInitialDiscover}
                    className="mt-6 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-800 px-4 py-2 rounded-xl transition-all"
                  >
                    Load Fallbacks
                  </button>
                </div>
              ) : (
                /* ACTUAL MOVIE CARD GRID */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6" id="recommendations-container-grid">
                  {movies.map((movie, idx) => {
                    const isBookmarked = watchlist.some(m => m.title === movie.title);
                    return (
                      <div
                        key={`${movie.title}-${idx}`}
                        className="bg-[#121118]/80 hover:bg-[#16151f] rounded-2xl border border-slate-900/60 hover:border-slate-800/80 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col relative group cursor-pointer"
                        id={`movie-card-${idx}`}
                        onClick={() => setActiveMovie(movie)}
                      >
                        {/* Rating Badges Overlay */}
                        <div className="absolute top-2.5 left-2.5 z-20 flex gap-1.5 pointer-events-none">
                          <span className="text-[9px] font-extrabold uppercase bg-rose-600 text-white px-2 py-0.5 rounded shadow">
                            ★ {movie.voteAverage ? movie.voteAverage.toFixed(1) : "7.5"}
                          </span>
                          <span className="text-[9px] font-bold bg-[#0c0b11]/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-sm">
                            {movie.pacing === "slow" ? "🐢 Slow" : movie.pacing === "fast" ? "⚡ Fast" : "🚂 Mod"}
                          </span>
                        </div>

                        {/* Watchlist Quick Button inside grid card */}
                        <button
                          id={`btn-watchlist-toggle-card-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchlistToggle(movie);
                          }}
                          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-[#0c0b11]/90 backdrop-blur-sm border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-110 shadow cursor-pointer"
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Bookmark className="w-4 h-4 hover:text-amber-400" />
                          )}
                        </button>

                        {/* Image Backdrop & Poster Container */}
                        <div className="aspect-[2/3] w-full bg-slate-950 relative overflow-hidden shrink-0">
                          <img
                            src={movie.posterPath}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121118] via-[#121118]/20 to-transparent opacity-85" />
                        </div>

                        {/* TEXT INFO CONTENT AREA */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] text-rose-400 uppercase font-extrabold tracking-wider">
                                {movie.genre}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">{movie.year}</span>
                            </div>

                            <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                              {movie.title}
                            </h3>

                            {movie.director && (
                              <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5 mb-2">
                                Directed by {movie.director}
                              </p>
                            )}

                            <p className="text-xs text-slate-400 line-clamp-3 mt-2 font-medium leading-relaxed bg-[#0c0b11]/40 p-2.5 rounded-lg border border-slate-900/60">
                              <span className="text-rose-400 font-bold">Bub's Match:</span> {movie.matchReason}
                            </p>
                          </div>

                          {/* Trigger details interaction footer */}
                          <div className="pt-3 border-t border-slate-900/60 flex items-center justify-between text-[11px] text-rose-400 font-bold group-hover:translate-x-1 duration-200">
                            <span>Open Cinematic Deck</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Conversational Mini Prompt Hint above Card Hover */}
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 duration-300 pointer-events-none">
                          <span className="text-[8px] bg-rose-950 border border-rose-500/20 text-rose-300 rounded px-1">QA Sandbox</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* LOWER VALUE ADD & PROGRESSIVE STATS CARD */}
            <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6" id="progressive-valuation-panels">
              <div className="bg-[#121118]/60 p-6 rounded-2xl border border-slate-900/80 space-y-3">
                <div className="p-3 bg-rose-500/10 w-fit rounded-xl border border-rose-500/20">
                  <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-sm text-white">Gemini Conversational QA Sandbox</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inside each movie card deck, trigger follow-up questions about cinematography, directors, aesthetics, or cast significance. No canned replies.
                </p>
              </div>

              <div className="bg-[#121118]/60 p-6 rounded-2xl border border-slate-900/80 space-y-3">
                <div className="p-3 bg-amber-500/10 w-fit rounded-xl border border-amber-500/20">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-extrabold text-sm text-white">Save Unreleased Taste Curations</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Save recommended gems to your local state lounge. Lock them in dynamically with your profile stats so subsequent queries prioritize your style.
                </p>
              </div>

              <div className="bg-[#121118]/60 p-6 rounded-2xl border border-slate-900/80 space-y-3">
                <div className="p-3 bg-violet-500/10 w-fit rounded-xl border border-violet-500/20">
                  <Tv className="w-5 h-5 text-indigo-400" />
                </div>
                <h4 className="font-extrabold text-sm text-white">Enriched Real-World Discovery</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every projection leverages TMDB synchronization API to hydrate real videos, backdrop high-res banners, cast descriptions, and trailer playbacks.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* ======================= TAB: WATCHLIST LOUNGE ======================= */}
        {currentTab === "watchlist" && (
          <div className="animate-fade-in" id="watchlist-lounge-tab">
            <div className="border-b border-slate-900 pb-4 mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-amber-500" />
                <span>My Movie Bub Lounge</span>
              </h2>
              <p className="text-xs text-slate-400">
                You currently have {watchlist.length} cinematic gem{watchlist.length === 1 ? "" : "s"} cached in this browser’s private memory spool.
              </p>
            </div>

            {watchlist.length === 0 ? (
              <div className="py-24 text-center bg-[#0d0c13] rounded-2xl border border-slate-900/80">
                <Bookmark className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-bounce" />
                <h3 className="text-base font-bold text-slate-300">Your Lounge Room is Idle</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto mt-2 mb-6 leading-relaxed">
                  As you search cinematic recommendations in the discovery tab, tap any bookmark badge to lock it into your dedicated offline library!
                </p>
                <button
                  onClick={() => setCurrentTab("discover")}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-rose-950/25"
                >
                  Embark on Discovery
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Watchlist Taste Metric Card - Progressive Profiling display */}
                <div className="bg-gradient-to-r from-[#171622]/90 to-slate-950 p-6 rounded-2xl border border-slate-850/80 relative overflow-hidden" id="taste-profile-card">
                  <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-rose-500/5 to-transparent skew-x-12" />
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-rose-400 font-extrabold px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                        Dynamic Lounge Profile
                      </span>
                      <h3 className="text-lg font-black text-white mt-3">Synthesizing Your Taste Archetype...</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        Based on your currently saved selections, our reasoning engine detects a primary affinity for{" "}
                        <strong>{Array.from(new Set(watchlist.map(m => m.genre))).join(" & ") || "various styles"}</strong> storytelling.
                      </p>
                    </div>

                    <button 
                      id="btn-watchlist-sign-up"
                      onClick={() => setShowSignUpModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-800 transition-all cursor-pointer whitespace-nowrap"
                    >
                      ☁️ Back up Taste Profile
                    </button>
                  </div>
                </div>

                {/* Grid layout of watchlist items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {watchlist.map((movie, idx) => (
                    <div
                      key={`watchlist-${movie.title}-${idx}`}
                      className="bg-[#121118]/80 hover:bg-[#15141d]/90 rounded-2xl border border-slate-900/80 hover:border-slate-800/80 overflow-hidden shadow duration-200 cursor-pointer flex flex-col justify-between"
                      onClick={() => setActiveMovie(movie)}
                    >
                      <div className="relative aspect-video bg-slate-950 w-full overflow-hidden">
                        <img
                          src={movie.backdropPath}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121118] via-[#121118]/40 to-transparent" />
                        <span className="absolute bottom-2.5 left-2.5 text-[10px] bg-rose-600 font-bold px-2 py-0.5 rounded shadow">
                          ★ {movie.voteAverage ? movie.voteAverage.toFixed(1) : "7.8"}
                        </span>
                        
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchlistToggle(movie);
                          }}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-rose-900/90 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer"
                          title="Remove from lounge"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] text-rose-400 uppercase font-black">{movie.genre}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{movie.year}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-200 truncate">{movie.title}</h4>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {movie.matchReason}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-900/60 mt-4 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-white transition-all">
                          <span>Inspect Cinematic details</span>
                          <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: ABOUT MANIFESTO ======================= */}
        {currentTab === "about" && (
          <div className="max-w-3xl mx-auto py-6 animate-fade-in" id="manifesto-about-tab">
            <div className="space-y-8 bg-[#121118]/80 border border-slate-900 p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-[-50px] left-[-50px] w-48 h-48 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />
              
              <div className="border-b border-slate-800 pb-5 text-center">
                <span className="text-[11px] uppercase tracking-[0.2em] text-rose-500 font-bold bg-rose-950/40 border border-rose-500/20 px-3.5 py-1.5 rounded-full mb-3 inline-block">
                  🎬 Our Manifesto
                </span>
                <h2 className="text-3xl font-black text-white mt-2">Movie Bub Story</h2>
                <p className="text-sm text-amber-500 italic mt-1 font-semibold">"Reinventing cinematic discovery."</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-400 leading-relaxed">
                <p>
                  Today’s algorithms are broken. They recommend movies based on mechanical user tracking and basic categories, pushing users into predictable feedback loops. If you watch one horror film, high-capacity platforms feed you thirty more identical horror films until you lose interest completely.
                </p>
                <p>
                  <strong>Movie Bub is different</strong>. We believe in the spark of visual resonance. We treats cinema as a deeply emotional, atmospheric and storytelling experience. 
                </p>
                <p>
                  By marrying the raw zero-shot reasoning capabilities of <strong>Google Studio’s Gemini model</strong> with real-world metadata extracted from <strong>TheMovieDB</strong>, we translate your abstract feelings—"feeling introspective on cold rainy Sundays" or "missing the aesthetic pace of 90s neon crime thriller soundtracks"—into authentic cinematic projections.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-indigo-950/20 to-transparent border border-rose-500/20 text-xs text-rose-200">
                <h4 className="font-extrabold text-sm mb-1 text-white">How it works behind the screen</h4>
                <ul className="list-disc list-inside space-y-1 mt-2 text-slate-300">
                  <li><strong>Step 1: AI Reasoner:</strong> Your conversational vibe is analyzed by Gemini to build structured JSON movie matches.</li>
                  <li><strong>Step 2: Media Hydrator:</strong> The results match concurrently against TMDB API index to return real poster art, cast lists, ratings, and YouTube trailers.</li>
                  <li><strong>Step 3: QA Sandbox:</strong> An interactive private chatbot lets you interview Movie Bub about any recommendation on a deeper cinephile level.</li>
                </ul>
              </div>

              {/* CONVERSION PANEL */}
              <div className="text-center pt-4">
                <button
                  onClick={() => { setShowSignUpModal(true); }}
                  className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs px-8 py-3.5 rounded-full shadow-lg shadow-rose-950/30 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>Lock in Your Taste Profile</span>
                </button>
                <p className="text-[11px] text-slate-500 mt-3 font-semibold">Zero credit card required. Lock in your preferences forever.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================= MODAL: SINGLE MOVIE DEEP DIVE DECK ======================= */}
      {activeMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050508]/95 overflow-y-auto backdrop-blur-md" id="movie-detail-modal">
          
          <div className="relative bg-[#0c0b11] border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl shadow-rose-950/10 overflow-hidden my-8" id="movie-detail-inner">
            
            {/* Header backdrop banner with close */}
            <div className="relative aspect-[21/9] sm:aspect-[2.4/1] w-full bg-slate-950">
              <img
                src={activeMovie.backdropPath}
                alt={activeMovie.title}
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b11] via-[#0c0b11]/20 to-transparent" />
              
              {/* Close Button details */}
              <button
                id="btn-close-movie-modal"
                onClick={() => { setActiveMovie(null); }}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 z-10">
                <div className="flex flex-wrap gap-2 mb-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded shadow">
                    ★ {activeMovie.voteAverage ? activeMovie.voteAverage.toFixed(1) : "7.5"}
                  </span>
                  <span className="text-[9px] font-bold bg-[#0c0b11]/90 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-800 backdrop-blur-sm">
                    {activeMovie.pacing === "slow" ? "🐢 Slow-Burn" : activeMovie.pacing === "fast" ? "⚡ Fast-Paced" : "🚂 Moderate Pacing"}
                  </span>
                  {activeMovie.rating && (
                    <span className="text-[9px] font-bold bg-[#0c0b11]/90 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20 backdrop-blur-sm">
                      Rated: {activeMovie.rating}
                    </span>
                  )}
                  {activeMovie.durationMinutes && (
                    <span className="text-[9px] font-bold bg-[#0c0b11]/90 text-indigo-300 px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-sm">
                      🕒 {activeMovie.durationMinutes} min
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-3.5xl font-extrabold text-white leading-tight drop-shadow">
                  {activeMovie.title}
                </h2>
              </div>
            </div>

            {/* Main scrollable body panel */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: VISUAL ARTWORK, TRAILER ACTION & WATCHLIST STATUS */}
              <div className="space-y-4">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-950 shadow-md border border-slate-900 shrink-0 relative group">
                  <img
                    src={activeMovie.posterPath}
                    alt={activeMovie.title}
                    className="w-full h-full object-cover"
                  />
                  {activeMovie.tagline && (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 text-[10px] text-amber-400 italic font-semibold p-2.5 text-center border-t border-slate-800 leading-normal">
                      "{activeMovie.tagline}"
                    </div>
                  )}
                </div>

                {/* Add to Watchlist Lounge Button inside Deck details */}
                <button
                  id="btn-lounge-save-action"
                  onClick={() => handleWatchlistToggle(activeMovie)}
                  className={`w-full text-xs font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    watchlist.some(m => m.title === activeMovie.title)
                      ? "bg-slate-900 border border-amber-500/40 text-amber-400"
                      : "bg-[#16151f] hover:bg-[#1f1e2c] border border-slate-800 text-slate-200"
                  }`}
                >
                  {watchlist.some(m => m.title === activeMovie.title) ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-amber-400" />
                      <span>Saved in My Taste Lounge</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save to Lounge Watchlist</span>
                    </>
                  )}
                </button>

                {/* Simulated Streaming Available Guides */}
                <div className="bg-[#121118] border border-slate-900 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block mb-2.5">
                    📺 Streaming Spools (Dynamic)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                    <div className="bg-[#16151f] p-2 rounded border border-slate-900 text-rose-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Netflix
                    </div>
                    <div className="bg-[#16151f] p-2 rounded border border-slate-900 text-sky-450 text-slate-300 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Prime Video
                    </div>
                    <div className="bg-[#16151f] p-2 rounded border border-slate-900 text-amber-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Apple TV
                    </div>
                    <div className="bg-[#16151f] p-2 rounded border border-slate-900 text-cyan-400 flex items-center gap-1.5 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Max
                    </div>
                  </div>
                  <span className="text-[8px] text-slate-500 italic block mt-2 text-center">Available options based on standard regional licensing.</span>
                </div>
              </div>

              {/* MIDDLE & RIGHT COMBINED AREA: METADATA & INTEGRATED QA CHAT SANDBOX */}
              <div className="md:col-span-2 space-y-5">
                
                {/* MOVIE BUB AI MATCH REASON PANEL */}
                <div className="bg-gradient-to-r from-rose-950/20 to-slate-950 p-4.5 rounded-2xl border border-rose-500/20 shadow relative">
                  <div className="absolute top-3.5 right-4 pointer-events-none flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[8px] uppercase font-mono text-rose-300">
                    <Sparkles className="w-2.5 h-2.5 animate-spin-slow" />
                    <span>AI Reasoning Spool</span>
                  </div>
                  
                  <h3 className="text-xs font-bold uppercase text-rose-400 tracking-wider mb-2">
                    Why You Will Love This Projection
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-normal font-semibold">
                    {activeMovie.matchReason}
                  </p>
                  
                  {activeMovie.whyYouWillLikeIt && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-900 text-xs text-slate-300 leading-relaxed italic">
                      <strong>Cinematic Note:</strong> {activeMovie.whyYouWillLikeIt}
                    </div>
                  )}
                </div>

                {/* OVERVIEW DESCRIPTION PANEL */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider text-slate-400">Cinematic Metasynopsis</span>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {activeMovie.overview || "This masterpiece is highly acclaimed and featured inside the custom AI Studio recommendations pool."}
                  </p>
                </div>

                {/* CAST LISTINGS */}
                {activeMovie.credits && activeMovie.credits.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider text-slate-400">Featured Cast & Characters</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeMovie.credits.map((c, idx) => (
                        <div key={idx} className="bg-[#121118] border border-slate-900/85 p-2 rounded-xl flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800">
                            {c.profilePath ? (
                              <img src={c.profilePath} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[10px] text-slate-250 truncate">{c.name}</p>
                            <p className="text-[9px] text-slate-450 truncate">{c.character}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* YOUTUBE EMBED TRAILER PLAYER */}
                {activeMovie.trailerUrl && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-rose-500 fill-rose-550" />
                      <span>Cinematic Trailer</span>
                    </span>
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-900">
                      <iframe
                        title={`${activeMovie.title} Trailer`}
                        src={activeMovie.trailerUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* CONVERSATIONAL FOLLOW UP CHAT SANDBOX */}
                <div className="border border-slate-900 rounded-2xl bg-[#0d0c13] overflow-hidden">
                  
                  {/* Chat Header */}
                  <div className="bg-[#121118] px-4 py-3 border-b border-slate-950 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse animate-duration-1000" />
                      <h4 className="font-black text-xs text-slate-200">Interview Movie Bub about "{activeMovie.title}"</h4>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">Gemini Flash Reasoning</span>
                  </div>

                  {/* Message scroll view */}
                  <div className="p-4 space-y-3.5 h-48 overflow-y-auto text-xs" id="chat-scroller-viewport">
                    
                    {/* Default introduction bot message */}
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div className="relative w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-[#16151f] p-3 rounded-2xl rounded-tl-none border border-slate-850 text-slate-350 leading-relaxed shadow-sm">
                        <p>
                          Ah, a marvelous cinematic choice! Go ahead, test me. Ask me how is the visual spacing, soundtrack, thematic depths, or why this exactly correlates with your taste!
                        </p>
                      </div>
                    </div>

                    {/* Stored conversational messages */}
                    {(chatMessages[activeMovie.title] || []).map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 max-w-[85%] ${
                          msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            msg.sender === "user"
                              ? "bg-slate-800 text-white"
                              : "relative bg-gradient-to-tr from-rose-600 to-amber-500 text-white"
                          }`}
                        >
                          {msg.sender === "user" ? <User className="w-3 h-3" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </div>
                        <div
                          className={`p-3 rounded-2xl leading-relaxed shadow-sm ${
                            msg.sender === "user"
                              ? "rounded-tr-none bg-rose-600 text-white font-medium"
                              : "rounded-tl-none bg-[#16151f] border border-slate-850 text-slate-250"
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Chat sending/generating status indicator */}
                    {isSendingChat && (
                      <div className="flex items-start gap-2.5">
                        <div className="relative w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-white animate-spin-slow" />
                        </div>
                        <div className="bg-[#16151f] p-3 rounded-2xl rounded-tl-none border border-slate-850 text-slate-400 flex items-center gap-1.5 italic shadow-sm">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:0.4s]" />
                          </div>
                          <span>bub is analyzing cinematography...</span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input panel */}
                  <div className="p-3 bg-[#111016] border-t border-slate-950 flex gap-2">
                    <input
                      id="input-qa-follow-up"
                      type="text"
                      className="w-full bg-[#0a090e] border border-slate-900 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-rose-500/50 text-slate-100"
                      placeholder={`Ask me: "Will this appeal to a fan of ${activeMovie.genre} filmmaking?"`}
                      value={chatPrompt}
                      onChange={(e) => setChatPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendChatMessage();
                      }}
                    />
                    <button
                      id="btn-send-qa"
                      onClick={handleSendChatMessage}
                      disabled={isSendingChat || !chatPrompt.trim()}
                      className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Return button */}
                <div className="flex justify-end pt-2">
                  <button
                    id="btn-return-discover-deck"
                    onClick={() => { setActiveMovie(null); }}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-800 transition-all cursor-pointer"
                  >
                    Go Back to Discover Board
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: SETTINGS DRAWER ======================= */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" id="settings-modal-overlay">
          <div className="bg-[#0f0e15] border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up">
            
            <button
              id="btn-close-settings"
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
              <Key className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-white text-base">Media Hydration Settings</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Movie Bub has direct AI reasoning enabled via Gemini 3-Flash. To fetch live cinematic elements (movie posters, YouTube trailers, metadata, and cast members), configure TMDB API.
            </p>

            {/* Custom keys input inside progressive drawers */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-305 block text-slate-300">
                  Custom TMDB API Key (Optional)
                </label>
                <input
                  id="input-custom-tmdb-key"
                  type="password"
                  className="w-full bg-[#0a0a0f] border border-slate-900 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-550 focus:border-amber-500/50 text-slate-200"
                  placeholder="Paste your TMDB API v3 Key..."
                  value={customTmdbKey}
                  onChange={(e) => setCustomTmdbKey(e.target.value)}
                />
                <span className="text-[10px] text-slate-500 block">
                  Leaves room key in local browser storage only. Leave blank to enjoy stunning fallback posters and cast.
                </span>
              </div>

              {/* Instructions on TMDB key retrieval */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-900 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">How to secure a free TMDB Key:</p>
                <ol className="list-decimal list-inside space-y-1 pt-1 text-slate-400">
                  <li>Register a free account at <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-rose-400 hover:underline inline-flex items-center gap-0.5">themoviedb.org</a></li>
                  <li>Head to profile Settings → API panel</li>
                  <li>Copy your generated API Key (v3 auth) and paste it here!</li>
                </ol>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-900">
                <button
                  id="btn-cancel-settings"
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-4 py-2 transition-all"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-settings"
                  onClick={() => handleSaveTmdbKey(customTmdbKey)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-5 py-2 rounded-xl shadow transition-all cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: REGISTER / SIGN UP CONVERSION FLOW ======================= */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" id="signup-modal-overlay">
          <div className="bg-[#0f0e15] border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-scale-up" id="signup-modal-inner">
            
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer"
              id="btn-close-signup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center mx-auto shadow-md">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h3 className="font-extrabold text-white text-base">Lock In Taste Cloud-Sync</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Join 1,200+ cinephiles who backup preferences, sync custom watchlist metrics, and skip Gemini limits.
              </p>
            </div>

            {isSignedUp ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white">Dynamic Spool Secured!</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your taste index for <strong>{watchlist.length} film{watchlist.length === 1 ? "" : "s"}</strong> is synced! Private code is sent to your spool mail.
                </p>
                <button
                  onClick={() => setShowSignUpModal(false)}
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl border border-slate-800 transition-all"
                >
                  Close & Browse
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (signUpEmail.trim()) {
                    setIsSignedUp(true);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-350 block text-slate-400">
                    Cinephile Guest Email
                  </label>
                  <input
                    id="input-signup-email"
                    type="email"
                    required
                    className="w-full bg-[#0a0a0f] border border-slate-900 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-rose-500/50 text-slate-100 placeholder:text-slate-600"
                    placeholder="e.g. yourname@cinema.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                </div>

                {/* Conversion perks checklist */}
                <div className="space-y-2 text-[11px] text-slate-450 text-slate-400 py-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span>Instant synchronization across phone & tablet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span>Personalized vector taste tags context injection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />
                    <span>Advanced Conversational QA lengths with AI spool</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-signup-submit"
                    type="submit"
                    className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Secure My Spool</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[9px] text-slate-500 text-center mt-2.5">By clicking, you secure anonymous offline state preservation.</p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STATIC LUXURY CINEMA FOOTER */}
      <footer className="border-t border-slate-900/80 bg-[#07060a] mt-24 py-12 px-4 text-xs font-medium text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-extrabold text-slate-300">Movie Bub</span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] text-slate-400">© 2026 AI Studio</span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Crafted as a premier zero-shot conversational concierge using Gemini 3.5 Models and media-rich TMDB endpoints.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-slate-450 text-xs">
            <a href="#discover" onClick={(e) => { e.preventDefault(); setCurrentTab("discover"); }} className="hover:text-slate-350 transition-colors">Discovery Deck</a>
            <a href="#watchlist" onClick={(e) => { e.preventDefault(); setCurrentTab("watchlist"); }} className="hover:text-slate-350 transition-colors">Watchlist Lounge</a>
            <a href="#manifesto" onClick={(e) => { e.preventDefault(); setCurrentTab("about"); }} className="hover:text-slate-350 transition-colors">Manifesto</a>
            <a href="#settings" onClick={(e) => { e.preventDefault(); setShowSettings(true); }} className="hover:text-slate-350 transition-colors">API Options</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
