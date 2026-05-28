import { showToast, ui } from './dom.js';
import { SUPPORTED_IMAGE_TYPES } from './state.js';

/* =========================
   첨부파일(이미지) 처리
   - 버튼 선택
   - 붙여넣기
   - 드래그 앤 드롭
   - 썸네일 프리뷰
========================= */

let selectedAttachment = null; // 선택한 첨부이미지
let attachmentPreviewUrl = null; // 프리뷰에 올릴 첨부이미지 url

export function getSelectedAttachment() {
    return selectedAttachment;
}

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

export function clearAttachment() {
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

export function bindAttachmentEvents() {
    ui.attachmentButton.addEventListener('click', () => ui.attachmentInput.click());
    ui.attachmentInput.addEventListener('change', handleAttachmentSelection);
    ui.composerInput.addEventListener('paste', handleComposerPaste);
    ui.composerDropZone.addEventListener('dragover', handleComposerDragOver);
    ui.composerDropZone.addEventListener('dragleave', handleComposerDragLeave);
    ui.composerDropZone.addEventListener('drop', handleComposerDrop);
}
