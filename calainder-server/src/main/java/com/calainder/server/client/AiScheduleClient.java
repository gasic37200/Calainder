package com.calainder.server.client;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.handler.FastApiExceptionMapper;
import com.google.common.collect.MultimapBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Component
public class AiScheduleClient {
    private final RestClient restClient;
    private final FastApiExceptionMapper fastApiExceptionMapper;

    public AiScheduleClient(
            @Value("${fastapi.ai-base-url}") String baseUrl,
            FastApiExceptionMapper fastApiExceptionMapper
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.fastApiExceptionMapper = fastApiExceptionMapper;
    }

    public ScheduleDTO analyzeText(String prompt) {
        try {
            return restClient.post()
                    .uri("/api/ai/schedule/text")
                    .body(Map.of("prompt", prompt))
                    .retrieve()
                    .body(ScheduleDTO.class);
        } catch (HttpStatusCodeException e) {
            throw fastApiExceptionMapper.toException(e, "AI 일정 분석 중 오류가 발생했습니다.");
        }
    }

    public ScheduleDTO analyzeImage(String prompt, MultipartFile image) {
		MultipartBodyBuilder builder = new MultipartBodyBuilder();

		builder.part("prompt", prompt == null ? "" : prompt)
				.contentType(MediaType.TEXT_PLAIN);

		builder.part("image", image.getResource())
				.filename(image.getOriginalFilename())
				.contentType(MediaType.parseMediaType(image.getContentType()));

        try {
            return restClient.post()
                    .uri("/api/ai/schedule/image")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(builder.build())
                    .retrieve()
                    .body(ScheduleDTO.class);
        } catch (HttpStatusCodeException e) {
            throw fastApiExceptionMapper.toException(e, "AI 일정 분석 중 오류가 발생했습니다.");
        }
    }
}
