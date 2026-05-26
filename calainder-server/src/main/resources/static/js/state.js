export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const CHAT_STORAGE_KEY = 'calainderChatState';
const PENDING_ACTION_STORAGE_KEY = 'calainderPendingAction';

let chatState = { items: [] };
let restoringChat = false;

export function isRestoringChat() {
    return restoringChat;
}

export function setRestoringChat(value) {
    restoringChat = value;
}

export function createChatItemId() {
    return `${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}

export function saveChatState() {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatState));
}

export function loadChatState() {
    try {
        chatState = JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY)) || { items: [] };
    } catch (error) {
        chatState = { items: [] };
    }

    return chatState;
}

export function getChatItems() {
    return chatState.items;
}

export function findChatItem(id) {
    return chatState.items.find((item) => item.id === id);
}

export function addChatStateMessage(text, type, id) {
    chatState.items.push({
        id,
        kind: 'message',
        role: type,
        content: text
    });
    saveChatState();
}

export function addChatStateSchedule(card, schedule, status) {
    chatState.items.push({
        id: card.dataset.chatId,
        kind: 'schedule',
        status,
        schedule: structuredClone(schedule)
    });
    saveChatState();
}

export function updateChatStateSchedule(card, schedule, status = card.dataset.status) {
    const item = findChatItem(card.dataset.chatId);

    if (!item) {
        return;
    }

    item.status = status;
    item.schedule = structuredClone(schedule);
    saveChatState();
}

export function removeChatStateItem(id) {
    chatState.items = chatState.items.filter((item) => item.id !== id);
    saveChatState();
}

export function savePendingAction(action) {
    sessionStorage.setItem(PENDING_ACTION_STORAGE_KEY, JSON.stringify(action));
}

export function consumePendingAction() {
    const saved = sessionStorage.getItem(PENDING_ACTION_STORAGE_KEY);

    if (!saved) {
        return null;
    }

    sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY);

    try {
        return JSON.parse(saved);
    } catch (error) {
        return null;
    }
}
