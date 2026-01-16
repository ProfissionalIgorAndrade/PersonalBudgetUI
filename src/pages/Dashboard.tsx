import { useEffect, useState } from "react";
import { getAccounts } from "../services/accountService";
import AccountCard from "../components/AccountCard";
import "../styles/dashboard.css";

export default function Dashboard() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

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
