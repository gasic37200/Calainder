async function callAiChat() {
    const prompt = document.getElementById("prompt").value;
    const imageFile = document.getElementById("imageInput").files[0];

    const formData = new FormData();

    // prompt만 있을 수도 있음
    if (prompt && prompt.trim() !== "") {
        formData.append("prompt", prompt);
    }

    // 이미지가 있을 수도 있음
    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {
        const response = await fetch('/api/ai/schedule', {
            method: "POST",
            body: formData,
        })

        const result = await response.json();
    } catch (error) {
        alert(error.message)
    }
}

document.querySelector(".crawling").addEventListener("submit", async (e) => {
    e.preventDefault(); // 폼 기본 제출 막기

    const id = document.getElementById("id").value;
    const pw = document.getElementById("pw").value;

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
    } catch (error) {
        alert(error.message)
    }

    const result = await response.json();
    console.log(result);
});