import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem('souza-remembered-email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('souza-remembered-email')));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(() => {
    const expired = sessionStorage.getItem('souza-session-expired');
    if (expired) sessionStorage.removeItem('souza-session-expired');
    return expired ? 'Sua sessão expirou. Entre novamente.' : null;
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    setError(null);
    setInfo(null);
    if (!normalizedEmail) return setError('Informe seu e-mail');
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setError('Informe um e-mail válido');
    if (!password) return setError('Informe sua senha');
    setLoading(true);
    try {
      await login(normalizedEmail.toLowerCase(), password);
      if (remember) localStorage.setItem('souza-remembered-email', normalizedEmail.toLowerCase());
      else localStorage.removeItem('souza-remembered-email');
    } catch (requestError: any) {
      const status = requestError.response?.status;
      if (!isSupabaseConfigured) {
        setError('Supabase não está configurado neste ambiente. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY e reinicie o frontend.');
      } else if (status === 401 || status === 403 || requestError?.code === 'invalid_credentials') {
        setError('E-mail ou senha inválidos');
      } else if (requestError?.message === 'Esta conta não possui acesso ativo ao sistema.') {
        setError('Esta conta não possui acesso ativo ao sistema.');
      } else if (!requestError.response || requestError.code === 'ERR_NETWORK') {
        setError('Não foi possível acessar o Supabase. Verifique a URL pública, a chave publishable e a conexão e tente novamente.');
      } else if (requestError?.message) {
        setError(requestError.message);
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#F5F6F8] px-4 py-8 text-[#172033] flex items-center justify-center">
      <section className="w-full max-w-[420px] rounded-[10px] border border-[#E2E6EC] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <img src="/souza-construcao-mark.png" alt="Souza Construção" className="mx-auto mb-4 h-14 w-auto object-contain" />
          <h1 className="text-xl font-semibold tracking-tight">Souza Construção</h1>
          <p className="mt-1 text-sm text-[#64748B]">Gestão de Contratos e Obras</p>
        </div>
        <div className="mb-6"><h2 className="text-lg font-semibold">Acesse sua conta</h2><p className="mt-1 text-sm text-[#64748B]">Entre com seus dados para continuar.</p></div>
        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
        {info && <div role="status" className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-[#64748B]">{info}</div>}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div><label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">E-mail</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 size-4 text-[#64748B]" aria-hidden="true" /><input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className="h-11 w-full rounded-md border border-[#D7DCE3] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#A61F24] focus:ring-2 focus:ring-[#FBEDEE]" /></div></div>
          <div><label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">Senha</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-[#64748B]" aria-hidden="true" /><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" className="h-11 w-full rounded-md border border-[#D7DCE3] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-[#A61F24] focus:ring-2 focus:ring-[#FBEDEE]" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1 inline-flex size-9 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F3F4F6] hover:text-[#172033] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          <div className="flex items-center justify-between gap-3 text-sm"><label className="inline-flex items-center gap-2 text-[#64748B]"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 rounded border-[#D7DCE3] accent-[#A61F24]" />Manter conectado</label><button type="button" onClick={() => setInfo('Se precisar redefinir sua senha, entre em contato com o administrador da empresa.')} className="text-[#A61F24] hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]">Esqueci minha senha</button></div>
          <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#172033] px-4 text-sm font-semibold text-white transition hover:bg-[#0F172A] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24] disabled:cursor-not-allowed disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
        <p className="mt-8 text-center text-xs text-[#64748B]">© {new Date().getFullYear()} Souza Construção</p>
      </section>
    </main>
  );
};
