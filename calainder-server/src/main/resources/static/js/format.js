export function formatScheduleDateTime(scheduleDateTime) {
    if (!scheduleDateTime) {
        return '';
    }

    const date = scheduleDateTime.date || '';
    const time = scheduleDateTime.time ? String(scheduleDateTime.time).slice(0, 5) : '';
    return `${date} ${time}`.trim();
}

// 알림 데이터 포맷
export function getReminderSummary(dto) {
    if (!dto.reminderEnabled) {
        return '알림 없음';
    }

    return `${dto.reminderMinutes ?? 30}분 전 알림`;
}
