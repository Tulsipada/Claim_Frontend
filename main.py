# main.py
from app.services import process_and_store_claim, get_all_claims, get_single_claim
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import uuid

from app.db import get_db, Base, engine
from app.schemas import ClaimResponse
from app.services import (
    process_and_store_claim,
    get_all_claims_ordered_by_ai,
    get_single_claim,
    generate_and_store_ordered_pdf
)

# --------------- NEW IMPORTS FOR AI CHAT ---------------
from pydantic import BaseModel
from groq import Groq

# Load Groq Client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# -------------------------------------
# INITIAL SETUP
# -------------------------------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create DB tables
Base.metadata.create_all(bind=engine)

# Ensure ordered_pdf_path column exists
from sqlalchemy import text, inspect
def ensure_ordered_pdf_path_column():
    inspector = inspect(engine)
    if 'claims' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('claims')]
        if 'ordered_pdf_path' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE claims ADD COLUMN ordered_pdf_path VARCHAR"))
                conn.commit()
                print("[Migration] Added ordered_pdf_path column")

ensure_ordered_pdf_path_column()

app = FastAPI(
    title="Claims AI Backend",
    description="PDF → OCR → Extract → Classify → Save",
    version="1.0.1",
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------
# ROUTES
# -------------------------------------

@app.get("/")
def root():
    return {"message": "Claims AI Backend Running Successfully!"}


# --------------------------
# UPLOAD API
# --------------------------
@app.post("/upload-claim", response_model=ClaimResponse)
async def upload_claim(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        claim = process_and_store_claim(db, file_path, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing claim: {str(e)}")

    return claim


# --------------------------
# LIST ALL CLAIMS
# --------------------------
@app.get("/claims", response_model=list[ClaimResponse])
def list_claims(db: Session = Depends(get_db)):
    return get_all_claims_ordered_by_ai(db)




# --------------------------
# GENERATE ORDERED PDF
# --------------------------
@app.post("/generate-ordered-pdf")
def generate_ordered_pdf_endpoint(db: Session = Depends(get_db)):
    try:
        pdf_path = generate_and_store_ordered_pdf(db)
        if pdf_path:
            return {
                "success": True,
                "message": "Ordered PDF generated successfully",
                "pdf_path": pdf_path
            }
        else:
            return {
                "success": False,
                "message": "No claims found or error generating PDF"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating ordered PDF: {str(e)}")


# =============================================================
# 🚀 NEW FEATURE: AI CHATBOT ENDPOINT USING GROQ LLaMA3
# =============================================================

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.post("/ai-chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    Insurance Claim AI Assistant Chat
    Powered by GROQ LLaMA3
    """

    prompt = f"""
    You are an expert Insurance Claim AI Assistant.
    Your job is to help users analyze claim PDFs,
    understand extracted text, detect fraud patterns,
    explain claim categories, and answer questions.

    User asked: {request.message}
    """

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",     # ✔ working model
            messages=[
                {"role": "system", "content": "You are an insurance domain expert AI."},
                {"role": "user", "content": prompt}
            ]
        )

        # ✔ Correct access (no subscript)
        answer = response.choices[0].message.content

    except Exception as e:
        answer = f"AI Error: {str(e)}"

    return ChatResponse(reply=answer)


# ---------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
