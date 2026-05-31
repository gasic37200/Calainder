package com.calainder.server.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.Map;

@Slf4j
@Component
public final class FastApiExceptionMapper {
    private final ObjectMapper objectMapper;

    public FastApiExceptionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

	// UnauthorizedException
	// → 사용자가 다시 로그인해야 하는 인증 문제

	// IllegalArgumentException
	// → 요청값, 권한, 리소스 등 클라이언트 쪽 문제

	// IllegalStateException
	// → 외부 API 장애나 서버 상태 문제
    public RuntimeException toException(HttpStatusCodeException exception, String fallbackMessage) {
        String message = extractMessage(exception, fallbackMessage);

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

    private String extractMessage(HttpStatusCodeException exception, String fallbackMessage) {
        String body = exception.getResponseBodyAsString();

        if (body == null || body.isBlank()) {
            return fallbackMessage;
        }

        try {
            Map<String, Object> errorMap = objectMapper.readValue(
                    body,
                    new TypeReference<Map<String, Object>>() {
                    }
            );

            Object message = errorMap.get("message");
            if (message != null) {
                return String.valueOf(message);
            }

            Object detail = errorMap.get("detail");
            if (detail != null) {
                return String.valueOf(detail);
            }
        } catch (Exception e) {
            log.debug("Failed to parse FastAPI error body. body={}", body, e);
        }

        return fallbackMessage;
    }
}
