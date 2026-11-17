
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatPanel = document.getElementById("chatPanel");
const coreStatus = document.getElementById("coreStatus");

const API_URL = "https://jarvis-mobile-edition.onrender.com/api/chat";

function addMessage(sender, message, className) {
    const welcome = chatPanel.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const messageBox = document.createElement("div");
    messageBox.className = `message ${className}`;

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = sender;

    const content = document.createElement("div");
    content.textContent = message;

    messageBox.append(label, content);
    chatPanel.appendChild(messageBox);
    chatPanel.scrollTop = chatPanel.scrollHeight;
}

async function sendMessage() {
    const command = userInput.value.trim();

    if (!command || sendButton.disabled) return;

    addMessage("YOU", command, "user-message");
    userInput.value = "";
    coreStatus.textContent = "PROCESSING...";
    sendButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: command })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Server error");
        }

        if (!data.reply) {
            throw new Error("No AI response received");
        }

        addMessage("J.A.R.V.I.S", data.reply, "jarvis-message");
        coreStatus.textContent = "CORE ACTIVE";

    } catch (error) {
        console.error(error);
        addMessage(
            "J.A.R.V.I.S",
            "AI connection failed. Please try again.",
            "jarvis-message"
        );
        coreStatus.textContent = "CONNECTION ERROR";

    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

sendButton.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") sendMessage();
});

window.addEventListener("load", () => {
    coreStatus.textContent = "CORE ACTIVE";
});
