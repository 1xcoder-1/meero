import { describe, test, expect } from "bun:test";
import {
  assessCommitQuality,
  redactSecrets,
  sanitizeMessage,
} from "../core/cli/commits";

describe("assessCommitQuality", () => {
  test("well-formed conventional messages score ≥ 7", () => {
    for (const m of [
      "fix(auth): handle null token on expired sessions",
      "feat(api): add pagination to the users endpoint",
    ]) {
      expect(assessCommitQuality(m).isWellFormed).toBe(true);
    }
  });

  test("bad messages are flagged for rewriting", () => {
    for (const m of ["update", "fix", "wip", "stuff", "changes", "x"]) {
      const q = assessCommitQuality(m);
      expect(q.isWellFormed).toBe(false);
    }
  });

  test("long messages lose the length point", () => {
    const q = assessCommitQuality(
      "feat: this subject line is extremely long and definitely exceeds seventy two characters in total length",
    );
    expect(q.isWellFormed).toBe(false);
  });
});

describe("redactSecrets", () => {
  test("hides sensitive file hunks", () => {
    const diff = [
      "diff --git a/.env b/.env",
      "index 123..456 100644",
      "--- a/.env",
      "+++ b/.env",
      "+OPENAI_API_KEY=sk-abc",
      "diff --git a/src/x.ts b/src/x.ts",
      "+const ok = true;",
    ].join("\n");
    const out = redactSecrets(diff);
    expect(out).not.toContain("sk-abc");
    expect(out).toContain("CONTENT HIDDEN");
    expect(out).toContain("const ok = true;");
  });

  test("redacts keys, tokens, JWTs, connection strings", () => {
    const out = redactSecrets(
      [
        "sk-abcdefghijklmnopqrstuvwxyz012345",
        "ghp_" + "a".repeat(36),
        "Bearer abcdefghijklmnop",
        "postgres://user:pass@db.example.com/x",
        "password = hunter2hunter2",
        "AKIAIOSFODNN7EXAMPLE",
        "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----",
      ].join("\n"),
    );
    for (const leak of [
      "sk-abcdefghij",
      "ghp_",
      "Bearer abcdefghijklmno",
      "user:pass@",
      "hunter2hunter2",
      "AKIAIOSFODNN7EXAMPLE",
      "PRIVATE KEY-----\nabc",
    ]) {
      expect(out).not.toContain(leak);
    }
  });

  test("leaves normal code untouched", () => {
    const code = "+const retries = config.maxRetries ?? 3;";
    expect(redactSecrets(code)).toContain(code);
  });
});

describe("sanitizeMessage", () => {
  test("takes the first meaningful line and strips wrapping quotes", () => {
    expect(sanitizeMessage('"fix: the bug"\n\nextra')).toBe("fix: the bug");
    expect(sanitizeMessage("```feat: from code fence```")).toBe(
      "feat: from code fence",
    );
    expect(sanitizeMessage("")).toBe("");
    expect(sanitizeMessage(null as any)).toBe("");
  });
});
