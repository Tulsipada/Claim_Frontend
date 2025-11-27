import json
from sqlalchemy.orm import Session
from .models import Claim
from .process_claims import process_file, generate_ordered_pdf, order_claims_with_ai
from pathlib import Path
import uuid


def process_and_store_claim(db: Session, file_path: str, original_filename: str) -> Claim:
    result = process_file(file_path)

    extracted = {
        "raw_text": result.get("raw_text"),
        "is_ocr": result.get("is_ocr"),
        "policy_number": result.get("policy_number"),
        "policyholder": result.get("policyholder"),
        "amounts": result.get("amounts"),
        "total_estimate": result.get("total_estimate"),
        "dates": result.get("dates"),
    }

    claim = Claim(
        claim_id=result.get("claim_id"),
        filename=original_filename,
        text=result.get("raw_text"),
        claim_type=result.get("claim_type"),
        name=result.get("policyholder"),
        description=result.get("policy_number"),
        extracted_entities=json.dumps(extracted),
    )

    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def get_all_claims(db: Session):
    return db.query(Claim).all()


def get_all_claims_ordered_by_ai(db: Session):
    """Get all claims ordered by AI analysis."""
    all_db_claims = db.query(Claim).all()
    
    if not all_db_claims:
        return []
    
    # Convert DB claims to dict format for AI ordering
    claims_data = []
    claim_id_to_db_claim = {}
    
    for db_claim in all_db_claims:
        extracted = json.loads(db_claim.extracted_entities) if db_claim.extracted_entities else {}
        claim_dict = {
            "claim_id": db_claim.claim_id,
            "filename": db_claim.filename,
            "raw_text": db_claim.text,
            "claim_type": db_claim.claim_type,
            "policyholder": db_claim.name,
            "policy_number": db_claim.description,
            "total_estimate": extracted.get("total_estimate"),
            "amounts": extracted.get("amounts", []),
            "dates": extracted.get("dates", []),
            "is_ocr": extracted.get("is_ocr", False),
        }
        claims_data.append(claim_dict)
        claim_id_to_db_claim[db_claim.claim_id] = db_claim
    
    # Order claims using AI
    ordered_claims_data = order_claims_with_ai(claims_data)
    
    # Convert back to DB claim objects in AI-determined order
    ordered_db_claims = [claim_id_to_db_claim[claim["claim_id"]] for claim in ordered_claims_data]
    
    return ordered_db_claims


def get_single_claim(db: Session, claim_id: str):
    return db.query(Claim).filter(Claim.claim_id == claim_id).first()


def generate_and_store_ordered_pdf(db: Session) -> str:
    """Generate ordered PDF from all claims in DB using AI ordering, and update all claims with PDF path."""
    # Get all claims from database
    all_db_claims = db.query(Claim).all()
    
    if not all_db_claims:
        return None
    
    # Convert DB claims to dict format for processing
    claims_data = []
    for db_claim in all_db_claims:
        extracted = json.loads(db_claim.extracted_entities) if db_claim.extracted_entities else {}
        claim_dict = {
            "claim_id": db_claim.claim_id,
            "filename": db_claim.filename,
            "raw_text": db_claim.text,
            "claim_type": db_claim.claim_type,
            "policyholder": db_claim.name,
            "policy_number": db_claim.description,
            "total_estimate": extracted.get("total_estimate"),
            "amounts": extracted.get("amounts", []),
            "dates": extracted.get("dates", []),
            "is_ocr": extracted.get("is_ocr", False),
        }
        claims_data.append(claim_dict)
    
    # Generate ordered PDF
    ORDERED_PDF_DIR = Path("ordered_pdfs")
    ORDERED_PDF_DIR.mkdir(parents=True, exist_ok=True)
    
    ordered_pdf_filename = f"ordered_claims_{uuid.uuid4()}.pdf"
    ordered_pdf_path = ORDERED_PDF_DIR / ordered_pdf_filename
    
    try:
        generate_ordered_pdf(claims_data, str(ordered_pdf_path))
        
        # Update all claims with the ordered PDF path
        pdf_path_str = str(ordered_pdf_path)
        for db_claim in all_db_claims:
            db_claim.ordered_pdf_path = pdf_path_str
        
        db.commit()
        return pdf_path_str
    except Exception as e:
        print(f"Error generating ordered PDF: {e}")
        return None
