package com.calainder.server.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScheduleRequest {
	private String title;
	private String startDate;
	private String endDate;
	private String startTime;
	private String endTime;
}
