import base64
from openai import OpenAI
from fastapi import FastAPI, File, UploadFile, Form
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json

load_dotenv(override=True)  # .env 읽어오기

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

today = datetime.now().date()
createId = datetime.now().strftime("%Y%m%d%H%M%S%f")
developer_text = f"""
    오늘은 {today}입니다. 
    사용자의 대화 내용을 분석하여, 확정된 일정 한 개를 JSON으로 생성한다. 
    출력은 반드시 순수 JSON 객체만 반환해야 한다. 
    JSON 앞뒤에 텍스트, 설명, 코드블록(예: ```json) 등을 절대 포함하지 않는다. 
    JSON은 반드시 {{ 로 시작해서 }} 로 끝나야 한다. 

    일정 판단 규칙: 
    1) 가능?, 어때?, 18일?, 갈까? 등 질문형/제안형 표현은 확정된 일정이 아니다. 
    2) 화요일이나 목요일, 17일 또는 18일 같은 선택형 표현은 확정된 일정이 아니다. 
    3) 여러 날짜가 등장할 경우 대화의 마지막에 명확하게 확정된 일정만 결과로 채택한다. 
    4) 반복 규칙은 사용자가 명확하게 언급한 경우에만 설정한다. 예: 매주 월요일, 매달 첫째 주 등 
    5) 확정된 일정이 전혀 없으면 기본값으로 JSON을 구성한다. 

    JSON 구조는 반드시 다음과 같다: 
    {{ 
      id: null
      title: 일정 제목(내용 요약) 
      description: 일정 설명 
      location: 장소 
      start: {{ date: YYYY-MM-DD, time: HH:MM }} 
      end: {{ date: YYYY-MM-DD, time: HH:MM }} 
      recurrence: 반복 규칙 문자열 또는 null 
      success: true 
    }} 

    기본값 규칙: 
    id: null
    location: null 
    fstart.date: {today} 
    fend.date: {today} 
    start.time: 09:00 
    end.time: 10:00 
    recurrence: null 
    success: false
    시작 날짜만 존재하면 end.date는 start.date와 동일하게 설정한다. 

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
        # GPT가 JSON 구조를 유지 못 했을 경우 대비
        parsed = {"raw_text": result_text}

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


    # 이미지 raw bytes
    image_bytes = await image.read()

    # base64 변환(binary -> byte -> string)
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    # url 생성
    data_url = f"data:{image.content_type};base64,{encoded_image}"

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

    result_text = response.output_text

    try:
        parsed = json.loads(result_text)
    except:
        parsed = {"raw_text": result_text}

    print(parsed)

    return parsed