package com.calainder.server.service;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.handler.CalendarExceptionMapper;
import com.calainder.server.util.ScheduleDateTime;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarService {
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private final CalendarExceptionMapper calendarExceptionMapper;

    public Calendar getCalendarService(OAuth2AuthorizedClient authorizedClient) throws Exception {
        var httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        return new Calendar.Builder(httpTransport, JSON_FACTORY, request -> {
            request.getHeaders().setAuthorization("Bearer " + authorizedClient.getAccessToken().getTokenValue());
        })
                .setApplicationName("My Calendar App")
                .build();
    }

    public List<ScheduleDTO> lookupEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

        try {
            Event event = req.toGoogleEvent();
            Events events = service.events().list("primary")
                    .setTimeMin(event.getStart().getDateTime())
                    .setTimeMax(event.getEnd().getDateTime())
                    .setSingleEvents(true)
                    .setOrderBy("startTime")
                    .execute();

            if (events.getItems() == null || events.getItems().isEmpty()) {
                throw new IllegalArgumentException("조회된 일정이 없습니다.");
            }

            List<ScheduleDTO> result = new ArrayList<>();
            Map<String, String> recurringRules = new HashMap<>();
            for (Event e : events.getItems()) {
                ScheduleDTO schedule = new ScheduleDTO().toScheduleDTO(e);
                if (schedule.getRecurringEventId() != null && !schedule.getRecurringEventId().isBlank()) {
                    String recurrence = recurringRules.computeIfAbsent(
                            schedule.getRecurringEventId(),
                            recurringEventId -> getRecurringRule(service, recurringEventId)
                    );
                    schedule.setRecurrence(recurrence);
                }
                if (matchesLookupRecurrence(schedule, req.getRecurrence())) {
                    result.add(schedule);
                }
            }
            if (result.isEmpty()) {
                throw new IllegalArgumentException("조회된 일정이 없습니다.");
            }
            return result;
        } catch (GoogleJsonResponseException e) {
            throw calendarExceptionMapper.toException(e, "Google Calendar 일정 조회에 실패했습니다.");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Google Calendar 일정 조회에 실패했습니다.", e);
        }
    }

    private boolean matchesLookupRecurrence(ScheduleDTO schedule, String recurrence) {
        if (recurrence == null || recurrence.isBlank()) {
            return true;
        }

        LocalDate startDate = schedule.getStart() == null ? null : schedule.getStart().getDate();
        if (startDate == null) {
            return false;
        }

        Map<String, String> rules = new HashMap<>();
        for (String rule : recurrence.replaceFirst("^RRULE:", "").split(";")) {
            String[] entry = rule.split("=", 2);
            if (entry.length == 2) {
                rules.put(entry[0], entry[1]);
            }
        }

        return switch (rules.getOrDefault("FREQ", "")) {
            case "DAILY" -> true;
            case "WEEKLY" -> List.of(rules.getOrDefault("BYDAY", "").split(","))
                    .contains(toRruleWeekday(startDate));
            case "MONTHLY" -> List.of(rules.getOrDefault("BYMONTHDAY", "").split(","))
                    .contains(String.valueOf(startDate.getDayOfMonth()));
            default -> true;
        };
    }

    private String toRruleWeekday(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "MO";
            case TUESDAY -> "TU";
            case WEDNESDAY -> "WE";
            case THURSDAY -> "TH";
            case FRIDAY -> "FR";
            case SATURDAY -> "SA";
            case SUNDAY -> "SU";
        };
    }

    public ScheduleDTO addEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

        try {
            Event event = req.toGoogleEvent();
            if (event.getId() != null && !event.getId().isBlank()) {
                try {
                    service.events().get("primary", event.getId()).execute();
                    Event updatedEvent = service.events().update("primary", event.getId(), event).execute();
                    return new ScheduleDTO().toScheduleDTO(updatedEvent);
                } catch (GoogleJsonResponseException e) {
                    if (e.getStatusCode() != 404) {
                        throw e;
                    }
                }
            }

            Event createdEvent = service.events().insert("primary", event).execute();
            return new ScheduleDTO().toScheduleDTO(createdEvent);
        } catch (GoogleJsonResponseException e) {
            throw calendarExceptionMapper.toException(e, "Google Calendar 일정 등록에 실패했습니다.");
        } catch (Exception e) {
            throw new IllegalStateException("Google Calendar 일정 등록에 실패했습니다.", e);
        }
    }

    public ScheduleDTO updateEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

        try {
            Event event = req.toGoogleEvent();
            Event updatedEvent;
            if ("SERIES".equalsIgnoreCase(req.getUpdateScope())
                    && req.getRecurringEventId() != null
                    && !req.getRecurringEventId().isBlank()) {
                Event recurringEvent = service.events().get("primary", req.getRecurringEventId()).execute();
                applySeriesChanges(recurringEvent, req);
                updatedEvent = service.events().update("primary", recurringEvent.getId(), recurringEvent).execute();
            } else {
                if (req.getRecurringEventId() != null && !req.getRecurringEventId().isBlank()) {
                    event.setRecurrence(null);
                }
                updatedEvent = service.events().update("primary", event.getId(), event).execute();
            }
            ScheduleDTO updatedSchedule = new ScheduleDTO().toScheduleDTO(updatedEvent);
            if (updatedSchedule.getRecurringEventId() != null && !updatedSchedule.getRecurringEventId().isBlank()) {
                updatedSchedule.setRecurrence(getRecurringRule(service, updatedSchedule.getRecurringEventId()));
            }
            return updatedSchedule;
        } catch (GoogleJsonResponseException e) {
            throw calendarExceptionMapper.toException(e, "Google Calendar 일정 수정에 실패했습니다.");
        } catch (Exception e) {
            throw new IllegalStateException("Google Calendar 일정 수정에 실패했습니다.", e);
        }
    }

    public void deleteEvent(String eventId, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

        try {
            service.events().delete("primary", eventId).execute();
        } catch (GoogleJsonResponseException e) {
            throw calendarExceptionMapper.toException(e, "Google Calendar 일정 삭제에 실패했습니다.");
        } catch (Exception e) {
            throw new IllegalStateException("Google Calendar 일정 삭제에 실패했습니다.", e);
        }
    }

    private String getRecurringRule(Calendar service, String recurringEventId) {
        try {
            Event recurringEvent = service.events().get("primary", recurringEventId).execute();
            return new ScheduleDTO().toScheduleDTO(recurringEvent).getRecurrence();
        } catch (Exception e) {
            throw new IllegalStateException("Google Calendar 반복 일정 조회에 실패했습니다.", e);
        }
    }

    private void applySeriesChanges(Event recurringEvent, ScheduleDTO req) {
        Event requestedEvent = req.toGoogleEvent();
        recurringEvent.setSummary(requestedEvent.getSummary());
        recurringEvent.setDescription(requestedEvent.getDescription());
        recurringEvent.setLocation(requestedEvent.getLocation());
        recurringEvent.setRecurrence(requestedEvent.getRecurrence());
        recurringEvent.setReminders(requestedEvent.getReminders());
        applySeriesDateTimeChanges(recurringEvent, req);
    }

    private void applySeriesDateTimeChanges(Event recurringEvent, ScheduleDTO req) {
        if (req.getStart() == null || req.getEnd() == null) {
            return;
        }

        ScheduleDTO converter = new ScheduleDTO();
        ScheduleDateTime originalStart = converter.convertEventDateTime(recurringEvent.getStart());
        if (originalStart == null || originalStart.getDate() == null) {
            return;
        }

        ScheduleDateTime nextStart = new ScheduleDateTime();
        ScheduleDateTime nextEnd = new ScheduleDateTime();
        nextStart.setDate(originalStart.getDate());
        nextStart.setTime(req.getStart().getTime());

        if (req.getStart().getTime() != null && req.getEnd().getTime() != null) {
            LocalDateTime requestedStart = LocalDateTime.of(req.getStart().getDate(), req.getStart().getTime());
            LocalDateTime requestedEnd = LocalDateTime.of(req.getEnd().getDate(), req.getEnd().getTime());
            LocalDateTime seriesStart = LocalDateTime.of(nextStart.getDate(), nextStart.getTime());
            LocalDateTime seriesEnd = seriesStart.plus(Duration.between(requestedStart, requestedEnd));
            nextEnd.setDate(seriesEnd.toLocalDate());
            nextEnd.setTime(seriesEnd.toLocalTime());
        } else {
            long days = ChronoUnit.DAYS.between(req.getStart().getDate(), req.getEnd().getDate());
            nextEnd.setDate(nextStart.getDate().plusDays(Math.max(days, 1)));
            nextEnd.setTime(null);
        }

        recurringEvent.setStart(converter.convertScheduleDateTime(nextStart));
        recurringEvent.setEnd(converter.convertScheduleDateTime(nextEnd));
    }
}
