package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.CalendarService;
import com.calainder.server.service.FastApiService;
import com.calainder.server.util.CryptUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.cdimascio.dotenv.Dotenv;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
public class CrawlController {
    private final FastApiService fastApiService;
    private final CalendarService calendarService;

    Dotenv dotenv = Dotenv.load();

    @PostMapping(value = "/api/crawl/schedule", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter crawlSchedule(
            @RequestBody Map<String, String> body,
            @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient
    ) {
		// 실시간 진행 메세지를 위한 sse(Server Sent Event)
		SseEmitter emitter = new SseEmitter(0L);

        CompletableFuture.runAsync(() -> {
            try {
                sendEvent(emitter, "status", "학교 일정 크롤링을 시작하겠습니다.");

                String cryptId = CryptUtil.encrypt(dotenv.get("AES_KEY"), body.get("id"));
                String cryptPw = CryptUtil.encrypt(dotenv.get("AES_KEY"), body.get("pw"));

                Map<String, Object> data = new HashMap<>();
                data.put("cryptId", cryptId);
                data.put("cryptPw", cryptPw);

                sendEvent(emitter, "status", "학교 사이트에 로그인하고 있습니다.");
                ScheduleDTO[] schedules = fastApiService.callFastApi(data);

                sendEvent(
                        emitter,
                        "status",
                        String.format("학교 일정 %d건을 가져왔습니다.\n구글 캘린더에 반영하고 있습니다.", schedules.length)
                );

                for (int i = 0; i < schedules.length; i++) {
                    calendarService.addEvent(schedules[i], authorizedClient);
                    sendEvent(
                            emitter,
                            "status",
                            String.format("학교 일정 %d건 중 %d건을 반영했습니다.", schedules.length, i + 1)
                    );
                }

                sendEvent(emitter, "complete", "학교 일정을 가져와 캘린더에 반영했습니다.");
                emitter.complete();
			} catch (HttpStatusCodeException e) {
				try {
					sendEvent(emitter, "error", extractDetailMessage(e));
				} catch (Exception ignored) {
				}
				emitter.complete();
			} catch (Exception e) {
				try {
					sendEvent(emitter, "error", "학교 일정 연동 중 오류가 발생했습니다.");
				} catch (Exception ignored) {
				}
				emitter.complete();
			}
        });

        return emitter;
    }

	private String extractDetailMessage(HttpStatusCodeException exception) {
		String body = exception.getResponseBodyAsString();

		if (body == null || body.isBlank()) {
			return "학교 일정 연동 중 오류가 발생했습니다.";
		}

		try {
			ObjectMapper objectMapper = new ObjectMapper();
			Map<String, Object> errorMap = objectMapper.readValue(body, Map.class);
			Object detail = errorMap.get("detail");
			return detail != null ? String.valueOf(detail) : "학교 일정 연동 중 오류가 발생했습니다.";
		} catch (Exception ignored) {
			return "학교 일정 연동 중 오류가 발생했습니다.";
		}
	}

    private void sendEvent(SseEmitter emitter, String eventName, String message) throws Exception {
        emitter.send(
                SseEmitter.event()
                        .name(eventName)
                        .data(message)
        );
    }
}
