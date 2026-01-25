#!/bin/bash
#
# check-vulnerabilities.sh
#
# Checks for npm vulnerabilities and creates beads tasks for NEW vulnerabilities.
# This script compares the current vulnerability count against a stored baseline
# and creates a tracking task only when new vulnerabilities are detected.
#
# Usage:
#   ./scripts/check-vulnerabilities.sh          # Check and report
#   ./scripts/check-vulnerabilities.sh --update # Update baseline only
#
# Called automatically by git-push-safe.sh after successful pushes.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$PROJECT_ROOT/.beads/vulnerability-baseline.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current vulnerability counts
get_vulnerability_counts() {
    local dir=$1
    cd "$dir"

    # Run npm audit and capture JSON output
    # npm audit returns non-zero on vulnerabilities, so we ignore the exit code
    local audit_output
    audit_output=$(npm audit --json 2>/dev/null || true)

    if [ -z "$audit_output" ]; then
        echo "0"
        return
    fi

    # Extract total vulnerability count
    local total
    total=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities | to_entries | map(.value) | add // 0' 2>/dev/null || echo "0")
    echo "$total"
}

# Get detailed vulnerability info
get_vulnerability_details() {
    local dir=$1
    cd "$dir"

    local audit_output
    audit_output=$(npm audit --json 2>/dev/null || true)

    if [ -z "$audit_output" ]; then
        echo "{}"
        return
    fi

    # Extract vulnerability breakdown by severity
    echo "$audit_output" | jq -r '.metadata.vulnerabilities // {}' 2>/dev/null || echo "{}"
}

# Load baseline
load_baseline() {
    if [ -f "$BASELINE_FILE" ]; then
        cat "$BASELINE_FILE"
    else
        echo '{"root": 0, "backend": 0, "timestamp": "never"}'
    fi
}

# Save baseline
save_baseline() {
    local root_count=$1
    local backend_count=$2

    mkdir -p "$(dirname "$BASELINE_FILE")"

    cat > "$BASELINE_FILE" << EOF
{
  "root": $root_count,
  "backend": $backend_count,
  "timestamp": "$(date -Iseconds)",
  "root_details": $(get_vulnerability_details "$PROJECT_ROOT"),
  "backend_details": $(get_vulnerability_details "$PROJECT_ROOT/backend")
}
EOF

    echo -e "${GREEN}Vulnerability baseline updated${NC}"
}

# Main logic
main() {
    cd "$PROJECT_ROOT"

    # Check for --update flag
    if [ "$1" = "--update" ]; then
        echo "Updating vulnerability baseline..."
        local root_count=$(get_vulnerability_counts "$PROJECT_ROOT")
        local backend_count=$(get_vulnerability_counts "$PROJECT_ROOT/backend")
        save_baseline "$root_count" "$backend_count"
        exit 0
    fi

    echo "Checking for new npm vulnerabilities..."

    # Get current counts
    local root_current=$(get_vulnerability_counts "$PROJECT_ROOT")
    local backend_current=$(get_vulnerability_counts "$PROJECT_ROOT/backend")
    local total_current=$((root_current + backend_current))

    # Load baseline
    local baseline=$(load_baseline)
    local root_baseline=$(echo "$baseline" | jq -r '.root // 0')
    local backend_baseline=$(echo "$baseline" | jq -r '.backend // 0')
    local total_baseline=$((root_baseline + backend_baseline))

    echo "Current vulnerabilities: root=$root_current, backend=$backend_current (total: $total_current)"
    echo "Baseline vulnerabilities: root=$root_baseline, backend=$backend_baseline (total: $total_baseline)"

    # Check if there are NEW vulnerabilities
    local new_count=$((total_current - total_baseline))

    if [ "$new_count" -gt 0 ]; then
        echo -e "${RED}WARNING: $new_count NEW vulnerability(s) detected!${NC}"

        # Get detailed info for the task description
        local root_details=$(get_vulnerability_details "$PROJECT_ROOT")
        local backend_details=$(get_vulnerability_details "$PROJECT_ROOT/backend")

        # Check if bd command exists
        if command -v bd >/dev/null 2>&1; then
            echo "Creating beads task to track new vulnerabilities..."

            # Create a task with details
            bd create \
                --title="Fix $new_count new npm security vulnerabilities" \
                --type=bug \
                --priority=1 \
                --description="Detected $new_count NEW npm vulnerabilities after push.

## Current State
- Root package: $root_current vulnerabilities
- Backend package: $backend_current vulnerabilities
- Total: $total_current vulnerabilities

## Baseline (before)
- Root package: $root_baseline vulnerabilities
- Backend package: $backend_baseline vulnerabilities
- Total: $total_baseline vulnerabilities

## Action Required
Run \`npm audit\` in root and backend directories to see details.
Run \`npm audit fix\` to attempt automatic fixes.

## Root Vulnerabilities
\`\`\`json
$root_details
\`\`\`

## Backend Vulnerabilities
\`\`\`json
$backend_details
\`\`\`"

            echo -e "${YELLOW}Task created. Run 'bd ready' to see it.${NC}"
        else
            echo -e "${YELLOW}bd command not found - please create a task manually${NC}"
        fi

        # Update baseline after creating task (so we don't create duplicate tasks)
        save_baseline "$root_current" "$backend_current"

        exit 1  # Non-zero to indicate new vulnerabilities found
    elif [ "$total_current" -gt 0 ]; then
        echo -e "${YELLOW}No new vulnerabilities (existing: $total_current)${NC}"
        exit 0
    else
        echo -e "${GREEN}No vulnerabilities detected${NC}"
        exit 0
    fi
}

main "$@"
