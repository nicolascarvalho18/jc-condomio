package com.jccondomio;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jccondomio.dto.AuthDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Fluxo completo de Primeiro Acesso: Setup inicial, bloqueio de segundo setup, login e acesso protegido")
    void testInitialAdminSetupAndAuthFlow() throws Exception {
        String testEmail = "auth-test-" + UUID.randomUUID() + "@example.test";
        String testPassword = "AuthTest!" + UUID.randomUUID();
        // 1. Verificar que o sistema requer setup inicial (banco vazio)
        mockMvc.perform(get("/api/v1/auth/setup-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setupRequired").value(true));

        // 2. Cadastrar primeiro administrador
        AuthDto.SetupAdminRequest setupRequest = new AuthDto.SetupAdminRequest(
                "Carlos Administrador",
                testEmail,
                testPassword,
                "12.345.678/0001-90",
                "JC Construtora e Incorporadora LTDA",
                "JC Empreendimentos"
        );

        String setupResponseJson = mockMvc.perform(post("/api/v1/auth/setup-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(testEmail))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andReturn().getResponse().getContentAsString();

        AuthDto.LoginResponse setupResponse = objectMapper.readValue(setupResponseJson, AuthDto.LoginResponse.class);

        // 3. Verificar que o setup agora NÃO é mais requerido
        mockMvc.perform(get("/api/v1/auth/setup-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setupRequired").value(false));

        // 4. Tentativa de segundo setup deve ser rejeitada com 409 Conflict
        mockMvc.perform(post("/api/v1/auth/setup-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(setupRequest)))
                .andExpect(status().isConflict());

        // 5. Testar Login com sucesso
        AuthDto.LoginRequest loginRequest = new AuthDto.LoginRequest(
                testEmail,
                testPassword
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());

        // 6. Testar Login com senha incorreta
        AuthDto.LoginRequest badLogin = new AuthDto.LoginRequest(
                testEmail,
                "SenhaErrada"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isUnauthorized());

        // 7. Acessar endpoint protegido sem token deve falhar
        mockMvc.perform(get("/api/v1/companies/my"))
                .andExpect(status().isUnauthorized());

        // 8. Acessar endpoint protegido com Bearer token deve ter sucesso
        mockMvc.perform(get("/api/v1/companies/my")
                        .header("Authorization", "Bearer " + setupResponse.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tradeName").value("JC Empreendimentos"));
    }
}
