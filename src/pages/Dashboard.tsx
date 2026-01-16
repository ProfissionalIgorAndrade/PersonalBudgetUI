import { useEffect, useState, type JSX } from "react";
import { getAccounts } from "../services/accountService";
import AccountCard from "../components/AccountCard";
import "../styles/dashboard.css";
import type { Account } from "../types/Account";

export default function Dashboard(): JSX.Element {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await getAccounts();
                console.log(data);
                setAccounts(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadAccounts();
    }, []);

    if (loading) {
        return <p className="loading">Carregando contas...</p>;
    }

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>

            <div className="accounts-grid">
                {accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                ))}
            </div>
        </div>
    );
}
