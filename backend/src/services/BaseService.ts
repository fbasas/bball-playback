import { logger } from '../core/logging';

/**
 * Base service class that provides common functionality for all services
 *
 * This abstract class serves as a foundation for standardizing service patterns
 * with dependency injection throughout the application. It provides a consistent
 * way to manage dependencies, log service initialization, and handle common
 * service operations.
 *
 * All service classes in the application should extend this base class to ensure
 * consistent behavior and dependency management.
 *
 * @example
 * ```typescript
 * export class YourService extends BaseService {
 *   private someRepository: SomeRepository;
 *
 *   constructor(dependencies: Record<string, any> = {}) {
 *     super(dependencies);
 *     this.someRepository = dependencies.someRepository || SomeRepository.getInstance();
 *   }
 *
 *   public async someMethod(param: string): Promise<Result> {
 *     // Implementation using this.someRepository
 *   }
 * }
 * ```
 */
export abstract class BaseService {
  /**
   * Creates a new instance of the service
   *
   * The constructor initializes the service with optional dependencies and logs
   * the initialization for debugging purposes. Dependencies are stored in a protected
   * property that can be accessed by derived classes.
   *
   * @param dependencies Optional dependencies to inject as a record of name-value pairs
   *
   * @example
   * ```typescript
   * const service = new YourService({
   *   repository: customRepository,
   *   logger: customLogger
   * });
   * ```
   */
  constructor(protected dependencies: Record<string, any> = {}) {
    logger.debug(`Initializing ${this.constructor.name}`);
  }

  /**
   * Gets a dependency by name
   *
   * Retrieves a dependency from the dependencies object by its name. This method
   * provides type safety through generics and throws an error if the requested
   * dependency is not found.
   *
   * @template T The expected type of the dependency
   * @param name The name of the dependency to retrieve
   * @returns The dependency instance cast to the expected type
   * @throws Error if the dependency is not found in the dependencies object
   *
   * @example
   * ```typescript
   * // Get a repository dependency
   * const repository = this.getDependency<Repository>('repository');
   *
   * // Get a logger dependency
   * const logger = this.getDependency<Logger>('logger');
   * ```
   */
  protected getDependency<T>(name: string): T {
    if (!this.dependencies[name]) {
      throw new Error(`Dependency '${name}' not found in ${this.constructor.name}`);
    }
    return this.dependencies[name] as T;
  }

  /**
   * Checks if a dependency exists
   *
   * Verifies whether a dependency with the specified name exists in the
   * dependencies object without attempting to retrieve it. This is useful
   * for conditional logic based on the availability of optional dependencies.
   *
   * @param name The name of the dependency to check
   * @returns True if the dependency exists, false otherwise
   *
   * @example
   * ```typescript
   * if (this.hasDependency('optionalFeature')) {
   *   const feature = this.getDependency<Feature>('optionalFeature');
   *   // Use the optional feature
   * } else {
   *   // Use default behavior
   * }
   * ```
   */
  protected hasDependency(name: string): boolean {
    return !!this.dependencies[name];
  }

  /**
   * Adds a dependency to the service
   *
   * Adds or replaces a dependency in the dependencies object. This method
   * allows for dynamic dependency injection after the service has been
   * instantiated, which is useful for testing or reconfiguring services
   * at runtime.
   *
   * @param name The name of the dependency to add
   * @param instance The dependency instance to store
   *
   * @example
   * ```typescript
   * // Add a mock repository for testing
   * service.addDependency('repository', mockRepository);
   *
   * // Replace a logger with a custom implementation
   * service.addDependency('logger', customLogger);
   * ```
   */
  public addDependency(name: string, instance: any): void {
    this.dependencies[name] = instance;
  }
}