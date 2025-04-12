// Import the function to simulate readable streams for simulating streaming responses
import { simulateReadableStream } from 'ai';
// Import the mock language model class for creating test fake models
import { MockLanguageModelV1 } from 'ai/test';
// Import a utility function that generates response chunks based on prompts
import { getResponseChunksByPrompt } from '@/tests/prompts/utils';

/**
This file is primarily used for simulating AI model responses in the test environment.

chatModel       -->    chatModelForTest
reasoningModel  -->    reasoningModelForTest
titleModel      -->    titleModelForTest
artifactModel   -->    artifactModelForTest
 */

// Mock chat model
export const chatModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// Mock reasoning model (for thinking process)
export const reasoningModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 500,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// Mock title generation model
export const titleModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `This is a test title`,
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: [
        { type: 'text-delta', textDelta: 'This is a test title' },
        {
          type: 'finish',
          finishReason: 'stop',
          logprobs: undefined,
          usage: { completionTokens: 10, promptTokens: 3 },
        },
      ],
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

// Mock artifact model (possibly used for generating code or other structured content)
export const artifactModelForTest = new MockLanguageModelV1({
  doGenerate: async () => ({
    rawCall: { rawPrompt: null, rawSettings: {} },
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20 },
    text: `Hello, world!`,
  }),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
    rawCall: { rawPrompt: null, rawSettings: {} },
  }),
});

/** 
## Core Functionality Analysis
1. Mock Model Creation:
   
   - The file creates four different mock language models: chatModel, reasoningModel, titleModel, and artifactModel
   - Each model is instantiated using the MockLanguageModelV1 class for the test environment
2. Model Method Implementation:
   
   - Each model implements two main methods:
     - doGenerate: Synchronously generates complete text responses
     - doStream: Streams text responses, simulating real AI model's word-by-word output
3. Response Simulation:
   
   - Uses the simulateReadableStream function to simulate streaming responses
   - Sets delay parameters to make responses look more like real AI models (with thinking time and typing speed)
4. Characteristics of Different Models:
   
   - chatModel: Basic chat response model
   - reasoningModel: Longer initial delay (500ms), possibly simulating a "thinking" process
   - titleModel: Returns fixed title text, not dependent on input prompts
   - artifactModel: Similar to chatModel, possibly used to generate specific format content
5. Response Format:
   
   - Includes metadata such as finishReason, usage (token usage)
   - Streaming responses include text-delta (text increment) and finish (completion) type chunks
The main purpose of this file is to provide predictable AI model responses in the test environment, avoiding dependence on real AI services during testing, making tests more reliable and consistent.
*/
