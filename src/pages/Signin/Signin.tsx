import { useState, type JSX } from "react";
import { login, signin } from "../../services/authService";
import "./signin.css";
import AuthLayout from "./AuthLayout";
import { Link, useNavigate } from "react-router-dom";

export default function Signin(): JSX.Element {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            console.log({ name, email, password });
            const response = await signin({ name, email, password });
            console.log("Resposta do servidor:", response);
            console.log("Token:", response.token);
            let loginRequest = { email: email, password: password };
            const loginResponse = await login(loginRequest);
            console.log("Login response:", loginResponse);

            // 🔥 REDIRECT OFICIAL
            navigate("/dashboard");

            // próximo passo: salvar token + redirect
        } catch (error) {
            alert("Erro ao criar conta");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <h1>Criar conta</h1>
            <p>Comece a organizar suas finanças</p>

            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <input
                    placeholder="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    placeholder="Senha"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Criando..." : "Criar conta"}
                </button>
            </form>
            <span className="auth-footer">
                Já tem conta?{" "}
                <Link to="/login">Entrar</Link>
            </span>
        </AuthLayout>
    );
}
