
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.get("/", (req, res) => {
    res.send("JARVIS AI SERVER ONLINE");
});

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
                systemInstruction:
                    "You are JARVIS, a smart, friendly and professional personal AI assistant. Give clear and helpful answers."
            }
        });

        res.json({
            reply: response.text
        });

    } catch (error) {
        console.error("Gemini error:", error);

        res.status(500).json({
            error: "Gemini connection failed"
        });
    }
});

app.listen(process.env.PORT || 10000, "0.0.0.0", () => {
    console.log("JARVIS server is running");
});
