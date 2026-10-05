# 🧠 AI Response Validation System with Hallucination Detection

> **Development of an AI Response Validation System with Hallucination Detection Assistance**  
> *Infosys Internship Project — v2.0*

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8+-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Overview

The **AI Response Validation System** is a full-stack web application that evaluates, validates, and detects hallucinations in AI-generated responses. It provides a structured pipeline to compare AI outputs against reference content using NLP techniques, semantic similarity, RAG (Retrieval-Augmented Generation), and LLM-based judges.

The system is designed for researchers, developers, and organizations who need to **ensure the accuracy, completeness, and reliability of AI-generated content** before it is used in production.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔍 **Hallucination Detection** | Identifies claims in AI responses that are unsupported or contradicted by reference material |
| ✅ **Claim Extraction & Validation** | Automatically extracts individual factual claims and validates each one |
| 📊 **Multi-dimensional Scoring** | Scores responses on Accuracy, Relevance, Completeness, and Confidence |
| 📁 **Batch Evaluation** | Upload CSV files for bulk evaluation of multiple AI responses |
| 📈 **Analytics Dashboard** | Visual charts and metrics for evaluation history and performance trends |
| 📄 **PDF Report Export** | Generate detailed PDF evaluation reports for individual and batch evaluations |
| 🗃️ **Evaluation History** | Persistent storage of all past evaluations with filter and search |
| 🔄 **RAG Pipeline** | Retrieval-Augmented Generation using ChromaDB vector store for context grounding |
| 🌙 **Dark / Light Mode** | Full dark mode support across the entire UI |
| 👤 **Account Settings** | User profile, API key management, and system preferences |

---

## 🏗️ Architecture

```
User (Browser)
     │
     ▼
React.js Frontend (Vite, port 5173)
     │  Axios HTTP Requests
     ▼
FastAPI Backend (Uvicorn, port 8000)
     │
     ├── /api/validate      → Validation Engine
     ├── /api/batch         → Batch Evaluator
     ├── /api/history       → Evaluation History
     └── /api/analytics     → Analytics & Metrics
          │
          ▼
     AI Services Layer
     ├── SentenceTransformers  (all-MiniLM-L6-v2) — Semantic similarity
     ├── ChromaDB              — Vector store for RAG
     ├── LangChain             — RAG pipeline orchestration
     ├── NLTK + scikit-learn   — NLP preprocessing
     └── LLM Judges            — Hallucination, Accuracy, Relevance, Completeness, Verdict
          │
          ▼
     Storage
     ├── MongoDB  (primary, if available)
     └── SQLite   (automatic fallback)
          │
          ▼
     ReportLab → PDF Export
```

---

## 🗂️ Project Structure

```
Infosys/
├── backend/                        # FastAPI backend
│   ├── main.py                     # App entry point & lifespan
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables (API keys, DB URI)
│   ├── routers/
│   │   ├── validate.py             # POST /api/validate
│   │   ├── batch.py                # POST /api/batch
│   │   ├── history.py              # GET /api/history
│   │   └── analytics.py            # GET /api/analytics
│   ├── services/
│   │   ├── validation_engine.py    # Core orchestration logic
│   │   ├── hallucination_detector.py
│   │   ├── hallucination_judge.py  # LLM-based hallucination judge
│   │   ├── accuracy_judge.py       # LLM-based accuracy judge
│   │   ├── relevance_judge.py      # LLM-based relevance judge
│   │   ├── completeness_judge.py   # LLM-based completeness judge
│   │   ├── verdict_judge.py        # Final verdict aggregator
│   │   ├── claim_extractor.py      # Extracts claims from text
│   │   ├── confidence_scorer.py    # Confidence scoring
│   │   ├── nlp_validator.py        # SentenceTransformer wrapper
│   │   ├── rag_pipeline.py         # LangChain + ChromaDB RAG
│   │   ├── vector_store.py         # ChromaDB vector store management
│   │   ├── batch_evaluator.py      # CSV batch processing
│   │   ├── pdf_generator.py        # Single-result PDF export
│   │   ├── batch_pdf_generator.py  # Batch PDF export
│   │   └── benchmark_runner.py     # Benchmark utilities
│   ├── database/
│   │   └── db.py                   # MongoDB / SQLite initialisation
│   └── models/                     # Pydantic request/response models
│
├── src/                            # React frontend (Vite)
│   ├── App.jsx                     # Main router and layout
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Global styles
│   ├── pages/
│   │   ├── LandingPage.jsx         # Home / marketing page
│   │   ├── Auth.jsx                # Login & Registration
│   │   ├── Dashboard.jsx           # Main dashboard
│   │   ├── Validate.jsx            # Single validation UI
│   │   ├── BatchEvaluation.jsx     # Batch CSV evaluation UI
│   │   ├── EvaluationDashboard.jsx # Detailed evaluation results
│   │   ├── History.jsx             # Evaluation history
│   │   ├── Analytics.jsx           # Charts & metrics
│   │   ├── AccountSettings.jsx     # User profile & settings
│   │   ├── TechnicalDocumentation.jsx
│   │   ├── Architecture.jsx
│   │   ├── CodeWalkthrough.jsx
│   │   └── About.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── Sidebar.jsx
│   └── services/                   # Axios API service layer
│
├── start.ps1                       # One-click startup script (Windows)
├── package.json                    # Frontend dependencies
├── vite.config.js                  # Vite config
├── tailwind.config.js              # Tailwind CSS config
└── generate_report_pdf.py          # Standalone PDF report generator
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **Git**
- (Optional) **MongoDB** — SQLite is used as an automatic fallback

### 1. Clone the Repository

```bash
git clone https://github.com/Pranithapindi/Development-of-AI-Response-Validation-System-with-Hallucination-Detection-Assistance-.git
cd Development-of-AI-Response-Validation-System-with-Hallucination-Detection-Assistance-
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Optional: OpenAI or other LLM API key for judge services
OPENAI_API_KEY=your_key_here

# Optional: MongoDB connection string (SQLite used if not set)
MONGODB_URI=mongodb://localhost:27017/ai_validation

# Server config
HOST=0.0.0.0
PORT=8000
```

### 4. Frontend Setup

```bash
# From the project root
npm install
```

### 5. Run the Application

#### Option A — One-click (Windows)
```powershell
.\start.ps1
```

#### Option B — Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
.\.venv\Scripts\python.exe main.py
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

### 6. Open the App

| Service | URL |
|---|---|
| 🖥️ Frontend | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:8000 |
| 📚 Swagger Docs | http://localhost:8000/docs |
| 📖 ReDoc | http://localhost:8000/redoc |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/validate` | Validate a single AI response |
| `POST` | `/api/batch` | Batch evaluate from CSV upload |
| `GET` | `/api/history` | Retrieve past evaluations |
| `GET` | `/api/analytics` | Get analytics & aggregated metrics |
| `GET` | `/docs` | Interactive Swagger UI |

### Example: Validate a Response

```http
POST /api/validate
Content-Type: application/json

{
  "question": "What is the capital of France?",
  "ai_response": "The capital of France is Berlin.",
  "reference_context": "France is a country in Western Europe. Its capital city is Paris."
}
```

**Response:**
```json
{
  "verdict": "HALLUCINATION_DETECTED",
  "confidence": 0.92,
  "hallucination_score": 0.88,
  "accuracy_score": 0.12,
  "relevance_score": 0.74,
  "completeness_score": 0.45,
  "claims": [],
  "explanation": "The response incorrectly states Berlin as the capital..."
}
```

---

## 🧪 Running Tests

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

---

## 📦 Tech Stack

### Backend
| Library | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **SentenceTransformers** | Semantic similarity (`all-MiniLM-L6-v2`) |
| **ChromaDB** | Vector database for RAG |
| **LangChain** | RAG pipeline orchestration |
| **NLTK** | NLP preprocessing |
| **scikit-learn** | ML utilities |
| **ReportLab** | PDF generation |
| **pymongo** | MongoDB driver |
| **pydantic** | Data validation |

### Frontend
| Library | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |
| **Axios** | HTTP client |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👩‍💻 Author

**Pranitha Pindi**  
Infosys Internship Project  
[GitHub Profile](https://github.com/Pranithapindi)

---

> *Built with ❤️ to make AI systems more trustworthy and reliable.*
