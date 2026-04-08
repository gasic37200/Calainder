# 📅 Calainder
> **Record Less, Remember More** | AI 기반 일정 자동화 비서

<div align="left">
  <img src="https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white">
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white">
  <img src="https://img.shields.io/badge/OpenAI_API-412991?style=for-the-badge&logo=openai&logoColor=white">
</div>

---

## 📖 Project Overview
사용자가 올린 이미지/텍스트에서 AI가 일정을 추출하고, 대학 LMS 과제를 자동으로 수집하여 구글 캘린더에 동기화합니다.

## 🛠 My Core Contributions (Team Lead)
- **[AI]** `OpenAI API` 기반 비정형 데이터 일정 분석 엔진 개발 (Python)
- **[Automation]** `Playwright`를 활용한 E-Class 과제 정보 자동 크롤링 엔진 구축
- **[System]** `Spring Boot` 서버 아키텍처 및 `OAuth 2.0` 구글 연동 프로세스 설계
- **[PM]** 프로젝트 기획 총괄 및 시퀀스 다이어그램(Sequence Diagram) 수립

## 🔄 핵심 프로세스
> **AI 분석부터 캘린더 등록까지의 흐름**
1. **Input:** 유저의 이미지 또는 텍스트 업로드
2. **Analysis:** Python 모듈이 `GPT-4`를 통해 제목/일시/장소 JSON 파싱
3. **Sync:** Spring Boot 서버가 구글 API를 통해 캘린더 자동 등록 및 LMS 과제 동기화

---
