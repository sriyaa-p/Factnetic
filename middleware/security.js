/**
 * Security Middleware for FACTNETIC
 * Provides input validation, sanitization, and malicious query filtering.
 */

/**
 * Sanitizes and validates the 'topic' query parameter.
 * Rejects empty, overly long, or potentially malicious queries.
 */
function validateTopic(req, res, next) {
  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: "Topic query parameter is required." });
  }

  if (typeof topic !== "string") {
    return res.status(400).json({ error: "Topic must be a string." });
  }

  const cleanTopic = topic.trim();

  // Validate length (min 2, max 60 characters to protect API request limits and validation cost)
  if (cleanTopic.length < 2) {
    return res.status(400).json({ error: "Topic is too short. Must be at least 2 characters." });
  }
  if (cleanTopic.length > 60) {
    return res.status(400).json({ error: "Topic is too long. Maximum 60 characters allowed." });
  }

  // Detect script tags, HTML tags, and typical injection payloads
  const htmlTagPattern = /<[^>]*>/g;
  const scriptPattern = /javascript:|eval\(|onload=|onerror=/i;
  const systemInjectionPattern = /[\$\{\}\[\]\<\>\;\\]/g; // filter characters often used in exploits

  if (htmlTagPattern.test(cleanTopic) || scriptPattern.test(cleanTopic) || systemInjectionPattern.test(cleanTopic)) {
    return res.status(400).json({ error: "Invalid topic name. Malicious characters detected." });
  }

  // Keep sanitized topic on the request object for downstream usage
  req.sanitizedTopic = cleanTopic;
  next();
}

module.exports = {
  validateTopic
};
