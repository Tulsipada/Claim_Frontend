from sqlalchemy import Column, Integer, String, Float, Text
from .db import Base

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String, unique=True, index=True)
    filename = Column(String)
    text = Column(Text)
    claim_type = Column(String)
    name = Column(String)  # policyholder
    description = Column(String)  # policy number
    extracted_entities = Column(Text)  # amounts, dates, ocr, etc
    ordered_pdf_path = Column(String)  # path to final ordered PDF
