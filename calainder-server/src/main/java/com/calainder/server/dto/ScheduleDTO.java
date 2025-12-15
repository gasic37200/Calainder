package com.calainder.server.dto;

import com.calainder.server.util.ScheduleDateTime;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;

@Getter
@Setter
@ToString
public class ScheduleDTO {
	private String id;            // Event ID
	private String title;         // summary
	private String description;   // description
	private String location;      // location

	private ScheduleDateTime start;  // start.date 또는 start.dateTime
	private ScheduleDateTime end;    // end.date 또는 end.dateTime

	private String recurrence;    // 반복 규칙 (RRULE)

	private boolean success;

	public ScheduleDTO toScheduleDTO(Event event) {
		this.setId(event.getId());
		this.setTitle(event.getSummary());
		this.setDescription(event.getDescription());
		this.setLocation(event.getLocation());

		this.setStart(convertEventDateTime(event.getStart()));
		this.setEnd(convertEventDateTime(event.getEnd()));

		if (event.getRecurrence() != null && !event.getRecurrence().isEmpty()) {
			this.setRecurrence(event.getRecurrence().get(0));
		}

		return this;
	}

	public Event toGoogleEvent() {
		Event event = new Event();

		event.setId(this.getId());
		event.setSummary(this.getTitle());
		event.setDescription(this.getDescription());
		event.setLocation(this.getLocation());

		// start
		EventDateTime start = convertScheduleDateTime(this.getStart());
		if (start != null) event.setStart(start);

		// end
		EventDateTime end = convertScheduleDateTime(this.getEnd());
		if (end != null) event.setEnd(end);

		// 반복 규칙
		if (this.getRecurrence() != null) {
			event.setRecurrence(Collections.singletonList(this.getRecurrence()));
		}

		return event;
	}

	public ScheduleDateTime convertEventDateTime(EventDateTime edt) {
		ScheduleDateTime sdt = new ScheduleDateTime(); // date와 time 묶여있는 클래스

		if (edt.getDateTime() != null) { // time event
			LocalDateTime ldt = LocalDateTime.parse(
					edt.getDateTime().toStringRfc3339(),
					DateTimeFormatter.ISO_OFFSET_DATE_TIME);

			sdt.setDate(ldt.toLocalDate());
			sdt.setTime(ldt.toLocalTime());
		} else if (edt.getDate() != null) {
			LocalDate ld = LocalDate.parse(
					edt.getDate().toString());

			sdt.setDate(ld);
			sdt.setTime(null);
		}
		return sdt;
	}

	public EventDateTime convertScheduleDateTime(ScheduleDateTime sdt) {
		EventDateTime edt = new EventDateTime(); // date와 time 묶여있는 클래스

		if (sdt.getTime() != null) { // time event
			LocalDateTime ldt = LocalDateTime.of(sdt.getDate(), sdt.getTime());

			DateTime googleDateTime = new DateTime(
					ldt.atZone(ZoneId.of("Asia/Seoul"))
							.toInstant()
							.toEpochMilli());

			edt.setDateTime(googleDateTime);
			edt.setTimeZone("Asia/Seoul");
		} else if (sdt.getDate() != null) {
			DateTime dt = new DateTime(sdt.getDate().toString());
			edt.setDate(dt);
		}

		return edt;
	}
}
