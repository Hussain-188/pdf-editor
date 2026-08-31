package com.pdfplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Storage storage = new Storage();
    private Jwt jwt = new Jwt();
    private Guest guest = new Guest();
    private Upload upload = new Upload();

    public Storage getStorage() { return storage; }
    public void setStorage(Storage storage) { this.storage = storage; }
    public Jwt getJwt() { return jwt; }
    public void setJwt(Jwt jwt) { this.jwt = jwt; }
    public Guest getGuest() { return guest; }
    public void setGuest(Guest guest) { this.guest = guest; }
    public Upload getUpload() { return upload; }
    public void setUpload(Upload upload) { this.upload = upload; }

    public static class Storage {
        private String basePath = "./storage";

        public String getBasePath() { return basePath; }
        public void setBasePath(String basePath) { this.basePath = basePath; }
    }

    public static class Jwt {
        private String secret;
        private long accessTokenExpiry;
        private long refreshTokenExpiry;

        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getAccessTokenExpiry() { return accessTokenExpiry; }
        public void setAccessTokenExpiry(long accessTokenExpiry) { this.accessTokenExpiry = accessTokenExpiry; }
        public long getRefreshTokenExpiry() { return refreshTokenExpiry; }
        public void setRefreshTokenExpiry(long refreshTokenExpiry) { this.refreshTokenExpiry = refreshTokenExpiry; }
    }

    public static class Guest {
        private int sessionExpiryHours;
        private int maxDocuments;
        private int maxFileSizeMb;

        public int getSessionExpiryHours() { return sessionExpiryHours; }
        public void setSessionExpiryHours(int sessionExpiryHours) { this.sessionExpiryHours = sessionExpiryHours; }
        public int getMaxDocuments() { return maxDocuments; }
        public void setMaxDocuments(int maxDocuments) { this.maxDocuments = maxDocuments; }
        public int getMaxFileSizeMb() { return maxFileSizeMb; }
        public void setMaxFileSizeMb(int maxFileSizeMb) { this.maxFileSizeMb = maxFileSizeMb; }
    }

    public static class Upload {
        private int maxFileSizeMb;
        private int maxPages;
        private java.util.List<String> allowedTypes;

        public int getMaxFileSizeMb() { return maxFileSizeMb; }
        public void setMaxFileSizeMb(int maxFileSizeMb) { this.maxFileSizeMb = maxFileSizeMb; }
        public int getMaxPages() { return maxPages; }
        public void setMaxPages(int maxPages) { this.maxPages = maxPages; }
        public java.util.List<String> getAllowedTypes() { return allowedTypes; }
        public void setAllowedTypes(java.util.List<String> allowedTypes) { this.allowedTypes = allowedTypes; }
    }
}
