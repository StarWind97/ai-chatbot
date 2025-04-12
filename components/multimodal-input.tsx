'use client';

import type { Attachment, UIMessage } from 'ai';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon, ImageIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';

// Add image generation dialog
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { ImageGenerator } from './image-generator';
import { GeneratedImagePreview } from '@/components/generated-image-preview';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Log attachments before submission
    if (process.env.NODE_ENV !== 'production') {
      if (attachments.length > 0) {
        console.log(
          `[DEBUG] Submitting message with ${attachments.length} attachments:`,
          attachments.map((a) => ({
            name: a.name,
            contentType: a.contentType,
            urlLength: a.url.length,
            // Display the first 50 chars of the URL to help diagnose issues
            urlStart: a.url.substring(0, 50),
          })),
        );
      } else {
        console.log('[DEBUG] Submitting message without attachments');
      }
    }

    try {
      // Submit message with attachments
      handleSubmit(undefined, {
        experimental_attachments: attachments,
      });

      // Clear attachments and input after submission
      setAttachments([]);
      setLocalStorageInput('');
      resetHeight();

      if (width && width > 768) {
        textareaRef.current?.focus();
      }

      // Show success toast if there were attachments
      if (attachments.length > 0) {
        toast.success(`Message sent with ${attachments.length} attachment(s)`, {
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to submit message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  // Add state for image generation
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
  const [isPlaceholderImage, setIsPlaceholderImage] = useState(false);

  // Handle image generation result
  const handleImageGenerated = (
    imageData: string,
    isPlaceholder = false,
    prompt = '',
  ) => {
    // Debug logs
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DEBUG] Image received in MultimodalInput - Length: ${imageData.length}`,
      );
      console.log(`[DEBUG] Prompt: "${prompt}"`);
    }

    // Set state for dialog display
    setGeneratedImage(imageData);
    setIsPlaceholderImage(isPlaceholder);
    if (prompt) {
      setImagePrompt(prompt);
    }
  };

  // Handle adding generated image as attachment
  const handleAddGeneratedImage = async () => {
    if (!generatedImage) return;

    // Get a unique filename for the image
    const timestamp = Date.now();
    const fileName = `generated-image-${timestamp}.png`;

    // Create base attachment object
    const imageUrl = generatedImage.startsWith('data:image')
      ? generatedImage
      : `data:image/png;base64,${generatedImage}`;

    // Create attachment object for base64 data
    const newAttachment = {
      name: fileName,
      contentType: 'image/png',
      url: imageUrl,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DEBUG] handleAddGeneratedImage - Adding image. Size: ${imageUrl.length} bytes`,
      );
    }

    // Check if Vercel Blob storage is configured
    if (
      !process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_READ_WRITE_TOKEN === '****'
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[WARN] BLOB_READ_WRITE_TOKEN not configured, using base64 data directly',
        );
      }

      // Add to attachments
      setAttachments((currentAttachments) => [
        ...currentAttachments,
        newAttachment,
      ]);

      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[DEBUG] Added base64 image to attachments. Current count:',
          attachments.length + 1,
        );
      }

      // Show warning toast
      toast.warning('Image added to message (not persisted)', {
        duration: 3000,
      });

      // Add descriptive text if there's a prompt
      if (imagePrompt) {
        setInput((currentInput) => {
          const prefix =
            currentInput.trim().length > 0 ? `${currentInput}\n\n` : '';
          return `${prefix}[Generated image: ${imagePrompt}]`;
        });
      }

      // Close dialog and reset state
      setIsImageGeneratorOpen(false);
      setGeneratedImage(null);
      setImagePrompt('');
      setIsPlaceholderImage(false);
      return;
    }

    try {
      // Try uploading to server storage for persistence
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          '[DEBUG] Uploading image to server storage:',
          '/api/files/upload-base64',
        );
      }

      fetch('/api/files/upload-base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: imageUrl,
          name: fileName,
          contentType: 'image/png',
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.url) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Image upload successful, URL:', data.url);
            }

            // Create attachment with the persisted URL
            const persistedAttachment = {
              url: data.url,
              name: data.pathname || fileName,
              contentType: 'image/png',
            };

            // Add to attachments
            setAttachments((currentAttachments) => [
              ...currentAttachments,
              persistedAttachment,
            ]);

            // Show success toast
            toast.success('Image added to message', { duration: 3000 });
          } else {
            // Fallback to using base64 data directly
            setAttachments((currentAttachments) => [
              ...currentAttachments,
              newAttachment,
            ]);

            console.warn(
              '[WARN] No URL in response, using base64 data directly:',
              data,
            );

            // Show warning toast
            toast.warning('Image added to message (not persisted)', {
              duration: 3000,
            });

            if (process.env.NODE_ENV !== 'production') {
              console.warn('[WARN] Using non-persisted image base64 data');
            }
          }

          // Add descriptive text if there's a prompt
          if (imagePrompt) {
            setInput((currentInput) => {
              const prefix =
                currentInput.trim().length > 0 ? `${currentInput}\n\n` : '';
              return `${prefix}[Generated image: ${imagePrompt}]`;
            });
          }

          // Close dialog and reset state
          setIsImageGeneratorOpen(false);
          setGeneratedImage(null);
          setImagePrompt('');
          setIsPlaceholderImage(false);
        })
        .catch((error) => {
          console.error('[ERROR] Failed to upload image:', error);

          // Fallback to using base64 directly on failure
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            newAttachment,
          ]);
          toast.warning('Image added but could not be saved permanently', {
            duration: 3000,
          });

          // Add descriptive text if there's a prompt
          if (imagePrompt) {
            setInput((currentInput) => {
              const prefix =
                currentInput.trim().length > 0 ? `${currentInput}\n\n` : '';
              return `${prefix}[Generated image: ${imagePrompt}]`;
            });
          }

          // Close dialog and reset state
          setIsImageGeneratorOpen(false);
          setGeneratedImage(null);
          setImagePrompt('');
          setIsPlaceholderImage(false);
        });
    } catch (error) {
      console.error('[ERROR] Error adding image to message:', error);

      // Fallback to using base64 directly on error
      setAttachments((currentAttachments) => [
        ...currentAttachments,
        newAttachment,
      ]);
      toast.warning('Image added but could not be saved permanently', {
        duration: 3000,
      });

      // Close dialog and reset state
      setIsImageGeneratorOpen(false);
      setGeneratedImage(null);
      setImagePrompt('');
      setIsPlaceholderImage(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-scroll items-end"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <div className="flex w-full rounded-lg border border-token-border-medium bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_1px_2px_0_rgba(0,0,0,0.03)]">
        <Textarea
          ref={textareaRef}
          tabIndex={0}
          placeholder="Send a message"
          className="min-h-[24px] h-6 max-h-[30vh] border-none focus-visible:ring-transparent px-3 w-full flex-1 resize-none bg-transparent"
          autoFocus={false}
          value={input}
          onInput={handleInput}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              input.trim() &&
              uploadQueue.length === 0 &&
              status !== 'streaming'
            ) {
              event.preventDefault();
              submitForm();
            }
          }}
          disabled={status === 'streaming'}
        />

        <div className="flex items-center gap-1 shrink-0 px-2">
          <Dialog
            open={isImageGeneratorOpen}
            onOpenChange={(open) => {
              setIsImageGeneratorOpen(open);
              if (!open) {
                // Reset image state when dialog is closed
                setGeneratedImage(null);
                setImagePrompt('');
                setIsPlaceholderImage(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                data-testid="image-generator-button"
                className="rounded-md p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
                title="Generate Image"
                aria-label="Generate Image"
                disabled={status !== 'ready'}
                variant="ghost"
              >
                <ImageIcon size={14} />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>AI Image Generation</DialogTitle>
                <DialogDescription>
                  Generate images with artificial intelligence
                </DialogDescription>
              </DialogHeader>
              {generatedImage ? (
                <GeneratedImagePreview
                  imageData={generatedImage}
                  prompt={imagePrompt || 'Generated image'}
                  isPlaceholder={isPlaceholderImage}
                  onAdd={handleAddGeneratedImage}
                  onCancel={() => {
                    setGeneratedImage(null);
                    setImagePrompt('');
                  }}
                />
              ) : (
                <ImageGenerator
                  onImageGenerated={(imageData, isPlaceholder, prompt) => {
                    // Only store the generated image data, don't automatically add to message
                    if (process.env.NODE_ENV !== 'production') {
                      console.log(
                        '[DEBUG] Image generated, data length:',
                        imageData.length,
                      );
                    }

                    // Set the generated image data
                    handleImageGenerated(imageData, isPlaceholder, prompt);
                  }}
                  fileName={`image-${new Date().getTime()}`}
                  onClose={() => setIsImageGeneratorOpen(false)}
                  setAttachments={setAttachments}
                />
              )}
            </DialogContent>
          </Dialog>

          <PureAttachmentsButton fileInputRef={fileInputRef} status={status} />

          {status === 'streaming' ? (
            <PureStopButton stop={stop} setMessages={setMessages} />
          ) : (
            <PureSendButton
              submitForm={submitForm}
              input={input}
              uploadQueue={uploadQueue}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
