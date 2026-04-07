# 📅 Calainder: AI 기반 지능형 일정 관리 서비스

> **"Record Less, Remember More"** - 덜 기록하고 더 많이 기억하는 스마트 비서

## 1. Project Overview
사용자가 업로드한 캡처 이미지나 텍스트에서 AI가 일정을 자동으로 추출하고, 대학 LMS(E-Class)의 과제 일정을 수집하여 구글 캘린더와 실시간 동기화하는 서비스입니다.

## 2. Tech Stack
- **Backend:** Java (Spring Boot)
- **AI Module:** Python, OpenAI API
- **Automation:** **Playwright (Python)**
- **API/Auth:** Google Calendar API, **OAuth 2.0**

## 3. My Role & Contributions (Team Lead)
- **[기획 및 총괄]** 프로젝트 킥오프, 슬로건 수립, 유스케이스 및 시퀀스 다이어그램 설계.
- **[AI 분석 엔진 개발]** OpenAI API를 연동하여 비정형 데이터에서 일정(제목, 일시, 장소)을 정확히 추출하는 **Python 기반 분석 로직** 구현.
- **[과제 크롤링 자동화]** **Playwright**를 활용하여 대학 E-Class의 과제 데이터를 자동으로 수집하는 엔진 개발.
- **[구글 연동 및 보안]** **OAuth 2.0** 기반의 구글 계정 연동 및 일정 자동 등록 시스템 총괄 제작.
- **[QA]** 서비스 시나리오별 기능 검증 및 최종 통합 테스트 주도.
