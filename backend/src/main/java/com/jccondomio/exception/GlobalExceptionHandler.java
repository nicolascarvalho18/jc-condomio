package com.jccondomio.exception;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@lombok.extern.slf4j.Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Recurso não encontrado: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "Recurso não encontrado", ex.getMessage(), null);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        log.warn("Regra de negócio violada: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Regra de negócio violada", ex.getMessage(), null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Parâmetro inválido: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Parâmetro inválido", ex.getMessage(), null);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflictException(ConflictException ex) {
        log.warn("Conflito de dados: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "Conflito de dados", ex.getMessage(), null);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleOptimisticLocking(OptimisticLockingFailureException ex) {
        log.warn("Conflito de concorrência: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "Conflito de concorrência", 
                "O registro foi alterado por outro usuário simultaneamente. Por favor, recarregue a página.", null);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        log.warn("Tentativa de login inválida: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "Falha de autenticação", "E-mail ou senha inválidos.", null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Acesso negado: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "Acesso negado", "Você não possui permissão para executar esta operação.", null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        log.warn("Erro de validação: {}", errors);
        return buildResponse(HttpStatus.BAD_REQUEST, "Dados inválidos", "Erro de validação nos campos da requisição.", errors);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("Erro interno no servidor", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno",
                "Ocorreu um erro interno no servidor.", null);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String error, String message, Object details) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        if (details != null) {
            body.put("details", details);
        }
        return ResponseEntity.status(status).body(body);
    }
}
