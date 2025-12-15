from datetime import datetime, timedelta
from fastapi import FastAPI
from dotenv import load_dotenv
import os

from playwright.async_api import async_playwright, TimeoutError

load_dotenv(override=True)

app = FastAPI()

@app.post("/api/crawl/schedule")
async def crawl_schedule(
        req: dict
):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 브라우저 눈으로 확인하려면 False
        page = await browser.new_page()

        # 사이트 열기
        # page.goto("https://cyber.mjc.ac.kr/home/mainHome/Form/main")
        await page.goto(
            "https://cyber.mjc.ac.kr/home/mainHome/Form/main",
            wait_until="networkidle",
            timeout=60000  # 60초로 늘림
        )

        close_btn = page.locator("#closeButton1")

        if await close_btn.count() > 0:
            await close_btn.click()

        # 아이디 입력 필드가 나타날 때까지 기다림
        await page.wait_for_selector('input[name="id"]')

        aes_key = os.getenv("AES_KEY")
        # 아이디, 비밀번호 입력
        await page.fill('input[name="id"]', decrypt(aes_key, req.get("cryptId")))
        await page.fill('input[name="password"]', decrypt(aes_key, req.get("cryptPw")))

        # 로그인 버튼 클릭
        await page.click('div#btnLogin')
        await page.wait_for_timeout(2000)

        await page.context.storage_state(path="mjc_state.json")

        await page.goto(
            "https://cyber.mjc.ac.kr/home/mainHome/Form/schCalendar",
            wait_until="networkidle",
            timeout=60000
        )
        await page.click('span.ui.selection.fluid.dropdown')
        await page.wait_for_selector('li[data-action="toggle-weekly"]')
        await page.click('li[data-action="toggle-weekly"]')
        await page.wait_for_timeout(1000)

        plus_btn = page.locator("span.tui-full-calendar-weekday-exceed-in-week")
        if await plus_btn.count() > 0:
            await plus_btn.first.click()
        await page.wait_for_timeout(1000)

        events = page.locator(
            ".tui-full-calendar-weekday-schedule a[href^='javascript:fnChangeStrToLink']"
        )
        total = await events.count()
        print(total)

        today = datetime.today().strftime("%Y-%m-%d")

        results = []

        for i in range(total):
            print(f"이벤트 {i+1} 처리 중")
            ev = events.nth(i)
            await ev.scroll_into_view_if_needed()

            # info-item-box가 스크롤링 후 안정화될 때까지 잠시 대기
            await page.wait_for_timeout(300)

            try:
                # 3. 안정화된 후 클릭 재시도
                await ev.click(timeout=10000)

            except TimeoutError as e:
                print(f"클릭 타임아웃 발생 후 JS 강제 클릭 시도: {e}")
                # 4. (최후의 수단) Playwright 클릭이 실패했을 경우, JavaScript를 주입하여 강제로 클릭 이벤트 발생
                try:
                    await ev.evaluate('element => element.click()')
                    print("-> JavaScript를 이용한 클릭 성공")
                except Exception as js_err:
                    print(f"-> JavaScript 강제 클릭도 실패: {js_err}")
                    # 이 시점에선 팝업이 열리지 않았을 것이므로 다음 루프로 이동합니다.
                    continue

            # 2. 팝업이 로드될 때까지 명시적으로 대기
            await page.wait_for_selector(".tui-full-calendar-popup-detail", state='visible')

            title = await page.locator("span.tui-full-calendar-schedule-title a").inner_text()
            duration = await page.locator("div.tui-full-calendar-popup-detail-date.tui-full-calendar-content").inner_text()
            sub = await page.locator("span.tui-full-calendar-content").inner_text()

            if parse_duration(duration)[2] < today:
                continue

            start_date, start_time = parse_duration(duration)[0], parse_duration(duration)[1]
            end_date, end_time = parse_duration(duration)[2], parse_duration(duration)[3]

            results.append({
                "title": title,
                "description": sub,
                "start": {
                    "date": start_date,
                    "time": start_time,
                },
                "end": {
                    "date": end_date,
                    "time": end_time,
                }
            })

            print(f"{i+1} 안전 영역(학습일정 제목) 클릭하여 팝업 닫기 시도")
            await page.click('h2:has-text("학습일정")')

            # 팝업이 사라지는 것을 확인하거나 잠시 대기
            await page.wait_for_selector(".tui-full-calendar-popup-detail", state='hidden')

    if results is None:
        return { "error_text": "일정이 없습니다." }

    print(results)
    return results

import re

def parse_duration(duration):
    # 2025.09.05 00:01 am - 2025.12.07 11:59 pm
    # \d - 갯수, \s - 공백
    patterns = {
        (
            r"(\d{4}.\d{2}.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
            r"\s*-\s*"
            r"(\d{4}\.\d{2}\.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
        ),
        (
            r"(\d{4}.\d{2}.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
            r"\s*-\s*"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
        )
    }

    match = None

    for pattern in patterns:
        match = re.search(pattern, duration)
        if match:
            break

    if match is None:
        raise ValueError("Format not recognized")

    if len(match.groups()) == 6:
        start_date, start_time, start_ampm, end_date, end_time, end_ampm = match.groups()
    else:
        start_date, start_time, start_ampm, end_time, end_ampm = match.groups()
        end_date = start_date

    start_date_fmt = datetime.strptime(start_date, "%Y.%m.%d").strftime("%Y-%m-%d")
    end_date_fmt = datetime.strptime(end_date, "%Y.%m.%d").strftime("%Y-%m-%d")

    st = datetime.strptime(f"{start_time}", "%H:%M")
    et = datetime.strptime(f"{end_time}", "%H:%M")

    st += timedelta(hours=0) if start_ampm == "am" else timedelta(hours=12)
    et += timedelta(hours=0) if end_ampm == "am" else timedelta(hours=12)

    start_time_fmt = st.strftime("%H:%M")
    end_time_fmt = et.strftime("%H:%M")

    return start_date_fmt, start_time_fmt, end_date_fmt, end_time_fmt

from Crypto.Cipher import AES
import base64

def decrypt(key: str, encrypted: str) -> str:
    # key는 16, 24, 32 바이트 중 하나여야 함
    key_bytes = key.encode('utf-8')

    # AES ECB 모드
    cipher = AES.new(key_bytes, AES.MODE_ECB)

    # Base64 디코딩
    encrypted_bytes = base64.b64decode(encrypted)

    # 복호화
    decrypted_bytes = cipher.decrypt(encrypted_bytes)

    # PKCS5/PKCS7 padding 제거
    pad_len = decrypted_bytes[-1]
    decrypted_bytes = decrypted_bytes[:-pad_len]

    return decrypted_bytes.decode('utf-8')