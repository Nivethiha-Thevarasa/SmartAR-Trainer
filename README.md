
# SMART AR Trainer

### Personalized Real-Time Posture Correction and Augmented Reality Feedback Framework for Home Workout Activities

## About the Project

**SMART AR Trainer** is an intelligent home workout assistance system designed to help users perform exercises with proper posture and technique.

The system combines computer vision, machine learning, and augmented reality to monitor workout activities, count exercise repetitions, provide posture feedback, recommend personalized workout plans, and track user progress.

This project was developed as a final-year undergraduate project at **Rajarata University of Sri Lanka**.

## Key Features

- **User Authentication:** User registration, login, form validation, and email OTP verification.
- **Pose Detection:** Detects human body poses using MediaPipe BlazePose.
- **Repetition Counting:** Automatically counts repetitions for supported workout exercises.
- **Posture Monitoring:** Analyzes exercise movements and provides posture-related feedback.
- **Personalized Workout Recommendations:** Uses machine learning to recommend suitable workout plans.
- **Progress Tracking:** Monitors workout activities and user progress.
- **Augmented Reality Feedback:** Provides interactive workout experiences through Unity-based AR applications.
- **Dashboard:** Displays workout-related information and progress.

## Technologies Used

- **Programming Languages:** Python, JavaScript, TypeScript, C#
- **Frontend Technologies:** React, Vite
- **Backend:** Python
- **Computer Vision:** OpenCV, MediaPipe (BlazePose)
- **Machine Learning:** Scikit-learn
- **Desktop Application:** Tauri
- **Augmented Reality:** Unity
- **Database:** Database integration
- **Development Tools:** Visual Studio Code, Jupyter Notebook, Git, GitHub

## Project Structure

```text
SMART-AR-Trainer/
│
├── backend/
│   ├── ml/
│   │   └── model_assets/
│   ├── models/
│   ├── tools/
│   ├── utils/
│   ├── api.py
│   └── __init__.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── src-tauri/
│   └── package.json
│
├── Unity/
│   └── AR exercise applications
│
├── main.py
├── requirements.txt
├── .gitignore
└── README.md
```

## Machine Learning Model Assets

The repository includes trained model-related files required by the workout recommendation component.

These assets are stored in:

```text
backend/ml/model_assets/
```

## Project Recognition

- **NBQSA 2026:** Merit Award – Tertiary Student Project, Technology Category.
- **RUSL Innorbit Carnival 2026:** Top 10 Finalist Project – Ranked 7th.

## Development Team

**Team Name:** Unified Explorers

Developed as a final-year undergraduate project at the **Department of Computing, Faculty of Applied Sciences, Rajarata University of Sri Lanka**.

## Repository Contents

This repository contains:

- Backend application source code
- Frontend application source code
- Machine learning model assets
- Supporting resources and configurations
- Project documentation

---

**SMART AR Trainer – Making Home Workouts Smarter with AI and Augmented Reality.**
