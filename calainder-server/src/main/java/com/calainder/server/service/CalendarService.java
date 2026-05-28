package com.calainder.server.service;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.handler.CalendarExceptionMapper;
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
import java.util.List;

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
            for (Event e : events.getItems()) {
                result.add(new ScheduleDTO().toScheduleDTO(e));
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

    public ScheduleDTO addEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

        try {
            Event event = req.toGoogleEvent();
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
            Event updatedEvent = service.events().update("primary", event.getId(), event).execute();
            return new ScheduleDTO().toScheduleDTO(updatedEvent);
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
}
