/**
 * FACTNETIC — Client-Side Application Controller
 */

// Global Application State
const state = {
  activeMode: "explore", // "explore" or "trivia"
  currentTopic: "",
  facts: [], // Array of loaded facts
  recentSearches: [],

  // Trivia Game State
  trivia: {
    questions: [], // Randomized array of questions (real fact vs distractor)
    currentIndex: 0,
    score: 0,
    streak: 0,
    answersLog: [], // Array of booleans representing correct/incorrect answers
    highScore: 0
  }
};

// --- DOM Elements ---
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const btnSubmit = document.getElementById("btn-submit");
const recentChipsContainer = document.getElementById("recent-chips");
const statusPanel = document.getElementById("status-panel");
const statusText = document.getElementById("status-text");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingShimmer = document.getElementById("loading-shimmer");
const exploreView = document.getElementById("explore-view");
const exploreGrid = document.getElementById("explore-grid");
const triviaView = document.getElementById("trivia-view");
const triviaCard = document.getElementById("trivia-card");
const triviaScoreEl = document.getElementById("trivia-score");
const triviaStreakEl = document.getElementById("trivia-streak");
const triviaAccuracyEl = document.getElementById("trivia-accuracy");
const triviaHighScoreEl = document.getElementById("trivia-high-score");
const drawerToggleBtn = document.getElementById("drawer-toggle-btn");
const drawerContent = document.getElementById("drawer-content");
const citationsTbody = document.getElementById("citations-tbody");
const sourceCountEl = document.getElementById("source-count");
const ctaVideo = document.getElementById("cta-stream-video");

// --- Loading Message Rotation ---
const loadingMessages = [
  "Searching trusted sources...",
  "Curating lesser-known insights...",
  "Verifying historical references...",
  "Cross-checking citations...",
  "Exploring obscure knowledge...",
  "Assembling surprising discoveries...",
  "Analyzing niche information...",
  "Preparing your results..."
];

let _loadingMsgInterval = null;

function startLoadingMessages() {
  let idx = 0;
  statusText.style.transition = 'opacity 0.5s ease';
  statusText.textContent = loadingMessages[idx];
  statusText.style.opacity = '1';

  _loadingMsgInterval = setInterval(() => {
    statusText.style.opacity = '0';
    setTimeout(() => {
      idx = (idx + 1) % loadingMessages.length;
      statusText.textContent = loadingMessages[idx];
      statusText.style.opacity = '1';
    }, 500);
  }, 1800);
}

function stopLoadingMessages() {
  clearInterval(_loadingMsgInterval);
  _loadingMsgInterval = null;
  statusText.style.opacity = '1';
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  try {
    initParticles();
  } catch (err) {
    console.error("Particle initialization failed:", err);
  }

  try {
    initHlsStream();
  } catch (err) {
    console.error("HLS initialization failed:", err);
  }

  loadRecentSearches();
  loadHighScore();
  setupEventListeners();
  updateModeView();

  console.log("FACTNETIC initialized");
});

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Mode Selection Toggles
  const modeRadios = document.querySelectorAll('input[name="app-mode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.activeMode = e.target.value;

      // Update ARIA labels for accessibility
      modeRadios.forEach(r => r.setAttribute("aria-checked", r.checked ? "true" : "false"));

      updateModeView();

      // Re-render based on selected mode if facts are already loaded
      if (state.facts.length > 0) {
        if (state.activeMode === "explore") {
          renderExploreMode();
        } else {
          startTriviaGame();
        }
      }
    });
  });

  // Search Submission
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query.length >= 2 && query.length <= 60) {
      performSearch(query);
    } else {
      showError("Topic must be between 2 and 60 characters.");
    }
  });

  // Citation Drawer Toggle Accordion
  drawerToggleBtn.addEventListener("click", () => {
    const isExpanded = drawerToggleBtn.getAttribute("aria-expanded") === "true";
    drawerToggleBtn.setAttribute("aria-expanded", !isExpanded);
    drawerContent.hidden = isExpanded;
  });
}

// --- Mode View Controller ---
function updateModeView() {
  if (state.activeMode === "explore") {
    exploreView.hidden = false;
    triviaView.hidden = true;
  } else {
    exploreView.hidden = true;
    triviaView.hidden = false;

    // If we have no facts, show placeholder
    if (state.facts.length === 0) {
      triviaCard.innerHTML = `<div class="trivia-placeholder-text">Enter a search topic to start the quiz.</div>`;
    }
  }
}

// --- Recent Searches / Local Storage ---
function loadRecentSearches() {
  try {
    const stored = localStorage.getItem("factnetic_recent");
    state.recentSearches = stored ? JSON.parse(stored) : ["platypus", "octopus", "black holes"];
    renderRecentChips();
  } catch (err) {
    console.error("Failed to load recent searches", err);
    state.recentSearches = ["platypus", "octopus", "black holes"];
    renderRecentChips();
  }
}

function saveRecentSearch(topic) {
  const cleanTopic = topic.trim().toLowerCase();

  // Filter out duplicates and keep max 5 items
  state.recentSearches = [
    cleanTopic,
    ...state.recentSearches.filter(t => t !== cleanTopic)
  ].slice(0, 5);

  localStorage.setItem("factnetic_recent", JSON.stringify(state.recentSearches));
  renderRecentChips();
}

function renderRecentChips() {
  recentChipsContainer.innerHTML = "";
  state.recentSearches.forEach(topic => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = topic;
    chip.setAttribute("aria-label", `Search topic ${topic}`);
    chip.addEventListener("click", () => {
      searchInput.value = topic;
      performSearch(topic);
    });
    recentChipsContainer.appendChild(chip);
  });
}

function loadHighScore() {
  const score = localStorage.getItem("factnetic_highscore");
  state.trivia.highScore = score ? parseInt(score, 10) : 0;
  triviaHighScoreEl.textContent = state.trivia.highScore;
}

function updateHighScore(newScore) {
  if (newScore > state.trivia.highScore) {
    state.trivia.highScore = newScore;
    localStorage.setItem("factnetic_highscore", newScore);
    triviaHighScoreEl.textContent = newScore;
    return true; // Return true if high score broken
  }
  return false;
}

// --- API Search Service ---
async function performSearch(topic) {
  state.currentTopic = topic;

  // Show loading state
  statusPanel.hidden = false;
  loadingShimmer.hidden = false;
  btnSubmit.disabled = true;
  startLoadingMessages();

  // Hide panels during load
  exploreGrid.innerHTML = "";
  triviaCard.innerHTML = `<div class="trivia-placeholder-text">Searching...</div>`;

  try {
    const response = await fetch(`/api/facts?topic=${encodeURIComponent(topic)}`);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Quota exceeded. You can only query 5 topics per minute.");
      }
      const data = await response.json();
      throw new Error(data.error || "Failed to retrieve facts.");
    }

    const data = await response.json();
    state.facts = data;

    saveRecentSearch(topic);

    // Clear loading state on success
    stopLoadingMessages();
    btnSubmit.disabled = false;
    statusPanel.hidden = true;

    // Populate Citations
    populateCitations(data);

    // Render the active mode
    if (state.activeMode === "explore") {
      renderExploreMode();
    } else {
      startTriviaGame();
    }

  } catch (err) {
    console.error("Search Error:", err);
    stopLoadingMessages();
    btnSubmit.disabled = false;
    showError(err.message || "An unexpected error occurred. Please try again.");
  }
}

function showError(msg) {
  statusPanel.hidden = false;
  loadingShimmer.hidden = true;
  statusText.innerHTML = `<span style="color: #ff3b30; font-weight: 500;">Error:</span> ${msg}`;
}

// --- Explore Mode Rendering ---
function renderExploreMode() {
  exploreGrid.innerHTML = "";

  if (state.facts.length === 0) {
    exploreGrid.innerHTML = `<div class="card-placeholder-text">Search a topic above to explore verified niche facts.</div>`;
    return;
  }

  state.facts.forEach((item, index) => {
    const cardPersp = document.createElement("div");
    cardPersp.className = "card-perspective";
    cardPersp.setAttribute("role", "button");
    cardPersp.setAttribute("tabindex", "0");
    cardPersp.setAttribute("aria-label", `Fact card ${index + 1}. Hint: ${item.hint}. Press space or enter to flip.`);

    const cardInner = document.createElement("div");
    cardInner.className = "card-inner";

    // Front face
    const cardFront = document.createElement("div");
    cardFront.className = "card-face card-front liquid-glass";
    cardFront.innerHTML = `
      <div class="card-brand">FACTNETIC</div>
      <p class="card-hook">${item.hint}</p>
      <div class="card-action">Reveal Fact <span class="arrow">→</span></div>
    `;

    // Back face
    const cardBack = document.createElement("div");
    cardBack.className = "card-face card-back";
    cardBack.innerHTML = `
      <div class="card-brand" style="color: var(--accent-color);">VERIFIED FACT</div>
      <p class="card-fact">${item.fact}</p>
      <div class="card-citation-info">
        <span class="card-source-title">Source: ${item.citation}</span>
        <a class="card-source-link" href="${item.source}" target="_blank" rel="noopener noreferrer" tabindex="-1">
          Open citation url ↗
        </a>
      </div>
    `;

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardPersp.appendChild(cardInner);

    // Toggle flip on click/tap
    cardPersp.addEventListener("click", () => {
      cardPersp.classList.toggle("flipped");

      // Update screen reader status
      const isFlipped = cardPersp.classList.contains("flipped");
      cardPersp.setAttribute("aria-label", isFlipped
        ? `Fact card ${index + 1} flipped. Fact: ${item.fact}. Source: ${item.citation}.`
        : `Fact card ${index + 1}. Hint: ${item.hint}.`
      );
    });

    // Keyboard flip mapping
    cardPersp.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        cardPersp.click();
      }
    });

    exploreGrid.appendChild(cardPersp);
  });
}

// --- Trivia Mode Controller ---
function startTriviaGame() {
  state.trivia.currentIndex = 0;
  state.trivia.score = 0;
  state.trivia.streak = 0;
  state.trivia.answersLog = [];

  // Format quiz items: randomise whether we show the real fact (Answer: TRUE) or the distractor (Answer: FALSE)
  state.trivia.questions = state.facts.map((item) => {
    const showTrueFact = Math.random() >= 0.5;
    return {
      question: showTrueFact ? item.fact : item.distractor,
      correctAnswer: showTrueFact, // true means user needs to press TRUE, false means user needs to press FALSE
      explanation: item.fact, // True explanation is always the real fact
      citation: item.citation,
      source: item.source
    };
  });

  updateScoreboard();
  renderTriviaQuestion();
}

function updateScoreboard() {
  const total = state.trivia.answersLog.length;
  const correct = state.trivia.score;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  triviaScoreEl.textContent = `${correct}/${total}`;
  triviaStreakEl.textContent = state.trivia.streak;
  triviaAccuracyEl.textContent = `${accuracy}%`;
  loadHighScore(); // Refresh high score display
}

function renderTriviaQuestion() {
  const idx = state.trivia.currentIndex;
  const qList = state.trivia.questions;

  if (idx >= qList.length) {
    renderTriviaEndScreen();
    return;
  }

  const q = qList[idx];

  triviaCard.innerHTML = `
    <div class="trivia-question-wrapper" id="trivia-q-wrapper">
      <span class="trivia-step">Question ${idx + 1} of ${qList.length}</span>
      <p class="trivia-question">"${q.question}"</p>
      <div class="trivia-actions">
        <button class="btn-trivia btn-true" id="btn-choice-true" aria-label="Select True">TRUE</button>
        <button class="btn-trivia btn-false" id="btn-choice-false" aria-label="Select False">FALSE</button>
      </div>
    </div>
  `;

  // Add listeners for answer selection
  const btnTrue = document.getElementById("btn-choice-true");
  const btnFalse = document.getElementById("btn-choice-false");

  btnTrue.addEventListener("click", () => handleAnswerSubmit(true));
  btnFalse.addEventListener("click", () => handleAnswerSubmit(false));
}

function handleAnswerSubmit(userChoice) {
  const idx = state.trivia.currentIndex;
  const q = state.trivia.questions[idx];
  const isCorrect = userChoice === q.correctAnswer;

  // Disable buttons immediately to prevent multi-clicking
  const btnTrue = document.getElementById("btn-choice-true");
  const btnFalse = document.getElementById("btn-choice-false");
  btnTrue.disabled = true;
  btnFalse.disabled = true;

  // Log answer
  state.trivia.answersLog.push(isCorrect);

  const cardWrapper = document.getElementById("trivia-q-wrapper");

  if (isCorrect) {
    state.trivia.score++;
    state.trivia.streak++;
    updateHighScore(state.trivia.score);

    // Add success class for pulse animation
    cardWrapper.classList.add("correct-pulse");

    // Spawn custom confetti
    spawnConfettiBurst();
  } else {
    state.trivia.streak = 0;
    // Add shake keyframe animation
    cardWrapper.classList.add("incorrect-shake");
  }

  updateScoreboard();

  // Append Feedback panel dynamically
  const feedbackPanel = document.createElement("div");
  feedbackPanel.className = "trivia-feedback-panel";

  const statusHtml = isCorrect
    ? `<span class="feedback-status correct">✓ Correct</span>`
    : `<span class="feedback-status incorrect">✗ Incorrect</span>`;

  feedbackPanel.innerHTML = `
    ${statusHtml}
    <p class="feedback-explanation">
      <strong>Real Fact:</strong> ${q.explanation}
      <br>
      <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4);">Source: ${q.citation}</span>
    </p>
    <button class="btn-next-question" id="btn-next-q">
      ${idx === state.trivia.questions.length - 1 ? "See Results" : "Next Question →"}
    </button>
  `;

  cardWrapper.appendChild(feedbackPanel);

  const btnNext = document.getElementById("btn-next-q");
  btnNext.addEventListener("click", () => {
    state.trivia.currentIndex++;
    renderTriviaQuestion();
  });

  // Scroll trivia card into view if needed
  triviaCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderTriviaEndScreen() {
  const total = state.trivia.questions.length;
  const correct = state.trivia.score;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const isNewHigh = updateHighScore(correct);

  triviaCard.innerHTML = `
    <div class="trivia-finished">
      <h3>Quiz Completed</h3>
      <p style="color: rgba(255,255,255,0.5); font-weight: 300;">
        You've explored all facts for topic: <strong style="color:#fff;">${state.currentTopic}</strong>
      </p>
      
      <div class="finished-stat-summary">
        <div class="finished-stat">
          <span class="num">${correct}/${total}</span>
          <span class="lbl">Correct</span>
        </div>
        <div class="finished-stat">
          <span class="num">${accuracy}%</span>
          <span class="lbl">Accuracy</span>
        </div>
      </div>
      
      ${isNewHigh ? `<p style="color: var(--accent-color); font-weight: 700; letter-spacing: 0.05em; animation: fadeIn 1s infinite alternate;">★ NEW HIGH SCORE ★</p>` : ""}
      
      <button class="btn-restart-trivia" id="btn-restart-quiz">Try Again</button>
    </div>
  `;

  document.getElementById("btn-restart-quiz").addEventListener("click", () => {
    startTriviaGame();
  });
}

// --- Custom CSS Confetti Burst Generator ---
function spawnConfettiBurst() {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "999";
  document.body.appendChild(container);

  const colors = ["#00f0ff", "#ffffff", "#00ff88", "#ff0077", "#ffff00"];

  for (let i = 0; i < 60; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.left = "50vw";
    particle.style.top = "60vh";
    particle.style.width = `${Math.random() * 8 + 4}px`;
    particle.style.height = `${Math.random() * 12 + 6}px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.borderRadius = "2px";

    // Random directions
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 200 + 100;
    const xDist = Math.cos(angle) * velocity;
    const yDist = Math.sin(angle) * velocity - 100; // push upwards

    const animation = particle.animate([
      { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
      { transform: `translate(${xDist}px, ${yDist}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: Math.random() * 1000 + 800,
      easing: "cubic-bezier(0.1, 0.8, 0.3, 1)"
    });

    container.appendChild(particle);
    animation.onfinish = () => particle.remove();
  }

  setTimeout(() => container.remove(), 2000);
}

// --- Citation Table Loader ---
function populateCitations(factsList) {
  if (!factsList || factsList.length === 0) {
    citationsTbody.innerHTML = `<tr><td colspan="4" class="no-citations-text">No sources loaded. Perform a topic search to view citations.</td></tr>`;
    sourceCountEl.textContent = "0";
    return;
  }

  sourceCountEl.textContent = factsList.length;
  citationsTbody.innerHTML = "";

  const todayString = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  factsList.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.hint}</strong></td>
      <td>${item.citation}</td>
      <td><a href="${item.source}" target="_blank" rel="noopener noreferrer">${item.source}</a></td>
      <td>${todayString}</td>
    `;
    citationsTbody.appendChild(tr);
  });
}

// --- Canvas Interactive Particle Network ---
function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");

  let particles = [];
  let mouse = { x: null, y: null, radius: 120 };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Track mouse movements
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseout", () => {
    mouse.x = null;
    mouse.y = null;
  });

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.baseX = this.x;
      this.baseY = this.y;
      this.density = (Math.random() * 30) + 10;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
    }

    update() {
      // Natural float drift
      this.x += this.vx;
      this.y += this.vy;

      // Boundary bounce
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

      // Mouse interaction (subtle push away)
      if (mouse.x !== null && mouse.y !== null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          let force = (mouse.radius - distance) / mouse.radius;
          let directionX = dx / distance;
          let directionY = dy / distance;

          // Push away from cursor
          this.x -= directionX * force * 3;
          this.y -= directionY * force * 3;
        }
      }
    }

    draw() {
      ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function createNetwork() {
    particles = [];
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  createNetwork();
  window.addEventListener("resize", createNetwork);

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let dx = particles[i].x - particles[j].x;
        let dy = particles[i].y - particles[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw & Update particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// --- Mux HLS Streaming Video Loader ---
function initHlsStream() {
  if (typeof Hls === "undefined") {
    console.warn("HLS.js unavailable. Skipping CTA stream.");
    return;
  }

  const streamUrl = "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";
  
  if (Hls.isSupported()) {
    const hls = new Hls({
      maxMaxBufferLength: 10,
      lowLatencyMode: true
    });
    hls.loadSource(streamUrl);
    hls.attachMedia(ctaVideo);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      ctaVideo.play().catch(e => console.log("Autoplay stream blocked: ", e));
    });
  } else if (ctaVideo.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari fallback for native HLS playback
    ctaVideo.src = streamUrl;
    ctaVideo.addEventListener("loadedmetadata", () => {
      ctaVideo.play().catch(e => console.log("Autoplay stream blocked: ", e));
    });
  }
}