# devNectar Multilingual RAG Chatbot

This is a premium, RAG-based chatbot that integrates with local Ollama models to provide contextual answers in Hindi and English.

## Features
- **RAG Pipeline**: Retrieves context from `faqs.json` using FAISS and HuggingFace embeddings.
- **Multilingual**: Supports English and Hindi with a toggle.
- **Ollama Integration**: Uses locally running Ollama for generation.
- **Premium UI**: Modern, glassmorphic design with micro-animations.

## Prerequisites
1. **Ollama**: Install from [ollama.com](https://ollama.com/).
2. **Model**: Pull the Llama 3 model (or update `app.py` with your preferred model):
   ```bash
   ollama pull llama3
   ollama pull nomic-embed-text
   ```

## Setup & Running

### 1. Backend (Python)
```bash
cd server
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
The backend will run on `http://localhost:5001`.

### 2. Frontend (React + Vite)
```bash
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## Knowledge Base
The knowledge base is stored in `server/data/faqs.json`. You can update this file to add more questions and answers.
