/* -------------------------------------------
🚪 Landing 페이지 숨기기
-------------------------------------------*/
function enterApp() {
    document.getElementById("landing").classList.add("hide");
}

/* -------------------------------------------
✨ 채팅 메시지 UI
-------------------------------------------*/
function addMessage(text, type) {
    const chat = document.getElementById("chatArea");
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

/* -------------------------------------------
✨ 이미지 메시지 UI
-------------------------------------------*/
let imageMessageEl = null;   // 이미지 메시지 div
let imageFile = null;
function addImgMessage(text, type) {
    const chat = document.getElementById("chatArea");

    // 🔥 기존 이미지 메시지가 있으면 제거
    if (imageMessageEl) {
        imageMessageEl.remove()
    }

    // 하나의 말풍선
    const imageMsg = document.createElement("div");
    imageMsg.className = `msg ${type} image`;

    // X 버튼
    const cancel = document.createElement("span");
    cancel.textContent = "❌";
    cancel.style.cursor = "pointer";

    cancel.onclick = () => {
        imageFile = null;
        imageMsg.remove()
        imageMessageEl = null;
    };

    // 텍스트
    const imageName = document.createElement("span");
    imageName.textContent = text;

    // 같은 말풍선 안에 추가 ⭐
    imageMsg.appendChild(cancel);
    imageMsg.appendChild(imageName);

    chat.appendChild(imageMsg);

    chat.scrollTop = chat.scrollHeight;

    // ⭐ 현재 이미지 메시지 기억
    imageMessageEl = imageMsg;
}

/* -------------------------------------------
📌 일정 카드 UI
-------------------------------------------*/
function createEventCard(dto) {
    const chat = document.getElementById("chatArea");
    const card = document.createElement("div");

    card.className = "event-card";
    card.setAttribute("data-id", dto.id);

    card.innerHTML = `
        <h3>✔ 일정 추가 완료</h3>
        <p>📌 제목: <span class="ev-title">${dto.title}</span></p>
        <p>📄 설명: <span class="ev-description">${dto.description ?? ""}</span></p>
        <p>🗺 장소: <span class="ev-location">${dto.location ?? ""}</span></p>
        <p>🕒 시작: <span class="ev-start">${dto.start?.date || ""} ${dto.start?.time || ""}</span></p>
        <p>🕒 종료: <span class="ev-end">${dto.end?.date || ""} ${dto.end?.time || ""}</span></p>

        <button class="btn-view" onclick="window.open('http://calendar.google.com/')">캘린더에서 보기</button>
        <button class="btn-edit">수정</button>
    `;

    chat.appendChild(card);
    chat.scrollTop = chat.scrollHeight;

    const editBtn = card.querySelector(".btn-edit");
    editBtn.onclick = () => openEditModal(dto);
}


/* -------------------------------------------
🍞 Toast
-------------------------------------------*/
function showToast(text) {
    const toast = document.getElementById("toast");
    toast.innerText = text
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
}

/* -------------------------------------------
⏳ 로딩 메시지
—————————————————————*/
function showLoadingMessage() {
    addMessage("⏳ AI가 일정을 분석하고 있어요…", "ai");
}

/* -------------------------------------------
📷 이미지 업로드 (파일 이름 표시 + 로딩 메세지)
-------------------------------------------*/
document.querySelector(".clip-btn").addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";

    fileInput.onchange = async () => {
        imageFile = fileInput.files[0];
        if (!imageFile) return;

        // 파일 명 보여주기
        addImgMessage(`📎 선택한 이미지: ${imageFile.name}`, "user")
    }

    fileInput.click();
})

/* -------------------------------------------
💬 일정 전송
-------------------------------------------*/
async function callAiChat() {
    showLoadingMessage();

    const prompt = document.getElementById("userInput").value;

    const formData = new FormData();

    // prompt만 있을 수도 있음
    if (prompt && prompt.trim() !== "") {
        formData.append("prompt", prompt);
    }

    // 이미지가 있을 수도 있음
    if (imageFile) {
        formData.append("image", imageFile);
    }

    const apiUrl = 'http://localhost:8888/api/ai/schedule';
    const googleAuthStartUrl = 'http://localhost:8888/login/oauth2/code/google';

    document.getElementById("userInput").value = ""

    // fetch 요청 시작
    fetch(apiUrl, {
        method: 'POST',
        // **쿠키(세션)를 반드시 포함하여 서버로 보냅니다.**
        credentials: 'include',
        body: formData
    })

    // -----------------------------------------------------
    // 2. 응답 상태 코드 확인 및 인증 오류 처리 (핵심)
    // -----------------------------------------------------
    .then(response => {
        document.getElementById("userInput").value = ""

        // HTTP 401 Unauthorized 코드는 로그인이 필요하다는 의미
        if (response.status === 401) {
            addMessage("🔒 세션이 만료되었습니다. 로그인이 필요합니다.", "ai");

            // 1초 후 로그인 페이지로 이동하여 OAuth를 시작합니다.
            setTimeout(() => {
                window.location.href = googleAuthStartUrl;
            }, 1000);

            // Promise 체인 중단: 응답을 JSON으로 파싱하지 않고 바로 에러를 던집니다.
            // (이 에러는 아래 .catch에서 잡히지 않도록 return 문으로 처리해야 함)
            throw new Error('Unauthorized');
        }

        // 401 외의 다른 오류 상태 (예: 404, 500 등) 처리
        if (!response.ok) {
            addMessage(`❌ 서버 오류 발생: ${response.status}`, "ai");
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // 응답을 JSON으로 파싱하여 다음 .then으로 넘깁니다.
        return response.json();
    })

    // -----------------------------------------------------
    // 3. 응답 데이터 처리 (성공 시)
    // -----------------------------------------------------
    .then(data => {
        // 성공적으로 데이터가 넘어왔을 때 실행됩니다.

        // 최종 AI 메시지 표시
        addMessage("일정이 성공적으로 생성되었습니다.", "ai");
        createEventCard(data)
        showToast("Google Calendar에 일정이 추가되었습니다 ✔");
    })

    // -----------------------------------------------------
    // 4. 네트워크 또는 예상치 못한 오류 처리
    // -----------------------------------------------------
    .catch(error => {
        // 'Unauthorized' 에러는 이미 처리되었으므로 무시합니다.
        if (error.message === 'Unauthorized') {
            return;
        }

        // TypeError: Failed to fetch (네트워크 연결 실패) 또는 JSON 파싱 오류 처리
        addMessage("⚠️ 요청 실패: 서버 연결 상태나 URL을 확인하세요.", "ai");
        console.error(error);
    });
}

/* -------------------------------------------
✏ 수정 모달
-------------------------------------------*/
let currentEditEvent = null; //

// 일정 수정
function openEditModal(dto) {
    console.log(
        "기존 : " + JSON.stringify(currentEditEvent) +
        ", 새로받은 : " + JSON.stringify(dto)
    );
    currentEditEvent = structuredClone(dto); // dto 복사

    document.getElementById("editTitle").value = dto.title || "";
    document.getElementById("editDescription").value = dto.description || "";
    document.getElementById("editLocation").value = dto.location || "";
    document.getElementById("editStartDate").value = dto.start?.date || "";
    document.getElementById("editStartTime").value = dto.start?.time || "";
    document.getElementById("editEndDate").value = dto.end?.date || "";
    document.getElementById("editEndTime").value = dto.end?.time || "";

    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    const editModal = document.getElementById('editModal');

    if (editModal) {
        // 모달 요소 내부에서만 검색하여 충돌 방지
        const saveButton = editModal.querySelector(".modal-btn.save");

        if (saveButton) {
            saveButton.addEventListener("click", saveEdit);
        }
    }
});

/* -------------------------------------------
💾 수정 저장 → Spring 업데이트 → UI 적용
-------------------------------------------*/
async function saveEdit() {
    currentEditEvent.title = document.getElementById("editTitle").value;
    currentEditEvent.description = document.getElementById("editDescription").value;
    currentEditEvent.location = document.getElementById("editLocation").value;
    currentEditEvent.start = {
        date: document.getElementById("editStartDate").value,
        time: document.getElementById("editStartTime").value
    };
    currentEditEvent.end = {
        date: document.getElementById("editEndDate").value,
        time: document.getElementById("editEndTime").value
    };

    const response = await fetch("/updateEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentEditEvent),
        credentials: "include"
    });

    const updated = await response.json();
    console.log("Updated:", updated);

    const parseDateTime = (value) => {
        if (!value) return { date: "", time: "" };
        if (typeof value === "object") return { date: value.date || "", time: value.time || "" };
        if (typeof value === "string") {
            const [date, timeWithZone] = value.split("T");
            const time = timeWithZone ? timeWithZone.substring(0, 5) : "";
            return { date, time };
        }
        return { date: "", time: "" };
    };

    const startParsed = parseDateTime(currentEditEvent.start);
    const endParsed = parseDateTime(currentEditEvent.end);

    const card = document.querySelector(`.event-card[data-id="${currentEditEvent.id}"]`);
    if (card) {
        console.log("카드 수정")
        card.querySelector(".ev-title").textContent = currentEditEvent.title;
        card.querySelector(".ev-description").textContent = currentEditEvent.description || "";
        card.querySelector(".ev-location").textContent = currentEditEvent.location || "";
        card.querySelector(".ev-start").textContent = `${startParsed.date} ${startParsed.time}`;
        card.querySelector(".ev-end").textContent = `${endParsed.date} ${endParsed.time}`;

        // 🔥 최신 DTO 세팅
        // const newDto = { title: currentEditEvent.title, start: startParsed, end: endParsed };

        // 🔥 새 DTO를 버튼에 다시 바인딩
        const editBtn = card.querySelector(".btn-edit");
        editBtn.onclick = () => openEditModal(currentEditEvent);
    }

    closeEditModal();
    showToast("Google Calendar에 일정이 수정되었습니다 ✔");
}

/* -------------------------------------------
크롤링
-------------------------------------------*/
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // 폼 기본 제출 막기

    const id = document.getElementById("loginStudentId").value;
    const pw = document.getElementById("loginPassword").value;

    // 서버로 POST
    try {
        const response = await fetch("/api/crawl/schedule", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: id,
                pw: pw
            })
        });

        if (response)
            closeLoginModal()
            addMessage("학교 일정이 추가되었습니다.", "ai")
        // const result = await response.json();
    } catch (error) {
        alert(error.message)
    }
})

function openLoginModal() {
    document.getElementById("loginModal").style.display = "flex";
}

function closeLoginModal() {
    document.getElementById("loginModal").style.display = "none";
}