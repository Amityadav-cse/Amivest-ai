import requests

try:
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": "Hello! Introduce yourself in one sentence.",
            "stream": False
        },
        timeout=60
    )

    print("Status Code:", response.status_code)
    print("Response:")
    print(response.text)

except Exception as e:
    print("Error:", e)