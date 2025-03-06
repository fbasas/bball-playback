import { Player } from "../types/BaseballTypes";
import "./LineupPanel.css";

interface LineupPanelProps {
  teams: {
    home: {
      shortName: string;
    };
    away: {
      shortName: string;
    };
  };
  gameState: {
    home: {
      lineup: Player[];
    };
    visitors: {
      lineup: Player[];
    };
  };
  isTopInning: boolean;
  currentBatterLastName: string | null;
}

export default function LineupPanel({
  teams,
  gameState,
  isTopInning,
  currentBatterLastName,
}: LineupPanelProps) {
  return (
    <div className="lineup-panel">
      <div className="lineup-grid">
        <div className="team-column">
          <div className="lineup-team-name">{teams.home.shortName}</div>
          <div className="player-list">
            {gameState.home.lineup.map((player: Player, index: number) => (
              <div 
                key={index} 
                className={`player-row ${!isTopInning && currentBatterLastName === player.lastName ? "current-batter" : ""}`}
              >
                <span className="position">{player.position}</span>
                <span className="player-name">{player.lastName}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="team-column">
          <div className="lineup-team-name">{teams.away.shortName}</div>
          <div className="player-list">
            {gameState.visitors.lineup.map((player: Player, index: number) => (
              <div 
                key={index}
                className={`player-row ${isTopInning && currentBatterLastName === player.lastName ? "current-batter" : ""}`}
              >
                <span className="position">{player.position}</span>
                <span className="player-name">{player.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 