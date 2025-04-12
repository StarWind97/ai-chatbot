import type { Attachment } from 'ai';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LoaderIcon } from './icons';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  messageView = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  messageView?: boolean;
}) => {
  const { name, url, contentType } = attachment;
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Add debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] PreviewAttachment:', {
        name,
        contentType,
        urlStart: url ? `${url.substring(0, 30)}...` : 'undefined',
        urlLength: url?.length || 0,
        isUploading,
        messageView,
      });
    }
  }, [name, url, contentType, isUploading, messageView]);

  // Using different size and styling for message view vs input preview
  const containerClasses = messageView
    ? 'w-full h-auto max-w-full aspect-auto rounded-md relative flex flex-col items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700'
    : 'w-40 h-40 max-w-40 max-h-40 bg-muted rounded-md relative flex flex-col items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700';

  // Use different image sizing for message view
  const imageClasses = messageView
    ? 'rounded-md w-full max-h-[500px] object-contain'
    : 'rounded-md max-w-full max-h-full object-contain';

  // Image loading handler
  const handleImageLoad = () => {
    setLoaded(true);
    setImgError(false);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Image loaded successfully:', name);
    }
  };

  // Image error handler
  const handleImageError = () => {
    console.error(
      '[ERROR] Failed to load attachment image:',
      url?.substring(0, 30),
    );
    setImgError(true);
    setLoaded(false);

    // Show error toast only in message view
    if (messageView) {
      toast.error('Failed to load image attachment');
    }
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className={containerClasses}>
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={name}
              src={url}
              alt={name ?? 'An image attachment'}
              className={imageClasses}
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: loaded ? 'block' : 'none' }}
            />
          ) : (
            <div className="text-center text-xs text-gray-500 p-2">
              {contentType} file
            </div>
          )
        ) : (
          <div className="text-center text-xs text-gray-500 p-2">
            Unknown file type
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}

        {!loaded && contentType?.startsWith('image') && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-2">
            <div className="animate-spin text-zinc-500">
              <LoaderIcon />
            </div>
          </div>
        )}

        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-2">
            <span className="text-xs text-red-500">Failed to load image</span>
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-full truncate">{name}</div>
    </div>
  );
};
