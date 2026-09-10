# 🏋️ IronLog - Personal Workout Tracker

A fast, modern, static workout tracker built to be hosted for free on **GitHub Pages**. 

Designed for date-based workout logging, exercise variations across all muscle groups, reusable exercise images/GIFs, and manual Git-backed persistence.

---

## ✨ Features

* **📅 Date-Based Logging:** Log workouts done on any particular day with sets, reps, and weights.
* **🪙 Flexible Weight Units (Plates, kg, lbs, Bodyweight):**
  * Log weights in **kg**, **lbs**, or simply by the number of **plates** (e.g. `2 plates`, `3 plates`).
  * Displays a clean golden plate pill badge (`🪙 2 plates`).
* **⚡ Optional Fields:** Workout duration (e.g., "45 mins") and personal notes (e.g., "Felt energized, hit a PR!") are completely optional and hide automatically when omitted.
* **🔁 Reusable Exercise Media (Images & GIFs):**
  * Images and GIFs are linked to the **exercise**, not the session date.
  * You upload a photo or animated form GIF once for an exercise (e.g., Bench Press or Cable Flyes), and it will automatically show on every subsequent day that exercise is logged!
  * Supports `.jpg`, `.jpeg`, `.png`, and animated `.gif`.
* **🏷️ Automated Workout Image Renaming:**
  * When you choose an image or GIF in the web interface, it automatically formats and renames the file to match the workout (e.g., `Barbell Bench Press` $\rightarrow$ `barbell_bench_press.jpg`, `Push-Ups` $\rightarrow$ `push_ups.gif`).
  * Provides a 1-click download button for the renamed file so you can drop it directly into `images/workouts/`.
* **📚 50+ Pre-populated Exercises & Variations:**
  * Comprehensive catalog covering Chest, Back, Legs, Shoulders, Biceps, Triceps, Core, and Cardio.
  * Barbell, Dumbbell, Cable, Machine, and Bodyweight variations included.
  * Ability to add your own custom exercises anytime.
* **🔍 Search & Filter:** Filter by muscle group categories or search across exercises, dates, and notes.
* **🌓 Sleek Gym Aesthetic:** Dark mode by default with vibrant cyan/emerald accents and light mode toggle.
* **📱 Fully Responsive:** Clean layout optimized for both mobile phones at the gym and desktop.

---

## 📁 Repository Structure

```text
Workout Tracker/
├── index.html              # Main web application
├── styles.css              # Dark/light modern gym theme stylesheet
├── app.js                  # Application logic, auto-renamer & UI rendering
├── data/
│   ├── exercises.json      # Complete catalog of exercises & standard image filenames
│   └── workouts.json       # Your logged workouts (date, sets, reps, duration, notes)
└── images/
    └── workouts/           # Exercise photos (.jpg) and animated demonstrations (.gif)
```

---

## 🚀 How to Host on GitHub Pages

1. **Create a GitHub Repository:**
   * Go to [github.com/new](https://github.com/new) and create a repository (e.g. `workout-tracker`).
2. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit of IronLog workout tracker"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```
3. **Turn on GitHub Pages:**
   * In your repository on GitHub, go to **Settings** > **Pages** (in the left sidebar).
   * Under **Build and deployment** > **Branch**, select `main` and root `/` folder.
   * Click **Save**.
   * Within 1–2 minutes, your website will be live at `https://<YOUR_USERNAME>.github.io/<REPO_NAME>/`!

---

## 🏋️‍♂️ Daily Workflow: How to Log Workouts

1. Open your live site (or `index.html` locally).
2. Click **`+ Log Workout`**.
3. Pick your date (defaults to today).
4. *(Optional)* Add duration or session notes.
5. Select exercises from the variations list, enter your sets, reps, and weights.
6. If an exercise is new and needs an image or animated GIF:
   * Click **`Select Photo or GIF`**.
   * The app automatically standardizes the file name to `<workout_name>.jpg` or `<workout_name>.gif`.
   * Click the download button and place it into `images/workouts/`.
7. Click **`Save Workout`**.
8. Open the **`Git Sync`** modal on the top right:
   * Download the updated `workouts.json` into your `data/` folder.
   * Run your commit command:
     ```bash
     git add data/workouts.json data/exercises.json images/workouts/
     git commit -m "Log workout for YYYY-MM-DD"
     git push origin main
     ```
   * GitHub Pages updates automatically!

---

## 💡 Image & GIF Naming Rule

Images and GIFs in `images/workouts/` are named after the workout in lowercase with underscores:

| Exercise Name | File Format | Standard Filename |
| :--- | :--- | :--- |
| Barbell Bench Press | JPG | `barbell_bench_press.jpg` |
| Incline Dumbbell Press | JPG | `incline_dumbbell_press.jpg` |
| Cable Chest Flyes | Animated GIF | `cable_chest_flyes.gif` |
| Conventional Deadlift | JPG | `conventional_deadlift.jpg` |
| Lat Pulldown (Wide Grip) | JPG | `lat_pulldown_wide_grip.jpg` |
| Pull-Ups | Animated GIF | `pull_ups.gif` |
| Barbell Bicep Curl | JPG | `barbell_bicep_curl.jpg` |
| Hanging Leg Raises | Animated GIF | `hanging_leg_raises.gif` |
| Bulgarian Split Squat | Animated GIF | `bulgarian_split_squat.gif` |
