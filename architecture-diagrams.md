# Baseball Playback Application Architecture Diagrams

This document contains detailed architecture diagrams for the Baseball Playback application.

## System Architecture

```mermaid
graph TD
    Client[Client Browser] --> Frontend[React Frontend]
    Frontend --> API[Express API]
    API --> Services[Service Layer]
    Services --> Repositories[Repository Layer]
    Repositories --> DB[(MySQL Database)]
    Services --> OpenAI[OpenAI API]
    Services --> Cache[Cache Layer]
    Cache --> Memory[In-Memory Cache]
    
    subgraph Core Systems
        Validation[Validation System]
        ErrorHandling[Error Handling]
        Logging[Logging System]
        Performance[Performance Monitoring]
    end
    
    API --> Core Systems
    Services --> Core Systems
    
    subgraph Frontend Components
        BaseballGame[BaseballGame]
        Scoreboard[Scoreboard]
        LineupPanel[LineupPanel]
        TypedText[TypedText]
    end
    
    subgraph Backend Services
        GameService[Game Service]
        PlayerService[Player Service]
        LineupService[Lineup Service]
        CommentaryService[Commentary Service]
        PlayDataService[Play Data Service]
        BaseballStateService[Baseball State Service]
    end
    
    Frontend --> Frontend Components
    Services --> Backend Services
```

## Data Flow for Game Playback

```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant API
    participant Services
    participant OpenAI
    participant DB
    
    Client->>Frontend: Request game playback
    Frontend->>API: Initialize game
    API->>Services: Create game state
    Services->>DB: Fetch game data
    DB-->>Services: Return game data
    Services->>OpenAI: Generate commentary
    OpenAI-->>Services: Return commentary
    Services-->>API: Return game state
    API-->>Frontend: Return game state
    Frontend-->>Client: Display game
    
    loop Next Play
        Client->>Frontend: Request next play
        Frontend->>API: Get next play
        API->>Services: Process next play
        Services->>DB: Fetch play data
        DB-->>Services: Return play data
        Services->>Services: Detect substitutions
        Services->>OpenAI: Generate play-by-play
        OpenAI-->>Services: Return commentary
        Services-->>API: Return updated state
        API-->>Frontend: Return updated state
        Frontend-->>Client: Display play
    end
```

## Lineup Tracking System

```mermaid
graph TD
    Game[Game] --> LineupState1[Initial Lineup State]
    LineupState1 --> LineupState2[Lineup State After Play 1]
    LineupState2 --> LineupState3[Lineup State After Play 2]
    LineupState3 --> LineupStateN[Lineup State After Play N]
    
    subgraph Lineup State
        Players[Players]
        Positions[Positions]
        BattingOrder[Batting Order]
        CurrentBatter[Current Batter]
        CurrentPitcher[Current Pitcher]
    end
    
    subgraph Lineup Changes
        Substitution[Substitution]
        PositionChange[Position Change]
        BattingOrderChange[Batting Order Change]
        PitchingChange[Pitching Change]
    end
    
    LineupState2 -- Detects --> Lineup Changes
    LineupState3 -- Detects --> Lineup Changes
    LineupStateN -- Detects --> Lineup Changes
```

## Validation System

```mermaid
graph TD
    Request[API Request] --> RequestValidation[Request Validation]
    RequestValidation --> Body[Body Validation]
    RequestValidation --> Query[Query Validation]
    RequestValidation --> Params[Path Params Validation]
    RequestValidation --> Headers[Headers Validation]
    
    Body --> ZodSchemas[Zod Schemas]
    Query --> ZodSchemas
    Params --> ZodSchemas
    Headers --> ZodSchemas
    
    ZodSchemas --> ValidationResult{Valid?}
    ValidationResult -- Yes --> RouteHandler[Route Handler]
    ValidationResult -- No --> ErrorResponse[Error Response]
    
    RouteHandler --> ExternalDataValidation[External Data Validation]
    ExternalDataValidation --> ServiceLogic[Service Logic]
    ServiceLogic --> ResponseValidation[Response Validation]
    ResponseValidation --> Response[API Response]
```

## Repository Pattern

```mermaid
graph TD
    Services[Services] --> Repositories[Repositories]
    Repositories --> DB[(Database)]
    Repositories --> Cache[Cache]
    
    subgraph Repositories
        BaseRepository[Base Repository Interface]
        KnexRepository[Knex Repository]
        CachedRepository[Cached Repository]
        
        PlayerRepository[Player Repository]
        PlayRepository[Play Repository]
        ScoreRepository[Score Repository]
        GameRepository[Game Repository]
    end
    
    BaseRepository --> KnexRepository
    KnexRepository --> CachedRepository
    
    CachedRepository --> PlayerRepository
    CachedRepository --> PlayRepository
    CachedRepository --> ScoreRepository
    CachedRepository --> GameRepository
```

## Error Handling System

```mermaid
graph TD
    Request[API Request] --> Middleware[Error Middleware]
    RouteHandler[Route Handler] -- Throws Error --> ErrorHandler[Error Handler]
    
    subgraph Error Types
        BaseError[Base Error]
        ApiError[API Error]
        DomainError[Domain Error]
        ValidationError[Validation Error]
        DatabaseError[Database Error]
        NotFoundError[Not Found Error]
    end
    
    BaseError --> ApiError
    BaseError --> DomainError
    DomainError --> ValidationError
    DomainError --> DatabaseError
    ApiError --> NotFoundError
    
    ErrorHandler --> ErrorTypes[Error Types]
    ErrorTypes --> ErrorResponse[Error Response]
    ErrorResponse --> Client[Client]
```

## Commentary Generation

```mermaid
graph TD
    PlayData[Play Data] --> CommentaryService[Commentary Service]
    BaseballState[Baseball State] --> CommentaryService
    
    CommentaryService --> PromptGenerator[Prompt Generator]
    PromptGenerator --> AIAdapter[AI Service Adapter]
    
    subgraph AI Adapters
        OpenAIAdapter[OpenAI Adapter]
        OtherAIAdapter[Other AI Adapter]
    end
    
    AIAdapter --> AIAdapterFactory[AI Adapter Factory]
    AIAdapterFactory --> OpenAIAdapter
    AIAdapterFactory --> OtherAIAdapter
    
    OpenAIAdapter --> OpenAIAPI[OpenAI API]
    OtherAIAdapter --> OtherAPI[Other AI API]
    
    OpenAIAPI --> Response[AI Response]
    OtherAPI --> Response
    
    Response --> CommentaryProcessing[Commentary Processing]
    CommentaryProcessing --> FinalCommentary[Final Commentary]