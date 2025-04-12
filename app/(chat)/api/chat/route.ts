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
import { generateImage } from '@/lib/ai/tools/generate-image';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

/**
 * AI-related libraries
 *   UIMessage: Defines UI-level message structure type
 *   appendResponseMessages: Used to append AI response messages to existing message list
 *   createDataStreamResponse: Creates data stream response, supports real-time streaming output
 *   smoothStream: Smooths stream output, making text output more natural
 *   streamText: Core function for getting streaming text response from AI model
 * Authentication
 *   auth: Handles user authentication, ensures only logged-in users can access API
 * Prompt system
 *   systemPrompt: Provides system prompts based on selected chat model
 * Database operations
 *   deleteChatById: Deletes chat record by ID
 *   getChatById: Gets chat record by ID
 *   saveChat: Saves new chat session
 *   saveMessages: Saves messages to database
 * Utility functions
 *   generateUUID: Generates unique identifier
 *   getMostRecentUserMessage: Gets most recent user message
 *   getTrailingMessageId: Gets ID of last message in message list
 * Chat features
 *   generateTitleFromUserMessage: Automatically generates chat title based on user message
 * AI tool set
 *   createDocument: Tool for AI to create documents
 *   updateDocument: Tool for AI to update documents
 *   requestSuggestions: Tool for AI to request suggestions
 *   getWeather: Tool to get weather information
 *   generateImage: Tool for AI to generate images
 * Environment and provider
 *   isProductionEnvironment: Determines if in production environment
 *   myProvider: AI model provider, used to get language model instance
 */

/**
 * This entire process implements an advanced AI chat feature, supporting real-time
 * streaming responses, tool integration, smooth output, and complete data persistence,
 * while handling error cases and boundary conditions.
 */
export async function POST(request: Request) {
  try {
    // Add initial log for debugging request processing
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] POST /api/chat received request');
    }

    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    // Add log after parsing JSON
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DEBUG] Processing chat ID: ${id}, Model: ${selectedChatModel}`,
      );
    }

    const session = await auth();
    // Verify user is logged in
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get most recent user message
    const userMessage = getMostRecentUserMessage(messages);
    // Verify user message exists
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Check if chat session already exists (in database)
    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      // If chat session doesn't exist, generate title and save to database
      await saveChat({ id, userId: session.user.id, title });
    } else {
      // If exists, verify user has permission to access this chat session
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // Save user message to database
    try {
      await saveMessages({
        messages: [
          {
            id: userMessage.id,
            chatId: id,
            role: 'user',
            parts: userMessage.parts,
            attachments: userMessage.experimental_attachments ?? [],
            createdAt: new Date(),
          },
        ],
      });

      // Add log after successfully saving user message
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[DEBUG] Successfully saved user message ID: ${userMessage.id} for chat ID: ${id}`,
        );
      }
    } catch (saveError) {
      console.error(
        `[ERROR] Failed to save user message ID: ${userMessage.id} for chat ID: ${id}`,
        saveError,
      );
      // Decide if we should stop processing or continue despite save failure
      // For now, let's return a 500 error immediately if saving fails
      return new Response('Failed to save user message to database', {
        status: 500,
      });
    }

    // Debug log for user message attachments
    if (
      process.env.NODE_ENV !== 'production' &&
      userMessage.experimental_attachments?.length
    ) {
      console.log(
        `[DEBUG] Saved user message with ${
          userMessage.experimental_attachments.length
        } attachments:`,
        userMessage.experimental_attachments.map((a) => ({
          name: a.name,
          contentType: a.contentType,
          urlPartialLength: a.url?.substring(0, 30).length || 0,
        })),
      );
    }

    // Core part of chat API, using AI model to generate response
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          // Use specified language model
          model: myProvider.languageModel(selectedChatModel),
          // Apply system prompt
          system: systemPrompt({ selectedChatModel }),
          // Pass message history
          messages,
          // Set maximum steps, limiting model's thinking steps
          maxSteps: 5,
          // Dynamically enable different tools based on selected model
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  'generateImage',
                ],
          // Use smoothStream to optimize output, chunk by word for more natural text output
          experimental_transform: smoothStream({ chunking: 'word' }),
          // Generate unique ID for each message
          experimental_generateMessageId: generateUUID,
          // Define available tools implementation
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            generateImage: generateImage({
              dataStream,
            }),
          },
          // Define operations to execute when response generation is complete
          //response.messages 主要包含的是当前交互的消息，即用户的最新提问和模型的最新回复。它不包含完整的对话历史。
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                // Get last assistant message ID
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }
                //通过解构赋值，只获取第二个元素，即AI助手的最新响应消息对象
                // Get AI assistant's latest response message
                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                // Debug for attachments in message
                if (process.env.NODE_ENV !== 'production') {
                  console.log(
                    `[DEBUG] Processing assistant message to save with ID: ${assistantId}`,
                  );

                  if (assistantMessage.experimental_attachments?.length) {
                    console.log(
                      `[DEBUG] Assistant message has ${assistantMessage.experimental_attachments.length} attachments`,
                    );
                  }

                  if (userMessage.experimental_attachments?.length) {
                    console.log(
                      `[DEBUG] User message had ${userMessage.experimental_attachments.length} attachments`,
                    );
                  }
                }

                // Save assistant message to database
                try {
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

                  if (process.env.NODE_ENV !== 'production') {
                    console.log(
                      `[DEBUG] Successfully saved assistant message with ID: ${assistantId}`,
                    );
                  }
                } catch (saveError) {
                  console.error(
                    '[ERROR] Failed to save assistant message:',
                    saveError,
                  );
                }

                // Debug log for attachments
                if (
                  process.env.NODE_ENV !== 'production' &&
                  assistantMessage.experimental_attachments?.length
                ) {
                  console.log(
                    `[DEBUG] Saved assistant message with ${
                      assistantMessage.experimental_attachments.length
                    } attachments:`,
                    assistantMessage.experimental_attachments.map((a) => ({
                      name: a.name,
                      contentType: a.contentType,
                      urlPartialLength: a.url?.substring(0, 30).length || 0,
                    })),
                  );
                }
              } catch (error) {
                console.error('[ERROR] Failed to save chat:', error);
              }
            }
          },
          // Enable experimental telemetry, controlled by environment variable
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        // Process stream data:
        // Use consumeStream() to start processing generated text data
        result.consumeStream();
        // Merge results into data stream, set sendReasoning: true to include reasoning process
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        // Log the specific error caught by createDataStreamResponse
        console.error(
          '[ERROR] Error within createDataStreamResponse execution:',
          error,
        );
        return 'Oops, an error occurred during stream processing!';
      },
    });
  } catch (error) {
    // Log the error before returning response
    console.error('[ERROR] Unhandled error in POST /api/chat:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500, // Corrected status code
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
# createDataStreamResponse 函数详细解析
createDataStreamResponse 是一个用于创建流式HTTP响应的核心函数，它在AI聊天应用中扮演着关键角色，使服务器能够以流式方式向客户端发送数据。

## 基本概念
createDataStreamResponse 函数用于创建一个流式HTTP响应对象，它接受两个主要参数：
- execute ：执行函数，接收一个数据流对象dataStream作为参数，用于接收生成的文本数据。
- onError ：错误处理函数，当出现错误时返回友好提示。

## 函数签名
function createDataStreamResponse({
  execute,
  onError
}: {
  execute: (dataStream: DataStream) => void;
  onError?: (error: Error) => string;
}): Response

## createDataStreamResponse的返回值
createDataStreamResponse的返回值是一个 Response 对象，它包含了流式处理的结果。在此处直接作为 API 路由的响应返回给客户端。
这个 Response 对象是一个标准的 Web API 响应对象，但它的特殊之处在于它包含了一个流式的响应体，允许服务器以流的形式向客户端发送数据。这使得 AI 生成的内容可以实时地传输到客户端，而不必等待整个响应完成。
客户端接收到这个流式响应后，可以逐步处理接收到的数据，实现打字机效果或其他实时交互体验。

## 工作原理
1. 创建数据流 ：函数内部创建一个数据流对象( DataStream )，用于管理从服务器到客户端的实时数据传输
2. 设置响应头 ：配置适当的HTTP响应头，如 Content-Type: text/event-stream ，以支持服务器发送事件(SSE)
3. 创建响应流 ：建立一个可读流，作为HTTP响应的主体
4. 执行回调 ：调用 execute 回调函数，并传入数据流对象，允许开发者在回调中处理数据生成和传输
5. 错误处理 ：如果执行过程中出现错误，调用 onError 回调函数处理异常情况
6. 返回响应 ：最终返回一个包含流式数据的HTTP响应对象

## 数据流程
1. createDataStreamResponse 创建一个数据流对象 dataStream
2. 将 dataStream 传递给 execute 回调函数
3. 在 execute 内部，调用 streamText 函数并传入配置参数，获取AI模型的响应
4. streamText 返回一个结果对象 result
5. 调用 result.consumeStream() 开始处理生成的文本数据
6. 调用 result.mergeIntoDataStream(dataStream, { sendReasoning: true }) 将结果合并到数据流中
7. 数据通过HTTP响应流实时传输到客户端
8. 客户端接收并处理这些数据，实现实时更新界面

## 技术特点
1. 流式传输 ：不同于传统的一次性响应，它支持数据的分块传输，使客户端能够逐步接收和处理数据
2. 实时交互 ：允许在长时间运行的操作过程中向客户端发送实时更新，提升用户体验
3. 错误恢复 ：内置错误处理机制，确保即使在出错情况下也能向用户提供友好的反馈
4. 资源效率 ：通过流式传输减少内存使用，适合处理大量数据或长时间运行的操作

## 应用价值
1. 改善用户体验 ：用户不必等待整个响应完成，可以看到AI思考和生成内容的过程
2. 支持复杂操作 ：适合处理需要较长时间的操作，如AI模型生成长文本或执行复杂工具调用
3. 降低超时风险 ：通过持续发送数据，减少因长时间无响应导致的连接超时问题
总结来说， createDataStreamResponse 是实现AI聊天应用中流式响应的核心组件，它使应用能够提供更加自然、流畅的对话体验，同时支持复杂的数据处理和工具集成。


## 总结
createDataStreamResponse 函数是一个封装了流式处理的工具，它提供了一个统一的接口，用于生成流式文本响应。
它封装了流式处理的细节，使开发者可以更专注于生成流式文本响应。

*/

/** 
# streamText 函数详细解析
streamText 是 AI 聊天应用中的核心函数，它负责从 AI 模型获取流式文本响应。
这个函数接收一个配置对象，然后返回一个可以生成流式文本响应的结果对象。
### 核心参数
1. model : 指定要使用的语言模型
   - 通过 myProvider.languageModel(selectedChatModel) 获取
   - 根据用户选择的模型类型动态加载相应的模型
2. system : 系统提示词
   - 通过 systemPrompt({ selectedChatModel }) 获取
   - 根据选定的聊天模型提供适当的系统提示词，引导模型行为
3. messages : 消息历史
   - 包含完整的对话历史记录
   - 使模型能够理解对话上下文，生成连贯的回复
4. maxSteps : 最大步骤数
   - 限制模型思考的最大步骤数为 5
   - 防止模型过度思考，控制响应时间
### 工具相关参数
5. experimental_activeTools : 激活的工具列表
   - 根据选择的模型动态启用不同的工具
   - 如果是 'chat-model-reasoning' 模型，则不启用任何工具
   - 否则，启用天气查询、文档创建/更新和建议请求工具
6. tools : 工具实现
   - 定义了各个工具的具体实现
   - 每个工具都有特定的功能，如获取天气、创建文档等
   - 部分工具通过工厂函数创建，并传入 session 和 dataStream 参数
### 流处理相关参数
7. experimental_transform : 流转换器
   - 使用 smoothStream({ chunking: 'word' }) 优化输出流
   - 按词分块，使文本输出更加自然流畅
8. experimental_generateMessageId : 消息 ID 生成器
   - 使用 generateUUID 函数为每条消息生成唯一 ID
   - 确保每条消息都有唯一标识符，便于追踪和管理
### 回调函数
9. onFinish : 完成回调
   - 定义了在生成响应完成时要执行的操作
   - 主要负责将助手消息保存到数据库
   - 处理响应消息的提取和格式化
10. experimental_telemetry : 遥测配置
    - 启用实验性的遥测功能
    - 根据环境变量控制是否启用
    - 用于收集使用数据，改进服务
## 返回值和后续处理
streamText 函数返回一个结果对象 result ，该对象提供了处理流数据的方法：
1. consumeStream() : 开始消费生成的文本数据流
2. mergeIntoDataStream() : 将结果合并到数据流中
   - sendReasoning: true 参数表示包含模型的推理过程
   - 这使客户端能够看到模型的思考过程

## 工作流程
1. 调用 streamText 函数，传入配置参数
2. 函数连接到指定的语言模型
3. 模型开始生成响应，以流的形式返回
4. 响应流通过 smoothStream 进行优化，使输出更自然
5. 如果模型决定使用工具，会调用相应的工具函数
6. 工具执行结果返回给模型，模型继续生成响应
7. 生成的响应通过 dataStream 实时传输到客户端
8. 响应完成后，执行 onFinish 回调，保存消息到数据库
## 总结
streamText 函数是实现 AI 聊天功能的核心组件，它负责：
- 与 AI 模型建立连接
- 传递对话历史和系统提示
- 处理模型生成的流式响应
- 支持工具调用和执行
- 优化输出流，提供更自然的用户体验
- 处理响应完成后的数据持久化
这个函数的设计使 AI 聊天应用能够提供实时、流畅的对话体验，同时支持复杂的工具集成和数据处理流程。

*/

/** 
dataStream 参数是 execute 函数接收的一个关键参数，它在整个流式响应机制中扮演着核心角色。让我详细解释一下它的作用和工作原理：

### dataStream 的基本概念
dataStream 是一个数据流对象，它作为 createDataStreamResponse 函数内部创建并传递给 execute 回调函数的参数。这个对象负责管理和传输从服务器到客户端的实时数据流。

### dataStream 的主要功能
1. 数据传输通道 ：它提供了一个从服务器到客户端的实时数据传输通道，使AI生成的内容能够以流式方式发送给用户。
2. 实时更新 ：允许在长时间运行的操作过程中向客户端发送实时更新，而不必等待整个操作完成。
3. 工具执行状态 ：当AI使用工具时，可以通过dataStream向客户端报告工具执行的进度和状态。
4. 错误处理 ：在执行过程中，如果出现错误，dataStream可以向客户端报告错误信息，以便用户能够及时了解问题。
5. 数据格式 ：dataStream可以根据需要定义数据的格式，以适应不同的应用场景。

### 工作流程
1. createDataStreamResponse 创建一个数据流对象 dataStream
2. 将 dataStream 传递给 execute 回调函数
3. 在 execute 内部， dataStream 被传递给各种工具和处理函数
4. 这些函数在执行过程中向 dataStream 写入数据
5. 数据通过HTTP响应流实时传输到客户端
6. 客户端接收并处理这些数据，实现实时更新界面
### 实际应用价值
1. 改善用户体验 ：用户不必等待整个响应完成，可以看到AI思考和生成内容的过程
2. 工具执行透明度 ：当AI使用工具时，用户可以看到工具执行的进度和状态
3. 长时间操作反馈 ：对于需要较长时间的操作，提供实时反馈，避免用户等待无响应
总结来说， dataStream 是实现流式响应和实时交互的核心机制，它使AI聊天应用能够提供更加自然、流畅的用户体验。

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
  generateImage: generateImage({
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
5. generateImage ：
   - 生成图像
   - 通过工厂函数初始化，传入数据流
   - 可能在生成图像时发送实时更新

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
