#!/bin/bash
# Second Brain - Quick GitHub Push Helper

echo "====================================================="
echo "⚡ Second Brain - GitHub Repository Upload Helper"
echo "====================================================="

if [ -z "$1" ]; then
  echo ""
  echo "Usage: ./push_to_github.sh <YOUR_GITHUB_REPO_URL>"
  echo "Example: ./push_to_github.sh https://github.com/yourusername/second-brain.git"
  echo ""
  exit 1
fi

REPO_URL=$1

echo "1. Initializing Git repository..."
git init

echo "2. Adding files (ignoring node_modules)..."
git add .

echo "3. Creating initial commit..."
git commit -m "feat: Second Brain full-stack task scheduler command center"

echo "4. Setting default branch to main..."
git branch -M main

echo "5. Linking remote repository..."
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

echo "6. Pushing code to GitHub..."
git push -u origin main

echo ""
echo "====================================================="
echo "✓ Successfully uploaded to GitHub!"
echo "====================================================="
