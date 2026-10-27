import { ConsoleMessageSender } from "./console";
import type { MessageSender } from "./types";

export type { MessageSender, SendMessageInput } from "./types";

/** The one message sender app code should call. Swap this line for a real SMS provider in M8. */
export const messageSender: MessageSender = new ConsoleMessageSender();
