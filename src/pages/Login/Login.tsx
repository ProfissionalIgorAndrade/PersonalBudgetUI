import { useState, type JSX } from "react";
import AuthLayout from "../Signin/AuthLayout";
import { useAuth } from "../../auth/hooks/useAuth";
import { login as loginService } from "../../services/authService";
import { Link, useNavigate } from "react-router-dom";

export default function Login(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await loginService({ email, password });
      login(response.token);

      // 🔥 REDIRECT OFICIAL
      navigate("/dashboard");
    } catch {
      alert("Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1>Entrar</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <span className="auth-footer">
        Não tem conta?{" "}
        <Link to="/signin">Criar conta</Link>
      </span>
    </AuthLayout>
  );
}

