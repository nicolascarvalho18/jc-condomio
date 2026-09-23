package com.jccondomio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class JcCondominioApplication {

    public static void main(String[] args) {
        SpringApplication.run(JcCondominioApplication.class, args);
    }
}
