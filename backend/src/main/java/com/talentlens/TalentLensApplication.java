package com.talentlens;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TalentLensApplication {
    public static void main(String[] args) {
        SpringApplication.run(TalentLensApplication.class, args);
    }
}
