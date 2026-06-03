# SMARTAR Trainer (Desktop App)

Lightweight desktop application for AR-guided workouts, activity tracking, and analytics.

This repository contains the desktop client, backend helpers, machine learning models, and Unity AR builds used by the SMARTAR Trainer project.

## Quick Start

- Prerequisites: Python 3.8+ and pip.
- Install Python dependencies:

```bash
pip install -r requirements.txt
```

- Run the desktop application from the repository root:

```bash
python main.py
```

## Project Structure

- `main.py` — application entrypoint for the desktop client.
- `requirements.txt` — Python dependencies.
- `backend/` — backend modules, database helpers, and ML utilities:
  - `backend/ml/` — model code and `workout_plan_predictor.py`.
  - `backend/models/` — data management and model storage helpers.
  - `backend/database/` — database-related code.
- `frontend/` — desktop UI and frontend assets:
  - `frontend/ui/` — UI screens and widgets (fitness form, session, analytics, etc.).
  - `frontend/assets/` — static assets (charts and plugins).
- `Unity/` — packaged Unity builds for different exercises (exe folders for AR experiences).

## How it works (high level)

- The Python front end provides a desktop UI for login, user profile, starting workout sessions, and viewing analytics.
- Unity builds in `Unity/` are standalone AR exercise executables that can be launched by the user; they communicate session data back to the Python backend utilities when enabled.
- The `backend/ml` folder contains ML logic used to generate or recommend workout plans based on tracked activity.

## Development Notes

- To run unit tests or linting, add your preferred test tools and run them locally.
- When updating or retraining models, follow the code in `backend/ml` and commit model artifacts under `backend/ml/model_assets/`.

## Running Unity AR builds

Open the appropriate executable inside the matching folder under `Unity/` (for example, `Unity/CRUNCHES_AR_EXE/Crunches_Data/` contains the build files). These are prebuilt runtime folders rather than Unity project sources.

