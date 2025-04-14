'use client';

import type { UIMessage } from 'ai';
import { useState } from 'react';
import cn from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import type { Vote } from '@/lib/db/schema';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { MessageReasoning } from './message-reasoning';
import type { UseChatHelpers } from '@ai-sdk/react';
import Image from 'next/image';

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Check for image attachments in the message
  const imageAttachments =
    message.experimental_attachments?.filter((attachment) =>
      attachment.contentType?.startsWith('image/'),
    ) || [];

  // Debug info for images
  if (
    process.env.NODE_ENV !== 'production' &&
    message.experimental_attachments?.length
  ) {
    console.log(
      `[DEBUG] Message has ${message.experimental_attachments.length} attachments, ${imageAttachments.length} are images.`,
    );
  }

  // Function to process text content and embed image references as Markdown
  const processTextWithImages = (text: string): string => {
    if (!imageAttachments.length) return text;

    // Create markdown image references and append to the text
    const imageMarkdown = imageAttachments
      .map(
        (img, index) =>
          `\n\n![${img.name || `Image ${index + 1}`}](${img.url})`,
      )
      .join('');

    // Return the original text with image markdown appended
    return text + imageMarkdown;
  };

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments &&
              message.experimental_attachments.length > 0 &&
              message.role === 'user' && ( // Only show attachment previews for user messages
                <div className="mt-2 flex flex-col gap-2">
                  {message.experimental_attachments.map((attachment, i) => (
                    <div
                      key={`attachment-${attachment.name || i}`}
                      className="w-full max-w-md"
                    >
                      <PreviewAttachment
                        attachment={attachment}
                        messageView={true}
                      />
                    </div>
                  ))}
                </div>
              )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                        })}
                      >
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{part.text}</div>
                        ) : (
                          <>
                            {process.env.NODE_ENV !== 'production' &&
                              console.log(
                                '[DEBUG] Rendering Markdown with content:',
                                part.text,
                              )}
                            <Markdown>
                              {message.role === 'assistant' &&
                              imageAttachments.length > 0
                                ? processTextWithImages(part.text)
                                : part.text}
                            </Markdown>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cn({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? <Weather /> : null}
                    </div>
                  );
                }

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : null}
                    </div>
                  );
                }
              }
            })}

            {message.role === 'assistant' && (
              <MessageActions
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function areEqual(prevProps: any, nextProps: any) {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.message.content === nextProps.message.content &&
    equal(prevProps.vote, nextProps.vote)
  );
}

export const PreviewMessage = memo(PurePreviewMessage, areEqual);

export const ThinkingMessage = () => {
  return (
    <div className="flex gap-4 w-full mx-auto max-w-3xl px-4">
      <div className="flex-1 flex-wrap">
        <div className="bg-muted/50 p-3 rounded-md max-w-fit animate-pulse">
          <div className="size-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};
