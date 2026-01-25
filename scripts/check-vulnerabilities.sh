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

# Get GitHub Dependabot vulnerability count
get_github_vulnerability_count() {
    # Check if gh CLI is available
    if ! command -v gh >/dev/null 2>&1; then
        echo "0"
        return
    fi

    # Get repo name from git remote
    local repo_url
    repo_url=$(git config --get remote.origin.url 2>/dev/null || echo "")
    if [ -z "$repo_url" ]; then
        echo "0"
        return
    fi

    # Extract owner/repo from URL
    local owner_repo
    owner_repo=$(echo "$repo_url" | sed -E 's/.*[:/]([^/]+\/[^/]+)(\.git)?$/\1/')

    # Query GitHub API for Dependabot alerts
    # Note: This requires 'security_events' scope or admin access
    local alerts
    alerts=$(gh api "repos/$owner_repo/dependabot/alerts?state=open" --jq 'length' 2>&1)

    # Check if we got a number or an error
    if [[ "$alerts" =~ ^[0-9]+$ ]]; then
        echo "$alerts"
    else
        # API call failed (likely permissions), return 0
        # The user can check https://github.com/<repo>/security/dependabot manually
        echo "0"
    fi
}

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
    local github_count=${3:-0}

    mkdir -p "$(dirname "$BASELINE_FILE")"

    cat > "$BASELINE_FILE" << EOF
{
  "root": $root_count,
  "backend": $backend_count,
  "github": $github_count,
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
        local github_count=$(get_github_vulnerability_count)
        save_baseline "$root_count" "$backend_count" "$github_count"
        exit 0
    fi

    echo "Checking for new vulnerabilities..."

    # Get current npm audit counts
    local root_current=$(get_vulnerability_counts "$PROJECT_ROOT")
    local backend_current=$(get_vulnerability_counts "$PROJECT_ROOT/backend")
    local total_current=$((root_current + backend_current))

    # Get GitHub Dependabot count
    local github_current=$(get_github_vulnerability_count)

    # Load baseline
    local baseline=$(load_baseline)
    local root_baseline=$(echo "$baseline" | jq -r '.root // 0')
    local backend_baseline=$(echo "$baseline" | jq -r '.backend // 0')
    local github_baseline=$(echo "$baseline" | jq -r '.github // 0')
    local total_baseline=$((root_baseline + backend_baseline))

    echo "npm audit vulnerabilities: root=$root_current, backend=$backend_current (total: $total_current)"
    echo "GitHub Dependabot alerts: $github_current"
    echo "Baseline: npm=$total_baseline, github=$github_baseline"

    # Check if there are NEW vulnerabilities (from either npm or GitHub)
    local new_npm_count=$((total_current - total_baseline))
    local new_github_count=$((github_current - github_baseline))
    local new_count=$((new_npm_count > 0 ? new_npm_count : 0))
    new_count=$((new_count + (new_github_count > 0 ? new_github_count : 0)))

    if [ "$new_npm_count" -gt 0 ] || [ "$new_github_count" -gt 0 ]; then
        echo -e "${RED}WARNING: NEW vulnerability(s) detected!${NC}"
        [ "$new_npm_count" -gt 0 ] && echo -e "${RED}  - $new_npm_count new npm audit vulnerabilities${NC}"
        [ "$new_github_count" -gt 0 ] && echo -e "${RED}  - $new_github_count new GitHub Dependabot alerts${NC}"

        # Get detailed info for the task description
        local root_details=$(get_vulnerability_details "$PROJECT_ROOT")
        local backend_details=$(get_vulnerability_details "$PROJECT_ROOT/backend")

        # Check if bd command exists
        if command -v bd >/dev/null 2>&1; then
            echo "Creating beads task to track new vulnerabilities..."

            # Determine task title based on source
            local title_source=""
            [ "$new_npm_count" -gt 0 ] && title_source="npm"
            [ "$new_github_count" -gt 0 ] && { [ -n "$title_source" ] && title_source="$title_source + GitHub" || title_source="GitHub"; }

            # Create a task with details
            bd create \
                --title="Fix new security vulnerabilities ($title_source)" \
                --type=bug \
                --priority=1 \
                --description="Detected NEW vulnerabilities after push.

## Summary
- New npm audit vulnerabilities: $new_npm_count
- New GitHub Dependabot alerts: $new_github_count

## Current State
- npm audit (root): $root_current vulnerabilities
- npm audit (backend): $backend_current vulnerabilities
- GitHub Dependabot: $github_current alerts

## Baseline (before)
- npm audit: $total_baseline vulnerabilities
- GitHub Dependabot: $github_baseline alerts

## Action Required
1. Run \`npm audit\` in root and backend directories to see npm details
2. Run \`npm audit fix\` to attempt automatic fixes
3. Visit https://github.com/fbasas/bball-playback/security/dependabot for GitHub alerts

## npm Audit Details

### Root Package
\`\`\`json
$root_details
\`\`\`

### Backend Package
\`\`\`json
$backend_details
\`\`\`"

            echo -e "${YELLOW}Task created. Run 'bd ready' to see it.${NC}"
        else
            echo -e "${YELLOW}bd command not found - please create a task manually${NC}"
        fi

        # Update baseline after creating task (so we don't create duplicate tasks)
        save_baseline "$root_current" "$backend_current" "$github_current"

        exit 1  # Non-zero to indicate new vulnerabilities found
    elif [ "$total_current" -gt 0 ] || [ "$github_current" -gt 0 ]; then
        echo -e "${YELLOW}No new vulnerabilities (existing: npm=$total_current, github=$github_current)${NC}"
        exit 0
    else
        echo -e "${GREEN}No vulnerabilities detected${NC}"
        exit 0
    fi
}

main "$@"
