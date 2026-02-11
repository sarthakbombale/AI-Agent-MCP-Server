import { config } from "dotenv";
import { createInterface } from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

config();

// ------------------ AI ------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ------------------ MCP ------------------
const mcpClient = new Client({
  name: "example-client",
  version: "1.0.0",
});

// must be global so chatLoop can use it
let tools = [];

// ------------------ Chat state ------------------
const chatHistory = [];

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ------------------ Connect then start ------------------
mcpClient
  .connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
  .then(async () => {
    console.log("Connected to server");

    const mcpTools = (await mcpClient.listTools()).tools;

    tools = mcpTools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required,
        },
      };
    });

    await chatLoop();
  })
  .catch(console.error);

// ------------------ Main loop ------------------
async function chatLoop(toolCall) {
  try {
    if (toolCall) {
      console.log("Calling tool:", toolCall.name);

      chatHistory.push({
        role: "model",
        parts: [{ text: `Calling tool ${toolCall.name}`, type: "text" }],
      });

      const toolResult = await mcpClient.callTool({
        name: toolCall.name,
        arguments: toolCall.args,
      });

      chatHistory.push({
        role: "user",
        parts: [
          {
            text: "Tool result: " + (toolResult.content?.[0]?.text ?? ""),
            type: "text",
          },
        ],
      });
    } else {
      const question = await rl.question("You: ");

      chatHistory.push({
        role: "user",
        parts: [{ text: question, type: "text" }],
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: chatHistory,
      config: {
        tools: [
          {
            functionDeclarations: tools,
          },
        ],
      },
    });

    // safe extraction
    const part = response.candidates?.[0]?.content?.parts?.[0] ?? {};
    const functionCall = part.functionCall;
    const responseText = part.text;

    if (functionCall) {
      return chatLoop(functionCall);
    }

    if (responseText) {
      chatHistory.push({
        role: "model",
        parts: [{ text: responseText, type: "text" }],
      });

      console.log(`AI: ${responseText}`);
    }

    return chatLoop(); // continue conversation
  } catch (err) {
    console.error("Error in chatLoop:", err);
    return chatLoop();
  }
}
