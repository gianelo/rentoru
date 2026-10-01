import { AppLink } from "@/../components/atoms/AppLink";
import type { HomeLanding } from "@/modules/listing-discovery/domain/home-collections";
import styles from "../home.module.css";

export function LaunchLanding({ landing }: { readonly landing: HomeLanding }) {
  return (
    <section className={styles.invite}>
      <div className={styles.inviteLayout}>
        <div>
          <p className={styles.eyebrow}>{landing.eyebrow}</p>
          <h1 className={styles.inviteTitle}>{landing.title}</h1>
          <p className={styles.inviteText}>{landing.lead}</p>
          {landing.action && (
            <AppLink className={styles.inviteAction} href={landing.action.href}>
              {landing.action.label}
            </AppLink>
          )}
        </div>
        <dl className={styles.ledger}>
          {landing.facts.map((fact) => (
            <div className={styles.fact} key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className={styles.disclaimer}>{landing.disclaimer}</p>
    </section>
  );
}
