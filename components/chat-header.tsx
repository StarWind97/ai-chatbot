'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open: isSidebarOpen } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    // <header> 元素是一个 HTML5 语义化标签，用于表示页面或区域的头部。
    // 粘性布局：它会在页面滚动时保持在顶部，并且在页面滚动时不会被其他元素覆盖。
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />
      {/* 
      在小屏幕上，无论侧边栏状态如何，都会显示带文本的 New Chat 按钮
      在大屏幕上，当侧边栏打开时不显示按钮；当侧边栏关闭时，显示只有图标的按钮（文本隐藏）
      md:在中等及以上屏幕（≥768px）
      */}
      {/* 判断逻辑应该统一于一处? */}
      {(!isSidebarOpen || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              {/* 只有在小屏幕上才显示文本 */}
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      <Button
        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
        asChild
      >
        <Link
          href={`https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot&env=AUTH_SECRET&envDescription=Learn more about how to get the API Keys for the application&envLink=https://github.com/vercel/ai-chatbot/blob/main/.env.example&demo-title=AI Chatbot&demo-description=An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.&demo-url=https://chat.vercel.ai&products=[{"type":"integration","protocol":"ai","productSlug":"grok","integrationSlug":"xai"},{"type":"integration","protocol":"ai","productSlug":"api-key","integrationSlug":"groq"},{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"blob"}]`}
          target="_noblank"
        >
          <VercelIcon size={16} />
          Deploy with Vercel
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});

/**
<Button ... asChild>
asChild 属性解释
自于 Radix UI 库（这个项目使用的 UI 组件库可能是基于 Radix UI 构建的，如 shadcn/ui）。
  asChild 属性的主要功能是：
    1. 组件合成 ：它允许 Button 组件不渲染自己的 DOM 元素，而是将所有的属性、事件处理器和行为传递给它的子元素。
    2. 保留子元素的语义 ：在这个例子中， Button 组件内部包含了一个 Link 组件。使用 asChild 后，最终渲染的是一个具有 Button 样式和行为的 Link 元素，而不是一个包含 Link 的 Button 元素。

这段代码的效果是：
  - 创建一个看起来像按钮的链接
  - 链接具有按钮的所有样式和视觉效果
  - 点击时会导航到指定的 Vercel 部署 URL
  - 避免了嵌套 DOM 元素（不会有 <button><a>...</a></button> 这样的结构）
如果没有 asChild ，最终渲染的 DOM 结构会是一个按钮包含一个链接，这在语义上是不正确的，并且可能导致一些可访问性问题。使用 asChild 后，最终只渲染一个具有按钮样式的链接元素。
这种模式在现代 React 组件库中很常见，它提高了组件的灵活性和可组合性。

在这个特定的例子中， asChild 使得 "Deploy with Vercel" 按钮既有按钮的视觉样式和交互效果，又保留了链接的导航功能，同时避免了不必要的 DOM 嵌套和语义问题。这是现代 React 组件库（如 Radix UI 和基于它的 shadcn/ui）中常用的一种模式，用于创建更灵活、更可组合的组件。

 */

/**
memo 是 React 提供的一个高阶组件，用于性能优化。它的主要作用是：
  1. 避免不必要的重新渲染 ：当组件的 props 没有变化时，跳过渲染过程，直接复用上一次的渲染结果。
  2. 提高应用性能 ：特别是在大型应用中，可以显著减少不必要的渲染计算。

这段代码的具体解释：
  1. memo 接收两个参数：
    
    - 第一个参数是要优化的组件 PureChatHeader
    - 第二个参数是一个比较函数，用于决定是否需要重新渲染
  2. 比较函数 (prevProps, nextProps) => { return prevProps.selectedModelId === nextProps.selectedModelId; } 的作用是：
    
    - 只比较 selectedModelId 属性是否变化
    - 如果 selectedModelId 没有变化，返回 true ，表示不需要重新渲染
    - 如果 selectedModelId 变化了，返回 false ，表示需要重新渲染
  3. 这意味着即使其他 props（如 chatId 、 selectedVisibilityType 或 isReadonly ）发生变化，只要 selectedModelId 保持不变，组件就不会重新渲染。
为什么这样设计，这种设计表明：
  1. 在这个应用中， ChatHeader 组件的视觉呈现主要依赖于 selectedModelId
  2. 其他 props 的变化可能不会影响组件的外观或行为
  3. 开发者希望优化性能，避免因为其他不相关 props 变化导致的不必要重新渲染
这是一种有针对性的性能优化，特别适用于那些渲染成本较高或频繁更新的组件。

 */
