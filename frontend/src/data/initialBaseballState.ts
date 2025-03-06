import { BaseballState } from '../types/BaseballTypes';

// Initial baseball game state
export const initialBaseballState: BaseballState = {
  game: {
    inning: 1,
    isTopInning: true,
    outs: 0,
    onFirst: "DiMaggio",
    onSecond: "Mays",
    onThird: "Robinson",
    log: [
      "The 2024 Dodgers are up to bat against the 1927 Yankees.",
      "Hamilton hits a hard ground ball to the first baseman.",
      "Mize steps on first for the out.",
    ]
  },
  home: {
    id: "1927NYA",
    displayName: "1927 Yankees",
    shortName: "Yankees",
    currentPitcher: "Mordecai Brown",
    lineup: [
        { position: "LF", firstName: "Billy", lastName: "Hamilton" },
        { position: "1B", firstName: "Ed", lastName: "Delahanty" },
        { position: "RF", firstName: "Chuck", lastName: "Klein" },
        { position: "CF", firstName: "Mel", lastName: "Ott" },
        { position: "3B", firstName: "Rogers", lastName: "Hornsby" },
        { position: "C", firstName: "Gabby", lastName: "Hartnett" },
        { position: "SS", firstName: "Honus", lastName: "Wagner" },
        { position: "2B", firstName: "Frankie", lastName: "Frisch" },
        { position: "P", firstName: "Mordecai", lastName: "Brown" }
      ],
      stats: {
        innings: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: "Hamilton"
    },
    visitors: {
      id: "2024LAD",
      displayName: "2024 Dodgers",
      shortName: "Dodgers",
      currentPitcher: "Bob Gibson",
      lineup: [
        { position: "3B", firstName: "Brooks", lastName: "Robinson" },
        { position: "1B", firstName: "Johnny", lastName: "Mize" },
        { position: "LF", firstName: "Stan", lastName: "Musial" },
        { position: "CF", firstName: "Willie", lastName: "Mays" },
        { position: "RF", firstName: "Hank", lastName: "Aaron" },
        { position: "C", firstName: "Roy", lastName: "Campanella" },
        { position: "2B", firstName: "Joe", lastName: "Morgan" },
        { position: "SS", firstName: "Pee Wee", lastName: "Reese" },
        { position: "P", firstName: "Bob", lastName: "Gibson" }
      ],
      stats: {
        innings: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: "Robinson"
    }
};
