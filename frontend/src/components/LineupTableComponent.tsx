import React from "react";
import "./LineupTable.css"; // (Optional styling if you want component-specific styles)

const LineupTable = ({ team }) => (
  <div className="container">
    <table className="lineup-table" cellPadding="10" border="1">
      <thead>
        <tr>
          <th colSpan="3">{team.name} Lineup</th>
        </tr>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Pos</th>
        </tr>
      </thead>
      <tbody>
        {team.lineup.map((player, index) => (
          <tr key={index}>
            <td>{index + 1}</td>
            <td>{player.name}</td>
            <td>{player.position}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default LineupTable;