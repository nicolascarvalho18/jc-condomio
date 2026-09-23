package com.jccondomio.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    @Value("${app.security.rate-limit.login-max-attempts:5}")
    private int maxAttempts;

    @Value("${app.security.rate-limit.login-lockout-minutes:15}")
    private int lockoutMinutes;

    private static class Attempt {
        int count;
        Instant lastAttempt;

        Attempt(int count, Instant lastAttempt) {
            this.count = count;
            this.lastAttempt = lastAttempt;
        }
    }

    private final Map<String, Attempt> attemptsMap = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        Attempt attempt = attemptsMap.get(key);
        if (attempt == null) {
            return false;
        }

        Instant lockoutThreshold = Instant.now().minusSeconds(lockoutMinutes * 60L);
        if (attempt.lastAttempt.isBefore(lockoutThreshold)) {
            // Expirou o lockout
            attemptsMap.remove(key);
            return false;
        }

        return attempt.count >= maxAttempts;
    }

    public void loginFailed(String key) {
        Instant now = Instant.now();
        Instant lockoutThreshold = now.minusSeconds(lockoutMinutes * 60L);

        attemptsMap.compute(key, (k, attempt) -> {
            if (attempt == null || attempt.lastAttempt.isBefore(lockoutThreshold)) {
                return new Attempt(1, now);
            }
            attempt.count++;
            attempt.lastAttempt = now;
            return attempt;
        });
    }

    public void loginSucceeded(String key) {
        attemptsMap.remove(key);
    }
}
