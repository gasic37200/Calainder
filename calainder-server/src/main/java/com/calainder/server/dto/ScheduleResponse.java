package com.calainder.server.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScheduleResponse {
	private String id;
	private String title;
	private String startDate;
	private String endDate;
	private String startTime;
	private String endTime;
}
