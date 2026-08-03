const API = "http://127.0.0.1:5000";

export async function sendMessage(message) {
    const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user_id: 1,
            message,
        }),
    });

    return response.json();
}