package com.jccondomio;

import com.jccondomio.security.RateLimitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitServiceTest {

    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        rateLimitService = new RateLimitService();
        ReflectionTestUtils.setField(rateLimitService, "maxAttempts", 5);
        ReflectionTestUtils.setField(rateLimitService, "lockoutMinutes", 15);
    }

    @Test
    @DisplayName("Bloquear após atingir o limite máximo de tentativas de login falhas")
    void testRateLimitBlocksAfterMaxAttempts() {
        String key = "192.168.1.1:admin@jccondomio.com.br";

        assertFalse(rateLimitService.isBlocked(key));

        for (int i = 1; i <= 4; i++) {
            rateLimitService.loginFailed(key);
            assertFalse(rateLimitService.isBlocked(key), "Ainda não deve estar bloqueado na tentativa " + i);
        }

        // 5ª tentativa falha
        rateLimitService.loginFailed(key);
        assertTrue(rateLimitService.isBlocked(key), "Deve estar bloqueado na 5ª tentativa");
    }

    @Test
    @DisplayName("Liberar o rate limit imediatamente após um login bem-sucedido")
    void testResetOnLoginSuccess() {
        String key = "192.168.1.2:user@jccondomio.com.br";

        rateLimitService.loginFailed(key);
        rateLimitService.loginFailed(key);

        rateLimitService.loginSucceeded(key);

        assertFalse(rateLimitService.isBlocked(key));
    }
}
