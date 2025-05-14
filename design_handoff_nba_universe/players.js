// NBA Universe — player dataset.
// Stats are approximate/illustrative (peak-era numbers). Salaries in $millions:
//   salary   = a representative real-ish PEAK annual salary for that player's era
//   expected = a "today's market value" estimate from a toy model
// category derives from the two: green = underpaid (earned < worth), red = overpaid, white = fair.
// The running joke: 90s legends played for peanuts, so most read "underpaid".

(function () {
  // name, pos, year(peak/era), team, ppg, rpg, apg, fg, tp, ft, per, ws, bpm, allstar, mvp, rings, salary, expected
  const ROWS = [
    // ---- 80s/90s legends ----
    ["Michael Jordan", "SG", 1991, "Chicago Bulls", 30.1, 6.2, 5.3, 49.7, 32.7, 83.5, 27.9, 17.7, 9.0, 14, 5, 6, 4.0, 62],
    ["Scottie Pippen", "SF", 1994, "Chicago Bulls", 22.0, 8.7, 5.6, 49.1, 32.0, 66.0, 21.0, 11.0, 6.5, 7, 0, 6, 2.2, 31],
    ["Charles Barkley", "PF", 1993, "Phoenix Suns", 23.0, 11.7, 4.1, 54.1, 26.6, 73.5, 24.6, 12.5, 6.0, 11, 1, 0, 3.9, 28],
    ["Hakeem Olajuwon", "C", 1994, "Houston Rockets", 27.3, 11.9, 3.6, 52.8, 0.0, 71.6, 25.4, 14.3, 5.0, 12, 1, 2, 3.5, 30],
    ["Patrick Ewing", "C", 1990, "New York Knicks", 28.6, 10.9, 2.2, 55.1, 0.0, 77.5, 23.0, 11.2, 3.5, 11, 0, 0, 3.0, 26],
    ["David Robinson", "C", 1994, "San Antonio Spurs", 29.8, 10.7, 4.8, 50.7, 34.5, 77.4, 30.7, 14.5, 6.0, 10, 1, 2, 7.3, 33],
    ["Karl Malone", "PF", 1997, "Utah Jazz", 27.4, 9.9, 4.5, 55.0, 0.0, 75.5, 26.7, 16.7, 5.5, 14, 2, 0, 6.0, 30],
    ["John Stockton", "PG", 1992, "Utah Jazz", 15.8, 3.0, 13.7, 51.8, 40.7, 84.2, 24.0, 13.5, 6.5, 10, 0, 0, 4.0, 27],
    ["Reggie Miller", "SG", 1995, "Indiana Pacers", 21.6, 3.4, 3.2, 46.2, 41.5, 91.0, 18.0, 9.0, 2.5, 5, 0, 0, 3.5, 18],
    ["Gary Payton", "PG", 1998, "Seattle SuperSonics", 21.5, 4.9, 8.7, 47.6, 33.9, 79.6, 21.0, 11.2, 4.5, 9, 0, 1, 5.0, 24],
    ["Shawn Kemp", "PF", 1996, "Seattle SuperSonics", 19.6, 10.0, 2.2, 56.1, 0.0, 74.2, 21.0, 8.5, 3.0, 6, 0, 0, 3.3, 17],
    ["Penny Hardaway", "PG", 1996, "Orlando Magic", 21.7, 4.3, 7.1, 51.3, 30.9, 76.7, 22.0, 9.0, 4.0, 4, 0, 0, 2.0, 16],
    ["Grant Hill", "SF", 1997, "Detroit Pistons", 21.4, 7.7, 6.3, 47.9, 30.0, 75.1, 21.0, 8.5, 4.0, 7, 0, 0, 4.5, 19],
    ["Alonzo Mourning", "C", 1999, "Miami Heat", 20.1, 9.5, 1.6, 51.1, 0.0, 67.0, 22.0, 8.5, 2.0, 7, 0, 1, 6.0, 18],
    ["Dikembe Mutombo", "C", 1995, "Denver Nuggets", 11.8, 12.5, 1.5, 50.0, 0.0, 68.4, 18.0, 7.5, 1.0, 8, 0, 0, 4.0, 12],
    ["Dennis Rodman", "PF", 1992, "Detroit Pistons", 9.8, 18.7, 2.3, 53.9, 23.0, 60.0, 16.0, 7.0, 2.0, 2, 0, 5, 2.5, 11],
    ["Clyde Drexler", "SG", 1992, "Portland Trail Blazers", 25.0, 6.6, 6.7, 47.0, 33.7, 79.4, 22.0, 11.0, 5.0, 10, 0, 1, 3.0, 22],
    ["Tim Hardaway", "PG", 1992, "Golden State Warriors", 23.4, 4.0, 10.0, 46.1, 35.0, 78.5, 20.0, 8.0, 3.5, 5, 0, 0, 2.5, 16],
    ["Mitch Richmond", "SG", 1995, "Sacramento Kings", 22.8, 3.9, 3.4, 45.6, 39.5, 84.7, 18.5, 7.5, 2.0, 6, 0, 0, 3.0, 14],
    ["Chris Webber", "PF", 2001, "Sacramento Kings", 24.5, 10.5, 4.8, 49.5, 30.0, 71.0, 22.0, 9.5, 4.0, 5, 0, 0, 12.0, 22],

    // ---- 2000s ----
    ["Shaquille O'Neal", "C", 2000, "Los Angeles Lakers", 29.7, 13.6, 3.8, 57.4, 0.0, 52.4, 30.6, 18.6, 6.0, 15, 1, 4, 17.1, 38],
    ["Kobe Bryant", "SG", 2006, "Los Angeles Lakers", 35.4, 5.3, 4.5, 45.0, 34.7, 85.0, 28.0, 15.3, 6.5, 18, 1, 5, 23.5, 40],
    ["Tim Duncan", "PF", 2003, "San Antonio Spurs", 23.3, 12.9, 3.9, 51.3, 0.0, 71.0, 27.0, 16.5, 5.5, 15, 2, 5, 16.0, 36],
    ["Allen Iverson", "PG", 2001, "Philadelphia 76ers", 31.1, 3.8, 4.6, 42.0, 32.0, 81.4, 24.0, 11.8, 4.5, 11, 1, 0, 12.0, 25],
    ["Kevin Garnett", "PF", 2004, "Minnesota Timberwolves", 24.2, 13.9, 5.0, 49.9, 25.6, 79.1, 26.4, 18.3, 7.0, 15, 1, 1, 28.0, 34],
    ["Dirk Nowitzki", "PF", 2006, "Dallas Mavericks", 26.6, 8.9, 3.4, 48.0, 41.6, 90.4, 28.1, 16.3, 4.5, 14, 1, 1, 23.0, 34],
    ["Steve Nash", "PG", 2007, "Phoenix Suns", 18.6, 3.5, 11.6, 53.2, 45.5, 90.0, 23.0, 11.0, 5.5, 8, 2, 0, 12.0, 26],
    ["Jason Kidd", "PG", 2003, "New Jersey Nets", 18.7, 7.3, 9.9, 41.4, 34.1, 80.0, 21.0, 12.0, 5.0, 10, 0, 1, 14.0, 24],
    ["Tracy McGrady", "SF", 2003, "Orlando Magic", 32.1, 6.5, 5.5, 45.7, 33.9, 79.3, 24.0, 10.0, 4.5, 7, 0, 0, 13.0, 26],
    ["Vince Carter", "SG", 2001, "Toronto Raptors", 27.6, 5.5, 3.9, 46.0, 40.8, 76.5, 22.0, 8.5, 3.0, 8, 0, 0, 11.0, 23],
    ["Paul Pierce", "SF", 2006, "Boston Celtics", 26.8, 6.7, 4.7, 47.0, 38.9, 80.5, 22.5, 11.0, 3.5, 10, 0, 1, 19.0, 28],
    ["Ray Allen", "SG", 2007, "Seattle SuperSonics", 26.4, 4.5, 4.1, 44.5, 40.0, 91.0, 20.0, 9.5, 2.5, 10, 0, 2, 16.0, 24],
    ["Dwyane Wade", "SG", 2009, "Miami Heat", 30.2, 5.0, 7.5, 49.1, 31.7, 76.5, 30.4, 14.7, 7.0, 13, 0, 3, 16.0, 36],
    ["Yao Ming", "C", 2007, "Houston Rockets", 25.0, 9.4, 2.0, 51.6, 0.0, 86.2, 23.0, 7.5, 2.0, 8, 0, 0, 15.0, 24],

    // ---- 2010s / modern ----
    ["LeBron James", "SF", 2013, "Miami Heat", 27.1, 7.9, 7.3, 56.5, 40.6, 75.3, 31.6, 19.3, 9.0, 20, 4, 4, 30.0, 48],
    ["Stephen Curry", "PG", 2016, "Golden State Warriors", 30.1, 5.4, 6.7, 50.4, 45.4, 90.8, 31.5, 17.9, 9.5, 10, 2, 4, 12.0, 46],
    ["Kevin Durant", "SF", 2014, "Oklahoma City Thunder", 32.0, 7.4, 5.5, 50.3, 39.1, 87.3, 29.8, 19.2, 7.5, 14, 1, 2, 18.0, 44],
    ["Russell Westbrook", "PG", 2017, "Oklahoma City Thunder", 31.6, 10.7, 10.4, 42.5, 34.3, 84.5, 30.6, 13.1, 7.0, 9, 1, 0, 28.0, 30],
    ["James Harden", "SG", 2018, "Houston Rockets", 30.4, 5.4, 8.8, 44.9, 36.7, 86.5, 29.9, 15.4, 8.5, 10, 1, 0, 28.0, 38],
    ["Chris Paul", "PG", 2014, "Los Angeles Clippers", 19.1, 4.3, 10.7, 48.5, 36.8, 86.8, 26.0, 13.0, 7.0, 12, 0, 0, 20.0, 30],
    ["Dwight Howard", "C", 2011, "Orlando Magic", 22.9, 14.1, 1.4, 59.3, 0.0, 59.6, 26.0, 14.4, 4.5, 8, 0, 1, 19.0, 28],
    ["Blake Griffin", "PF", 2014, "Los Angeles Clippers", 24.1, 9.5, 5.3, 53.8, 30.0, 71.5, 22.0, 9.0, 3.0, 6, 0, 0, 18.0, 22],
    ["Kawhi Leonard", "SF", 2017, "San Antonio Spurs", 25.5, 5.8, 3.5, 48.5, 38.0, 88.0, 27.5, 13.6, 6.5, 6, 0, 2, 20.0, 42],
    ["Giannis Antetokounmpo", "PF", 2020, "Milwaukee Bucks", 29.5, 13.6, 5.9, 55.3, 30.4, 63.3, 31.9, 14.0, 9.0, 8, 2, 1, 39.0, 48],
    ["Anthony Davis", "PF", 2018, "New Orleans Pelicans", 28.1, 11.1, 2.6, 53.4, 34.0, 79.4, 30.3, 13.0, 6.0, 9, 0, 1, 28.0, 38],
    ["Damian Lillard", "PG", 2020, "Portland Trail Blazers", 30.0, 4.3, 8.0, 46.3, 40.1, 88.8, 26.0, 11.5, 5.5, 8, 0, 0, 31.0, 36],
    ["Klay Thompson", "SG", 2016, "Golden State Warriors", 22.1, 3.8, 2.1, 47.0, 42.5, 86.0, 18.0, 9.0, 2.0, 5, 0, 4, 19.0, 24],
    ["Draymond Green", "PF", 2017, "Golden State Warriors", 11.0, 7.9, 7.0, 44.5, 30.8, 70.0, 16.0, 8.0, 4.0, 4, 0, 4, 18.0, 16],
    ["Nikola Jokic", "C", 2022, "Denver Nuggets", 27.1, 13.8, 7.9, 58.3, 33.7, 81.0, 32.8, 15.2, 11.5, 6, 3, 1, 47.0, 55],
    ["Joel Embiid", "C", 2023, "Philadelphia 76ers", 33.1, 10.2, 4.2, 54.8, 33.0, 85.7, 31.5, 12.5, 8.0, 7, 1, 0, 47.0, 50],
    ["Luka Doncic", "PG", 2024, "Dallas Mavericks", 33.9, 9.2, 9.8, 48.7, 38.2, 78.6, 30.0, 12.5, 9.0, 5, 0, 0, 40.0, 52],
    ["Jayson Tatum", "SF", 2023, "Boston Celtics", 30.1, 8.8, 4.6, 46.6, 37.6, 85.4, 24.0, 11.5, 5.0, 5, 0, 1, 33.0, 42]
  ];

  const KEYS = ["name", "pos", "year", "team", "ppg", "rpg", "apg", "fg", "tp", "ft", "per", "ws", "bpm", "allstar", "mvp", "rings", "salary", "expected"];

  function eraLabel(y) {
    if (y < 1990) return "80s";
    if (y < 2000) return "90s";
    if (y < 2010) return "2000s";
    if (y < 2020) return "2010s";
    return "2020s";
  }

  const PLAYERS = ROWS.map(function (r, i) {
    const p = { id: i };
    KEYS.forEach(function (k, j) { p[k] = r[j]; });
    p.era = eraLabel(p.year);
    const delta = p.salary - p.expected;     // negative => paid less than worth => underpaid
    const ratio = p.salary / p.expected;
    if (ratio < 0.82) p.category = "under";   // green
    else if (ratio > 1.18) p.category = "over"; // red
    else p.category = "fair";                 // white
    p.delta = delta;
    return p;
  });

  // ---- balanced, era-fair salaries: a realistic spread of under / fair / over.
  // [best-year salary $M, era-fair value $M]
  const SAL_OVERRIDE = {
    "Michael Jordan": [33, 34], "Scottie Pippen": [11, 22], "Charles Barkley": [9, 14],
    "Hakeem Olajuwon": [16, 18], "Patrick Ewing": [18, 14], "David Robinson": [12, 16],
    "Karl Malone": [16, 16], "John Stockton": [9, 13], "Reggie Miller": [11, 9],
    "Gary Payton": [11, 12], "Shawn Kemp": [11, 7], "Penny Hardaway": [10, 5],
    "Grant Hill": [13, 6], "Alonzo Mourning": [14, 13], "Dikembe Mutombo": [11, 10],
    "Dennis Rodman": [9, 8], "Clyde Drexler": [9, 12], "Tim Hardaway": [7, 8],
    "Mitch Richmond": [10, 7], "Chris Webber": [20, 14],
    "Shaquille O'Neal": [30, 33], "Kobe Bryant": [25, 32], "Tim Duncan": [18, 28],
    "Allen Iverson": [20, 16], "Kevin Garnett": [28, 22], "Dirk Nowitzki": [23, 24],
    "Steve Nash": [12, 18], "Jason Kidd": [21, 18], "Tracy McGrady": [23, 18],
    "Vince Carter": [16, 14], "Paul Pierce": [19, 20], "Ray Allen": [19, 15],
    "Dwyane Wade": [20, 25], "Yao Ming": [15, 12],
    "LeBron James": [38, 47], "Stephen Curry": [12, 40], "Kevin Durant": [30, 38],
    "Russell Westbrook": [41, 28], "James Harden": [40, 33], "Chris Paul": [35, 29],
    "Dwight Howard": [24, 16], "Blake Griffin": [32, 18], "Kawhi Leonard": [38, 40],
    "Giannis Antetokounmpo": [39, 48], "Anthony Davis": [37, 35], "Damian Lillard": [42, 33],
    "Klay Thompson": [40, 22], "Draymond Green": [24, 16], "Nikola Jokic": [47, 58],
    "Joel Embiid": [47, 44], "Luka Doncic": [40, 52], "Jayson Tatum": [33, 41],
  };
  PLAYERS.forEach(function (p) {
    const o = SAL_OVERRIDE[p.name];
    if (o) { p.salary = o[0]; p.expected = o[1]; }
    const ratio = p.salary / p.expected;
    p.delta = p.salary - p.expected;
    p.category = ratio < 0.82 ? "under" : (ratio > 1.18 ? "over" : "fair");
  });

  // ---- official NBA person IDs → headshot + profile URLs ----------------
  const NBA_ID = {
    "Michael Jordan": 893, "Scottie Pippen": 937, "Charles Barkley": 787,
    "Hakeem Olajuwon": 165, "Patrick Ewing": 121, "David Robinson": 764,
    "Karl Malone": 252, "John Stockton": 304, "Reggie Miller": 397,
    "Gary Payton": 758, "Shawn Kemp": 238, "Penny Hardaway": 150,
    "Grant Hill": 911, "Alonzo Mourning": 296, "Dikembe Mutombo": 305,
    "Dennis Rodman": 421, "Clyde Drexler": 191, "Tim Hardaway": 188,
    "Mitch Richmond": 762, "Chris Webber": 962,
    "Shaquille O'Neal": 406, "Kobe Bryant": 977, "Tim Duncan": 1495,
    "Allen Iverson": 947, "Kevin Garnett": 708, "Dirk Nowitzki": 1717,
    "Steve Nash": 959, "Jason Kidd": 429, "Tracy McGrady": 1503,
    "Vince Carter": 1713, "Paul Pierce": 1718, "Ray Allen": 951,
    "Dwyane Wade": 2548, "Yao Ming": 2397,
    "LeBron James": 2544, "Stephen Curry": 201939, "Kevin Durant": 201142,
    "Russell Westbrook": 201566, "James Harden": 201935, "Chris Paul": 101108,
    "Dwight Howard": 2730, "Blake Griffin": 201933, "Kawhi Leonard": 202695,
    "Giannis Antetokounmpo": 203507, "Anthony Davis": 203076, "Damian Lillard": 203081,
    "Klay Thompson": 202691, "Draymond Green": 203110, "Nikola Jokic": 203999,
    "Joel Embiid": 203954, "Luka Doncic": 1629029, "Jayson Tatum": 1628369,
  };
  function slug(name) {
    return name.toLowerCase().replace(/[.''’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  PLAYERS.forEach(function (p) {
    p.added = false;
    p.birthYear = p.year - 25;   // approx birth year (peak ≈ birth + 25)
    const nid = NBA_ID[p.name];
    if (nid) {
      p.nbaId = nid;
      p.photoUrl = 'https://cdn.nba.com/headshots/nba/latest/1040x760/' + nid + '.png';
      p.profileUrl = 'https://www.nba.com/player/' + nid + '/' + slug(p.name);
    }
  });

  // nearest-neighbour "similar players" by normalized stat vector
  const FEATS = ["ppg", "rpg", "apg", "per", "ws", "bpm"];
  const ranges = {};
  FEATS.forEach(function (f) {
    const vals = PLAYERS.map(function (p) { return p[f]; });
    ranges[f] = [Math.min.apply(null, vals), Math.max.apply(null, vals)];
  });
  function vec(p) {
    return FEATS.map(function (f) {
      const r = ranges[f];
      return (p[f] - r[0]) / (r[1] - r[0] || 1);
    });
  }
  const VECS = PLAYERS.map(vec);
  PLAYERS.forEach(function (p, i) {
    const dists = PLAYERS.map(function (q, j) {
      if (i === j) return { id: j, d: Infinity };
      let s = 0;
      for (let k = 0; k < FEATS.length; k++) { const d = VECS[i][k] - VECS[j][k]; s += d * d; }
      return { id: j, d: s };
    });
    dists.sort(function (a, b) { return a.d - b.d; });
    p.similar = dists.slice(0, 5).map(function (x) { return x.id; });
  });

  window.NBA_PLAYERS = PLAYERS;
})();
