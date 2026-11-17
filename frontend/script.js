
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatPanel = document.getElementById("chatPanel");
const coreStatus = document.getElementById("coreStatus");

// Replace this with your deployed backend URL later
const API_URL = "https://YOUR-BACKEND.onrender.com/api/chat";

// Add message to chat
function addMessage(sender, message, className) {
    const welcome = chatPanel.querySelector(".welcome-message");

    if (welcome) {
        welcome.remove();
    }

    const messageBox = document.createElement("div");
    messageBox.className = `message ${className}`;

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = sender;

    const content = document.createElement("div");
    content.textContent = message;

    messageBox.appendChild(label);
    messageBox.appendChild(content);

    chatPanel.appendChild(messageBox);
    chatPanel.scrollTop = chatPanel.scrollHeight;
}

// Send message to Gemini through backend
async function getJarvisResponse(command) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: command
        })
    });

    if (!response.ok) {
        throw new Error("Gemini server connection failed.");
    }

    const data = await response.json();

    if (!data.reply) {
        throw new Error("No response received from Gemini.");
    }

    return data.reply;
}

// Send command
async function sendMessage() {
    const command = userInput.value.trim();

    if (command === "" || sendButton.disabled) {
        return;
    }

    addMessage("YOU", command, "user-message");

    userInput.value = "";
    coreStatus.textContent = "PROCESSING...";
    sendButton.disabled = true;

    try {
        const answer = await getJarvisResponse(command);

        addMessage("J.A.R.V.I.S", answer, "jarvis-message");

        coreStatus.textContent = "CORE ACTIVE";

    } catch (error) {
        addMessage(
            "J.A.R.V.I.S",
            "Unable to connect to my AI brain. Please check the server connection.",
            "jarvis-message"
        );

        coreStatus.textContent = "CONNECTION ERROR";

        console.error(error);

    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}

// Button click
sendButton.addEventListener("click", sendMessage);

// Enter key
userInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// Initial status
window.addEventListener("load", () => {
    coreStatus.textContent = "CORE ACTIVE";

    console.log("J.A.R.V.I.S MOBILE SYSTEM INITIALIZED");
});
