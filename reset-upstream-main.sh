#!/bin/bash

# Script to complete the upstream-main branch reset
# Run this script with repository write access to complete the reset operation

set -e

echo "========================================="
echo "Reset upstream-main Branch Script"
echo "========================================="
echo ""

TARGET_COMMIT="bac7bd445d5d4c7c602399a842518f40ec591f2d"
BRANCH_NAME="upstream-main"

echo "This script will reset the $BRANCH_NAME branch to:"
echo "  Commit: $TARGET_COMMIT"
echo "  Message: Migrate server code to server/index.ts and simplify processes (#1066)"
echo ""
echo "The following commits will be REMOVED:"
echo "  - ee739f374f43526c885921839c1b9cde9c0997ba (Merge branch 'kasper/staging-app-per-pr')"
echo "  - 1c0c94167c1bbc2eb5503c5bf129126feaaad0fc (Create a staging environment deployment for pull requests)"
echo "  - ef94b81297b667af1c249da70e8ad7fc600bbbe2 (Update app name in fly.toml to epic-rsc-stack)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1/4: Fetching latest changes..."
git fetch origin

echo ""
echo "Step 2/4: Checking out $BRANCH_NAME..."
git checkout "$BRANCH_NAME"

echo ""
echo "Step 3/4: Resetting to target commit..."
git reset --hard "$TARGET_COMMIT"

echo ""
echo "Current HEAD:"
git --no-pager log --oneline -1
echo ""

echo "Step 4/4: Force pushing to origin..."
git push origin "$BRANCH_NAME" --force

echo ""
echo "========================================="
echo "✓ Reset completed successfully!"
echo "========================================="
echo ""
echo "Verification:"
git --no-pager log --oneline "$BRANCH_NAME" -5
echo ""
echo "The $BRANCH_NAME branch has been reset to $TARGET_COMMIT"
