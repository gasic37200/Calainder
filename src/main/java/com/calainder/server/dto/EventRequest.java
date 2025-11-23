package com.calainder.server.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EventRequest {
    private String id;
    private String title;
    private String startDate;
    private String startTime;
    private String endDate;
    private String endTime;
}
