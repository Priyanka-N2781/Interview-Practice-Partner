const API_BASE_URL = 'https://interview-practice-partner-uz4r.onrender.com';

// Auth guard — redirect to login if not logged in
const _userId   = localStorage.getItem('ipp_user_id');
const _username = localStorage.getItem('ipp_username');
if (!_userId && !window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
}

// ===== SETUP PAGE LOGIC =====
const setupForm = document.getElementById('setupForm');
if (setupForm) {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    
    const nextToStep2Btn = document.getElementById('nextToStep2Btn');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const evaluateBtn = document.getElementById('evaluateBtn');
    const backToStep2Btn = document.getElementById('backToStep2Btn');
    const startBtn = document.getElementById('startBtn');
    
    // Handle Others role
    const roleSelect = document.getElementById('role');
    const customRoleWrapper = document.getElementById('customRoleWrapper');
    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            if (roleSelect.value === 'Others') {
                customRoleWrapper.classList.remove('d-none');
                document.getElementById('customRole').required = true;
            } else {
                customRoleWrapper.classList.add('d-none');
                document.getElementById('customRole').required = false;
            }
        });
    }
    
    let resumeText = '';
    let resumeScore = 0;
    
    // Step Navigation
    if (nextToStep2Btn) {
        nextToStep2Btn.addEventListener('click', () => {
            if(document.getElementById('candidateName').reportValidity()) {
                step1.classList.add('d-none');
                step2.classList.remove('d-none');
            }
        });
    }
    
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => {
            step2.classList.add('d-none');
            step1.classList.remove('d-none');
        });
    }
    
    if (backToStep2Btn) {
        backToStep2Btn.addEventListener('click', () => {
            step3.classList.add('d-none');
            step2.classList.remove('d-none');
        });
    }
    
    if (evaluateBtn) {
        evaluateBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('resumeFile');
            const skillsText = document.getElementById('skillsText').value;
            
            if (!fileInput.files[0] && !skillsText.trim()) {
                alert('Please upload a PDF or enter your skills.');
                return;
            }
            
            evaluateBtn.disabled = true;
            evaluateBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Scanning resume...';
            
            const formData = new FormData();
            const effectiveRole = (document.getElementById('role').value === 'Others')
                ? (document.getElementById('customRole').value.trim() || 'Others')
                : document.getElementById('role').value;
            formData.append('role', effectiveRole);
            if (fileInput.files[0]) {
                formData.append('resume_file', fileInput.files[0]);
            }
            formData.append('resume_text', skillsText);
            
            // Show progress messages while waiting
            const messages = ['Scanning resume...', 'Matching keywords...', 'Calculating score...'];
            let msgIdx = 0;
            const msgTimer = setInterval(() => {
                msgIdx = (msgIdx + 1) % messages.length;
                evaluateBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${messages[msgIdx]}`;
            }, 1200);
            
            try {
                const response = await fetch(`${API_BASE_URL}/evaluate-resume`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                clearInterval(msgTimer);
                
                if (data.error) {
                    alert('Error evaluating resume: ' + data.error);
                } else {
                    resumeScore = data.match_score;
                    resumeText = data.extracted_text;
                    
                    document.getElementById('matchScoreDisplay').innerText = `${resumeScore}/100`;
                    document.getElementById('matchAnalysisDisplay').innerText = data.analysis;
                    
                    step2.classList.add('d-none');
                    step3.classList.remove('d-none');
                }
            } catch (error) {
                clearInterval(msgTimer);
                console.error('Error:', error);
                alert('Failed to connect to the backend server.');
            } finally {
                evaluateBtn.disabled = false;
                evaluateBtn.innerHTML = 'Check Fit & Continue';
            }
        });
    }

    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';

        let difficulty = document.getElementById('difficulty').value;
        let maxQuestions = 5;
        if (difficulty === 'Medium') maxQuestions = 10;
        if (difficulty === 'Hard') maxQuestions = 15;

        const effectiveRole = (document.getElementById('role').value === 'Others')
            ? (document.getElementById('customRole').value.trim() || 'Others')
            : document.getElementById('role').value;

        const payload = {
            candidateName: document.getElementById('candidateName').value,
            role: effectiveRole,
            userId: _userId,
            experienceLevel: document.getElementById('experienceLevel').value,
            difficulty: difficulty,
            interviewType: document.getElementById('interviewType').value,
            maxQuestions: maxQuestions,
            resumeText: resumeText,
            resumeScore: resumeScore
        };

        try {
            const response = await fetch(`${API_BASE_URL}/start-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.interview_id) {
                sessionStorage.setItem('interview_id', data.interview_id);
                sessionStorage.setItem('max_questions', maxQuestions);
                window.location.href = 'interview.html';
            } else {
                alert('Error starting interview. Please try again.');
                startBtn.disabled = false;
                startBtn.innerHTML = 'Start Interview';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to connect to the backend server. Is it running?');
            startBtn.disabled = false;
            startBtn.innerHTML = 'Start Interview';
        }
    });
}

// ===== INTERVIEW PAGE LOGIC =====
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const answerInput = document.getElementById('answerInput');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const finishInterviewBtn = document.getElementById('finishInterviewBtn');
const questionHeader = document.getElementById('questionHeader');
const voiceToggle = document.getElementById('voiceToggle');
const timerDisplay = document.getElementById('timerDisplay');

let currentQuestionId = null;
let currentQuestionNumber = 0;
let maxQuestionsLimit = sessionStorage.getItem('max_questions') ? parseInt(sessionStorage.getItem('max_questions')) : 15;
let isFetchingQuestion = false;

// Timer Logic
let timerSeconds = 0;
let timerInterval = null;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerSeconds++;
        const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const secs = String(timerSeconds % 60).padStart(2, '0');
        if (timerDisplay) timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

// Speech Recognition Logic Removed

function speakText(text) {
    if (voiceToggle && voiceToggle.checked && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

function addMessage(text, isUser = false) {
    const bubble = document.createElement('div');
    bubble.className = isUser ? 'chat-bubble-user' : 'chat-bubble-ai';
    bubble.innerText = text;
    chatContainer.insertBefore(bubble, loadingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function fetchNextQuestion() {
    if (isFetchingQuestion) return;
    
    const interviewId = sessionStorage.getItem('interview_id');
    if (!interviewId) {
        window.location.href = 'index.html';
        return;
    }

    isFetchingQuestion = true;
    loadingIndicator.classList.remove('d-none');
    answerInput.disabled = true;
    submitAnswerBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/next-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interview_id: interviewId })
        });
        const data = await response.json();
        
        loadingIndicator.classList.add('d-none');
        
        if (data.question) {
            currentQuestionId = data.question_id;
            currentQuestionNumber = data.question_number;
            
            questionHeader.innerText = `Question ${currentQuestionNumber} of ${maxQuestionsLimit}`;
            addMessage(data.question, false);
            speakText(data.question);
            
            answerInput.disabled = false;
            answerInput.value = '';
            answerInput.focus();
        } else {
            console.error('Error fetching question:', data);
            addMessage("I'm sorry, I encountered an error generating the next question. Please try finishing the interview.", false);
            finishInterviewBtn.classList.remove('d-none');
            submitAnswerBtn.classList.add('d-none');
            
            // Re-enable inputs if user wants to type something anyway
            answerInput.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        loadingIndicator.classList.add('d-none');
        addMessage("Failed to connect to the server. Please check your connection.", false);
    } finally {
        isFetchingQuestion = false;
    }
}

async function submitAnswer() {
    const answer = answerInput.value.trim();
    if (!answer) return;

    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    addMessage(answer, true);
    
    answerInput.value = '';
    answerInput.disabled = true;
    submitAnswerBtn.disabled = true;

    try {
        await fetch(`${API_BASE_URL}/submit-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question_id: currentQuestionId,
                answer: answer
            })
        });

        if (currentQuestionNumber >= maxQuestionsLimit) {
            loadingIndicator.classList.remove('d-none');
            loadingIndicator.innerHTML = '<div class="spinner-border text-primary" role="status"></div><p class="mt-2">Interview complete. Click Finish Interview below.</p>';
            finishInterviewBtn.classList.remove('d-none');
            submitAnswerBtn.classList.add('d-none');
        } else {
            fetchNextQuestion();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit answer. Please try again.');
        answerInput.disabled = false;
        submitAnswerBtn.disabled = false;
    }
}

function checkInput() {
    if (answerInput && submitAnswerBtn) {
        if (answerInput.value.trim().length > 0) {
            submitAnswerBtn.disabled = false;
        } else {
            submitAnswerBtn.disabled = true;
        }
    }
}

if (answerInput) {
    answerInput.addEventListener('input', checkInput);
    answerInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            if (!submitAnswerBtn.disabled) submitAnswer();
        }
    });
}

if (submitAnswerBtn) {
    submitAnswerBtn.addEventListener('click', submitAnswer);
}

if (finishInterviewBtn) {
    finishInterviewBtn.addEventListener('click', async () => {
        const interviewId = sessionStorage.getItem('interview_id');
        finishInterviewBtn.disabled = true;
        finishInterviewBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating Report...';
        stopTimer();
        
        // Also save final answer if there is one written
        const finalAnswer = answerInput.value.trim();
        if (finalAnswer && currentQuestionNumber >= maxQuestionsLimit) {
            try {
                await fetch(`${API_BASE_URL}/submit-answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question_id: currentQuestionId, answer: finalAnswer })
                });
            } catch(e) {}
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/finish-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interview_id: interviewId })
            });
            const data = await response.json();
            
            if (data.report_id) {
                window.location.href = 'feedback.html';
            } else {
                alert('Error generating report.');
                finishInterviewBtn.disabled = false;
                finishInterviewBtn.innerHTML = 'Finish Interview';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Server connection failed.');
            finishInterviewBtn.disabled = false;
            finishInterviewBtn.innerHTML = 'Finish Interview';
        }
    });
}

// Initial load for interview page
if (chatContainer && sessionStorage.getItem('interview_id')) {
    startTimer();
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function() {
            if (currentQuestionNumber === 0) fetchNextQuestion();
        };
        setTimeout(() => {
            if (currentQuestionNumber === 0) fetchNextQuestion();
        }, 500);
    } else {
        fetchNextQuestion();
    }
}

// ===== FEEDBACK PAGE LOGIC =====
const reportDataArea = document.getElementById('reportData');
const loadingReport = document.getElementById('loadingReport');

if (reportDataArea) {
    const interviewId = sessionStorage.getItem('interview_id');
    if (!interviewId) {
        window.location.href = 'index.html';
    } else {
        loadReport(interviewId);
    }
}

async function loadReport(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/report/${id}`);
        const data = await response.json();
        
        if (data.error) {
            alert('Report not found.');
            return;
        }

        document.getElementById('reportCandidateName').innerText = data.candidate_name;
        document.getElementById('reportRoleContext').innerText = `${data.role} | ${data.experience_level} | ${data.difficulty}`;
        document.getElementById('reportScore').innerText = `${data.overall_score}/100`;
        document.getElementById('reportSummary').innerText = data.feedback;
        
        if(document.getElementById('reportResumeScore')) {
            document.getElementById('reportResumeScore').innerText = `Resume ATS Match: ${data.resume_match_score}/100`;
        }

        populateList('reportStrengths', data.strengths);
        populateList('reportWeaknesses', data.weaknesses);
        populateList('reportImprovements', data.improvements);
        populateList('reportResumeFeedback', data.resume_recommendations);

        const transcriptContainer = document.getElementById('reportTranscript');
        if (data.qa_pairs) {
            data.qa_pairs.forEach(qa => {
                const qaBlock = document.createElement('div');
                qaBlock.className = 'mb-4 border-bottom pb-3';
                qaBlock.innerHTML = `
                    <div class="fw-bold text-primary mb-2">Q: ${qa.question}</div>
                    <div class="bg-light p-3 rounded text-dark">A: ${qa.answer || '[No answer provided]'}</div>
                `;
                transcriptContainer.appendChild(qaBlock);
            });
        }

        loadingReport.classList.add('d-none');
        reportDataArea.classList.remove('d-none');

    } catch (error) {
        console.error('Error fetching report:', error);
        loadingReport.innerHTML = '<p class="text-danger">Failed to load report. Check server connection.</p>';
    }
}

function populateList(elementId, items) {
    const ul = document.getElementById(elementId);
    if (!ul) return;
    ul.innerHTML = '';
    if (items && items.length > 0) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerText = item;
            ul.appendChild(li);
        });
    } else {
        ul.innerHTML = '<li>None identified.</li>';
    }
}

// Download PDF functionality
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        const element = document.getElementById('reportData');
        const candidateName = document.getElementById('reportCandidateName').innerText;
        
        element.classList.remove('d-none');
        element.style.color = '#000';
        
        const cards = element.querySelectorAll('.glass-card');
        cards.forEach(c => c.style.backgroundColor = '#fff');

        const opt = {
            margin:       0.5,
            filename:     `${candidateName}_Interview_Report.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        downloadPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating...';
        downloadPdfBtn.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            cards.forEach(c => c.style.backgroundColor = '');
            element.style.color = '';
            
            downloadPdfBtn.innerHTML = '<i class="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF';
            downloadPdfBtn.disabled = false;
        });
    });
}
