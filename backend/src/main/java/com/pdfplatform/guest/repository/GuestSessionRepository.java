package com.pdfplatform.guest.repository;

import com.pdfplatform.guest.entity.GuestSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GuestSessionRepository extends JpaRepository<GuestSession, UUID> {

    Optional<GuestSession> findBySessionToken(String sessionToken);
}
