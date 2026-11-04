import type { MailContent } from "../../../../shared/email/mail-content";

/**
 * Por dónde sale el aviso del latido (tasks.md 27.5).
 *
 * Mismo puerto mínimo que `LifecycleMailerPort`: recibe los bloques (asunto
 * incluido) que `composeHeartbeatFailureNotice` ya compuso en el dominio
 * (38.5), y no sabe nada de HTML ni de plantillas.
 */
export interface HeartbeatMessage {
  readonly to: string;
  readonly content: MailContent;
}

export interface HeartbeatMailerPort {
  send(message: HeartbeatMessage): Promise<void>;
}
