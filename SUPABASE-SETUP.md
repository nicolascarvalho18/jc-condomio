# Supabase — banco online do JC Condomínio

O sistema utiliza o PostgreSQL do Supabase para armazenar dados e usuários. O login continua sendo processado pelo backend Java: a senha é salva somente como hash BCrypt, junto com o e-mail, a empresa e o perfil de acesso.

Não use Supabase Auth em paralelo neste projeto. Isso duplicaria contas e regras de permissão já implementadas no backend.

## 1. Criar o projeto

1. Entre em [Supabase](https://supabase.com/dashboard) e crie um projeto PostgreSQL.
2. Guarde a senha do banco em um gerenciador de senhas. Ela não deve ser enviada por chat, adicionada ao GitHub ou colocada no frontend.
3. Em **Project Settings → Database**, copie os dados de conexão do banco.

## 2. Publicar o backend

Publique a pasta `backend` em um serviço compatível com Java/Spring Boot. Nas variáveis secretas desse serviço, configure:

```text
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<senha-do-banco-do-supabase>
JWT_SECRET=<chave-aleatoria-com-ao-menos-32-bytes>
CORS_ALLOWED_ORIGINS=https://jc-condomio.vercel.app
```

Use exatamente a URL, usuário e parâmetros fornecidos pelo Supabase. Alguns planos mostram também uma URL de pooler; nesse caso, use o host e a porta recomendados pelo painel.

Na primeira inicialização, o Flyway cria a estrutura do sistema no banco sem dados fictícios. Abra a aplicação e conclua o cadastro do primeiro administrador. Esse é o único ponto em que o e-mail e a senha do administrador são definidos; a senha nunca é gravada em texto puro.

## 3. Conectar a Vercel

Quando o backend estiver publicado, copie a URL dele e configure na Vercel:

```text
VITE_API_BASE_URL=https://api.seudominio.com/api/v1
```

Depois faça um novo deploy. Sem essa variável, o frontend na Vercel não encontra a API e o login não consegue salvar nem consultar usuários.

## Segurança

- Nunca exponha `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET` ou qualquer chave `service_role` no frontend.
- Use somente variáveis secretas do Supabase, Vercel e do provedor do backend.
- O projeto já restringe CORS, usa BCrypt para senha, JWT com expiração e auditoria de ações.
