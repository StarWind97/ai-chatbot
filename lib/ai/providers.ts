import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { groq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModelForTest,
  chatModelForTest,
  reasoningModelForTest,
  titleModelForTest,
} from './models.test';

import { env } from '@/lib/env';
// 导入 OpenRouter
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// 初始化 OpenRouter 客户端
const openRouterClient = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: env.OPENROUTER_API_BASE_URL,
  // 可选：添加请求头
  // 设置它们可让应用出现在 OpenRouter 排行榜上
  // headers: {
  //   'HTTP-Referer': env.OPENROUTER_SITE_URL,
  //   'X-Title': env.OPENROUTER_APP_NAME,
  // },
});

// 新增 OpenRouter 提供商配置
export const openRouterProvider = isTestEnvironment
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
        // 使用 OpenRouter 模型 - 不传递额外参数
        'chat-model': openRouterClient.languageModel(
          'anthropic/claude-3-sonnet',
        ),
        'chat-model-reasoning': wrapLanguageModel({
          model: openRouterClient.languageModel('anthropic/claude-3-opus'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openRouterClient.languageModel(
          'meta-llama/llama-3-8b-instruct',
        ),
        'artifact-model': openRouterClient.languageModel(
          'anthropic/claude-3-haiku',
        ),
        // 添加支持图像的多模态模型
        'multimodal-model': openRouterClient.languageModel(
          'google/gemini-1.5-pro',
        ),
      },
      // OpenRouter SDK 不直接支持 imageModel 方法，但可以通过多模态模型处理图像
      // 然后，我们可以创建一个辅助函数来处理图像：lib\ai\providers.ts
    });

/*
应用程序AI功能的核心配置，定义了不同任务使用的AI模型及其配置方式。
目前的实现是将模型信息硬编码在代码中。
随后，考虑将模型信息配置在json和.env文件中，然后通过代码动态加载。
*/
export const oldProvider = isTestEnvironment
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
        'chat-model': xai('grok-2-1212'),
        'chat-model-reasoning': wrapLanguageModel({
          model: groq('deepseek-r1-distill-llama-70b'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': xai('grok-2-1212'),
        'artifact-model': xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });

export const myProvider = openRouterProvider;

/*
API KEY 环境变量载入约定
1. Vercel AI SDK 文档 ：
   根据 Vercel AI SDK 的文档，这些客户端会按以下顺序查找 API KEY：
   - 显式传递的参数
   - 特定命名的环境变量
   - 全局配置
因此，可以确认这些 SDK 确实会自动从环境变量中读取 API KEY，这是 AI SDK 的标准做法，可以避免在代码中硬编码敏感信息。
'chat-model': xai('grok-2-1212', {
  apiKey: process.env.XAI_API_KEY,
})
*/
