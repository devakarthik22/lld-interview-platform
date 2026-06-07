package com.lld.interview;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class LldInterviewApplication {
    public static void main(String[] args) {
        SpringApplication.run(LldInterviewApplication.class, args);
    }
}
