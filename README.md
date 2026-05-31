# Calainder

> 텍스트와 이미지 속 일정 정보를 AI가 분석해 Google Calendar에 자동으로 등록해주는 AI 기반 일정 관리 서비스

## Overview

Calainder는 사용자가 일정을 직접 하나씩 입력해야 하는 기존 캘린더 사용의 불편함을 줄이기 위해 기획한 프로젝트입니다.
텍스트, 이미지와 같은 비정형 입력을 일정 데이터로 변환하고, 이를 실제 캘린더 서비스에 반영하는 흐름을 구현했습니다.

프로젝트는 Spring Boot 서버를 중심으로 Python 기반 AI 분석 모듈, E-Class 크롤러 모듈, Google Calendar API가 연동되는 구조로 설계되었으며, 일정 입력의 번거로움을 줄이고 익숙한 캘린더 환경과 자연스럽게 연결되는 경험을 목표로 합니다.

## 핵심 기능

- 텍스트 및 이미지 입력을 기반으로 일정 정보를 추출하는 AI 일정 분석 기능
- 분석된 일정을 Google Calendar에 자동 등록하는 일정 반영 기능
- Google OAuth2 기반 사용자 인증 및 Google Calendar 연동 기능
- E-Class 과제 일정 수집 및 캘린더 동기화 기능
- 일정 등록 이후 알림 설정으로 이어지는 Reminder 연계 흐름 설계

## 아키텍처

Calainder는 Spring Boot 서버를 중심 허브로 두고, Python 기반 AI 분석 모듈과 E-Class 크롤러 모듈, Google Calendar API를 연동하는 구조로 설계하였습니다.

### 구성 요소

- `Spring Boot 서버`: 사용자 요청 처리, 인증, 일정 처리, 외부 모듈 호출 담당
- `AI 분석 모듈`: 텍스트 및 이미지 입력을 분석하여 일정 정보 추출
- `E-Class 크롤러 모듈`: 학교 과제 및 일정 정보 수집
- `Google Calendar API`: 최종 일정 등록 및 알림 기능 처리

### 서버 구조

서버 내부 구조는 계층형 구조를 염두에 두고 설계하였습니다. 다만 현재 버전에서는 일정 데이터를 자체 데이터베이스에 저장하기보다 Google Calendar에 직접 반영하는 방식이 핵심이었기 때문에, 전형적인 `Controller-Service-Repository` 구조까지 두지는 않았습니다.

대신 `Controller-Service-DTO/Util` 구조를 기반으로 요청 처리, 비즈니스 로직, 데이터 변환 책임을 분리하여 현재 요구사항에 맞는 형태로 단순화하였습니다.

즉, 현재 구조는 완전한 마이크로서비스 아키텍처보다는 Spring Boot 중심의 통합형 서버 위에 AI 분석 및 크롤링 기능을 독립 모듈로 분리한 형태에 가깝습니다.

### 보안 처리

E-Class 연동 시 사용자의 로그인 정보를 평문으로 전달하지 않도록, 서버에서 AES 기반 대칭키 방식으로 암호화한 뒤 크롤러 모듈에 전달하도록 구현하였습니다.

## 기술 스택

Calainder는 Spring Boot 기반 백엔드 서버를 중심으로, Python 기반 AI 분석 모듈과 크롤러 모듈을 연동하는 구조로 구성하였습니다.

| 분류 | 기술 |
|---|---|
| Backend | Java, Spring Boot, Spring Security, OAuth2 Client |
| AI 분석 모듈 | Python, FastAPI, OpenAI API |
| 크롤러 모듈 | Python, Playwright |
| Frontend | Thymeleaf, HTML, CSS, JavaScript |
| 외부 연동 | Google Calendar API |
| 보안 | AES 기반 대칭키 암호화 |
| 배포 및 인프라 | Docker, Docker Compose, AWS EC2 |
| 확장 고려 | AWS RDS, AWS S3, GitHub Actions |

## 담당 역할

프로젝트에서 백엔드 개발을 담당하며, Spring Boot 서버를 중심으로 AI 분석 모듈, E-Class 크롤러 모듈, Google Calendar API를 연결하는 핵심 기능을 구현하였습니다.

- 텍스트 및 이미지 입력을 AI 분석 모듈로 전달하고 일정 정보를 추출하는 API 흐름 구현
- AI 분석 결과를 Google Calendar 이벤트 형식으로 변환하고 자동 등록하는 기능 구현
- Google OAuth2 로그인 및 Google Calendar API 연동 구현
- E-Class 크롤러 모듈과의 연동 구조 구현
- 사용자 아이디와 비밀번호를 AES 기반으로 암호화하여 크롤러 모듈에 전달하는 보안 처리 구현
- 일정 등록 이후 Reminder 기능으로 확장할 수 있는 흐름 설계
- 계층형 구조를 염두에 둔 Spring Boot 서버 구조 설계 및 정리

## 데이터 흐름

Calainder의 핵심 흐름은 사용자의 비정형 입력을 일정 데이터로 변환한 뒤, 이를 Google Calendar에 반영하는 구조로 이루어집니다.

1. 사용자가 텍스트 또는 이미지를 입력합니다.
2. Spring Boot 서버가 입력 데이터를 AI 분석 모듈로 전달합니다.
3. AI 분석 모듈이 제목, 날짜, 시간 등의 일정 정보를 추출합니다.
4. 서버는 분석 결과를 Google Calendar 이벤트 형식으로 변환합니다.
5. 변환된 일정은 Google Calendar에 등록됩니다.
6. 사용자는 Google Calendar에서 등록된 일정과 알림을 확인할 수 있습니다.

또한 학교 일정 연동 흐름에서는 E-Class 크롤러 모듈이 과제 및 일정 정보를 수집하고, 서버가 이를 다시 Google Calendar에 반영하도록 구성하였습니다.

## 보완한 점

- E-Class 연동 시 사용자 아이디와 비밀번호를 AES 기반 대칭키 방식으로 암호화하여 외부 모듈에 평문으로 전달되지 않도록 보완하였습니다.
- 일정 데이터를 자체 DB에 저장하기보다 Google Calendar에 직접 반영하는 구조로 단순화하여, 핵심 서비스 흐름인 일정 분석 및 등록에 집중할 수 있도록 구성하였습니다.
- 초기의 자체 캘린더 중심 UI 구상에서 벗어나, 채팅형 입력 기반 흐름으로 화면 구조를 재정리하여 서비스의 핵심 가치가 더 잘 드러나도록 방향을 수정하였습니다.
- AI 분석 모듈, 크롤러 모듈, Google Calendar API를 역할별로 분리하여 서버가 외부 기능을 통합 관리할 수 있도록 구조를 정리하였습니다.

## 개선 예정 사항

- AI 분석 및 크롤러 요청에 대한 비동기 처리 구조를 도입하여 응답 지연을 줄일 예정
- API 예외 처리 및 응답 형식을 일관되게 정리하여 안정성을 높일 예정
- Reminder 설정 UI와 Google Calendar 알림 옵션 연동을 고도화할 예정
- 일정 히스토리, 분석 로그, 사용자 맞춤 기능을 위한 데이터 저장 구조를 확장할 예정
- Docker Compose 및 AWS 배포 환경 구성을 정리하여 실행 및 배포 과정을 표준화할 예정
- 테스트 코드 및 검증 자동화를 보강하여 유지보수성을 높일 예정
