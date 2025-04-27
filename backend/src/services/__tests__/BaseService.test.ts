import { BaseService } from '../BaseService';

// Create a concrete implementation of the abstract BaseService for testing
class TestService extends BaseService {
  public testGetDependency<T>(name: string): T {
    return this.getDependency<T>(name);
  }

  public testHasDependency(name: string): boolean {
    return this.hasDependency(name);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    // Create a new instance of the service before each test
    service = new TestService();
  });

  describe('constructor', () => {
    it('should initialize with empty dependencies', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with provided dependencies', () => {
      const dependencies = {
        testDep: 'test value'
      };
      service = new TestService(dependencies);
      expect(service.testHasDependency('testDep')).toBe(true);
    });
  });

  describe('addDependency', () => {
    it('should add a dependency', () => {
      service.addDependency('testDep', 'test value');
      expect(service.testHasDependency('testDep')).toBe(true);
    });

    it('should override an existing dependency', () => {
      service.addDependency('testDep', 'initial value');
      service.addDependency('testDep', 'new value');
      expect(service.testGetDependency<string>('testDep')).toBe('new value');
    });
  });

  describe('getDependency', () => {
    it('should return a dependency that exists', () => {
      service.addDependency('testDep', 'test value');
      expect(service.testGetDependency<string>('testDep')).toBe('test value');
    });

    it('should throw an error when dependency does not exist', () => {
      expect(() => {
        service.testGetDependency<string>('nonExistentDep');
      }).toThrow("Dependency 'nonExistentDep' not found in TestService");
    });
  });

  describe('hasDependency', () => {
    it('should return true when dependency exists', () => {
      service.addDependency('testDep', 'test value');
      expect(service.testHasDependency('testDep')).toBe(true);
    });

    it('should return false when dependency does not exist', () => {
      expect(service.testHasDependency('nonExistentDep')).toBe(false);
    });
  });
});