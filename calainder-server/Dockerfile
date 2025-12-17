# ===== Build Stage =====
FROM gradle:8.8-jdk17 AS build
WORKDIR /app

COPY . .
RUN gradle bootJar -x test --no-daemon

# ===== Run Stage =====
FROM eclipse-temurin:23-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar
COPY --from=build /app/.env .env

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
