package com.pdfplatform.guest.service;

import com.pdfplatform.config.AppProperties;
import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.repository.GuestSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class GuestSessionService {

    private final GuestSessionRepository guestSessionRepository;
    private final AppProperties appProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public GuestSessionService(GuestSessionRepository guestSessionRepository, AppProperties appProperties) {
        this.guestSessionRepository = guestSessionRepository;
        this.appProperties = appProperties;
    }

    @Transactional
    public GuestSession createSession(String ipAddress, String userAgent) {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        GuestSession session = new GuestSession();
        session.setSessionToken(token);
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);
        session.setExpiresAt(Instant.now().plus(appProperties.getGuest().getSessionExpiryHours(), ChronoUnit.HOURS));
        session.setMaxDocuments(appProperties.getGuest().getMaxDocuments());

        return guestSessionRepository.save(session);
    }

    public GuestSession validateSession(String sessionToken) {
        GuestSession session = guestSessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid guest session"));

        if (!session.isValid()) {
            throw new IllegalArgumentException("Guest session expired or converted");
        }

        return session;
    }

    @Transactional
    public void incrementDocumentCount(GuestSession session) {
        session.setDocumentCount(session.getDocumentCount() + 1);
        guestSessionRepository.save(session);
    }
}
