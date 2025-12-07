package com.calainder.server.util;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@ToString
public class ScheduleDateTime {
	private LocalDate date;          // all-day: YYYY-MM-DD
	private LocalTime time;  // timed event: YYYY-MM-DDTHH:mm:ss
}
