'use client';

import { useState } from 'react';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  // 从className中提取语言名称（如果有）
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const [showPreview, setShowPreview] = useState(false);

  if (!inline) {
    // 提取代码内容
    const codeText = String(children).replace(/^.*\n/, '');

    return (
      <pre
        {...props}
        className={`not-prose text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900 relative`}
      >
        <div className="flex justify-between items-center mb-2">
          {language && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {language}
            </div>
          )}
          {(language === 'html' ||
            language === 'jsx' ||
            language === 'tsx') && (
            <button
              type="button"
              onClick={() => {
                // Create a temporary textarea to copy the code
                const textarea = document.createElement('textarea');
                textarea.value = codeText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // Show preview modal
                setShowPreview(true);
              }}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
            >
              Preview
            </button>
          )}
        </div>
        <code className="whitespace-pre-wrap break-words">{children}</code>

        {/* Preview Modal */}
        {showPreview && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Preview</h3>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 h-[60vh] overflow-auto">
                <iframe
                  srcDoc={codeText}
                  title="Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        )}
      </pre>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
