require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");

const securityMiddleware = require("./middleware/security");
const rateLimiters = require("./middleware/rateLimiter");
const cacheService = require("./services/cacheService");
const geminiService = require("./services/geminiService");

const app = express();
const PORT = process.env.PORT || 3000;

// Apply Helmet to set secure HTTP headers
// Modify Content Security Policy (CSP) to allow our background video domains and google fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: [
          "'self'",
          "blob:",
          "https://d8j0ntlcm91z4.cloudfront.net",
          "https://stream.mux.com",
          "https://mux.com"
        ],
        connectSrc: ["'self'", "https://stream.mux.com", "https://*.mux.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

/**
 * GET /api/facts
 * Query params: topic (string)
 * Returns: Array of 5 fun facts
 */
app.get(
  "/api/facts",
  rateLimiters,                  // Rate limit checks (minute, hour, day)
  securityMiddleware.validateTopic, // Input validation and query sanitization
  async (req, res) => {
    const topic = req.sanitizedTopic;

    try {
      // 1. Check in-memory cache first
      if (cacheService.has(topic)) {
        console.log("[Cache Hit]");
        const cachedData = cacheService.get(topic);
        return res.json(cachedData);
      }

      // 2. Cache Miss: Fetch from Gemini service
      console.log("[Cache Miss]");
      const facts = await geminiService.fetchNicheFacts(topic);

      // 3. Save to cache
      cacheService.set(topic, facts);

      // 4. Return facts
      return res.json(facts);
    } catch (err) {
      console.error(`Error processing facts request for topic "${topic}":`, err);
      return res.status(500).json({ error: "Failed to retrieve fun facts. Please try again." });
    }
  }
);

// Fallback path to serve index.html for single page routing if necessary
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
