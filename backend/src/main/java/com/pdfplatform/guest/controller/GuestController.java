package com.pdfplatform.guest.controller;

import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.service.GuestConversionService;
import com.pdfplatform.guest.service.GuestSessionService;
import com.pdfplatform.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/guest")
public class GuestController {

    private final GuestSessionService guestSessionService;
    private final GuestConversionService guestConversionService;

    public GuestController(GuestSessionService guestSessionService,
                          GuestConversionService guestConversionService) {
        this.guestSessionService = guestSessionService;
        this.guestConversionService = guestConversionService;
    }

    @PostMapping("/session")
    public ResponseEntity<Map<String, Object>> createSession(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) ip = request.getRemoteAddr();

        String userAgent = request.getHeader("User-Agent");

        GuestSession session = guestSessionService.createSession(ip, userAgent);

        return ResponseEntity.ok(Map.of(
                "sessionToken", session.getSessionToken(),
                "expiresAt", session.getExpiresAt().toString(),
                "maxDocuments", session.getMaxDocuments()
        ));
    }

    @GetMapping("/session/validate")
    public ResponseEntity<Map<String, Object>> validateSession(@RequestParam String guestToken) {
        GuestSession session = guestSessionService.validateSession(guestToken);
        return ResponseEntity.ok(Map.of(
                "sessionToken", session.getSessionToken(),
                "expiresAt", session.getExpiresAt().toString(),
                "maxDocuments", session.getMaxDocuments()
        ));
    }

    @PostMapping("/convert")
    public ResponseEntity<Map<String, Object>> convertToUser(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String sessionToken = body.get("sessionToken");
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new IllegalArgumentException("sessionToken is required");
        }

        int converted = guestConversionService.convertGuestToUser(sessionToken, user);
        return ResponseEntity.ok(Map.of("convertedDocuments", converted));
    }
}
