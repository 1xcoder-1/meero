import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Install meero on macOS, Linux and Windows with one command, or grab the .deb, .pkg or Windows setup package straight from GitHub Releases.",
};

const p = docsPager("/docs/installation");

export default function Installation() {
  return (
    <>
      <h1>Installation</h1>

      <h2>Quick install (macOS / Linux)</h2>
      <Pre>
        <code>{`curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh | bash`}</code>
      </Pre>
      <p>
        Or download and run manually:
      </p>
      <Pre>
        <code>{`curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh -o install.sh
chmod +x install.sh
./install.sh`}</code>
      </Pre>
      <p>
        The script detects your OS and architecture, downloads the latest
        compressed release (~45&nbsp;MB instead of the raw ~110&nbsp;MB
        binary), extracts it, and installs to <C>/usr/local/bin</C> or{" "}
        <C>~/.local/bin</C>.
      </p>

      <h2>Quick install (Windows)</h2>
      <Pre>
        <code>{`iwr https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -useb | iex`}</code>
      </Pre>
      <p>
        Run in PowerShell. The binary is installed to{" "}
        <C>{`%USERPROFILE%\.local\bin`}</C> and added to your user PATH
        automatically. Or download and run manually:
      </p>
      <Pre>
        <code>{`Invoke-WebRequest -Uri https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -OutFile install.ps1
.\\install.ps1`}</code>
      </Pre>

      <h2>Setup packages (GitHub Releases)</h2>
      <p>
        Prefer a real installer? Every{" "}
        <a href="https://github.com/1xcoder-1/meero/releases/latest">release</a>{" "}
        ships proper setup packages with the meero icon branding:
      </p>
      <table>
        <thead>
          <tr><th>Platform</th><th>Asset</th><th>Install</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Windows</td>
            <td><C>meero-setup-windows-x64.exe</C></td>
            <td>Double-click, Start Menu shortcut, user PATH, uninstaller included</td>
          </tr>
          <tr>
            <td>Linux (Debian/Ubuntu)</td>
            <td><C>meero-linux-x64.deb</C> / <C>meero-linux-arm64.deb</C></td>
            <td><C>sudo apt install -y ./meero-linux-x64.deb</C> (after downloading it from the release)</td>
          </tr>
          <tr>
            <td>macOS</td>
            <td><C>meero-macos-arm64.pkg</C> / <C>meero-macos-x64.pkg</C></td>
            <td>Double-click the package, or <C>sudo installer -pkg meero-macos-arm64.pkg -target /</C> (from the folder you downloaded it into)</td>
          </tr>
          <tr>
            <td>Any (terminal)</td>
            <td><C>meero-*.zip</C> / <C>meero-*.tar.gz</C></td>
            <td>The <C>curl | bash</C> / <C>iwr | iex</C> scripts above</td>
          </tr>
        </tbody>
      </table>
      <Callout kind="ok">
        The Windows executable carries the meero icon (not the Bun default)
        and proper version metadata in its properties.
      </Callout>

      <h2>From source</h2>
      <p>Requires <a href="https://bun.sh">Bun</a>:</p>
      <Pre>
        <code>{`git clone https://github.com/1xcoder-1/meero.git
cd meero
bun install`}</code>
      </Pre>

      <h2>Verify the install</h2>
      <Pre>
        <code>{`meero -v        # version
meero help      # the help box
meero doctor    # node / npm / git / docker health check, no AI needed
meero interactive  # start interactive multi-step task mode`}</code>
      </Pre>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
