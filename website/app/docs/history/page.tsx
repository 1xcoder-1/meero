import type { Metadata } from "next";
import { Pre, C, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Task history",
  description:
    "meero remembers past tasks. Use meero history to see what ran, what it cost and which files were touched, and clear it whenever you want.",
};

const p = docsPager("/docs/history");

export default function History() {
  return (
    <>
      <h1>Task history</h1>
      <p>
        meero remembers your past sessions: every task, its commands, exit
        codes, whether it finished, and how many AI fix rounds it needed.
      </p>

      <Pre>
        <code>{`meero history            # recent tasks (last 15)
meero history --clear    # erase`}</code>
      </Pre>

      <h2>What an entry looks like</h2>
      <Pre>
        <code>{`✔ 11/11/2026, 10:14:22  delete all .tmp files in the project
   Get-ChildItem -Recurse -Filter *.tmp | Remove-Item
✖ 11/11/2026, 09:02:11  squash the last 3 commits  [2 AI fix round(s)]
   git reset --soft HEAD~3 ; git commit -m "feat: …"`}</code>
      </Pre>
      <ul>
        <li><strong>✔ / ✖</strong>. whether the task ran to completion (a deliberate skip is not a failure).</li>
        <li><strong>[N AI fix round(s)]</strong>. how many times self-repair kicked in.</li>
        <li>The dim second line lists the commands that were executed.</li>
      </ul>

      <p>
        History entries also carry the undo snapshot id when one exists, so a
        forgotten task can still be reverted with <C>meero undo &lt;id&gt;</C>{" "}
        (see <C>meero undo --list</C>).
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
