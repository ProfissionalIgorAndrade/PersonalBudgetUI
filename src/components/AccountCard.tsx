interface Account {
  name: string;
  balance: number;
}

export default function AccountCard({ account }: { account: Account }) {
  const formattedBalance = account.balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="account-card">
      <h2>{account.name}</h2>
      <p className="balance">{formattedBalance}</p>
    </div>
  );
}
