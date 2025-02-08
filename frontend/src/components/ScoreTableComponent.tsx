import React from "react";
import "./ScoreTable.css"; // (Optional styling if you want component-specific styles)

const ScoreTable = ({ scores }) => (
  <div className="container">
    <table className="score-table" cellPadding="10" border="1">
      <thead>
        <tr>
          <th></th>
          {[...Array(9)].map((_, i) => (
            <th key={i}>{i + 1}</th>
          ))}
          <th>x</th>
          <th>R</th>
          <th>H</th>
          <th>E</th>
          <th>LOB</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((team, index) => (
          <tr key={index}>
            <td>{team.name}</td>
            {team.innings.map((score, i) => (
              <td key={i}>{score || ""}</td>
            ))}
            <td></td>
            <td>{team.runs}</td>
            <td>{team.hits}</td>
            <td>{team.errors}</td>
            <td>{team.lob}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ScoreTable;