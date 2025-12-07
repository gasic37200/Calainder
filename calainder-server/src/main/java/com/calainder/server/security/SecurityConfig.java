package com.calainder.server.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
				.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/login/**", "/css/**", "/js/**", "/images/**").permitAll()
                        .requestMatchers("/api/**", "/addEvent", "/updateEvent", "/deleteEvent").authenticated()
                        .anyRequest().authenticated()
                )
                // ✅ CSRF 설정 추가 — 이 세 엔드포인트는 예외 처리
//                .csrf(csrf -> csrf
//                        .ignoringRequestMatchers("/addEvent", "/updateEvent", "/deleteEvent")
//                )
                .oauth2Login(oauth -> oauth
                        .defaultSuccessUrl("/", true)
                );

        return http.build();
    }
}
