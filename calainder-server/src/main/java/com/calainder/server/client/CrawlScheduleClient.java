package com.calainder.server.client;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.handler.FastApiExceptionMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class CrawlScheduleClient {
    private final RestClient restClient;
    private final FastApiExceptionMapper fastApiExceptionMapper;

    public CrawlScheduleClient(
            @Value("${fastapi.crawl-base-url}") String baseUrl,
            FastApiExceptionMapper fastApiExceptionMapper
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.fastApiExceptionMapper = fastApiExceptionMapper;
    }

    public ScheduleDTO[] fetchSchedule(Map<String, Object> data) {
        try {
            return restClient.post()
                    .uri("/api/crawl/schedule")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(data)
                    .retrieve()
                    .body(ScheduleDTO[].class);
        } catch (HttpStatusCodeException e) {
            throw fastApiExceptionMapper.toException(e, "학교 일정 연동 중 오류가 발생했습니다.");
        }
    }
}
