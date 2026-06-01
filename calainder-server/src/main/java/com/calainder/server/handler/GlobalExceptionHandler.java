package com.calainder.server.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.ClientAuthorizationRequiredException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
	// ClientAuthorizationRequiredException
	// → 구글 로그인이 되어 있지 않은 문제
    @ExceptionHandler(ClientAuthorizationRequiredException.class)
    public ResponseEntity<ErrorResponse> handleClientAuthorizationRequired(ClientAuthorizationRequiredException e) {
        log.warn("Google authorization required. clientRegistrationId={}", e.getClientRegistrationId());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("구글 로그인이 필요합니다."));
    }


	// UnauthorizedException
	// → 사용자가 다시 로그인해야 하는 인증 문제
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException e) {
        log.warn("Authorization failed. message={}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(e.getMessage()));
    }


	// IllegalArgumentException
	// → 요청값, 권한, 리소스 등 클라이언트 쪽 문제
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("Bad request. message={}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(e.getMessage()));
    }

	// IllegalStateException
	// → 외부 API 장애나 서버 상태 문제
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException e) {
        log.error("Server processing error. message={}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(e.getMessage()));
    }

	// Exception
	// → 그 외 문제
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unexpected server error.", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("서버 처리 중 오류가 발생했습니다."));
    }
}
