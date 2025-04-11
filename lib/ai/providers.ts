import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { isTestEnvironment } from '@/lib/constants';
import {
  artifactModelForTest,
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
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModelForTest,
        'chat-model-reasoning': reasoningModelForTest,
        'title-model': titleModelForTest,
        'artifact-model': artifactModelForTest,
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
        'artifact-model': openRouterClient.languageModel(env.ARTIFACT_MODEL),
        // Add multimodal model support
        'multimodal-model': openRouterClient.languageModel(
          env.MULTIMODAL_MODEL,
        ),
      },
      // OpenRouter SDK doesn't directly support imageModel method,
      // but we can use multimodal models for image generation
    });

/**
 * API KEY environment variable loading convention
 * According to the Vercel AI SDK documentation, these clients will look for API keys in the following order:
 * 1. Explicitly passed parameters
 * 2. Specifically named environment variables
 * 3. Global configuration
 */

/*
应用程序AI功能的核心配置，定义了不同任务使用的AI模型及其配置方式。
目前的实现是将模型信息硬编码在代码中。
随后，考虑将模型信息配置在json和.env文件中，然后通过代码动态加载。
*/
// export const oldProvider = isTestEnvironment
//   ? customProvider({
//       languageModels: {
//         'chat-model': chatModelForTest,
//         'chat-model-reasoning': reasoningModelForTest,
//         'title-model': titleModelForTest,
//         'artifact-model': artifactModelForTest,
//       },
//     })
//   : customProvider({
//       languageModels: {
//         'chat-model': xai('grok-2-1212'),
//         'chat-model-reasoning': wrapLanguageModel({
//           model: groq('deepseek-r1-distill-llama-70b'),
//           middleware: extractReasoningMiddleware({ tagName: 'think' }),
//         }),
//         'title-model': xai('grok-2-1212'),
//         'artifact-model': xai('grok-2-1212'),
//       },
//       imageModels: {
//         'small-model': xai.image('grok-2-image'),
//       },
//     });

// export const myProvider = openRouterProvider;
