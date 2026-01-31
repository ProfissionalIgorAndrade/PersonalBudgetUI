import type { AuthResponse } from "../types/Auth/AuthResponse";
import type { LoginRequest } from "../types/Auth/LoginRequest";
import type { SigninRequest } from "../types/Auth/SigninRequest";


const API_URL = "https://personalbudget.fly.dev/api/authentication";

export async function signin(
  payload: SigninRequest
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Erro ao criar conta");
  }

  return response.json();
}

export async function login(
  payload: LoginRequest
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("E-mail ou senha inválidos");
  }
  console.log(response);
  return response.json();
}