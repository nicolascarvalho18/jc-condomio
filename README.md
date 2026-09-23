# JC Condomínio - Sistema Corporativo da Construção Civil

Sistema web corporativo desenvolvido para construtoras e incorporadoras, com foco em gestão completa de condomínios, blocos/torres, unidades privativas, clientes, contratos de compra e venda e controle financeiro avançado de recebíveis.

---

## 🏗️ 1. Arquitetura e Tecnologias

- **Backend**:
  - **Java 21 / 17** com **Spring Boot 3.3.4**
  - **Spring Security** com autenticação stateless **JWT (JJWT 0.12.6)**
  - **Controle de Acesso Baseado em Perfis (RBAC)**: `ADMIN`, `FINANCEIRO`, `OPERADOR` e `CONSULTA`
  - **Spring Data JPA & Hibernate** com bloqueio otimista (`@Version`) contra concorrência em vendas
  - **PostgreSQL 16** (com suporte a H2 no perfil `dev`/`test`)
  - **Flyway** para versionamento de migrations (`V1__init_schema.sql`), **sem nenhum dado fictício**
  - **OpenAPI 3.0 / Swagger UI** integrado (`/swagger-ui.html`)
  - **Apache POI** para geração de relatórios em planilhas Excel (`.xlsx`)
  - **OpenPDF** para emissão de extratos formais de contratos em PDF
  - **Testes automatizados**: JUnit 5, Mockito e MockMvc

- **Frontend**:
  - **React 18** com **Vite** e **TypeScript**
  - **Tailwind CSS** para estilização corporativa moderna e responsiva
  - **Lucide Icons** para iconografia
  - **Axios** com interceptors automáticos para tokens Bearer JWT e redirecionamentos seguros

- **Infraestrutura**:
  - **Docker** e **Docker Compose** multi-stage (imagens enxutas e usuário sem privilégios de root)

---

## 🔒 2. Regras Rígidas de Segurança e Negócio

1. **Zero Dados Fictícios**: O banco de dados inicia completamente vazio. Todos os condomínios, clientes e contratos são cadastrados por usuários reais através da interface ou API.
2. **Setup Seguro do Primeiro Administrador**:
   - Se o banco estiver vazio, o sistema detecta automaticamente (`/api/v1/auth/setup-status`) e redireciona para a tela de configuração inicial.
   - O gestor define o nome, e-mail e senha segura (mínimo 8 caracteres) do administrador `ADMIN`, além dos dados da construtora.
   - **Nenhuma senha padrão, usuário mock ou credencial fica gravada no código.**
   - O endpoint de setup é imediatamente bloqueado após a primeira inicialização.
3. **Precisão Monetária Rigorosa (`BigDecimal`)**:
   - Todas as operações utilizam `BigDecimal` com arredondamento `HALF_EVEN` / `HALF_UP`.
   - **Distribuição de Centavos Residuais**: Na divisão de parcelas (ex: R$ 100.000,00 em 3 parcelas), o centavo da dízima é ajustado na primeira parcela, garantindo que a soma de todas as parcelas seja **matematicamente igual** ao valor total do contrato.
4. **Calendário Bancário e Feriados Brasileiros (`HolidayUtil`)**:
   - Inclui todos os feriados nacionais fixos (inclusive o Dia da Consciência Negra - Lei nº 14.759/2023) e feriados móveis calculados (Carnaval, Sexta-feira Santa e Corpus Christi).
   - Prorroga automaticamente o vencimento de parcelas que recaiam em sábados, domingos ou feriados bancários para o próximo dia útil subsequente.
5. **Cálculo de Encargos por Atraso**:
   - Dias de carência/tolerância configuráveis.
   - Multa por atraso percentual configurável (ex: 2,00%).
   - Juros de mora calculados *pro-rata die* com base na taxa mensal acordada.
6. **Integridade Financeira e Soft Delete**:
   - **Registros de parcelas com pagamentos efetuados NUNCA são apagados definitivamente do banco de dados.**
   - Exclusões de condomínios e clientes utilizam *soft delete* (`deleted = true`), preservando todo o histórico contábil.
7. **Renegociação de Débitos**:
   - Permite selecionar parcelas vencidas/abertas, calcular o saldo consolidado com juros/descontos acordados, congelar auditadamente as parcelas antigas como `RENEGOTIATED` e emitir novo fluxo de parcelas com numeração contínua.
8. **Trilha de Auditoria (`AuditLog`)**:
   - Registra data/hora, usuário responsável, ação (`CREATE`, `UPDATE`, `DELETE`, `PAYMENT`, `RENEGOTIATE`, `LOGIN`), entidade alterada, IP e detalhes da operação.
9. **Proteção contra Força Bruta (Rate Limiting)**:
   - Bloqueio temporário de tentativas após 5 falhas consecutivas de login por IP/usuário.
10. **Conformidade LGPD**:
    - Registro de consentimento de tratamento de dados com data e hora.

---

## 🚀 3. Como Executar o Projeto

### Opção A: Execução em Produção via Docker Compose (Recomendado)

1. Clone o repositório e acesse a pasta do projeto:
   ```bash
   cd "c:\Users\dev\Downloads\jc condomio"
   ```

2. Crie o arquivo `.env` a partir do modelo:
   ```bash
   cp .env.example .env
   ```

   Gere valores únicos para `DB_PASSWORD` e `JWT_SECRET` antes de iniciar o ambiente. O Docker Compose não aceita mais credenciais padrão.

3. Suba todos os serviços (PostgreSQL 16, Backend Spring Boot 3 em Java 21, Frontend React/Nginx):
   ```bash
   docker compose up --build -d
   ```

4. Acesse:
   - **Frontend**: [http://localhost](http://localhost)
   - **API Backend**: [http://localhost:8080](http://localhost:8080)
   - **Documentação OpenAPI / Swagger**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

---

### Opção B: Execução Local para Desenvolvimento

#### 1. Backend (Spring Boot 3):
O backend possui o Maven Wrapper incluído, não exigindo instalação prévia do Maven.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
*O perfil padrão `dev` inicializa com banco H2 em modo de compatibilidade PostgreSQL ou conecta diretamente no PostgreSQL caso as variáveis de ambiente estejam configuradas.*

#### 2. Frontend (React + Vite + TypeScript):
```powershell
cd frontend
npm install
npm run dev
```
Acesse o sistema em: [http://localhost:5173](http://localhost:5173)

---

## 🧪 4. Testes Automatizados

Para rodar todos os testes unitários e de integração do backend:

```powershell
cd backend
.\mvnw.cmd test
```

### Testes Implementados:
- **`InstallmentCalculationServiceTest`**: Validação da distribuição exata de centavos e soma total das parcelas, além de planos financeiros complexos (entrada + mensais + intermediárias + chaves).
- **`HolidayUtilTest`**: Validação de feriados nacionais fixos, feriados móveis e prorrogação de finais de semana para segunda-feira subsequente.
- **`PaymentCalculationTest`**: Cálculo de juros de mora pro-rata die, multa por atraso e respeito à carência/tolerância.
- **`RateLimitServiceTest`**: Proteção contra ataques de força bruta no login.
- **`AuthIntegrationTest`**: Teste de integração completo do fluxo de Setup Inicial, bloqueio de segundo setup, emissão de JWT e autorização RBAC.

---

## 📂 5. Estrutura do Projeto

```
jc-condomio/
├── .env.example               # Modelo de variáveis de ambiente seguras
├── docker-compose.yml         # Orquestração Postgres + Backend + Frontend
├── backend/                   # Aplicação Spring Boot 3
│   ├── mvnw.cmd / mvnw        # Maven Wrapper autossuficiente
│   ├── pom.xml                # Dependências Spring Boot, Security, Flyway, etc.
│   ├── Dockerfile             # Multi-stage build com Eclipse Temurin Java 21
│   └── src/
│       ├── main/java/com/jccondomio/
│       │   ├── config/        # Segurança, CORS, OpenAPI Swagger, JPA Auditing
│       │   ├── controller/    # Endpoints RESTful documentados
│       │   ├── domain/        # Entidades JPA (12 entidades) e Enums
│       │   ├── dto/           # Records de Request e Response com validação
│       │   ├── exception/     # Tratamento global de erros (RFC 7807)
│       │   ├── repository/    # Spring Data JPA Repositories
│       │   ├── security/      # JWT Provider, AuthFilter, RateLimiting
│       │   ├── service/       # Regras de negócio, cálculo de parcelas, juros, relatórios
│       │   └── util/          # Calendário bancário e feriados nacionais
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── application-dev.yml
│       │   ├── application-prod.yml
│       │   ├── application-test.yml
│       │   └── db/migration/
│       │       └── V1__init_schema.sql  # DDL completo sem dados falsos
│       └── test/              # Testes unitários e de integração
└── frontend/                  # Aplicação React + TypeScript + TailwindCSS
    ├── Dockerfile             # Build Vite + Servidor Nginx
    ├── nginx.conf             # Proxy reverso para API e SPA routing
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── api/client.ts      # Axios com interceptor JWT
        ├── context/           # AuthContext e verificação de Setup
        ├── components/        # Layout (Navbar, Sidebar), Modal, Badge, EmptyState
        ├── pages/             # SetupAdmin, Login, Dashboard, Condominios, Clientes, Contratos, Financeiro, Relatórios, Auditoria, Configurações
        └── types/             # Tipagens TypeScript completas
```
## Publicação em produção

O frontend pode ser publicado no Cloudflare Workers/Pages, mas o backend Spring Boot e o banco precisam estar hospedados separadamente. O banco H2 local não deve ser publicado.

### Frontend

Configure a variável de build no provedor do frontend:

```text
VITE_API_BASE_URL=https://api.exemplo.com/api/v1
```

Quando essa variável não existir, o desenvolvimento local continuará usando o proxy do Vite para `http://localhost:8080`.

### Backend

Configure no serviço Java:

```text
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://servidor:5432/banco
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=senha
JWT_SECRET=chave-aleatoria-com-pelo-menos-32-caracteres
CORS_ALLOWED_ORIGINS=https://jc-condomio.nicolasbdhshdh.workers.dev
```

As credenciais devem ser cadastradas como variáveis secretas no provedor. Nunca coloque esses valores no GitHub, em arquivos `.env` versionados ou no frontend.
