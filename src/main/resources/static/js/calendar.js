// ------------------- 초기 이벤트 로딩 -------------------
var events = /*[[${events}]]*/ [];
var calendarEl = document.getElementById('calendar');

var selectedDate = null; // 클릭한 날짜 저장
var selectedEvent = null; // 현재 수정 중인 이벤트

const csrfToken = document.querySelector('meta[name="_csrf"]').getAttribute('content');
const csrfHeader = document.querySelector('meta[name="_csrf_header"]').getAttribute('content');

var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 650,
    events: events,
    eventDisplay: 'block',
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },

    dateClick: function(info) {
        openEventModal(info.dateStr);
    },

    eventContent: function(arg) {
        const event = arg.event;
        let timeRange = "";

        if (!event.allDay) {
            const start = event.start;
            const end = event.end || event.start;

            const timeFormatter = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });
            const startText = timeFormatter.format(start);
            const endText = timeFormatter.format(end);
            timeRange = `${startText} ~ ${endText} `;
        }

        return { html: `<span>${timeRange}${event.title || ''}</span>` };
    }
});
calendar.render();

// ------------------- 세부 일정 모달 -------------------
function openEventModal(dateStr) {
    selectedDate = dateStr;
    let dateObj = new Date(dateStr);
    let formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth()+1}월 ${dateObj.getDate()}일`;
    document.getElementById("modalDate").innerText = formattedDate;

    function toDateOnly(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    const clicked = toDateOnly(new Date(dateStr));

    const dayEvents = calendar.getEvents().filter(ev => {
        const start = toDateOnly(new Date(ev.start));
        const end = ev.end ? toDateOnly(new Date(ev.end)) : start;
        return clicked.getTime() >= start.getTime() && clicked.getTime() <= end.getTime();
    });

    const eventList = document.getElementById("eventList");

    if(dayEvents.length > 0){
        eventList.innerHTML = dayEvents.map(ev => {
            const start = new Date(ev.start);
            const end = ev.end ? new Date(ev.end) : null;

            const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true };
            const startText = new Intl.DateTimeFormat('ko-KR', options).format(start);
            const endText = end ? new Intl.DateTimeFormat('ko-KR', options).format(end) : "";

            const isStartDay = clicked.getTime() === new Date(ev.start).setHours(0,0,0,0);

            return `
                <div class="eventItem">
                    <span class="eventTime">${startText} ~ ${endText}</span>
                    <span class="eventTitle">${ev.title}</span>
                    ${isStartDay ? `<button class="editEventBtn" onclick="editEvent('${ev.id}')">수정</button>` : ''}
                    ${isStartDay ? `<button class="deleteEventBtn" onclick="deleteEvent('${ev.id}', this)">삭제</button>` : ''}
                </div>`;
        }).join('');
    } else {
        eventList.innerHTML = "이 날짜의 일정이 없습니다.";
    }

    document.getElementById("modalBackdrop").style.display = "block";
    document.getElementById("eventModal").style.display = "block";
}

// ------------------- 일정 삭제 함수 -------------------
async function deleteEvent(eventId) {
    try {
        const response = await fetch(`/deleteEvent/${eventId}`, {
            method: 'DELETE',
            headers: {
                [csrfHeader]: csrfToken,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error('HTTP Error:', response.status);
            alert('삭제 실패: 서버 오류');
            return;
        }

        const result = await response.json();

        if (result.success) {
            const ev = calendar.getEventById(eventId);
            if (ev) ev.remove();

            alert('일정이 성공적으로 삭제되었습니다.');

            document.getElementById("eventModal").style.display = "none";
            document.getElementById("modalBackdrop").style.display = "none";

            selectedDate = null;
            selectedEvent = null;
        } else {
            console.error('Server response error:', result);
            alert('삭제 실패');
        }
    } catch (error) {
        console.error('Fetch failed:', error);
        alert('삭제 실패: 네트워크 오류');
    }
}


// ------------------- 모달 닫기 & 폼 초기화 -------------------
function resetAddEventForm() {
    document.getElementById("eventTitle").value = '';
    document.getElementById("eventStartDate").value = '';
    document.getElementById("eventEndDate").value = '';
    document.getElementById("eventStartTime").value = '';
    document.getElementById("eventEndTime").value = '';
}

document.getElementById("closeModal").addEventListener("click", function(){
    document.getElementById("eventModal").style.display = "none";
    document.getElementById("modalBackdrop").style.display = "none";
});

document.getElementById("modalBackdrop").addEventListener("click", function(){
    document.getElementById("eventModal").style.display = "none";
    document.getElementById("addEventModal").style.display = "none";
    this.style.display = "none";
    resetAddEventForm();
});

document.getElementById("addEventButton").addEventListener("click", function(){
    document.getElementById("eventStartDate").value = selectedDate || new Date().toISOString().slice(0,10);
    document.getElementById("addEventModal").style.display = "flex";
    document.getElementById("addEventFormTitle").innerText = "일정 추가";
    document.querySelector("#addEventForm button[type='submit']").innerText = "추가";
    selectedEvent = null;
});

document.getElementById("closeAddModal").addEventListener("click", function(){
    document.getElementById("addEventModal").style.display = "none";
    resetAddEventForm();
});

// ---- 시간대 보정 함수 ----
function toLocalDateInputValue(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

function toLocalTimeInputValue(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(11, 16);
}

// ------------------- 세부 일정 모달에서 수정 버튼 -------------------
function editEvent(eventId) {
    const ev = calendar.getEventById(eventId);
    if (!ev) return;

    selectedEvent = ev;

    document.getElementById("addEventModal").style.display = "flex";
    document.getElementById("addEventFormTitle").innerText = "일정 수정";
    document.getElementById("eventTitle").value = ev.title;

    const startDate = new Date(ev.start);
    const endDate = ev.end ? new Date(ev.end) : startDate;

    document.getElementById("eventStartDate").value = toLocalDateInputValue(startDate);
    document.getElementById("eventEndDate").value = toLocalDateInputValue(endDate);

    document.getElementById("eventStartTime").value = toLocalTimeInputValue(startDate);
    document.getElementById("eventEndTime").value = toLocalTimeInputValue(endDate);

    document.querySelector("#addEventForm button[type='submit']").innerText = "저장";
}

// ------------------- 일정 추가/수정 폼 제출 -------------------
document.getElementById("addEventForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const payload = {
        title: document.getElementById("eventTitle").value,
        startDate: document.getElementById("eventStartDate").value,
        startTime: document.getElementById("eventStartTime").value,
        endDate: document.getElementById("eventEndDate").value,
        endTime: document.getElementById("eventEndTime").value
    };

    const isAllDay = !payload.startTime && !payload.endTime;

    const start = payload.startTime ? new Date(payload.startDate + "T" + payload.startTime) : new Date(payload.startDate);
    let end = payload.endTime ? new Date(payload.endDate + "T" + payload.endTime) : new Date(payload.endDate);
    if (!payload.endTime) end.setDate(end.getDate() + 1);

    if (selectedEvent) {
        payload.id = selectedEvent.id;

        fetch("/updateEvent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken
            },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(result => {
                if (selectedEvent) {
                    selectedEvent.setProp('title', result.summary || result.title);
                    selectedEvent.setStart(new Date(result.start));
                    selectedEvent.setEnd(new Date(result.end));

                    // 1. 모달 닫기
                    document.getElementById("addEventModal").style.display = "none";
                    resetAddEventForm();

                    // 2. selectedEvent 초기화
                    selectedEvent = null;

                    // 3. 세부 일정 모달 열기 (짧은 지연 후)
                    setTimeout(() => {
                        openEventModal(selectedDate);
                    }, 50);

                } else {
                    const newEvent = calendar.addEvent({
                        id: result.id,
                        title: result.summary || result.title,
                        start: new Date(result.start),
                        end: new Date(result.end),
                        allDay: isAllDay
                    });

                    // 새 이벤트 추가 후 모달 닫기
                    document.getElementById("addEventModal").style.display = "none";
                    resetAddEventForm();

                    // 세부 일정 모달 열기
                    setTimeout(() => {
                        openEventModal(selectedDate);
                    }, 50);
                }
            })
            .catch(err => console.error("AJAX 실패:", err));
    } else {
        fetch("/addEvent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken
            },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(result => {
                const newEvent = calendar.addEvent({
                    id: result.id,
                    title: result.summary || result.title,
                    start: new Date(result.start),
                    end: new Date(result.end),
                    allDay: isAllDay
                });

                document.getElementById("addEventModal").style.display = "none";
                resetAddEventForm();
                setTimeout(() => openEventModal(selectedDate), 50);
            })
            .catch(err => console.error("AJAX 실패:", err));
    }
});