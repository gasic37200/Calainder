# ===== Build stage =====
FROM eclipse-temurin:23-jdk AS build
WORKDIR /app


COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN ./gradlew dependencies || true

COPY src src
RUN ./gradlew bootJar

# ===== Run stage =====
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
