import { openCalendar, scrollChatToBottom, showToast, ui } from './dom.js';
import { formatScheduleDateTime, getReminderSummary } from './format.js';
import {
    addChatStateSchedule,
    createChatItemId,
    isRestoringChat,
    removeChatStateItem,
    updateChatStateSchedule
} from './state.js';

let handlers = {};

export function setScheduleCardHandlers(nextHandlers) {
    handlers = nextHandlers;
}

/* =========================
   일정 카드 렌더링
   - 초안 카드 / 저장 완료 카드 공용
   - 인라인 수정 UI 생성
========================= */

function createTextField(label, key, value) {
    return `
        <div class="schedule-card__field">
            <span class="schedule-card__label">${label}</span>
            <span class="schedule-card__value" data-view="${key}">${value ?? ''}</span>
            <input class="schedule-card__input" data-edit="${key}" type="text" value="${value ?? ''}">
        </div>
    `;
}

function createDateTimeField(label, key, value) {
    return `
        <div class="schedule-card__field schedule-card__field--datetime">
            <span class="schedule-card__label">${label}</span>
            <span class="schedule-card__value" data-view="${key}">${formatScheduleDateTime(value)}</span>
            <div class="schedule-card__datetime-editor">
                <input class="schedule-card__input schedule-card__input--date" data-edit="${key}-date" type="date" value="${value?.date ?? ''}">
                <input class="schedule-card__input schedule-card__input--time" data-edit="${key}-time" type="time" value="${value?.time ? String(value.time).slice(0, 5) : ''}">
            </div>
        </div>
    `;
}

function createReminderField(dto) {
    const checked = dto.reminderEnabled ? 'checked' : '';
    const minutesValue = dto.reminderMinutes ?? 30;
    const hiddenAttr = dto.reminderEnabled ? '' : 'hidden';

    return `
        <div class="schedule-card__field schedule-card__field--reminder">
            <span class="schedule-card__label">알림</span>
            <span class="schedule-card__value" data-view="reminder">${getReminderSummary(dto)}</span>
            <div class="schedule-card__reminder-editor">
                <label class="schedule-card__toggle">
                    <input class="schedule-card__toggle-input" data-edit="reminder-enabled" type="checkbox" ${checked}>
                    <span class="schedule-card__toggle-slider"></span>
                    <span class="schedule-card__toggle-text">알림 사용</span>
                </label>
                <div class="schedule-card__minutes" data-role="reminder-minutes" ${hiddenAttr}>
                    <input class="schedule-card__input schedule-card__input--minutes" data-edit="reminder-minutes" type="number" min="1" step="1" value="${minutesValue}">
                    <span class="schedule-card__minutes-label">분 전</span>
                </div>
            </div>
        </div>
    `;
}

function createActionButtons(status) {
    if (status === 'draft') {
        return `
            <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="confirm-schedule">등록</button>
            <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="edit-schedule">수정</button>
            <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="save-schedule" hidden>저장</button>
            <button type="button" class="schedule-card__button schedule-card__button--neutral" data-role="cancel-edit" hidden>취소</button>
            <button type="button" class="schedule-card__button schedule-card__button--danger" data-role="discard-schedule">삭제</button>
        `;
    }

    return `
        <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="open-calendar">캘린더에서 보기</button>
        <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="edit-schedule">수정</button>
        <button type="button" class="schedule-card__button schedule-card__button--primary" data-role="save-schedule" hidden>저장</button>
        <button type="button" class="schedule-card__button schedule-card__button--neutral" data-role="cancel-edit" hidden>취소</button>
        <button type="button" class="schedule-card__button schedule-card__button--danger" data-role="delete-schedule">삭제</button>
    `;
}

export function createEventCard(dto, options = {}) {
    const status = options.status ?? 'saved';
    const isDraft = status === 'draft';
    const heading = isDraft ? '일정 초안' : '일정 정보';
    const append = options.append ?? true;

    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.dataset.chatId = options.id ?? createChatItemId();
    card.dataset.status = status;
    card.dataset.id = dto.id ?? '';
    card.innerHTML = `
        <h3 class="schedule-card__title">${heading}</h3>
        <div class="schedule-card__body">
            ${createTextField('제목', 'title', dto.title)}
            ${createTextField('설명', 'description', dto.description)}
            ${createTextField('장소', 'location', dto.location)}
            ${createDateTimeField('시작', 'start', dto.start)}
            ${createDateTimeField('종료', 'end', dto.end)}
            ${createReminderField(dto)}
        </div>
        <div class="schedule-card__actions">
            ${createActionButtons(status)}
        </div>
    `;

    populateCardFields(card, dto);
    bindScheduleCardActions(card);

    if (append) {
        ui.chatFeed.appendChild(card);

        if (!isRestoringChat() && options.persist !== false) {
            addChatStateSchedule(card, dto, status);
        }

        scrollChatToBottom();
    }

    return card;
}

export function populateCardFields(card, dto) {
    card._schedule = structuredClone(dto);
    card._snapshot = structuredClone(dto);
    card.dataset.id = dto.id ?? '';

    card.querySelector('[data-view="title"]').textContent = dto.title ?? '';
    card.querySelector('[data-view="description"]').textContent = dto.description ?? '';
    card.querySelector('[data-view="location"]').textContent = dto.location ?? '';
    card.querySelector('[data-view="start"]').textContent = formatScheduleDateTime(dto.start);
    card.querySelector('[data-view="end"]').textContent = formatScheduleDateTime(dto.end);
    card.querySelector('[data-view="reminder"]').textContent = getReminderSummary(dto);

    card.querySelector('[data-edit="title"]').value = dto.title ?? '';
    card.querySelector('[data-edit="description"]').value = dto.description ?? '';
    card.querySelector('[data-edit="location"]').value = dto.location ?? '';
    card.querySelector('[data-edit="start-date"]').value = dto.start?.date ?? '';
    card.querySelector('[data-edit="start-time"]').value = dto.start?.time ? String(dto.start.time).slice(0, 5) : '';
    card.querySelector('[data-edit="end-date"]').value = dto.end?.date ?? '';
    card.querySelector('[data-edit="end-time"]').value = dto.end?.time ? String(dto.end.time).slice(0, 5) : '';
    card.querySelector('[data-edit="reminder-enabled"]').checked = dto.reminderEnabled;
    card.querySelector('[data-edit="reminder-minutes"]').value = dto.reminderMinutes ?? 30;

    syncReminderEditor(card);
    setCardEditing(card, false);

    if (!isRestoringChat()) {
        updateChatStateSchedule(card, dto);
    }
}

function setCardEditing(card, isEditing) {
    card.classList.toggle('schedule-card--editing', isEditing);

    const isDraft = card.dataset.status === 'draft';
    const editButton = card.querySelector('[data-role="edit-schedule"]');
    const saveButton = card.querySelector('[data-role="save-schedule"]');
    const cancelButton = card.querySelector('[data-role="cancel-edit"]');
    const confirmButton = card.querySelector('[data-role="confirm-schedule"]');
    const discardButton = card.querySelector('[data-role="discard-schedule"]');
    const calendarButton = card.querySelector('[data-role="open-calendar"]');
    const deleteButton = card.querySelector('[data-role="delete-schedule"]');

    if (editButton) editButton.hidden = isEditing;
    if (saveButton) saveButton.hidden = !isEditing;
    if (cancelButton) cancelButton.hidden = !isEditing;
    if (confirmButton) confirmButton.hidden = isEditing || !isDraft;
    if (discardButton) discardButton.hidden = isEditing || !isDraft;
    if (calendarButton) calendarButton.hidden = isEditing || isDraft;
    if (deleteButton) deleteButton.hidden = isEditing;
}

function syncReminderEditor(card) {
    const reminderToggle = card.querySelector('[data-edit="reminder-enabled"]');
    const minutesBox = card.querySelector('[data-role="reminder-minutes"]');
    const minutesInput = card.querySelector('[data-edit="reminder-minutes"]');

    // 토글 버튼이나 분 박스가 없으면 리턴
    if (!reminderToggle || !minutesBox) {
        return;
    }

    minutesBox.hidden = !reminderToggle.checked;

    if (reminderToggle.checked && minutesInput && !minutesInput.value.trim()) {
        minutesInput.value = '30';
    }
}

function normalizeReminderMinutes(card) {
    const minutesInput = card.querySelector('[data-edit="reminder-minutes"]');
    if (!minutesInput) {
        return 30;
    }

    const rawValue = minutesInput.value.trim();
    const parsed = Number(rawValue);
    const normalized = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 30;
    minutesInput.value = String(normalized);
    return normalized;
}

export function readCardSchedule(card) {
    const reminderEnabled = card.querySelector('[data-edit="reminder-enabled"]').checked;
    const reminderMinutes = reminderEnabled ? normalizeReminderMinutes(card) : null;

    return {
        // 카드 값 복사
        ...card._schedule,
        title: card.querySelector('[data-edit="title"]').value.trim(),
        description: card.querySelector('[data-edit="description"]').value.trim(),
        location: card.querySelector('[data-edit="location"]').value.trim(),
        start: {
            date: card.querySelector('[data-edit="start-date"]').value,
            time: card.querySelector('[data-edit="start-time"]').value || null
        },
        end: {
            date: card.querySelector('[data-edit="end-date"]').value,
            time: card.querySelector('[data-edit="end-time"]').value || null
        },
        reminderEnabled,
        reminderMinutes
    };
}

export function validateScheduleRange(schedule) {
    const startDate = schedule.start?.date;
    const endDate = schedule.end?.date;
    const startTime = schedule.start?.time;
    const endTime = schedule.end?.time;

    if (!startDate || !endDate) {
        showToast('시작일과 종료일을 입력해주세요.');
        return false;
    }

    if ((startTime && !endTime) || (!startTime && endTime)) {
        showToast('시작 시간과 종료 시간을 모두 입력해주세요.');
        return false;
    }

    if (!startTime && !endTime) {
        return true;
    }

    const startAt = new Date(`${startDate}T${startTime}`);
    const endAt = new Date(`${endDate}T${endTime}`);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        showToast('일정 시간을 다시 확인해주세요.');
        return false;
    }

    if (endAt <= startAt) {
        showToast('종료 시간은 시작 시간보다 늦어야 합니다.');
        return false;
    }

    return true;
}

/* =========================
   카드 액션 바인딩
   - 초안 확인
   - 인라인 수정
   - 저장 완료 후 수정/삭제
========================= */

function bindScheduleCardActions(card) {
    const confirmButton = card.querySelector('[data-role="confirm-schedule"]');
    const editButton = card.querySelector('[data-role="edit-schedule"]');
    const saveButton = card.querySelector('[data-role="save-schedule"]');
    const cancelButton = card.querySelector('[data-role="cancel-edit"]');
    const discardButton = card.querySelector('[data-role="discard-schedule"]');
    const deleteButton = card.querySelector('[data-role="delete-schedule"]');
    const calendarButton = card.querySelector('[data-role="open-calendar"]');
    const reminderToggle = card.querySelector('[data-edit="reminder-enabled"]');
    const reminderMinutesInput = card.querySelector('[data-edit="reminder-minutes"]');

    // if는 버튼이 null일 수 있어 넣음.
    if (confirmButton) {
        confirmButton.onclick = () => handlers.confirmDraftSchedule(card);
    }

    if (editButton) {
        editButton.onclick = () => {
            card._snapshot = structuredClone(card._schedule);
            setCardEditing(card, true);
        };
    }

    if (saveButton) {
        saveButton.onclick = () => handlers.saveCardEdit(card);
    }

    if (cancelButton) {
        cancelButton.onclick = () => populateCardFields(card, card._snapshot);
    }

    if (discardButton) {
        discardButton.onclick = () => {
            removeChatStateItem(card.dataset.chatId);
            card.remove();
        };
    }

    if (deleteButton) {
        deleteButton.onclick = () => handlers.deleteEvent(card._schedule.id);
    }

    if (calendarButton) {
        calendarButton.onclick = openCalendar;
    }

    if (reminderToggle) {
        reminderToggle.onchange = (event) => {
            event.stopPropagation();
            syncReminderEditor(card);
        };
    }

    if (reminderMinutesInput) {
        reminderMinutesInput.onblur = () => normalizeReminderMinutes(card);
        reminderMinutesInput.oninput = () => {
            reminderMinutesInput.value = reminderMinutesInput.value.replace(/[^\d]/g, '');
        };
    }
}

// 초안 생성 후 저장버튼 누를 시 캘린더에 저장
export function finalizeCardAsSaved(card, savedSchedule) {
    card.dataset.status = 'saved';
    card.querySelector('.schedule-card__title').textContent = '일정 정보';
    card.querySelector('.schedule-card__actions').innerHTML = createActionButtons('saved');
    populateCardFields(card, savedSchedule);
    bindScheduleCardActions(card);
    updateChatStateSchedule(card, savedSchedule, 'saved');
}
