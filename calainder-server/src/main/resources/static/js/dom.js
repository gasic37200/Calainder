export const ui = {
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

/* =========================
   기본 UI 유틸
========================= */

const ENTER_APP_STORAGE_KEY = 'enterApp';

export function enterApp() {
    sessionStorage.setItem(ENTER_APP_STORAGE_KEY, 'true');
    hideLanding();
}

export function restoreEnterApp() {
    if (sessionStorage.getItem(ENTER_APP_STORAGE_KEY) === 'true') {
        hideLanding();
    }
}

function hideLanding() {
    ui.landing.classList.add('app-splash--hidden');
    ui.quickMenu.hidden = false;
}

export function scrollChatToBottom() {
    ui.chatFeed.scrollTop = ui.chatFeed.scrollHeight;
}

export function showToast(text) {
    ui.toast.innerText = text;
    ui.toast.classList.add('app-toast--visible');
    setTimeout(() => ui.toast.classList.remove('app-toast--visible'), 2000);
}

// 내 구글캘린더로 이동
export function openCalendar() {
    window.open('https://calendar.google.com/', '_blank');
}

/* =========================
   퀵 메뉴
   - 추가 기능 열기/닫기
========================= */

export function toggleQuickMenu() {
    const isOpening = ui.quickMenuPanel.hidden;
    ui.quickMenuPanel.hidden = !isOpening;
    ui.quickMenuButton.setAttribute('aria-expanded', String(isOpening));
}

export function closeQuickMenu() {
    ui.quickMenuPanel.hidden = true;
    ui.quickMenuButton.setAttribute('aria-expanded', 'false');
}

export function handleQuickMenuOutsideClick(event) {
    if (
        !ui.quickMenuPanel.hidden &&
        !ui.quickMenuPanel.contains(event.target) &&
        !ui.quickMenuButton.contains(event.target)
    ) {
        closeQuickMenu();
    }
}

/* =========================
   과제 일정 가져오기 모달
========================= */

export function openLoginModal() {
    closeQuickMenu();
    ui.crawlLoginModal.style.display = 'flex';
}

export function closeLoginModal() {
    ui.crawlLoginModal.style.display = 'none';
}
