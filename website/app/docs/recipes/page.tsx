import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "Save a proven command sequence once and replay it later with meero run <name>. Export, import and share recipes as plain files.",
};

const p = docsPager("/docs/recipes");

export default function Recipes() {
  return (
    <>
      <h1>Recipes</h1>
      <p>
        After a multi-command AI task succeeds, meero offers to save it as a
        <strong> recipe</strong>. Replay any time, no LLM call, no cost:
      </p>

      <Pre>
        <code>{`meero recipes                       # list saved recipes
meero run clean-build               # execute one (still asks for confirmation)
meero recipe rm <name>              # delete a recipe
meero recipe export team.json       # bundle ALL recipes into a shareable file
meero recipe export x.json deploy   # …or only the named ones
meero recipe import team.json       # merge them in (name clashes are skipped)
meero recipe import team.json --force  # overwrite same-named recipes`}</code>
      </Pre>

      <h2>Naming</h2>
      <p>
        When saving, meero guesses a name from the first three words of the
        task (lowercased, punctuation stripped, hyphen-joined), you can
        accept the guess or type your own.
      </p>

      <h2>Sharing with your team</h2>
      <p>
        Recipes are plain JSON under <C>~/.meero</C>.{" "}
        <C>recipe export</C> bundles them into one file; a teammate runs{" "}
        <C>recipe import</C> and gets every playbook. Import merges by
        default, same-named recipes are skipped unless you pass{" "}
        <C>--force</C>. Invalid entries in an imported file are ignored with a
        count, never a crash.
      </p>

      <Callout kind="warn">
        Running a recipe still goes through the normal execution pipeline:
        confirmation per your <Link href="/docs/safety">trust level</Link>,
        the safety gate, and an undo snapshot for mutating steps. A recipe is
        a saved plan, not a permission slip.
      </Callout>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
