import { httpClient } from "./httpClient";
import type { Account } from "../types/Account";

export async function getAccounts(): Promise<Account[]> {
  const response = await httpClient(
    "https://personalbudget.fly.dev/api/accounts"
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar contas");
  }

  return response.json();
}
