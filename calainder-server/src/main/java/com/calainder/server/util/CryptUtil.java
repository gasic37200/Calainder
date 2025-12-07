package com.calainder.server.util;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class CryptUtil {
	// AES 방식(대칭키)의 알고리즘으로 키값 암호화
	private static final String ALGO = "AES";

	public static String encrypt(String key, String data) throws Exception {
		SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(), ALGO);
		Cipher cipher = Cipher.getInstance("AES");
		cipher.init(Cipher.ENCRYPT_MODE, secretKey);
		return Base64.getEncoder().encodeToString(cipher.doFinal(data.getBytes()));
	}
}
