export async function getAccounts() {
  const response = await fetch(
    "https://personalbudget.fly.dev/api/accounts"
  );

  console.log(response);

  if (!response.ok) {
    throw new Error("Erro ao buscar contas");
  }

  return response.json();
}
