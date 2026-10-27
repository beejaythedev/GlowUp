import type { MessageSender, SendMessageInput } from "./types";

/** Stands in for a real SMS provider until M8. Logs instead of sending. */
export class ConsoleMessageSender implements MessageSender {
  async send(input: SendMessageInput): Promise<void> {
    console.log(`[message] to ${input.to}: ${input.body}`);
  }
}
