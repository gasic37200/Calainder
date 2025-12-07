package com.calainder.server;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Base64;

public class KeyGen {
	public static void main(String[] args) throws Exception {
		KeyGenerator keyGen = KeyGenerator.getInstance("AES");
		keyGen.init(128); // 또는 192, 256
		SecretKey secretKey = keyGen.generateKey();

		String key = Base64.getEncoder().encodeToString(secretKey.getEncoded());
		System.out.println("AES Key = " + key);
	}
}
