// 环境变量类型定义
// 在env.ts中添加类型转换处理

export const env = {
  // 认证相关
  AUTH_SECRET: process.env.AUTH_SECRET || '',
  AUTH_URL: process.env.AUTH_URL || '',

  // API密钥
  XAI_API_KEY: process.env.XAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',

  // Vercel服务
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  POSTGRES_URL: process.env.POSTGRES_URL || '',

  // OpenRouter配置
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_API_BASE_URL:
    process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL || '',
  OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME || '',

  // 超时设置
  REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT
    ? Number.parseInt(process.env.REQUEST_TIMEOUT)
    : 60000,
  // FETCH_TIMEOUT: process.env.FETCH_TIMEOUT
  //   ? Number.parseInt(process.env.FETCH_TIMEOUT)
  //   : 60000,
  // OPENAI_COMPATIBLE_API_TIMEOUT: process.env.OPENAI_COMPATIBLE_API_TIMEOUT
  //   ? Number.parseInt(process.env.OPENAI_COMPATIBLE_API_TIMEOUT)
  //   : 60000,

  // 多模态模型配置
  MULTIMODAL_MODEL: process.env.MULTIMODAL_MODEL || 'google/gemini-1.5-pro',
  MODEL_TEMPERATURE: Number.parseFloat(process.env.MODEL_TEMPERATURE || '0.7'),
  MAX_TOKENS: Number.parseInt(process.env.MAX_TOKENS || '4096'),

  // 图像生成配置
  IMAGE_GENERATION_MODEL:
    process.env.IMAGE_GENERATION_MODEL || 'stability/stable-diffusion-xl',
  IMAGE_SIZE: process.env.IMAGE_SIZE || '1024x1024',
  IMAGE_COUNT: Number.parseInt(process.env.IMAGE_COUNT || '1'),
  RETRY_COUNT: Number.parseInt(process.env.RETRY_COUNT || '2'),
};
