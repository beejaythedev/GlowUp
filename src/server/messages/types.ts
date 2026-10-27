/**
 * Behind this interface: the console sender for now, a real SMS provider from
 * M8 (docs/ARCHITECTURE.md, docs/TECH_STACK.md). Scheduled reminders and the
 * messages table are M8-4 — this interface only needs to send one message now.
 */
export interface MessageSender {
  send(input: SendMessageInput): Promise<void>;
}

export interface SendMessageInput {
  to: string;
  body: string;
}
