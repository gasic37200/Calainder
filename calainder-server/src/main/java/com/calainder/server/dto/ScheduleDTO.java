package com.calainder.server.dto;

import com.calainder.server.util.ScheduleDateTime;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.EventReminder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Getter
@Setter
@ToString
public class ScheduleDTO {
    // Google Calendar event id. 초안 단계에서는 null일 수 있다.
    private String id;

    // 일정 기본 정보
    private String title;
    private String description;
    private String location;

    // 시작/종료 일시
    private ScheduleDateTime start;
    private ScheduleDateTime end;

    // RRULE 문자열. 반복 일정이 아니면 null
    private String recurrence;
    private String recurringEventId;
    private String updateScope;

    // 프런트에서 사용하는 단순한 알림 표현
    // 기본값 표시는 프런트에서 처리하고, 서버는 사실값만 가진다.
    private Boolean reminderEnabled;
    private Integer reminderMinutes;

    // AI 응답에서 생성/조회 의도를 구분할 때 사용
    private String intent;
    private boolean success;

    // Google Event 1개를 프런트에서 쓰는 DTO 형태로 변환한다.
    public ScheduleDTO toScheduleDTO(Event event) {
        this.setId(event.getId());
        this.setTitle(event.getSummary());
        this.setDescription(event.getDescription());
        this.setLocation(event.getLocation());
        this.setStart(convertEventDateTime(event.getStart()));
        this.setEnd(convertEventDateTime(event.getEnd()));
        this.setRecurringEventId(event.getRecurringEventId());

        if (event.getRecurrence() != null && !event.getRecurrence().isEmpty()) {
            this.setRecurrence(stripRrulePrefix(event.getRecurrence().get(0)));
        }

        toReminderFields(event);
        return this;
    }

    // 프런트 DTO를 Google Calendar Event 형식으로 다시 변환한다.
    public Event toGoogleEvent() {
        Event event = new Event();

        event.setId(this.getId());
        event.setSummary(this.getTitle());
        event.setDescription(this.getDescription());
        event.setLocation(this.getLocation());

        EventDateTime start = convertScheduleDateTime(this.getStart());
        if (start != null) {
            event.setStart(start);
        }

        EventDateTime end = convertScheduleDateTime(this.getEnd());
        if (end != null) {
            event.setEnd(end);
        }

        if (this.getRecurrence() != null && !this.getRecurrence().isBlank()) {
            event.setRecurrence(Collections.singletonList(addRrulePrefix(this.getRecurrence())));
        }

        event.setReminders(toEventReminders());
        return event;
    }

    // Google Calendar의 reminder 구조(useDefault / overrides)를
    // 프런트에서 쓰는 reminderEnabled / reminderMinutes로 단순화한다.
    private void toReminderFields(Event event) {
        Event.Reminders reminders = event.getReminders();

        if (reminders == null) {
            this.setReminderEnabled(false);
            this.setReminderMinutes(null);
            return;
        }

        if (Boolean.TRUE.equals(reminders.getUseDefault())) {
            this.setReminderEnabled(true);
            this.setReminderMinutes(null);
            return;
        }

        List<EventReminder> overrides = reminders.getOverrides();
        if (overrides == null || overrides.isEmpty()) {
            this.setReminderEnabled(false);
            this.setReminderMinutes(null);
            return;
        }

        EventReminder popupReminder = overrides.stream()
                .filter(override -> "popup".equalsIgnoreCase(override.getMethod()))
                .findFirst()
                .orElse(overrides.get(0));

        this.setReminderEnabled(true);
        this.setReminderMinutes(popupReminder.getMinutes());
    }

    // 프런트의 단순한 알림 표현을 Google Calendar reminders 형식으로 변환한다.
    // 알림이 켜져 있는데 분 값이 없으면 저장 시점에만 30분 기본값을 사용한다.
    private Event.Reminders toEventReminders() {
        if (!Boolean.TRUE.equals(this.getReminderEnabled())) {
            return new Event.Reminders()
                    .setUseDefault(false)
                    .setOverrides(Collections.emptyList());
        }

		EventReminder reminder = new EventReminder()
				.setMethod("popup")
				.setMinutes(this.getReminderMinutes());

        return new Event.Reminders()
                .setUseDefault(false)
                .setOverrides(Collections.singletonList(reminder));
    }

    // Google EventDateTime은 date 또는 dateTime 중 하나를 가진다.
    // 이를 ScheduleDateTime(date + time) 형태로 맞춘다.
    public ScheduleDateTime convertEventDateTime(EventDateTime edt) {
        if (edt == null) {
            return null;
        }

        ScheduleDateTime sdt = new ScheduleDateTime();
        if (edt.getDateTime() != null) {
            LocalDateTime ldt = LocalDateTime.parse(
                    edt.getDateTime().toStringRfc3339(),
                    DateTimeFormatter.ISO_OFFSET_DATE_TIME
            );
            sdt.setDate(ldt.toLocalDate());
            sdt.setTime(ldt.toLocalTime());
        } else if (edt.getDate() != null) {
            LocalDate ld = LocalDate.parse(edt.getDate().toString());
            sdt.setDate(ld);
            sdt.setTime(null);
        }
        return sdt;
    }

    // ScheduleDateTime을 Google EventDateTime으로 변환한다.
    // 시간이 있으면 dateTime, 없으면 all-day 일정으로 date만 설정한다.
    public EventDateTime convertScheduleDateTime(ScheduleDateTime sdt) {
        if (sdt == null || sdt.getDate() == null) {
            return null;
        }

        EventDateTime edt = new EventDateTime();
        if (sdt.getTime() != null) {
            LocalDateTime ldt = LocalDateTime.of(sdt.getDate(), sdt.getTime());
            DateTime googleDateTime = new DateTime(
                    ldt.atZone(ZoneId.of("Asia/Seoul"))
                            .toInstant()
                            .toEpochMilli()
            );
            edt.setDateTime(googleDateTime);
            edt.setTimeZone("Asia/Seoul");
        } else {
            DateTime date = new DateTime(sdt.getDate().toString());
            edt.setDate(date);
        }

        return edt;
    }

    private String addRrulePrefix(String recurrence) {
        return recurrence.startsWith("RRULE:") ? recurrence : "RRULE:" + recurrence;
    }

    private String stripRrulePrefix(String recurrence) {
        return recurrence.startsWith("RRULE:") ? recurrence.substring("RRULE:".length()) : recurrence;
    }
}
