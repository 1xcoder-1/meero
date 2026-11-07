/**
 * The single decision point for "what does this typed line mean?", in the
 * order users expect: slash command → pre-built pack → meero-config question
 * → casual chat → AI task. Everything is settled BEFORE the model is
 * considered, so a command that exists locally can never leak into an AI
 * call — and the AI only ever receives real developer tasks.
 */
import { getBuiltinInput } from "./builtin";
import { isCasualChat, stripMeeroPrefix } from "./guardrail";
import { isMetaRequest } from "./meta";

export type Route =
  /** nothing typed (or only the CLI name) → help box, never chat */
  | { kind: "help" }
  /** `meero /settings`, `meero /undo --list` … */
  | { kind: "slash"; name: string; rest: string[] }
  /** `meero status`, `meero kill-port 8080` … */
  | { kind: "pack"; id: string; rest: string[] }
  /** "setup" / "settings" as words → point at the real commands */
  | { kind: "meta" }
  /** small talk, refused without spending a token */
  | { kind: "chat" }
  /** a genuine task for the model */
  | { kind: "ai"; text: string };

export function routeInput(raw: string): Route {
  // a typed/quoted "meero" prefix is noise ("meero hi") — strip it so every
  // classifier below sees the real words
  const text = stripMeeroPrefix(raw);
  if (!text) return { kind: "help" };

  const parts = text.split(/\s+/).filter(Boolean);
  const head = parts[0] ?? "";

  if (head.startsWith("/"))
    return {
      kind: "slash",
      name: head.slice(1).toLowerCase(),
      rest: parts.slice(1),
    };

  const pack = getBuiltinInput(head);
  if (pack) return { kind: "pack", id: pack.id, rest: parts.slice(1) };

  if (isMetaRequest(text)) return { kind: "meta" };
  if (isCasualChat(text)) return { kind: "chat" };
  return { kind: "ai", text };
}
