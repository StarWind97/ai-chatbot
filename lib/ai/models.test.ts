// 导入模拟可读流的函数，用于模拟流式响应
import { simulateReadableStream } from 'ai';
// 导入模拟语言模型类，用于创建测试用的假模型
import { MockLanguageModelV1 } from 'ai/test';
// 导入一个工具函数，根据提示词生成响应块
import { getResponseChunksByPrompt } from '@/tests/prompts/utils';

/**
这个文件主要用于测试环境中模拟 AI 模型的响应。

chatModel       -->    chatModelForTest
reasoningModel  -->    reasoningModelForTest
titleModel      -->    titleModelForTest
artifactModel   -->    artifactModelForTest
 */

// 模拟聊天模型
export const chatModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// 模拟推理模型（用于思考过程）
export const reasoningModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 500,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// 模拟标题生成模型
export const titleModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `This is a test title`,
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: [
        { type: 'text-delta', textDelta: 'This is a test title' },
        {
          type: 'finish',
          finishReason: 'stop',
          logprobs: undefined,
          usage: { completionTokens: 10, promptTokens: 3 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// 模拟工件模型（可能用于生成代码或其他结构化内容）
export const artifactModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

/** 
## 核心功能解析
1. 模拟模型创建 ：
   
   - 文件创建了四个不同的模拟语言模型： chatModel 、 reasoningModel 、 titleModel 和 artifactModel
   - 每个模型都使用 MockLanguageModelV1 类实例化，用于测试环境
2. 模型方法实现 ：
   
   - 每个模型都实现了两个主要方法：
     - doGenerate ：同步生成完整文本响应
     - doStream ：流式生成文本响应，模拟真实AI模型的逐字输出
3. 响应模拟 ：
   
   - 使用 simulateReadableStream 函数模拟流式响应
   - 设置了延迟参数，使响应看起来更像真实AI模型（有思考时间和打字速度）
4. 不同模型的特点 ：
   
   - chatModel ：基本的聊天响应模型
   - reasoningModel ：初始延迟更长(500ms)，可能模拟"思考"过程
   - titleModel ：固定返回标题文本，不依赖输入提示
   - artifactModel ：与chatModel类似，可能用于生成特定格式内容
5. 响应格式 ：
   
   - 包含元数据如 finishReason 、 usage （令牌使用情况）
   - 流式响应包含 text-delta （文本增量）和 finish （完成）类型的块
这个文件的主要目的是在测试环境中提供可预测的AI模型响应，避免在测试时依赖真实的AI服务，从而使测试更加可靠和一致。
*/
