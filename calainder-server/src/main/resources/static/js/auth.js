import { addChatMessage, updateChatMessage } from './chat.js';
import { saveChatState, savePendingAction } from './state.js';

export function redirectToGoogleLogin(message = null) {
    const text = '구글 로그인이 필요합니다.\n잠시 후 로그인 페이지로 이동합니다.';

    if (message) {
        updateChatMessage(message, text);
    } else {
        addChatMessage(text, 'ai');
    }

    saveChatState();

    setTimeout(() => {
        window.location.href = '/oauth2/authorization/google';
    }, 1000);
}

export function handleUnauthorized(action = null, message = null) {
    if (action) {
        savePendingAction(action);
    }

    redirectToGoogleLogin(message);
}
