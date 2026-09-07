import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login as apiLogin, signup as apiSignup } from '../../api/auth';

/* ── Animation variants ─────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
};

const slideLeft = {
  hidden:  { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
};

const slideRight = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1], delay: 0.05 } },
};

const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const featureItem = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const logoSpring = {
  hidden:  { scale: 0.7, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 22, delay: 0.2 } },
};

const fieldSlide = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: 'auto', marginBottom: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
};

export default function Auth({ onLogin }) {
  const [tab, setTab]         = useState('login');
  const [form, setForm]       = useState({ firstName: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [showConf, setShowConf] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setForm({ firstName: '', email: '', password: '', confirm: '' });
    setShowPwd(false);
    setShowConf(false);
  };

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) return setError('Preencha todos os campos.');
    try {
      const data = await apiLogin({ email: form.email.trim(), password: form.password });
      const session = { userId: data.userId, displayName: form.email.split('@')[0], email: form.email.trim() };
      onLogin(session);
    } catch (e) {
      setError(e.message || 'E-mail ou senha incorretos.');
    }
  };

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.email.trim() || !form.password)
      return setError('Preencha todos os campos.');
    if (form.password.length < 6)
      return setError('A senha deve ter pelo menos 6 caracteres.');
    if (form.password !== form.confirm)
      return setError('As senhas não coincidem.');
    try {
      const data = await apiSignup({ firstName: form.firstName.trim(), email: form.email.trim(), password: form.password });
      const session = { userId: data.userId, displayName: form.firstName.trim(), email: form.email.trim() };
      onLogin(session);
    } catch (e) {
      setError(e.message || 'Erro ao criar conta.');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const fn = tab === 'login' ? handleLogin : handleRegister;
    fn().finally(() => setLoading(false));
  };

  return (
    <div className="auth-root">

      {/* ════════════════════════════════════════════
          BRAND PANEL
      ════════════════════════════════════════════ */}
      <div className="auth-brand">
        <div className="auth-brand-glow auth-brand-glow-1" />
        <div className="auth-brand-glow auth-brand-glow-2" />
        <div className="auth-brand-glow auth-brand-glow-3" />

        <motion.div
          className="auth-brand-content"
          variants={slideLeft}
          initial="hidden"
          animate="visible"
        >
          {/* Logo mark */}
          <div className="auth-logo-wrap">
            <motion.div
              className="auth-logo-mark"
              variants={logoSpring}
              initial="hidden"
              animate="visible"
            >
              💰
            </motion.div>
          </div>

          {/* App name */}
          <motion.div
            className="auth-brand-name"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{ transitionDelay: '0.15s' }}
          >
            Personal<br />
            <span className="auth-brand-name-accent">Financeiro</span>
          </motion.div>

          <motion.p
            className="auth-brand-tagline"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.25 }}
          >
            Organize as finanças da sua família em um só lugar. Simples, visual e com privacidade total.
          </motion.p>

          {/* Feature list */}
          <motion.ul
            className="auth-feature-list"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              'Controle de receitas e despesas por membro',
              'Cartões de crédito, contas e faturas unificados',
              'Relatórios, gráficos e alertas em tempo real',
              'Dados salvos localmente — sem nuvem, sem cadastro externo',
            ].map((f, i) => (
              <motion.li key={i} className="auth-feature" variants={featureItem}>
                <span className="auth-feature-dot" />
                {f}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════
          FORM PANEL
      ════════════════════════════════════════════ */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-form-card"
          variants={slideRight}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + '-header'}
              className="auth-form-header"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="auth-form-title">
                {tab === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
              </h1>
              <p className="auth-form-sub">
                {tab === 'login'
                  ? 'Entre para acessar seu painel familiar'
                  : 'Comece a organizar as finanças da família'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={tab === 'register'}
              className={`auth-tab${tab === 'register' ? ' active' : ''}`}
              onClick={() => switchTab('register')}
              type="button"
            >
              Cadastrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} noValidate>

            {/* Name field — register only */}
            <AnimatePresence>
              {tab === 'register' && (
                <motion.div
                  key="firstName-field"
                  className="form-group"
                  {...fieldSlide}
                  style={{ overflow: 'hidden' }}
                >
                  <label className="form-label">Nome</label>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="given-name"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                autoFocus={tab === 'login'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--muted)', padding: 2,
                  }}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Confirm password — register only */}
            <AnimatePresence>
              {tab === 'register' && (
                <motion.div
                  key="confirm-field"
                  className="form-group"
                  {...fieldSlide}
                  style={{ overflow: 'hidden' }}
                >
                  <label className="form-label">Confirmar Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showConf ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={e => set('confirm', e.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 14, color: 'var(--muted)', padding: 2,
                      }}
                      tabIndex={-1}
                      aria-label={showConf ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    >
                      {showConf ? '🙈' : '👁'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="auth-error"
                  role="alert"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {loading
                ? <span className="auth-spinner" />
                : tab === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </motion.button>
          </form>

          <p className="auth-switch">
            {tab === 'login' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
            <button type="button" onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}>
              {tab === 'login' ? 'Cadastre-se grátis' : 'Fazer login'}
            </button>
          </p>

          <p className="auth-privacy">
            🔒 Seus dados ficam apenas neste dispositivo
          </p>
        </motion.div>
      </div>
    </div>
  );
}
