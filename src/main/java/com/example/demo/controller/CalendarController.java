package com.example.demo.controller;

import com.example.demo.dto.EventRequest;
import com.example.demo.service.CalendarService;
import com.google.api.services.calendar.model.Event;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
public class CalendarController {

    private final CalendarService calendarService;

    @Autowired
    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping("/calendar")
    public String getCalendar(Model model,
                              @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) {

        List<Map<String, String>> eventsList = new ArrayList<>();
        try {
            var events = calendarService.getCalendarService(authorizedClient)
                    .events().list("primary").execute().getItems();

            for (Event event : events) {
                if (event.getStart() != null && event.getStart().getDateTime() != null) {
                    eventsList.add(Map.of(
                            "id", event.getId(),
                            "title", event.getSummary(),
                            "start", event.getStart().getDateTime().toStringRfc3339(),
                            "end", event.getEnd().getDateTime().toStringRfc3339()
                    ));
                } else if (event.getStart() != null && event.getStart().getDate() != null) {
                    eventsList.add(Map.of(
                            "id", event.getId(),
                            "title", event.getSummary(),
                            "start", event.getStart().getDate().toString()
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        model.addAttribute("events", eventsList);
        return "calendar";
    }

    @PostMapping("/addEvent")
    @ResponseBody
    public Map<String, String> addEvent(@RequestBody EventRequest req,
                                        @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {

        Event event = calendarService.createEvent(req, authorizedClient);

        return Map.of(
                "id", event.getId(),
                "title", event.getSummary(),
                "start", event.getStart().getDateTime().toStringRfc3339(),
                "end", event.getEnd().getDateTime().toStringRfc3339()
        );
    }


    @PostMapping("/updateEvent")
    @ResponseBody
    public Map<String, Object> updateEvent(@RequestBody EventRequest req,
                                           @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {

        Event event = calendarService.updateEvent(req, authorizedClient);

        Map<String, Object> result = new HashMap<>();
        result.put("id", event.getId());
        result.put("summary", event.getSummary());
        result.put("start", event.getStart().getDateTime() != null
                ? event.getStart().getDateTime().toStringRfc3339()
                : event.getStart().getDate().toString());
        result.put("end", event.getEnd().getDateTime() != null
                ? event.getEnd().getDateTime().toStringRfc3339()
                : event.getEnd().getDate().toString());
        return result;
    }

    @DeleteMapping("/deleteEvent/{id}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteEvent(@PathVariable("id") String id,
                                                           @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient) throws Exception {

        calendarService.deleteEvent(id, authorizedClient);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
