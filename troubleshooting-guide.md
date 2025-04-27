# Troubleshooting Guide for Baseball Playback Application

This guide provides solutions for common issues that may arise during development, testing, and deployment of the Baseball Playback application.

## Table of Contents

1. [Backend Issues](#backend-issues)
2. [Frontend Issues](#frontend-issues)
3. [Database Issues](#database-issues)
4. [OpenAI API Issues](#openai-api-issues)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)
7. [Common Error Messages](#common-error-messages)

## Backend Issues

### Server Won't Start

**Symptoms:**
- Error message: `Error: listen EADDRINUSE: address already in use :::3001`
- Server fails to start

**Possible Causes:**
1. Another instance of the server is already running
2. Another application is using the same port

**Solutions:**
1. Check for running Node.js processes:
   ```bash
   # On Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   
   # On macOS/Linux
   lsof -i :3001
   kill -9 <PID>
   ```
2. Change the port in `backend/src/config/config.ts`:
   ```typescript
   port: process.env.PORT || '3002',
   ```

### TypeScript Compilation Errors

**Symptoms:**
- Error messages related to TypeScript types
- Server fails to start with compilation errors

**Possible Causes:**
1. Incompatible type definitions
2. Missing type declarations
3. Incorrect imports

**Solutions:**
1. Check for type errors:
   ```bash
   cd backend
   npx tsc --noEmit
   ```
2. Update TypeScript dependencies:
   ```bash
   npm update typescript @types/node @types/express
   ```
3. Verify that all imports use the correct paths and types

### Validation Errors

**Symptoms:**
- Error messages like `ValidationError: Invalid data: ...`
- API requests fail with 400 Bad Request

**Possible Causes:**
1. Request data doesn't match the expected schema
2. Missing required fields
3. Incorrect data types

**Solutions:**
1. Check the validation schemas in `backend/src/validation/schemas.ts`
2. Verify that the request data matches the expected schema
3. Use the validation middleware correctly:
   ```typescript
   router.post('/endpoint',
     validateBody(YourRequestSchema),
     yourHandler
   );
   ```

### Middleware Order Issues

**Symptoms:**
- Unexpected behavior in request processing
- Missing headers or parameters
- Authentication failures

**Possible Causes:**
1. Middleware is applied in the wrong order
2. Missing middleware

**Solutions:**
1. Ensure middleware is applied in the correct order:
   ```typescript
   // Correct order
   app.use(express.json());
   app.use(cors());
   app.use(httpLogger);
   app.use('/api', apiRouter);
   app.use(errorMiddleware);
   ```
2. Verify that all required middleware is applied

## Frontend Issues

### React Component Rendering Issues

**Symptoms:**
- Components don't render as expected
- Missing elements or incorrect styling
- Console errors related to React rendering

**Possible Causes:**
1. Missing dependencies in useEffect
2. State updates on unmounted components
3. Incorrect JSX syntax

**Solutions:**
1. Check useEffect dependencies:
   ```jsx
   // Include all dependencies
   useEffect(() => {
     // Effect code
   }, [dependency1, dependency2]);
   ```
2. Use cleanup functions to prevent updates on unmounted components:
   ```jsx
   useEffect(() => {
     let isMounted = true;
     fetchData().then(data => {
       if (isMounted) {
         setState(data);
       }
     });
     return () => { isMounted = false; };
   }, []);
   ```
3. Verify JSX syntax and component structure

### API Connection Issues

**Symptoms:**
- Network errors in the console
- Components don't load data
- "Failed to fetch" errors

**Possible Causes:**
1. Backend server is not running
2. CORS issues
3. Incorrect API URL

**Solutions:**
1. Ensure the backend server is running
2. Check CORS configuration in the backend:
   ```typescript
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true
   }));
   ```
3. Verify the API URL in `frontend/src/config/config.ts`:
   ```typescript
   apiBaseUrl: 'http://localhost:3001/api',
   ```

### State Management Issues

**Symptoms:**
- Unexpected component behavior
- State updates don't reflect in the UI
- Components re-render too often

**Possible Causes:**
1. Incorrect state updates
2. Missing state dependencies
3. Unnecessary re-renders

**Solutions:**
1. Use the functional form of setState for updates based on previous state:
   ```jsx
   setCount(prevCount => prevCount + 1);
   ```
2. Use the React DevTools to inspect component state and props
3. Implement React.memo or useMemo to prevent unnecessary re-renders:
   ```jsx
   const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   ```

### TypeScript Errors in React Components

**Symptoms:**
- TypeScript errors related to props or state
- Type incompatibility errors

**Possible Causes:**
1. Missing or incorrect prop types
2. Incompatible type definitions
3. Type assertions that don't match actual data

**Solutions:**
1. Define proper interfaces for props:
   ```tsx
   interface YourComponentProps {
     prop1: string;
     prop2?: number;
     onAction: (id: string) => void;
   }
   
   export const YourComponent: React.FC<YourComponentProps> = ({ prop1, prop2, onAction }) => {
     // Component code
   };
   ```
2. Use type guards for runtime type checking:
   ```tsx
   if (typeof data === 'object' && data !== null && 'property' in data) {
     // Safe to use data.property
   }
   ```

## Database Issues

### Connection Errors

**Symptoms:**
- Error messages like `Error: connect ECONNREFUSED`
- Database queries fail
- Application crashes on startup

**Possible Causes:**
1. MySQL server is not running
2. Incorrect connection details
3. Network issues

**Solutions:**
1. Verify that the MySQL server is running:
   ```bash
   # On Windows
   sc query mysql
   
   # On macOS
   brew services list | grep mysql
   
   # On Linux
   systemctl status mysql
   ```
2. Check the database connection settings in `.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=baseball_playback
   ```
3. Test the connection manually:
   ```bash
   mysql -u root -p -h localhost
   ```

### Migration Issues

**Symptoms:**
- Error messages related to database migrations
- Missing tables or columns
- Data integrity issues

**Possible Causes:**
1. Migrations haven't been run
2. Migration files are corrupted
3. Conflicts between migrations

**Solutions:**
1. Run the latest migrations:
   ```bash
   cd backend
   npx knex migrate:latest
   ```
2. Check the migration status:
   ```bash
   npx knex migrate:status
   ```
3. Rollback and reapply migrations if needed:
   ```bash
   npx knex migrate:rollback
   npx knex migrate:latest
   ```

### Query Performance Issues

**Symptoms:**
- Slow API responses
- Database queries take a long time to execute
- High CPU usage on the database server

**Possible Causes:**
1. Missing indexes
2. Inefficient queries
3. Large result sets

**Solutions:**
1. Add indexes to frequently queried columns:
   ```typescript
   // In a migration file
   export async function up(knex: Knex): Promise<void> {
     return knex.schema.table('your_table', (table) => {
       table.index(['column1', 'column2']);
     });
   }
   ```
2. Optimize queries by limiting result sets and using joins efficiently
3. Implement caching for frequently accessed data:
   ```typescript
   const result = await cache.getOrCompute(
     `key:${id}`,
     async () => {
       return await repository.fetchData(id);
     }
   );
   ```

## OpenAI API Issues

### API Key Issues

**Symptoms:**
- Error messages like `Error: Invalid API key`
- Commentary generation fails
- Authentication errors

**Possible Causes:**
1. Missing or invalid API key
2. API key not set in environment variables
3. API key has expired or been revoked

**Solutions:**
1. Check that the API key is set in `.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
2. Verify that the API key is valid by testing it with a simple request
3. Generate a new API key if needed

### Rate Limit Issues

**Symptoms:**
- Error messages like `Error: Rate limit exceeded`
- Intermittent failures in commentary generation
- Delays in API responses

**Possible Causes:**
1. Too many requests to the OpenAI API
2. Exceeding the rate limits for your API key
3. Large requests that consume too many tokens

**Solutions:**
1. Implement rate limiting and retry logic:
   ```typescript
   const maxRetries = 3;
   let retries = 0;
   
   while (retries < maxRetries) {
     try {
       return await openai.createCompletion(/* params */);
     } catch (error) {
       if (error.response?.status === 429) {
         retries++;
         await new Promise(resolve => setTimeout(resolve, 1000 * retries));
       } else {
         throw error;
       }
     }
   }
   ```
2. Cache responses to reduce API calls
3. Optimize prompts to use fewer tokens

### Token Limit Issues

**Symptoms:**
- Error messages like `Error: This model's maximum context length is 4097 tokens`
- Truncated or incomplete commentary
- API requests fail with 400 Bad Request

**Possible Causes:**
1. Prompts are too long
2. Response length exceeds the model's token limit
3. Combined prompt and response exceed the model's context length

**Solutions:**
1. Reduce prompt length by removing unnecessary context
2. Limit the maximum tokens for the response:
   ```typescript
   const completion = await openai.createCompletion({
     model: 'text-davinci-003',
     prompt: yourPrompt,
     max_tokens: 1000, // Limit response length
     temperature: 0.7
   });
   ```
3. Split long prompts into multiple smaller requests

## Performance Issues

### Slow API Responses

**Symptoms:**
- API requests take a long time to complete
- Frontend feels sluggish
- Timeouts in the browser console

**Possible Causes:**
1. Inefficient database queries
2. Missing caching
3. Blocking operations in request handlers

**Solutions:**
1. Optimize database queries with proper indexes and joins
2. Implement caching for frequently accessed data:
   ```typescript
   const cacheManager = new CacheManager<YourDataType>('entity_name', 100, 3600);
   
   const data = await cacheManager.getOrCompute(
     `key:${id}`,
     async () => {
       return await repository.fetchData(id);
     }
   );
   ```
3. Use async/await properly to avoid blocking operations

### Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Application becomes slower over time
- Eventually crashes with out-of-memory errors

**Possible Causes:**
1. Unclosed database connections
2. Accumulating event listeners
3. Large objects stored in memory

**Solutions:**
1. Ensure database connections are properly closed:
   ```typescript
   try {
     // Use the connection
   } finally {
     // Close the connection
     await connection.release();
   }
   ```
2. Remove event listeners when components unmount:
   ```jsx
   useEffect(() => {
     window.addEventListener('resize', handleResize);
     return () => {
       window.removeEventListener('resize', handleResize);
     };
   }, []);
   ```
3. Implement proper cache eviction policies

### High CPU Usage

**Symptoms:**
- High CPU usage on the server
- Slow response times
- Server becomes unresponsive

**Possible Causes:**
1. Inefficient algorithms
2. Synchronous operations blocking the event loop
3. Too many concurrent requests

**Solutions:**
1. Optimize algorithms and data structures
2. Use async/await for potentially blocking operations
3. Implement rate limiting and queuing for high-load operations:
   ```typescript
   const limiter = new RateLimiter({
     tokensPerInterval: 10,
     interval: 'second'
   });
   
   app.use(async (req, res, next) => {
     try {
       await limiter.removeTokens(1);
       next();
     } catch (error) {
       res.status(429).json({ error: 'Too many requests' });
     }
   });
   ```

## Deployment Issues

### Environment Configuration

**Symptoms:**
- Application behaves differently in production
- Environment-specific features don't work
- Configuration-related errors

**Possible Causes:**
1. Missing environment variables
2. Incorrect configuration for the environment
3. Hard-coded development values

**Solutions:**
1. Use a `.env` file for local development and environment variables for production
2. Implement environment-specific configuration:
   ```typescript
   const config = {
     development: {
       apiUrl: 'http://localhost:3001/api',
       debug: true
     },
     production: {
       apiUrl: 'https://api.example.com',
       debug: false
     }
   }[process.env.NODE_ENV || 'development'];
   ```
3. Verify all required environment variables are set in production

### Build Issues

**Symptoms:**
- Build process fails
- Assets are missing in the build
- JavaScript errors in the production build

**Possible Causes:**
1. TypeScript compilation errors
2. Missing dependencies
3. Incorrect build configuration

**Solutions:**
1. Run the build locally first to catch errors:
   ```bash
   cd frontend
   npm run build
   ```
2. Check for TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```
3. Verify that all dependencies are installed and up to date:
   ```bash
   npm ci
   ```

### CORS Issues in Production

**Symptoms:**
- API requests fail in production with CORS errors
- Console errors like `Access to fetch at 'https://api.example.com' from origin 'https://example.com' has been blocked by CORS policy`

**Possible Causes:**
1. CORS configuration doesn't include the production domain
2. Missing CORS headers
3. Preflight requests are not handled correctly

**Solutions:**
1. Update CORS configuration to include the production domain:
   ```typescript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://example.com'
     ],
     credentials: true
   }));
   ```
2. Ensure all necessary CORS headers are included:
   ```typescript
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', 'https://example.com');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
     res.header('Access-Control-Allow-Credentials', 'true');
     next();
   });
   ```

## Common Error Messages

### "Cannot find module"

**Error Message:**
```
Error: Cannot find module './YourModule'
```

**Possible Causes:**
1. The module doesn't exist
2. Incorrect import path
3. Case sensitivity issues

**Solutions:**
1. Verify that the module exists at the specified path
2. Check for typos in the import path
3. Ensure the case matches exactly (especially important on case-sensitive file systems)

### "Property does not exist on type"

**Error Message:**
```
Property 'yourProperty' does not exist on type 'YourType'
```

**Possible Causes:**
1. The property is not defined in the type
2. Typo in the property name
3. Using a property before it's defined

**Solutions:**
1. Update the type definition to include the property:
   ```typescript
   interface YourType {
     yourProperty: string;
   }
   ```
2. Use optional chaining to safely access potentially undefined properties:
   ```typescript
   const value = obj?.yourProperty;
   ```
3. Use type assertions if you're certain the property exists:
   ```typescript
   const value = (obj as YourType).yourProperty;
   ```

### "Cannot read property of undefined"

**Error Message:**
```
TypeError: Cannot read property 'yourProperty' of undefined
```

**Possible Causes:**
1. Trying to access a property on an undefined object
2. Asynchronous data that hasn't loaded yet
3. Conditional rendering issues

**Solutions:**
1. Use optional chaining:
   ```typescript
   const value = obj?.yourProperty;
   ```
2. Add null checks:
   ```typescript
   if (obj && obj.yourProperty) {
     // Safe to use obj.yourProperty
   }
   ```
3. Provide default values:
   ```typescript
   const value = (obj && obj.yourProperty) || defaultValue;
   ```

### "Maximum call stack size exceeded"

**Error Message:**
```
RangeError: Maximum call stack size exceeded
```

**Possible Causes:**
1. Infinite recursion
2. Circular references
3. Extremely deep object structures

**Solutions:**
1. Check for recursive functions that don't have a proper base case:
   ```typescript
   // Incorrect
   function factorial(n) {
     return n * factorial(n - 1);
   }
   
   // Correct
   function factorial(n) {
     if (n <= 1) return 1;
     return n * factorial(n - 1);
   }
   ```
2. Use iterative approaches instead of recursion for deep structures
3. Break circular references in objects

### "Invalid hook call"

**Error Message:**
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**Possible Causes:**
1. Calling hooks outside of a function component
2. Calling hooks conditionally
3. Multiple versions of React in the same application

**Solutions:**
1. Only call hooks at the top level of function components:
   ```jsx
   function YourComponent() {
     // Correct: Called at the top level
     const [state, setState] = useState(initialState);
     
     // Incorrect: Called conditionally
     if (condition) {
       useEffect(() => {}, []);
     }
   }
   ```
2. Ensure you're not using hooks in class components or regular functions
3. Check for duplicate React installations:
   ```bash
   npm ls react
   ```

### "Unexpected token in JSON"

**Error Message:**
```
SyntaxError: Unexpected token in JSON at position X
```

**Possible Causes:**
1. Invalid JSON format
2. Trying to parse a non-JSON string
3. Unescaped characters in JSON

**Solutions:**
1. Validate JSON using a tool like JSONLint
2. Ensure the string is actually JSON before parsing:
   ```typescript
   try {
     const data = JSON.parse(jsonString);
   } catch (error) {
     console.error('Invalid JSON:', error);
   }
   ```
3. Use proper JSON serialization:
   ```typescript
   const jsonString = JSON.stringify(data);