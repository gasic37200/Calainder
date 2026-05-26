import base64
import json
import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Body
from openai import BadRequestError, OpenAI

from prompts import build_image_prompt, build_text_prompt



app = FastAPI()

load_dotenv(override=True)

MODEL_NAME = "gpt-5-chat-latest"
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# () -> tuple[] 반환 타입 힌트
def get_prompt_context() -> tuple[str, str]:
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    today = str(now.date())
    current_datetime = now.strftime("%Y-%m-%d %H:%M")
    return today, current_datetime

def parse_response_json(result_text: str):
    try:
        return json.loads(result_text)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse model output as JSON: %s", result_text)
        raise HTTPException(
            status_code=400,
            detail="일정 분석에 실패하였습니다."
        ) from exc


@app.post("/api/ai/schedule/text")
async def text_schedule(prompt: str = Body(..., embed=True)):
    today, current_datetime = get_prompt_context()
    developer_text = build_text_prompt(today, current_datetime)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "developer",
                "content": [
                    {
                        "type": "input_text",
                        "text": developer_text,
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": prompt,
                    }
                ],
            },
        ],
    )

    parsed = parse_response_json(response.output_text)
    print(parsed)
    return parsed


@app.post("/api/ai/schedule/image")
async def image_schedule(
    prompt: str = Form(""),
    image: UploadFile = File(...),
):
    print("prompt:", prompt)
    print("image:", image.filename if image else None)

    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 파일만 업로드할 수 있습니다.",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{image.content_type};base64,{encoded_image}"
    today, current_datetime = get_prompt_context()
    developer_text = build_image_prompt(today, current_datetime)

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "developer",
                    "content": [
                        {
                            "type": "input_text",
                            "text": developer_text,
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt or ""},
                        {"type": "input_image", "image_url": data_url},
                    ],
                },
            ],
        )
    except BadRequestError as exc:
        logger.warning("OpenAI image analysis request failed: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="이미지를 분석할 수 없습니다. 시간, 날짜, 일정 내용이 보이는 이미지인지 확인해주세요.",
        ) from exc

    parsed = parse_response_json(response.output_text)
    print(parsed)
    return parsed
