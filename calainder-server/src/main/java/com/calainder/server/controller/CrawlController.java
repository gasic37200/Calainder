package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.CalendarService;
import com.calainder.server.service.FastApiService;
import com.calainder.server.util.CryptUtil;
import io.github.cdimascio.dotenv.Dotenv;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CrawlController {
	private final FastApiService fastApiService;
	private final CalendarService calendarService;

	Dotenv dotenv = Dotenv.load();

	@PostMapping("/api/crawl/schedule")
	public Boolean crawlSchedule(
			@RequestBody Map<String, String> body,
			@RegisteredOAuth2AuthorizedClient("google") OAuth2AuthorizedClient authorizedClient
	) throws Exception {
		String cryptId = CryptUtil.encrypt(dotenv.get("AES_KEY"), body.get("id"));
		String cryptPw = CryptUtil.encrypt(dotenv.get("AES_KEY"), body.get("pw"));

		Map<String, Object> data = new HashMap<>();
		data.put("cryptId", cryptId);
		data.put("cryptPw", cryptPw);
		System.out.println("cryptId: " + cryptId + ", cryptPw: " + cryptPw);

		ScheduleDTO[] scheduleDTO = fastApiService.callFastApi(data);

		for (ScheduleDTO schedule : scheduleDTO) {
			ScheduleDTO result = calendarService.addEvent(schedule, authorizedClient);
			System.out.println(result);
		}

		return true;
	}

}
