package com.example.demo.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStreamReader;
import java.util.Collections;

@Service
public class CalendarService {

    private static final String APPLICATION_NAME = "My Calendar App";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String TOKENS_DIRECTORY_PATH = "tokens"; // 프로젝트 폴더 내 저장

    public Calendar getCalendarService() throws Exception {
        // HTTP 통신용 Transport 생성
        var httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        // JSON 처리용 Factory
        var jsonFactory = GsonFactory.getDefaultInstance();

        // credentials.json 읽기
        var in = getClass().getResourceAsStream("/credentials.json");
        var clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));

        // 토큰 저장 위치 지정
        var dataStoreFactory = new FileDataStoreFactory(new File(TOKENS_DIRECTORY_PATH));

        // OAuth 인증 설정
        var flow = new GoogleAuthorizationCodeFlow.Builder(
                httpTransport,
                JSON_FACTORY,
                clientSecrets,
                Collections.singleton(CalendarScopes.CALENDAR))
                .setDataStoreFactory(dataStoreFactory)
                .setAccessType("offline")
                .build();

        // 로컬 서버로 OAuth 인증 코드 받기
        var receiver = new LocalServerReceiver.Builder()
                .setPort(8888)  // 포트 고정
                .setCallbackPath("/Callback")
                .build();

        // OAuth 인증 수행
        var credential = new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");

        // Calendar 서비스 객체 생성
        return new Calendar.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * 테스트용 main 메서드
     * Google Calendar에 있는 기본 이벤트 출력
     */
    public static void main(String[] args) throws Exception {
        CalendarService service = new CalendarService();
        Calendar calendar = service.getCalendarService();

        var events = calendar.events().list("primary").execute();
        System.out.println("=== 내 기본 캘린더 이벤트 ===");
        for (var event : events.getItems()) {
            System.out.println(event.getSummary());
        }
    }
}
