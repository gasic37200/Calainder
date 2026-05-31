package com.calainder.server.client;

import com.calainder.server.dto.FeedbackDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

@Component
public class FeedbackApiClient {

    private final RestClient restClient;

    public FeedbackApiClient(
            RestClient.Builder restClientBuilder,
            @Value("${feedback.base-url:http://localhost:7000}") String baseUrl
    ) {
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    public void saveFeedback(FeedbackDTO request) {
        try {
            restClient.post()
                    .uri("/api/feedback")
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new IllegalStateException("피드백 저장 중 오류가 발생했습니다.", exception);
        }
    }

    public Optional<FeedbackDTO> getFeedback(String project, String userKey) {
        try {
            FeedbackDTO response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/feedback")
                            .queryParam("project", project)
                            .queryParam("userKey", userKey)
                            .build())
                    .retrieve()
                    .body(FeedbackDTO.class);

            return Optional.ofNullable(response);
        } catch (HttpClientErrorException.NotFound exception) {
            return Optional.empty();
        } catch (RestClientException exception) {
            throw new IllegalStateException("피드백 조회 중 오류가 발생했습니다.", exception);
        }
    }
}
