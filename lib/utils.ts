import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

/**
 * Detects programming language based on code content
 * Returns language identifier for markdown code blocks
 */
export function detectCodeLanguage(codeInput: string): string {
  // Skip detection for empty code
  if (!codeInput || codeInput.trim().length === 0) {
    return '';
  }

  const code = codeInput.trim();

  // HTML detection
  if (
    code.includes('<html') ||
    code.includes('<!DOCTYPE html') ||
    (code.includes('<') &&
      code.includes('</') &&
      (code.includes('<div') || code.includes('<p') || code.includes('<body')))
  ) {
    return 'html';
  }

  // JavaScript/TypeScript detection
  if (
    (code.includes('function') || code.includes('=>')) &&
    (code.includes('const ') ||
      code.includes('let ') ||
      code.includes('var ') ||
      code.includes('import ') ||
      code.includes('export ') ||
      code.includes('class ') ||
      code.includes('return '))
  ) {
    // Check for TypeScript specific syntax
    if (
      code.includes(': string') ||
      code.includes(': number') ||
      code.includes(': boolean') ||
      code.includes(': any') ||
      code.includes('interface ') ||
      code.includes('<T>') ||
      code.includes('as ') ||
      code.includes(': []')
    ) {
      return 'typescript';
    }
    return 'javascript';
  }

  // CSS detection
  if (
    code.includes('{') &&
    code.includes('}') &&
    (code.includes('color:') ||
      code.includes('margin:') ||
      code.includes('padding:') ||
      code.includes('@media') ||
      code.includes('border:'))
  ) {
    return 'css';
  }

  // Python detection
  if (
    code.includes('def ') ||
    (code.includes('import ') && code.includes(':')) ||
    code.includes('print(') ||
    (code.includes('if ') && code.includes(':')) ||
    (code.includes('for ') && code.includes(' in ')) ||
    (code.includes('class ') && code.includes(':'))
  ) {
    return 'python';
  }

  // SQL detection
  if (
    (code.toUpperCase().includes('SELECT ') &&
      code.toUpperCase().includes(' FROM ')) ||
    code.toUpperCase().includes('CREATE TABLE ') ||
    code.toUpperCase().includes('INSERT INTO ')
  ) {
    return 'sql';
  }

  // JSON detection
  if (
    (code.startsWith('{') && code.endsWith('}')) ||
    (code.startsWith('[') && code.endsWith(']'))
  ) {
    try {
      JSON.parse(code);
      return 'json';
    } catch (e) {
      // Not valid JSON
    }
  }

  // If no specific language detected, return empty string
  return '';
}
