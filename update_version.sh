#!/bin/bash

# Script to update the version of TrackEx Agent

# Check if a version argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./update_version.sh <new_version>"
  exit 1
fi

NEW_VERSION=$1

# Update Cargo.toml
sed -i "s/^version = .*/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i "s/^  \"version\": .*/  \"version\": \"$NEW_VERSION\",/" src-tauri/tauri.conf.json

# Update package.json
sed -i "s/^  \"version\": .*/  \"version\": \"$NEW_VERSION\",/" package.json

# Update package-lock.json if it exists
if [ -f "package-lock.json" ]; then
  sed -i "0,/\"version\": \".*\"/s//\"version\": \"$NEW_VERSION\"/" package-lock.json
  sed -i "s/\"name\": \"trackex-agent\",/\"name\": \"trackex-agent\",/; /\"name\": \"trackex-agent\",/{n; s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/}" package-lock.json
fi

# Update Cargo.lock
sed -i "/name = \"trackex-agent\"/,/^version = .*/ s/^version = .*/version = \"$NEW_VERSION\"/" src-tauri/Cargo.lock

echo "Version updated to $NEW_VERSION in all files (Cargo.toml, Cargo.lock, tauri.conf.json, package.json, package-lock.json)"