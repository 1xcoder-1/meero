#!/usr/bin/env bash

set -e

REPO="1xcoder-1/meero"
BINARY_NAME="meero"

echo "Installing $BINARY_NAME..."

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    PLATFORM="macos"
    ;;
  Linux)
    PLATFORM="linux"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  arm64|aarch64)
    ARCH="arm64"
    ;;
  x86_64)
    ARCH="x64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

FILENAME="$BINARY_NAME-$PLATFORM-$ARCH"

if [[ "$PLATFORM" == "windows" ]]; then
  FILENAME="$FILENAME.exe"
fi

URL="https://github.com/$REPO/releases/latest/download/$FILENAME"

TMP_FILE="$(mktemp)"

echo "Downloading $FILENAME..."
if ! curl --proto '=https' --tlsv1.2 -fsSL "$URL" -o "$TMP_FILE"; then
  echo "✖ Download failed: $URL"
  echo "  Check that a release exists: https://github.com/$REPO/releases/latest"
  rm -f "$TMP_FILE"
  exit 1
fi

chmod +x "$TMP_FILE"

INSTALL_DIR="/usr/local/bin"

if [ ! -w "$INSTALL_DIR" ]; then
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

mv "$TMP_FILE" "$INSTALL_DIR/$BINARY_NAME"

echo "Installed to $INSTALL_DIR/$BINARY_NAME"

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "Adding $INSTALL_DIR to PATH..."

  SHELL_NAME="$(basename "$SHELL")"

  if [[ "$SHELL_NAME" == "zsh" ]]; then
    RC_FILE="$HOME/.zshrc"
  elif [[ "$SHELL_NAME" == "bash" ]]; then
    RC_FILE="$HOME/.bashrc"
  else
    RC_FILE="$HOME/.profile"
  fi

  echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$RC_FILE"
  echo "Added to $RC_FILE"
  echo "Restart your terminal or run:"
  echo "  source $RC_FILE"
fi

echo ""
echo "✔ $BINARY_NAME installed successfully"
echo "Run: $BINARY_NAME setup"
