#!/bin/bash
# Starts the dev server from this folder, using nvm's default Node if nvm is installed.
cd "$(dirname "$0")"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
exec npm run dev
