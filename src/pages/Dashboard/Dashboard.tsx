import { useEffect, useState, type JSX } from "react";
import { getAccounts } from "../../services/accountService";
import AccountCard from "../../components/AccountCard";
import "./dashboard.css"
import type { AccountViewModel } from "../../types/Account/AccountViewModel";

export default function Dashboard(): JSX.Element {
    const [accounts, setAccounts] = useState<AccountViewModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await getAccounts();
                setAccounts(data);
                console.log("Contas carregadas:", data);
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
        <div className="page">
            <div className="page-container">
                <h1 className="page-title">Contas</h1>

                <div className="accounts-grid">
                    {accounts.map((account) => (
                        <AccountCard key={account.id} account={account} />
                    ))}
                </div>
            </div>
        </div>
    );
}
