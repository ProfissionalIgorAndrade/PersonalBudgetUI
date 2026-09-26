import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLastEmail, setLastEmail } from '../../core/utils/lastEmail';

const cardIn    = { hidden: { opacity: 0, y: 28, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: [0.4,0,0.2,1] } } };
const logoSpring = { hidden: { scale: 0.6, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 22, delay: 0.1 } } };
const fieldSlide = { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto', transition: { duration: 0.24, ease: [0.4,0,0.2,1] } }, exit: { opacity: 0, height: 0, transition: { duration: 0.18, ease: [0.4,0,0.2,1] } } };

export default function AuthView({ onLogin, onSignup }) {
  const [tab,      setTab]      = useState('login');
  const [form,     setForm]     = useState({ firstName: '', email: getLastEmail(), password: '', confirm: '' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const switchTab = (t) => { setTab(t); setError(''); setForm({ firstName: '', email: '', password: '', confirm: '' }); setShowPwd(false); setShowConf(false); };

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) return setError('Preencha todos os campos.');
    try { await onLogin({ email: form.email.trim(), password: form.password }); setLastEmail(form.email.trim()); }
    catch (e) { setError(e.message || 'E-mail ou senha incorretos.'); }
  };

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.email.trim() || !form.password) return setError('Preencha todos os campos.');
    if (form.password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não coincidem.');
    try { await onSignup({ firstName: form.firstName.trim(), email: form.email.trim(), password: form.password }); setLastEmail(form.email.trim()); }
    catch (e) { setError(e.message || 'Erro ao criar conta.'); }
  };

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    (tab === 'login' ? handleLogin() : handleRegister()).finally(() => setLoading(false));
  };

  return (
    <div className="auth-root">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-blob auth-bg-blob-1" />
        <div className="auth-bg-blob auth-bg-blob-2" />
      </div>

      <motion.div className="auth-card" variants={cardIn} initial="hidden" animate="visible">

        {/* Identidade do app */}
        <div className="auth-identity">
          <motion.div className="auth-logo-mark" variants={logoSpring} initial="hidden" animate="visible">💰</motion.div>
          <div className="auth-app-name">
            <span>Personal</span><span className="auth-app-accent">Budget</span>
          </div>
        </div>

        {/* Título dinâmico */}
        <AnimatePresence mode="wait">
          <motion.div key={tab + '-hdr'} className="auth-form-header"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            <h1 className="auth-form-title">{tab === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}</h1>
            <p className="auth-form-sub">{tab === 'login' ? 'Entre para acessar seu painel financeiro' : 'Comece a organizar suas finanças agora'}</p>
          </motion.div>
        </AnimatePresence>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          {[['login', 'Entrar'], ['register', 'Cadastrar']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k}
              className={`auth-tab${tab === k ? ' active' : ''}`}
              onClick={() => switchTab(k)} type="button">{l}</button>
          ))}
        </div>

        {/* Formulário */}
        <form onSubmit={submit} noValidate>
          <AnimatePresence>
            {tab === 'register' && (
              <motion.div key="firstName-field" className="form-group" {...fieldSlide} style={{ overflow: 'hidden' }}>
                <label className="form-label">Nome</label>
                <input className="form-input" name="name" id="auth-name"
                  value={form.firstName} onChange={e => set('firstName', e.target.value)}
                  placeholder="Seu nome" autoComplete="given-name" autoFocus />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" name="username" id="auth-email"
              value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="seuemail@exemplo.com" autoComplete="username"
              autoFocus={tab === 'login'} />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input"
                type={showPwd ? 'text' : 'password'} name="password" id="auth-password"
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', padding: 2 }}
                tabIndex={-1} aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {tab === 'register' && (
              <motion.div key="confirm-field" className="form-group" {...fieldSlide} style={{ overflow: 'hidden' }}>
                <label className="form-label">Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input"
                    type={showConf ? 'text' : 'password'} name="confirm-password" id="auth-confirm-password"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)}
                    placeholder="Repita a senha" autoComplete="new-password"
                    style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', padding: 2 }}
                    tabIndex={-1}>{showConf ? '🙈' : '👁'}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div className="auth-error" role="alert"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.2 }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" className="btn btn-primary auth-submit"
            disabled={loading}
            whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            {loading ? <span className="auth-spinner" /> : tab === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </motion.button>
        </form>

        <p className="auth-switch">
          {tab === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
          <button type="button" onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}>
            {tab === 'login' ? 'Cadastre-se grátis' : 'Fazer login'}
          </button>
        </p>
        <p className="auth-privacy">🔒 Conexão segura com criptografia JWT</p>
      </motion.div>
    </div>
  );
}
