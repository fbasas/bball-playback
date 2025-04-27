import { render, screen } from '../../test/utils';
import Scoreboard from '../Scoreboard';
import { describe, it, expect } from 'vitest';

// Mock the BaseballTypes import
const createEmptyBaseballState = () => ({
  gameId: "-1",
  sessionId: "-1",
  game: {
    inning: 1,
    isTopInning: true,
    outs: 0,
    onFirst: "",
    onSecond: "",
    onThird: "",
    log: []
  },
  home: {
    id: "",
    displayName: "",
    shortName: "",
    currentPitcher: "",
    lineup: [],
    stats: {
      innings: [],
      runs: 0,
      hits: 0,
      errors: 0
    },
    currentBatter: null
  },
  visitors: {
    id: "",
    displayName: "",
    shortName: "",
    currentPitcher: "",
    lineup: [],
    stats: {
      innings: [],
      runs: 0,
      hits: 0,
      errors: 0
    },
    currentBatter: null
  },
  currentPlay: 0,
  gameType: 'replay'
});

describe('Scoreboard Component', () => {
  const mockGameState = {
    ...createEmptyBaseballState(),
    home: {
      ...createEmptyBaseballState().home,
      stats: {
        innings: [0, 1, 0],
        runs: 1,
        hits: 3,
        errors: 0
      }
    },
    visitors: {
      ...createEmptyBaseballState().visitors,
      stats: {
        innings: [2, 0, 1],
        runs: 3,
        hits: 5,
        errors: 1
      }
    },
    game: {
      ...createEmptyBaseballState().game,
      inning: 3,
      isTopInning: true,
      outs: 1,
      onFirst: 'Player 1',
      onSecond: '',
      onThird: 'Player 3'
    },
    gameType: 'replay' as const
  };

  const mockTeams = {
    home: {
      id: 'HOME_TEAM',
      displayName: 'Home Team',
      shortName: 'HOME'
    },
    away: {
      id: 'AWAY_TEAM',
      displayName: 'Away Team',
      shortName: 'AWAY'
    }
  };

  const mockBattingTeam = mockTeams.away;
  const mockCurrentBatter = 'John Doe';
  const mockCurrentPitcher = 'Jane Smith';

  it('renders the scoreboard with correct team names', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    expect(screen.getByText('Home Team')).toBeInTheDocument();
    expect(screen.getByText('Away Team')).toBeInTheDocument();
  });

  it('displays the correct inning', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    expect(screen.getByText('TOP 3')).toBeInTheDocument();
  });

  it('displays the correct number of outs', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    // Find the "Out:" label and then get its adjacent value
    const outLabel = screen.getByText('Out:');
    const outValue = outLabel.nextElementSibling;
    expect(outValue).toHaveTextContent('1');
  });

  it('displays the correct scores for each team', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    // Check runs
    const statsContainer = screen.getAllByTestId('stats-container');
    expect(statsContainer.length).toBeGreaterThan(0);
    
    // This is a bit fragile but works for this test
    const awayTeamStats = statsContainer[1];
    const homeTeamStats = statsContainer[2];
    
    expect(awayTeamStats.children[0]).toHaveTextContent('3'); // Away team runs
    expect(homeTeamStats.children[0]).toHaveTextContent('1'); // Home team runs
  });

  it('displays the correct base runners', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    expect(screen.getByText('1st:')).toBeInTheDocument();
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('2nd:')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByText('3rd:')).toBeInTheDocument();
    expect(screen.getByText('Player 3')).toBeInTheDocument();
  });

  it('displays the current batter and pitcher', () => {
    render(
      <Scoreboard
        gameState={mockGameState}
        teams={mockTeams}
        isTopInning={true}
        currentInning={3}
        battingTeam={mockBattingTeam}
        currentBatter={mockCurrentBatter}
        currentPitcherName={mockCurrentPitcher}
      />
    );

    expect(screen.getByText('Pitching:')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Batting :')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});