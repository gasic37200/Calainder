import base64
from openai import BadRequestError, OpenAI
from fastapi import FastAPI, File, HTTPException, UploadFile, Form
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json
import logging

load_dotenv(override=True)  # .env 읽어오기

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()
logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

today = datetime.now().date()
# createId = datetime.now().strftime("%Y%m%d%H%M%S%f")
developer_text = f"""
            오늘은 {today}입니다.
            
            사용자의 대화 내용을 분석하여 의도(intent)를 먼저 판단하고, 그 결과를 포함한 순수 JSON 객체 하나만 반환한다.
            출력은 반드시 JSON 객체만 반환해야 하며, JSON 앞뒤에 설명, 텍스트, 코드블록(예: ```json) 등을 절대 포함하지 않는다.
            응답은 반드시 {{ 로 시작해서 }} 로 끝나야 한다.
            
            의도 분류 규칙:
            1. 사용자가 일정을 새로 만들거나 등록하려는 경우 intent는 "create"이다.
            2. 사용자가 특정 날짜/시간의 일정을 확인하거나 조회하려는 경우 intent는 "saved"이다.
            3. 질문형, 제안형, 선택형 표현만 사용하여 일정 또는 조회 기준이 확정되지 않은 경우 success는 false이다.
            4. 수정과 삭제는 여기서 판단하지 않는다. 수정과 삭제는 카드 UI에서 처리한다고 가정한다.
            5. 여러 날짜가 등장할 경우, 대화의 마지막에 기준이 되는 날짜와 시간을 우선으로 해석한다.
            
            판단 예시:
            - "내일 오전 10시에 친구 만나기 추가해줘" -> intent: "create", success: true
            - "내일 오전 10시에 약속 있어?" -> intent: "saved", success: true
            - "금요일 어때?" -> success: false
            - "17일 또는 18일에 보자" -> success: false
            
            JSON 구조는 반드시 다음과 같다:
            {{
                "id": null,
                "title": 일정 제목(내용 요약) 또는 null,
                "description": 일정 설명 또는 null,
                "location": 장소 또는 null,
                "start": {{ "date": "YYYY-MM-DD", "time": "HH:MM" }},
                "end": {{ "date": "YYYY-MM-DD", "time": "HH:MM" }},
                "recurrence": 반복 규칙 문자열 또는 null,
                "reminderEnabled": true 또는 false,
                "reminderMinutes": 알림 분 또는 null,
                "intent": "create" | "saved" | null,
                "success": true 또는 false
            }}
            
            세부 규칙:
            1. intent가 "create"이면 확정된 일정 정보를 채운다.
            2. intent가 "saved"이면 조회 기준이 되는 날짜/시간 범위를 채운다.
            3. 생성이든 조회든 유효한 날짜/시간 데이터가 해석되면 success는 true이다.
            4. 아무것도 확정되지 않았거나 조회 기준도 불명확하면 success는 false이다.
            5. 반복 규칙은 사용자가 명확하게 언급한 경우에만 설정한다. 예: 매주 월요일, 매달 첫째 주
            6. 시작 날짜만 존재하면 end.date는 start.date와 동일하게 설정한다.
            7. 시작 시간만 존재하면 종료 시간은 시작 시간 1시간 뒤로 설정한다.
            8. 시작 시간에 1시간을 더했을 때 자정을 넘기면 end.date는 다음 날로 설정한다.
            9. 종료 일시는 항상 시작 일시보다 늦거나 같아야 한다.
            10. intent가 "saved"이고 사용자가 날짜만 말한 경우, 해당 날짜의 조회 범위는 00:00부터 23:59까지로 설정한다.
            11. intent가 "saved"이고 사용자가 날짜와 시간까지 명확히 지정한 경우에만 그 시간 범위를 사용한다.
            12. 장소 정보가 없으면 location은 null이다.
            
            기본값 규칙:
            - id: null
            - title: null
            - description: null
            - location: null
            - start.date: {today}
            - end.date: {today}
            - start.time: "09:00"
            - end.time: "10:00"
            - recurrence: null
            - reminderEnabled: false
            - reminderMinutes: null
            - intent: null
            - success: false
            
            출력 조건:
            반드시 순수 JSON만 출력한다.
            JSON 외 텍스트는 절대 포함하지 않는다.
            코드블록 사용 금지.
        """

@app.post("/api/ai/schedule/text")
async def text_schedule(data: dict):
    prompt = data["prompt"]

    response = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "developer",
                "content": [
                    {
                        "type": "input_text",
                        "text": developer_text
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": prompt
                    }
                ]
            }
        ]
    )

    # GPT가 만든 텍스트 (JSON 형태일 확률이 매우 높음)
    result_text = response.output_text

    # JSON 파싱 시도
    try:
        parsed = json.loads(result_text)
    except:
        raise HTTPException(
            status_code=400,
            detail="일정 분석에 실패하였습니다."
        )

    print(parsed)

    # 클라이언트(Spring Boot 등)로 JSON 응답
    return parsed

@app.post("/api/ai/schedule/image")
async def image_schedule(
        prompt: str = Form(None),
        image: UploadFile = File(...)
):
    print("prompt:", prompt)
    print("image:", image.filename if image else None)

    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 파일만 업로드할 수 있습니다."
        )

    # 이미지 raw bytes
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어 있습니다.")

    # base64 변환(binary -> byte -> string)
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    # url 생성
    data_url = f"data:{image.content_type};base64,{encoded_image}"

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "developer",
                    "content": [
                        {
                            "type": "input_text",
                            "text": developer_text
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt or ""},
                        {"type": "input_image", "image_url": data_url},
                    ]
                }
            ]
        )
    except BadRequestError as e:
        logger.warning("OpenAI image analysis request failed: %s", e)
        raise HTTPException(
            status_code=400,
            detail="이미지를 분석할 수 없습니다.\n시간, 날짜, 일정 내용이 보이는 이미지인지 확인해주세요."
        )

    result_text = response.output_text

    try:
        parsed = json.loads(result_text)
    except:
        raise HTTPException(
            status_code=400,
            detail="일정 분석에 실패하였습니다."
        )

    print(parsed)

    return parsed
