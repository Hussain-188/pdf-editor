package com.pdfplatform.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        UserInfo user
) {
    public record UserInfo(
            String id,
            String email,
            String displayName,
            String role
    ) {}
}
