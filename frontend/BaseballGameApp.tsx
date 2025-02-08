import React from "react";
import Header from "./components/Header";
import ScoreTable from "./components/ScoreTable";
import LineupTable from "./components/LineupTable";
import "./App.css";

const App = () => {
  // Example data for scores and lineups
  const gameData = {
    scores: [
      {
        name: "BOS",
        innings: [0, 1, 0, 2, 0, 0, 0, 1, 0],
        runs: 4,
        hits: 8,
        errors: 0,
        lob: 6,
      },
      {
        name: "NYY",
        innings: [0, 0, 0, 1, 2, 0, 1, 0, 0],
        runs: 4,
        hits: 7,
        errors: 1,
        lob: 5,
      },
    ],
    lineups: [
      {
        name: "Boston Red Sox",
        lineup: [
          { name: "Dustin Pedroia", position: "2B" },
          { name: "Ted Williams", position: "RF" },
          { name: "David Ortiz", position: "DH" },
          { name: "Carl Yastrzemski", position: "LF" },
          { name: "Carlton Fisk", position: "C" },
          { name: "Tris Speaker", position: "CF" },
          { name: "Nomar Garciaparra", position: "SS" },
        ],
      },
      {
        name: "New York Yankees",
        lineup: [
          { name: "Derek Jeter", position: "SS" },
          { name: "Babe Ruth", position: "RF" },
          { name: "Lou Gehrig", position: "1B" },
          { name: "Joe DiMaggio", position: "CF" },
          { name: "Mickey Mantle", position: "LF" },
          { name: "Yogi Berra", position: "C" },
          { name: "Alex Rodriguez", position: "3B" },
        ],
      },
    ],
  };

  return (
    <div>
      <Header />
      <ScoreTable scores={gameData.scores} />
      <hr />
      <table style={{ width: "100%" }} border="1">
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>
              <LineupTable team={gameData.lineups[0]} />
            </td>
            <td style={{ width: "50%" }}>
              <LineupTable team={gameData.lineups[1]} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default App;