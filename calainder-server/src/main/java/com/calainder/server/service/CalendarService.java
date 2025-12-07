package com.calainder.server.service;

import com.calainder.server.dto.ScheduleDTO;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private final OAuth2AuthorizedClientService authorizedClientService;

    // Google Calendar API 클라이언트 생성
    public Calendar getCalendarService(OAuth2AuthorizedClient authorizedClient) throws Exception {
        var httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        return new Calendar.Builder(httpTransport, JSON_FACTORY, request -> {
            request.getHeaders().setAuthorization("Bearer " + authorizedClient.getAccessToken().getTokenValue());
        })
                .setApplicationName("My Calendar App")
                .build();
    }

    // 일정 생성
    public boolean addEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
        Calendar service = getCalendarService(authorizedClient);

		try {
			Event event = req.toGoogleEvent();
			service.events().insert("primary", event).execute();
			System.out.println("성공");
			return true;
		} catch (Exception e) {
			System.out.println(e.getMessage());
			return false;
		}
//        Event event = new Event().setSummary(req.getTitle());
//        event.setStart(new EventDateTime().setDateTime(new DateTime(zStart.toInstant().toEpochMilli())).setTimeZone("Asia/Seoul"));
//        event.setEnd(new EventDateTime().setDateTime(new DateTime(zEnd.toInstant().toEpochMilli())).setTimeZone("Asia/Seoul"));
    }
//
//    // 일정 수정
    public Event updateEvent(ScheduleDTO req, OAuth2AuthorizedClient authorizedClient) throws Exception {
//        Calendar service = getCalendarService(authorizedClient);
//        Event existing = service.events().get("primary", req.getId()).execute();
//
//        existing.setSummary(req.getTitle());
//        LocalDateTime start = LocalDateTime.parse(req.getStartDate() + "T" + req.getStartTime());
//        LocalDateTime end = LocalDateTime.parse(req.getEndDate() + "T" + req.getEndTime());
//
//        ZonedDateTime zStart = start.atZone(ZoneId.of("Asia/Seoul"));
//        ZonedDateTime zEnd = end.atZone(ZoneId.of("Asia/Seoul"));
//
//        existing.setStart(new EventDateTime().setDateTime(new DateTime(zStart.toInstant().toEpochMilli())).setTimeZone("Asia/Seoul"));
//        existing.setEnd(new EventDateTime().setDateTime(new DateTime(zEnd.toInstant().toEpochMilli())).setTimeZone("Asia/Seoul"));
//
//        return service.events().update("primary", existing.getId(), existing).execute();
		return Event.class.newInstance();
    }
//
//    // 일정 삭제
    public void deleteEvent(String eventId, OAuth2AuthorizedClient authorizedClient) throws Exception {
//        Calendar service = getCalendarService(authorizedClient);
//        service.events().delete("primary", eventId).execute();
    }
}
