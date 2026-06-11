import {
    closeQuickMenu,
    closeLoginModal,
    enterApp,
    handleQuickMenuOutsideClick,
    openCalendar,
    openLoginModal,
    restoreEnterApp,
    showToast,
    toggleQuickMenu,
    ui
} from './dom.js';
import { bindAttachmentEvents, clearAttachment, getSelectedAttachment } from './attachment.js';
import { addChatMessage, restoreChatState, showLoadingMessage, updateChatMessage } from './chat.js';
import { readJsonResponse, showApiError } from './api.js';
import { handleUnauthorized } from './auth.js';
import { consumePendingAction, removeChatStateItem } from './state.js';
import {
    createEventCard,
    finalizeCardAsSaved,
    populateCardFields,
    readCardSchedule,
    setScheduleCardHandlers,
    validateScheduleRange
} from './schedule-card.js';
import { renderLookupSchedules } from './lookup.js';
import { handleCrawlLoginSubmit } from './crawl.js';

let isAiRequesting = false; // AI 요청 중 중복 전송 방지

/* =========================
   API 호출
   - AI 일정 초안 생성
   - 초안 확인 후 캘린더 등록
   - 저장 완료 일정 수정/삭제
   - 일정 조회
========================= */

async function lookupSchedules(schedule, statusMessage = null) {
    const response = await fetch('/api/calendar/events/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
        credentials: 'include'
    });

    if (response.status === 401) {
        handleUnauthorized({
            type: 'lookup',
            schedule
        }, statusMessage);
        return;
    }

    if (!response.ok) {
        await showApiError(response, '일정 조회 중 오류가 발생했습니다.', statusMessage);
        return;
    }

    const schedules = await readJsonResponse(response);
    renderLookupSchedules(schedules, statusMessage);
}

async function resumePendingAction() {
    const action = consumePendingAction();

    if (!action) {
        return;
    }

    if (action.type === 'lookup') {
        const statusMessage = addChatMessage('로그인이 완료되어 일정을 다시 조회하고 있어요.', 'ai');
        await lookupSchedules(action.schedule, statusMessage);
        return;
    }

    if (action.type === 'create') {
        const card = Array.from(document.querySelectorAll('.schedule-card'))
                .find((item) => item.dataset.chatId === action.cardId);

        if (card) {
            await confirmDraftSchedule(card);
            return;
        }

        const restoredCard = createEventCard(action.schedule, { status: 'draft' });
        await confirmDraftSchedule(restoredCard);
    }
}

async function requestScheduleAnalysis() {
    if (isAiRequesting) {
        return;
    }

    const prompt = ui.composerInput.value.trim();
    const selectedAttachment = getSelectedAttachment();
    const formData = new FormData();
    let statusMessage = null;

    if (!prompt && !selectedAttachment) {
        addChatMessage('일정 내용이나 이미지를 입력해주세요.', 'ai');
        return;
    }

    isAiRequesting = true;
    ui.sendMessageButton.disabled = true;

    if (prompt && selectedAttachment) {
        addChatMessage(`첨부 이미지: ${selectedAttachment.name}\n${prompt}`, 'user');
    } else if (prompt) {
        addChatMessage(prompt, 'user');
    } else if (selectedAttachment) {
        addChatMessage(`첨부 이미지: ${selectedAttachment.name}`, 'user');
    }

    if (prompt) {
        formData.append('prompt', prompt);
    }

    if (selectedAttachment) {
        formData.append('image', selectedAttachment);
    }

    statusMessage = showLoadingMessage();

    ui.composerInput.value = '';
    clearAttachment();

    try {
        const response = await fetch('/api/schedules/analysis', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (response.status === 401) {
            handleUnauthorized(null, statusMessage);
            return;
        }

        if (!response.ok) {
            await showApiError(response, '요청 처리 중 오류가 발생했습니다.', statusMessage);
            return;
        }

        const schedules = await readJsonResponse(response);
        const schedule = schedules[0];
        const intent = schedule?.intent;

        if (intent === 'create') {
            updateChatMessage(statusMessage, '일정 초안이 생성되었습니다.\n확인 후 추가할 수 있습니다.');
            schedules.forEach((schedule) => {
                createEventCard(schedule, { status: 'draft' });
            });
            return;
        }

        if (intent === 'lookup') {
            await lookupSchedules(schedule, statusMessage);
            return;
        }

        updateChatMessage(statusMessage, '처리할 수 없는 요청입니다.');
    } catch (error) {
        console.error(error);
        if (statusMessage) {
            updateChatMessage(statusMessage, error.message || '요청 처리 중 오류가 발생했습니다.');
        } else {
            addChatMessage(error.message || '요청 처리 중 오류가 발생했습니다.', 'ai');
        }
    } finally {
        isAiRequesting = false;
        ui.sendMessageButton.disabled = false;
    }
}

// 초안 구글 캘린더에 등록
async function confirmDraftSchedule(card) {
    const schedule = readCardSchedule(card);

    if (!validateScheduleRange(schedule)) {
        return;
    }

    try {
        const response = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule),
            credentials: 'include'
        });

        if (response.status === 401) {
            handleUnauthorized({
                type: 'create',
                cardId: card.dataset.chatId,
                schedule
            });
            return;
        }

        if (!response.ok) {
            await showApiError(response, '일정 추가 중 오류가 발생했습니다.');
            return;
        }

        const savedSchedule = await readJsonResponse(response);
        finalizeCardAsSaved(card, savedSchedule);
        addChatMessage('일정을 구글 캘린더에 등록했습니다.', 'ai');
        // showToast('구글 캘린더에 일정이 추가되었습니다.');
    } catch (error) {
        console.error(error);
        addChatMessage(error.message || '일정 추가 중 오류가 발생했습니다.', 'ai');
    }
}

// 수정폼에서 확인버튼 클릭
async function saveCardEdit(card) {
    const nextSchedule = readCardSchedule(card);

    if (!validateScheduleRange(nextSchedule)) {
        return;
    }

    //
    if (card.dataset.status === 'draft') {
        populateCardFields(card, nextSchedule);
        return;
    }

    try {
        const eventUrl = nextSchedule.id ? `/api/calendar/events/${nextSchedule.id}` : '/api/calendar/events';
        const response = await fetch(eventUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextSchedule),
            credentials: 'include'
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            await showApiError(response, '일정 수정 중 오류가 발생했습니다.');
            return;
        }

        const updated = await readJsonResponse(response);
        populateCardFields(card, updated);
        showToast('구글 캘린더 일정이 수정되었습니다.');
    } catch (error) {
        console.error(error);
        addChatMessage(error.message || '일정 수정 중 오류가 발생했습니다.', 'ai');
    }
}

async function deleteEvent(eventId) {
    if (!eventId) {
        return;
    }

    const shouldDelete = window.confirm('이 일정을 삭제할까요?');
    if (!shouldDelete) {
        return;
    }

    try {
        const response = await fetch(`/api/calendar/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            await showApiError(response, '일정 삭제 중 오류가 발생했습니다.');
            return;
        }

        document.querySelectorAll(`.schedule-card[data-id="${eventId}"]`).forEach((card) => {
            removeChatStateItem(card.dataset.chatId);
            card.remove();
        });
        addChatMessage('일정이 삭제되었습니다.', 'ai');
        showToast('구글 캘린더에서 일정이 삭제되었습니다.');
    } catch (error) {
        console.error(error);
        addChatMessage(error.message || '일정 삭제 중 오류가 발생했습니다.', 'ai');
    }
}

/* =========================
   이벤트 바인딩
========================= */

function bindUiEvents() {
    ui.enterButton.addEventListener('click', enterApp);

    // 채팅 영역
    bindAttachmentEvents();
    ui.quickMenuButton.addEventListener('click', toggleQuickMenu);
    ui.composerInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            requestScheduleAnalysis();
        }
    })

    ui.openGoogleCalendarButton.addEventListener('click', () => {
        closeQuickMenu();
        openCalendar();
    });
    ui.crawlLoginButton.addEventListener('click', openLoginModal);
    document.addEventListener('click', handleQuickMenuOutsideClick);
    ui.sendMessageButton.addEventListener('click', requestScheduleAnalysis);

    ui.crawlLoginCancelButton.addEventListener('click', closeLoginModal);

    ui.crawlLoginForm.addEventListener('submit', handleCrawlLoginSubmit);
}

setScheduleCardHandlers({
    confirmDraftSchedule,
    saveCardEdit,
    deleteEvent
});

document.addEventListener('DOMContentLoaded', () => {
    restoreEnterApp();
    restoreChatState(createEventCard);
    bindUiEvents();
    resumePendingAction();
});
