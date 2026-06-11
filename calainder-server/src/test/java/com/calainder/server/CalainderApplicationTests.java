package com.calainder.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"aes.key=1234567890123456",
		"spring.security.oauth2.client.registration.google.client-id=test-client-id",
		"spring.security.oauth2.client.registration.google.client-secret=test-client-secret"
})
class CalainderApplicationTests {

	@Test
	void contextLoads() {
	}

}
