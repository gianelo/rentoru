import buttons from "@/../components/atoms/Button.module.css";
import { FailureScreen } from "@/../components/organisms/FailureScreen";
import { NAVIGATION_RECOVERY } from "@/modules/listing-publication/domain/navigation-recovery";

export default function NavigationRecoveryPage() {
  const model = NAVIGATION_RECOVERY;
  return (
    <FailureScreen
      model={model}
      actions={
        <>
          <a className={`${buttons.base} ${buttons.action}`} href={model.retry.href}>
            {model.retry.label}
          </a>{" "}
          <a className={`${buttons.base} ${buttons.neutral}`} href={model.exit.href}>
            {model.exit.label}
          </a>
        </>
      }
    />
  );
}
