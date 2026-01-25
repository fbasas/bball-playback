# Project Guidelines for Claude

## Architecture Principles

### Data Access vs Business Logic Separation
- **Repositories**: Thin SQL wrappers only - fetch/store data, no business logic
- **Services**: All business logic - pure functions where possible, receive data via dependency injection

### Testing Guidelines
- **Mock data is ONLY for unit testing**, not for any functional/runtime use
- Only use mocks in production code if explicitly requested by the user
- Unit tests should inject mock repositories to test service business logic
- Integration tests use real database connections

### Dependency Injection Pattern
Services receive their dependencies via constructor injection:
```typescript
class SomeService {
  constructor(private repo: ISomeRepository) {}
}
```

This enables:
- Easy mocking in tests
- Loose coupling
- Clear separation of concerns

## Security & Vulnerability Management

### Automatic Vulnerability Tracking
After pushing code, run the vulnerability check script to detect new npm vulnerabilities:

```bash
# Check for new vulnerabilities (compares against baseline)
./scripts/check-vulnerabilities.sh

# Update baseline after fixing vulnerabilities
./scripts/check-vulnerabilities.sh --update

# Or use the safe push wrapper that runs the check automatically
./scripts/git-push-safe.sh
```

The system:
1. Stores a baseline of known vulnerabilities in `.beads/vulnerability-baseline.json`
2. After push, compares current vulnerabilities against the baseline
3. If NEW vulnerabilities are detected, automatically creates a beads task to track them
4. Updates the baseline to prevent duplicate tasks

### Best Practices
- Run `npm audit` periodically to check for vulnerabilities
- Use `npm audit fix` to automatically fix what can be fixed
- Critical/High severity vulnerabilities should be fixed immediately
- The vulnerability baseline is tracked in git so the team shares the same baseline
