import { closeLoginModal, ui } from './dom.js';
import { showApiError } from './api.js';
import { handleUnauthorized } from './auth.js';
import { addChatMessage, updateChatMessage } from './chat.js';
import { renderLookupSchedules } from './lookup.js';

async function consumeSseResponse(response, handlers = {}) {
    // 결과값 없으면 오류 메세지
    if (!response.body) {
        throw new Error('스트림 응답을 받을 수 없습니다.');
    }

    // 서버에서 보내온 텍스트를 조금씩 읽음
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        // 이벤트를 덩어리로 쪼갬
        let separatorIndex = buffer.indexOf('\n\n');
        // 이벤트가 없을때까지 무한반복
        while (separatorIndex !== -1) {
            const block = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);

            if (block) {
                const event = parseSseBlock(block);
                const handler = handlers[event.name] || handlers.message;
                if (handler) {
                    handler(event.data);
                }
            }

            separatorIndex = buffer.indexOf('\n\n');
        }
    }
}

// 이름과 메세지를 데이터 정규화
function parseSseBlock(block) {
    const event = { name: 'message', data: '' };

    for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
            event.name = line.slice(6).trim();
            continue;
        }

        if (line.startsWith('data:')) {
            event.data = line.slice(5).trim();
        }
    }

    return event;
}

// function setStatusMessage(messageElement, text) {
//     updateChatMessage(messageElement, text || '학교 일정 연동 중 오류가 발생했습니다.');
// }

export async function handleCrawlLoginSubmit(event) {
    event.preventDefault();

    const id = ui.studentIdInput.value;
    const pw = ui.studentPasswordInput.value;

    closeLoginModal();
    const statusMessage = addChatMessage('학교 일정을 가져오고 있습니다...', 'ai');

    try {
        const response = await fetch('/api/school-schedules/imports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, pw }),
            credentials: 'include'
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            await showApiError(response, '학교 일정 연동 중 오류가 발생했습니다.', statusMessage);
            return;
        }

        // 실시간 메세지를 위한 sse 핸들러
        await consumeSseResponse(response, {
            status: message => updateChatMessage(statusMessage, message),
            schedules: data => {
                const schedules = JSON.parse(data || '[]');
                renderLookupSchedules(schedules, statusMessage);
            },
            complete: message => updateChatMessage(statusMessage, message),
            error: message => updateChatMessage(statusMessage, message)
        });

        ui.studentIdInput.value = '';
        ui.studentPasswordInput.value = '';
    } catch (error) {
        console.error(error);
        updateChatMessage(statusMessage, error.message || '학교 일정 연동 중 오류가 발생했습니다.');
    }
}
