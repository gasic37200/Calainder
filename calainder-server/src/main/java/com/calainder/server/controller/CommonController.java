package com.calainder.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class CommonController {

	@GetMapping("/prompt")
	public String prompt() {
		return "index";
	}
}
