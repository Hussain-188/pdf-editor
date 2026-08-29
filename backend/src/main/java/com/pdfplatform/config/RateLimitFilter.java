package com.pdfplatform.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final int MAX_REQUESTS_PER_MINUTE = 120;
    private static final int MAX_AUTH_ATTEMPTS_PER_MINUTE = 10;

    private final Map<String, RateBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        String ip = getClientIp(httpReq);
        String path = httpReq.getRequestURI();

        boolean isAuthPath = path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register");
        int limit = isAuthPath ? MAX_AUTH_ATTEMPTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE;
        String bucketKey = ip + (isAuthPath ? ":auth" : ":general");

        RateBucket bucket = buckets.computeIfAbsent(bucketKey, k -> new RateBucket());

        if (!bucket.tryConsume(limit)) {
            httpResp.setStatus(429);
            httpResp.setContentType("application/json");
            httpResp.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class RateBucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        boolean tryConsume(int limit) {
            long now = System.currentTimeMillis();
            if (now - windowStart > 60_000) {
                count.set(0);
                windowStart = now;
            }
            return count.incrementAndGet() <= limit;
        }
    }
}
