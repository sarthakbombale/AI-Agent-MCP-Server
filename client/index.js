import { config } from "dotenv";
import { Readline } from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js"

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
