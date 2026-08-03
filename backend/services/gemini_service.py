import os
import logging
from dotenv import load_dotenv
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================
# Load Environment Variables
# ==========================
load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "❌ GROQ_API_KEY not found in .env"
    )

client = Groq(api_key=API_KEY)

# Use a model available to your account.
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are Amivest AI.

You are a helpful financial assistant.

Always answer in complete sentences.

Provide advice about:
- Budgeting
- Expenses
- Savings
- Investments
- SIP
- Loans
- Taxes

If financial context is available, use it.
"""

def ask_financial_ai(question: str, context: str = "") -> str:
    try:

        if not question.strip():
            return "Please ask a financial question."

        logger.info("Question: %s", question)

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Financial Context:\n{context}"
            },
            {
                "role": "user",
                "content": question
            }
        ]

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )

        answer = response.choices[0].message.content

        if not answer:
            return "Sorry, I couldn't generate a response."

        logger.info("Answer generated successfully.")

        return answer.strip()

    except Exception as e:
        logger.exception("Groq API Error")
        return f"AI Error: {str(e)}"