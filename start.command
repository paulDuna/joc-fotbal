#!/bin/zsh
# Dublu-click pe acest fisier ca sa pornesti jocul.
cd "$(dirname "$0")"
PORT=8123
(sleep 1 && open "http://localhost:$PORT/") &
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "Pe acest calculator:  http://localhost:$PORT/"
[ -n "$IP" ] && echo "Pe telefon (acelasi Wi-Fi):  http://$IP:$PORT/"
echo "(inchide fereastra asta ca sa opresti jocul)"
python3 -m http.server $PORT
