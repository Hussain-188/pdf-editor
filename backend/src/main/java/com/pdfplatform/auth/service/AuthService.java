package com.pdfplatform.auth.service;

import com.pdfplatform.auth.dto.AuthResponse;
import com.pdfplatform.auth.dto.LoginRequest;
import com.pdfplatform.auth.dto.RegisterRequest;
import com.pdfplatform.user.entity.RefreshToken;
import com.pdfplatform.user.entity.User;
import com.pdfplatform.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setEmail(request.email().toLowerCase().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.name());
        user = userRepository.save(user);

        String accessToken = tokenService.generateAccessToken(user);
        String refreshToken = tokenService.generateRefreshToken(user, request.deviceInfo());

        return new AuthResponse(accessToken, refreshToken, toUserInfo(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Account is deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String accessToken = tokenService.generateAccessToken(user);
        String refreshToken = tokenService.generateRefreshToken(user, request.deviceInfo());

        return new AuthResponse(accessToken, refreshToken, toUserInfo(user));
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = tokenService.validateRefreshToken(rawRefreshToken);
        if (token == null) {
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        // Rotate: revoke old token, issue new pair
        tokenService.revokeRefreshToken(rawRefreshToken);

        User user = token.getUser();
        String accessToken = tokenService.generateAccessToken(user);
        String newRefreshToken = tokenService.generateRefreshToken(user, token.getDeviceInfo());

        return new AuthResponse(accessToken, newRefreshToken, toUserInfo(user));
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        tokenService.revokeRefreshToken(rawRefreshToken);
    }

    private AuthResponse.UserInfo toUserInfo(User user) {
        return new AuthResponse.UserInfo(
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole()
        );
    }
}
