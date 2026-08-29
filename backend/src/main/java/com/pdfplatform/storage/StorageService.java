package com.pdfplatform.storage;

import com.pdfplatform.config.AppProperties;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

@Service
public class StorageService {

    private final AppProperties appProperties;
    private S3Client s3Client;
    private S3Presigner presigner;

    public StorageService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() {
        var storage = appProperties.getStorage();
        var credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(storage.getAccessKey(), storage.getSecretKey()));

        var builder = S3Client.builder()
                .credentialsProvider(credentials)
                .region(Region.of(storage.getRegion()));

        var presignerBuilder = S3Presigner.builder()
                .credentialsProvider(credentials)
                .region(Region.of(storage.getRegion()));

        if (storage.getEndpoint() != null && !storage.getEndpoint().isBlank()) {
            URI endpoint = URI.create(storage.getEndpoint());
            S3Configuration s3Config = S3Configuration.builder().pathStyleAccessEnabled(true).build();
            builder.endpointOverride(endpoint).serviceConfiguration(s3Config);
            presignerBuilder.endpointOverride(endpoint).serviceConfiguration(s3Config);
        }

        this.s3Client = builder.build();
        this.presigner = presignerBuilder.build();
    }

    public void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(appProperties.getStorage().getBucket())
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
    }

    public InputStream download(String key) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(appProperties.getStorage().getBucket())
                .key(key)
                .build();

        return s3Client.getObject(request);
    }

    public void delete(String key) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(appProperties.getStorage().getBucket())
                .key(key)
                .build();

        s3Client.deleteObject(request);
    }

    public String generatePresignedDownloadUrl(String key, Duration duration) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(b -> b.bucket(appProperties.getStorage().getBucket()).key(key))
                .build();

        String url = presigner.presignGetObject(presignRequest).url().toString();

        String publicEndpoint = appProperties.getStorage().getPublicEndpoint();
        String internalEndpoint = appProperties.getStorage().getEndpoint();
        if (publicEndpoint != null && !publicEndpoint.isBlank()
                && internalEndpoint != null && !internalEndpoint.equals(publicEndpoint)) {
            url = url.replace(internalEndpoint, publicEndpoint);
        }

        return url;
    }

    public String buildStorageKey(String... parts) {
        return String.join("/", parts);
    }
}
