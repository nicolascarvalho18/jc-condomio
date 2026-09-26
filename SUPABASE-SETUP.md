# Supabase direto — JC Condomínio

O projeto está sendo migrado para usar o Supabase diretamente. Não use Render
nem coloque senha, chave `secret` ou `service_role` no frontend, GitHub ou Vercel.

## Variáveis da Vercel

Em **Project Settings → Environment Variables**, adicione para Production e
Preview:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Depois faça um novo deploy. A chave deve ser a **publishable/anon**; a chave
`secret` nunca é usada no navegador.

## Primeiro administrador

1. No Supabase, abra **Authentication → Users → Add user** e crie o usuário.
2. Aplique `supabase/migrations/20260925_001_auth_profiles.sql` pelo SQL Editor
   ou Supabase CLI.
3. Crie uma linha correspondente em `public.profiles` usando o `id` do usuário
   de Authentication. O campo `role` deve ser `ADMIN`, e `company_id` deve ser
   um UUID da empresa. Esse passo deve ser feito pelo proprietário do projeto,
   nunca pelo navegador de um usuário comum.

O login só aceita contas ativas que tenham perfil. Isso evita uma conta criada
no Auth receber acesso ao sistema sem autorização.

## Base operacional criada

A migration `supabase/migrations/20260926_002_core_schema.sql` cria, sem apagar
dados, as tabelas de empresas, clientes, condomínios, contratos, parcelas,
pagamentos e auditoria. Ela também ativa RLS e limita o acesso à empresa
vinculada ao perfil autenticado.

## Migração dos módulos

O login e a base operacional já estão preparados para Supabase, mas algumas
telas ainda usam os endpoints da API Java durante a transição. A migração dos
módulos deve ser feita por etapas, começando por clientes e condomínios e depois
contratos, parcelas e financeiro. Não remova a API Java enquanto essa transição
não terminar, porque ela ainda é o fallback local.
