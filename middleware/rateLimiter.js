const rateLimit = require("express-rate-limit");

/**
 * Custom handler to return JSON formatted 429 Too Many Requests errors.
 */
const rateLimitHandler = (req, res, next, options) => {
  res.status(options.statusCode).json({
    error: "Too Many Requests",
    message: options.message,
    retryAfter: res.getHeader("Retry-After") || "unknown"
  });
};

// 1. Minute Limiter: 5 requests per minute
const minuteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: "You have exceeded the rate limit of 5 requests per minute.",
  statusCode: 429,
  handler: rateLimitHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// 2. Hour Limiter: 50 requests per hour
const hourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: "You have exceeded the rate limit of 50 requests per hour.",
  statusCode: 429,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// 3. Day Limiter: 100 requests per day
const dayLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100,
  message: "You have reached your daily quota of 100 requests per day.",
  statusCode: 429,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiting chain to be run sequentially on the endpoint
module.exports = [
  minuteLimiter,
  hourLimiter,
  dayLimiter
];
