import { randomInt } from "node:crypto";

// Excludes visually ambiguous characters (0/O, 1/I/l) since this is read
// aloud or typed from a phone screen.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 8;

/** A one-time password for a new or reset staff account, sent by the console message sender. */
export function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < LENGTH; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}
