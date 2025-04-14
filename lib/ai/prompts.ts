// Define ArtifactKind type locally since the module is no longer available
// export type ArtifactKind = 'text' | 'code' | 'sheet';

export const artifactsPrompt = `Document creation is disabled. Provide information in chat instead. Format code with proper syntax highlighting.`;

export const regularPrompt =
  'You are a friendly assistant! Keep your responses concise and helpful. Always respond in the same language as the user query.';

export const systemPrompt = ({
  selectedChatModel,
}: {
  selectedChatModel: string;
}) => {
  if (selectedChatModel === 'chat-model-reasoning') {
    return regularPrompt;
  } else {
    return `${regularPrompt}\n\n${artifactsPrompt}`;
  }
};

// export const codePrompt = `
// Create self-contained, executable code snippets that are:
// 1. Complete and runnable
// 2. Well-formatted with proper indentation
// 3. Include minimal helpful comments
// 4. Handle errors gracefully
// 5. Avoid unnecessary dependencies
// `;

// export const sheetPrompt =
//   'Create spreadsheets in csv format with meaningful headers and data.';

// export const updateDocumentPrompt = (
//   currentContent: string | null,
//   type: ArtifactKind,
// ) =>
//   type === 'text'
//     ? `Improve the document content: ${currentContent}`
//     : type === 'code'
//       ? `Improve the code: ${currentContent}`
//       : type === 'sheet'
//         ? `Improve the spreadsheet: ${currentContent}`
//         : '';
