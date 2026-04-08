# 📅 Calainder
> **"Record Less, Remember More"** - AI 기반 지능형 일정 관리 및 자동 동기화 서비스

## 1. Project Overview
일상의 다양한 정보(이미지, 텍스트)를 AI가 분석하여 일정을 자동 생성하고, 구글 캘린더 및 대학 LMS(E-Class)와 연동하여 사용자의 수동 입력 없이 일정을 관리하는 서비스입니다.

## 2. Tech Stack & Tools
- **Main Framework:** `Java (Spring Boot)`
- **AI Engine:** `Python`, `OpenAI API (GPT-4)`
- **Automation:** `Playwright (Python)`
- **Authentication:** `OAuth 2.0 (Google Calendar API)`

## 3. My Role & Contributions (Team Lead)
- **AI 스케줄링 로직 설계:** 비정형 텍스트 및 캡처 이미지에서 제목, 날짜, 시간 정보를 추출하는 **Python 기반 AI 분석 모듈**을 개발했습니다.
- **LMS 데이터 자동화:** **Playwright**를 활용하여 대학 E-Class의 과제 마감 기한을 실시간으로 크롤링하고 시스템에 동기화하는 엔진을 구축했습니다.
- **시스템 아키텍처 설계:** 조장으로서 **유스케이스(Usecase) 및 시퀀스 다이어그램**을 설계하여 AI 분석 결과가 서버를 거쳐 구글 캘린더로 전달되는 전체 흐름을 정의했습니다.
- **QA 및 기능 통합:** AI 분석 실패 시 예외 처리 로직 및 API 연동 정합성 검증을 총괄했습니다.

## 4. 핵심 프로세스 (Sequence Diagram)
1. **User:** 텍스트/이미지 업로드
2. **Spring Boot:** Python AI 모듈로 데이터 전송
3. **AI Module:** OpenAI API 분석 후 일정(JSON) 반환
4. **Spring Boot:** Google Calendar API 연동 및 자동 등록 완료
