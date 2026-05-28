package com.calainder.server.service;

import com.calainder.server.client.AiScheduleClient;
import com.calainder.server.client.CrawlScheduleClient;
import com.calainder.server.dto.ScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ScheduleService {
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    private final AiScheduleClient aiScheduleClient;
    private final CrawlScheduleClient crawlScheduleClient;

    public ScheduleDTO analyze(String prompt, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            validateImage(image);
            return aiScheduleClient.analyzeImage(prompt, image);
        }

        if (prompt != null && !prompt.isBlank()) {
            return aiScheduleClient.analyzeText(prompt);
        }

        throw new IllegalArgumentException("일정 내용이나 이미지를 입력해주세요.");
    }

    public ScheduleDTO[] crawlSchedule(Map<String, Object> data) {
        return crawlScheduleClient.fetchSchedule(data);
    }

    private void validateImage(MultipartFile image) {
        String contentType = image.getContentType();

        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다.");
        }
    }
}
