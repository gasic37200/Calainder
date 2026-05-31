package com.calainder.server.dto;

public record FeedbackRequest(
        Integer rating,
        String positive,
        String improvement,
        String email
) {
}
