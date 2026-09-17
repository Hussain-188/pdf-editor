package com.pdfplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Upload upload = new Upload();

    public Upload getUpload() { return upload; }
    public void setUpload(Upload upload) { this.upload = upload; }

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
