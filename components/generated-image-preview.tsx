'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import cn from 'classnames';
import { useEffect, useState } from 'react';

interface GeneratedImagePreviewProps {
  imageData: string;
  prompt: string;
  isPlaceholder?: boolean;
  onAdd: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Component for displaying generated image preview
 */
export function GeneratedImagePreview({
  imageData,
  prompt,
  isPlaceholder = false,
  onAdd,
  onCancel,
  className,
}: GeneratedImagePreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Debug information
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DEBUG] ImagePreview - Data length: ${imageData?.length || 0}`,
      );
      if (imageData && imageData.length > 0) {
        console.log(
          `[DEBUG] ImagePreview - Data starts with: ${imageData.substring(0, 20)}...`,
        );
      }
      console.log(`[DEBUG] ImagePreview - Is placeholder: ${isPlaceholder}`);
    }
  }, [imageData, isPlaceholder]);

  // Extract actual image data from base64 string if needed
  const imageSource = imageData.startsWith('data:image')
    ? imageData
    : `data:image/png;base64,${imageData}`;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col items-center space-y-3">
        <div className="relative w-full aspect-square max-w-md rounded-md overflow-hidden border border-border bg-gray-100 dark:bg-gray-800">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="animate-pulse">Loading image...</span>
            </div>
          )}

          <Image
            src={imageSource}
            alt={prompt}
            fill
            className={cn(
              'object-contain',
              (!isLoaded || hasError) && 'opacity-0',
            )}
            priority
            unoptimized={true}
            onLoad={() => {
              setIsLoaded(true);
              setHasError(false);
              if (process.env.NODE_ENV !== 'production') {
                console.log('[DEBUG] Image loaded successfully');
              }
            }}
            onError={(e) => {
              console.error('[ERROR] Failed to load image:', e);
              setHasError(true);
            }}
          />

          {isPlaceholder && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-black/70 rounded p-3 max-w-[80%] text-center">
                <span className="text-white text-sm font-medium">
                  服务器错误：无法生成图像
                </span>
                <p className="text-white/80 text-xs mt-1">
                  SFM/Bailian
                  API遇到内部错误，这不是API密钥或设置问题。请稍后再试。
                </p>
              </div>
            </div>
          )}

          {hasError && !isPlaceholder && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm px-2 py-1 bg-black/70 rounded">
                图像加载失败
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          {prompt}
        </p>
      </div>

      <div className="flex flex-row gap-3 justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onAdd}
          disabled={hasError || (!isLoaded && !isPlaceholder)}
        >
          Add to Message
        </Button>
      </div>
    </div>
  );
}
