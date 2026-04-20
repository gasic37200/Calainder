package com.calainder.server.dto;

import com.calainder.server.util.ScheduleDateTime;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

// ScheduleDTO의 ScheduleDTO <-> Event 변환이 잘되는지 테스트
class ScheduleDTOTest {

	@Test
	void toGoogleEvent_mapsBasicScheduleFields() {
		ScheduleDTO dto = new ScheduleDTO();
		dto.setTitle("Team meeting");
		dto.setDescription("Share project status");
		dto.setLocation("Online");
		dto.setStart(scheduleDateTime(LocalDate.of(2026, 4, 21), LocalTime.of(10, 0)));
		dto.setEnd(scheduleDateTime(LocalDate.of(2026, 4, 21), LocalTime.of(11, 0)));
		dto.setReminderEnabled(false);

		Event event = dto.toGoogleEvent();

		assertThat(event.getSummary()).isEqualTo("Team meeting");
		assertThat(event.getDescription()).isEqualTo("Share project status");
		assertThat(event.getLocation()).isEqualTo("Online");
		assertThat(event.getStart().getDateTime()).isNotNull();
		assertThat(event.getEnd().getDateTime()).isNotNull();
		assertThat(event.getReminders().getUseDefault()).isFalse();
		assertThat(event.getReminders().getOverrides()).isEmpty();
	}

	@Test
	void toGoogleEvent_mapsPopupReminderWhenReminderIsEnabled() {
		ScheduleDTO dto = new ScheduleDTO();
		dto.setTitle("Submit assignment");
		dto.setStart(scheduleDateTime(LocalDate.of(2026, 4, 21), LocalTime.of(23, 0)));
		dto.setEnd(scheduleDateTime(LocalDate.of(2026, 4, 22), LocalTime.of(0, 0)));
		dto.setReminderEnabled(true);
		dto.setReminderMinutes(30);

		Event event = dto.toGoogleEvent();

		assertThat(event.getReminders().getUseDefault()).isFalse();
		assertThat(event.getReminders().getOverrides()).hasSize(1);
		assertThat(event.getReminders().getOverrides().get(0).getMethod()).isEqualTo("popup");
		assertThat(event.getReminders().getOverrides().get(0).getMinutes()).isEqualTo(30);
	}

	private ScheduleDateTime scheduleDateTime(LocalDate date, LocalTime time) {
		ScheduleDateTime scheduleDateTime = new ScheduleDateTime();
		scheduleDateTime.setDate(date);
		scheduleDateTime.setTime(time);
		return scheduleDateTime;
	}
}
