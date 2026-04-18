const ui = {
    landing: document.getElementById('appLanding'),
    enterButton: document.getElementById('appEnterButton'),
    chatFeed: document.getElementById('chatFeed'),
    toast: document.getElementById('appToast'),
    chatComposer: document.getElementById('chatComposer'),
    composerDropZone: document.getElementById('composerDropZone'),
    attachmentInput: document.getElementById('attachmentInput'),
    attachmentButton: document.getElementById('attachmentButton'),
    attachmentPreview: document.getElementById('attachmentPreview'),
    quickMenu: document.getElementById('quickMenu'),
    quickMenuButton: document.getElementById('quickMenuButton'),
    quickMenuPanel: document.getElementById('quickMenuPanel'),
    openGoogleCalendarButton: document.getElementById('openGoogleCalendarButton'),
    crawlLoginButton: document.getElementById('crawlLoginButton'),
    composerInput: document.getElementById('composerInput'),
    sendMessageButton: document.getElementById('sendMessageButton'),
    crawlLoginModal: document.getElementById('crawlLoginModal'),
    crawlLoginForm: document.getElementById('crawlLoginForm'),
    studentIdInput: document.getElementById('studentIdInput'),
    studentPasswordInput: document.getElementById('studentPasswordInput'),
    crawlLoginCancelButton: document.getElementById('crawlLoginCancelButton')
};

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/* =========================
   기본 UI 유틸
========================= */

function enterApp() {
    ui.landing.classList.add('app-splash--hidden');
    ui.quickMenu.hidden = false;
}

function scrollChatToBottom() {
    ui.chatFeed.scrollTop = ui.chatFeed.scrollHeight;
}

function addChatMessage(text, type) {
    const message = document.createElement('div');
    message.className = `chat-message chat-message--${type}`;
    message.textContent = text;
    ui.chatFeed.appendChild(message);
    scrollChatToBottom();
    return message;
}

function updateChatMessage(message, text) {
    if (!message) {
        return;
    }

    message.textContent = text;
    scrollChatToBottom();
}

function showLoadingMessage() {
    return addChatMessage('AI가 일정을 분석하고 있어요...', 'ai');
}

function showToast(text) {
    ui.toast.innerText = text;
    ui.toast.classList.add('app-toast--visible');
    setTimeout(() => ui.toast.classList.remove('app-toast--visible'), 2000);
}

// 서버에서 보낸 json을 읽음
async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        throw new Error('응답 본문이 비어 있습니다.');
    }

    return JSON.parse(text);
}

async function readErrorMessage(response, fallbackMessage) {
    try {
        const errorBody = await readJsonResponse(response);
        return errorBody.message || errorBody.detail || fallbackMessage;
    } catch (error) {
        return fallbackMessage;
    }
}

// 내 구글캘린더로 이동
function openCalendar() {
    window.open('https://calendar.google.com/', '_blank');
}

function redirectToGoogleLogin(message = null) {
    const text = '구글 로그인이 필요합니다. 잠시 후 로그인 페이지로 이동합니다.';

    if (message) {
        updateChatMessage(message, text);
    } else {
        addChatMessage(text, 'ai');
    }

    setTimeout(() => {
        window.location.href = '/oauth2/authorization/google';
    }, 1000);
}

function formatScheduleDateTime(scheduleDateTime) {
    if (!scheduleDateTime) {
        return '';
    }

    const date = scheduleDateTime.date || '';
    const time = scheduleDateTime.time ? String(scheduleDateTime.time).slice(0, 5) : '';
    return `${date} ${time}`.trim();
}

// 알림 데이터 포맷
function getReminderSummary(dto) {
    if (!dto.reminderEnabled) {
        return '알림 없음';
    }

    return `${dto.reminderMinutes ?? 30}분 전 알림`;
}

/* =========================
   첨부파일(이미지) 처리
   - 버튼 선택
   - 붙여넣기
   - 드래그 앤 드롭
   - 썸네일 프리뷰
========================= */

let selectedAttachment = null; // 선택한 첨부이미지
let attachmentPreviewUrl = null; // 프리뷰에 올릴 첨부이미지 url
let isAiRequesting = false; // AI 요청 중 중복 전송 방지

// 첨부이미지 올릴 시 생성되는 프리뷰
function renderAttachmentPreview(file) {
    ui.attachmentPreview.innerHTML = '';

    // 파일이 선택되지 않으면 숨기기
    if (!file) {
        ui.attachmentPreview.hidden = true;
        return;
    }

    attachmentPreviewUrl = URL.createObjectURL(file);

    // 프리뷰 아이템 영역
    const previewItem = document.createElement('div');
    previewItem.className = 'chat-composer__preview-item';

    // 썸네일
    const previewThumb = document.createElement('img');
    previewThumb.className = 'chat-composer__preview-thumb';
    previewThumb.src = attachmentPreviewUrl;
    previewThumb.alt = file.name;

    // 썸네일 위 파일 이름를 위한 오버레이 영역
    const previewOverlay = document.createElement('div');
    previewOverlay.className = 'chat-composer__preview-overlay';

    // 오버레이에 들어갈 이미지 이름
    const previewName = document.createElement('span');
    previewName.className = 'chat-composer__preview-name';
    previewName.textContent = file.name;

    // 삭제 버튼
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'chat-composer__preview-remove';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', '첨부이미지 제거');
    removeButton.addEventListener('click', clearAttachment);

    previewOverlay.appendChild(previewName);
    previewItem.appendChild(previewThumb);
    previewItem.appendChild(previewOverlay);
    previewItem.appendChild(removeButton);
    ui.attachmentPreview.appendChild(previewItem);
    ui.attachmentPreview.hidden = false;
}

function clearAttachment() {
    selectedAttachment = null;

    if (attachmentPreviewUrl) {
        // 프리뷰 url이 있다면 브라우저가 해당 파일을 메모리에 올린거기 때문에
        // reovke로 메모리에서 없애야 함
        URL.revokeObjectURL(attachmentPreviewUrl);
        attachmentPreviewUrl = null;
    }

    ui.attachmentInput.value = '';
    ui.attachmentPreview.innerHTML = '';
    ui.attachmentPreview.hidden = true;
}

function setSelectedAttachment(file) {
    if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        showToast('JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.');
        return;
    }

    clearAttachment();
    selectedAttachment = file;
    renderAttachmentPreview(file);
}

// 첨부파일 버튼을 통해 이미지가 선택되면
function handleAttachmentSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    setSelectedAttachment(file);
}

function handleComposerPaste(event) {
    const items = event.clipboardData?.items;
    if (!items) {
        return;
    }

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                event.preventDefault();
                setSelectedAttachment(file);
                break;
            }
        }
    }
}

function handleComposerDragOver(event) {
    // 브라우저의 기본 드랍 동작 막음
    event.preventDefault();
    ui.composerDropZone.classList.add('chat-composer__drop-zone--dragover');
}

function handleComposerDragLeave(event) {
    event.preventDefault();

    // relatedTarget은 드래그가 이동한 다음 대상
    // 영역 밖에 나간건지 확인
    if (!ui.composerDropZone.contains(event.relatedTarget)) {
        ui.composerDropZone.classList.remove('chat-composer__drop-zone--dragover');
    }
}

function handleComposerDrop(event) {
    event.preventDefault();
    // 파일을 놓았으니 드래그 강조 스타일을 제거
    ui.composerDropZone.classList.remove('chat-composer__drop-zone--dragover');

    // 드래그해서 놓은 파일 목록 중 첫 번째 파일 하나를 가져옴
    const file = event.dataTransfer?.files?.[0];
    if (!file || !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        showToast('JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다.');
        return;
    }

    setSelectedAttachment(file);
}

/* =========================
   퀵 메뉴
   - 추가 기능 열기/닫기
========================= */

function toggleQuickMenu() {
    const isOpening = ui.quickMenuPanel.hidden;
    ui.quickMenuPanel.hidden = !isOpening;
    ui.quickMenuButton.setAttribute('aria-expanded', String(isOpening));
}

function closeQuickMenu() {
    ui.quickMenuPanel.hidden = true;
    ui.quickMenuButton.setAttribute('aria-expanded', 'false');
}

function handleQuickMenuOutsideClick(event) {
    if (
        !ui.quickMenuPanel.hidden &&
        !ui.quickMenuPanel.contains(event.target) &&
        !ui.quickMenuButton.contains(event.target)
    ) {
        closeQuickMenu();
    }
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

function createEventCard(dto, options = {}) {
    const status = options.status ?? 'saved';
    const isDraft = status === 'draft';
    const heading = isDraft ? '일정 초안' : '일정 정보';
    const append = options.append ?? true;

    const card = document.createElement('div');
    card.className = 'schedule-card';
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
        scrollChatToBottom();
    }

    return card;
}

function populateCardFields(card, dto) {
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

function readCardSchedule(card) {
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

function validateScheduleRange(schedule) {
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
        confirmButton.onclick = () => confirmDraftSchedule(card);
    }

    if (editButton) {
        editButton.onclick = () => {
            card._snapshot = structuredClone(card._schedule);
            setCardEditing(card, true);
        };
    }

    if (saveButton) {
        saveButton.onclick = () => saveCardEdit(card);
    }

    if (cancelButton) {
        cancelButton.onclick = () => populateCardFields(card, card._snapshot);
    }

    if (discardButton) {
        discardButton.onclick = () => card.remove();
    }

    if (deleteButton) {
        deleteButton.onclick = () => deleteEvent(card._schedule.id);
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
function finalizeCardAsSaved(card, savedSchedule) {
    card.dataset.status = 'saved';
    card.querySelector('.schedule-card__title').textContent = '일정 정보';
    card.querySelector('.schedule-card__actions').innerHTML = createActionButtons('saved');
    populateCardFields(card, savedSchedule);
    bindScheduleCardActions(card);
}

/* =========================
   API 호출
   - AI 일정 초안 생성
   - 초안 확인 후 캘린더 등록
   - 저장 완료 일정 수정/삭제
   - 일정 조회
========================= */

function renderLookupSchedules(schedules, message = null) {
    const resultMessage = `조회된 일정 ${schedules.length}건입니다.`;

    if (message) {
        updateChatMessage(message, resultMessage);
    } else {
        addChatMessage(resultMessage, 'ai');
    }

    const lookupGroup = document.createElement('div');
    lookupGroup.className = 'lookup-results';

    const lookupItems = [];

    const setActiveLookupCard = (activeIndex) => {
        lookupItems.forEach(({ item, summaryButton, card }, index) => {
            const isActive = index === activeIndex;
            item.dataset.expanded = String(isActive);
            summaryButton.dataset.expanded = String(isActive);
            summaryButton.setAttribute('aria-expanded', String(isActive));
            summaryButton.querySelector('.lookup-results__arrow').textContent = isActive ? '▼' : '▶';
            card.hidden = !isActive;
        });
    };

    schedules.forEach((schedule, index) => {
        const lookupItem = document.createElement('div');
        lookupItem.className = 'lookup-results__entry';
        lookupItem.dataset.expanded = String(index === 0);

        const summaryButton = document.createElement('button');
        summaryButton.type = 'button';
        summaryButton.className = 'lookup-results__item';
        summaryButton.dataset.expanded = String(index === 0);
        summaryButton.setAttribute('aria-expanded', String(index === 0));
        summaryButton.innerHTML = `
            <span class="lookup-results__arrow">${index === 0 ? '▼' : '▶'}</span>
            <span class="lookup-results__text">${formatScheduleDateTime(schedule.start)} ${schedule.title ?? '일정'}</span>
        `;

        const card = createEventCard(schedule, { status: 'saved', append: false });
        card.hidden = index !== 0;

        summaryButton.addEventListener('click', () => setActiveLookupCard(index));

        lookupItems.push({ item: lookupItem, summaryButton, card });
        lookupItem.appendChild(summaryButton);
        lookupItem.appendChild(card);
        lookupGroup.appendChild(lookupItem);
    });

    ui.chatFeed.appendChild(lookupGroup);
    scrollChatToBottom();
}

async function callAiChat() {
    if (isAiRequesting) {
        return;
    }

    const prompt = ui.composerInput.value.trim();
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
        const response = await fetch('/api/ai/schedule', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (response.status === 401) {
            redirectToGoogleLogin(statusMessage);
            return;
        }

        if (!response.ok) {
            updateChatMessage(statusMessage, await readErrorMessage(response, '요청 처리 중 오류가 발생했습니다.'));
            return;
        }

        const schedules = await readJsonResponse(response);
        const isCreate = schedules[0]?.intent === 'create';

        if (isCreate) {
            updateChatMessage(statusMessage, '일정 초안이 생성되었습니다.\n확인 후 추가할 수 있습니다.');
            schedules.forEach((schedule) => {
                createEventCard(schedule, { status: 'draft' });
            });
        } else {
            renderLookupSchedules(schedules, statusMessage);
        }
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
            redirectToGoogleLogin();
            return;
        }

        if (!response.ok) {
            addChatMessage(await readErrorMessage(response, '일정 추가 중 오류가 발생했습니다.'), 'ai');
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
        const response = await fetch('/api/calendar/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextSchedule),
            credentials: 'include'
        });

        if (response.status === 401) {
            redirectToGoogleLogin();
            return;
        }

        if (!response.ok) {
            addChatMessage(await readErrorMessage(response, '일정 수정 중 오류가 발생했습니다.'), 'ai');
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
            redirectToGoogleLogin();
            return;
        }

        if (!response.ok) {
            addChatMessage(await readErrorMessage(response, '일정 삭제 중 오류가 발생했습니다.'), 'ai');
            return;
        }

        document.querySelectorAll(`.schedule-card[data-id="${eventId}"]`).forEach((card) => card.remove());
        addChatMessage('일정이 삭제되었습니다.', 'ai');
        showToast('구글 캘린더에서 일정이 삭제되었습니다.');
    } catch (error) {
        console.error(error);
        addChatMessage(error.message || '일정 삭제 중 오류가 발생했습니다.', 'ai');
    }
}

/* =========================
   과제 일정 가져오기 모달
========================= */

function openLoginModal() {
    closeQuickMenu();
    ui.crawlLoginModal.style.display = 'flex';
}

function closeLoginModal() {
    ui.crawlLoginModal.style.display = 'none';
}

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

async function handleCrawlLoginSubmit(event) {
    event.preventDefault();

    const id = ui.studentIdInput.value;
    const pw = ui.studentPasswordInput.value;

    closeLoginModal();
    const statusMessage = addChatMessage('학교 일정을 가져오고 있습니다...', 'ai');

    try {
        const response = await fetch('/api/crawl/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, pw }),
            credentials: 'include'
        });

        if (response.status === 401) {
            redirectToGoogleLogin();
            return;
        }

        if (!response.ok) {
            updateChatMessage(statusMessage, await readErrorMessage(response, '학교 일정 연동 중 오류가 발생했습니다.'));
            return;
        }

        // 실시간 메세지를 위한 sse 핸들러
        await consumeSseResponse(response, {
            status: message => updateChatMessage(statusMessage, message),
            complete: message => updateChatMessage(statusMessage, message),
            error: message => updateChatMessage(statusMessage, message)
        });

        ui.studentIdInput.value = '';
        ui.studentPasswordInput.value = '';
    } catch (error) {
        console.error(error);
        setStatusMessage(statusMessage, error.message);
    }
}


/* =========================
   이벤트 바인딩
========================= */

function bindUiEvents() {
    ui.enterButton.addEventListener('click', enterApp);

    ui.attachmentButton.addEventListener('click', () => ui.attachmentInput.click());
    ui.attachmentInput.addEventListener('change', handleAttachmentSelection);
    ui.composerInput.addEventListener('paste', handleComposerPaste);
    ui.composerDropZone.addEventListener('dragover', handleComposerDragOver);
    ui.composerDropZone.addEventListener('dragleave', handleComposerDragLeave);
    ui.composerDropZone.addEventListener('drop', handleComposerDrop);

    ui.quickMenuButton.addEventListener('click', toggleQuickMenu);
    ui.openGoogleCalendarButton.addEventListener('click', () => {
        closeQuickMenu();
        openCalendar();
    });
    ui.crawlLoginButton.addEventListener('click', openLoginModal);
    document.addEventListener('click', handleQuickMenuOutsideClick);

    ui.sendMessageButton.addEventListener('click', callAiChat);

    ui.crawlLoginCancelButton.addEventListener('click', closeLoginModal);
    ui.crawlLoginForm.addEventListener('submit', handleCrawlLoginSubmit);
}

document.addEventListener('DOMContentLoaded', bindUiEvents);
