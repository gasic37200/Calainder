import { scrollChatToBottom, ui } from './dom.js';
import { formatScheduleDateTime } from './format.js';
import { createEventCard } from './schedule-card.js';
import { addChatMessage, updateChatMessage } from './chat.js';

export function renderLookupSchedules(schedules, message = null) {
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
