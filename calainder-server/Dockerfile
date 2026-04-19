# 빌드용
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# 빌드를 위한 폴더를 /app 폴더에 넣음
# /app
# gradlew(Gradle Wrapper) gradle이 설치되지 않았어도 빌드를 도와주는 도구
COPY gradlew .
# /app/gradle
COPY gradle gradle
# /app
COPY build.gradle .
# /app
COPY settings.gradle .

# gradlew에 실행권한을 줌
RUN chmod +x gradlew
# gradle의 의존성 다운
RUN ./gradlew dependencies --no-daemon

# gradle 의존성 주입하였으니 코드를 /app/src로 복사
COPY src src

# Spring Boot 실행 가능한 jar 파일을 만듬
# jar 파일을 /app/build/libs/*.jar
# gradle이 빌드를 마치면 /build/libs에 저장
RUN ./gradlew clean bootJar --no-daemon

# 실행용
FROM eclipse-temurin:17-jre

WORKDIR /app

# 첫줄 build에서 만든 jar 파일을 /app/build/libs/에서
# *.jar 파일을 찾아 app.jar라는 이름으로 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 포트 8888
EXPOSE 8888

# 컨테이너 시작할 때 실행할 명령어
ENTRYPOINT ["java", "-jar", "app.jar"]