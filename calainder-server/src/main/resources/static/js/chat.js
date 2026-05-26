import { scrollChatToBottom, ui } from './dom.js';
import {
    addChatStateMessage,
    createChatItemId,
    findChatItem,
    getChatItems,
    isRestoringChat,
    loadChatState,
    saveChatState,
    setRestoringChat
} from './state.js';

export function addChatMessage(text, type, options = {}) {
    const message = document.createElement('div');
    message.className = `chat-message chat-message--${type}`;
    message.dataset.chatId = options.id ?? createChatItemId();
    message.textContent = text;
    ui.chatFeed.appendChild(message);

    if (!isRestoringChat() && options.persist !== false) {
        addChatStateMessage(text, type, message.dataset.chatId);
    }

    scrollChatToBottom();
    return message;
}

export function updateChatMessage(message, text) {
    if (!message) {
        return;
    }

    message.textContent = text;

    const item = findChatItem(message.dataset.chatId);
    if (item) {
        item.content = text;
        saveChatState();
    }

    scrollChatToBottom();
}

export function showLoadingMessage() {
    return addChatMessage('AI가 일정을 분석하고 있어요...', 'ai');
}

export function restoreChatState(renderScheduleCard) {
    loadChatState();

    if (!getChatItems().length) {
        return;
    }

    setRestoringChat(true);
    ui.chatFeed.innerHTML = '';

    getChatItems().forEach((item) => {
        if (item.kind === 'message') {
            addChatMessage(item.content, item.role, { id: item.id, persist: false });
        }

        if (item.kind === 'schedule') {
            renderScheduleCard(item.schedule, { status: item.status, id: item.id });
        }
    });

    setRestoringChat(false);
    scrollChatToBottom();
}
