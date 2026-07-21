import Link from "next/link";
import styles from "./state-action.module.css";

type StateActionProps =
  | { href: string; children: React.ReactNode; onClick?: never }
  | { href?: never; children: React.ReactNode; onClick: () => void };

export function StateAction({ children, href, onClick }: StateActionProps) {
  if (href) {
    return <Link className={styles.action} href={href}>{children}</Link>;
  }
  return <button className={styles.action} type="button" onClick={onClick}>{children}</button>;
}
