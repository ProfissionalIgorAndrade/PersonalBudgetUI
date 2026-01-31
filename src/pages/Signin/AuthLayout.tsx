import type { ReactNode, JSX } from "react";
import "./auth.css";

type Props = {
    children: ReactNode;
};

export default function AuthLayout({ children }: Props): JSX.Element {
    return (
        <div className="auth-page">
            <div className="auth-container">{children}</div>
        </div>
    );
}
