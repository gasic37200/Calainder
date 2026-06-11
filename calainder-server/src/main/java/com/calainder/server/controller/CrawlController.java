package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.CalendarService;
import com.calainder.server.service.ScheduleService;
import com.calainder.server.util.CryptUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequiredArgsConstructor
@Slf4j
public class CrawlController {
    private final ScheduleService scheduleService;
    private final CalendarService calendarService;
    private final ObjectMapper objectMapper;

    @Value("${aes.key}")
    private String aesKey;

    @PostMapping(
            value = {"/api/school-schedules/imports", "/api/crawl/schedule"},
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public SseEmitter importSchoolSchedules(
            @RequestBody Map<String, String> body,
            @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient
    ) {
        SseEmitter emitter = new SseEmitter(0L);

        CompletableFuture.runAsync(() -> {
            try {
                sendEvent(emitter, "status", "학교 일정 크롤링을 시작하겠습니다.");

                String cryptId = CryptUtil.encrypt(aesKey, body.get("id"));
                String cryptPw = CryptUtil.encrypt(aesKey, body.get("pw"));

                Map<String, Object> data = new HashMap<>();
                data.put("cryptId", cryptId);
                data.put("cryptPw", cryptPw);

                sendEvent(emitter, "status", "학교 사이트에 로그인 중입니다.(최대 10초)");
                AtomicBoolean crawlFinished = new AtomicBoolean(false);
                CompletableFuture.runAsync(() -> sendDelayedStatus(
                        emitter,
                        crawlFinished,
                        10_000,
                        "일정을 확인하고 있습니다."
                ));

                ScheduleDTO[] schedules = scheduleService.importSchoolSchedules(data);
                crawlFinished.set(true);

                sendEvent(
                        emitter,
                        "status",
                        String.format("학교 일정 %d건을 가져왔습니다.\nGoogle Calendar에 반영하고 있습니다.", schedules.length)
                );

                List<ScheduleDTO> savedSchedules = new ArrayList<>();
                for (int i = 0; i < schedules.length; i++) {
                    ScheduleDTO savedSchedule = calendarService.addEvent(schedules[i], authorizedClient);
                    savedSchedules.add(savedSchedule);
                    sendEvent(
                            emitter,
                            "status",
                            String.format("학교 일정 %d건 중 %d건을 반영했습니다.", schedules.length, i + 1)
                    );
                }

                sendEvent(emitter, "schedules", objectMapper.writeValueAsString(savedSchedules));
                sendEvent(emitter, "complete", "학교 일정을 가져와 캘린더에 반영했습니다.");
                emitter.complete();
            } catch (IllegalArgumentException e) {
                log.warn("Crawl request failed. message={}", e.getMessage(), e);
                sendError(emitter, e.getMessage());
            } catch (IllegalStateException e) {
                log.error("Crawl processing failed. message={}", e.getMessage(), e);
                sendError(emitter, e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected crawl error.", e);
                sendError(emitter, "학교 일정 연동 중 오류가 발생했습니다.");
            }
        });

        return emitter;
    }

    private void sendError(SseEmitter emitter, String message) {
        try {
            sendEvent(emitter, "error", message);
        } catch (Exception ignored) {
        } finally {
            emitter.complete();
        }
    }

    private void sendEvent(SseEmitter emitter, String eventName, String message) throws Exception {
        emitter.send(
                SseEmitter.event()
                        .name(eventName)
                        .data(message)
        );
    }

    private void sendDelayedStatus(SseEmitter emitter, AtomicBoolean finished, long delayMillis, String message) {
        try {
            Thread.sleep(delayMillis);
            if (!finished.get()) {
                sendEvent(emitter, "status", message);
            }
        } catch (Exception ignored) {
        }
    }
}
