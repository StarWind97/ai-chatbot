import { expect, test } from '@playwright/test';
import { ChatPage } from './pages/chat';
import { DocumentPage } from './pages/document';

test.describe('documents activity', () => {
  let chatPage: ChatPage;
  let documentPage: DocumentPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    documentPage = new DocumentPage(page);

    await chatPage.createNewChat();
  });

  test('create a text document', async () => {
    await chatPage.createNewChat();

    await chatPage.sendUserMessage(
      'Help me write an essay about Silicon Valley',
    );
    await documentPage.isGenerationComplete();

    expect(documentPage.document).toBeVisible();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toBe(
      'A document was created and is now visible to the user.',
    );

    await chatPage.hasChatIdInUrl();
  });

  test('toggle document visibility', async () => {
    await chatPage.createNewChat();

    await chatPage.sendUserMessage(
      'Help me write an essay about Silicon Valley',
    );
    await documentPage.isGenerationComplete();

    expect(documentPage.document).toBeVisible();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toBe(
      'A document was created and is now visible to the user.',
    );

    await documentPage.closeDocument();
    await chatPage.isElementNotVisible('document');
  });

  test('send follow up message after generation', async () => {
    await chatPage.createNewChat();

    await chatPage.sendUserMessage(
      'Help me write an essay about Silicon Valley',
    );
    await documentPage.isGenerationComplete();

    expect(documentPage.document).toBeVisible();

    const assistantMessage = await documentPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toBe(
      'A document was created and is now visible to the user.',
    );

    await documentPage.sendUserMessage('Thanks!');
    await documentPage.isGenerationComplete();

    const secondAssistantMessage = await chatPage.getRecentAssistantMessage();
    expect(secondAssistantMessage.content).toBe("You're welcome!");
  });
});
