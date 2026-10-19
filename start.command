#!/bin/zsh
# Double-click from Finder, or run: zsh start.command
cd "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  exec node scripts/serve.cjs --open
elif command -v python3 >/dev/null 2>&1; then
  print '巷口，開始 v10.1：http://127.0.0.1:4173（僅本機，Control-C 停止）'
  (sleep 1; open 'http://127.0.0.1:4173') &
  exec python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
else
  print '目前找不到 Node.js 或 Python 3。請先看 README.md 的本機啟動方式。'
  read '?按 Return 結束。'
fi
