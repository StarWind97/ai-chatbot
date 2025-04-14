import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { isTestEnvironment } from '@/lib/constants';
import {
  chatModelForTest,
  reasoningModelForTest,
  titleModelForTest,
} from '@/lib/ai/models.test';

import { env } from '@/lib/env';
// Import OpenRouter
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Initialize OpenRouter client
const openRouterClient = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENROUTER_API_BASE_URL,
  // Add request headers
  // Setting these allows the app to appear on the OpenRouter leaderboard
  headers: {
    'HTTP-Referer': env.OPENROUTER_SITE_URL,
    'X-Title': env.OPENROUTER_APP_NAME,
  },
});

/**
 * Core provider configuration for the application's AI functionality.
 * Defines different AI models used for various tasks.
 */
export const aiModelProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModelForTest,
        'chat-model-reasoning': reasoningModelForTest,
        'title-model': titleModelForTest,
      },
    })
  : customProvider({
      languageModels: {
        // Use models from environment variables
        'chat-model': openRouterClient.languageModel(env.CHAT_MODEL),
        'chat-model-reasoning': wrapLanguageModel({
          model: openRouterClient.languageModel(env.REASONING_MODEL),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openRouterClient.languageModel(env.TITLE_MODEL),
        'multimodal-model': openRouterClient.languageModel(
          env.MULTIMODAL_MODEL,
        ),
      },
      // OpenRouter SDK doesn't directly support imageModel method,
      // but we can use multimodal models for image generation
    });
