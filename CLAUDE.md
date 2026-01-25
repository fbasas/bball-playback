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
