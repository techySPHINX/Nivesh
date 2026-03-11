import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  llm: {
    ollamaBaseUrl: process.env.LLM_OLLAMA_BASE_URL || "http://localhost:11434",
    primaryModel: process.env.LLM_PRIMARY_MODEL || "llama3:8b-instruct-q4_K_M",
    fallbackModel:
      process.env.LLM_FALLBACK_MODEL || "mistral:7b-instruct-q4_K_M",
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "2048", 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || "",
    location: process.env.GCP_LOCATION || "us-central1",
    credentialsPath: process.env.GCP_CREDENTIALS_PATH || "",
  },
}));
