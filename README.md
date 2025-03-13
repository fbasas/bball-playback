# Baseball Playback Application

A modern web application that simulates baseball games with AI-generated play-by-play commentary.

## Project Overview

The Baseball Playback application is designed to recreate baseball games with AI-generated commentary. It uses historical baseball data from the Retrosheet database to simulate games between different teams, with play-by-play narration generated using OpenAI's language models. The application features a responsive frontend that displays game information, team lineups, and a dynamic game log with typewriter-style text animation.

## Architecture Overview

The application follows a modern client-server architecture with three main components:

```mermaid
graph TD
    subgraph Frontend
        React[React Components]
        State[State Management]
        Config[Configuration]
    end
    
    subgraph Common
        Types[Shared Types]
        StateUtils[State Utilities]
    end
    
    subgraph Backend
        Express[Express Server]
        Routes[API Routes]
        Services[Services]
        DB[(Database)]
    end
    
    Frontend --> Common
    Backend --> Common
    Frontend <--> Backend
    Services --> DB
    Routes --> Services
```

- **Frontend**: A React application built with TypeScript, responsible for rendering the UI and handling user interactions.
- **Backend**: An Express.js server that provides API endpoints for game initialization and play progression.
- **Common**: Shared types and data structures used by both frontend and backend.

## Frontend Structure

### Main Components

The frontend is built with React and TypeScript, using a component-based architecture:

- **BaseballGame**: The main container component that manages game state and coordinates other components.
- **Scoreboard**: Displays game information including inning, score, and current game situation.
- **LineupPanel**: Shows the lineups for both teams with the current batter highlighted.
- **TypedText**: A reusable component that displays text with a typewriter effect.

### Component Hierarchy

```mermaid
graph TD
    BaseballGame --> Scoreboard
    BaseballGame --> LineupPanel
    BaseballGame --> TypedText
```

### State Management

The frontend uses React's useState and useEffect hooks for state management. The main state is stored in the BaseballGame component and includes:

- Game state (inning, outs, runners on base)
- Team information (lineups, current batter/pitcher)
- Game log entries

### API Integration

The frontend communicates with the backend through RESTful API calls:

- `GET /api/game/init/:gameId`: Initializes a game with the specified ID
- `GET /api/game/next/:gameId`: Retrieves the next play for the specified game

### Configuration

The frontend configuration is managed in `frontend/src/config/config.ts` and supports different environments (development, production, test). The configuration includes:

- API base URL
- API endpoints
- Environment-specific settings

## Backend Structure

### Server Setup

The backend is built with Express.js and TypeScript. The main entry point is `backend/src/bball-playback.ts`, which sets up the Express server with middleware and routes.

### API Routes

The backend provides the following API endpoints:

#### Game Routes (`backend/src/routes/game/`)

- `POST /api/game/createGame`: Creates a new game with specified home and visiting teams
- `GET /api/game/init/:gameId`: Initializes a game with the specified ID
- `GET /api/game/next/:gameId?currentPlay=<playId>`: Retrieves the next play for the specified game after the current play ID
- `GET /api/game/info/:gid`: Retrieves game information from the plays table
- `GET /api/game/announceLineups/:gameId`: Announces the starting lineups for a game with AI-generated commentary

### Services

#### OpenAI Integration (`backend/src/services/openai.ts`)

The backend integrates with OpenAI's API to generate play-by-play commentary. The service:

- Sends prompts to OpenAI's API using either the chat completions or completions API based on the model
- Processes and formats the responses
- Logs completions to the database with detailed metrics
- Handles different model types (GPT-4, GPT-3.5-turbo, etc.)
- Measures and records latency for performance monitoring
- Supports retry logic for handling API failures

The OpenAI integration is configured with the following parameters:
- `model`: The OpenAI model to use (e.g., gpt-4, gpt-3.5-turbo)
- `maxTokens`: Maximum number of tokens to generate (default: 1000)
- `temperature`: Controls randomness in the output (default: 0.7)

#### Prompt Templates (`backend/src/services/prompts/`)

The backend uses Handlebars templates to generate prompts for OpenAI. Each prompt is organized in its own file:

- `initGame.ts`: Template and function for initializing a game
- `nextPlay.ts`: Template and function for generating the next play
- `lineupAnnouncement.ts`: Template and function for announcing lineups using the lineup data service

#### Game Services (`backend/src/services/game/`)

The backend includes services for retrieving and processing game data:

- `getLineupData.ts`: Service for retrieving lineup data from the database, including:
  - Team information (ID, display name, short name)
  - Player information (name, position)
  - Batting order
  - Starting pitchers
  - Position mapping (converting position codes to readable position names)

### Database Schema

The application uses a MySQL database with the following tables:

#### OpenAI Completions Log

Stores information about OpenAI API calls:

```
openai_completions_log
- id (primary key)
- prompt
- model
- temperature
- max_tokens
- top_p
- frequency_penalty
- presence_penalty
- completion_id
- content
- finish_reason
- prompt_tokens
- completion_tokens
- total_tokens
- game_id
- play_index
- inning
- is_top_inning
- outs
- latency_ms
- retry_count
- created_at
- openai_created_at
```

#### Umpires

Stores information about baseball umpires:

```
umpires
- id (primary key)
- lastname
- firstname
- first_g (first game date)
- last_g (last game date)
```

The database also includes tables from the Retrosheet database:
- `plays`: Contains play-by-play data for baseball games
- `gameinfo`: Contains metadata about baseball games
- `teams`: Contains information about baseball teams
- `ballparks`: Contains information about baseball stadiums

### Configuration

The backend configuration is managed in `backend/src/config/config.ts` and supports different environments (development, production, test). The configuration includes:

- Database connection details
- OpenAI API settings:
  - `apiKey`: API key for OpenAI
  - `model`: Model to use for completions
  - `maxTokens`: Maximum tokens to generate (configurable via `OPENAI_MAX_TOKENS` env var)
  - `temperature`: Controls randomness (configurable via `OPENAI_TEMPERATURE` env var)
- Server port

## Common Types and Shared Data

### Baseball Types (`common/types/BaseballTypes.ts`)

The application uses shared TypeScript interfaces to ensure type consistency between frontend and backend:

- `BaseballState`: The main state object that includes:
  - `gameId`: Unique identifier for the game
  - `game`: Current game state information
  - `home`: Home team state
  - `visitors`: Visiting team state
  - `currentPlay`: Current play index being displayed
  - `gameType`: Type of game ('replay' or 'simulation')
- `GameState`: Information about the current game situation (inning, outs, runners, etc.)
- `TeamState`: Information about a team, including lineup and stats
- `Player`: Information about a player, including position and name

### Baseball State Utilities

The application provides utilities for working with baseball state:

- `createEmptyBaseballState()`: A function that creates an empty baseball state object with default values
- This replaces the previous hardcoded initial state with a more flexible approach
- Used throughout the application to initialize new game states

## Development Workflow

### Running the Application

1. **Backend**:
   ```
   cd backend
   npm install
   npm run dev
   ```

   Alternatively, you can use the VSCode debug configuration "Debug Backend" which uses nodemon for automatic server restarts during development.

2. **Frontend**:
   ```
   cd frontend
   npm install
   npm run dev
   ```

   Alternatively, you can use the VSCode debug configuration "Debug Frontend" which launches the Vite development server.

### Adding New Features

When adding new features to the application:

1. Define shared types in `common/types/BaseballTypes.ts` if needed
2. Implement backend functionality:
   - Add new routes in `backend/src/routes/`
   - Add new services in `backend/src/services/`
   - Add new database migrations if needed
3. Implement frontend functionality:
   - Add new components in `frontend/src/components/`
   - Update existing components as needed
   - Update configuration if needed

### Database Migrations

The application uses Knex.js for database migrations:

```
cd backend
npx knex migrate:latest
```

## Future Enhancements

Potential areas for future development:

1. Adding user authentication and game saving
2. Implementing more detailed statistics
3. Adding visual representation of the baseball field
4. Supporting historical games with real player data
5. Adding support for different commentary styles
