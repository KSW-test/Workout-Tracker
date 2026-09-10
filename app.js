/**
 * IronLog - Core Application Logic
 * Pure client-side static site script for GitHub Pages.
 */

// App State
let exercises = [];
let workouts = [];
let cachedImages = {}; // Stores local base64/object URLs for current browser session
let isDataLoaded = false;

// Active Filters
let activeCategory = "All";
let searchQuery = "";
let selectedDateFilter = "";

// Helper: Standardize exercise name into image/GIF filename
function getSanitizedFilename(exerciseName, extension) {
  const slug = (exerciseName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!extension) return slug;
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  return `${slug}.${cleanExt}`;
}

// Category icons for fallback badges
const CATEGORY_ICONS = {
  "Chest": "🏋️",
  "Back": "🧗",
  "Legs": "🦵",
  "Shoulders": "🦾",
  "Biceps": "💪",
  "Triceps": "🦾",
  "Arms": "💪",
  "Core": "⚡",
  "Cardio": "🏃"
};

// Initialize App
async function initApp() {
  loadThemePreference();
  setupEventListeners();
  await loadData();
  navigateToScreen("dashboard", {}, false);
  updateStats();
  populateExerciseSelects();
}

// Load Data from JSON files with LocalStorage fallback
async function loadData() {
  // Load Cached Images from LocalStorage if any
  try {
    const localCached = localStorage.getItem("ironlog_cached_images");
    if (localCached) {
      cachedImages = JSON.parse(localCached);
      // Ensure cross-compatibility keys in cache
      Object.keys(cachedImages).forEach((k) => {
        const val = cachedImages[k];
        if (k.includes("dumbell")) {
          const fixed = k.replace(/dumbell/g, "dumbbell");
          if (!cachedImages[fixed]) cachedImages[fixed] = val;
        } else if (k.includes("dumbbell")) {
          const typo = k.replace(/dumbbell/g, "dumbell");
          if (!cachedImages[typo]) cachedImages[typo] = val;
        }
      });
    }
  } catch (e) {
    console.warn("Could not load image cache from localStorage", e);
  }

  // Load Exercises from data/exercises.json and localStorage
  let catalogExercises = [];
  try {
    const resp = await fetch("data/exercises.json");
    if (resp.ok) {
      catalogExercises = await resp.json();
    }
  } catch (e) {
    console.warn("Could not fetch data/exercises.json", e);
  }

  try {
    const localEx = localStorage.getItem("ironlog_exercises");
    if (localEx) {
      exercises = JSON.parse(localEx);
      if (Array.isArray(exercises) && catalogExercises.length > 0) {
        catalogExercises.forEach((catEx) => {
          const existing = exercises.find((e) => e.id === catEx.id);
          if (!existing) {
            exercises.push(catEx);
          } else {
            if (catEx.category && catEx.category !== existing.category) {
              existing.category = catEx.category;
            }
            if (catEx.image && catEx.image.endsWith('.gif') && (!existing.image || existing.image.endsWith('.jpg'))) {
              existing.image = catEx.image;
            }
          }
        });
      } else if (!Array.isArray(exercises) || exercises.length === 0) {
        exercises = catalogExercises;
      }
    } else {
      exercises = catalogExercises;
    }
  } catch (e) {
    console.warn("Could not parse exercises from localStorage", e);
    exercises = catalogExercises;
  }

  // Ensure dumbbell_bicep_curl and dumbbell_pullover in exercises use .gif
  if (exercises) {
    exercises.forEach((ex) => {
      if ((ex.id === "dumbbell_bicep_curl" || ex.name === "Dumbbell Bicep Curl" || ex.name === "Dumbell Bicep Curl") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "dumbbell_bicep_curl.gif";
      }
      if ((ex.id === "dumbbell_pullover" || ex.name === "Dumbbell Pullover" || ex.name === "Dumbell Pullover") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Dumbbell Pullover.gif";
      }
      if ((ex.id === "smith_machine_shoulder_press" || ex.name === "Smith Machine Shoulder Press") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Smith Machine Shoulder Press.gif";
      }
      if (ex.id === "reverse_pec_deck_flyes") {
        ex.id = "reverse_pec_deck_fly_machine";
        ex.name = "Reverse Pec Deck Fly Machine";
        ex.variation = "Machine Rear Delt / Reverse Pec Flyes";
        ex.image = "Reverse Pec Deck Fly Machine.gif";
      }
      if ((ex.id === "reverse_pec_deck_fly_machine" || ex.name === "Reverse Pec Deck Fly Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Reverse Pec Deck Fly Machine.gif";
      }
      if ((ex.id === "pec_deck_machine_flyes" || ex.name === "Pec Deck Machine Flyes" || ex.name === "Pec Deck Fly Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Pec Deck Fly Machine.gif";
      }
      if (ex.id === "barbell_shrugs") {
        ex.id = "barbell_shrug";
        ex.name = "Barbell Shrug";
        ex.image = "Barbell Shrug.gif";
      }
      if ((ex.id === "barbell_shrug" || ex.name === "Barbell Shrug" || ex.name === "Barbell Shrugs") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Barbell Shrug.gif";
      }
      if ((ex.id === "high_pulley_cable_row" || ex.name === "High Pulley Cable Row") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "High Pulley Cable Row.gif";
      }
      if ((ex.id === "cable_pullover" || ex.name === "Cable Pullover") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Cable Pullover.gif";
      }
      if ((ex.id === "seated_dips_machine" || ex.name === "Seated Dips Machine" || ex.id === "seated_dip_machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Seated Dips Machine.gif";
      }
      if ((ex.id === "seated_row_machine" || ex.name === "Seated Row Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
        ex.image = "Seated Row Machine.gif";
      }
      if (ex.category === "Arms") {
        const lower = (ex.name || ex.id || "").toLowerCase();
        ex.category = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
      }
    });
  }

  // Load Workouts from data/workouts.json and localStorage
  let catalogWorkouts = [];
  try {
    const resp = await fetch("data/workouts.json");
    if (resp.ok) {
      catalogWorkouts = await resp.json();
    }
  } catch (e) {
    console.warn("Could not fetch data/workouts.json", e);
  }

  try {
    const localWorkouts = localStorage.getItem("ironlog_workouts");
    if (localWorkouts) {
      const parsed = JSON.parse(localWorkouts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        workouts = parsed;
      }
    }
  } catch (e) {
    console.warn("Could not parse workouts from localStorage", e);
  }

  if (!workouts || workouts.length === 0) {
    workouts = catalogWorkouts;
  } else if (catalogWorkouts.length > 0) {
    // Ensure workouts from data/workouts.json exist in the list so historical logs are never lost
    catalogWorkouts.forEach((catW) => {
      const existing = workouts.find((w) => w.id === catW.id || w.date === catW.date);
      if (!existing) {
        workouts.push(catW);
      } else if (Array.isArray(existing.exercises) && Array.isArray(catW.exercises)) {
        existing.exercises.forEach((ex, i) => {
          if (catW.exercises[i] && catW.exercises[i].category && (ex.category === "Arms" || !ex.category)) {
            ex.category = catW.exercises[i].category;
          }
        });
      }
    });
  }

  // Ensure every workout has an ID and single-exercise sessions carry duration down to the exercise
  workouts.forEach((w) => {
    if (!w.id) {
      w.id = `workout_${w.date ? w.date.replace(/-/g, '_') : 'log'}_${Math.random().toString(36).substr(2, 6)}`;
    }
    if (w.duration && w.exercises && w.exercises.length === 1 && !w.exercises[0].duration) {
      w.exercises[0].duration = w.duration;
    }
    if (w.exercises) {
      w.exercises.forEach((ex) => {
        if ((ex.exerciseId === "dumbbell_bicep_curl" || ex.exerciseName === "Dumbbell Bicep Curl" || ex.exerciseName === "Dumbell Bicep Curl") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "dumbbell_bicep_curl.gif";
        }
        if ((ex.exerciseId === "dumbbell_pullover" || ex.exerciseName === "Dumbbell Pullover" || ex.exerciseName === "Dumbell Pullover") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Dumbbell Pullover.gif";
        }
        if ((ex.exerciseId === "smith_machine_shoulder_press" || ex.exerciseName === "Smith Machine Shoulder Press") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Smith Machine Shoulder Press.gif";
        }
        if (ex.exerciseId === "reverse_pec_deck_flyes") {
          ex.exerciseId = "reverse_pec_deck_fly_machine";
          ex.exerciseName = "Reverse Pec Deck Fly Machine";
          ex.image = "Reverse Pec Deck Fly Machine.gif";
        }
        if ((ex.exerciseId === "reverse_pec_deck_fly_machine" || ex.exerciseName === "Reverse Pec Deck Fly Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Reverse Pec Deck Fly Machine.gif";
        }
        if ((ex.exerciseId === "pec_deck_machine_flyes" || ex.exerciseName === "Pec Deck Machine Flyes" || ex.exerciseName === "Pec Deck Fly Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Pec Deck Fly Machine.gif";
        }
        if (ex.exerciseId === "barbell_shrugs") {
          ex.exerciseId = "barbell_shrug";
          ex.exerciseName = "Barbell Shrug";
          ex.image = "Barbell Shrug.gif";
        }
        if ((ex.exerciseId === "barbell_shrug" || ex.exerciseName === "Barbell Shrug" || ex.exerciseName === "Barbell Shrugs") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Barbell Shrug.gif";
        }
        if ((ex.exerciseId === "high_pulley_cable_row" || ex.exerciseName === "High Pulley Cable Row") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "High Pulley Cable Row.gif";
        }
        if ((ex.exerciseId === "cable_pullover" || ex.exerciseName === "Cable Pullover") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Cable Pullover.gif";
        }
        if ((ex.exerciseId === "seated_dips_machine" || ex.exerciseName === "Seated Dips Machine" || ex.exerciseId === "seated_dip_machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Seated Dips Machine.gif";
        }
        if ((ex.exerciseId === "seated_row_machine" || ex.exerciseName === "Seated Row Machine") && (!ex.image || ex.image.endsWith(".jpg"))) {
          ex.image = "Seated Row Machine.gif";
        }
        if (ex.category === "Arms") {
          const lower = (ex.exerciseName || ex.exerciseId || "").toLowerCase();
          ex.category = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
        }
      });
    }
  });

  // Sort workouts newest first
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Mark data as safely loaded and persist validated state
  isDataLoaded = true;
  persistState();
}

// Save Workouts & Exercises to LocalStorage
function persistState() {
  if (!isDataLoaded) return;
  try {
    localStorage.setItem("ironlog_workouts", JSON.stringify(workouts, null, 2));
  } catch (err) {
    console.warn("Error storing workouts in localStorage", err);
  }
  try {
    localStorage.setItem("ironlog_exercises", JSON.stringify(exercises, null, 2));
  } catch (err) {
    console.warn("Error storing exercises in localStorage", err);
  }
  try {
    localStorage.setItem("ironlog_cached_images", JSON.stringify(cachedImages));
  } catch (err) {
    console.warn("Image cache quota exceeded in localStorage, keeping in-memory cache", err);
  }
  updateStats();
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Search Box
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderTimeline();
    });
  }

  // Date Filter
  const dateFilterInput = document.getElementById("dateFilterInput");
  const clearDateFilterBtn = document.getElementById("clearDateFilterBtn");
  if (dateFilterInput) {
    dateFilterInput.addEventListener("change", (e) => {
      selectedDateFilter = e.target.value;
      if (clearDateFilterBtn) clearDateFilterBtn.style.display = selectedDateFilter ? "inline-flex" : "none";
      renderTimeline();
    });
  }
  if (clearDateFilterBtn) {
    clearDateFilterBtn.addEventListener("click", () => {
      selectedDateFilter = "";
      if (dateFilterInput) dateFilterInput.value = "";
      clearDateFilterBtn.style.display = "none";
      renderTimeline();
    });
  }

  // Category Pills
  const pills = document.querySelectorAll(".category-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.getAttribute("data-category");
      renderTimeline();
    });
  });

  // Action Buttons
  document.getElementById("openLogWorkoutBtn")?.addEventListener("click", () => openLogModal());
  document.getElementById("openLibraryBtn")?.addEventListener("click", () => openLibraryModal());
  document.getElementById("openSyncBtn")?.addEventListener("click", () => openSyncModal());

  // Modal Closers
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeAllModals();
    });
  });

  // Modal Backdrop Clicks
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  // Log Modal: Add Exercise button
  document.getElementById("addExerciseToWorkoutBtn")?.addEventListener("click", () => {
    addExerciseItemToLogger();
  });

  // Save Workout Form Submit
  document.getElementById("workoutLogForm")?.addEventListener("submit", handleSaveWorkout);
  document.getElementById("workoutDuration")?.addEventListener("input", function() {
    this.dataset.manuallyEdited = "true";
  });

  // New Exercise Form Submit in Library
  document.getElementById("newExerciseForm")?.addEventListener("submit", handleCreateNewExercise);

  // Download Data JSON Buttons in Sync Modal
  document.getElementById("downloadWorkoutsBtn")?.addEventListener("click", () => {
    downloadJsonFile("workouts.json", workouts);
  });
  document.getElementById("downloadExercisesBtn")?.addEventListener("click", () => {
    downloadJsonFile("exercises.json", exercises);
  });
  document.getElementById("copyWorkoutsJsonBtn")?.addEventListener("click", () => {
    copyToClipboard(JSON.stringify(workouts, null, 2));
    showToast("Workouts JSON copied to clipboard!");
  });

  // Close exercise search results popup on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".exercise-search-container")) {
      document.querySelectorAll(".exercise-search-results").forEach((res) => {
        res.style.display = "none";
      });
    }
  });
}

// ==========================================================================
// Multi-Screen Navigation Architecture (Screens 1, 2, 3)
// ==========================================================================

let currentScreen = "dashboard"; // 'dashboard' | 'day-detail' | 'edit-exercise'
let activeDayDate = null;        // 'YYYY-MM-DD'
let activeEditContext = null;    // { workoutId, exerciseIndex, date }

function navigateToScreen(screenName, params = {}, pushState = true) {
  currentScreen = screenName;

  if (pushState) {
    try {
      window.history.pushState({ screen: screenName, params: params }, "");
    } catch (e) {
      // Ignored in sandbox environments
    }
  }

  const s1 = document.getElementById("screenDashboard");
  const s2 = document.getElementById("screenDayDetail");
  const s3 = document.getElementById("screenEditExercise");

  if (s1) { s1.style.display = "none"; s1.classList.remove("active"); }
  if (s2) { s2.style.display = "none"; s2.classList.remove("active"); }
  if (s3) { s3.style.display = "none"; s3.classList.remove("active"); }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (screenName === "dashboard") {
    if (s1) {
      s1.style.display = "block";
      s1.classList.add("active");
    }
    renderDayTiles();
    updateStats();
  } else if (screenName === "day-detail") {
    activeDayDate = params.date || activeDayDate;
    if (s2) {
      s2.style.display = "block";
      s2.classList.add("active");
    }
    renderDayDetailScreen(activeDayDate);
  } else if (screenName === "edit-exercise") {
    activeEditContext = params;
    if (params.date) activeDayDate = params.date;
    if (s3) {
      s3.style.display = "block";
      s3.classList.add("active");
    }
    renderEditExerciseScreen(activeEditContext);
  }
}

window.addEventListener("popstate", (e) => {
  if (e.state && e.state.screen) {
    navigateToScreen(e.state.screen, e.state.params, false);
  } else {
    navigateToScreen("dashboard", {}, false);
  }
});

// Screen 1: Format date to "Thu, Aug 27, 2026"
function formatDayTileDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// 12-hour time formatter: "10:00" -> "10:00 AM", "14:30" -> "2:30 PM"
function formatTime12Hour(time24) {
  if (!time24) return "";
  const parts = String(time24).trim().split(":");
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Automatically calculate duration from starting and ending time (e.g. "10:00" to "10:15" -> "15 mins")
function calculateDurationFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const normStart = normalizeTimeTo24H(startTime) || startTime;
  const normEnd = normalizeTimeTo24H(endTime) || endTime;
  const startParts = normStart.split(":").map(Number);
  const endParts = normEnd.split(":").map(Number);
  if (startParts.length < 2 || endParts.length < 2) return "";
  if (isNaN(startParts[0]) || isNaN(startParts[1]) || isNaN(endParts[0]) || isNaN(endParts[1])) return "";

  const startTotal = startParts[0] * 60 + startParts[1];
  const endTotal = endParts[0] * 60 + endParts[1];
  let diffMinutes = endTotal - startTotal;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Midnight crossover handling
  }
  if (diffMinutes === 0) return "";
  return formatMinutesToDuration(diffMinutes);
}

// Normalize any time string into valid HTML5 HH:mm format (e.g. "9:15" -> "09:15", "10:00 AM" -> "10:00", "6:15 PM" -> "18:15")
function normalizeTimeTo24H(timeStr) {
  if (!timeStr) return "";
  const s = String(timeStr).trim();
  // Already in HH:mm format (e.g. "10:00", "09:30")
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
    return s;
  }
  // Single-digit hour without AM/PM (e.g. "9:30" -> "09:30")
  if (/^\d:[0-5]\d$/.test(s)) {
    return "0" + s;
  }
  // 12-hour format (e.g. "10:00 AM", "9:30 PM", "9:30pm", "12:15 am")
  const match12 = s.match(/^(\d{1,2}):([0-5]\d)(?:\s*([ap]m))?$/i);
  if (match12) {
    let hrs = parseInt(match12[1], 10);
    const mins = match12[2];
    const meridiem = match12[3] ? match12[3].toLowerCase() : null;

    if (meridiem === "pm" && hrs < 12) hrs += 12;
    if (meridiem === "am" && hrs === 12) hrs = 0;

    if (hrs >= 0 && hrs <= 23) {
      return `${String(hrs).padStart(2, "0")}:${mins}`;
    }
  }
  // Extra precision like "10:00:00"
  if (/^([01]\d|2[0-3]):[0-5]\d:\d\d$/.test(s)) {
    return s.slice(0, 5);
  }
  return "";
}

// Add or subtract minutes from a 24-hour HH:mm time string
function addMinutesToTime(time24, minutes) {
  if (!time24 || minutes === undefined || isNaN(minutes)) return "";
  const norm = normalizeTimeTo24H(time24);
  if (!norm) return "";
  const [h, m] = norm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  let totalMins = (h * 60 + m + minutes) % (24 * 60);
  if (totalMins < 0) totalMins += 24 * 60;
  const newH = String(Math.floor(totalMins / 60)).padStart(2, "0");
  const newM = String(totalMins % 60).padStart(2, "0");
  return `${newH}:${newM}`;
}

// Parse flexible duration strings ("45 mins", "1 hr 15 mins", "1.5h", "30", "01:15") into total minutes
function parseDurationToMinutes(str) {
  if (!str) return 0;
  const s = String(str).toLowerCase().trim();
  if (!s) return 0;

  // 1. Match HH:mm or H:mm format (e.g. "01:30", "1:15", "0:45")
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  // 2. Match combined hr + min patterns (e.g. "1 hr 30 mins", "1 hour 30", "1 hr 30m", "1h 30m")
  const comboMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)?/);
  if (comboMatch) {
    const hrs = parseFloat(comboMatch[1]);
    const mins = parseFloat(comboMatch[2]);
    return Math.round(hrs * 60 + mins);
  }

  let total = 0;
  let matched = false;

  // Match hours (e.g. "1.5 hrs", "2 hours", "1h")
  const hrMatch = s.match(/([\d.]+)\s*(?:h|hr|hrs|hour|hours)/);
  if (hrMatch) {
    total += parseFloat(hrMatch[1]) * 60;
    matched = true;
  }

  // Match minutes (e.g. "45 mins", "30m", "15 minutes")
  const minMatch = s.match(/([\d.]+)\s*(?:m|min|mins|minute|minutes)/);
  if (minMatch) {
    total += parseFloat(minMatch[1]);
    matched = true;
  }

  // Pure number fallback (assumed minutes)
  if (!matched) {
    const num = parseFloat(s);
    if (!isNaN(num)) {
      total = num;
    }
  }

  return Math.round(total);
}

// Format minutes into clean human-readable duration ("45 mins", "1 hr 15 mins")
function formatMinutesToDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "";
  const mins = Math.round(totalMinutes);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0 && remMins > 0) {
    return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${remMins} mins`;
  } else if (hrs > 0) {
    return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  } else {
    return `${remMins} mins`;
  }
}

// Calculate the sum of all workout times performed on a particular day
function calculateTotalMinutesForDate(dateStr) {
  const dayWorkouts = workouts.filter((w) => w.date === dateStr);
  let totalMinutes = 0;

  dayWorkouts.forEach((w) => {
    let exerciseMins = 0;
    let hasExerciseDurations = false;

    if (w.exercises && w.exercises.length > 0) {
      w.exercises.forEach((ex) => {
        const dur = ex.duration || (ex.startTime && ex.endTime ? calculateDurationFromTimes(ex.startTime, ex.endTime) : "");
        if (dur) {
          const parsed = parseDurationToMinutes(dur);
          if (parsed > 0) {
            exerciseMins += parsed;
            hasExerciseDurations = true;
          }
        }
      });
    }

    if (hasExerciseDurations && exerciseMins > 0) {
      totalMinutes += exerciseMins;
    } else if (w.duration && w.duration.trim() !== "") {
      totalMinutes += parseDurationToMinutes(w.duration);
    }
  });

  return totalMinutes;
}

// Retrieve individual workout duration for each workout, or empty string if not available
function getIndividualWorkoutDuration(ex, dayExercises) {
  if (!ex) return "";

  // 1. Explicit exercise-level duration
  if (ex.duration !== undefined && ex.duration !== null) {
    const raw = String(ex.duration).trim();
    if (raw) {
      if (/^\d+$/.test(raw)) {
        const val = parseInt(raw, 10);
        return val > 0 ? (formatMinutesToDuration(val) || `${val} mins`) : "";
      }
      if (raw.toLowerCase() !== "0 mins" && raw.toLowerCase() !== "0 min") {
        return raw;
      }
    }
  }

  // 2. Auto-calculated from starting and ending times
  if (ex.startTime && ex.endTime) {
    const computed = calculateDurationFromTimes(ex.startTime, ex.endTime);
    if (computed && computed !== "0 mins") {
      return computed;
    }
  }

  // 3. Fallback: single-exercise workout session with duration
  if (ex.workoutDuration && String(ex.workoutDuration).trim() && dayExercises) {
    const sameWorkoutExercises = dayExercises.filter((e) => e.workoutId === ex.workoutId);
    if (sameWorkoutExercises.length === 1) {
      const rawW = String(ex.workoutDuration).trim();
      if (rawW && rawW.toLowerCase() !== "0 mins" && rawW.toLowerCase() !== "0 min") {
        return rawW;
      }
    }
  }

  return "";
}

// Sort exercises chronologically by starting time (e.g. 10:00 AM before 10:15 AM)
function sortExercisesByStartTime(exercisesList) {
  if (!exercisesList || !Array.isArray(exercisesList)) return [];
  return [...exercisesList].sort((a, b) => {
    const timeA = a.startTime ? a.startTime.trim() : "";
    const timeB = b.startTime ? b.startTime.trim() : "";

    // Both have starting time: compare chronologically
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    // Items with start time appear before items without
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    return 0; // maintain relative order
  });
}

// Derive body part names (Chest, Biceps, Triceps, Legs, etc.) from the workouts done on a date
function deriveBodyPartsForDate(dateStr) {
  const dayWorkouts = workouts.filter((w) => w.date === dateStr);
  const categories = [];

  dayWorkouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      const catalogEx = getExerciseById(ex.exerciseId) || getExerciseByName(ex.exerciseName);
      let cat = catalogEx ? catalogEx.category : (ex.category || "Other");
      if (cat === "Arms") {
        const lower = (ex.exerciseName || ex.exerciseId || "").toLowerCase();
        cat = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
      }
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });
  });

  if (categories.length === 0) return "General";
  return categories.join(", ");
}

// Retrieve all exercises performed on a date with their workout reference, sorted by start time
function getExercisesForDate(dateStr) {
  const dayWorkouts = workouts.filter((w) => w.date === dateStr);
  const allExercises = [];

  dayWorkouts.forEach((w) => {
    (w.exercises || []).forEach((ex, idx) => {
      allExercises.push({
        ...ex,
        workoutId: w.id,
        workoutNotes: w.notes,
        workoutDuration: w.duration,
        originalIndex: idx
      });
    });
  });

  return sortExercisesByStartTime(allExercises);
}

// ==========================================================================
// SCREEN 1: Dashboard (Day Tiles)
// ==========================================================================

function renderTimeline() {
  renderDayTiles();
}

function renderDayTiles() {
  const container = document.getElementById("dayTilesContainer");
  if (!container) return;

  // Gather unique dates
  const uniqueDates = [...new Set(workouts.map((w) => w.date))];
  uniqueDates.sort((a, b) => new Date(b) - new Date(a));

  // Filter based on search query, category, and date filter
  const filteredDates = uniqueDates.filter((dateStr) => {
    if (selectedDateFilter && dateStr !== selectedDateFilter) return false;

    const dayWorkouts = workouts.filter((w) => w.date === dateStr);

    // Category filter
    if (activeCategory !== "All") {
      const hasCat = dayWorkouts.some((w) =>
        (w.exercises || []).some((ex) => {
          const catEx = getExerciseById(ex.exerciseId) || getExerciseByName(ex.exerciseName);
          let cat = (catEx && catEx.category) || ex.category;
          if (cat === "Arms") {
            const lower = (ex.exerciseName || ex.exerciseId || "").toLowerCase();
            cat = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
          }
          return cat === activeCategory;
        })
      );
      if (!hasCat) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const dateMatch = dateStr.includes(q) || formatDayTileDate(dateStr).toLowerCase().includes(q);
      const bodyPartsMatch = deriveBodyPartsForDate(dateStr).toLowerCase().includes(q);
      const exerciseMatch = dayWorkouts.some((w) =>
        (w.exercises || []).some((ex) =>
          ex.exerciseName.toLowerCase().includes(q) ||
          (ex.variation || "").toLowerCase().includes(q)
        )
      );
      const notesMatch = dayWorkouts.some((w) => (w.notes || "").toLowerCase().includes(q));

      if (!dateMatch && !bodyPartsMatch && !exerciseMatch && !notesMatch) return false;
    }

    return true;
  });

  if (filteredDates.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🏋️‍♂️</div>
        <h3 class="empty-title">No Workout Days Found</h3>
        <p class="empty-subtitle">
          ${workouts.length === 0 
            ? "You haven't logged any workouts yet. Click '+ Log Workout' to start your first session!" 
            : "No days match your current filter or search criteria."}
        </p>
        <button class="btn btn-primary" onclick="openLogModal()">+ Log Workout</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredDates
    .map((dateStr) => {
      const formattedDate = formatDayTileDate(dateStr);
      const relativeTag = getRelativeDateTag(dateStr);
      const bodyParts = deriveBodyPartsForDate(dateStr);
      const totalDayMins = calculateTotalMinutesForDate(dateStr);
      const formattedDayTime = totalDayMins > 0 ? formatMinutesToDuration(totalDayMins) : "";

      const dayExercises = getExercisesForDate(dateStr);
      let totalSetsCount = 0;
      dayExercises.forEach((ex) => {
        totalSetsCount += (ex.sets || []).length;
      });

      return `
        <div class="day-tile-card" onclick="navigateToScreen('day-detail', { date: '${dateStr}' })">
          <div class="day-tile-top">
            <!-- Line 1: Date formatted like Thu, Aug 27, 2026 -->
            <div class="day-tile-date">
              <span>${escapeHtml(formattedDate)}</span>
              ${relativeTag}
            </div>
            <!-- Line 2: Body part name like chest, arms, legs -->
            <div class="day-tile-bodyparts">
              <span>💪</span>
              <span>${escapeHtml(bodyParts)}</span>
            </div>
          </div>

          <!-- Bottom meta stats row -->
          <div class="day-tile-meta">
            <div class="day-tile-meta-stats">
              ${formattedDayTime ? `<span class="workout-duration-badge" style="font-size: 0.75rem; padding: 0.15rem 0.5rem;">⏱️ ${escapeHtml(formattedDayTime)}</span>` : ""}
              <span>🏋️ ${dayExercises.length} ${dayExercises.length === 1 ? 'exercise' : 'exercises'} • ${totalSetsCount} sets</span>
            </div>
            <span class="day-tile-arrow">View Exercises →</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// Resolve the best available image/GIF src for an exercise
function getResolvedExerciseImage(ex, catalogEx) {
  const cat = catalogEx || {};
  const exercise = ex || {};
  const name = cat.name || exercise.exerciseName || exercise.name || "exercise";
  const exId = cat.id || exercise.exerciseId || name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const baseSanitized = getSanitizedFilename(name, "");

  // 1. Check in-memory / localStorage cachedImages
  const candidateKeys = [
    exercise.image,
    cat.image,
    `${baseSanitized}.gif`,
    `${baseSanitized}.jpg`,
    `${baseSanitized}.jpeg`,
    `${baseSanitized}.png`,
    `${baseSanitized}.webp`,
    `${exId}.gif`,
    `${exId}.jpg`,
    `${exId}.png`,
    name,
    exercise.exerciseName
  ].filter(Boolean);

  if (baseSanitized.includes("dumbell")) {
    const fixed = baseSanitized.replace(/dumbell/g, "dumbbell");
    candidateKeys.push(`${fixed}.gif`, `${fixed}.jpg`, `${fixed}.png`, fixed);
  } else if (baseSanitized.includes("dumbbell")) {
    const typo = baseSanitized.replace(/dumbbell/g, "dumbell");
    candidateKeys.push(`${typo}.gif`, `${typo}.jpg`, `${typo}.png`, typo);
  }

  for (const key of candidateKeys) {
    if (cachedImages && cachedImages[key]) {
      return {
        src: cachedImages[key],
        imageName: key,
        isGif: key.toLowerCase().endsWith(".gif") || (typeof cachedImages[key] === "string" && cachedImages[key].startsWith("data:image/gif"))
      };
    }
  }

  // 2. Known local files in images/workouts/
  const knownLocalMap = {
    "dumbbell_bicep_curl": "dumbbell_bicep_curl.gif",
    "dumbell_bicep_curl": "dumbbell_bicep_curl.gif",
    "dumbbell_biceps_curl": "dumbbell_bicep_curl.gif",
    "dumbell_biceps_curl": "dumbbell_bicep_curl.gif",
    "dumbbell_lateral_raises": "dumbbell_lateral_raises.gif",
    "dumbell_lateral_raises": "dumbbell_lateral_raises.gif",
    "dumbell_lateral_raise": "dumbbell_lateral_raises.gif",
    "lat_pull_down": "lat_pull_down.gif",
    "lat_pulldown_wide_grip": "lat_pull_down.gif",
    "dumbbell_pullover": "Dumbbell Pullover.gif",
    "dumbell_pullover": "Dumbbell Pullover.gif",
    "smith_machine_shoulder_press": "Smith Machine Shoulder Press.gif",
    "reverse_pec_deck_fly_machine": "Reverse Pec Deck Fly Machine.gif",
    "reverse_pec_deck_flyes": "Reverse Pec Deck Fly Machine.gif",
    "reverse_pec_deck": "Reverse Pec Deck Fly Machine.gif",
    "pec_deck_machine_flyes": "Pec Deck Fly Machine.gif",
    "pec_deck_fly_machine": "Pec Deck Fly Machine.gif",
    "pec_deck": "Pec Deck Fly Machine.gif",
    "barbell_shrug": "Barbell Shrug.gif",
    "barbell_shrugs": "Barbell Shrug.gif",
    "high_pulley_cable_row": "High Pulley Cable Row.gif",
    "high_pulley_cable_rows": "High Pulley Cable Row.gif",
    "cable_pullover": "Cable Pullover.gif",
    "cable_pullovers": "Cable Pullover.gif",
    "seated_dips_machine": "Seated Dips Machine.gif",
    "seated_dip_machine": "Seated Dips Machine.gif",
    "seated_row_machine": "Seated Row Machine.gif",
    "seated_rows_machine": "Seated Row Machine.gif"
  };

  const matchedLocal = knownLocalMap[exId] || knownLocalMap[baseSanitized];
  if (matchedLocal) {
    return {
      src: `images/workouts/${matchedLocal}`,
      imageName: matchedLocal,
      isGif: matchedLocal.toLowerCase().endsWith(".gif")
    };
  }

  // 3. Fallback to specified or default filename (.gif prioritized if catalog says gif, else jpg)
  const preferredName = exercise.image || cat.image || `${baseSanitized}.gif`;
  return {
    src: `images/workouts/${preferredName}`,
    imageName: preferredName,
    isGif: preferredName.toLowerCase().endsWith(".gif")
  };
}

// ==========================================================================
// SCREEN 2: Day Detail (Exercise Tiles)
// ==========================================================================

function renderDayDetailScreen(dateStr) {
  const headerContainer = document.getElementById("dayDetailInfoHeader");
  const tilesContainer = document.getElementById("exerciseTilesContainer");
  if (!headerContainer || !tilesContainer) return;

  const formattedDate = formatDayTileDate(dateStr);
  const relativeTag = getRelativeDateTag(dateStr);
  const bodyParts = deriveBodyPartsForDate(dateStr);
  const totalDayMins = calculateTotalMinutesForDate(dateStr);
  const formattedDayTime = totalDayMins > 0 ? formatMinutesToDuration(totalDayMins) : "";

  const dayWorkouts = workouts.filter((w) => w.date === dateStr);
  const dayNotes = dayWorkouts.map((w) => w.notes).filter(Boolean).join(" • ");

  headerContainer.innerHTML = `
    <!-- Line 1: Date -->
    <div class="day-detail-date-line">
      <span>📅 ${escapeHtml(formattedDate)}</span>
      ${relativeTag}
      ${formattedDayTime ? `<span class="workout-duration-badge">⏱️ Total Day Time: ${escapeHtml(formattedDayTime)}</span>` : ""}
    </div>

    <!-- Line 2: Body parts affected -->
    <div class="day-detail-bodyparts-line">
      <span>Target Muscle Groups:</span>
      <span style="color: var(--text-main); font-weight: 700;">${escapeHtml(bodyParts)}</span>
    </div>

    ${dayNotes ? `
      <div class="workout-notes-box" style="margin-top: 0.85rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>${escapeHtml(dayNotes)}</span>
      </div>
    ` : ""}
  `;

  // Get all exercises for this day and SORT chronologically by starting time!
  const dayExercises = getExercisesForDate(dateStr);

  // Hook Screen 2 action buttons
  const addBtn = document.getElementById("screen2AddExerciseBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      let firstWorkout = dayWorkouts[0];
      if (!firstWorkout) {
        firstWorkout = {
          id: `workout_${dateStr.replace(/-/g, "_")}_${Date.now().toString().slice(-4)}`,
          date: dateStr,
          duration: "",
          notes: "",
          exercises: []
        };
        workouts.unshift(firstWorkout);
        persistState();
      }
      navigateToScreen("edit-exercise", {
        workoutId: firstWorkout.id,
        exerciseIndex: -1,
        date: dateStr
      });
    };
  }

  const delDayBtn = document.getElementById("screen2DeleteDayBtn");
  if (delDayBtn) {
    delDayBtn.onclick = () => {
      if (!confirm(`Are you sure you want to delete all workout logs for ${formattedDate}?`)) return;
      workouts = workouts.filter((w) => w.date !== dateStr);
      persistState();
      showToast("Day workout deleted.");
      navigateToScreen("dashboard");
    };
  }

  if (dayExercises.length === 0) {
    tilesContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🏋️‍♂️</div>
        <h3 class="empty-title">No Exercises Logged for this Day</h3>
        <p class="empty-subtitle">Click "+ Add Exercise to Day" above to log your first exercise for ${escapeHtml(formattedDate)}.</p>
      </div>
    `;
    return;
  }

  tilesContainer.innerHTML = dayExercises
    .map((ex, idx) => {
      const catalogEx = getExerciseById(ex.exerciseId) || getExerciseByName(ex.exerciseName) || {
        id: ex.exerciseId || getSanitizedFilename(ex.exerciseName, ""),
        name: ex.exerciseName,
        category: ex.category || "Chest",
        variation: ex.variation || "Standard",
        image: ex.image || getSanitizedFilename(ex.exerciseName, "gif")
      };

      const imgInfo = getResolvedExerciseImage(ex, catalogEx);
      const imageName = imgInfo.imageName;
      const isGif = imgInfo.isGif;
      let category = catalogEx.category || ex.category || "Chest";
      if (category === "Arms") {
        const lower = (catalogEx.name || ex.exerciseName || "").toLowerCase();
        category = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
      }
      const icon = CATEGORY_ICONS[category] || "🏋️";
      const imgSrc = imgInfo.src;

      // Extra information (like Side Delt Dumbbell)
      const extraInfo = ex.variation || catalogEx.variation || "";

      // Individual workout duration: show when available, omit completely when not available
      const individualDuration = getIndividualWorkoutDuration(ex, dayExercises);
      const durBadgeLabel = individualDuration
        ? (individualDuration.toLowerCase().startsWith("duration")
            ? individualDuration
            : `Duration: ${individualDuration}`)
        : "";

      // Attempted time display: e.g. "🕒 10:00 AM – 10:15 AM"
      let timeHtml = "";
      if (ex.startTime && ex.endTime) {
        timeHtml = `<div class="exercise-tile-time"><span>🕒 ${formatTime12Hour(ex.startTime)} – ${formatTime12Hour(ex.endTime)}</span></div>`;
      } else if (ex.startTime) {
        timeHtml = `<div class="exercise-tile-time"><span>🕒 Started: ${formatTime12Hour(ex.startTime)}</span></div>`;
      }

      // Sets table rows
      const setsRows = (ex.sets || []).map((s, sIdx) => `
        <tr>
          <td><span class="set-num-badge">${s.set || sIdx + 1}</span></td>
          <td>${formatWeight(s.weight)}</td>
          <td>${escapeHtml(String(s.reps || "-"))} reps</td>
        </tr>
      `).join("");

      return `
        <div class="exercise-tile-card" onclick="navigateToScreen('edit-exercise', { workoutId: '${ex.workoutId}', exerciseIndex: ${ex.originalIndex}, exerciseId: '${catalogEx.id}', exerciseName: '${escapeHtml(ex.exerciseName).replace(/'/g, "\\'")}', date: '${dateStr}' })">
          <!-- Background Workout Image Layer -->
          <div class="exercise-tile-bg-layer">
            <img 
              src="${imgSrc}" 
              alt="${escapeHtml(catalogEx.name)}" 
              class="exercise-tile-bg-img exercise-tile-img"
              onerror="handleImageFallback(this, '${catalogEx.id}')" 
            />
            <div class="exercise-tile-bg-gradient"></div>
          </div>

          <!-- Elevated Content -->
          <div class="exercise-tile-content">
            <div class="exercise-tile-header">
              <div class="exercise-tile-details">
                <div class="exercise-tile-title-row">
                  <h4 class="exercise-tile-title">${escapeHtml(ex.exerciseName)}</h4>
                  <div class="exercise-tile-actions">
                    ${isGif ? `<span class="gif-badge" style="position: static;">GIF</span>` : ""}
                    <button 
                      type="button" 
                      class="tile-zoom-btn" 
                      onclick="event.stopPropagation(); openLightbox('${catalogEx.id}', '${imgSrc}', '${category}', '${escapeHtml(extraInfo).replace(/'/g, "\\'")}')" 
                      title="Zoom Workout Image / GIF"
                    >
                      🔍 Zoom
                    </button>
                  </div>
                </div>

                <div class="exercise-tile-meta">
                  <span class="category-tag ${category}">${icon} ${category}</span>
                  ${extraInfo ? `<span class="exercise-tile-extra">${escapeHtml(extraInfo)}</span>` : ""}
                  ${individualDuration ? `<span class="exercise-duration-badge" title="Individual Workout Duration">⏱️ ${escapeHtml(durBadgeLabel)}</span>` : ""}
                </div>

                ${timeHtml}
              </div>
            </div>

            <!-- Sets Information -->
            <div class="exercise-tile-sets">
              <table class="sets-table" style="margin: 0;">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Weight</th>
                    <th>Reps</th>
                  </tr>
                </thead>
                <tbody>
                  ${setsRows || `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No sets recorded</td></tr>`}
                </tbody>
              </table>
            </div>

            <!-- Action Footer -->
            <div class="exercise-tile-footer">
              <span style="color: var(--text-muted);">Order #${idx + 1}${individualDuration ? ` • ⏱️ ${escapeHtml(individualDuration)}` : ""}</span>
              <span class="tile-edit-hint">Click to edit →</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ==========================================================================
// SCREEN 3: Edit Workout / Exercise
// ==========================================================================

function renderEditExerciseScreen(context) {
  const cardContainer = document.getElementById("editScreenCardContainer");
  const titleEl = document.getElementById("screen3Title");
  const backBtn = document.getElementById("screen3BackBtn");
  if (!cardContainer) return;

  const workoutId = context.workoutId;
  const exerciseIndex = context.exerciseIndex;
  const dateStr = context.date || activeDayDate;

  let workout = workouts.find((w) => w.id && w.id === workoutId);
  if (!workout && dateStr) {
    workout = workouts.find((w) => w.date === dateStr);
  }
  if (!workout && (context.exerciseId || context.exerciseName)) {
    workout = workouts.find((w) => (w.exercises || []).some((e) => e.exerciseId === context.exerciseId || e.exerciseName === context.exerciseName));
  }

  const numIndex = (exerciseIndex !== undefined && exerciseIndex !== null && exerciseIndex !== -1) ? parseInt(exerciseIndex, 10) : -1;
  let isAddMode = numIndex === -1 || !workout || !workout.exercises || !workout.exercises[numIndex];

  let exData = null;
  if (!isAddMode) {
    exData = workout.exercises[numIndex];
  } else if (workout && workout.exercises && (context.exerciseId || context.exerciseName)) {
    exData = workout.exercises.find((e) => e.exerciseId === context.exerciseId || e.exerciseName === context.exerciseName);
    if (exData) isAddMode = false;
  }

  if (!exData) {
    const matchedCatalog = (context.exerciseId ? getExerciseById(context.exerciseId) : null) ||
      (context.exerciseName ? getExerciseByName(context.exerciseName) : null) ||
      null;

    if (matchedCatalog) {
      exData = {
        exerciseId: matchedCatalog.id,
        exerciseName: matchedCatalog.name,
        category: matchedCatalog.category,
        variation: matchedCatalog.variation || "Standard",
        image: matchedCatalog.image,
        startTime: "",
        endTime: "",
        duration: "",
        sets: [
          { set: 1, weight: "2 plates", reps: 10 }
        ]
      };
    } else {
      const initName = context.exerciseName || "";
      const initId = context.exerciseId || (initName ? getSanitizedFilename(initName, "") : "");
      if (initName) {
        const lowerInit = initName.toLowerCase();
        const initCategory = (lowerInit.includes("tricep") || lowerInit.includes("skull") || lowerInit.includes("close_grip") || lowerInit.includes("close-grip"))
          ? "Triceps"
          : (lowerInit.includes("bicep") || lowerInit.includes("curl") ? "Biceps" : "Chest");
        exData = {
          exerciseId: initId,
          exerciseName: initName,
          category: initCategory,
          variation: "Standard",
          image: getSanitizedFilename(initName, "gif"),
          startTime: "",
          endTime: "",
          duration: "",
          sets: [
            { set: 1, weight: "2 plates", reps: 10 }
          ]
        };
      } else {
        const firstEx = exercises[0] || { id: "barbell_bench_press", name: "Barbell Bench Press", category: "Chest", variation: "Flat Barbell" };
        exData = {
          exerciseId: firstEx.id,
          exerciseName: firstEx.name,
          category: firstEx.category,
          variation: firstEx.variation || "Standard",
          image: firstEx.image,
          startTime: "",
          endTime: "",
          duration: "",
          sets: [
            { set: 1, weight: "2 plates", reps: 10 }
          ]
        };
      }
    }
  }

  // Derive effective duration so it is NEVER blank when known (resolves fallback from session/workout level)
  let effectiveDuration = "";
  if (exData.duration && String(exData.duration).trim()) {
    effectiveDuration = String(exData.duration).trim();
  } else if (exData.startTime && exData.endTime) {
    effectiveDuration = calculateDurationFromTimes(exData.startTime, exData.endTime);
  } else if (workout && workout.exercises && workout.exercises.length === 1 && workout.duration && String(workout.duration).trim()) {
    effectiveDuration = String(workout.duration).trim();
  } else if (workout && workout.duration && String(workout.duration).trim()) {
    effectiveDuration = String(workout.duration).trim();
  }

  // Ensure exData has this duration populated so it saves cleanly
  if (!exData.duration && effectiveDuration) {
    exData.duration = effectiveDuration;
  }

  const effectiveStartTime = normalizeTimeTo24H(exData.startTime);
  const effectiveEndTime = normalizeTimeTo24H(exData.endTime);

  const catalogEx = getExerciseById(exData.exerciseId) || getExerciseByName(exData.exerciseName) || exercises[0] || {
    id: exData.exerciseId || getSanitizedFilename(exData.exerciseName, ""),
    name: exData.exerciseName || "Exercise",
    category: "Chest",
    variation: "Standard",
    image: getSanitizedFilename(exData.exerciseName || "exercise", "gif")
  };

  let currentCategory = exData.category || catalogEx.category || "Chest";
  if (currentCategory === "Arms") {
    const lower = (exData.exerciseName || catalogEx.name || "").toLowerCase();
    currentCategory = (lower.includes("tricep") || lower.includes("skull") || lower.includes("close_grip") || lower.includes("close-grip")) ? "Triceps" : "Biceps";
  }
  const currentVariation = exData.variation || catalogEx.variation || "";
  const currentImgInfo = getResolvedExerciseImage(exData, catalogEx);

  if (titleEl) {
    titleEl.textContent = isAddMode ? `+ Add Exercise to ${formatDayTileDate(dateStr)}` : `✏️ Edit Workout: ${exData.exerciseName}`;
  }

  if (backBtn) {
    backBtn.onclick = () => {
      navigateToScreen("day-detail", { date: dateStr });
    };
  }

  const setsHtml = (exData.sets || [ { set: 1, weight: "2 plates", reps: 10 } ])
    .map((s, idx) => {
      let rawWeight = s.weight || "";
      let unit = "kg";
      const lower = rawWeight.toLowerCase();
      if (lower.includes("plate")) {
        unit = "plates";
        rawWeight = rawWeight.replace(/plates?/gi, "").trim();
      } else if (lower.includes("lbs") || lower.includes("lb")) {
        unit = "lbs";
        rawWeight = rawWeight.replace(/lbs?/gi, "").trim();
      } else if (lower.includes("kg")) {
        unit = "kg";
        rawWeight = rawWeight.replace(/kg/gi, "").trim();
      } else if (lower.includes("bodyweight") || lower.includes("bw")) {
        unit = "BW";
        rawWeight = "Bodyweight";
      }

      return `
        <div class="sets-builder-row edit-set-row">
          <div><span class="set-num-badge">${idx + 1}</span></div>
          <div><input type="text" class="form-input edit-set-weight-val" value="${escapeHtml(rawWeight)}" placeholder="e.g. 2, 80 or Bodyweight" /></div>
          <div>
            <select class="form-select edit-set-weight-unit">
              <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
              <option value="lbs" ${unit === 'lbs' ? 'selected' : ''}>lbs</option>
              <option value="plates" ${unit === 'plates' ? 'selected' : ''}>plates</option>
              <option value="BW" ${unit === 'BW' ? 'selected' : ''}>bodyweight</option>
            </select>
          </div>
          <div><input type="number" class="form-input edit-set-reps" value="${escapeHtml(String(s.reps || 10))}" placeholder="Reps" min="1" required /></div>
          <div><button type="button" class="btn btn-icon btn-sm btn-danger" onclick="this.closest('.edit-set-row').remove(); updateEditSetNumbers();">✕</button></div>
        </div>
      `;
    })
    .join("");

  cardContainer.innerHTML = `
    <form id="editExerciseScreenForm" onsubmit="handleSaveEditedExercise(event, '${workoutId}', ${exerciseIndex}, '${dateStr}')">
      <!-- Exercise Selection -->
      <div class="form-group exercise-search-container" style="margin-bottom: 1.25rem;">
        <label class="form-label">
          <span>Workout / Exercise Name</span>
          <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: normal;">Type to search catalog</span>
        </label>
        <div class="exercise-search-input-wrap">
          <input 
            type="text" 
            id="editExSearchInput" 
            class="form-input" 
            value="${escapeHtml(exData.exerciseName)}" 
            placeholder="Search exercise (e.g. Lat, Back, Bench)..." 
            autocomplete="off"
            oninput="handleEditExSearchInput(this.value)"
            onfocus="handleEditExSearchInput(this.value)"
            required
          />
          <input type="hidden" id="editExIdVal" value="${catalogEx.id}" />
        </div>
        <div class="exercise-search-results" id="editExSearchResults" style="display: none;"></div>
      </div>

      <!-- Body Part Affected & Extra Information -->
      <div class="form-row" style="margin-bottom: 1.25rem;">
        <div class="form-group">
          <label class="form-label" for="editExCategory">Body Part Affected</label>
          <select id="editExCategory" class="form-select">
            <option value="Chest" ${currentCategory === 'Chest' ? 'selected' : ''}>🏋️ Chest</option>
            <option value="Back" ${currentCategory === 'Back' ? 'selected' : ''}>🧗 Back</option>
            <option value="Legs" ${currentCategory === 'Legs' ? 'selected' : ''}>🦵 Legs</option>
            <option value="Shoulders" ${currentCategory === 'Shoulders' ? 'selected' : ''}>🦾 Shoulders</option>
            <option value="Biceps" ${currentCategory === 'Biceps' ? 'selected' : ''}>💪 Biceps</option>
            <option value="Triceps" ${currentCategory === 'Triceps' ? 'selected' : ''}>🦾 Triceps</option>
            <option value="Core" ${currentCategory === 'Core' ? 'selected' : ''}>⚡ Core</option>
            <option value="Cardio" ${currentCategory === 'Cardio' ? 'selected' : ''}>🏃 Cardio</option>
            <option value="Other" ${currentCategory === 'Other' ? 'selected' : ''}>General</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="editExVariation">
            <span>Extra Information / Variation</span>
            <span class="optional-tag">(e.g. Side Delt Dumbbell, Wide Grip)</span>
          </label>
          <input type="text" id="editExVariation" class="form-input" value="${escapeHtml(currentVariation)}" placeholder="e.g. Side Delt Dumbbell, Wide Grip, Incline 30°" />
        </div>
      </div>

      <!-- Start Time, End Time & Auto-Calculated Duration -->
      <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem;">
          <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">⏱️ Workout Attempt Time & Duration</span>
          <span class="optional-tag" style="font-size: 0.75rem;">(Orders workouts chronologically)</span>
        </div>
        <div class="time-inputs-grid">
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">🕒 Starting Time</label>
            <input type="time" id="editExStartTime" class="form-input" value="${effectiveStartTime}" oninput="handleEditScreenTimesChange()" onchange="handleEditScreenTimesChange()" />
          </div>
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">🕒 Ending Time</label>
            <input type="time" id="editExEndTime" class="form-input" value="${effectiveEndTime}" oninput="handleEditScreenTimesChange()" onchange="handleEditScreenTimesChange()" />
          </div>
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">⏱️ Duration</label>
            <input type="text" id="editExDuration" class="form-input" value="${escapeHtml(effectiveDuration)}" placeholder="e.g. 15 mins" oninput="handleEditDurationInputChange()" />
          </div>
        </div>
        <p id="editTimeInfoHint" style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.6rem; margin-bottom: 0;">
          ${effectiveStartTime && effectiveEndTime 
            ? `💡 Time range: <strong>${formatTime12Hour(effectiveStartTime)} – ${formatTime12Hour(effectiveEndTime)}</strong> (${escapeHtml(effectiveDuration)}).` 
            : effectiveDuration 
              ? `💡 Duration is set to <strong>${escapeHtml(effectiveDuration)}</strong>. If you enter a Starting Time, Ending Time will automatically be calculated.` 
              : `💡 When starting and ending times are set, duration calculates automatically. All workouts on this day are arranged chronologically by starting time.`}
        </p>
      </div>

      <!-- Sets Table Builder -->
      <div class="sets-builder-container" style="margin-bottom: 1.25rem;">
        <div class="sets-builder-row sets-builder-header">
          <div>Set</div>
          <div>Weight</div>
          <div>Unit</div>
          <div>Reps</div>
          <div></div>
        </div>
        <div class="sets-rows-list" id="editSetsRowsList">
          ${setsHtml}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 0.65rem;" onclick="addEditSetRow()">
          + Add Set
        </button>
      </div>

      <!-- Image & GIF Uploader -->
      <div class="image-renamer-box" style="margin-bottom: 1.5rem;">
        <div class="image-renamer-header">
          <span>📸 Workout Media (Image or Animated GIF)</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted);">
          Select any <strong>.jpg</strong>, <strong>.jpeg</strong>, <strong>.png</strong>, or animated <strong>.gif</strong> to attach it to this workout.
        </p>
        <input type="hidden" id="editExImageVal" value="${escapeHtml(exData.image || catalogEx.image || currentImgInfo.imageName || '')}" />
        <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" id="editExFileInput" style="display: none;" onchange="handleEditImageFileSelected(this)" />
        <div id="editExImagePreviewArea" class="image-preview-area" style="${currentImgInfo.src ? 'display: flex;' : 'display: none;'}">
          ${currentImgInfo.src ? `
            <img src="${currentImgInfo.src}" class="image-preview-thumb" alt="Preview" onerror="handleImageFallback(this, '${catalogEx.id}')" />
            <div class="image-preview-info">
              <div>Attached Media: <code>${escapeHtml(currentImgInfo.imageName)}</code></div>
            </div>
          ` : ''}
        </div>
        <button type="button" class="btn btn-secondary btn-sm upload-btn" onclick="document.getElementById('editExFileInput').click()">
          ${currentImgInfo.src ? '🔄 Change Photo or GIF' : '📁 Select Photo or GIF'}
        </button>
      </div>

      <!-- Form Action Buttons -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <div style="display: flex; gap: 0.75rem;">
          <button type="submit" class="btn btn-primary">
            💾 Save Changes
          </button>
          <button type="button" class="btn btn-secondary" onclick="navigateToScreen('day-detail', { date: '${dateStr}' })">
            Cancel
          </button>
        </div>
        ${!isAddMode ? `
          <button type="button" class="btn btn-danger btn-sm" onclick="handleDeleteEditedExercise('${workoutId}', ${exerciseIndex}, '${dateStr}')">
            🗑️ Delete Exercise
          </button>
        ` : ""}
      </div>
    </form>
  `;
}

function handleEditScreenTimesChange() {
  const startInput = document.getElementById("editExStartTime");
  const endInput = document.getElementById("editExEndTime");
  const durInput = document.getElementById("editExDuration");
  const hintEl = document.getElementById("editTimeInfoHint");

  if (startInput && endInput && durInput) {
    const s = startInput.value.trim();
    const e = endInput.value.trim();
    const currentDur = durInput.value.trim();

    if (s && e) {
      const dur = calculateDurationFromTimes(s, e);
      if (dur) {
        durInput.value = dur;
        if (hintEl) {
          hintEl.innerHTML = `💡 Time range: <strong>${formatTime12Hour(s)} – ${formatTime12Hour(e)}</strong>. Duration auto-calculated to <strong>${escapeHtml(dur)}</strong>.`;
        }
      }
    } else if (s && !e && currentDur) {
      const parsedMins = parseDurationToMinutes(currentDur);
      if (parsedMins > 0) {
        const autoEnd = addMinutesToTime(s, parsedMins);
        if (autoEnd) {
          endInput.value = autoEnd;
          if (hintEl) {
            hintEl.innerHTML = `💡 Ending time auto-calculated to <strong>${formatTime12Hour(autoEnd)}</strong> based on starting time (${formatTime12Hour(s)}) and duration (${escapeHtml(currentDur)}).`;
          }
        }
      }
    } else if (!s && e && currentDur) {
      const parsedMins = parseDurationToMinutes(currentDur);
      if (parsedMins > 0) {
        const autoStart = addMinutesToTime(e, -parsedMins);
        if (autoStart) {
          startInput.value = autoStart;
          if (hintEl) {
            hintEl.innerHTML = `💡 Starting time auto-calculated to <strong>${formatTime12Hour(autoStart)}</strong> based on ending time (${formatTime12Hour(e)}) and duration (${escapeHtml(currentDur)}).`;
          }
        }
      }
    }
  }
}

function handleEditDurationInputChange() {
  const startInput = document.getElementById("editExStartTime");
  const endInput = document.getElementById("editExEndTime");
  const durInput = document.getElementById("editExDuration");
  const hintEl = document.getElementById("editTimeInfoHint");

  if (startInput && endInput && durInput) {
    const s = startInput.value.trim();
    const durStr = durInput.value.trim();
    const parsedMins = parseDurationToMinutes(durStr);
    if (s && parsedMins > 0) {
      const autoEnd = addMinutesToTime(s, parsedMins);
      if (autoEnd) {
        endInput.value = autoEnd;
        if (hintEl) {
          hintEl.innerHTML = `💡 Ending time updated to <strong>${formatTime12Hour(autoEnd)}</strong> based on duration (${escapeHtml(durStr)}).`;
        }
      }
    }
  }
}

function handleEditExSearchInput(query) {
  const resultsBox = document.getElementById("editExSearchResults");
  if (!resultsBox) return;

  const matches = searchExercises(query);
  if (matches.length === 0) {
    resultsBox.style.display = "none";
    return;
  }

  resultsBox.innerHTML = matches.map((ex) => {
    const icon = CATEGORY_ICONS[ex.category] || "🏋️";
    return `
      <div class="search-result-item" onclick="selectEditExerciseFromResult('${ex.id}')">
        <div>
          <div class="result-title"><span>${icon}</span> <span>${escapeHtml(ex.name)}</span></div>
          <div class="result-variation">${escapeHtml(ex.variation || 'Standard')}</div>
        </div>
        <span class="category-tag ${ex.category}">${ex.category}</span>
      </div>
    `;
  }).join("");

  resultsBox.style.display = "flex";
}

function selectEditExerciseFromResult(exId) {
  const ex = getExerciseById(exId);
  if (!ex) return;

  const nameInput = document.getElementById("editExSearchInput");
  const idInput = document.getElementById("editExIdVal");
  const catSelect = document.getElementById("editExCategory");
  const varInput = document.getElementById("editExVariation");
  const resultsBox = document.getElementById("editExSearchResults");
  const imgValInput = document.getElementById("editExImageVal");
  const previewArea = document.getElementById("editExImagePreviewArea");

  if (nameInput) nameInput.value = ex.name;
  if (idInput) idInput.value = ex.id;
  if (catSelect) catSelect.value = ex.category;
  if (varInput) varInput.value = ex.variation || "Standard";
  if (resultsBox) resultsBox.style.display = "none";

  const imgInfo = getResolvedExerciseImage({ exerciseId: ex.id, exerciseName: ex.name }, ex);
  if (imgValInput) imgValInput.value = imgInfo.imageName || ex.image || "";
  if (previewArea) {
    if (imgInfo.src) {
      previewArea.style.display = "flex";
      previewArea.innerHTML = `
        <img src="${imgInfo.src}" class="image-preview-thumb" alt="${escapeHtml(ex.name)}" onerror="handleImageFallback(this, '${ex.id}')" />
        <div class="image-preview-info">
          <div>Attached Media: <code>${escapeHtml(imgInfo.imageName)}</code></div>
        </div>
      `;
    } else {
      previewArea.style.display = "none";
      previewArea.innerHTML = "";
    }
  }
}

function addEditSetRow() {
  const list = document.getElementById("editSetsRowsList");
  if (!list) return;

  const existingRows = list.querySelectorAll(".edit-set-row");
  let prevWeight = "";
  let prevUnit = "kg";
  let prevReps = "10";

  if (existingRows.length > 0) {
    const lastRow = existingRows[existingRows.length - 1];
    const weightInput = lastRow.querySelector(".edit-set-weight-val");
    const unitSelect = lastRow.querySelector(".edit-set-weight-unit");
    const repsInput = lastRow.querySelector(".edit-set-reps");

    if (weightInput && weightInput.value.trim()) prevWeight = weightInput.value.trim();
    if (unitSelect) prevUnit = unitSelect.value;
    if (repsInput && repsInput.value.trim()) prevReps = repsInput.value.trim();
  }

  const currentCount = existingRows.length + 1;
  const row = document.createElement("div");
  row.className = "sets-builder-row edit-set-row";
  row.innerHTML = `
    <div><span class="set-num-badge">${currentCount}</span></div>
    <div><input type="text" class="form-input edit-set-weight-val" value="${escapeHtml(prevWeight)}" placeholder="e.g. 2, 80 or Bodyweight" /></div>
    <div>
      <select class="form-select edit-set-weight-unit">
        <option value="kg" ${prevUnit === 'kg' ? 'selected' : ''}>kg</option>
        <option value="lbs" ${prevUnit === 'lbs' ? 'selected' : ''}>lbs</option>
        <option value="plates" ${prevUnit === 'plates' ? 'selected' : ''}>plates</option>
        <option value="BW" ${prevUnit === 'BW' ? 'selected' : ''}>bodyweight</option>
      </select>
    </div>
    <div><input type="number" class="form-input edit-set-reps" value="${escapeHtml(prevReps)}" placeholder="Reps" min="1" required /></div>
    <div><button type="button" class="btn btn-icon btn-sm btn-danger" onclick="this.closest('.edit-set-row').remove(); updateEditSetNumbers();">✕</button></div>
  `;
  list.appendChild(row);
}

function updateEditSetNumbers() {
  const rows = document.querySelectorAll("#editSetsRowsList .edit-set-row");
  rows.forEach((row, idx) => {
    const badge = row.querySelector(".set-num-badge");
    if (badge) badge.textContent = idx + 1;
  });
}

function handleSaveEditedExercise(e, workoutId, exerciseIndex, dateStr) {
  e.preventDefault();

  const nameInput = document.getElementById("editExSearchInput");
  const idInput = document.getElementById("editExIdVal");
  const catSelect = document.getElementById("editExCategory");
  const varInput = document.getElementById("editExVariation");
  const startInput = document.getElementById("editExStartTime");
  const endInput = document.getElementById("editExEndTime");
  const durInput = document.getElementById("editExDuration");

  const exName = nameInput ? nameInput.value.trim() : "";
  const exId = idInput ? idInput.value : (exName.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const category = catSelect ? catSelect.value : "Chest";
  const variation = varInput ? varInput.value.trim() : "";
  const startTime = startInput ? normalizeTimeTo24H(startInput.value.trim()) : "";
  const endTime = endInput ? normalizeTimeTo24H(endInput.value.trim()) : "";
  let duration = durInput ? durInput.value.trim() : "";

  if (startTime && endTime && !duration) {
    duration = calculateDurationFromTimes(startTime, endTime);
  }

  // Parse sets
  const setRows = document.querySelectorAll("#editSetsRowsList .edit-set-row");
  const sets = [];
  setRows.forEach((row, idx) => {
    const valInput = row.querySelector(".edit-set-weight-val");
    const unitSelect = row.querySelector(".edit-set-weight-unit");
    const repsInput = row.querySelector(".edit-set-reps");

    let weightStr = valInput ? valInput.value.trim() : "";
    const unit = unitSelect ? unitSelect.value : "kg";

    if (weightStr) {
      const lower = weightStr.toLowerCase();
      if (!lower.includes("kg") && !lower.includes("lb") && !lower.includes("plate") && !lower.includes("bw") && !lower.includes("bodyweight")) {
        if (unit === "plates") {
          const num = parseFloat(weightStr);
          weightStr = `${weightStr} ${num === 1 ? 'plate' : 'plates'}`;
        } else if (unit === "BW") {
          weightStr = "Bodyweight";
        } else {
          weightStr = `${weightStr} ${unit}`;
        }
      }
    } else {
      weightStr = "-";
    }

    const reps = parseInt(repsInput.value, 10);
    sets.push({
      set: idx + 1,
      weight: weightStr,
      reps: isNaN(reps) ? 0 : reps
    });
  });

  // Find or create workout
  let workout = workouts.find((w) => w.id && w.id === workoutId);
  if (!workout && dateStr) {
    workout = workouts.find((w) => w.date === dateStr);
  }
  if (!workout) {
    workout = {
      id: workoutId || `workout_${dateStr.replace(/-/g, "_")}_${Date.now().toString().slice(-4)}`,
      date: dateStr,
      duration: "",
      notes: "",
      exercises: []
    };
    workouts.unshift(workout);
  }

  const imgInput = document.getElementById("editExImageVal");
  const selectedImage = imgInput ? imgInput.value.trim() : "";

  const updatedEx = {
    exerciseId: exId,
    exerciseName: exName,
    category: category,
    variation: variation || "Standard",
    sets: sets
  };
  if (selectedImage) {
    updatedEx.image = selectedImage;
  }
  if (startTime) updatedEx.startTime = startTime;
  if (endTime) updatedEx.endTime = endTime;
  if (duration) updatedEx.duration = duration;

  // Sync with catalog
  let catalogEx = getExerciseById(exId) || getExerciseByName(exName);
  if (catalogEx) {
    if (category) catalogEx.category = category;
    if (variation) catalogEx.variation = variation;
    if (selectedImage) catalogEx.image = selectedImage;
    if (!updatedEx.image && catalogEx.image) updatedEx.image = catalogEx.image;
  } else if (exName) {
    catalogEx = {
      id: exId,
      name: exName,
      category: category,
      variation: variation || "Standard",
      image: selectedImage || getSanitizedFilename(exName, "gif")
    };
    exercises.push(catalogEx);
    if (!updatedEx.image) updatedEx.image = catalogEx.image;
  }

  if (!updatedEx.image) {
    const resolved = getResolvedExerciseImage(updatedEx, catalogEx);
    if (resolved && resolved.imageName) updatedEx.image = resolved.imageName;
  }

  const numIndex = (exerciseIndex !== undefined && exerciseIndex !== null && exerciseIndex !== -1) ? parseInt(exerciseIndex, 10) : -1;
  if (numIndex >= 0 && workout.exercises && workout.exercises[numIndex]) {
    workout.exercises[numIndex] = updatedEx;
  } else {
    const matchIdx = workout.exercises ? workout.exercises.findIndex((e) => e.exerciseId === exId || e.exerciseName === exName) : -1;
    if (matchIdx >= 0) {
      workout.exercises[matchIdx] = updatedEx;
    } else {
      if (!workout.exercises) workout.exercises = [];
      workout.exercises.push(updatedEx);
    }
  }

  // RE-ARRANGE WORKOUTS SORTING THEM CHRONOLOGICALLY BY START TIME!
  workout.exercises = sortExercisesByStartTime(workout.exercises);

  // Recalculate workout-level duration
  let sumMins = 0;
  workout.exercises.forEach((ex) => {
    const d = ex.duration || (ex.startTime && ex.endTime ? calculateDurationFromTimes(ex.startTime, ex.endTime) : "");
    if (d) sumMins += parseDurationToMinutes(d);
  });
  if (sumMins > 0) {
    workout.duration = formatMinutesToDuration(sumMins);
  } else if (workout.exercises.length === 1 && duration) {
    workout.duration = duration;
  } else {
    workout.duration = "";
  }

  persistState();
  showToast("Workout updated! Arranged chronologically by start time.", 3500);
  navigateToScreen("day-detail", { date: dateStr });
}

function handleDeleteEditedExercise(workoutId, exerciseIndex, dateStr) {
  if (!confirm("Are you sure you want to delete this workout exercise?")) return;

  let workout = workouts.find((w) => w.id === workoutId);
  if (!workout && dateStr) {
    workout = workouts.find((w) => w.date === dateStr);
  }

  if (workout && exerciseIndex >= 0 && workout.exercises && workout.exercises[exerciseIndex]) {
    workout.exercises.splice(exerciseIndex, 1);
    if (workout.exercises.length === 0) {
      workouts = workouts.filter((w) => w.id !== workout.id);
    } else {
      let sumMins = 0;
      workout.exercises.forEach((ex) => {
        const d = ex.duration || (ex.startTime && ex.endTime ? calculateDurationFromTimes(ex.startTime, ex.endTime) : "");
        if (d) sumMins += parseDurationToMinutes(d);
      });
      workout.duration = sumMins > 0 ? formatMinutesToDuration(sumMins) : "";
    }
  }

  persistState();
  showToast("Exercise deleted.");

  const dayWorkouts = workouts.filter((w) => w.date === dateStr);
  const remainingExercises = dayWorkouts.flatMap((w) => w.exercises || []);
  if (remainingExercises.length > 0) {
    navigateToScreen("day-detail", { date: dateStr });
  } else {
    navigateToScreen("dashboard");
  }
}

function handleEditImageFileSelected(input) {
  const file = input.files[0];
  if (!file) return;

  const previewArea = document.getElementById("editExImagePreviewArea");
  const exName = document.getElementById("editExSearchInput")?.value || "exercise";
  const idInput = document.getElementById("editExIdVal");
  const exId = idInput && idInput.value ? idInput.value : getSanitizedFilename(exName, "");
  const imageName = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;

    // Cache under original name, exercise ID, exercise name, and sanitized slugs for instant display
    cachedImages[imageName] = dataUrl;
    cachedImages[exId] = dataUrl;
    cachedImages[exName] = dataUrl;
    if (exId) {
      cachedImages[`${exId}.gif`] = dataUrl;
      cachedImages[`${exId}.jpg`] = dataUrl;
    }
    const baseSlug = getSanitizedFilename(exName, "");
    cachedImages[baseSlug] = dataUrl;
    cachedImages[`${baseSlug}.gif`] = dataUrl;
    cachedImages[`${baseSlug}.jpg`] = dataUrl;

    // Support dumbell / dumbbell typo variants in cache
    if (baseSlug.includes("dumbell")) {
      const fixed = baseSlug.replace(/dumbell/g, "dumbbell");
      cachedImages[`${fixed}.gif`] = dataUrl;
      cachedImages[fixed] = dataUrl;
    } else if (baseSlug.includes("dumbbell")) {
      const typo = baseSlug.replace(/dumbbell/g, "dumbell");
      cachedImages[`${typo}.gif`] = dataUrl;
      cachedImages[typo] = dataUrl;
    }

    // Update hidden input in Screen 3 form
    const imgValInput = document.getElementById("editExImageVal");
    if (imgValInput) {
      imgValInput.value = imageName;
    }

    // Update catalog exercise image attribute
    const catalogEx = getExerciseById(exId) || getExerciseByName(exName);
    if (catalogEx) {
      catalogEx.image = imageName;
    }

    // Immediately persist to localStorage
    persistState();

    if (previewArea) {
      previewArea.style.display = "flex";
      previewArea.innerHTML = `
        <img src="${dataUrl}" class="image-preview-thumb" alt="Preview" />
        <div class="image-preview-info">
          <div>File: <code>${escapeHtml(imageName)}</code> <span style="color: var(--accent-emerald); font-weight: 600;">✓ Attached</span></div>
        </div>
      `;
    }
    showToast(`Media "${imageName}" attached successfully!`);
  };
  reader.readAsDataURL(file);
}

// Helper to format weight display (supports kg, lbs, plates, and bodyweight)
function formatWeight(weightStr) {
  if (!weightStr) return "-";
  const str = String(weightStr).trim();
  const lower = str.toLowerCase();

  // If weight contains 'plate', display clean plate pill
  if (lower.includes("plate")) {
    return `<span class="weight-plate-pill">🪙 ${escapeHtml(str)}</span>`;
  }

  return `<strong>${escapeHtml(str)}</strong>`;
}

function renderExerciseCard(loggedEx) {
  const catalogEx = getExerciseById(loggedEx.exerciseId) || getExerciseByName(loggedEx.exerciseName) || {
    id: loggedEx.exerciseId || getSanitizedFilename(loggedEx.exerciseName, ""),
    name: loggedEx.exerciseName,
    category: "Chest",
    variation: "Standard",
    image: loggedEx.image || getSanitizedFilename(loggedEx.exerciseName, "gif")
  };

  const imgInfo = getResolvedExerciseImage(loggedEx, catalogEx);
  const imageName = imgInfo.imageName;
  const isGif = imgInfo.isGif;
  const category = catalogEx.category || "Chest";
  const icon = CATEGORY_ICONS[category] || "🏋️";
  const imgSrc = imgInfo.src;

  // Build sets table rows
  const setsRows = (loggedEx.sets || [])
    .map((s, idx) => `
      <tr>
        <td><span class="set-num-badge">${s.set || idx + 1}</span></td>
        <td>${formatWeight(s.weight)}</td>
        <td>${escapeHtml(String(s.reps || "-"))} reps</td>
      </tr>
    `)
    .join("");

  return `
    <div class="exercise-entry-card">
      <div class="exercise-media-container" onclick="openLightbox('${catalogEx.id}', '${imgSrc}', '${category}', '${escapeHtml(catalogEx.variation || '').replace(/'/g, "\\'")}')">
        <img 
          src="${imgSrc}" 
          alt="${escapeHtml(catalogEx.name)}" 
          class="exercise-media-img"
          onerror="handleImageFallback(this, '${catalogEx.id}')"
        />
        ${isGif ? `<span class="gif-badge">GIF</span>` : ""}
        <span class="zoom-hint">🔍 Zoom</span>
      </div>

      <div class="exercise-details">
        <div class="exercise-meta-top">
          <h4 class="exercise-title">${escapeHtml(catalogEx.name)}</h4>
          <span class="category-tag ${category}">${category}</span>
        </div>
        <div class="exercise-variation" style="display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHtml(catalogEx.variation || "Standard")}</span>
          ${loggedEx.duration ? `<span class="exercise-duration-tag">⏱️ ${escapeHtml(loggedEx.duration)}</span>` : ""}
        </div>

        <table class="sets-table">
          <thead>
            <tr>
              <th>Set</th>
              <th>Weight</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            ${setsRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Progressive fallback if image file fails to load
function handleImageFallback(imgEl, exerciseId) {
  if (!imgEl) return;
  const currentSrc = imgEl.src || "";
  const catalogEx = getExerciseById(exerciseId);
  const exName = catalogEx ? catalogEx.name : exerciseId;
  const slug = getSanitizedFilename(exName, "");

  const fallbackStep = parseInt(imgEl.dataset.fallbackStep || "0", 10);

  // Step 0: Try alternate extension (.gif if .jpg failed, or .jpg if .gif failed)
  if (fallbackStep === 0) {
    imgEl.dataset.fallbackStep = "1";
    if (currentSrc.toLowerCase().includes(".jpg") || currentSrc.toLowerCase().includes(".jpeg") || currentSrc.toLowerCase().includes(".png")) {
      imgEl.src = `images/workouts/${slug}.gif`;
      return;
    } else if (currentSrc.toLowerCase().includes(".gif")) {
      imgEl.src = `images/workouts/${slug}.jpg`;
      return;
    }
  }

  // Step 1: Check cache candidates
  if (fallbackStep === 1) {
    imgEl.dataset.fallbackStep = "2";
    const cacheCandidate = cachedImages[slug] || cachedImages[`${slug}.gif`] || cachedImages[`${slug}.jpg`] || cachedImages[exerciseId] || cachedImages[exName];
    if (cacheCandidate && cacheCandidate !== currentSrc) {
      imgEl.src = cacheCandidate;
      return;
    }
  }

  // If it is a tile background image and all fallbacks failed, gracefully hide the img tag
  if (imgEl.classList.contains("exercise-tile-bg-img")) {
    imgEl.style.display = "none";
    return;
  }

  // Final step: Display styled fallback placeholder
  const parent = imgEl.parentElement;
  if (!parent) return;
  const category = catalogEx ? catalogEx.category : "Chest";
  const name = catalogEx ? catalogEx.name : "Exercise";
  const icon = CATEGORY_ICONS[category] || "🏋️";

  parent.innerHTML = `
    <div class="exercise-media-fallback">
      <div style="font-size: 2rem;">${icon}</div>
      <span style="font-weight: 600; font-size: 0.75rem;">${escapeHtml(name)}</span>
      <span style="color: var(--accent-cyan); font-size: 0.7rem;">+ Add Photo/GIF</span>
    </div>
  `;
}

// ==========================================================================
// Log Workout Modal Builder
// ==========================================================================

function openLogModal() {
  const modal = document.getElementById("logWorkoutModal");
  if (!modal) return;

  // Set default date to today in local timezone
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("workoutDate").value = today;
  const durationInput = document.getElementById("workoutDuration");
  if (durationInput) {
    durationInput.value = "";
    delete durationInput.dataset.manuallyEdited;
  }
  document.getElementById("workoutNotes").value = "";

  // Reset exercise builder container
  const container = document.getElementById("builderExercisesList");
  if (container) {
    container.innerHTML = "";
    // Add one exercise by default
    addExerciseItemToLogger();
  }

  modal.classList.add("active");
}

let builderItemCounter = 0;

// Multi-keyword exercise search across name, muscle category, and variations
function searchExercises(query) {
  if (!query || query.trim() === "") {
    // Return a curated sample of exercises when search input is empty
    return exercises.slice(0, 10);
  }

  const cleanQuery = query.toLowerCase().trim();
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);

  // Match when EVERY word exists in the exercise's name, category, or variation
  const matches = exercises.filter((ex) => {
    const name = (ex.name || "").toLowerCase();
    const category = (ex.category || "").toLowerCase();
    const variation = (ex.variation || "").toLowerCase();
    const id = (ex.id || "").toLowerCase();
    const searchableText = `${name} ${category} ${variation} ${id} ${(category === 'Biceps' || category === 'Triceps') ? 'arms arm' : ''}`;

    return words.every((word) => searchableText.includes(word));
  });

  // Relevance sorting:
  // 1. Name starts with query
  // 2. Name contains query
  // 3. Category exact match
  // 4. Alphabetical
  matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    if (aName.startsWith(cleanQuery) && !bName.startsWith(cleanQuery)) return -1;
    if (!aName.startsWith(cleanQuery) && bName.startsWith(cleanQuery)) return 1;

    if (aName.includes(cleanQuery) && !bName.includes(cleanQuery)) return -1;
    if (!aName.includes(cleanQuery) && bName.includes(cleanQuery)) return 1;

    if (a.category.toLowerCase() === cleanQuery && b.category.toLowerCase() !== cleanQuery) return -1;
    if (a.category.toLowerCase() !== cleanQuery && b.category.toLowerCase() === cleanQuery) return 1;

    return a.name.localeCompare(b.name);
  });

  return matches;
}

function addExerciseItemToLogger() {
  const container = document.getElementById("builderExercisesList");
  if (!container) return;

  builderItemCounter++;
  const itemId = `builder_item_${builderItemCounter}`;

  const itemEl = document.createElement("div");
  itemEl.className = "builder-exercise-item";
  itemEl.id = itemId;

  // Default exercise to start with
  const initialEx = exercises[0] || {
    id: "barbell_bench_press",
    name: "Barbell Bench Press",
    category: "Chest",
    variation: "Flat Barbell"
  };

  itemEl.innerHTML = `
    <div class="builder-exercise-header">
      <strong style="color: var(--accent-cyan); font-size: 0.95rem;">Exercise #${container.children.length + 1}</strong>
      ${container.children.length > 0 ? `<button type="button" class="btn btn-icon btn-sm btn-danger" onclick="removeBuilderItem('${itemId}')">✕ Remove</button>` : ""}
    </div>

    <!-- Searchable Exercise Input with Autocomplete Dropdown -->
    <div class="form-group exercise-search-container">
      <label class="form-label">
        <span>Exercise</span>
        <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: normal;">Type to search catalog</span>
      </label>
      <div class="exercise-search-input-wrap">
        <input 
          type="text" 
          class="form-input exercise-search-input" 
          value="${escapeHtml(initialEx.name)}" 
          placeholder="Search by name, muscle, or variation (e.g. 'Lat', 'Back', 'Bicep Curl')..." 
          autocomplete="off"
          oninput="handleExerciseSearchInput('${itemId}', this.value)"
          onfocus="handleExerciseSearchInput('${itemId}', this.value)"
        />
        <input type="hidden" class="exercise-id-val" value="${initialEx.id}" />
        <input type="hidden" class="exercise-image-val" value="${escapeHtml(initialEx.image || '')}" />
        <span class="search-clear-btn" id="${itemId}_clear_btn" title="Clear input" onclick="clearExerciseSearch('${itemId}')" style="display: inline-block;">✕</span>
      </div>

      <!-- Autocomplete Dropdown List -->
      <div class="exercise-search-results" id="${itemId}_search_results" style="display: none;"></div>

      <!-- Selected Exercise Detail Pill -->
      <div class="selected-exercise-pill" id="${itemId}_selected_pill">
        <span class="category-tag ${initialEx.category}">${initialEx.category}</span>
        <span style="color: var(--text-muted);">${escapeHtml(initialEx.variation || 'Standard')}</span>
      </div>
    </div>

    <!-- Exercise Time & Order (Start & End Time auto-calculates duration) -->
    <div style="background: var(--bg-tertiary); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.85rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">⏱️ Exercise Time & Order:</span>
        <span class="optional-tag" style="font-size: 0.72rem;">(Start & End time auto-calculates duration)</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.65rem;">
        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">🕒 Start Time</label>
          <input type="time" class="form-input exercise-start-time" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" oninput="handleLoggerItemTimesChange('${itemId}')" onchange="handleLoggerItemTimesChange('${itemId}')" />
        </div>
        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">🕒 End Time</label>
          <input type="time" class="form-input exercise-end-time" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" oninput="handleLoggerItemTimesChange('${itemId}')" onchange="handleLoggerItemTimesChange('${itemId}')" />
        </div>
        <div>
          <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">⏱️ Duration</label>
          <input type="text" class="form-input exercise-duration-input" placeholder="e.g. 15 mins" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" oninput="updateLoggerTotalTime()" />
        </div>
      </div>
    </div>

    <!-- Extra Information / Variation (e.g. Side Delt Dumbbell) -->
    <div class="form-group" style="margin-bottom: 0.85rem;">
      <label class="form-label" style="font-size: 0.8rem;">
        <span>Extra Information / Variation</span>
        <span class="optional-tag" style="font-size: 0.7rem;">(e.g. Side Delt Dumbbell, Wide Grip)</span>
      </label>
      <input type="text" class="form-input exercise-variation-input" value="${escapeHtml(initialEx.variation || '')}" placeholder="e.g. Side Delt Dumbbell, Incline 30°, Standing" style="font-size: 0.82rem; padding: 0.4rem 0.7rem;" />
    </div>

    <div class="sets-builder-container">
      <div class="sets-builder-row sets-builder-header">
        <div>Set</div>
        <div>Weight</div>
        <div>Unit</div>
        <div>Reps</div>
        <div></div>
      </div>
      <div class="sets-rows-list">
        <!-- Set 1 -->
        <div class="sets-builder-row">
          <div><span class="set-num-badge">1</span></div>
          <div><input type="text" class="form-input set-weight-val" placeholder="e.g. 2, 80 or Bodyweight" /></div>
          <div>
            <select class="form-select set-weight-unit">
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="plates">plates</option>
              <option value="BW">bodyweight</option>
            </select>
          </div>
          <div><input type="number" class="form-input set-reps" placeholder="Reps" min="1" required /></div>
          <div></div>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;" onclick="addSetRow('${itemId}')">
        + Add Set
      </button>
    </div>

    <!-- Image / GIF Upload Helper -->
    <div class="image-renamer-box">
      <div class="image-renamer-header">
        <span>📸 Workout Image or GIF</span>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-muted);">
        Select any <strong>.jpg</strong>, <strong>.jpeg</strong>, <strong>.png</strong>, or animated <strong>.gif</strong> to attach it to this workout.
      </p>
      <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" class="image-file-input" style="display: none;" onchange="handleImageFileSelected('${itemId}', this)" />
      <div class="image-preview-area" style="display: none;"></div>
      <button type="button" class="btn btn-secondary btn-sm upload-btn" onclick="this.parentElement.querySelector('.image-file-input').click()">
        📁 Select Photo or GIF
      </button>
    </div>
  `;

  container.appendChild(itemEl);
  updateExerciseImageHelper(itemId, initialEx.id);
}

function removeBuilderItem(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.remove();
  updateLoggerTotalTime();
}

function addSetRow(itemId) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;
  const list = itemEl.querySelector(".sets-rows-list");
  if (!list) return;

  // Retrieve values from previous set row if available
  const existingRows = list.querySelectorAll(".sets-builder-row");
  let prevWeight = "";
  let prevUnit = "kg";
  let prevReps = "";

  if (existingRows.length > 0) {
    const lastRow = existingRows[existingRows.length - 1];
    const weightInput = lastRow.querySelector(".set-weight-val");
    const unitSelect = lastRow.querySelector(".set-weight-unit");
    const repsInput = lastRow.querySelector(".set-reps");

    if (weightInput && weightInput.value.trim() !== "") {
      prevWeight = weightInput.value.trim();
    }
    if (unitSelect) {
      prevUnit = unitSelect.value;
    }
    if (repsInput && repsInput.value.trim() !== "") {
      prevReps = repsInput.value.trim();
    }
  }

  const currentCount = existingRows.length + 1;
  const row = document.createElement("div");
  row.className = "sets-builder-row";
  row.innerHTML = `
    <div><span class="set-num-badge">${currentCount}</span></div>
    <div><input type="text" class="form-input set-weight-val" value="${escapeHtml(prevWeight)}" placeholder="e.g. 2, 80 or Bodyweight" /></div>
    <div>
      <select class="form-select set-weight-unit">
        <option value="kg" ${prevUnit === 'kg' ? 'selected' : ''}>kg</option>
        <option value="lbs" ${prevUnit === 'lbs' ? 'selected' : ''}>lbs</option>
        <option value="plates" ${prevUnit === 'plates' ? 'selected' : ''}>plates</option>
        <option value="BW" ${prevUnit === 'BW' ? 'selected' : ''}>bodyweight</option>
      </select>
    </div>
    <div><input type="number" class="form-input set-reps" value="${escapeHtml(prevReps)}" placeholder="Reps" min="1" required /></div>
    <div><button type="button" class="btn btn-icon btn-sm btn-danger" onclick="this.closest('.sets-builder-row').remove(); updateSetNumbers('${itemId}');">✕</button></div>
  `;
  list.appendChild(row);
}

// Re-index set number badges if a set is deleted
function updateSetNumbers(itemId) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;
  const rows = itemEl.querySelectorAll(".sets-rows-list .sets-builder-row");
  rows.forEach((row, idx) => {
    const badge = row.querySelector(".set-num-badge");
    if (badge) badge.textContent = idx + 1;
  });
}

// Automatically calculate duration from Start Time & End Time in logger item
function handleLoggerItemTimesChange(itemId) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;
  const startInput = itemEl.querySelector(".exercise-start-time");
  const endInput = itemEl.querySelector(".exercise-end-time");
  const durInput = itemEl.querySelector(".exercise-duration-input");

  if (startInput && endInput && durInput) {
    const s = startInput.value.trim();
    const e = endInput.value.trim();
    if (s && e) {
      const dur = calculateDurationFromTimes(s, e);
      if (dur) durInput.value = dur;
    }
  }
  updateLoggerTotalTime();
}

// Calculate live sum of exercise durations and populate workoutDuration input
function updateLoggerTotalTime() {
  const durationInputs = document.querySelectorAll(".exercise-duration-input");
  let totalMins = 0;
  let hasAnyExerciseDuration = false;

  durationInputs.forEach((input) => {
    let val = input.value.trim();
    if (!val) {
      const itemEl = input.closest(".workout-logger-exercise-item");
      if (itemEl) {
        const sInput = itemEl.querySelector(".exercise-start-time");
        const eInput = itemEl.querySelector(".exercise-end-time");
        if (sInput && eInput && sInput.value.trim() && eInput.value.trim()) {
          const calcDur = calculateDurationFromTimes(sInput.value.trim(), eInput.value.trim());
          if (calcDur) {
            val = calcDur;
            input.value = calcDur;
          }
        }
      }
    }
    if (val) {
      hasAnyExerciseDuration = true;
      totalMins += parseDurationToMinutes(val);
    }
  });

  const workoutDurationInput = document.getElementById("workoutDuration");
  if (workoutDurationInput) {
    if (hasAnyExerciseDuration) {
      workoutDurationInput.value = totalMins > 0 ? formatMinutesToDuration(totalMins) : "";
    } else if (!workoutDurationInput.dataset.manuallyEdited) {
      workoutDurationInput.value = "";
    }
  }
}

// Handle typing in the exercise search box
function handleExerciseSearchInput(itemId, query) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;

  const resultsBox = document.getElementById(`${itemId}_search_results`);
  const clearBtn = document.getElementById(`${itemId}_clear_btn`);
  if (!resultsBox) return;

  if (clearBtn) {
    clearBtn.style.display = query && query.trim() !== "" ? "inline-block" : "none";
  }

  const matches = searchExercises(query);

  if (matches.length === 0) {
    const safeQuery = escapeHtml(query.trim());
    resultsBox.innerHTML = `
      <div class="search-result-empty">
        <div>No matching workouts found for "<strong>${safeQuery}</strong>"</div>
        <button type="button" class="btn btn-primary btn-sm" onclick="selectCustomExercise('${itemId}', '${safeQuery}')">
          + Use "${safeQuery}" as custom workout
        </button>
      </div>
    `;
    resultsBox.style.display = "flex";
    return;
  }

  resultsBox.innerHTML = matches
    .map((ex) => {
      const icon = CATEGORY_ICONS[ex.category] || "🏋️";
      const isGif = (ex.image || "").toLowerCase().endsWith(".gif");

      return `
        <div class="search-result-item" onclick="selectExerciseFromResult('${itemId}', '${ex.id}')">
          <div>
            <div class="result-title">
              <span>${icon}</span>
              <span>${escapeHtml(ex.name)}</span>
              ${isGif ? `<span class="gif-badge" style="position: static; font-size: 0.6rem; padding: 0 0.3rem;">GIF</span>` : ""}
            </div>
            <div class="result-variation">${escapeHtml(ex.variation || 'Standard')}</div>
          </div>
          <span class="category-tag ${ex.category}">${ex.category}</span>
        </div>
      `;
    })
    .join("");

  resultsBox.style.display = "flex";
}

// When an exercise is selected from the search dropdown
function selectExerciseFromResult(itemId, exId) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;

  const ex = getExerciseById(exId);
  if (!ex) return;

  const searchInput = itemEl.querySelector(".exercise-search-input");
  const idInput = itemEl.querySelector(".exercise-id-val");
  const imgInput = itemEl.querySelector(".exercise-image-val");
  const varInput = itemEl.querySelector(".exercise-variation-input");
  const resultsBox = document.getElementById(`${itemId}_search_results`);
  const pillBox = document.getElementById(`${itemId}_selected_pill`);
  const clearBtn = document.getElementById(`${itemId}_clear_btn`);

  if (searchInput) searchInput.value = ex.name;
  if (idInput) idInput.value = ex.id;
  if (imgInput) imgInput.value = ex.image || "";
  if (varInput) varInput.value = ex.variation || "Standard";
  if (resultsBox) resultsBox.style.display = "none";
  if (clearBtn) clearBtn.style.display = "inline-block";

  if (pillBox) {
    pillBox.innerHTML = `
      <span class="category-tag ${ex.category}">${ex.category}</span>
      <span style="color: var(--text-muted);">${escapeHtml(ex.variation || 'Standard')}</span>
    `;
  }

  updateExerciseImageHelper(itemId, ex.id);
}

// User opts to use a custom typed exercise
function selectCustomExercise(itemId, customName) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;

  const customId = customName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const searchInput = itemEl.querySelector(".exercise-search-input");
  const idInput = itemEl.querySelector(".exercise-id-val");
  const resultsBox = document.getElementById(`${itemId}_search_results`);
  const pillBox = document.getElementById(`${itemId}_selected_pill`);

  if (searchInput) searchInput.value = customName;
  if (idInput) idInput.value = customId;
  if (resultsBox) resultsBox.style.display = "none";

  if (pillBox) {
    pillBox.innerHTML = `
      <span class="category-tag Other" style="background: rgba(148, 163, 184, 0.2); color: #94a3b8;">Custom</span>
      <span style="color: var(--text-muted);">Custom Exercise</span>
    `;
  }

  updateExerciseImageHelper(itemId, customId);
}

// Clear the search input box
function clearExerciseSearch(itemId) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;

  const searchInput = itemEl.querySelector(".exercise-search-input");
  const clearBtn = document.getElementById(`${itemId}_clear_btn`);

  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
  if (clearBtn) clearBtn.style.display = "none";
  handleExerciseSearchInput(itemId, "");
}

// Update the image renamer and preview helper for a selected exercise
function updateExerciseImageHelper(itemId, exIdOrName) {
  const itemEl = document.getElementById(itemId);
  if (!itemEl) return;

  const ex = getExerciseById(exIdOrName) || getExerciseByName(exIdOrName) || {
    id: exIdOrName,
    name: exIdOrName,
    image: getSanitizedFilename(exIdOrName, "jpg")
  };

  const previewArea = itemEl.querySelector(".image-preview-area");
  const uploadBtn = itemEl.querySelector(".upload-btn");
  if (!previewArea || !uploadBtn) return;

  const expectedImageName = ex.image || getSanitizedFilename(ex.name, "jpg");
  const existingCached = cachedImages[expectedImageName] || (ex.id && cachedImages[ex.id]) || (ex.name && cachedImages[ex.name]);

  if (existingCached) {
    previewArea.style.display = "flex";
    previewArea.className = "image-preview-strip";
    previewArea.innerHTML = `
      <img src="${existingCached}" class="preview-thumb" alt="${escapeHtml(ex.name)}" />
      <div class="renamed-file-info">
        <div><strong>Attached Media:</strong></div>
        <div class="renamed-badge">${escapeHtml(expectedImageName)} <span style="color: var(--accent-emerald); font-weight: 600;">✓</span></div>
      </div>
    `;
    uploadBtn.textContent = "🔄 Replace Photo or GIF";
  } else {
    previewArea.style.display = "none";
    previewArea.className = "";
    previewArea.innerHTML = "";
    uploadBtn.textContent = "📁 Attach Photo or GIF";
  }
}

// Handle File Selected - Accept Image As-Is Without Renaming or Download Prompts
function handleImageFileSelected(itemId, input) {
  const file = input.files[0];
  if (!file) return;

  const itemEl = document.getElementById(itemId);
  const idInput = itemEl.querySelector(".exercise-id-val");
  const searchInput = itemEl.querySelector(".exercise-search-input");
  const exId = idInput ? idInput.value : "";
  const exName = searchInput ? searchInput.value.trim() : "";
  let ex = getExerciseById(exId) || getExerciseByName(exName);
  if (!ex) {
    ex = {
      id: exId || getSanitizedFilename(exName || "exercise", ""),
      name: exName || "Exercise",
      category: "Legs",
      variation: "Standard"
    };
    exercises.push(ex);
  }

  const imageName = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;

    // Cache under original file name and exercise keys for instant rendering
    cachedImages[imageName] = dataUrl;
    cachedImages[ex.id] = dataUrl;
    cachedImages[ex.name] = dataUrl;
    if (ex.id) {
      cachedImages[`${ex.id}.gif`] = dataUrl;
      cachedImages[`${ex.id}.jpg`] = dataUrl;
    }
    const baseSlug = getSanitizedFilename(ex.name, "");
    cachedImages[baseSlug] = dataUrl;
    cachedImages[`${baseSlug}.gif`] = dataUrl;
    cachedImages[`${baseSlug}.jpg`] = dataUrl;

    ex.image = imageName;

    // Update hidden input in itemEl
    const imgValInput = itemEl.querySelector(".exercise-image-val");
    if (imgValInput) {
      imgValInput.value = imageName;
    }

    persistState();

    // Show preview (accepted as it is, no download button)
    const previewArea = itemEl.querySelector(".image-preview-area");
    previewArea.style.display = "flex";
    previewArea.className = "image-preview-strip";
    previewArea.innerHTML = `
      <img src="${dataUrl}" class="preview-thumb" alt="${escapeHtml(ex.name)}" />
      <div class="renamed-file-info">
        <div><strong>Media Attached:</strong></div>
        <div class="renamed-badge">${escapeHtml(imageName)} <span style="color: var(--accent-emerald); font-weight: 600;">✓ Attached</span></div>
      </div>
    `;

    const uploadBtn = itemEl.querySelector(".upload-btn");
    if (uploadBtn) uploadBtn.textContent = "🔄 Replace Photo or GIF";

    showToast(`Media "${imageName}" attached successfully!`);
  };
  reader.readAsDataURL(file);
}

// Handle Save Workout Form
function handleSaveWorkout(e) {
  e.preventDefault();

  const date = document.getElementById("workoutDate").value;
  const duration = document.getElementById("workoutDuration").value.trim(); // Optional
  const notes = document.getElementById("workoutNotes").value.trim();       // Optional

  const builderItems = document.querySelectorAll(".builder-exercise-item");
  if (builderItems.length === 0) {
    alert("Please add at least one exercise to your workout.");
    return;
  }

  let exercisesLogged = [];

  builderItems.forEach((item) => {
    const idInput = item.querySelector(".exercise-id-val");
    const searchInput = item.querySelector(".exercise-search-input");
    const imgValInput = item.querySelector(".exercise-image-val");
    const exId = idInput ? idInput.value : "";
    const exName = searchInput ? searchInput.value.trim() : "";
    let ex = getExerciseById(exId) || getExerciseByName(exName);

    if (!ex && exName) {
      // Create new exercise dynamically if not in catalog
      const customId = exName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      ex = {
        id: customId,
        name: exName,
        category: "Legs",
        variation: "Custom",
        image: getSanitizedFilename(exName, "gif")
      };
      exercises.push(ex);
      persistState();
    }
    if (!ex) return;

    const chosenImage = (imgValInput && imgValInput.value) ? imgValInput.value.trim() : (ex.image || "");

    const setRows = item.querySelectorAll(".sets-rows-list .sets-builder-row");
    const sets = [];

    setRows.forEach((row, idx) => {
      const valInput = row.querySelector(".set-weight-val");
      const unitSelect = row.querySelector(".set-weight-unit");
      let weightStr = valInput ? valInput.value.trim() : "";
      const unit = unitSelect ? unitSelect.value : "kg";

      if (weightStr) {
        const lower = weightStr.toLowerCase();
        // If user didn't already type the unit into the text box, append the chosen unit
        if (!lower.includes("kg") && !lower.includes("lb") && !lower.includes("plate") && !lower.includes("bw") && !lower.includes("bodyweight")) {
          if (unit === "plates") {
            const num = parseFloat(weightStr);
            weightStr = `${weightStr} ${num === 1 ? 'plate' : 'plates'}`;
          } else if (unit === "BW") {
            weightStr = "Bodyweight";
          } else {
            weightStr = `${weightStr} ${unit}`;
          }
        }
      } else if (unit === "BW") {
        weightStr = "Bodyweight";
      } else {
        weightStr = "-";
      }

      const repsInput = row.querySelector(".set-reps");
      const reps = repsInput ? parseInt(repsInput.value, 10) : 10;
      sets.push({
        set: idx + 1,
        weight: weightStr,
        reps: isNaN(reps) ? 10 : reps
      });
    });

    const startInput = item.querySelector(".exercise-start-time");
    const endInput = item.querySelector(".exercise-end-time");
    const durationInput = item.querySelector(".exercise-duration-input");
    const variationInput = item.querySelector(".exercise-variation-input");

    const startTime = startInput ? normalizeTimeTo24H(startInput.value.trim()) : "";
    const endTime = endInput ? normalizeTimeTo24H(endInput.value.trim()) : "";
    let exDuration = durationInput ? durationInput.value.trim() : "";
    const exVariation = variationInput ? variationInput.value.trim() : (ex.variation || "Standard");

    if (startTime && endTime && !exDuration) {
      exDuration = calculateDurationFromTimes(startTime, endTime);
    }

    const loggedExercise = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      category: ex.category || "Legs",
      variation: exVariation,
      sets: sets
    };
    if (chosenImage) loggedExercise.image = chosenImage;
    if (startTime) loggedExercise.startTime = startTime;
    if (endTime) loggedExercise.endTime = endTime;
    if (exDuration) loggedExercise.duration = exDuration;

    exercisesLogged.push(loggedExercise);
  });

  // Sort exercises chronologically by starting time!
  exercisesLogged = sortExercisesByStartTime(exercisesLogged);

  // Calculate sum of individual exercise times
  let autoSumMins = 0;
  exercisesLogged.forEach((ex) => {
    const dur = ex.duration || (ex.startTime && ex.endTime ? calculateDurationFromTimes(ex.startTime, ex.endTime) : "");
    if (dur) autoSumMins += parseDurationToMinutes(dur);
  });

  const workoutDurationInput = document.getElementById("workoutDuration");
  const isManuallyEdited = workoutDurationInput && workoutDurationInput.dataset.manuallyEdited === "true";

  let finalDuration = duration;
  if (!isManuallyEdited && autoSumMins > 0) {
    finalDuration = formatMinutesToDuration(autoSumMins);
  } else if (!finalDuration && autoSumMins > 0) {
    finalDuration = formatMinutesToDuration(autoSumMins);
  }

  // If session duration was provided and there is only 1 exercise without individual duration, sync it
  if (finalDuration && exercisesLogged.length === 1 && !exercisesLogged[0].duration) {
    exercisesLogged[0].duration = finalDuration;
  }

  const newWorkout = {
    id: `workout_${date.replace(/-/g, "_")}_${Date.now().toString().slice(-4)}`,
    date: date,
    duration: finalDuration,
    notes: notes,
    exercises: exercisesLogged
  };

  // Insert at top and sort
  workouts.unshift(newWorkout);
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  persistState();
  closeAllModals();
  navigateToScreen("day-detail", { date: date });

  showToast("Workout saved and arranged chronologically by start time!", 4000);
}

// Confirm Delete Workout
function confirmDeleteWorkout(workoutId) {
  if (!confirm("Are you sure you want to delete this workout log?")) return;
  workouts = workouts.filter((w) => w.id !== workoutId);
  persistState();
  renderTimeline();
  showToast("Workout removed.");
}

// ==========================================================================
// Exercise Library Modal
// ==========================================================================

function openLibraryModal() {
  const modal = document.getElementById("libraryModal");
  if (!modal) return;

  renderLibraryCatalog();
  modal.classList.add("active");
}

function renderLibraryCatalog() {
  const container = document.getElementById("libraryExercisesList");
  if (!container) return;

  container.innerHTML = exercises
    .map((ex) => {
      const imageName = ex.image || getSanitizedFilename(ex.name, "jpg");
      const hasCached = !!cachedImages[imageName];
      const isGif = imageName.toLowerCase().endsWith(".gif");

      return `
        <div class="exercise-entry-card" style="align-items: center;">
          <div style="font-size: 2rem;">${CATEGORY_ICONS[ex.category] || "🏋️"}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong style="font-size: 1rem;">${escapeHtml(ex.name)}</strong>
              <span class="category-tag ${ex.category}">${ex.category}</span>
              ${isGif ? `<span class="gif-badge" style="position: static;">GIF</span>` : ""}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
              Variation: ${escapeHtml(ex.variation || "Standard")}
            </div>
            <div style="font-size: 0.75rem; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 0.3rem;">
              Image filename: ${imageName}
            </div>
          </div>
          <div>
            <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
              📸 Attach Image/GIF
              <input type="file" accept=".jpg,.jpeg,.png,.gif,.webp" style="display: none;" onchange="handleLibraryImageUpload('${ex.id}', this)" />
            </label>
          </div>
        </div>
      `;
    })
    .join("");
}

function handleLibraryImageUpload(exerciseId, input) {
  const file = input.files[0];
  if (!file) return;

  const ex = getExerciseById(exerciseId);
  if (!ex) return;

  const imageName = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    cachedImages[imageName] = dataUrl;
    cachedImages[ex.id] = dataUrl;
    cachedImages[ex.name] = dataUrl;
    if (ex.id) {
      cachedImages[`${ex.id}.gif`] = dataUrl;
      cachedImages[`${ex.id}.jpg`] = dataUrl;
    }
    const baseSlug = getSanitizedFilename(ex.name, "");
    cachedImages[baseSlug] = dataUrl;
    cachedImages[`${baseSlug}.gif`] = dataUrl;
    cachedImages[`${baseSlug}.jpg`] = dataUrl;

    ex.image = imageName;
    persistState();

    renderLibraryCatalog();
    renderTimeline();
    showToast(`Image "${imageName}" attached successfully!`);
  };
  reader.readAsDataURL(file);
}

// Add New Custom Exercise Form
function handleCreateNewExercise(e) {
  e.preventDefault();

  const name = document.getElementById("newExName").value.trim();
  const category = document.getElementById("newExCategory").value;
  const variation = document.getElementById("newExVariation").value.trim() || "Standard";
  const ext = document.getElementById("newExExt").value || "jpg";

  if (!name) return;

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (getExerciseById(id)) {
    alert("An exercise with this name already exists.");
    return;
  }

  const imageName = getSanitizedFilename(name, ext);

  const newEx = {
    id: id,
    name: name,
    category: category,
    variation: variation,
    image: imageName
  };

  exercises.push(newEx);
  persistState();
  populateExerciseSelects();
  renderLibraryCatalog();

  document.getElementById("newExName").value = "";
  document.getElementById("newExVariation").value = "";
  showToast(`Added "${name}" to exercise library with image name "${imageName}".`);
}

function populateExerciseSelects() {
  // Updates any open exercise select lists
  const selects = document.querySelectorAll(".exercise-picker");
  selects.forEach((select) => {
    const val = select.value;
    select.innerHTML = exercises
      .map((ex) => `<option value="${ex.id}">${ex.name} (${ex.category} - ${ex.variation})</option>`)
      .join("");
    if (val) select.value = val;
  });
}

// ==========================================================================
// Git Sync & Export Modal
// ==========================================================================

function openSyncModal() {
  const modal = document.getElementById("syncModal");
  if (!modal) return;

  const codeSnippet = document.getElementById("gitCommandsSnippet");
  if (codeSnippet) {
    const today = new Date().toISOString().split("T")[0];
    codeSnippet.textContent = `git add data/workouts.json data/exercises.json images/workouts/\ngit commit -m "Log workout for ${today}"\ngit push origin main`;
  }

  modal.classList.add("active");
}

function downloadJsonFile(filename, data) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}! Place it in your project's data/ folder.`);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

// ==========================================================================
// Lightbox Modal
// ==========================================================================

function openLightbox(exerciseIdOrTitle, imgSrc, category, variation) {
  const modal = document.getElementById("lightboxModal");
  if (!modal) return;

  const catalogEx = getExerciseById(exerciseIdOrTitle);
  let title = exerciseIdOrTitle;
  let cat = category || "Chest";
  let varText = variation || "";
  let src = imgSrc;

  if (catalogEx) {
    title = catalogEx.name;
    cat = catalogEx.category;
    varText = catalogEx.variation || "Standard";
    if (!src) {
      const imgInfo = getResolvedExerciseImage(null, catalogEx);
      src = imgInfo.src;
    }
  }

  document.getElementById("lightboxTitle").textContent = title;
  document.getElementById("lightboxCategory").textContent = cat;
  document.getElementById("lightboxCategory").className = `category-tag ${cat}`;
  document.getElementById("lightboxVariation").textContent = varText;

  const imgEl = document.getElementById("lightboxImg");
  imgEl.src = src;
  imgEl.alt = title;

  modal.classList.add("active");
}

// Close All Modals
function closeAllModals() {
  document.querySelectorAll(".modal-backdrop").forEach((m) => m.classList.remove("active"));
}

// ==========================================================================
// Stats and Summary
// ==========================================================================

function updateStats() {
  const totalWorkoutsEl = document.getElementById("statTotalWorkouts");
  const totalExercisesEl = document.getElementById("statTotalExercises");
  const lastActiveEl = document.getElementById("statLastActive");

  if (totalWorkoutsEl) totalWorkoutsEl.textContent = workouts.length;
  if (totalExercisesEl) totalExercisesEl.textContent = exercises.length;
  if (lastActiveEl) {
    if (workouts.length > 0) {
      lastActiveEl.textContent = formatDisplayDate(workouts[0].date);
    } else {
      lastActiveEl.textContent = "None yet";
    }
  }
}

// ==========================================================================
// Utilities
// ==========================================================================

function getExerciseById(id) {
  return exercises.find((ex) => ex.id === id);
}

function getExerciseByName(name) {
  if (!name) return null;
  return exercises.find((ex) => ex.name.toLowerCase() === name.toLowerCase());
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (e) {
    return dateStr;
  }
}

function getRelativeDateTag(dateStr) {
  const today = new Date().toISOString().split("T")[0];
  if (dateStr === today) {
    return `<span class="workout-relative-tag">Today</span>`;
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === yesterday) {
    return `<span class="workout-relative-tag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">Yesterday</span>`;
  }
  return "";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, duration = 3000) {
  const container = document.getElementById("toastContainer") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const div = document.createElement("div");
  div.id = "toastContainer";
  div.className = "toast-container";
  document.body.appendChild(div);
  return div;
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem("ironlog_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("ironlog_theme", newTheme);
  showToast(`Switched to ${newTheme} mode`);
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
