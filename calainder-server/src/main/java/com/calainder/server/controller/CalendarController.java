package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RequiredArgsConstructor
@RestController
public class CalendarController {

    private final CalendarService calendarService;

    @PostMapping("/api/calendar/events")
    public ScheduleDTO addEvent(@RequestBody ScheduleDTO req,
                                        @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {
		return calendarService.addEvent(req, authorizedClient);
    }

    @PatchMapping("/api/calendar/events")
	public ScheduleDTO updateEvent(@RequestBody ScheduleDTO req,
							   @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {
		return calendarService.updateEvent(req, authorizedClient);
	}

    @DeleteMapping("/api/calendar/events/{id}")
    public ResponseEntity<Map<String, Object>> deleteEvent(@PathVariable("id") String id,
                                                           @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {
        calendarService.deleteEvent(id, authorizedClient);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
