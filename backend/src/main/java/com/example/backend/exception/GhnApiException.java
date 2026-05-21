package com.example.backend.exception;

public class GhnApiException extends RuntimeException {
    public GhnApiException(String message) {
        super(message);
    }

    public GhnApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
