# Interview Practice Partner

An AI-powered full-stack web application designed to help candidates prepare for their dream jobs by conducting realistic, interactive mock interviews with real-time feedback.

## Project Overview

Interview Practice Partner acts as a virtual interviewer. Instead of just asking standard questions, the AI dynamically generates contextual and follow-up questions based on the chosen job role, experience level, and the candidate's previous answers. 

It provides an end-to-end interview experience including a setup phase, the interview session (with speech recognition and synthesis), and a comprehensive feedback report.

## Features

- **Role-Specific Interviews**: Tailored for roles like Software Engineer, HR, Data Analyst, etc.
- **Dynamic Questioning**: The Gemini AI adjusts questions based on your answers and difficulty level.
- **Voice Support**: 
  - **Speech-to-Text**: Speak your answers using the microphone.
  - **Text-to-Speech**: The AI interviewer reads the questions aloud naturally.
- **Comprehensive Feedback**: Get a detailed report with an overall score, strengths, weaknesses, and actionable tips.
- **Downloadable PDF Report**: Easily save your feedback as a PDF using one click.
- **Beginner Friendly Tech Stack**: Simple HTML/CSS/JS frontend completely decoupled from a Python Flask backend.

## Screenshots
*(Add screenshots of the landing page, interview UI, and feedback report here)*

## Folder Structure

```
InterviewPracticePartner/
├── backend/
│   ├── app.py                 # Core Flask backend server and API endpoints
│   ├── database.db            # SQLite database (auto-generated)
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── index.html             # Landing Page
│   ├── setup.html             # Interview Configuration Form
│   ├── interview.html         # Main Interview Interface
│   ├── feedback.html          # Feedback Dashboard
│   ├── style.css              # Custom UI Styles (Glassmorphism & Gradients)
│   └── script.js              # Frontend logic (API Calls, Voice APIs, State)
└── README.md                  # Project Documentation
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js (Optional, only if using local dev servers like `http-server`)
- Google Gemini API Key

### Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd InterviewPracticePartner/backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Gemini API Key as an environment variable:
   - **Windows (Command Prompt):** `set GEMINI_API_KEY=your_api_key_here`
   - **Windows (PowerShell):** `$env:GEMINI_API_KEY="your_api_key_here"`
   - **Mac/Linux:** `export GEMINI_API_KEY="your_api_key_here"`
4. Run the Flask server:
   ```bash
   python app.py
   ```
   *The server will run on `http://localhost:5000`.*

### Frontend Setup
Since the frontend uses vanilla HTML/JS/CSS, you can serve it easily.
1. Navigate to the frontend folder.
2. Open `index.html` in your browser. 
   *(Note: For the Speech Recognition API to work reliably in all browsers, it's recommended to serve the frontend via a local server rather than just a `file://` URL. You can use VS Code's "Live Server" extension, or run `python -m http.server` in the frontend folder).*

## Gemini API Setup

This project uses `google-generativeai` (the official Gemini SDK).
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create an API Key.
3. Provide the key via the `GEMINI_API_KEY` environment variable on your backend server.

## How Voice Works

The application utilizes native browser Web APIs, meaning no heavy third-party audio processing libraries are needed on the frontend:
- **Speech-to-Text**: Uses `webkitSpeechRecognition` to transcribe the user's microphone audio into text in real-time.
- **Text-to-Speech**: Uses `speechSynthesis` to read the AI-generated questions back to the user using the operating system's native voices.

## Deployment Instructions

Because the frontend and backend are decoupled via REST APIs and CORS, you must deploy them separately.

### Deploying the Backend (Render)
1. Push the code to a GitHub repository.
2. Go to [Render](https://render.com/) and create a new **Web Service**.
3. Connect your GitHub repository and select the `backend/` directory as the Root Directory.
4. Set the Start Command to: `gunicorn app:app` (You may need to add `gunicorn` to your `requirements.txt`).
5. Add your `GEMINI_API_KEY` in Render's Environment Variables section.
6. Copy the deployed Render URL (e.g., `https://your-backend.onrender.com`).

### Deploying the Frontend (Netlify)
1. Before deploying, update `API_BASE_URL` in `frontend/script.js` to point to your deployed Render backend URL.
2. Go to [Netlify](https://www.netlify.com/) and click **Add new site** -> **Deploy manually**.
3. Drag and drop the `frontend/` folder into the Netlify deployment area.
4. Your frontend is now live!

## Future Enhancements
- User authentication and login.
- Support for uploading resumes to tailor questions to the candidate's exact experience.
- More specific technical coding environments (e.g., integrating a code editor for SWE roles).
- Video analysis to provide feedback on body language and eye contact.
