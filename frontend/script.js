
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatPanel = document.getElementById("chatPanel");
const coreStatus = document.getElementById("coreStatus");

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

// JARVIS local demo response
function getJarvisResponse(command) {

    const text = command.toLowerCase().trim();

    if (text.includes("hello") || text.includes("hi")) {
        return "Hello! I am JARVIS. How can I assist you?";
    }

    if (text.includes("your name")) {
        return "I am J.A.R.V.I.S, your personal virtual assistant.";
    }

    if (text.includes("how are you")) {
        return "All systems operational. I am functioning normally.";
    }

    if (text.includes("time")) {
        return "Current time is " + new Date().toLocaleTimeString();
    }

    if (text.includes("date")) {
        return "Today's date is " + new Date().toLocaleDateString();
    }

    if (text.includes("status")) {
        return "Core: ONLINE. Network: ONLINE. Voice: LOCKED. Memory: LOCKED.";
    }

    if (text.includes("help")) {
        return "Try asking me about my name, system status, time or date.";
    }

    return "Command received. My local demo mode is active. Connect the Gemini backend to enable intelligent AI responses.";
}

// Send command
function sendMessage() {

    const command = userInput.value.trim();

    if (command === "") {
        return;
    }

    addMessage("YOU", command, "user-message");

    userInput.value = "";

    coreStatus.textContent = "PROCESSING...";

    sendButton.disabled = true;

    setTimeout(() => {

        const response = getJarvisResponse(command);

        addMessage("J.A.R.V.I.S", response, "jarvis-message");

        coreStatus.textContent = "CORE ACTIVE";

        sendButton.disabled = false;

        userInput.focus();

    }, 600);
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
