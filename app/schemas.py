from pydantic import BaseModel
import json

class ClaimResponse(BaseModel):
    id: int
    claim_id: str
    filename: str
    text: str | None = None
    claim_type: str | None = None
    name: str | None = None
    description: str | None = None
    extracted_entities: str | None = None
    ordered_pdf_path: str | None = None

    # ---- EXTRA PARSED FIELDS FOR FRONTEND ----
    total_amount: float | None = None
    ocr_used: bool | None = None
    dates: list[str] | None = None

    class Config:
        from_attributes = True

    def model_post_init(self, __context):
        """Parse extracted_entities JSON string."""
        if self.extracted_entities:
            try:
                data = json.loads(self.extracted_entities)

                self.total_amount = data.get("total_estimate")
                self.ocr_used = data.get("is_ocr")
                self.dates = data.get("dates")

            except Exception:
                self.total_amount = None
                self.ocr_used = None
                self.dates = None
