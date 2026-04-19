package com.calainder.server.service;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.util.FastApiErrorMessageExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FastApiService {
	@Value("${fastapi.ai-base-url:http://localhost:8000}")
	private String aiBaseUrl;
	@Value("${fastapi.crawl-base-url:http://localhost:9000}")
	private String crawlBaseUrl;

    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    public ScheduleDTO callFastApi(String prompt, MultipartFile image) throws Exception {
        if (image != null && !image.isEmpty()) {
            return callAiSchedule(prompt, image);
        }

        if (prompt != null && !prompt.isEmpty()) {
            return callAiSchedule(prompt);
        }

        throw new IllegalArgumentException("일정 내용이나 이미지를 입력해주세요.");
    }

    public ScheduleDTO[] callFastApi(Map<String, Object> data) {
        return callCrawlSchedule(data);
    }

    private ScheduleDTO callAiSchedule(String prompt, MultipartFile image) throws IOException {
        String contentType = image.getContentType();
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 파일만 업로드할 수 있습니다.");
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("prompt", prompt);

        ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
            @Override
            public String getFilename() {
                return image.getOriginalFilename();
            }
        };

        HttpHeaders imageHeaders = new HttpHeaders();
        imageHeaders.setContentType(MediaType.parseMediaType(contentType));
        body.add("image", new HttpEntity<>(fileResource, imageHeaders));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            return restTemplate.postForObject(
					aiBaseUrl + "/api/ai/schedule/image",
                    requestEntity,
                    ScheduleDTO.class
            );
        } catch (HttpStatusCodeException e) {
            throw toFastApiException(e, "AI 일정 분석 중 오류가 발생했습니다.");
        }
    }

    private ScheduleDTO callAiSchedule(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of("prompt", prompt);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            return restTemplate.postForObject(
					aiBaseUrl + "/api/ai/schedule/text",
                    request,
                    ScheduleDTO.class
            );
        } catch (HttpStatusCodeException e) {
            throw toFastApiException(e, "AI 일정 분석 중 오류가 발생했습니다.");
        }
    }

    private ScheduleDTO[] callCrawlSchedule(Map<String, Object> data) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(data, headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            return restTemplate.postForObject(
					crawlBaseUrl + "/api/crawl/schedule",
                    request,
                    ScheduleDTO[].class
            );
        } catch (HttpStatusCodeException e) {
            throw toFastApiException(e, "학교 일정 연동 중 오류가 발생했습니다.");
        }
    }

    private RuntimeException toFastApiException(HttpStatusCodeException exception, String fallbackMessage) {
        String message = FastApiErrorMessageExtractor.extract(exception, fallbackMessage);

        if (exception.getStatusCode().is4xxClientError()) {
            log.warn(
                    "FastAPI client error. status={}, message={}, body={}",
                    exception.getStatusCode(),
                    message,
                    exception.getResponseBodyAsString()
            );
            return new IllegalArgumentException(message, exception);
        }

        log.error(
                "FastAPI server error. status={}, message={}, body={}",
                exception.getStatusCode(),
                message,
                exception.getResponseBodyAsString(),
                exception
        );
        return new IllegalStateException(message, exception);
    }
}
