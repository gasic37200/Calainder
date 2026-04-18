package com.calainder.server.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.Map;

public final class FastApiErrorMessageExtractor {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static String extract(HttpStatusCodeException exception, String fallbackMessage) {
        String body = exception.getResponseBodyAsString();

        if (body == null || body.isBlank()) {
            return fallbackMessage;
        }

        try {
            Map<String, Object> errorMap = OBJECT_MAPPER.readValue(body, Map.class);

            Object message = errorMap.get("message");
            if (message != null) {
                return String.valueOf(message);
            }

            Object detail = errorMap.get("detail");
            if (detail != null) {
                return String.valueOf(detail);
            }
        } catch (Exception ignored) {
        }

        return fallbackMessage;
    }
}
