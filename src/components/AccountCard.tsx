import type { JSX } from "react";
import type { AccountViewModel } from "../types/Account/AccountViewModel";

type Props = {
  account: AccountViewModel;
};

export default function AccountCard({ account }: Props): JSX.Element {
  const formattedBalance = account.balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="account-card">
      <h2>{account.bankName}</h2>
      <p className="balance">{formattedBalance}</p>
      <p className="balance">{account.agency}</p>
      <p className="balance">{account.accountNumber}</p>
    </div>
  );
}
