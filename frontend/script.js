
"use strict";

/* ==========================================
   J.A.R.V.I.S 2.0 — MAIN ASSISTANT ENGINE
   ========================================== */

const $ = (id) => document.getElementById(id);

const STORAGE = {
  key: "jarvis_v2_api_key",
  model: "jarvis_v2_model",
  history: "jarvis_v2_chat_history",
  voice: "jarvis_v2_voice",
  language: "jarvis_v2_language",
  autoSpeak: "jarvis_v2_auto_speak"
};

const state = {
  busy: false,
  recognition: null,
  listening: false,
  speaking: false,
  attachment: null,
  voices: [],
  history: [],
  lastRequest: 0
};

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I told my computer I needed a break. It said: No problem, I'll go to sleep.",
  "Why was the computer cold? It left its Windows open!",
  "There are 10 kinds of people: those who understand binary and those who don't."
];

const motivations = [
  "Your dreams are bigger than your fears. Take one step forward today.",
  "Success is not magic. It is consistency, patience, and action.",
  "Don't compare your chapter one with someone else's chapter twenty.",
  "Every expert was once a beginner. Keep learning and keep building.",
  "Small progress every day creates extraordinary results."
];

/* ==========================================
   SYSTEM STATUS
   ========================================== */

function setStatus(message) {
  const element = $("assistant-status");
  if (element) element.textContent = String(message).toUpperCase();
}

function setBusy(value) {
  state.busy = value;

  const typing = $("typing-indicator");
  const send = $("send-btn");

  if (typing) typing.classList.toggle("show", value);
  if (send) send.disabled = value;

  setStatus(value ? "PROCESSING" : "READY");
}

/* ==========================================
   LOCAL STORAGE
   ========================================== */

function getSaved(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

function loadSettings() {
  const key = getSaved(STORAGE.key);
  const model = getSaved(STORAGE.model, "gemini-2.5-flash");

  if ($("api-key-input")) $("api-key-input").value = key;
  if ($("model-input")) $("model-input").value = model;

  if ($("voice-language")) {
    $("voice-language").value = getSaved(STORAGE.language, "en-IN");
  }

  if ($("auto-speak-toggle")) {
    $("auto-speak-toggle").checked =
      getSaved(STORAGE.autoSpeak, "false") === "true";
  }

  loadHistory();
}

/* ==========================================
   CHAT HISTORY
   ========================================== */

function loadHistory() {
  try {
    const saved = JSON.parse(getSaved(STORAGE.history, "[]"));
    state.history = Array.isArray(saved) ? saved : [];
  } catch {
    state.history = [];
  }

  renderHistory();
}

function saveHistory() {
  saveValue(STORAGE.history, JSON.stringify(state.history.slice(-60)));
}

function renderHistory() {
  const container = $("chat-messages");
  if (!container) return;

  container.innerHTML = "";

  state.history.forEach(message => {
    addMessage(message.role, message.text, false);
  });

  updateWelcome();
}

function updateWelcome() {
  const welcome = $("welcome-screen");
  if (welcome) {
    welcome.style.display = state.history.length ? "none" : "";
  }
}

/* ==========================================
   CHAT DISPLAY
   ========================================== */

function addMessage(role, text, save = true) {
  const container = $("chat-messages");
  if (!container) return;

  const message = document.createElement("div");
  message.className = `message ${role}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "J.A.R.V.I.S";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = String(text);

  message.append(label, bubble);
  container.appendChild(message);

  if (role === "user" || role === "assistant") {
    if (save) {
      state.history.push({
        role,
        text: String(text),
        time: Date.now()
      });

      state.history = state.history.slice(-60);
      saveHistory();
    }
  }

  updateWelcome();

  container.scrollTop = container.scrollHeight;

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  });
}

/* ==========================================
   GEMINI API
   ========================================== */

function getApiKey() {
  return ($("api-key-input")?.value || getSaved(STORAGE.key)).trim();
}

function getModel() {
  return (
    $("model-input")?.value ||
    getSaved(STORAGE.model, "gemini-2.5-flash")
  ).trim();
}

async function askGemini(userText, attachment = null) {
  const apiKey = getApiKey();
  const model = getModel();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Open Settings and enter your API key."
    );
  }

  if (!model) {
    throw new Error("Please enter a Gemini model name in Settings.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [];

  const previous = state.history
    .filter(item => item.role === "user" || item.role === "assistant")
    .slice(-12);

  previous.forEach(item => {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }]
    });
  });

  const currentParts = [{ text: userText }];

  if (attachment?.type?.startsWith("image/") && attachment.base64) {
    currentParts.push({
      inline_data: {
        mime_type: attachment.type,
        data: attachment.base64
      }
    });
  }

  contents.push({
    role: "user",
    parts: currentParts
  });

  const body = {
    system_instruction: {
      parts: [{
        text:
          "You are J.A.R.V.I.S 2.0, a helpful personal AI assistant. " +
          "Be intelligent, friendly, accurate, and concise. " +
          "The user may communicate in English, Telugu, or Teluglish. " +
          "Respond in the language the user uses. " +
          "Never claim to have performed an action you cannot perform. " +
          "If you are uncertain, clearly say so."
      }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Gemini returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      data?.error?.message || `Gemini API error (${response.status})`;

    throw new Error(message);
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini did not return a text response.");
  }

  return answer;
}

/* ==========================================
   CHAT PROCESSING
   ========================================== */

async function sendMessage(text = null) {
  if (state.busy) return;

  const input = $("user-input");
  const message = String(text ?? input?.value ?? "").trim();

  if (!message && !state.attachment) return;

  if (input) input.value = "";

  if (input) input.style.height = "auto";

  const attachment = state.attachment;

  let displayText = message;

  if (!displayText && attachment) {
    displayText = "Please examine this attached image.";
  }

  if (attachment) {
    displayText += `\n[Attachment: ${attachment.name}]`;
  }

  addMessage("user", displayText);

  state.attachment = null;
  updateAttachmentPreview();

  const commandResult = await runLocalCommand(message);

  if (commandResult !== null) {
    addMessage("assistant", commandResult);
    autoSpeak(commandResult);
    return;
  }

  setBusy(true);

  try {
    let imageData = null;

    if (attachment && attachment.type.startsWith("image/")) {
      imageData = attachment;
    }

    const response = await askGemini(message || displayText, imageData);

    addMessage("assistant", response);
    autoSpeak(response);

  } catch (error) {
    const errorText = `SYSTEM ERROR: ${error.message}`;
    addMessage("assistant", errorText);

  } finally {
    setBusy(false);
  }
}

/* ==========================================
   LOCAL COMMAND ENGINE
   ========================================== */

async function runLocalCommand(text) {
  const command = text.toLowerCase().trim();

  if (!command) return null;

  if (
    /^(hi|hello|hey|hai|good morning|good evening|good afternoon)[!. ]*$/.test(command)
  ) {
    return "Hello, Commander! J.A.R.V.I.S is online. How can I help you?";
  }

  if (
    command.includes("what time") ||
    command === "time" ||
    command.includes("current time")
  ) {
    return "The current time is " +
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
  }

  if (
    command.includes("today's date") ||
    command === "date" ||
    command.includes("what date")
  ) {
    return "Today's date is " +
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
  }

  if (command.includes("tell me a joke") || command === "joke") {
    return randomItem(jokes);
  }

  if (
    command.includes("motivation") ||
    command.includes("motivate me")
  ) {
    return randomItem(motivations);
  }

  if (command.includes("flip a coin") || command === "coin") {
    return "The coin landed on: " +
      (Math.random() < 0.5 ? "HEADS" : "TAILS");
  }

  if (command.includes("roll a dice") || command === "dice") {
    return "You rolled: " + (Math.floor(Math.random() * 6) + 1);
  }

  if (command.includes("open youtube")) {
    window.open("https://www.youtube.com/", "_blank", "noopener");
    return "Opening YouTube.";
  }

  if (command.includes("open google")) {
    window.open("https://www.google.com/", "_blank", "noopener");
    return "Opening Google.";
  }

  return null;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/* ==========================================
   NAVIGATION
   ========================================== */

function openSidebar() {
  $("sidebar")?.classList.add("open");
  $("sidebar-overlay")?.classList.add("show");
}

function closeSidebar() {
  $("sidebar")?.classList.remove("open");
  $("sidebar-overlay")?.classList.remove("show");
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(item => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  const target = $(`${page}-page`);

  if (target) target.classList.add("active");

  closeSidebar();
}

/* ==========================================
   VOICE RECOGNITION
   ========================================== */

function setupVoiceRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setStatus("VOICE NOT SUPPORTED");
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = false;
  state.recognition.lang = getSaved(STORAGE.language, "en-IN");

  state.recognition.onstart = () => {
    state.listening = true;
    $("mic-btn")?.classList.add("listening");
    setStatus("LISTENING");
  };

  state.recognition.onresult = event => {
    const transcript = event.results?.[0]?.[0]?.transcript;

    if (transcript) {
      sendMessage(transcript);
    }
  };

  state.recognition.onerror = event => {
    setStatus(`VOICE ERROR: ${event.error}`);
  };

  state.recognition.onend = () => {
    state.listening = false;
    $("mic-btn")?.classList.remove("listening");

    if (!state.busy) setStatus("READY");
  };
}

function toggleMicrophone() {
  if (!state.recognition) {
    alert(
      "Voice recognition is not supported in this browser. Try a supported browser."
    );
    return;
  }

  if (state.listening) {
    state.recognition.stop();
    return;
  }

  state.recognition.lang =
    $("voice-language")?.value || "en-IN";

  try {
    state.recognition.start();
  } catch {
    setStatus("VOICE START FAILED");
  }
}

/* ==========================================
   TEXT TO SPEECH
   ========================================== */

function loadVoices() {
  if (!("speechSynthesis" in window)) return;

  state.voices = speechSynthesis.getVoices();

  const select = $("tts-voice-select");
  if (!select) return;

  const previous = getSaved(STORAGE.voice);

  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Default system voice";
  select.appendChild(defaultOption);

  state.voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${voice.name} (${voice.lang})`;
    select.appendChild(option);
  });

  select.value = previous;
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    setStatus("SPEECH NOT SUPPORTED");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const index = $("tts-voice-select")?.value;

  if (index !== "" && state.voices[index]) {
    utterance.voice = state.voices[index];
  }

  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    state.speaking = true;
    setStatus("SPEAKING");
  };

  utterance.onend = () => {
    state.speaking = false;
    setStatus("READY");
  };

  utterance.onerror = () => {
    state.speaking = false;
    setStatus("SPEECH ERROR");
  };

  speechSynthesis.speak(utterance);
}

function autoSpeak(text) {
  if ($("auto-speak-toggle")?.checked) {
    speakText(text);
  }
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  state.speaking = false;
  setStatus("READY");
}

/* ==========================================
   FILE ATTACHMENTS
   ========================================== */

function updateAttachmentPreview() {
  const preview = $("attachment-preview");

  if (!preview) return;

  if (state.attachment) {
    $("attachment-name").textContent = state.attachment.name;
    preview.classList.add("show");
  } else {
    preview.classList.remove("show");
  }
}

async function handleFile(file) {
  if (!file) return;

  const allowed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/") ||
    /\.(txt|pdf|doc|docx)$/i.test(file.name);

  if (!allowed) {
    alert("This file type is not supported.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please choose a file smaller than 5 MB.");
    return;
  }

  if (file.type.startsWith("image/")) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result);
        resolve(result.split(",")[1]);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    state.attachment = {
      name: file.name,
      type: file.type,
      base64
    };
  } else {
    state.attachment = {
      name: file.name,
      type: file.type,
      base64: null
    };
  }

  updateAttachmentPreview();
}

/* ==========================================
   CREATOR AGENT
   ========================================== */

async function generateCreatorContent() {
  const topic = $("creator-topic")?.value.trim();

  if (!topic) {
    alert("Please enter a content topic.");
    return;
  }

  const platform = $("creator-platform").value;
  const language = $("creator-language").value;
  const duration = $("creator-duration").value;
  const style = $("creator-style").value;

  const prompt = `
Create a ${style} content script.

Topic: ${topic}
Platform: ${platform}
Language: ${language}
Duration: ${duration}

Include:
1. A powerful opening hook.
2. Main script.
3. Engaging ending.
4. Call to action.
5. Suggested caption and hashtags.

Make the content natural and suitable for the selected platform.
`;

  const result = $("creator-result");

  result.textContent = "Generating content...";
  result.classList.add("show");

  try {
    const answer = await askGemini(prompt);
    result.textContent = answer;
  } catch (error) {
    result.textContent = "ERROR: " + error.message;
  }
}

/* ==========================================
   SOCIAL AGENT — LOCAL SIMULATION
   ========================================== */

function simulateSocialWorkflow() {
  const platform = $("social-platform").value;
  const trigger = $("social-trigger").value;
  const keyword = $("social-keyword").value.trim();
  const response = $("social-response").value.trim();

  if (!keyword || !response) {
    alert("Enter a keyword and draft response.");
    return;
  }

  const result = $("social-result");

  result.textContent =
    "LOCAL SIMULATION\n\n" +
    `Platform: ${platform}\n` +
    `Trigger: ${trigger}\n` +
    `Keyword: ${keyword}\n\n` +
    `Draft response:\n${response}\n\n` +
    "Simulation prepared successfully. Nothing was sent or published.";

  result.classList.add("show");
}

/* ==========================================
   EVERYDAY TOOLS
   ========================================== */

function runTool(tool) {
  let result = "";

  switch (tool) {
    case "time":
      result = "Current time: " + new Date().toLocaleTimeString();
      break;

    case "date":
      result = "Today's date: " + new Date().toLocaleDateString();
      break;

    case "joke":
      result = randomItem(jokes);
      break;

    case "motivation":
      result = randomItem(motivations);
      break;

    case "coin":
      result = "Coin toss: " +
        (Math.random() < 0.5 ? "HEADS" : "TAILS");
      break;

    case "dice":
      result = "Dice result: " +
        (Math.floor(Math.random() * 6) + 1);
      break;

    case "password": {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
      const values = new Uint32Array(20);

      if (window.crypto?.getRandomValues) {
        crypto.getRandomValues(values);
        result = Array.from(values, value =>
          chars[value % chars.length]
        ).join("");
      } else {
        result = "Secure random generator is unavailable.";
      }
      break;
    }

    case "google":
      window.open("https://www.google.com/", "_blank", "noopener");
      result = "Opening Google.";
      break;

    case "youtube":
      window.open("https://www.youtube.com/", "_blank", "noopener");
      result = "Opening YouTube.";
      break;

    default:
      result = "Unknown tool.";
  }

  showPage("chat");
  addMessage("assistant", result);
  autoSpeak(result);
}

/* ==========================================
   SETTINGS
   ========================================== */

function saveSettings() {
  const key = $("api-key-input").value.trim();
  const model = $("model-input").value.trim();

  if (!model) {
    alert("Please enter a Gemini model name.");
    return;
  }

  saveValue(STORAGE.key, key);
  saveValue(STORAGE.model, model);

  saveValue(
    STORAGE.language,
    $("voice-language").value
  );

  saveValue(
    STORAGE.autoSpeak,
    $("auto-speak-toggle").checked
  );

  saveValue(
    STORAGE.voice,
    $("tts-voice-select").value
  );

  if (state.recognition) {
      state.recognition.lang = event.target.value;
    }
  });

  $("auto-speak-toggle")?.addEventListener("change", event => {
    saveValue(STORAGE.autoSpeak, event.target.checked);
  });

  $("tts-voice-select")?.addEventListener("change", event => {
    saveValue(STORAGE.voice, event.target.value);
  });

  window.addEventListener("beforeunload", () => {
    if (state.recognition && state.listening) {
      state.recognition.stop();
    }
  });
}

/* ==========================================
   START J.A.R.V.I.S
   ========================================== */

function initializeJarvis() {
  loadSettings();
  setupEvents();
  setupVoiceRecognition();

  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  setStatus("SYSTEM ONLINE");

  console.log(
    "%c J.A.R.V.I.S 2.0 ONLINE ",
    "background:#001c2b;color:#00d9ff;font-size:18px;padding:10px;"
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeJarvis);
} else {
  initializeJarvis();
}
