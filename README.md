# Interview Practice Partner

<img width="1911" height="845" alt="image" src="https://github.com/user-attachments/assets/1a96593f-9e45-47a2-bc4c-03fb697fef98" />

🌐 Live Demo: https://priyanka-n2781.github.io/Interview-Practice-Partner/frontend/login.html

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

System Architecture

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/32d9cb1b-5395-4e2d-9c69-97e79f44d837" />


**Interview Workflow**

User selects job role and experience level
Interview session is initiated
AI generates context-aware questions
User responds via voice or text
AI evaluates responses in real time
Final feedback report is generated
Results are displayed and optionally downloaded

## Screenshots

<img width="1912" height="871" alt="image" src="https://github.com/user-attachments/assets/02af25ed-5d2a-41f5-b3e2-a9e801c6d59f" />

<img width="1877" height="900" alt="image" src="https://github.com/user-attachments/assets/9dad9792-84e3-4cbe-b6c3-d10bd6f6192b" />

<img width="1918" height="868" alt="image" src="https://github.com/user-attachments/assets/e9727d40-2182-4271-aed2-bb87dc2f034b" />

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/68013a25-911b-4d58-8f59-2376565b870b" />

<img width="1913" height="890" alt="image" src="https://github.com/user-attachments/assets/b6c56c2a-e5d9-4959-af79-b110a9b1c894" />

<img width="1918" height="853" alt="image" src="https://github.com/user-attachments/assets/f4e9d15f-fb6c-443f-a078-8a5393ef2e63" />


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


---

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Web Speech API

### Backend
- Python Flask
- SQLite

### AI Integration
- Google Gemini API

---

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js (Optional, only for local static server)
- Google Gemini API Key

---

### Backend Setup

```bash
cd InterviewPracticePartner/backend
pip install -r requirements.txt

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


## Future Enhancements
- User authentication and login.
- Support for uploading resumes to tailor questions to the candidate's exact experience.
- More specific technical coding environments (e.g., integrating a code editor for SWE roles).
- Video analysis to provide feedback on body language and eye contact.


## Author

Priyanka N

- GitHub: [Priyanka-N2781](https://github.com/Priyanka-N2781)  
- LinkedIn: [Priyanka N](https://www.linkedin.com/in/priyanka1826)
