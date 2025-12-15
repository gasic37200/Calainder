package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.FastApiService;
import com.calainder.server.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

// ResponseBody + Controller로 return을 View가 아닌 Body에 전달
@RestController
@RequiredArgsConstructor
public class AiController {
	private final FastApiService aiService;
	private final CalendarService calendarService;

	@PostMapping(value = "/api/ai/schedule", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ScheduleDTO schedule(
			@RequestPart(required = false) String prompt,
			@RequestPart(required = false) MultipartFile image,
			@RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient
	) throws Exception {
		ScheduleDTO scheduleDTO = aiService.callFastApi(prompt, image);
		System.out.println(scheduleDTO);
		if (!scheduleDTO.isSuccess()) {
			throw new IllegalArgumentException("일정이 감지되지 않았습니다.");
		}

		ScheduleDTO result = calendarService.addEvent(scheduleDTO, authorizedClient);
		System.out.println(result);

		return result;
	}
}
