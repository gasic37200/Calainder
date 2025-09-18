package com.example.demo.controller;

import com.example.demo.service.CalendarService;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
public class CalendarController {

    private final CalendarService calendarService;

    // 생성자를 통해 Spring이 자동 주입
    @Autowired
    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    /**
     * /calendar 요청 처리
     * Google Calendar에서 이벤트를 가져와 화면에 전달
     */
    @GetMapping("/calendar")
    public String getCalendar(Model model) {
        List<Map<String, String>> eventsList = new ArrayList<>();
        try {
            // Google Calendar 서비스 객체 가져오기
            var service = calendarService.getCalendarService();

            // 기본 캘린더 이벤트 조회
            var events = service.events().list("primary").execute().getItems();

            // FullCalendar에서 사용할 수 있는 이벤트 형식으로 변환
            for (Event event : events) {
                if (event.getStart() != null && event.getStart().getDateTime() != null) {
                    // 시간 기반 이벤트
                    eventsList.add(Map.of(
                            "id", event.getId(),
                            "title", event.getSummary(),
                            "start", event.getStart().getDateTime().toStringRfc3339()
                    ));
                } else if (event.getStart() != null && event.getStart().getDate() != null) {
                    // 하루짜리 일정
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

    @PostMapping("/addTestEvent")
    public String addTestEvent() throws Exception {
        // CalendarService에서 인증받은 Calendar 객체 가져오기
        var calendar = calendarService.getCalendarService();

        // 테스트 이벤트 생성
        Event event = new Event()
                .setSummary("테스트 과제 제출")
                .setDescription("테스트용 이벤트입니다.");

        // 하루짜리 일정: 오늘 날짜 기준
        String today = java.time.LocalDate.now().toString(); // "2025-09-18" 이런 형태
        EventDateTime start = new EventDateTime().setDate(new com.google.api.client.util.DateTime(today));
        EventDateTime end = new EventDateTime().setDate(new com.google.api.client.util.DateTime(today));
        event.setStart(start);
        event.setEnd(end);

        // primary 캘린더에 추가
        calendar.events().insert("primary", event).execute();

        return "redirect:/calendar"; // 다시 달력 화면으로
    }

    @PostMapping("/deleteEvent")
    @ResponseBody
    public ResponseEntity<String> deleteEvent(@RequestBody Map<String, String> payload) {
        try {
            String eventId = payload.get("eventId");
            calendarService.getCalendarService()
                    .events()
                    .delete("primary", eventId)
                    .execute();
            return ResponseEntity.ok("삭제 성공");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("삭제 실패");
        }
    }
}