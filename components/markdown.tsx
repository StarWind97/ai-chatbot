import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils'; // 添加 cn 函数导入

// 添加 MarkdownProps 类型定义
interface MarkdownProps {
  children: string;
  className?: string;
}

// 修改组件定义，添加 p 标签的自定义渲染
const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  pre: ({ children }) => <>{children}</>,
  // 添加自定义 p 标签渲染器
  p: ({ node, children, ...props }) => {
    // 添加空值检查
    if (!node || !node.children) {
      return <p {...props}>{children}</p>;
    }

    // 检查子元素是否包含代码块
    const hasCodeBlock = node.children.some(
      (child) =>
        child.type === 'element' &&
        (child.tagName === 'pre' ||
          (child.tagName === 'code' && !child.properties?.inline)),
    );

    // 如果包含代码块，则使用 Fragment 代替 p 标签
    if (hasCodeBlock) {
      return <>{children}</>;
    }

    return <p {...props}>{children}</p>;
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
};

const remarkPlugins = [remarkGfm];

// 修改 NonMemoizedMarkdown 组件，添加 className 支持
const NonMemoizedMarkdown = ({ children, className }: MarkdownProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      components={components}
      className={cn('markdown-body', className)}
    >
      {children}
    </ReactMarkdown>
  );
};

// 保留原有的 memo 导出，但更新类型
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);

// 删除重复的 Markdown 组件定义
