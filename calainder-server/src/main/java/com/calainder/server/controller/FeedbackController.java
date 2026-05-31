package com.calainder.server.controller;

import com.calainder.server.client.FeedbackApiClient;
import com.calainder.server.dto.FeedbackDTO;
import com.calainder.server.dto.FeedbackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final FeedbackApiClient feedbackApiClient;

    @GetMapping("/api/feedback")
    public Optional<FeedbackDTO> getFeedback(@AuthenticationPrincipal OAuth2User user) {
        return feedbackApiClient.getFeedback("calainder", getGoogleUserKey(user));
    }

    @PostMapping("/api/feedback")
    public Map<String, String> saveFeedback(
            @RequestBody FeedbackRequest request,
            @AuthenticationPrincipal OAuth2User user
    ) {
        validate(request);

        String requestedEmail = trimToNull(request.email());
        String googleEmail = trimToNull(user.getAttribute("email"));
        String email = requestedEmail != null ? requestedEmail : googleEmail;
        if (email == null) {
            throw new IllegalArgumentException("이메일을 입력해주세요.");
        }

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("이메일 형식을 확인해주세요.");
        }

        FeedbackDTO feedback = new FeedbackDTO(
                "calainder",
                getGoogleUserKey(user),
                email,
                request.rating(),
                trimToNull(request.positive()),
                trimToNull(request.improvement()),
                null
        );

        feedbackApiClient.saveFeedback(feedback);
        return Map.of("message", "피드백이 저장되었습니다.");
    }

    private String getGoogleUserKey(OAuth2User user) {
        String subject = trimToNull(user.getAttribute("sub"));
        if (subject == null) {
            throw new IllegalStateException("사용자 정보를 확인할 수 없습니다.");
        }
        return "google:" + subject;
    }

    private void validate(FeedbackRequest request) {
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new IllegalArgumentException("별점을 선택해주세요.");
        }

        if (trimToNull(request.positive()) == null && trimToNull(request.improvement()) == null) {
            throw new IllegalArgumentException("좋았던 점이나 개선할 점 중 하나는 입력해주세요.");
        }

        String email = trimToNull(request.email());
        if (email != null && !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("이메일 형식을 확인해주세요.");
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
