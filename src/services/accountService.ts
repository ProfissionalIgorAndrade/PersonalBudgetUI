import { httpClient } from "./httpClient";
import type { AccountViewModel } from "../types/Account/AccountViewModel";
import type { AccountDTO } from "../types/Account/AccountDTO";
import { mapAccountToViewModel } from "../mappers/Account/accountMapper";

const apiBaseUrl = "https://personalbudget.fly.dev/api/accounts";

export async function getAccounts(): Promise<AccountViewModel[]> {
  const response = await httpClient(apiBaseUrl);

  if (!response.ok) {
    throw new Error("Erro ao buscar contas");
  }

  const data: AccountDTO[] = await response.json();
  return  data.map(mapAccountToViewModel);
}
