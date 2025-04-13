// Environment variable type definitions
// Adding type conversion processing in env.ts

// Environment variable definitions using getters for dynamic access
export const env = {
  // Authentication related
  get AUTH_SECRET() {
    return process.env.AUTH_SECRET || '';
  },
  get AUTH_URL() {
    return process.env.AUTH_URL || '';
  },

  // Vercel services
  get BLOB_READ_WRITE_TOKEN() {
    return process.env.BLOB_READ_WRITE_TOKEN || '';
  },
  get POSTGRES_URL() {
    return process.env.POSTGRES_URL || '';
  },

  // OpenRouter configuration
  get OPENROUTER_API_KEY() {
    return process.env.OPENROUTER_API_KEY || '';
  },
  get OPENROUTER_API_BASE_URL() {
    return (
      process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1'
    );
  },
  get OPENROUTER_SITE_URL() {
    return process.env.OPENROUTER_SITE_URL || '';
  },
  get OPENROUTER_APP_NAME() {
    return process.env.OPENROUTER_APP_NAME || '';
  },

  // Aliyun Bailian configuration
  get ALIYUN_API_KEY() {
    return process.env.ALIYUN_API_KEY || '';
  },
  get ALIYUN_API_BASE_URL() {
    return (
      process.env.ALIYUN_API_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1'
    );
  },

  // Aliyun DashScope Image Models
  get DASHSCOPE_FLUX_MODEL() {
    return process.env.DASHSCOPE_FLUX_MODEL || 'flux-schnell';
  },
  get DASHSCOPE_WANX_MODELS() {
    const rawValue = process.env.DASHSCOPE_WANX_MODELS;
    return (rawValue || 'wanx2.1-t2i-turbo') // Default if env var is missing
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
  },

  // Timeout settings
  get REQUEST_TIMEOUT() {
    return Number.parseInt(process.env.REQUEST_TIMEOUT || '60000');
  },

  // Model configuration
  get PRIMARY_MODEL() {
    return process.env.PRIMARY_MODEL || 'anthropic/claude-3.7-sonnet';
  },
  get CHAT_MODEL() {
    return process.env.CHAT_MODEL || 'anthropic/claude-3.7-sonnet';
  },
  get REASONING_MODEL() {
    return process.env.REASONING_MODEL || 'anthropic/claude-3.7-sonnet';
  },
  get TITLE_MODEL() {
    return process.env.TITLE_MODEL || 'meta-llama/llama-3-8b-instruct';
  },
  get ARTIFACT_MODEL() {
    return process.env.ARTIFACT_MODEL || 'anthropic/claude-3-haiku';
  },
  get MULTIMODAL_MODEL() {
    return process.env.MULTIMODAL_MODEL || 'anthropic/claude-3.7-sonnet';
  },

  // Model parameters
  get MODEL_TEMPERATURE() {
    return Number.parseFloat(process.env.MODEL_TEMPERATURE || '0.7');
  },
  get MAX_TOKENS() {
    return Number.parseInt(process.env.MAX_TOKENS || '40960');
  },

  // Image generation configuration
  get IMAGE_GENERATION_MODEL() {
    return process.env.IMAGE_GENERATION_MODEL || 'anthropic/claude-3.7-sonnet';
  },
  get IMAGE_SIZE() {
    return process.env.IMAGE_SIZE || '1024x1024';
  },
  get IMAGE_COUNT() {
    return Number.parseInt(process.env.IMAGE_COUNT || '1');
  },
  get RETRY_COUNT() {
    return Number.parseInt(process.env.RETRY_COUNT || '3');
  },
};
