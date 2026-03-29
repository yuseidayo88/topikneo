#!/bin/bash
# Expo Go の QR コードを表示する起動スクリプト
# ターミナルで実行: ./start-with-qr.sh または bash start-with-qr.sh
cd "$(dirname "$0")"
unset CI
npx expo start --tunnel
