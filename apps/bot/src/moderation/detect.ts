import { findBannedTerm } from "./normalize.js";
import {
  extractLinks,
  hasObfuscatedLink,
  isInviteLink,
  isWhitelisted,
  type Entity,
} from "./links.js";

export type ViolationReason =
  | "invite"
  | "link"
  | "banned_word"
  | "newbie_link"
  | "newbie_media"
  | "flood"
  | "duplicate"
  | "foreign_channel";

export type Verdict =
  { kind: "ok" } | { kind: "violation"; reason: ViolationReason; warn: boolean; detail?: string };

export interface MessageFacts {
  text: string;
  entities?: readonly Entity[];
  hasMedia: boolean;
  isForwarded: boolean;
  isNewbie: boolean;
}

export interface DetectRules {
  bannedWords: readonly string[];
  domainWhitelist: readonly string[];
}

/** Keputusan murni untuk satu pesan (tanpa flood, yang butuh state). */
export function detectViolation(m: MessageFacts, rules: DetectRules): Verdict {
  const links = extractLinks(m.text, m.entities);
  const obfuscated = hasObfuscatedLink(m.text);

  const invite = links.find(isInviteLink);
  if (invite || (obfuscated && /t\s*[.,]\s*me\s*\/\s*\+|joinchat|tg:\/\/join/i.test(m.text))) {
    return { kind: "violation", reason: "invite", warn: true, detail: invite?.host ?? "t.me" };
  }

  const outside = links.find((l) => !isWhitelisted(l, rules.domainWhitelist));
  if (outside) return { kind: "violation", reason: "link", warn: true, detail: outside.host };
  if (obfuscated) return { kind: "violation", reason: "link", warn: true, detail: "disamarkan" };

  const banned = findBannedTerm(m.text, rules.bannedWords);
  if (banned) return { kind: "violation", reason: "banned_word", warn: true, detail: banned };

  if (m.isNewbie && links.length > 0)
    return { kind: "violation", reason: "newbie_link", warn: false };
  if (m.isNewbie && (m.hasMedia || m.isForwarded)) {
    return { kind: "violation", reason: "newbie_media", warn: false };
  }
  return { kind: "ok" };
}

export type LadderStep = "warn1" | "warn2" | "mute";

/** Tangga peringatan: 1 -> peringatan 1, 2 -> peringatan 2, >=3 -> dibisukan. */
export function ladderStep(activeWarnings: number): LadderStep {
  if (activeWarnings <= 1) return "warn1";
  if (activeWarnings === 2) return "warn2";
  return "mute";
}
