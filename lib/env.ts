// Environment variable type definitions
// Adding type conversion processing in env.ts

export const env = {
  // Authentication related
  AUTH_SECRET: process.env.AUTH_SECRET || '',
  AUTH_URL: process.env.AUTH_URL || '',

  // Vercel services
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  POSTGRES_URL: process.env.POSTGRES_URL || '',

  // OpenRouter configuration
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_API_BASE_URL:
    process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL || '',
  OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME || '',

  // Timeout settings
  REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT
    ? Number.parseInt(process.env.REQUEST_TIMEOUT)
    : 60000,

  // Model configuration
  PRIMARY_MODEL: process.env.PRIMARY_MODEL || 'anthropic/claude-3.7-sonnet',
  CHAT_MODEL: process.env.CHAT_MODEL || 'anthropic/claude-3.7-sonnet',
  REASONING_MODEL: process.env.REASONING_MODEL || 'anthropic/claude-3.7-sonnet',
  TITLE_MODEL: process.env.TITLE_MODEL || 'meta-llama/llama-3-8b-instruct',
  ARTIFACT_MODEL: process.env.ARTIFACT_MODEL || 'anthropic/claude-3-haiku',
  MULTIMODAL_MODEL:
    process.env.MULTIMODAL_MODEL || 'anthropic/claude-3.7-sonnet',

  // Model parameters
  MODEL_TEMPERATURE: Number.parseFloat(process.env.MODEL_TEMPERATURE || '0.7'),
  MAX_TOKENS: Number.parseInt(process.env.MAX_TOKENS || '40960'),

  // Image generation configuration
  IMAGE_GENERATION_MODEL:
    process.env.IMAGE_GENERATION_MODEL || 'anthropic/claude-3.7-sonnet',
  IMAGE_SIZE: process.env.IMAGE_SIZE || '1024x1024',
  IMAGE_COUNT: Number.parseInt(process.env.IMAGE_COUNT || '1'),
  RETRY_COUNT: Number.parseInt(process.env.RETRY_COUNT || '3'),
};
