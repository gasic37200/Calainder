FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Playwright 브라우저 경로
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["python", "main.py"]
