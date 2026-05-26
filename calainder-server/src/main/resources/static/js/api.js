import { addChatMessage, updateChatMessage } from './chat.js';

// 서버에서 보낸 json을 읽음
export async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        throw new Error('응답 본문이 비어 있습니다.');
    }

    return JSON.parse(text);
}

export async function readErrorMessage(response, fallbackMessage) {
    try {
        const errorBody = await readJsonResponse(response);
        return errorBody.message || errorBody.detail || fallbackMessage;
    } catch (error) {
        return fallbackMessage;
    }
}

export async function showApiError(response, fallbackMessage, message = null) {
    const errorMessage = await readErrorMessage(response, fallbackMessage);

    if (message) {
        updateChatMessage(message, errorMessage);
        return;
    }

    addChatMessage(errorMessage, 'ai');
}
