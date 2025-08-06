#!/bin/bash

#Switch to the script's directory (in case user runs from elsewhere)
cd "$(dirname "$0")"

APP_NAME="Parrrot"

#Check if FLRig is reachable on localhost:12345
FLRIG_HOST="127.0.0.1"
FLRIG_PORT=12345

if ! command -v nc &> /dev/null; then
  echo "⚠️ 'nc' (netcat) is not installed. Cannot check FLRig status."
else
  if ! nc -z $FLRIG_HOST $FLRIG_PORT; then
    echo "⚠️ FLRig does not appear to be reachable on $FLRIG_HOST:$FLRIG_PORT."
    echo "Make sure FLRig is running before starting Parrrot."
    read -p "Press [Enter] to continue anyway or [Ctrl+C] to abort."
  fi
fi

# Suppress Electron security warnings
export ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Ensure app binary is executable
chmod +x "$APP_NAME"

# Start the app
./"$APP_NAME"
