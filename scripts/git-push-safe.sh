#!/bin/bash
#
# git-push-safe.sh
#
# A wrapper around git push that automatically checks for new npm vulnerabilities
# after a successful push and creates beads tasks to track them.
#
# Usage:
#   ./scripts/git-push-safe.sh [git push arguments]
#
# Examples:
#   ./scripts/git-push-safe.sh                    # Same as git push
#   ./scripts/git-push-safe.sh origin main        # Push to specific remote/branch
#   ./scripts/git-push-safe.sh -u origin feature  # Push with upstream tracking
#
# To make this the default behavior, add an alias:
#   alias gpush='./scripts/git-push-safe.sh'
#   or
#   git config --global alias.pushsafe '!bash scripts/git-push-safe.sh'

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the actual git push with all arguments
echo "Running git push $@..."
git push "$@"
PUSH_EXIT_CODE=$?

if [ $PUSH_EXIT_CODE -ne 0 ]; then
    echo "Git push failed with exit code $PUSH_EXIT_CODE"
    exit $PUSH_EXIT_CODE
fi

echo ""
echo "Push successful. Checking for new vulnerabilities..."
echo ""

# Run vulnerability check (don't fail the script if vulnerabilities are found)
"$SCRIPT_DIR/check-vulnerabilities.sh" || true

exit 0
