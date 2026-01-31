import type { JSX } from "react";
import type { Account } from "../types/Account";

type Props = {
  account: Account;
};

export default function AccountCard({ account }: Props): JSX.Element {
  //const formattedBalance = account.balance.toLocaleString("pt-BR", {
  //  style: "currency",
  //  currency: "BRL",
  //});

  return (
    <div className="account-card">
      <h2>{account.userId}</h2>
      <p className="balance">{account.bank}</p>
    </div>
  );
}
