'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';

/**
id: string;                              //聊天会话的唯一标识符
initialMessages: Array<UIMessage>;       //初始消息列表
selectedChatModel: string;               //选择的AI聊天模型
selectedVisibilityType: VisibilityType;  //聊天可见性类型
isReadonly: boolean;                     //是否为只读模式
 */
export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  // 初始化聊天
  const {
    messages, // 消息列表
    setMessages, // 设置消息
    handleSubmit, // 提交处理函数
    input, // 输入内容
    setInput, // 设置输入
    append, // 添加消息
    status, // 聊天状态
    stop, // 停止生成
    reload, // 重新加载
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100, // 节流控制
    sendExtraMessageFields: true, // 发送额外消息字段
    generateId: generateUUID,
    onFinish: () => {
      // 当聊天完成时，重新获取聊天历史
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('[ERROR] Chat error:', error);
      toast.error('An error occured, please try again!');
    },
    onResponse: (response) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEBUG] Chat response status:', response.status);
      }
    },
  });

  // 获取投票
  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  // 附件
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        {/* 聊天标题和设置 */}
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        {/* 消息列表 */}
        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        {/* 输入框。MultimodalInput 组件，用于多模态输入（文本和附件） */}
        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {/* 条件渲染：当聊天处于只读模式时，不显示输入组件 */}
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      {/* 附件 */}
      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}

/**
https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
useChat hook 默认会向 /api/chat 发送请求，这是由 AI SDK 内部实现的约定。
当你在前端使用 useChat hook 时，如果没有特别指定 API 路径，它会默认使用这个路径。
如果你想使用不同的 API 路径，你可以通过 useChat hook 的 options 参数来指定。
例如，如果你想使用 /api/my-chat 作为 API 路径，你可以这样写：
const { messages, ..., setInput, ... } = useChat({
  id,
  body: { id, selectedChatModel: selectedChatModel },
  initialMessages,
  api: '/api/my-chat',
  ...
});
 */

/**
组件间通信
组件通过props向子组件传递状态和回调函数，实现了组件间的通信。例如，它将聊天状态、消息和操作函数传递给 Messages 和 MultimodalInput 组件。

数据流
1. 用户通过 MultimodalInput 输入消息和附件
2. 输入通过 handleSubmit 提交
3. 新消息添加到 messages 列表
4. AI响应通过 useChat hook处理并添加到消息列表
5. Messages 组件渲染更新后的消息列表
这个组件是整个聊天应用的核心，它协调了用户输入、AI响应和UI渲染之间的交互。
 */

/**
body: { id, selectedChatModel: selectedChatModel }
这里的 id 使用了 ES6 中的对象属性简写语法（Object Property Shorthand）。当对象的属性名与变量名相同时，可以省略冒号和变量名，直接写属性名。
所以 id 实际上等同于 id: id ，这是一种简写形式。而 selectedChatModel: selectedChatModel 没有使用简写形式，是因为在代码中想保持更明确的可读性，或者是代码风格的选择。
如果使用完全相同的风格，这行代码也可以写成：
body: { id: id, selectedChatModel: selectedChatModel },
body: { id, selectedChatModel }
这两种写法在功能上是完全等价的，只是代码风格的不同。在实际开发中，通常会根据团队的代码规范或个人偏好来选择使用哪种形式。
*/

/** 
useChat hook 中的参数解释：
  id: 聊天会话的唯一标识符。
  body: 包含聊天会话的元数据，例如 id 和 selectedChatModel。
  initialMessages: 聊天会话的初始消息列表。
  api: 发送聊天请求的 API 路径，默认为 /api/chat。
  initialSystemMessage: 聊天会话的初始系统消息，默认为 undefined。
  initialInput: 聊天会话的初始输入内容，默认为 undefined。
  experimental_throttle: 节流控制，用于限制消息发送的频率。
    这个参数用于控制消息流的节流（throttling）：
      - 功能 ：限制AI响应消息的更新频率，每100毫秒更新一次UI
      - 作用 ：
        - 减少UI渲染的频率，提高性能
        - 防止过于频繁的状态更新导致的界面卡顿
        - 在流式响应（streaming response）中特别有用，可以平滑显示效果
      - 单位 ：毫秒（ms）
    如果不设置此参数或值设为0，则每收到服务器的新token都会立即更新UI，可能导致性能问题。
  sendExtraMessageFields: 是否发送额外的消息字段，默认为 false。
    这个参数控制发送给API的消息内容：
      - 功能 ：决定是否将消息对象中的额外字段发送到后端API
      - 作用 ：
        - 当设为 true 时，会将消息对象中除了基本字段（如content、role）之外的其他字段也一并发送
        - 这对于传递附加信息（如消息ID、时间戳、附件等）非常有用
        - 在多模态聊天（包含图片、文件等）场景中尤为重要
    如果设为 false ，则只会发送消息的基本字段，忽略其他额外信息。
  generateId: 生成消息 ID 的函数，默认为 generateUUID。
  onFinish: 聊天完成时的回调函数。
  onError: 聊天出错时的回调函数。
  onStart: 聊天开始时的回调函数。
  onUpdate: 聊天更新时的回调函数。

*/

/** 
onFinish: () => {
  mutate(unstable_serialize(getChatHistoryPaginationKey));
}

详细解析
1. mutate 函数 ：
   - 来自 useSWRConfig() 钩子
   - 用于手动触发SWR缓存的重新验证（revalidation）
   - 作用是强制刷新指定键的数据，确保UI显示最新状态
2. unstable_serialize 函数 ：
   - 来自 swr/infinite
   - 用于将分页键函数序列化为字符串
   - "unstable_"前缀表示这是一个实验性API，未来可能会变化
3. getChatHistoryPaginationKey ：
   - 这是一个函数，用于生成获取聊天历史的分页键
   - 它定义了如何从服务器获取分页聊天历史数据
## 整体功能
当AI完成回复后，这行代码会：
  1. 序列化聊天历史的分页键
  2. 触发与该键关联的数据重新获取
  3. 确保侧边栏的聊天历史列表立即更新，显示最新的聊天记录
简单来说，这行代码确保了当用户与AI交互后，侧边栏的聊天历史会立即更新，无需等待自动刷新或页面重载。这提供了更好的用户体验，因为用户可以立即看到新的聊天会话出现在历史列表中。
*/
