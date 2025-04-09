import type { UIMessage } from 'ai';
import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

import { processMultimodalMessage } from '@/lib/ai/multimodal-helpers';

/**
AI相关库
  UIMessage : 定义了UI层面的消息结构类型
  appendResponseMessages : 用于将AI响应消息追加到现有消息列表
  createDataStreamResponse : 创建数据流式响应，支持实时流式输出
  smoothStream : 平滑流式输出，使文本输出更自然
  streamText : 核心函数，用于从AI模型获取流式文本响应
认证相关
  auth : 处理用户认证，确保只有已登录用户可以访问API
提示词系统
  systemPrompt : 根据选定的聊天模型提供系统提示词
数据库操作
  deleteChatById : 删除指定ID的聊天记录
  getChatById : 获取指定ID的聊天记录
  saveChat : 保存新的聊天会话
  saveMessages : 保存消息到数据库
工具函数
  generateUUID : 生成唯一标识符
  getMostRecentUserMessage : 获取最近的用户消息
  getTrailingMessageId : 获取消息列表中最后一条消息的ID
聊天功能
  generateTitleFromUserMessage : 根据用户消息自动生成聊天标题
AI工具集
  createDocument : AI创建文档的工具
  updateDocument : AI更新文档的工具
  requestSuggestions : AI请求建议的工具
  getWeather : 获取天气信息的工具
环境和提供者
  isProductionEnvironment : 判断是否为生产环境
  myProvider : AI模型提供者，用于获取语言模型实例

 */

// 设置最大执行时间
export const maxDuration = 60;

/** 
这整个流程实现了一个高级的AI聊天功能，支持实时流式响应、工具集成、平滑输出和完整的数据持久化，同时处理了错误情况和边界条件。
*/
// id 考虑重命名 chatId
export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();
    //验证用户是否已登录
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    //获取最近的用户消息
    //重命名：userMessageMostRecent
    const userMessage = getMostRecentUserMessage(messages);
    //验证用户消息是否存在
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // 检查是否有附件（多模态内容）
    // const hasAttachments =
    //   userMessage.experimental_attachments &&
    //   userMessage.experimental_attachments.length > 0;

    //检查聊天会话是否已存在（数据库）
    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      //如果聊天会话不存在，则生成标题并保存到数据库
      await saveChat({ id, userId: session.user.id, title });
    } else {
      //如果存在，验证用户是否有权限访问该聊天会话
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    //保存用户消息到数据库
    //userMessage 是从消息列表中获取的最近一条用户消息对象
    //userMessage.parts 包含了该消息的实际内容部分，可能是一个数组或对象，存储了消息的各个组成部分
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    //聊天API的核心部分，使用 AI 模型生成响应
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          //使用指定的语言模型
          model: myProvider.languageModel(selectedChatModel),
          //应用系统提示词
          system: systemPrompt({ selectedChatModel }),
          //传入消息历史
          messages,
          //设置最大步骤数，限制模型思考的最大步骤数
          maxSteps: 5,
          //根据选择的模型动态启用不同的工具：
          //如果选择的模型是 'chat-model-reasoning'，则不启用任何工具
          //否则，启用天气查询、文档创建/更新和建议请求工具
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          //使用 smoothStream 优化输出流，按词分块，使文本输出更加自然流畅
          experimental_transform: smoothStream({ chunking: 'word' }),
          //使用 generateUUID 函数为每条消息生成唯一ID
          experimental_generateMessageId: generateUUID,
          //定义可用工具的具体实现
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          //定义了在生成响应完成时要执行的操作
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                //获取助手角色的最后一条消息ID
                //重命名：assistantTrailingMessageId
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }
                //通过解构赋值，只获取第二个元素，即AI助手的最新响应消息对象
                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });
                //将助手消息保存到数据库，包括ID、聊天ID、角色、内容、附件和创建时间
                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          //启用实验性的遥测功能，根据环境变量控制是否启用
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        //最后处理流数据：
        //consumeStream() 来消费生成的文本数据，开始处理
        result.consumeStream();
        //将结果合并到数据流中，并设置 sendReasoning: true 以包含推理过程
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occured!';
      },
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

/**
createDataStreamResponse 函数用于创建一个流式HTTP响应。它接受两个主要参数：
  execute：执行函数，接收一个数据流对象作为参数，用于接收生成的文本数据。
  onError：错误处理函数，当出现错误时返回友好提示。
  返回值是一个 Response 对象，它包含了流式处理的结果。
*/

/** 
tools 配置工作原理解析
在现代AI聊天应用中，工具（tools）是一种扩展AI能力的机制，允许模型执行特定的外部操作，如获取天气信息、创建文档等。
这些工具通常是独立的外部服务或API，模型可以通过调用这些工具来获取所需的信息或执行特定的任务。

tools: {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({
    session,
    dataStream,
  }),
}
这段代码做了以下几件事：
1. 定义工具映射 ：创建一个对象，将工具名称映射到对应的函数实现
2. 工具初始化 ：
   - getWeather 直接使用导入的函数
   - 其他工具通过工厂函数创建，并传入必要的参数
3. 参数传递 ：
   - session ：用户会话信息，用于身份验证和权限检查
   - dataStream ：数据流对象，用于在工具执行过程中向客户端发送实时更新

工具工作流程
当AI模型决定使用某个工具时，以下是发生的过程：
1. 模型生成一个工具调用请求，指定工具名称和参数
2. 系统查找对应的工具函数
3. 工具函数执行，可能会：
   - 访问外部API（如天气服务）
   - 操作数据库（创建或更新文档）
   - 生成建议或执行其他操作
4. 工具执行结果返回给模型
5. 模型根据工具结果继续生成响应

各工具功能
1. getWeather ：
   - 获取特定位置的天气信息
   - 直接使用导入的函数，不需要额外配置
2. createDocument ：
   - 创建新文档
   - 通过工厂函数初始化，传入会话和数据流
   - 可能在执行过程中向客户端发送创建进度
3. updateDocument ：
   - 更新现有文档
   - 同样通过工厂函数初始化，传入会话和数据流
   - 可能发送更新进度和状态
4. requestSuggestions ：
   - 请求AI提供建议
   - 通过工厂函数初始化，传入会话和数据流
   - 可能在生成建议时发送实时更新

数据流的作用
dataStream 参数在工具执行过程中特别重要：
1. 它允许工具在执行长时间操作时向客户端发送实时更新
2. 用户可以看到工具执行的进度和中间结果
3. 提供更好的用户体验，避免长时间等待无响应
这种设计使AI能够执行复杂的操作，同时保持与用户的实时交互，大大增强了聊天应用的功能性和用户体验。

*/

/** 
appendResponseMessages 函数详细解析
appendResponseMessages 函数用于将AI模型生成的响应消息追加到现有的消息列表中，并返回处理后的结果。
这是一个非常有用的工具，特别是在处理连续对话时，它可以确保 AI 模型的响应无缝地融入到对话历史中。

const [, assistantMessage] = appendResponseMessages({
  messages: [userMessage],
  responseMessages: response.messages,
});

参数解析
函数接收一个对象参数，包含两个关键属性：
  1. messages : 原始消息列表，这里只包含了用户最近的一条消息 [userMessage]
  2. responseMessages : AI模型生成的响应消息列表，来自 response.messages

const [, assistantMessage] = appendResponseMessages({ ... });
这行代码使用了数组解构赋值：
  - 函数返回一个数组
  - 第一个元素（被忽略，用逗号跳过）是完整的合并后的消息列表
  - 第二个元素 assistantMessage 是AI助手的最新响应消息对象
工作流程
  1. 函数接收用户消息 [userMessage] 和AI响应消息 response.messages
  2. 内部处理这些消息，将AI响应追加到用户消息之后
  3. 返回一个数组，包含完整的消息列表和最新的助手消息
  4. 通过解构赋值，我们只获取第二个元素（助手消息）

*/

/** 
消息历史处理机制分析

messages: Array<UIMessage>
关于 messages 参数
  - messages 是从客户端请求中获取的，包含了当前聊天会话的对话历史
  - 它确实包含了该聊天中的所有对话记录，包括用户消息和AI助手的回复
  - 每次用户发送新消息时，客户端会将完整的对话历史一起发送到服务器

onFinish: async ({ response }) => {
  // ...处理response中的消息
}
关于 response 对象
- response 是 streamText 函数返回的一个对象，是AI模型生成的响应结果对象
- response.messages 包含了模型生成的新消息，通常只包含最新的一轮对话（用户问题和AI回答）
  - 它不一定包含整个聊天历史，而是专注于当前交互
- response.reasoning 包含了AI模型的推理过程，可能是一个字符串或对象
- response.id 是响应的唯一标识符

消息流转过程
  1. 客户端发送请求时，包含完整的 messages 历史
  2. 服务器将这些消息传递给AI模型
  3. AI模型生成响应，返回 response 对象
  4. 服务器使用 appendResponseMessages 将新的响应消息追加到历史中
  5. 新的消息被保存到数据库
  6. 客户端接收响应，更新本地的消息历史

为什么这样设计
这种设计有几个优点：
  1. 上下文连贯性 ：AI模型可以看到完整的对话历史，生成更连贯的回复
  2. 状态管理 ：客户端和服务器共享相同的消息历史状态
  3. 灵活性 ：可以在客户端或服务器端过滤或修改消息历史
  4. 持久化 ：重要的消息被保存到数据库，确保数据不会丢失
总结来说，是的，每次请求都会包含完整的对话历史，这确保了AI模型能够理解整个对话的上下文，生成更加连贯和相关的回复。


*/
