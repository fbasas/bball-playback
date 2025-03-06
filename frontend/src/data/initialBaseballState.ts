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
      "Hamilton steps into the batter's box, adjusting his cap.",
      "Brown delivers a nasty curveball - strike one!",
      "Hamilton takes a big cut... and misses. Strike two!",
      "The 0-2 pitch... Hamilton fouls it off to stay alive.",
      "Brown winds up, delivers... Hamilton hits a sharp grounder to first.",
      "Mize fields it cleanly and steps on the bag. One out.",
      "Delahanty approaches the plate, tapping his bat on the dirt.",
      "First pitch swinging - line drive to center field!",
      "Mays charges in... makes a spectacular diving catch!",
      "Two quick outs for Brown as Klein steps up to bat.",
      "The wind-up... Klein drives it deep to right field...",
      "Aaron racing back... at the wall... LEAPING CATCH!",
      "What a defensive display to end the top of the first!",
      "The legendary Bob Gibson takes the mound for the Dodgers.",
      "Robinson leads off, bringing his .342 average to the plate.",
      "Gibson's first pitch - blazing fastball inside, strike one!",
      "Robinson shows bunt... pulls back... ball outside.",
      "The 1-1 pitch... Robinson slaps it through the right side!",
      "Base hit! Robinson showcasing that classic hitting approach.",
      "Mize digs in, looking to advance the runner.",
      "Gibson from the stretch... picks off attempt at first!",
      "Robinson dives back safely, close play."
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
