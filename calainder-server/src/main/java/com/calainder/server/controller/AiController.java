package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.CalendarService;
import com.calainder.server.service.FastApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

// ResponseBody + Controller로 return은 View가 아닌 Body를 전달
@RestController
@RequiredArgsConstructor
public class AiController {
    private final FastApiService aiService;
    private final CalendarService calendarService;

    @PostMapping(value = "/api/ai/schedule", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<ScheduleDTO> createSchedule(
            @RequestPart(required = false) String prompt,
            @RequestPart(required = false) MultipartFile image,
            @RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient
    ) throws Exception {
        ScheduleDTO scheduleDTO = aiService.callFastApi(prompt, image);

		if (!scheduleDTO.isSuccess()) {
			throw new IllegalArgumentException("일정이 감지되지 않았습니다.");
		}

		String intent = scheduleDTO.getIntent();

		if ("create".equals(intent)) {
            return List.of(scheduleDTO);
        }

        return calendarService.lookupEvent(scheduleDTO, authorizedClient);
    }
}
