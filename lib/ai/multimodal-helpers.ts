import type { Attachment } from 'ai';
import { env } from '@/lib/env';

/**
 * ToDo:
 * 1. 优化统一函数参数：模型，图片及其它参数
 * 2. 多图片处理及生成？
 */

/**
 * 多模态内容类型定义
 */
export type MultiModalContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/**
 * 图像生成选项
 */
export interface ImageGenerationOptions {
  /** 使用的模型名称 */
  model?: string;
  /** 图像尺寸 */
  size?: string;
  /** 生成图像数量 */
  n?: number;
  /** 失败重试次数 */
  retries?: number;
}

/**
 * 使用多模态模型处理图像
 * 该函数直接调用OpenRouter API处理包含图像的请求
 *
 * @param imageUrl 图像URL
 * @param prompt 提示词
 * @returns 模型响应流
 */
export async function processImage(imageUrl: string, prompt: string) {
  // 创建包含图像的消息 - 使用兼容的消息格式
  // 由于 ai 包的 Message 类型限制，我们需要直接使用 OpenRouter 的原生 API

  // 设置请求超时
  const abortSignal = AbortSignal.timeout(env.REQUEST_TIMEOUT);

  try {
    // 使用多模态模型处理图像 - 直接调用 API
    const response = await fetch(
      `${env.OPENROUTER_API_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.OPENROUTER_SITE_URL || '',
          'X-Title': env.OPENROUTER_APP_NAME || '',
        },
        body: JSON.stringify({
          model: env.MULTIMODAL_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ] as MultiModalContent[],
            },
          ],
          temperature: env.MODEL_TEMPERATURE,
          max_tokens: env.MAX_TOKENS,
          stream: true,
        }),
        signal: abortSignal,
      },
    );

    // 处理流式响应
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API 错误: ${JSON.stringify(error)}`);
    }

    // 返回响应流
    return response.body;
  } catch (error: unknown) {
    // 处理超时错误
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`请求超时: 处理图像请求超过了 ${env.REQUEST_TIMEOUT}ms`);
    }
    // 处理其他错误
    if (error instanceof Error) {
      throw error;
    }
    // 处理未知错误
    throw new Error(`未知错误: ${String(error)}`);
  }
}

/**
 * 生成图像（通过调用支持图像生成的模型）
 * 该函数使用OpenRouter API生成图像，支持重试和错误处理
 *
 * 如果你想一次生成多张图像，可以在环境变量中设置更大的值，
 * 或者在调用 generateImage 函数时通过 options 参数指定不同的数量。例如：
 * const imageUrl = await generateImage("一只可爱的猫", { n: 3 });
 * 不过需要注意，当前的实现只返回了第一张图像的 URL ( data.data[0].url )。
 * 如果要返回多张图像，需要修改函数返回值类型和相关处理逻辑。
 *
 * @param prompt 图像生成提示词
 * @param options 可选配置项
 * @returns 生成的图像URL
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {},
) {
  const {
    model = env.IMAGE_GENERATION_MODEL,
    size = env.IMAGE_SIZE,
    n = env.IMAGE_COUNT,
    retries = env.RETRY_COUNT,
  } = options;

  // 设置请求超时
  const abortSignal = AbortSignal.timeout(env.REQUEST_TIMEOUT);

  let lastError: Error | null = null;
  let currentRetry = 0;

  while (currentRetry <= retries) {
    try {
      const response = await fetch(
        `${env.OPENROUTER_API_BASE_URL}/images/generations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.OPENROUTER_SITE_URL || '',
            'X-Title': env.OPENROUTER_APP_NAME || '',
          },
          body: JSON.stringify({
            model,
            prompt,
            n,
            size,
          }),
          signal: abortSignal,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API 错误: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.data[0].url; //当前的实现只返回了第一张图像的 URL
    } catch (error: unknown) {
      // 处理错误并准备重试
      if (error instanceof Error) {
        lastError = error;
        // 处理超时错误
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw new Error(
            `请求超时: 图像生成请求超过了 ${env.REQUEST_TIMEOUT}ms`,
          );
        }
      } else {
        lastError = new Error(String(error));
      }

      currentRetry++;
      if (currentRetry <= retries) {
        // 指数退避重试
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, currentRetry - 1)),
        );
      }
    }
  }

  throw lastError || new Error('图像生成失败，已达到最大重试次数');
}

/**
 * 处理多模态消息
 * 将用户上传的图像和文本组合成多模态消息发送给AI模型
 *
 * @param content 文本内容
 * @param attachments 附件列表（图像等）
 * @returns 处理后的响应
 */
export async function processMultimodalMessage(
  content: string,
  attachments: Array<Attachment> = [],
) {
  // 如果没有附件，直接返回文本内容
  if (attachments.length === 0) {
    return content;
  }

  // 目前只处理第一个附件？
  // 目前只处理图像附件
  // 由于Attachment接口没有type属性，我们通过contentType或URL后缀判断是否为图像
  const imageAttachment = attachments.find((attachment) => {
    // 通过contentType判断
    if (attachment.contentType?.startsWith('image/')) {
      return true;
    }
    // 通过URL后缀判断（---局限性很大，比如上传了iPhone拍摄的HEIF格式---）
    const url = attachment.url.toLowerCase();
    return (
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.gif') ||
      url.endsWith('.webp') ||
      url.endsWith('.bmp') ||
      url.startsWith('data:image/')
    );
  });

  if (!imageAttachment || !imageAttachment.url) {
    return content;
  }

  // 处理图像和文本
  return processImage(imageAttachment.url, content);
}
