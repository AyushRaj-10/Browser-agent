import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.BACKEND_API_KEY || 'sih-secret-key-2026',
  nodeEnv: process.env.NODE_ENV || 'development',
  vlmProvider: (process.env.VLM_PROVIDER || 'mock').toLowerCase(),
  vlmApiKey: process.env.VLM_API_KEY || '',
  vlmModel: process.env.VLM_MODEL || 'claude-3-5-sonnet-20241022',
  vlmEndpoint: process.env.VLM_ENDPOINT || '',
};
