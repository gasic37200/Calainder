from datetime import datetime
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from playwright.async_api import async_playwright, TimeoutError
from Crypto.Cipher import AES
import os
import re
import base64
import traceback

load_dotenv(override=True)

app = FastAPI()

POPUP_SELECTOR = ".tui-full-calendar-popup-detail"
EVENT_SELECTOR = ".tui-full-calendar-weekday-schedule a[href^='javascript:fnChangeStrToLink']"


async def close_popup_if_open(page):
    popup = page.locator(POPUP_SELECTOR)

    if await popup.count() == 0 or not await popup.is_visible():
        return

    await page.click('h2:has-text("학습일정")')
    await page.wait_for_selector(POPUP_SELECTOR, state="hidden", timeout=3000)


@app.post("/api/crawl/schedule")
async def crawl_schedule(req: dict):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto(
                "https://cyber.mjc.ac.kr/home/mainHome/Form/main",
                wait_until="networkidle",
                timeout=60000
            )

            close_btn = page.locator("#closeButton1")
            if await close_btn.count() > 0:
                await close_btn.click()

            await page.wait_for_selector('input[name="id"]')

            aes_key = os.getenv("AES_KEY")
            await page.fill('input[name="id"]', decrypt(aes_key, req.get("cryptId")))
            await page.fill('input[name="password"]', decrypt(aes_key, req.get("cryptPw")))

            await page.click('div#btnLogin')
            await page.wait_for_timeout(1500)

            note_box = page.locator("#note-box.warning")
            if await note_box.count() > 0 and await note_box.is_visible():
                error_text = (await note_box.locator("p").inner_text()).strip()
                if "아이디 또는 암호가 맞지 않습니다" in error_text:
                    raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

            await page.goto(
                "https://cyber.mjc.ac.kr/home/mainHome/Form/schCalendar",
                wait_until="networkidle",
                timeout=60000
            )

            await page.click('span.ui.selection.fluid.dropdown')
            await page.wait_for_selector('li[data-action="toggle-weekly"]')
            await page.click('li[data-action="toggle-weekly"]')
            await page.wait_for_timeout(200)

            plus_btn = page.locator("span.tui-full-calendar-weekday-exceed-in-week")
            if await plus_btn.count() > 0:
                await plus_btn.first.click()
            await page.wait_for_timeout(200)

            events = page.locator(EVENT_SELECTOR)
            total = await events.count()
            today = datetime.today().strftime("%Y-%m-%d")
            results = []

            for i in range(total):
                ev = events.nth(i)
                await ev.scroll_into_view_if_needed()
                await page.wait_for_timeout(100)

                try:
                    await ev.click(timeout=10000)
                except TimeoutError:
                    try:
                        await ev.evaluate("element => element.click()")
                    except Exception:
                        continue

                await page.wait_for_selector(POPUP_SELECTOR, state="visible", timeout=10000)

                title = await page.locator("span.tui-full-calendar-schedule-title a").inner_text()
                duration = await page.locator(
                    "div.tui-full-calendar-popup-detail-date.tui-full-calendar-content"
                ).inner_text()
                sub = await page.locator("span.tui-full-calendar-content").inner_text()

                start_date, start_time, end_date, end_time = parse_duration(duration)

                if start_date > today or end_date < today:
                    await close_popup_if_open(page)
                    continue

                results.append({
                    "title": title,
                    "description": sub,
                    "start": {"date": start_date, "time": start_time},
                    "end": {"date": end_date, "time": end_time},
                    "reminderEnabled": True,
                    "reminderMinutes": 30
                })

                await close_popup_if_open(page)

            await browser.close()

        if not results:
            raise HTTPException(status_code=404, detail="가져올 학교 일정이 없습니다.")

        return results

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print("crawl error:", repr(e), flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="학교 일정 연동 중 오류가 발생했습니다.")

def parse_duration(duration):
    patterns = [
        (
            r"(\d{4}\.\d{2}\.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)\s*-\s*"
            r"(\d{4}\.\d{2}\.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
        ),
        (
            r"(\d{4}\.\d{2}\.\d{2})\s+"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)\s*-\s*"
            r"(\d{2}:\d{2})\s*"
            r"(am|pm)"
        )
    ]

    match = None
    for pattern in patterns:
        match = re.search(pattern, duration)
        if match:
            break

    if not match:
        raise ValueError(f"Format not recognized: {duration}")

    if len(match.groups()) == 6:
        start_date, start_time, start_ampm, end_date, end_time, end_ampm = match.groups()
    else:
        start_date, start_time, start_ampm, end_time, end_ampm = match.groups()
        end_date = start_date

    start_date = datetime.strptime(start_date, "%Y.%m.%d").strftime("%Y-%m-%d")
    end_date = datetime.strptime(end_date, "%Y.%m.%d").strftime("%Y-%m-%d")

    start_time = to_24h(start_time, start_ampm)
    end_time = to_24h(end_time, end_ampm)

    return start_date, start_time, end_date, end_time


def to_24h(time_str, ampm):
    hour, minute = map(int, time_str.split(":"))

    if ampm == "am":
        if hour == 12:
            hour = 0
    else:
        if hour != 12:
            hour += 12

    return f"{hour:02d}:{minute:02d}"


def decrypt(key: str, encrypted: str) -> str:
    cipher = AES.new(key.encode("utf-8"), AES.MODE_ECB)
    decrypted = cipher.decrypt(base64.b64decode(encrypted))
    return decrypted[:-decrypted[-1]].decode("utf-8")
