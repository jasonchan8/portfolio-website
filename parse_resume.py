#!/usr/bin/env python3
"""
Script to extract text from PDF resume and parse it into structured data.
"""

import json
import re
import sys

def parse_pdf_text(text):
    """
    Parse PDF text into structured resume data.
    This is a basic parser - you may need to adjust based on your resume format.
    """
    data = {
        "name": "Jason Chan",
        "title": "Developer & Creator",
        "experience": [],
        "projects": [],
        "skills": [],
        "contact": {}
    }
    
    lines = text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]
    
    # Try to extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    for line in lines:
        email_match = re.search(email_pattern, line)
        if email_match:
            data["contact"]["email"] = email_match.group(0)
            break
    
    # Try to extract URLs
    url_pattern = r'https?://[^\s]+'
    for line in lines:
        if 'github' in line.lower():
            url_match = re.search(url_pattern, line)
            if url_match:
                data["contact"]["github"] = url_match.group(0)
        elif 'linkedin' in line.lower():
            url_match = re.search(url_pattern, line)
            if url_match:
                data["contact"]["linkedin"] = url_match.group(0)
    
    return data

def main():
    pdf_path = 'resume/Jason_Chan_Resume.pdf'
    
    # Try different PDF parsing methods
    text = ""
    
    # Method 1: Try PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(pdf_path)
        text = '\n'.join([page.get_text() for page in doc])
        doc.close()
        print("Successfully extracted text using PyMuPDF")
    except ImportError:
        pass
    
    # Method 2: Try pdfplumber
    if not text:
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = '\n'.join([page.extract_text() for page in pdf.pages])
            print("Successfully extracted text using pdfplumber")
        except ImportError:
            pass
    
    # Method 3: Try PyPDF2
    if not text:
        try:
            import PyPDF2
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = '\n'.join([page.extract_text() for page in reader.pages])
            print("Successfully extracted text using PyPDF2")
        except ImportError:
            pass
    
    if text:
        # Save raw text for manual review
        with open('resume_text.txt', 'w') as f:
            f.write(text)
        print(f"\nExtracted text saved to resume_text.txt")
        print(f"\nFirst 500 characters:")
        print(text[:500])
        
        # Parse and save structured data
        data = parse_pdf_text(text)
        with open('resume_data.json', 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\nParsed data saved to resume_data.json")
    else:
        print("Could not extract text from PDF. Please install one of:")
        print("  - PyMuPDF: pip install PyMuPDF")
        print("  - pdfplumber: pip install pdfplumber")
        print("  - PyPDF2: pip install PyPDF2")
        print("\nYou can manually edit resume_data.json after installation.")

if __name__ == '__main__':
    main()

