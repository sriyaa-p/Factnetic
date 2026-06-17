# FACTNETIC

FACTNETIC is a production-ready, AI-powered web application that allows users to search any topic and discover highly niche, lesser-known fun facts. Powered by Google Gemini's Search Grounding, the app brings real, verified, and bizarre knowledge straight from the web.

### Limit : 
Search Grounding to deliver verified niche facts, currently operating under the Gemini free-tier quota of 20 API requests per day.

---

## Features

- **Gemini Search Grounding**: Real-time Google Search integration via the Gemini SDK ensures highly specific and verified facts.
- **Explore Mode**: Discover facts on interactive 3D liquid glassmorphism cards that flip to reveal the details, citation, and source URL.
- **Trivia Mode**: A Fact or Fiction quiz game that features scoring, streaks, high scores (persisted via localStorage), and visual animations (confetti, shake effects).
- **Rate Limiting**: Integrated sequentially-chained IP rate limiting.
- **Caching**: Flexible in-memory caching to optimize performance and control API query quotas.
- **Security Middleware**: Configured with Helmet HTTP headers, CORS configurations, and input sanitization to filter out malicious scripts.
- **Responsive Design**: Mobile-friendly 3D CSS grid system with optimized performance for reduced motion contexts.

---

## Installation

```bash
git clone <repo-url>
cd factnetic
npm install
```

---

## Create `.env`

Create a `.env` file in the root directory:

```env
PORT=3000
GEMINI_API_KEY=your_api_key
USE_MOCK_DATA=false
NODE_ENV=development
CACHE_TTL=86400
```

### Mock Mode Fallback
If you do not have a Gemini API key:
```env
USE_MOCK_DATA=true
```
The application will automatically bypass external API calls and use local mock facts for platypuses, octopuses, black holes, and generic fallback structures for other topics.

---

## Run Locally

```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## API Example

Fetch niche facts dynamically from the backend:
```text
GET /api/facts?topic=platypus
```

---

## Deployment

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for full configuration guidelines.

### Vercel Environment Variables
Set the following variables in your Vercel Project Settings:
```text
GEMINI_API_KEY
USE_MOCK_DATA=false
NODE_ENV=production
CACHE_TTL=86400
```

### Google Cloud Run Environment Variables
Set the following variables on your Google Cloud Run service definition:
```text
GEMINI_API_KEY
USE_MOCK_DATA=false
NODE_ENV=production
CACHE_TTL=86400
```
