import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// A curated library of fallback movies to guarantee premium service if API keys are inactive
const fallbackMovies = [
  {
    title: "Inception",
    year: 2010,
    matchReason: "A high-concept heist film set within the subconscious. Fits your preference for slow-burning, cerebral thrillers with intricate structures.",
    pacing: "moderate" as const,
    genre: "Sci-Fi",
    director: "Christopher Nolan",
    whyYouWillLikeIt: "It perfectly merges explosive action sequences with deeply intellectual existential dread.",
    rating: "PG-13",
    durationMinutes: 148,
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    matchReason: "A masterclass in atmospheric world-building. Matches your request for a deep visual aesthetic with profound philosophical questions.",
    pacing: "slow" as const,
    genre: "Sci-Fi",
    director: "Denis Villeneuve",
    whyYouWillLikeIt: "Every frame is a photographic canvas combined with a beautiful synth soundtrack.",
    rating: "R",
    durationMinutes: 164,
  },
  {
    title: "Knives Out",
    year: 2019,
    matchReason: "A modern whodunnit that flips classic mystery tropes upside down. Dynamic pacing and full of clever humor.",
    pacing: "fast" as const,
    genre: "Mystery",
    director: "Rian Johnson",
    whyYouWillLikeIt: "The stellar ensemble cast and cozy Autumn setting make it a perfect cinematic treat.",
    rating: "PG-13",
    durationMinutes: 130,
  },
  {
    title: "Spirited Away",
    year: 2001,
    matchReason: "A timeless animated masterpiece about growth and courage. Perfect choice if you're seeking a nostalgic, warm, and highly visual escapism.",
    pacing: "moderate" as const,
    genre: "Fantasy",
    director: "Hayao Miyazaki",
    whyYouWillLikeIt: "It contains some of the most beautiful hand-drawn fantasy visuals in cinema history.",
    rating: "PG",
    durationMinutes: 125,
  },
  {
    title: "Parasite",
    year: 2019,
    matchReason: "A brilliant, sharp satire that switches genres seamlessly from dark comedy to chilling thriller.",
    pacing: "fast" as const,
    genre: "Thriller",
    director: "Bong Joon Ho",
    whyYouWillLikeIt: "It is an incredibly gripping social critique with unpredictable plot twists that keep you on the edge.",
    rating: "R",
    durationMinutes: 132,
  },
];

// Map genres to highly cinematic Unsplash imagery
function getFallbackImages(genre: string) {
  const g = (genre || "").toLowerCase();
  if (g.includes("sci-fi") || g.includes("science") || g.includes("future")) {
    return {
      poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("action") || g.includes("adventure") || g.includes("superhero") || g.includes("thrill")) {
    return {
      poster: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("horror") || g.includes("scary") || g.includes("spooky")) {
    return {
      poster: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1505635330303-319539796671?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("romance") || g.includes("romantic") || g.includes("love")) {
    return {
      poster: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("comedy") || g.includes("funny") || g.includes("humor")) {
    return {
      poster: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("drama") || g.includes("crime") || g.includes("mystery")) {
    return {
      poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&auto=format&fit=crop&q=80"
    };
  }
  if (g.includes("fantasy") || g.includes("magic") || g.includes("anime")) {
    return {
      poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
      backdrop: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80"
    };
  }
  return {
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop&q=80",
    backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80"
  };
}

// Media hydration from TMDB. Returns enriched data if API key is present
async function searchAndEnrichMovie(title: string, year: number, userApiKey?: string) {
  const key = userApiKey || process.env.TMDB_API_KEY || "";
  const fallbackImgs = getFallbackImages(title);
  
  if (!key) {
    // Return stunning mock details if no TMDB API key is provided
    return {
      tmdbId: null,
      posterPath: fallbackImgs.poster,
      backdropPath: fallbackImgs.backdrop,
      overview: "No description is available. Enable TMDB API key in settings for full visual synchronization.",
      voteAverage: 7.8,
      genresOfMovie: [title.length % 2 === 0 ? "Sci-Fi" : "Drama", "Mystery"],
      tagline: "Uncover the cinematic essence of the soul.",
      credits: [
        { name: "C. Nolan", character: "Director", profilePath: null },
        { name: "L. DiCaprio", character: "Lead Actor", profilePath: null },
        { name: "E. Page", character: "Co-Star", profilePath: null }
      ],
      trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" // Rickroll as harmless placeholder trailer
    };
  }

  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(title)}${year ? `&primary_release_year=${year}` : ""}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error("TMDB search failed");
    
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      return {
        tmdbId: null,
        posterPath: fallbackImgs.poster,
        backdropPath: fallbackImgs.backdrop,
        overview: "Movie found by Movie Bub AI, but could not be indexed in external DB.",
        voteAverage: 7.5,
        genresOfMovie: ["Cinema"],
        tagline: "A recommended cinematic choice.",
        credits: [],
        trailerUrl: null
      };
    }

    const matched = searchData.results[0];
    const movieId = matched.id;

    // Get deep details including cast and videos
    const detailUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${key}&append_to_response=videos,credits`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) {
      // Basic info if fine-grained search fails
      return {
        tmdbId: movieId,
        posterPath: matched.poster_path ? `https://image.tmdb.org/t/p/w500${matched.poster_path}` : fallbackImgs.poster,
        backdropPath: matched.backdrop_path ? `https://image.tmdb.org/t/p/w1280${matched.backdrop_path}` : fallbackImgs.backdrop,
        overview: matched.overview || "No overview found.",
        voteAverage: matched.vote_average || 7.0,
        genresOfMovie: ["Dynamic"],
        tagline: "",
        credits: [],
        trailerUrl: null
      };
    }

    const detailData = await detailRes.json();
    
    // Find trailer link
    let trailerUrl: string | null = null;
    if (detailData.videos && detailData.videos.results) {
      const trailer = detailData.videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
      if (trailer) {
        trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      }
    }

    // Grab first 4 cast members
    const cast = (detailData.credits && detailData.credits.cast) 
      ? detailData.credits.cast.slice(0, 4).map((c: any) => ({
          name: c.name,
          character: c.character,
          profilePath: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        }))
      : [];

    const genresList = (detailData.genres && detailData.genres.length > 0)
      ? detailData.genres.map((g: any) => g.name)
      : ["Cinema"];

    return {
      tmdbId: movieId,
      posterPath: detailData.poster_path ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}` : fallbackImgs.poster,
      backdropPath: detailData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detailData.backdrop_path}` : fallbackImgs.backdrop,
      overview: detailData.overview || "No description available.",
      voteAverage: detailData.vote_average || 8.0,
      genresOfMovie: genresList,
      tagline: detailData.tagline || "",
      credits: cast,
      trailerUrl
    };

  } catch (error) {
    console.error("TMDB Hydration Error for title:", title, error);
    return {
      tmdbId: null,
      posterPath: fallbackImgs.poster,
      backdropPath: fallbackImgs.backdrop,
      overview: "Failed to grab metadata. Showing cinematic fallback details.",
      voteAverage: 7.2,
      genresOfMovie: ["Drama"],
      tagline: "Cinema in spirit.",
      credits: [],
      trailerUrl: null
    };
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Primary Recommendation Flow (AI Resonator + Media Hydrator)
app.post("/api/recommendations", async (req, res) => {
  const { prompt, moods = [], era = "any", pacing = "any", antiRecommendation = false, userApiKey = "" } = req.body;

  let queryBuilder = "";
  if (prompt) {
    queryBuilder += `Direct request from user: "${prompt}". `;
  }
  if (moods.length > 0) {
    queryBuilder += `Desired emotional tags and vibes: ${moods.join(", ")}. `;
  }
  if (era !== "any") {
    queryBuilder += `Must target movies released in the era of: ${era}. `;
  }
  if (pacing !== "any") {
    queryBuilder += `Prefer pacing of: ${pacing}. `;
  }

  let finalSystemInstruction = `You are Movie Bub, an elite cinematic recommender. Your output must be strictly in JSON format. Do not write markdown blocks or explain yourself outside the JSON array. Output a JSON array containing exactly 5 items.`;
  
  if (antiRecommendation) {
    finalSystemInstruction += ` SPECIAL INSTRUCTION: The user wants an ANTI-RECOMMENDATION. Recommend stellar and acclaimed movies that are completely OPPOSITE or counter-intuitive to their specified tastes. Pivot away from their usual preferences while explaining in matchReason why this bold alternate cinematic path is still a masterpiece they should discover.`;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn("No GEMINI_API_KEY. Yielding fallback curated matches.");
    // Hydrate fallback list
    const enriched = await Promise.all(
      fallbackMovies.map(async (m) => {
        const hyd = await searchAndEnrichMovie(m.title, m.year, userApiKey);
        return { ...m, ...hyd };
      })
    );
    return res.json({
      recommendations: enriched,
      isMockAI: true,
      hasGeminiKey: false
    });
  }

  try {
    // Generate structure matching custom recommender
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 5 tailored movie recommendations for this query: ${queryBuilder || "Surprise me with highly acclaimed cinema matches."}`,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The official movie title" },
              year: { type: Type.INTEGER, description: "Year of release" },
              matchReason: { type: Type.STRING, description: "Personalized reason linking the user's specific state of mind to this choice" },
              pacing: { type: Type.STRING, description: "Expected pacing ('slow', 'moderate', 'fast')" },
              genre: { type: Type.STRING, description: "Dominant genre (e.g. Sci-Fi, Crime, Romance, Drama)" },
              director: { type: Type.STRING, description: "The director's name" },
              whyYouWillLikeIt: { type: Type.STRING, description: "Engaging hook showcasing cinematic style and appeal" },
              rating: { type: Type.STRING, description: "Content rating (PG, PG-13, R, etc.)" },
              durationMinutes: { type: Type.INTEGER, description: "Runtime duration in minutes" }
            },
            required: ["title", "year", "matchReason", "pacing", "genre", "whyYouWillLikeIt"]
          }
        }
      }
    });

    const parsedResults = JSON.parse(response.text?.trim() || "[]");

    // Hydrate metadata concurrently via TMDB SDK matching
    const enrichedRecommendations = await Promise.all(
      parsedResults.map(async (movie: any) => {
        const metadata = await searchAndEnrichMovie(movie.title, movie.year, userApiKey);
        return {
          ...movie,
          ...metadata,
          // Generate beautiful fallbacks if TMDB details were sparse
          posterPath: metadata.posterPath || getFallbackImages(movie.genre).poster,
          backdropPath: metadata.backdropPath || getFallbackImages(movie.genre).backdrop,
        };
      })
    );

    res.json({
      recommendations: enrichedRecommendations,
      isMockAI: false,
      hasGeminiKey: true
    });

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // On failure, hydrate fallback movies elegantly
    const enrichedFallback = await Promise.all(
      fallbackMovies.map(async (m) => {
        const hyd = await searchAndEnrichMovie(m.title, m.year, userApiKey);
        return { ...m, ...hyd };
      })
    );
    res.json({
      recommendations: enrichedFallback,
      isMockAI: true,
      hasGeminiKey: !!geminiKey,
      error: "Failed to generate dynamic recommendations. Displaying visual curations instead."
    });
  }
});

// conversational micro-reviewer deep-dive
app.post("/api/chat", async (req, res) => {
  const { movieTitle, movieOverview, prompt, chatHistory = [], tasteProfile = {} } = req.body;
  
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.json({
      response: `[Offline Mode] Movie Bub would tell you that "${movieTitle}" is an excellent match! Its cinematography is deeply atmospheric. (To activate full conversation, configure GEMINI_API_KEY in seconds!)`
    });
  }

  try {
    const activeTaste = JSON.stringify(tasteProfile);
    const instructionPrompt = `
You are the elite cinematic recommender AI "Movie Bub".
You are conversing with a user who is looking at the movie detailed below:
- Movie Title: ${movieTitle}
- Overview: ${movieOverview}

User Taste Profile Context: ${activeTaste}

Answer their specific follow-up question below. Speak like an insightful, passionate cinephile who understands pacing, camera movement, score soundtracks, and narrative depth. Keep your answers brief (80-120 words), direct, and incredibly charming. Do not use generic corporate language. Avoid markdown formatting headers. Only return pure dialog text.
`;

    const interactionPrompt = `User asks: "${prompt}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: interactionPrompt,
      config: {
        systemInstruction: instructionPrompt,
        temperature: 0.85,
      }
    });

    res.json({
      response: response.text?.trim() || "Cinema has left me speechless! Ask me another question."
    });

  } catch (error) {
    console.error("Chat API error:", error);
    res.json({
      response: `I'm having a hard time connecting to the projections right now! But trust me, "${movieTitle}" is worth checking out.`
    });
  }
});

// -------------------------------------------------------------
// Serve Assets and SPA Middleware Configuration
// -------------------------------------------------------------
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Movie Bub server booted successfully on port ${PORT}`);
  });
}

bootstrap();
