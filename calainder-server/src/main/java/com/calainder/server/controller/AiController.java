package com.calainder.server.controller;

import com.calainder.server.dto.ScheduleDTO;
import com.calainder.server.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AiController {
    private final ScheduleService scheduleService;

    @PostMapping(value = "/api/ai/schedule", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<ScheduleDTO> createSchedule(
            @RequestPart(required = false) String prompt,
            @RequestPart(required = false) MultipartFile image
    ) {
        List<ScheduleDTO> schedules = scheduleService.analyze(prompt, image);

        if (schedules.isEmpty() || schedules.stream().noneMatch(ScheduleDTO::isSuccess)) {
            throw new IllegalArgumentException("일정을 감지하지 못했습니다.");
        }

        return schedules;
    }
}
