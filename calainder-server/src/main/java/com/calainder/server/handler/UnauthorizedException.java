package com.calainder.server.handler;

public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}
