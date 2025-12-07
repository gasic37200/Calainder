package com.calainder.server.service;

import com.calainder.server.dto.ScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FastApiService {
	public ScheduleDTO callFastApi(String prompt, MultipartFile image) throws Exception {
		// 1) 이미지가 있으면 → Multipart로 FastAPI 호출
		if (image != null && !image.isEmpty()) {
			return callAiSchedule(prompt, image);
		}

		// 2) 텍스트만 있으면 → JSON으로 FastAPI 호출
		if (prompt != null && !prompt.isEmpty()) {
			return callAiSchedule(prompt);
		}

		throw new IllegalArgumentException("prompt 또는 image 둘 중 하나는 반드시 있어야 합니다.");
	}

	public ScheduleDTO[] callFastApi(Map<String, Object> data) {
		return callCrawlSchedule(data);
	}

	private ScheduleDTO callAiSchedule(String prompt, MultipartFile image) throws IOException {
		System.out.println("이미지 처리");

		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("prompt", prompt);

		ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
			@Override
			public String getFilename() {
				return image.getOriginalFilename();
			}
		};
		body.add("image", fileResource);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);

		HttpEntity<MultiValueMap<String, Object>> requestEntity =
				new HttpEntity<>(body, headers);

		RestTemplate restTemplate = new RestTemplate();
		return restTemplate.postForObject(
				"http://localhost:8000/api/ai/schedule/image",
				requestEntity,
				ScheduleDTO.class
		);
	}

	private ScheduleDTO callAiSchedule(String prompt) {
		System.out.println("텍스트 처리");

		// http header 설정
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		Map<String, Object> body = Map.of("prompt", prompt);

		// http entity에 정보 담기
		HttpEntity<Map<String, Object>> request =
				new HttpEntity<>(body, headers);

		RestTemplate restTemplate = new RestTemplate();
		return restTemplate.postForObject(
				"http://localhost:8000/api/ai/schedule/text",
				request,
				ScheduleDTO.class
		);
	}

	private ScheduleDTO[] callCrawlSchedule(Map<String, Object> data) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> request =
				new HttpEntity<>(data, headers);

		RestTemplate restTemplate = new RestTemplate();
		return restTemplate.postForObject(
				"http://localhost:9000/api/crawl/schedule",
				request,
				ScheduleDTO[].class
		);
	}
}
