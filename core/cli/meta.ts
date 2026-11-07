/**
 * Requests about meero itself (setup / settings / config / model) are handled
 * locally — they must never reach the LLM. It once "solved" a typo'd
 * `meero steup` by web-searching and generating a pip/uv install of a random
 * third-party CLI. Bare "model" is deliberately NOT matched: it is a plausible
 * task verb ("model a schema from json").
 */
const CONFIG_RE =
  /^(?:meero|miro)?\s*(?:steup|setup|settings?|config(?:uration)?)\s*(?:meero|miro)?[!.?]*$/i;
const MODEL_RE =
  /^(?:meero|miro)\s*(?:model|models|change\s+model|switch\s+model|model\s+change)[!.?]*$/i;

export function isMetaRequest(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return CONFIG_RE.test(t) || MODEL_RE.test(t);
}
