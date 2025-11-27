# process_claims.py
from dotenv import load_dotenv
load_dotenv()
import os
import json
import re
import uuid
import importlib
from pathlib import Path
from typing import Optional, List, Dict, Any
from dateutil import parser as dateparser

# OCR + PDF
from pdf2image import convert_from_path
import pytesseract

# GROQ API
from groq import Groq

# Try importing pdfplumber
try:
    pdfplumber = importlib.import_module("pdfplumber")
except ModuleNotFoundError:
    pdfplumber = None

# Try importing reportlab for PDF generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    reportlab_available = True
except ImportError:
    reportlab_available = False


# -----------------------------
# Paths
# -----------------------------
PDF_FOLDER = Path("uploads")
OUT_FILE = Path("data_outputs/claims_parsed_output.jsonl")
TMP_IMG_DIR = Path("tmp_pdf_images")
ORDERED_PDF_DIR = Path("ordered_pdfs")
TMP_IMG_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
ORDERED_PDF_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------
# Regex Patterns
# -----------------------------
money_re = re.compile(r'\$([0-9,]+(?:\.\d{1,2})?)')
policy_re = re.compile(r'Policy Number:\s*([A-Z0-9\-]+)')
name_re = re.compile(r'Policyholder:\s*([A-Za-z \.]+)')
date_re = re.compile(
    r'(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})',
    re.I
)

# -----------------------------
# Groq Client
# -----------------------------
groq_key = os.getenv("GROQ_API_KEY")

if not groq_key:
    raise Exception("❌ GROQ_API_KEY missing. Check your .env file.")

client = Groq(api_key=groq_key)



# -----------------------------
# Text Extraction
# -----------------------------
def try_pdfplumber(path):
    """Extract text using pdfplumber if installed."""
    if pdfplumber is None:
        return ""

    try:
        texts = []
        with pdfplumber.open(path) as pdf:
            for p in pdf.pages:
                texts.append(p.extract_text() or "")
        return "\n".join(texts).strip()
    except Exception:
        return ""


def ocr_pdf(path, dpi=300):
    """OCR fallback using Tesseract."""
    images = convert_from_path(str(path), dpi=dpi, output_folder=str(TMP_IMG_DIR))
    text_chunks = []
    for img in images:
        text_chunks.append(pytesseract.image_to_string(img))
    return "\n".join(text_chunks).strip()


# -----------------------------
# Data Extraction Helpers
# -----------------------------
def extract_amounts(text):
    matches = money_re.findall(text)
    return [float(x.replace(",", "")) for x in matches]


def extract_dates(text):
    found = []
    for m in date_re.findall(text):
        try:
            dt = dateparser.parse(m)
            found.append(dt.date().isoformat())
        except:
            pass
    return found


# -----------------------------
# LLM (Groq) Classification
# -----------------------------
def classify_claim_with_llm(text: str, total_estimate: Optional[float] = None) -> str:
    """Classify the claim using Groq API."""

    prompt = f"""
    You are an expert insurance claim classifier.
    Your task: Read the claim text and decide the MOST LIKELY category.

    Choose EXACTLY ONE category from:

    - Personal Injury    (injury, accident, fall, fracture, ambulance, hospital)
    - Vehicle Damage     (car crash, collision, bumper, auto insurance)
    - Fire Damage        (burn, fire, smoke damage, electrical fire)
    - Property Damage    (home, water leak, broken roof, flood, wall damage)
    - Medical Claim      (hospital bill, treatment reimbursement, pharmacy)
    - Theft              (stolen, robbery, burglary, missing items)
    - Other              (if none match)

    Analyze the following:

    CLAIM TEXT:
    {text[:3500]}

    Total Estimate: {total_estimate}

    Return ONLY category name. No explanation.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            messages=[{"role": "user", "content": prompt}],
        )
        category = completion.choices[0].message.content.strip()
    except:
        return "Other"

    valid = [
        "Personal Injury",
        "Vehicle Damage",
        "Fire Damage",
        "Property Damage",
        "Medical Claim",
        "Theft",
        "Other"
    ]
    for v in valid:
        if v.lower() in category.lower():
            return v

    return "Other"


# -----------------------------
# AI-Based Ordering
# -----------------------------
def order_claims_with_ai(claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Use AI to determine the optimal order for claims."""
    
    if not claims:
        return []
    
    # Prepare summary for AI
    claims_summary = []
    for i, claim in enumerate(claims):
        summary = {
            "index": i,
            "claim_id": claim.get("claim_id", ""),
            "claim_type": claim.get("claim_type", "Other"),
            "total_estimate": claim.get("total_estimate", 0),
            "policyholder": claim.get("policyholder", "Unknown"),
            "dates": claim.get("dates", []),
            "filename": claim.get("filename", ""),
        }
        claims_summary.append(summary)
    
    prompt = f"""
    You are an insurance claims processing expert. Your task is to determine the optimal order for processing these claims.
    
    Consider the following factors when ordering:
    1. Priority: High-value claims (>$10,000) should generally come first
    2. Urgency: Claims with recent dates should be prioritized
    3. Type: Critical types (Personal Injury, Fire Damage) should be processed before routine ones
    4. Policyholder: Group similar policyholders together for efficiency
    
    Claims Summary:
    {json.dumps(claims_summary, indent=2)}
    
    Return a JSON array of claim indices (0-based) in the order they should be processed.
    Example: [2, 0, 1, 3]
    
    Respond with ONLY the JSON array, no other text.
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        response = completion.choices[0].message.content.strip()
        
        # Extract JSON array from response
        import re
        json_match = re.search(r'\[[\d\s,]+\]', response)
        if json_match:
            order_indices = json.loads(json_match.group())
            # Validate indices
            valid_indices = [i for i in order_indices if 0 <= i < len(claims)]
            if valid_indices:
                # Add any missing indices at the end
                missing = [i for i in range(len(claims)) if i not in valid_indices]
                ordered_claims = [claims[i] for i in valid_indices] + [claims[i] for i in missing]
                return ordered_claims
    except Exception as e:
        print(f"AI ordering failed: {e}, using fallback ordering")
    
    # Fallback: Order by total_estimate (descending), then by claim_type
    def sort_key(claim):
        estimate = claim.get("total_estimate", 0) or 0
        claim_type = claim.get("claim_type", "Other")
        priority_types = ["Personal Injury", "Fire Damage", "Vehicle Damage"]
        priority = 0 if claim_type in priority_types else 1
        return (priority, -estimate)
    
    return sorted(claims, key=sort_key)


# -----------------------------
# PDF Generation
# -----------------------------
def generate_ordered_pdf(claims: List[Dict[str, Any]], output_path: str) -> str:
    """Generate a PDF with claims in AI-determined order."""
    
    if not reportlab_available:
        raise Exception("reportlab is not installed. Install it with: pip install reportlab")
    
    # Order claims using AI
    ordered_claims = order_claims_with_ai(claims)
    
    # Create PDF
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#2c3e50',
        spaceAfter=12,
        spaceBefore=20
    )
    normal_style = styles['Normal']
    
    # Title
    story.append(Paragraph("Ordered Claims Report", title_style))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(f"Total Claims: {len(ordered_claims)}", normal_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(f"Ordered by AI Analysis", normal_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Add each claim
    for idx, claim in enumerate(ordered_claims, 1):
        story.append(Paragraph(f"Claim #{idx}", heading_style))
        
        # Claim details
        details = []
        details.append(f"<b>Claim ID:</b> {claim.get('claim_id', 'N/A')}")
        details.append(f"<b>Filename:</b> {claim.get('filename', 'N/A')}")
        details.append(f"<b>Type:</b> {claim.get('claim_type', 'N/A')}")
        details.append(f"<b>Policyholder:</b> {claim.get('policyholder', 'N/A')}")
        details.append(f"<b>Policy Number:</b> {claim.get('policy_number', 'N/A')}")
        
        total_est = claim.get('total_estimate')
        if total_est:
            details.append(f"<b>Total Estimate:</b> ${total_est:,.2f}")
        
        dates = claim.get('dates', [])
        if dates:
            details.append(f"<b>Dates:</b> {', '.join(dates)}")
        
        for detail in details:
            story.append(Paragraph(detail, normal_style))
            story.append(Spacer(1, 0.1*inch))
        
        # Add a preview of the text (first 500 chars)
        raw_text = claim.get('raw_text', '')
        if raw_text:
            preview = raw_text[:500] + "..." if len(raw_text) > 500 else raw_text
            story.append(Paragraph("<b>Text Preview:</b>", normal_style))
            story.append(Paragraph(preview.replace('\n', '<br/>'), normal_style))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Page break between claims (except last)
        if idx < len(ordered_claims):
            story.append(PageBreak())
    
    # Build PDF
    doc.build(story)
    return output_path


# -----------------------------
# Main File Processor
# -----------------------------
def process_file(path: str) -> Dict[str, Any]:
    """Extract text, OCR if needed, extract metadata, classify with Groq."""

    text = try_pdfplumber(path)
    is_ocr = False

    if not text or len(text) < 100:
        text_ocr = ocr_pdf(path)
        if len(text_ocr) > len(text):
            text = text_ocr
            is_ocr = True

    rec = {}
    rec["claim_id"] = str(uuid.uuid4())
    rec["filename"] = os.path.basename(path)
    rec["raw_text"] = text
    rec["is_ocr"] = is_ocr

    # Extract metadata
    pn = policy_re.search(text)
    nm = name_re.search(text)

    rec["policy_number"] = pn.group(1).strip() if pn else None
    rec["policyholder"] = nm.group(1).strip() if nm else None

    rec["amounts"] = extract_amounts(text)
    rec["total_estimate"] = sum(rec["amounts"]) if rec["amounts"] else None
    rec["dates"] = extract_dates(text)

    # Classification via Groq
    rec["claim_type"] = classify_claim_with_llm(text, rec["total_estimate"])

    return rec


# -----------------------------
# Batch Processor
# -----------------------------
def batch_process(db_session=None):
    """Process all PDFs inside uploads/ folder, generate ordered PDF, and store in DB."""

    pdfs = list(PDF_FOLDER.glob("*.pdf"))
    all_claims = []

    for p in pdfs:
        try:
            result = process_file(p)
            all_claims.append(result)
        except Exception:
            pass

    # Save to JSONL
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for claim in all_claims:
            f.write(json.dumps(claim, ensure_ascii=False) + "\n")

    # Generate ordered PDF using AI
    ordered_pdf_path = None
    if all_claims and reportlab_available:
        try:
            ordered_pdf_filename = f"ordered_claims_{uuid.uuid4()}.pdf"
            ordered_pdf_path = ORDERED_PDF_DIR / ordered_pdf_filename
            generate_ordered_pdf(all_claims, str(ordered_pdf_path))
            print(f"✅ Generated ordered PDF: {ordered_pdf_path}")
            ordered_pdf_path = str(ordered_pdf_path)
        except Exception as e:
            print(f"⚠️ Error generating ordered PDF: {e}")
            ordered_pdf_path = None
    else:
        if not reportlab_available:
            print("⚠️ reportlab not available, skipping PDF generation")
    
    # Store in database if session provided
    if db_session is not None and ordered_pdf_path:
        try:
            # Try to import Claim model (may not be available if running standalone)
            try:
                from .models import Claim
                # Update all existing claims with the ordered PDF path
                db_session.query(Claim).update({"ordered_pdf_path": ordered_pdf_path})
                db_session.commit()
                print(f"✅ Updated database with ordered PDF path: {ordered_pdf_path}")
            except ImportError:
                # Running standalone, database update skipped
                print("ℹ️ Database models not available, skipping DB update")
        except Exception as e:
            print(f"⚠️ Error updating database: {e}")
            if db_session:
                db_session.rollback()
    
    # Store PDF path in each claim record for return value
    for claim in all_claims:
        claim["ordered_pdf_path"] = ordered_pdf_path

    return all_claims


if __name__ == "__main__":
    batch_process()
