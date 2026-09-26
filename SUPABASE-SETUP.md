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

## Próxima etapa obrigatória

Este commit prepara o login. As telas de condomínio, clientes, contratos,
financeiro e auditoria ainda usam a API Java atual. Para uma aplicação 100%
Supabase, essas tabelas, regras de cálculo, auditoria e políticas RLS precisam
ser migradas em seguida; não é seguro fingir que elas funcionam somente com o
login migrado.
