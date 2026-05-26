package com.calainder.server.handler;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class CalendarExceptionMapper {

    public RuntimeException toException(GoogleJsonResponseException exception, String fallbackMessage) {
        int statusCode = exception.getStatusCode();
        String message = getMessage(statusCode, fallbackMessage);

        if (statusCode == 401) {
            log.warn(
                    "Google Calendar authorization error. status={}, message={}, detail={}",
                    statusCode,
                    message,
                    exception.getDetails()
            );
            return new UnauthorizedException(message, exception);
        }

        if (statusCode >= 400 && statusCode < 500) {
            log.warn(
                    "Google Calendar client error. status={}, message={}, detail={}",
                    statusCode,
                    message,
                    exception.getDetails()
            );
            return new IllegalArgumentException(message, exception);
        }

        log.error(
                "Google Calendar server error. status={}, message={}, detail={}",
                statusCode,
                message,
                exception.getDetails(),
                exception
        );
        return new IllegalStateException(message, exception);
    }

    private String getMessage(int statusCode, String fallbackMessage) {
        return switch (statusCode) {
            case 401 -> "구글 로그인이 만료되었습니다. 다시 로그인해주세요.";
            case 403 -> "Google Calendar 접근 권한이 없습니다. 캘린더 사용 권한을 확인해주세요.";
            case 404 -> "기본 Google Calendar를 찾을 수 없습니다.";
            default -> fallbackMessage;
        };
    }
}
