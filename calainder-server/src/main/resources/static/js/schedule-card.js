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
const WEEKDAYS = [
    ['MO', '월'],
    ['TU', '화'],
    ['WE', '수'],
    ['TH', '목'],
    ['FR', '금'],
    ['SA', '토'],
    ['SU', '일']
];

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

function parseRecurrence(recurrence) {
    const normalized = (recurrence ?? '').replace(/^RRULE:/, '');
    const values = Object.fromEntries(
        normalized
            .split(';')
            .filter(Boolean)
            .map(part => part.split('=', 2))
    );

    return {
        enabled: Boolean(normalized),
        frequency: values.FREQ ?? 'WEEKLY',
        weekdays: new Set((values.BYDAY ?? '').split(',').filter(Boolean)),
        monthDays: (values.BYMONTHDAY ?? '')
            .split(',')
            .map(value => Number(value))
            .filter(value => Number.isInteger(value) && value >= 1 && value <= 31)
    };
}

function getRecurrenceSummary(recurrence) {
    const rule = parseRecurrence(recurrence);
    if (!rule.enabled) {
        return '사용 안 함';
    }

    if (rule.frequency === 'DAILY') {
        return '매일';
    }

    if (rule.frequency === 'MONTHLY') {
        return rule.monthDays.length > 0 ? `매달 ${rule.monthDays.join(', ')}일` : '매달';
    }

    const labels = WEEKDAYS
        .filter(([value]) => rule.weekdays.has(value))
        .map(([, label]) => label);

    return labels.length > 0 ? `매주 ${labels.join(', ')}` : '매주';
}

function createRecurrenceField(dto) {
    const rule = parseRecurrence(dto.recurrence);
    const weekdayOptions = WEEKDAYS.map(([value, label]) => `
        <label class="schedule-card__weekday">
            <input data-edit="recurrence-weekday" type="checkbox" value="${value}" ${rule.weekdays.has(value) ? 'checked' : ''}>
            <span>${label}</span>
        </label>
    `).join('');

    return `
        <div class="schedule-card__field schedule-card__field--recurrence">
            <span class="schedule-card__label">반복</span>
            <span class="schedule-card__value" data-view="recurrence">${getRecurrenceSummary(dto.recurrence)}</span>
            <div class="schedule-card__recurrence-editor">
                <label class="schedule-card__toggle">
                    <input class="schedule-card__toggle-input" data-edit="recurrence-enabled" type="checkbox" ${rule.enabled ? 'checked' : ''}>
                    <span class="schedule-card__toggle-slider"></span>
                    <span class="schedule-card__toggle-text">반복 일정</span>
                </label>
                <div class="schedule-card__recurrence-options" data-role="recurrence-options" ${rule.enabled ? '' : 'hidden'}>
                    <label class="schedule-card__recurrence-row">
                        <span>반복 주기</span>
                        <select class="schedule-card__input schedule-card__input--recurrence" data-edit="recurrence-frequency">
                            <option value="DAILY">매일</option>
                            <option value="WEEKLY">매주</option>
                            <option value="MONTHLY">매달</option>
                        </select>
                    </label>
                    <div class="schedule-card__recurrence-row" data-role="weekly-options">
                        <span>반복 요일</span>
                        <div class="schedule-card__weekdays">${weekdayOptions}</div>
                    </div>
                    <label class="schedule-card__recurrence-row" data-role="monthly-options" hidden>
                        <span>반복 일자</span>
                        <input class="schedule-card__input schedule-card__input--month-day" data-edit="recurrence-month-day" type="text" inputmode="numeric" placeholder="예: 1, 15" value="${rule.monthDays.join(', ')}">
                    </label>
                </div>
            </div>
        </div>
    `;
}

function createUpdateScopeField(dto, chatId) {
    if (!dto.recurringEventId) {
        return '';
    }

    return `
        <div class="schedule-card__field schedule-card__field--update-scope">
            <span class="schedule-card__label">어떤 일정을 수정할까요?</span>
            <div class="schedule-card__scope-options">
                <label>
                    <input type="radio" name="update-scope-${chatId}" data-edit="update-scope" value="INSTANCE" checked>
                    <span>이 일정만</span>
                </label>
                <label>
                    <input type="radio" name="update-scope-${chatId}" data-edit="update-scope" value="SERIES">
                    <span>전체 반복 일정</span>
                </label>
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
            ${createRecurrenceField(dto)}
            ${createReminderField(dto)}
            ${createUpdateScopeField(dto, card.dataset.chatId)}
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
    card.querySelector('[data-view="recurrence"]').textContent = getRecurrenceSummary(dto.recurrence);
    card.querySelector('[data-view="reminder"]').textContent = getReminderSummary(dto);

    card.querySelector('[data-edit="title"]').value = dto.title ?? '';
    card.querySelector('[data-edit="description"]').value = dto.description ?? '';
    card.querySelector('[data-edit="location"]').value = dto.location ?? '';
    card.querySelector('[data-edit="start-date"]').value = dto.start?.date ?? '';
    card.querySelector('[data-edit="start-time"]').value = dto.start?.time ? String(dto.start.time).slice(0, 5) : '';
    card.querySelector('[data-edit="end-date"]').value = dto.end?.date ?? '';
    card.querySelector('[data-edit="end-time"]').value = dto.end?.time ? String(dto.end.time).slice(0, 5) : '';
    populateRecurrenceFields(card, dto);
    card.querySelector('[data-edit="reminder-enabled"]').checked = dto.reminderEnabled;
    card.querySelector('[data-edit="reminder-minutes"]').value = dto.reminderMinutes ?? 30;

    syncReminderEditor(card);
    syncRecurrenceEditor(card);
    syncRecurrenceUpdateScope(card);
    setCardEditing(card, false);

    if (!isRestoringChat()) {
        updateChatStateSchedule(card, dto);
    }
}

function populateRecurrenceFields(card, dto) {
    const rule = parseRecurrence(dto.recurrence);
    card.querySelector('[data-edit="recurrence-enabled"]').checked = rule.enabled;
    card.querySelector('[data-edit="recurrence-frequency"]').value = rule.frequency;
    card.querySelector('[data-edit="recurrence-month-day"]').value = rule.monthDays.join(', ');
    card.querySelectorAll('[data-edit="recurrence-weekday"]').forEach(input => {
        input.checked = rule.weekdays.has(input.value);
    });

    const scope = dto.updateScope ?? 'INSTANCE';
    const scopeInput = card.querySelector(`[data-edit="update-scope"][value="${scope}"]`);
    if (scopeInput) {
        scopeInput.checked = true;
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

function syncRecurrenceEditor(card) {
    const recurrenceToggle = card.querySelector('[data-edit="recurrence-enabled"]');
    const options = card.querySelector('[data-role="recurrence-options"]');
    const weeklyOptions = card.querySelector('[data-role="weekly-options"]');
    const monthlyOptions = card.querySelector('[data-role="monthly-options"]');
    const frequency = card.querySelector('[data-edit="recurrence-frequency"]').value;
    if (!recurrenceToggle || !options) {
        return;
    }

    options.hidden = !recurrenceToggle.checked;
    weeklyOptions.hidden = frequency !== 'WEEKLY';
    monthlyOptions.hidden = frequency !== 'MONTHLY';
    if (!recurrenceToggle.checked) {
        return;
    }

    const startDate = card.querySelector('[data-edit="start-date"]').value;
    if (frequency === 'DAILY') {
        return;
    }

    if (frequency === 'MONTHLY') {
        const monthDayInput = card.querySelector('[data-edit="recurrence-month-day"]');
        if (!monthDayInput.value) {
            monthDayInput.value = startDate ? String(new Date(`${startDate}T00:00:00`).getDate()) : '1';
        }
        return;
    }

    const weekdays = [...card.querySelectorAll('[data-edit="recurrence-weekday"]')];
    if (weekdays.some(input => input.checked)) {
        return;
    }

    const startDay = startDate ? new Date(`${startDate}T00:00:00`).getDay() : 1;
    const weekdayValue = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startDay];
    const defaultWeekday = weekdays.find(input => input.value === weekdayValue) ?? weekdays[0];
    if (defaultWeekday) {
        defaultWeekday.checked = true;
    }
}

function syncRecurrenceUpdateScope(card) {
    const updateScope = card.querySelector('[data-edit="update-scope"]:checked')?.value;
    const isSingleOccurrence = Boolean(card._schedule?.recurringEventId) && updateScope === 'INSTANCE';
    const editor = card.querySelector('.schedule-card__recurrence-editor');

    if (!editor) {
        return;
    }

    editor.classList.toggle('schedule-card__recurrence-editor--disabled', isSingleOccurrence);
    editor.querySelectorAll('input, select').forEach(input => {
        input.disabled = isSingleOccurrence;
    });
}

function readRecurrence(card) {
    if (!card.querySelector('[data-edit="recurrence-enabled"]').checked) {
        return null;
    }

    const frequency = card.querySelector('[data-edit="recurrence-frequency"]').value;
    if (frequency === 'DAILY') {
        return 'FREQ=DAILY';
    }

    if (frequency === 'MONTHLY') {
        const monthDays = [...new Set(
            card.querySelector('[data-edit="recurrence-month-day"]').value
                .split(',')
                .map(value => Number(value.trim()))
                .filter(value => Number.isInteger(value) && value >= 1 && value <= 31)
        )].sort((a, b) => a - b);
        const startDate = card.querySelector('[data-edit="start-date"]').value;
        const defaultMonthDay = startDate ? new Date(`${startDate}T00:00:00`).getDate() : 1;
        return `FREQ=MONTHLY;BYMONTHDAY=${monthDays.length > 0 ? monthDays.join(',') : defaultMonthDay}`;
    }

    const weekdays = [...card.querySelectorAll('[data-edit="recurrence-weekday"]:checked')]
        .map(input => input.value);

    return `FREQ=${frequency};BYDAY=${weekdays.join(',')}`;
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
    const updateScope = card.querySelector('[data-edit="update-scope"]:checked')?.value ?? null;
    const recurrence = card._schedule?.recurringEventId && updateScope === 'INSTANCE'
        ? null
        : readRecurrence(card);

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
        recurrence,
        updateScope,
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
    const recurrenceToggle = card.querySelector('[data-edit="recurrence-enabled"]');
    const recurrenceFrequency = card.querySelector('[data-edit="recurrence-frequency"]');
    const updateScopeInputs = card.querySelectorAll('[data-edit="update-scope"]');

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

    if (recurrenceToggle) {
        recurrenceToggle.onchange = (event) => {
            event.stopPropagation();
            syncRecurrenceEditor(card);
        };
    }

    if (recurrenceFrequency) {
        recurrenceFrequency.onchange = () => syncRecurrenceEditor(card);
    }

    updateScopeInputs.forEach(input => {
        input.onchange = () => syncRecurrenceUpdateScope(card);
    });
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
