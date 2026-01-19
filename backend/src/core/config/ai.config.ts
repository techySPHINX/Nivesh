import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
  },
  vertexAi: {
    projectId: process.env.VERTEX_AI_PROJECT_ID || process.env.GCP_PROJECT_ID || '',
    location: process.env.VERTEX_AI_LOCATION || process.env.GCP_LOCATION || 'us-central1',
    model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro',
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || '',
    location: process.env.GCP_LOCATION || 'us-central1',
    credentialsPath: process.env.GCP_CREDENTIALS_PATH || '',
  },
}));
