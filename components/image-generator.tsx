'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Attachment } from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoaderIcon } from './icons';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GeneratedImagePreview } from './generated-image-preview';

interface ImageGeneratorProps {
  onImageGenerated: (
    imageData: string,
    isPlaceholder?: boolean,
    prompt?: string,
  ) => void;
  className?: string;
  fileName?: string;
  onClose: () => void;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

interface ImageModel {
  id: string;
  name: string;
  type: string;
}

/**
 * Component for generating images using Aliyun Bailian API
 */
export function ImageGenerator({
  onImageGenerated,
  className,
  fileName,
  onClose,
  setAttachments,
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<ImageModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Load available models from the API on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch('/api/models/image-generation');
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const models: ImageModel[] = await response.json();

        setAvailableModels(models);
        // Set default model only if models are successfully fetched and list is not empty
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].id);
        }
      } catch (error) {
        console.error('[ERROR] Failed to load image generation models:', error);
        toast.error('Could not load image generation models.');
        // Keep default or potentially show an error state
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedModel]); // Depend on selectedModel only to set default, not to refetch

  /**
   * Handle image generation
   */
  const generateImage = async () => {
    if (!prompt || !selectedModel) return;

    try {
      setIsGenerating(true);
      setGeneratedImage(null);

      // Debug log the request
      console.log(
        `[DEBUG] Generating image with model: ${selectedModel}, prompt: ${prompt}`,
      );

      // Call the image generation API
      const response = await fetch('/api/image-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          height: height || 1024,
          width: width || 1024,
          negativePrompt: negativePrompt || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to generate image: ${response.status} ${
            errorData.error || response.statusText
          }`,
        );
      }

      const data = await response.json();
      const imageData = data.imageData;
      const isError = data.success === false;

      // Check if we received valid image data
      if (!imageData || imageData.length < 100) {
        throw new Error('Received invalid or empty image data');
      }

      setGeneratedImage(imageData);

      // Success message
      toast.success('Image generated successfully!');

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] Image generated successfully`);
      }

      // If onImageGenerated callback is provided, call it
      if (onImageGenerated) {
        onImageGenerated(imageData, isError, prompt);
      }
    } catch (error) {
      console.error('[ERROR] Image generation failed:', error);
      toast.error('Failed to generate image. Please try again.');

      // If still want to show error placeholder, uncomment this part
      // if (onImageGenerated) {
      //   // Use a placeholder for errors
      //   const errorPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      //   onImageGenerated(errorPlaceholder, true, prompt);
      // }
    } finally {
      setIsGenerating(false);
    }
  };

  const addToMessage = useCallback(() => {
    if (!generatedImage) return;

    // Ensure image URL format is correct
    const imageUrl = generatedImage.startsWith('data:image')
      ? generatedImage
      : `data:image/png;base64,${generatedImage}`;

    // Create a new attachment from the generated image
    const newAttachment = {
      name: `${fileName || 'generated-image'}.png`,
      contentType: 'image/png',
      url: imageUrl,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] Adding attachment to message:', {
        name: newAttachment.name,
        contentType: newAttachment.contentType,
        urlLength: newAttachment.url.length,
      });
    }

    // Add the new attachment to the list
    setAttachments((prev) => [...prev, newAttachment]);

    // Show success toast
    toast.success('Image added to message', {
      duration: 3000,
    });

    // Close the modal
    onClose();
  }, [generatedImage, fileName, setAttachments, onClose]);

  return (
    <div className={className}>
      <div className="mb-4">
        <label
          htmlFor="model-select"
          className="block mb-2 text-sm font-medium"
        >
          Model
        </label>
        <Select
          value={selectedModel}
          onValueChange={setSelectedModel}
          disabled={isLoadingModels || availableModels.length === 0}
        >
          <SelectTrigger id="model-select">
            <SelectValue
              placeholder={
                isLoadingModels ? 'Loading models...' : 'Select a model'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {isLoadingModels ? (
              <SelectItem value="loading" disabled>
                Loading...
              </SelectItem>
            ) : (
              availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.type === 'flux' && ' (推荐，速度快)'}
                  {m.type === 'wanx' && ' (高质量，较慢)'}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedModel?.toLowerCase().includes('wanx')
            ? '注意：Wanx模型提供更高质量的结果，但可能需要30-60秒或更长时间生成。'
            : 'Flux模型生成速度较快，但质量相对较低。'}
        </p>
      </div>

      <div className="flex items-center mb-4">
        <Button
          type="button"
          variant="link"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-0"
        >
          {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="image-width">Width</Label>
            <Input
              id="image-width"
              type="number"
              min={512}
              max={1024}
              step={64}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-height">Height</Label>
            <Input
              id="image-height"
              type="number"
              min={512}
              max={1024}
              step={64}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              disabled={isGenerating}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
            <Textarea
              id="negative-prompt"
              placeholder="Describe what you don't want to appear in the image..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={isGenerating}
            />
          </div>
        </div>
      )}

      {!generatedImage ? (
        <>
          <div className="mb-4">
            <label
              htmlFor="image-prompt"
              className="block mb-2 text-sm font-medium"
            >
              Prompt
            </label>
            <Textarea
              id="image-prompt"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            onClick={generateImage}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <span className="mr-2 animate-spin">
                  <LoaderIcon size={16} />
                </span>
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </Button>
        </>
      ) : (
        <GeneratedImagePreview
          imageData={generatedImage}
          prompt={prompt}
          isPlaceholder={false}
          onAdd={addToMessage}
          onCancel={() => {
            setGeneratedImage(null);
            setPrompt('');
          }}
        />
      )}
    </div>
  );
}
