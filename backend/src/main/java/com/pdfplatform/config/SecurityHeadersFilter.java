package com.pdfplatform.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(2)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletResponse httpResp = (HttpServletResponse) response;

        httpResp.setHeader("X-Content-Type-Options", "nosniff");
        httpResp.setHeader("X-Frame-Options", "DENY");
        httpResp.setHeader("X-XSS-Protection", "1; mode=block");
        httpResp.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResp.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        httpResp.setHeader("Content-Security-Policy",
                "default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:* https://*; " +
                "worker-src 'self' blob:; frame-ancestors 'none';");

        chain.doFilter(request, response);
    }
}
