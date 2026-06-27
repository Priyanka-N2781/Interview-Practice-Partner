import os
import sqlite3
import json
import hashlib
from pypdf import PdfReader
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    traceback.print_exc()
    return jsonify(error=str(e)), 500

# Configure Gemini API
API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("WARNING: GEMINI_API_KEY environment variable not set.")

model = genai.GenerativeModel('gemini-flash-lite-latest')

DATABASE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE, timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_db_connection()

    # Users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Interviews table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            candidate_name TEXT,
            role TEXT,
            experience_level TEXT,
            difficulty TEXT,
            interview_type TEXT,
            max_questions INTEGER,
            resume_text TEXT,
            resume_match_score INTEGER,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            overall_score INTEGER,
            feedback TEXT,
            strengths TEXT,
            weaknesses TEXT,
            improvements TEXT,
            resume_recommendations TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Backward-compat column additions
    for col, coltype in [
        ('user_id', 'INTEGER'), ('max_questions', 'INTEGER'),
        ('resume_text', 'TEXT'), ('resume_match_score', 'INTEGER'),
        ('resume_recommendations', 'TEXT')
    ]:
        try:
            conn.execute(f'ALTER TABLE interviews ADD COLUMN {col} {coltype}')
        except sqlite3.OperationalError:
            pass

    # QA pairs table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS qa_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER,
            question TEXT,
            answer TEXT,
            order_index INTEGER,
            FOREIGN KEY(interview_id) REFERENCES interviews(id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ─────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = (data.get('username') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, hash_password(password))
        )
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        return jsonify({"user_id": user['id'], "username": user['username'], "email": user['email']})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Username or email already exists."}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    conn = get_db_connection()
    user = conn.execute(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?',
        (email, hash_password(password))
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    return jsonify({"user_id": user['id'], "username": user['username'], "email": user['email']})

# ─────────────────────────────────────────
#  RESUME EVALUATION
# ─────────────────────────────────────────

@app.route('/evaluate-resume', methods=['POST'])
def evaluate_resume():
    role = request.form.get('role', 'Candidate')
    resume_text = request.form.get('resume_text', '')

    if 'resume_file' in request.files:
        file = request.files['resume_file']
        if file.filename.endswith('.pdf'):
            try:
                pdf_reader = PdfReader(BytesIO(file.read()))
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() + "\n"
            except Exception as e:
                return jsonify({"error": "Failed to parse PDF: " + str(e)}), 400

    if not resume_text.strip():
        return jsonify({"error": "No resume text or file provided."}), 400

    resume_snippet = resume_text[:1500]
    prompt = f"""ATS screener. Rate resume vs role '{role}'. Output ONLY this JSON:
{{"match_score": <int/100>, "brief_analysis": "<1 sentence>"}}
Resume: {resume_snippet}"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=80)
        )
        result_text = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(result_text)
        return jsonify({
            "match_score": data.get("match_score", 0),
            "analysis": data.get("brief_analysis", ""),
            "extracted_text": resume_text
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────
#  INTERVIEW ROUTES
# ─────────────────────────────────────────

@app.route('/start-interview', methods=['POST'])
def start_interview():
    data = request.json
    user_id      = data.get('userId')
    name         = data.get('candidateName', 'Candidate')
    role         = data.get('role', 'Software Engineer')
    exp          = data.get('experienceLevel', 'Fresher')
    diff         = data.get('difficulty', 'Medium')
    type_        = data.get('interviewType', 'Technical')
    max_questions = data.get('maxQuestions', 15)
    resume_text  = data.get('resumeText', '')
    resume_score = data.get('resumeScore', 0)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO interviews (user_id, candidate_name, role, experience_level, difficulty, interview_type, max_questions, resume_text, resume_match_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, name, role, exp, diff, type_, max_questions, resume_text, resume_score))
    interview_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"interview_id": interview_id, "message": "Interview started successfully."})

@app.route('/next-question', methods=['POST'])
def next_question():
    data = request.json
    interview_id = data.get('interview_id')

    conn = get_db_connection()
    interview = conn.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,)).fetchone()
    qa_pairs   = conn.execute('SELECT * FROM qa_pairs WHERE interview_id = ? ORDER BY order_index ASC', (interview_id,)).fetchall()

    if not interview:
        conn.close()
        return jsonify({"error": "Interview not found"}), 404

    next_order    = len(qa_pairs) + 1
    max_questions = int(interview['max_questions'] or 5)

    recent_history = qa_pairs[-4:] if len(qa_pairs) > 4 else qa_pairs
    history_text = ""
    for qa in recent_history:
        history_text += f"Q: {qa['question']}\nA: {qa['answer'] if qa['answer'] else '[No answer]'}\n"

    if next_order == 1:
        instruction = f'Greet the candidate: "Hi {interview["candidate_name"]}!" and ask for a brief self-introduction.'
    elif next_order >= max_questions - 2:
        instruction = 'First, provide exactly ONE brief sentence of constructive feedback acknowledging their previous answer. Then, ask ONE general HR/behavioral question (teamwork, goals, conflict, salary). No technical questions.'
    else:
        instruction = f'First, provide exactly ONE brief sentence of constructive feedback acknowledging their previous answer. Then, ask ONE new {interview["interview_type"]} question for a {interview["difficulty"]} {interview["role"]} role. Do NOT repeat past questions.'

    prompt = f"""You are a professional interviewer. Candidate: {interview['candidate_name']}, Role: {interview['role']}, Level: {interview['experience_level']}.
Recent history:\n{history_text}
Task: {instruction}
Output ONLY the combined feedback and question text. No preamble, no labels."""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=150)
        )
        question_text = response.text.strip()

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO qa_pairs (interview_id, question, order_index)
            VALUES (?, ?, ?)
        ''', (interview_id, question_text, next_order))
        question_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({"question_id": question_id, "question": question_text, "question_number": next_order})
    except Exception as e:
        conn.close()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    data = request.json
    question_id = data.get('question_id')
    answer      = data.get('answer')

    if not question_id or not answer:
        return jsonify({"error": "Missing question_id or answer"}), 400

    conn = get_db_connection()
    conn.execute('UPDATE qa_pairs SET answer = ? WHERE id = ?', (answer, question_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Answer saved."})

@app.route('/finish-interview', methods=['POST'])
def finish_interview():
    data = request.json
    interview_id = data.get('interview_id')

    conn = get_db_connection()
    interview = conn.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,)).fetchone()
    qa_pairs   = conn.execute('SELECT * FROM qa_pairs WHERE interview_id = ? ORDER BY order_index ASC', (interview_id,)).fetchall()

    if not interview:
        conn.close()
        return jsonify({"error": "Interview not found"}), 404

    history_text = ""
    for qa in qa_pairs:
        ans = (qa['answer'] or '[No answer]')[:300]
        history_text += f"Q: {qa['question']}\nA: {ans}\n"

    resume_snippet = (interview['resume_text'] or '')[:800]

    prompt = f"""Evaluate this mock interview. Candidate: {interview['candidate_name']}, Role: {interview['role']}, Level: {interview['experience_level']}.
Transcript ({len(qa_pairs)} questions):\n{history_text}
Resume snippet: {resume_snippet}
Output ONLY valid JSON (no extra text):
{{"overall_score":<int/100>,"feedback_summary":"<2 sentences>","strengths":["<str>","<str>"],"weaknesses":["<str>","<str>"],"improvements":["<str>","<str>"],"resume_recommendations":["<str>","<str>"]}}"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(max_output_tokens=2000)
        )
        result_text = response.text.replace('```json', '').replace('```', '').strip()
        feedback_data = json.loads(result_text)

        conn.execute('''
            UPDATE interviews
            SET overall_score = ?, feedback = ?, strengths = ?, weaknesses = ?, improvements = ?, resume_recommendations = ?
            WHERE id = ?
        ''', (
            feedback_data.get('overall_score'),
            feedback_data.get('feedback_summary'),
            json.dumps(feedback_data.get('strengths', [])),
            json.dumps(feedback_data.get('weaknesses', [])),
            json.dumps(feedback_data.get('improvements', [])),
            json.dumps(feedback_data.get('resume_recommendations', [])),
            interview_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Interview evaluated.", "report_id": interview_id})
    except Exception as e:
        import traceback
        traceback.print_exc()
        details = ""
        try:
            if 'response' in locals():
                details = response.text
        except Exception:
            details = "Response blocked or empty"
        return jsonify({"error": str(e), "details": details}), 500

# ─────────────────────────────────────────
#  HISTORY & REPORT ROUTES
# ─────────────────────────────────────────

@app.route('/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    if user_id:
        interviews = conn.execute(
            'SELECT id, candidate_name, role, experience_level, difficulty, interview_type, max_questions, resume_match_score, date, overall_score FROM interviews WHERE user_id = ? ORDER BY date DESC',
            (user_id,)
        ).fetchall()
    else:
        interviews = []
    conn.close()
    return jsonify([dict(r) for r in interviews])

@app.route('/report/<int:id>', methods=['GET'])
def get_report(id):
    conn = get_db_connection()
    interview = conn.execute('SELECT * FROM interviews WHERE id = ?', (id,)).fetchone()
    qa_pairs  = conn.execute('SELECT * FROM qa_pairs WHERE interview_id = ? ORDER BY order_index ASC', (id,)).fetchall()
    conn.close()

    if not interview:
        return jsonify({"error": "Report not found"}), 404

    report = dict(interview)
    for key in ['strengths', 'weaknesses', 'improvements', 'resume_recommendations']:
        try:
            report[key] = json.loads(report[key]) if report[key] else []
        except Exception:
            report[key] = []

    report['qa_pairs'] = [dict(qa) for qa in qa_pairs]
    return jsonify(report)

@app.route('/delete-interview/<int:id>', methods=['DELETE'])
def delete_interview(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM qa_pairs WHERE interview_id = ?', (id,))
    conn.execute('DELETE FROM interviews WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted."})

@app.route('/clear-history', methods=['DELETE'])
def clear_history():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    if user_id:
        # Get all interview IDs for this user first
        rows = conn.execute('SELECT id FROM interviews WHERE user_id = ?', (user_id,)).fetchall()
        for row in rows:
            conn.execute('DELETE FROM qa_pairs WHERE interview_id = ?', (row['id'],))
        conn.execute('DELETE FROM interviews WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "History cleared."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
