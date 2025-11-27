"""
Database migration script to add ordered_pdf_path column to claims table.
Run this script once to update your existing database.
"""
from sqlalchemy import text
from app.db import engine

def migrate_database():
    """Add ordered_pdf_path column to claims table if it doesn't exist."""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("PRAGMA table_info(claims)"))
        columns = [row[1] for row in result]
        
        if 'ordered_pdf_path' in columns:
            print("[OK] Column 'ordered_pdf_path' already exists in claims table.")
            return
        
        # Add the column
        try:
            conn.execute(text("ALTER TABLE claims ADD COLUMN ordered_pdf_path VARCHAR"))
            conn.commit()
            print("[OK] Successfully added 'ordered_pdf_path' column to claims table.")
        except Exception as e:
            print(f"[ERROR] Error adding column: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate_database()

