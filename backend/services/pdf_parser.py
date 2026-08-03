import pdfplumber

def parse_pdf(filepath, password=None):

    text = ""

    with pdfplumber.open(filepath, password=password) as pdf:

        for page in pdf.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text