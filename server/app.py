# -*- coding: utf-8 -*-
import os
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

# Load environment variables at the very beginning
load_dotenv()

HF_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")
print(f"HF Token found: {'Yes' if HF_TOKEN else 'No'}")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def health():
    return "Backend is running!"

# Configuration
DATA_PATH = os.path.join(os.path.dirname(__file__), "data/faqs.json")
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Use InferenceClient directly — confirmed working
client = InferenceClient(
    model="Qwen/Qwen2.5-7B-Instruct",
    token=HF_TOKEN,
)

# Load FAQs and initialize Vector Store
def initialize_rag():
    if not os.path.exists(DATA_PATH):
        print(f"Error: {DATA_PATH} not found.")
        return None

    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        faqs = json.load(f)

    documents = [f"Question: {item['question']}\nAnswer: {item['answer']}" for item in faqs]
    metadatas = [{"source": "faqs.json", "index": i} for i in range(len(faqs))]

    print("Loading embeddings model...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    vectorstore = FAISS.from_texts(documents, embeddings, metadatas=metadatas)
    print("Vector store ready!")
    return vectorstore

vectorstore = initialize_rag()

SYSTEM_PROMPT = """You are Dev-Ai, a helpful AI assistant for devNectar.

STRICT LANGUAGE RULE: You MUST reply ENTIRELY in {language}. 
- Do NOT mix languages. Do NOT write any English words if the language is Hindi or Marathi.
- Do NOT start with "I don't know" in English. If you don't know, say so ONLY in {language}.
- NEVER use the phrase "I don't know" in English when responding in Hindi or Marathi.

HOW TO ANSWER:
1. Check the devNectar FAQ context below. If it has the answer, use it.
2. If the FAQ does not have the answer, use your general knowledge to answer.
3. Give a clear, direct, helpful answer — do not mention whether the answer came from the FAQ or not.

EXAMPLES of correct behavior (language = Hindi):
- Question: "भारत के प्रधानमंत्री कौन हैं?" → Answer: "भारत के वर्तमान प्रधानमंत्री नरेंद्र मोदी हैं।"
- Question: "विराट कोहली कौन हैं?" → Answer: "विराट कोहली भारत के एक प्रसिद्ध क्रिकेटर हैं।"

devNectar FAQ Context:
{context}"""

@app.route('/api/chat', methods=['POST'])
def chat():
    print("Received request at /api/chat")
    data = request.json
    user_query = data.get('query')
    language = data.get('language', 'English')

    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    if not vectorstore:
        return jsonify({"error": "Vector store not initialized"}), 500

    try:
        # Retrieve relevant context
        docs = vectorstore.similarity_search(user_query, k=3)
        context = "\n\n".join(doc.page_content for doc in docs)

        system_message = SYSTEM_PROMPT.format(language=language, context=context)

        # Use chat_completion which works with the 'conversational' task
        result = client.chat_completion(
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_query},
            ],
            max_tokens=512,
            temperature=0.1,
        )

        response_text = result.choices[0].message.content
        print(f"Response received ({len(response_text)} chars)")
        return jsonify({"response": response_text})

    except Exception as e:
        print(f"Error during chat: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    os.makedirs("data", exist_ok=True)
    app.run(host='0.0.0.0', port=5001, debug=False)
