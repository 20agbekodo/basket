// NBA Universe — hardcoded player dataset
//
// DATA SCHEMA (columns per player):
//   id:        number         unique row index (0-based)
//   name:      string         player full name
//   pos:       PG|SG|SF|PF|C  position
//   year:      number         peak/best season year
//   team:      string         team during peak season
//   ppg:       number         points per game (peak season)
//   rpg:       number         rebounds per game
//   apg:       number         assists per game
//   fg:        number         field goal % (e.g. 49.7)
//   tp:        number         three-point % (0 if pre-3pt era or big man)
//   ft:        number         free throw %
//   per:       number         player efficiency rating
//   ws:        number         win shares (peak season)
//   bpm:       number         box plus/minus
//   allstar:   number         career all-star selections
//   mvp:       number         career MVP awards
//   rings:     number         championship rings
//   salary:    number         best-year salary in $M (era-representative)
//   expected:  number         today's-market estimated value in $M
//   delta:     number         salary - expected (negative = underpaid)
//   category:  under|over|fair value classification (ratio < 0.82 = under, > 1.18 = over)
//   era:       string         80s | 90s | 2000s | 2010s | 2020s
//   birthYear: number         approximate birth year (year - 25)
//   nbaId:     number?        NBA.com person ID → headshot + profile URL
//   photoUrl:  string?        https://cdn.nba.com/headshots/nba/latest/1040x760/{nbaId}.png
//   profileUrl:string?        https://www.nba.com/player/{nbaId}/{slug}
//   similar:   number[]       IDs of 5 most similar players (by ppg/rpg/apg/per/ws/bpm)
//   added:     boolean        false for all hardcoded players; true for user-added at runtime

export interface Player {
  id: number
  name: string
  pos: string
  year: number
  team: string
  ppg: number
  rpg: number
  apg: number
  fg: number
  tp: number
  ft: number
  per: number
  ws: number
  bpm: number
  allstar: number
  mvp: number
  rings: number
  salary: number
  expected: number
  delta: number
  category: 'under' | 'over' | 'fair' | 'user'
  era: string
  birthYear: number
  nbaId?: number
  photoUrl?: string
  profileUrl?: string
  similar: number[]
  added: boolean
  estSalary?: number
  photo?: string
}

// name, pos, year, team, ppg, rpg, apg, fg, tp, ft, per, ws, bpm, allstar, mvp, rings
const ROWS: [string, string, number, string, number, number, number, number, number, number, number, number, number, number, number, number][] = [
  // 80s/90s legends
  ["Michael Jordan", "SG", 1991, "Chicago Bulls", 30.1, 6.2, 5.3, 49.7, 32.7, 83.5, 27.9, 17.7, 9.0, 14, 5, 6],
  ["Scottie Pippen", "SF", 1994, "Chicago Bulls", 22.0, 8.7, 5.6, 49.1, 32.0, 66.0, 21.0, 11.0, 6.5, 7, 0, 6],
  ["Charles Barkley", "PF", 1993, "Phoenix Suns", 23.0, 11.7, 4.1, 54.1, 26.6, 73.5, 24.6, 12.5, 6.0, 11, 1, 0],
  ["Hakeem Olajuwon", "C", 1994, "Houston Rockets", 27.3, 11.9, 3.6, 52.8, 0.0, 71.6, 25.4, 14.3, 5.0, 12, 1, 2],
  ["Patrick Ewing", "C", 1990, "New York Knicks", 28.6, 10.9, 2.2, 55.1, 0.0, 77.5, 23.0, 11.2, 3.5, 11, 0, 0],
  ["David Robinson", "C", 1994, "San Antonio Spurs", 29.8, 10.7, 4.8, 50.7, 34.5, 77.4, 30.7, 14.5, 6.0, 10, 1, 2],
  ["Karl Malone", "PF", 1997, "Utah Jazz", 27.4, 9.9, 4.5, 55.0, 0.0, 75.5, 26.7, 16.7, 5.5, 14, 2, 0],
  ["John Stockton", "PG", 1992, "Utah Jazz", 15.8, 3.0, 13.7, 51.8, 40.7, 84.2, 24.0, 13.5, 6.5, 10, 0, 0],
  ["Reggie Miller", "SG", 1995, "Indiana Pacers", 21.6, 3.4, 3.2, 46.2, 41.5, 91.0, 18.0, 9.0, 2.5, 5, 0, 0],
  ["Gary Payton", "PG", 1998, "Seattle SuperSonics", 21.5, 4.9, 8.7, 47.6, 33.9, 79.6, 21.0, 11.2, 4.5, 9, 0, 1],
  ["Shawn Kemp", "PF", 1996, "Seattle SuperSonics", 19.6, 10.0, 2.2, 56.1, 0.0, 74.2, 21.0, 8.5, 3.0, 6, 0, 0],
  ["Penny Hardaway", "PG", 1996, "Orlando Magic", 21.7, 4.3, 7.1, 51.3, 30.9, 76.7, 22.0, 9.0, 4.0, 4, 0, 0],
  ["Grant Hill", "SF", 1997, "Detroit Pistons", 21.4, 7.7, 6.3, 47.9, 30.0, 75.1, 21.0, 8.5, 4.0, 7, 0, 0],
  ["Alonzo Mourning", "C", 1999, "Miami Heat", 20.1, 9.5, 1.6, 51.1, 0.0, 67.0, 22.0, 8.5, 2.0, 7, 0, 1],
  ["Dikembe Mutombo", "C", 1995, "Denver Nuggets", 11.8, 12.5, 1.5, 50.0, 0.0, 68.4, 18.0, 7.5, 1.0, 8, 0, 0],
  ["Dennis Rodman", "PF", 1992, "Detroit Pistons", 9.8, 18.7, 2.3, 53.9, 23.0, 60.0, 16.0, 7.0, 2.0, 2, 0, 5],
  ["Clyde Drexler", "SG", 1992, "Portland Trail Blazers", 25.0, 6.6, 6.7, 47.0, 33.7, 79.4, 22.0, 11.0, 5.0, 10, 0, 1],
  ["Tim Hardaway", "PG", 1992, "Golden State Warriors", 23.4, 4.0, 10.0, 46.1, 35.0, 78.5, 20.0, 8.0, 3.5, 5, 0, 0],
  ["Mitch Richmond", "SG", 1995, "Sacramento Kings", 22.8, 3.9, 3.4, 45.6, 39.5, 84.7, 18.5, 7.5, 2.0, 6, 0, 0],
  ["Chris Webber", "PF", 2001, "Sacramento Kings", 24.5, 10.5, 4.8, 49.5, 30.0, 71.0, 22.0, 9.5, 4.0, 5, 0, 0],
  // 2000s
  ["Shaquille O'Neal", "C", 2000, "Los Angeles Lakers", 29.7, 13.6, 3.8, 57.4, 0.0, 52.4, 30.6, 18.6, 6.0, 15, 1, 4],
  ["Kobe Bryant", "SG", 2006, "Los Angeles Lakers", 35.4, 5.3, 4.5, 45.0, 34.7, 85.0, 28.0, 15.3, 6.5, 18, 1, 5],
  ["Tim Duncan", "PF", 2003, "San Antonio Spurs", 23.3, 12.9, 3.9, 51.3, 0.0, 71.0, 27.0, 16.5, 5.5, 15, 2, 5],
  ["Allen Iverson", "PG", 2001, "Philadelphia 76ers", 31.1, 3.8, 4.6, 42.0, 32.0, 81.4, 24.0, 11.8, 4.5, 11, 1, 0],
  ["Kevin Garnett", "PF", 2004, "Minnesota Timberwolves", 24.2, 13.9, 5.0, 49.9, 25.6, 79.1, 26.4, 18.3, 7.0, 15, 1, 1],
  ["Dirk Nowitzki", "PF", 2006, "Dallas Mavericks", 26.6, 8.9, 3.4, 48.0, 41.6, 90.4, 28.1, 16.3, 4.5, 14, 1, 1],
  ["Steve Nash", "PG", 2007, "Phoenix Suns", 18.6, 3.5, 11.6, 53.2, 45.5, 90.0, 23.0, 11.0, 5.5, 8, 2, 0],
  ["Jason Kidd", "PG", 2003, "New Jersey Nets", 18.7, 7.3, 9.9, 41.4, 34.1, 80.0, 21.0, 12.0, 5.0, 10, 0, 1],
  ["Tracy McGrady", "SF", 2003, "Orlando Magic", 32.1, 6.5, 5.5, 45.7, 33.9, 79.3, 24.0, 10.0, 4.5, 7, 0, 0],
  ["Vince Carter", "SG", 2001, "Toronto Raptors", 27.6, 5.5, 3.9, 46.0, 40.8, 76.5, 22.0, 8.5, 3.0, 8, 0, 0],
  ["Paul Pierce", "SF", 2006, "Boston Celtics", 26.8, 6.7, 4.7, 47.0, 38.9, 80.5, 22.5, 11.0, 3.5, 10, 0, 1],
  ["Ray Allen", "SG", 2007, "Seattle SuperSonics", 26.4, 4.5, 4.1, 44.5, 40.0, 91.0, 20.0, 9.5, 2.5, 10, 0, 2],
  ["Dwyane Wade", "SG", 2009, "Miami Heat", 30.2, 5.0, 7.5, 49.1, 31.7, 76.5, 30.4, 14.7, 7.0, 13, 0, 3],
  ["Yao Ming", "C", 2007, "Houston Rockets", 25.0, 9.4, 2.0, 51.6, 0.0, 86.2, 23.0, 7.5, 2.0, 8, 0, 0],
  // 2010s / modern
  ["LeBron James", "SF", 2013, "Miami Heat", 27.1, 7.9, 7.3, 56.5, 40.6, 75.3, 31.6, 19.3, 9.0, 20, 4, 4],
  ["Stephen Curry", "PG", 2016, "Golden State Warriors", 30.1, 5.4, 6.7, 50.4, 45.4, 90.8, 31.5, 17.9, 9.5, 10, 2, 4],
  ["Kevin Durant", "SF", 2014, "Oklahoma City Thunder", 32.0, 7.4, 5.5, 50.3, 39.1, 87.3, 29.8, 19.2, 7.5, 14, 1, 2],
  ["Russell Westbrook", "PG", 2017, "Oklahoma City Thunder", 31.6, 10.7, 10.4, 42.5, 34.3, 84.5, 30.6, 13.1, 7.0, 9, 1, 0],
  ["James Harden", "SG", 2018, "Houston Rockets", 30.4, 5.4, 8.8, 44.9, 36.7, 86.5, 29.9, 15.4, 8.5, 10, 1, 0],
  ["Chris Paul", "PG", 2014, "Los Angeles Clippers", 19.1, 4.3, 10.7, 48.5, 36.8, 86.8, 26.0, 13.0, 7.0, 12, 0, 0],
  ["Dwight Howard", "C", 2011, "Orlando Magic", 22.9, 14.1, 1.4, 59.3, 0.0, 59.6, 26.0, 14.4, 4.5, 8, 0, 1],
  ["Blake Griffin", "PF", 2014, "Los Angeles Clippers", 24.1, 9.5, 5.3, 53.8, 30.0, 71.5, 22.0, 9.0, 3.0, 6, 0, 0],
  ["Kawhi Leonard", "SF", 2017, "San Antonio Spurs", 25.5, 5.8, 3.5, 48.5, 38.0, 88.0, 27.5, 13.6, 6.5, 6, 0, 2],
  ["Giannis Antetokounmpo", "PF", 2020, "Milwaukee Bucks", 29.5, 13.6, 5.9, 55.3, 30.4, 63.3, 31.9, 14.0, 9.0, 8, 2, 1],
  ["Anthony Davis", "PF", 2018, "New Orleans Pelicans", 28.1, 11.1, 2.6, 53.4, 34.0, 79.4, 30.3, 13.0, 6.0, 9, 0, 1],
  ["Damian Lillard", "PG", 2020, "Portland Trail Blazers", 30.0, 4.3, 8.0, 46.3, 40.1, 88.8, 26.0, 11.5, 5.5, 8, 0, 0],
  ["Klay Thompson", "SG", 2016, "Golden State Warriors", 22.1, 3.8, 2.1, 47.0, 42.5, 86.0, 18.0, 9.0, 2.0, 5, 0, 4],
  ["Draymond Green", "PF", 2017, "Golden State Warriors", 11.0, 7.9, 7.0, 44.5, 30.8, 70.0, 16.0, 8.0, 4.0, 4, 0, 4],
  ["Nikola Jokic", "C", 2022, "Denver Nuggets", 27.1, 13.8, 7.9, 58.3, 33.7, 81.0, 32.8, 15.2, 11.5, 6, 3, 1],
  ["Joel Embiid", "C", 2023, "Philadelphia 76ers", 33.1, 10.2, 4.2, 54.8, 33.0, 85.7, 31.5, 12.5, 8.0, 7, 1, 0],
  ["Luka Doncic", "PG", 2024, "Dallas Mavericks", 33.9, 9.2, 9.8, 48.7, 38.2, 78.6, 30.0, 12.5, 9.0, 5, 0, 0],
  ["Jayson Tatum", "SF", 2023, "Boston Celtics", 30.1, 8.8, 4.6, 46.6, 37.6, 85.4, 24.0, 11.5, 5.0, 5, 0, 1],
  // Pre-1990 legends
  ["Kareem Abdul-Jabbar", "C", 1972, "Milwaukee Bucks", 34.8, 16.6, 4.6, 57.4, 0.0, 72.9, 31.8, 17.2, 11.5, 19, 6, 6],
  ["Magic Johnson", "PG", 1987, "Los Angeles Lakers", 23.9, 6.3, 12.2, 52.2, 20.6, 84.8, 26.0, 17.0, 9.0, 12, 3, 5],
  ["Larry Bird", "SF", 1984, "Boston Celtics", 29.9, 10.1, 6.6, 49.2, 42.7, 88.8, 26.3, 16.2, 8.5, 12, 3, 3],
  ["Julius Erving", "SF", 1983, "Philadelphia 76ers", 21.4, 6.8, 3.7, 51.8, 0.0, 77.8, 22.5, 10.5, 5.5, 11, 1, 1],
  ["Moses Malone", "C", 1983, "Philadelphia 76ers", 24.5, 15.3, 1.3, 50.1, 0.0, 76.1, 26.0, 15.8, 6.5, 12, 3, 1],
  ["Isiah Thomas", "PG", 1984, "Detroit Pistons", 21.3, 3.6, 11.1, 46.2, 25.0, 78.6, 20.5, 9.5, 5.5, 12, 0, 2],
  ["Pete Maravich", "PG", 1977, "New Orleans Jazz", 31.1, 5.1, 5.4, 44.0, 0.0, 82.0, 23.0, 11.0, 6.0, 5, 0, 0],
  ["George Gervin", "SG", 1982, "San Antonio Spurs", 26.2, 4.7, 2.7, 50.3, 0.0, 84.3, 22.0, 10.5, 4.5, 12, 0, 0],
  ["Bill Walton", "C", 1977, "Portland Trail Blazers", 18.6, 14.4, 4.4, 52.9, 0.0, 66.1, 27.5, 16.0, 9.5, 2, 0, 1],
  ["Bob McAdoo", "C", 1975, "Buffalo Braves", 34.5, 14.1, 2.2, 51.2, 0.0, 77.5, 29.5, 16.5, 8.0, 5, 1, 2],
  ["Rick Barry", "SF", 1975, "Golden State Warriors", 30.6, 6.2, 6.2, 47.5, 0.0, 90.4, 25.0, 13.5, 6.0, 12, 0, 1],
  ["Walt Frazier", "PG", 1971, "New York Knicks", 22.5, 6.7, 7.0, 50.7, 0.0, 77.0, 21.0, 11.0, 5.5, 7, 0, 2],
  ["Nate Archibald", "PG", 1973, "Kansas City-Omaha Kings", 34.0, 6.4, 11.4, 48.2, 0.0, 78.6, 24.0, 12.0, 6.0, 6, 0, 1],
  ["Dave Cowens", "C", 1974, "Boston Celtics", 20.0, 15.2, 4.4, 45.5, 0.0, 78.9, 22.0, 12.5, 5.5, 8, 0, 2],
  ["Elvin Hayes", "PF", 1975, "Washington Bullets", 23.0, 14.4, 2.2, 47.3, 0.0, 62.0, 20.5, 11.5, 4.0, 12, 0, 1],
  ["Artis Gilmore", "C", 1978, "Chicago Bulls", 22.9, 14.0, 2.9, 59.5, 0.0, 69.5, 25.0, 13.0, 5.0, 6, 0, 0],
  ["Kevin McHale", "PF", 1987, "Boston Celtics", 22.6, 9.9, 2.3, 60.4, 0.0, 81.6, 24.5, 12.0, 4.5, 7, 0, 3],
  ["Robert Parish", "C", 1982, "Boston Celtics", 19.9, 10.8, 2.0, 55.2, 0.0, 72.9, 21.0, 10.5, 3.5, 9, 0, 4],
  ["James Worthy", "SF", 1990, "Los Angeles Lakers", 21.4, 5.7, 3.5, 54.9, 0.0, 77.1, 20.5, 9.5, 3.5, 7, 0, 3],
  ["Adrian Dantley", "SF", 1984, "Utah Jazz", 30.6, 6.0, 2.1, 56.0, 0.0, 81.6, 26.5, 11.0, 5.0, 6, 0, 0],
  ["Alex English", "SF", 1986, "Denver Nuggets", 29.8, 6.0, 3.8, 50.6, 0.0, 81.0, 22.5, 9.5, 3.5, 8, 0, 0],
  ["Bernard King", "SF", 1985, "New York Knicks", 32.9, 5.8, 3.6, 54.0, 0.0, 79.4, 25.5, 11.0, 5.5, 4, 0, 0],
  ["Dominique Wilkins", "SF", 1988, "Atlanta Hawks", 30.3, 6.9, 2.7, 46.4, 27.2, 82.4, 22.5, 10.5, 4.5, 9, 0, 0],
  ["Joe Dumars", "SG", 1989, "Detroit Pistons", 17.2, 3.2, 5.0, 48.0, 24.5, 88.6, 16.5, 8.0, 2.0, 6, 0, 2],
  ["Tom Chambers", "PF", 1990, "Phoenix Suns", 27.2, 8.6, 3.8, 48.5, 31.0, 83.5, 22.0, 10.5, 3.5, 4, 0, 0],
  // Late 80s - 90s
  ["Mark Price", "PG", 1992, "Cleveland Cavaliers", 17.3, 3.3, 8.0, 51.2, 43.9, 94.7, 20.5, 9.5, 4.5, 4, 0, 0],
  ["Detlef Schrempf", "SF", 1995, "Seattle SuperSonics", 18.1, 8.3, 3.8, 49.0, 39.5, 84.0, 19.0, 9.0, 2.0, 3, 0, 0],
  ["Dan Majerle", "SG", 1994, "Phoenix Suns", 17.6, 5.4, 4.4, 44.5, 40.0, 75.0, 16.5, 8.0, 2.0, 3, 0, 0],
  ["Jeff Hornacek", "SG", 1997, "Utah Jazz", 15.8, 3.1, 5.0, 48.9, 44.0, 88.2, 17.5, 8.5, 2.5, 3, 0, 0],
  ["Glen Rice", "SG", 1997, "Charlotte Hornets", 26.8, 4.7, 3.0, 48.0, 44.0, 89.5, 20.5, 9.5, 3.0, 3, 0, 1],
  ["Larry Johnson", "PF", 1993, "Charlotte Hornets", 22.1, 10.5, 3.6, 49.0, 31.5, 77.0, 19.5, 9.5, 2.0, 2, 0, 1],
  ["Latrell Sprewell", "SG", 1994, "Golden State Warriors", 21.0, 4.8, 4.6, 43.5, 35.0, 74.0, 18.5, 8.5, 2.0, 4, 0, 0],
  ["Kevin Johnson", "PG", 1994, "Phoenix Suns", 20.1, 3.8, 11.4, 51.8, 17.5, 83.9, 22.0, 10.0, 5.5, 3, 0, 0],
  ["Muggsy Bogues", "PG", 1995, "Charlotte Hornets", 10.8, 3.1, 9.4, 46.0, 28.5, 76.5, 14.0, 6.0, 2.0, 1, 0, 0],
  ["Dale Ellis", "SG", 1989, "Seattle SuperSonics", 27.5, 4.3, 2.4, 45.4, 40.9, 85.7, 18.0, 8.5, 2.0, 1, 0, 0],
  ["Rolando Blackman", "SG", 1988, "Dallas Mavericks", 22.4, 3.8, 3.1, 50.2, 35.0, 82.5, 18.0, 9.0, 2.5, 4, 0, 0],
  ["Fat Lever", "PG", 1988, "Denver Nuggets", 21.3, 9.5, 8.7, 47.0, 25.5, 78.0, 20.5, 10.0, 4.0, 2, 0, 0],
  ["Xavier McDaniel", "SF", 1989, "Seattle SuperSonics", 21.4, 6.3, 2.7, 50.0, 15.0, 74.5, 18.5, 8.5, 2.5, 1, 0, 0],
  ["Mark Aguirre", "SF", 1984, "Dallas Mavericks", 29.5, 6.6, 4.0, 46.0, 28.0, 78.5, 21.0, 9.5, 3.0, 3, 0, 2],
  ["Byron Scott", "SG", 1988, "Los Angeles Lakers", 17.6, 3.4, 3.4, 47.5, 34.2, 83.4, 16.0, 7.5, 2.0, 1, 0, 3],
  ["Terry Cummings", "PF", 1987, "Milwaukee Bucks", 22.1, 8.5, 2.4, 51.4, 0.0, 74.5, 19.5, 9.0, 2.0, 2, 0, 0],
  ["Hersey Hawkins", "SG", 1995, "Charlotte Hornets", 20.1, 4.0, 3.7, 48.5, 43.0, 89.0, 19.0, 9.5, 3.0, 4, 0, 0],
  ["Derek Harper", "PG", 1994, "Dallas Mavericks", 15.4, 3.0, 5.7, 45.7, 35.5, 73.5, 15.0, 7.5, 2.0, 2, 0, 0],
  ["Buck Williams", "PF", 1988, "Portland Trail Blazers", 14.4, 9.4, 1.3, 54.0, 0.0, 71.0, 17.0, 9.0, 1.0, 3, 0, 1],
  ["Otis Thorpe", "PF", 1992, "Houston Rockets", 18.1, 10.9, 2.6, 58.2, 0.0, 68.5, 18.5, 9.0, 1.5, 1, 0, 1],
  ["Larry Nance", "PF", 1989, "Cleveland Cavaliers", 17.1, 8.0, 2.0, 56.0, 0.0, 73.0, 20.0, 9.5, 2.5, 3, 0, 0],
  ["Terry Porter", "PG", 1992, "Portland Trail Blazers", 18.0, 3.5, 6.2, 47.0, 37.5, 83.0, 18.0, 8.5, 3.0, 2, 0, 0],
  ["Sam Perkins", "PF", 1994, "Seattle SuperSonics", 11.0, 5.8, 1.5, 46.5, 38.5, 76.8, 13.5, 6.5, 0.5, 1, 0, 1],
  ["Dennis Scott", "SG", 1996, "Orlando Magic", 15.7, 3.5, 1.6, 44.0, 41.0, 83.0, 14.0, 6.5, 1.0, 1, 0, 0],
  ["Sam Cassell", "PG", 2004, "Minnesota Timberwolves", 20.1, 3.8, 6.1, 46.5, 36.0, 86.0, 20.5, 9.5, 3.5, 3, 0, 2],
  ["Jamal Mashburn", "SF", 1995, "Dallas Mavericks", 24.1, 5.0, 3.5, 45.0, 35.5, 77.0, 19.5, 9.0, 2.5, 3, 0, 0],
  // 2000s
  ["Chauncey Billups", "PG", 2006, "Detroit Pistons", 21.4, 3.9, 5.7, 45.0, 41.0, 89.0, 20.5, 11.0, 5.0, 5, 0, 1],
  ["Ben Wallace", "C", 2004, "Detroit Pistons", 9.5, 15.4, 1.5, 47.0, 0.0, 41.5, 16.0, 9.0, 2.0, 4, 0, 1],
  ["Richard Hamilton", "SG", 2006, "Detroit Pistons", 20.1, 3.5, 4.9, 47.0, 38.5, 89.5, 19.0, 9.5, 2.5, 3, 0, 1],
  ["Gilbert Arenas", "PG", 2006, "Washington Wizards", 29.3, 4.7, 6.1, 45.0, 38.5, 80.0, 24.0, 10.5, 5.5, 3, 0, 0],
  ["Amar'e Stoudemire", "PF", 2005, "Phoenix Suns", 26.0, 8.9, 1.8, 55.9, 0.0, 76.8, 25.5, 11.0, 5.0, 6, 0, 0],
  ["Shawn Marion", "PF", 2006, "Phoenix Suns", 21.8, 12.3, 2.6, 50.8, 33.0, 78.0, 22.0, 12.0, 3.0, 4, 0, 0],
  ["Rasheed Wallace", "PF", 2003, "Portland Trail Blazers", 18.1, 6.4, 1.8, 47.0, 36.0, 70.0, 18.5, 8.5, 2.0, 4, 0, 1],
  ["Zach Randolph", "PF", 2010, "Memphis Grizzlies", 20.8, 12.2, 2.6, 48.5, 0.0, 73.5, 21.0, 10.0, 2.0, 2, 0, 0],
  ["Tony Parker", "PG", 2009, "San Antonio Spurs", 22.5, 3.5, 6.9, 50.2, 30.0, 81.5, 21.5, 11.0, 5.0, 6, 0, 4],
  ["Manu Ginobili", "SG", 2008, "San Antonio Spurs", 19.5, 4.8, 4.8, 46.5, 39.8, 84.0, 22.0, 10.5, 5.5, 2, 0, 4],
  ["Pau Gasol", "PF", 2008, "Los Angeles Lakers", 18.8, 9.8, 3.5, 57.0, 0.0, 79.0, 22.5, 12.0, 5.5, 6, 0, 2],
  ["Elton Brand", "PF", 2006, "Los Angeles Clippers", 24.7, 10.3, 2.5, 55.9, 0.0, 73.0, 24.0, 11.0, 4.0, 2, 0, 0],
  ["Lamar Odom", "SF", 2006, "Los Angeles Lakers", 15.9, 9.2, 3.9, 50.5, 36.0, 64.5, 17.5, 8.5, 2.0, 1, 0, 2],
  ["Peja Stojakovic", "SF", 2004, "Sacramento Kings", 24.2, 5.8, 2.8, 47.8, 43.9, 89.5, 21.0, 9.5, 2.5, 3, 0, 1],
  ["Andrei Kirilenko", "SF", 2004, "Utah Jazz", 15.6, 8.5, 3.6, 51.8, 33.0, 78.0, 20.0, 10.0, 4.0, 1, 0, 0],
  ["Mike Bibby", "PG", 2005, "Sacramento Kings", 18.7, 3.7, 6.2, 44.5, 38.0, 86.0, 18.0, 8.5, 2.0, 1, 0, 0],
  ["Caron Butler", "SF", 2007, "Washington Wizards", 22.2, 5.5, 3.8, 46.5, 37.0, 79.5, 19.5, 9.5, 3.0, 2, 0, 0],
  ["Andre Iguodala", "SF", 2007, "Philadelphia 76ers", 14.0, 5.7, 5.4, 46.5, 32.0, 76.5, 16.0, 8.5, 3.0, 1, 0, 3],
  ["Josh Smith", "PF", 2012, "Atlanta Hawks", 18.8, 9.6, 3.5, 47.0, 16.0, 61.0, 18.5, 8.5, 2.5, 1, 0, 0],
  ["Michael Redd", "SG", 2006, "Milwaukee Bucks", 26.7, 4.4, 2.7, 45.8, 40.0, 87.5, 21.0, 9.5, 2.5, 1, 0, 0],
  ["Luol Deng", "SF", 2012, "Chicago Bulls", 18.4, 7.2, 3.5, 46.5, 34.0, 80.0, 17.5, 10.0, 2.5, 2, 0, 0],
  ["Stephon Marbury", "PG", 2004, "New York Knicks", 21.7, 3.1, 8.1, 42.8, 35.0, 81.0, 19.5, 8.5, 3.5, 2, 0, 0],
  ["Baron Davis", "PG", 2003, "New Orleans Hornets", 22.7, 4.9, 8.4, 43.0, 36.8, 74.5, 21.0, 9.5, 4.5, 2, 0, 0],
  ["Antoine Walker", "PF", 2002, "Boston Celtics", 22.1, 8.8, 3.7, 40.8, 36.0, 70.0, 17.5, 8.5, 2.0, 3, 0, 0],
  ["Ron Artest", "SF", 2004, "Indiana Pacers", 18.3, 5.7, 3.2, 42.8, 34.0, 65.0, 16.0, 8.0, 2.0, 1, 0, 1],
  ["Carlos Boozer", "PF", 2009, "Utah Jazz", 21.0, 11.1, 2.4, 53.0, 0.0, 68.0, 20.0, 10.0, 2.0, 2, 0, 0],
  ["Marcus Camby", "C", 2002, "Denver Nuggets", 11.5, 12.7, 1.5, 49.0, 0.0, 55.0, 18.5, 9.5, 3.0, 1, 0, 0],
  ["Steve Francis", "PG", 2001, "Houston Rockets", 21.6, 6.6, 7.3, 43.5, 31.5, 73.5, 21.0, 9.5, 4.0, 3, 0, 0],
  ["Antawn Jamison", "PF", 2009, "Washington Wizards", 22.2, 8.0, 2.2, 47.5, 36.0, 72.0, 19.5, 9.0, 2.0, 2, 0, 0],
  ["Mo Williams", "PG", 2009, "Cleveland Cavaliers", 17.8, 3.2, 4.1, 45.0, 40.5, 84.5, 17.0, 8.0, 2.0, 1, 0, 0],
  ["Vlade Divac", "C", 2002, "Sacramento Kings", 12.9, 9.3, 3.8, 46.5, 0.0, 68.0, 17.5, 8.5, 2.0, 1, 0, 0],
  ["Ben Gordon", "SG", 2006, "Chicago Bulls", 18.5, 2.5, 2.3, 43.5, 39.0, 87.0, 17.0, 7.5, 1.0, 1, 0, 0],
  ["Mike Miller", "SF", 2009, "Memphis Grizzlies", 14.4, 5.5, 3.4, 44.8, 43.5, 88.5, 15.0, 7.0, 1.5, 1, 0, 1],
  ["Shareef Abdur-Rahim", "PF", 2002, "Vancouver Grizzlies", 23.0, 9.0, 3.2, 48.5, 28.0, 78.0, 21.0, 9.5, 2.5, 1, 0, 0],
  ["Jamal Crawford", "SG", 2010, "Atlanta Hawks", 18.0, 3.0, 4.5, 41.5, 36.5, 87.5, 16.0, 6.5, 1.0, 1, 0, 0],
  ["Deron Williams", "PG", 2011, "Utah Jazz", 21.4, 3.6, 9.9, 47.7, 38.5, 84.0, 22.5, 11.0, 5.5, 3, 0, 0],
  ["Jermaine O'Neal", "PF", 2003, "Indiana Pacers", 20.8, 10.3, 2.2, 48.0, 0.0, 72.0, 22.0, 10.5, 3.5, 6, 0, 0],
  ["Jason Terry", "PG", 2009, "Dallas Mavericks", 19.6, 3.0, 5.1, 43.5, 38.0, 87.5, 17.5, 7.5, 2.0, 1, 0, 1],
  ["Al Jefferson", "C", 2014, "Charlotte Bobcats", 21.8, 10.8, 2.0, 51.5, 0.0, 71.0, 22.5, 10.5, 2.0, 1, 0, 0],
  ["Tyson Chandler", "C", 2011, "Dallas Mavericks", 10.1, 11.1, 1.1, 68.4, 0.0, 58.0, 18.5, 9.5, 1.5, 2, 0, 1],
  ["Cuttino Mobley", "SG", 2001, "Houston Rockets", 18.6, 4.1, 3.8, 44.0, 36.5, 83.5, 16.5, 7.5, 2.0, 2, 0, 0],
  // 2010s
  ["Derrick Rose", "PG", 2011, "Chicago Bulls", 25.0, 4.1, 7.7, 44.5, 33.0, 85.8, 23.5, 11.0, 6.0, 3, 1, 0],
  ["Marc Gasol", "C", 2015, "Memphis Grizzlies", 17.4, 7.8, 3.8, 47.5, 32.5, 79.5, 19.5, 10.5, 3.5, 3, 0, 1],
  ["Kyrie Irving", "PG", 2018, "Boston Celtics", 24.4, 3.8, 5.1, 48.7, 40.1, 89.0, 22.5, 9.5, 4.0, 7, 0, 1],
  ["Paul George", "SF", 2019, "Oklahoma City Thunder", 28.0, 8.2, 4.1, 43.1, 38.6, 81.5, 22.0, 10.5, 5.0, 9, 0, 0],
  ["Kevin Love", "PF", 2012, "Minnesota Timberwolves", 26.0, 13.3, 2.5, 45.7, 37.0, 82.0, 26.0, 14.5, 5.0, 5, 0, 1],
  ["LaMarcus Aldridge", "PF", 2018, "San Antonio Spurs", 23.1, 8.5, 2.2, 50.5, 29.0, 82.5, 22.0, 11.5, 3.5, 7, 0, 0],
  ["DeMar DeRozan", "SG", 2018, "Toronto Raptors", 23.0, 3.9, 5.2, 45.2, 32.5, 83.0, 20.5, 10.0, 3.0, 5, 0, 1],
  ["Kemba Walker", "PG", 2019, "Charlotte Hornets", 25.6, 4.4, 5.9, 43.4, 35.9, 87.2, 22.0, 9.5, 4.0, 5, 0, 0],
  ["Devin Booker", "SG", 2021, "Phoenix Suns", 26.8, 4.5, 4.8, 46.6, 34.8, 87.5, 22.5, 10.5, 4.0, 4, 0, 0],
  ["Bradley Beal", "SG", 2021, "Washington Wizards", 31.3, 4.7, 4.4, 48.6, 34.8, 88.7, 24.0, 9.0, 4.0, 3, 0, 0],
  ["Rudy Gobert", "C", 2019, "Utah Jazz", 15.9, 12.9, 1.4, 66.9, 0.0, 68.5, 24.5, 12.0, 4.0, 4, 0, 0],
  ["Khris Middleton", "SF", 2021, "Milwaukee Bucks", 20.4, 6.0, 5.4, 49.6, 41.4, 89.6, 19.5, 9.5, 3.0, 3, 0, 1],
  ["Zach LaVine", "SG", 2022, "Chicago Bulls", 24.4, 4.6, 4.5, 48.4, 39.0, 86.8, 21.5, 9.5, 3.5, 2, 0, 0],
  ["Donovan Mitchell", "SG", 2022, "Utah Jazz", 25.9, 4.2, 5.3, 45.3, 36.3, 84.3, 22.0, 10.0, 4.0, 3, 0, 0],
  ["De'Aaron Fox", "PG", 2023, "Sacramento Kings", 25.2, 4.2, 6.1, 50.1, 33.5, 77.6, 21.5, 10.0, 4.0, 1, 0, 0],
  ["Karl-Anthony Towns", "C", 2022, "Minnesota Timberwolves", 24.6, 9.8, 4.4, 52.9, 41.0, 82.8, 26.0, 11.5, 4.5, 3, 0, 0],
  ["Trae Young", "PG", 2023, "Atlanta Hawks", 26.2, 3.0, 10.2, 43.0, 35.0, 86.5, 22.5, 9.5, 4.0, 3, 0, 0],
  ["Bam Adebayo", "C", 2022, "Miami Heat", 21.2, 9.6, 3.4, 55.0, 0.0, 79.2, 23.0, 11.0, 3.0, 4, 0, 0],
  ["Jimmy Butler", "SF", 2020, "Miami Heat", 19.9, 6.7, 6.0, 45.5, 24.4, 86.3, 20.5, 10.0, 4.0, 6, 0, 0],
  ["Tobias Harris", "PF", 2019, "Philadelphia 76ers", 20.0, 7.9, 3.2, 49.2, 39.0, 80.5, 19.0, 9.5, 2.5, 1, 0, 0],
  ["CJ McCollum", "SG", 2021, "Portland Trail Blazers", 23.0, 4.4, 4.4, 45.7, 39.5, 85.0, 19.0, 8.5, 2.0, 1, 0, 0],
  ["Jamal Murray", "PG", 2023, "Denver Nuggets", 21.2, 4.1, 6.2, 48.0, 40.5, 85.3, 19.5, 9.5, 3.0, 1, 0, 1],
  ["Brandon Ingram", "SF", 2020, "New Orleans Pelicans", 24.3, 6.3, 4.2, 46.7, 38.5, 85.3, 22.0, 10.0, 3.5, 1, 0, 0],
  ["LaMelo Ball", "PG", 2023, "Charlotte Hornets", 23.3, 5.5, 8.0, 43.9, 38.4, 80.3, 21.5, 9.0, 4.0, 1, 0, 0],
  ["Jaylen Brown", "SG", 2022, "Boston Celtics", 23.6, 6.1, 3.5, 47.3, 35.8, 76.0, 19.0, 9.0, 3.0, 2, 0, 1],
  ["Ben Simmons", "PG", 2020, "Philadelphia 76ers", 16.4, 7.8, 8.0, 58.6, 0.0, 61.3, 19.0, 9.0, 4.0, 3, 0, 0],
  ["Kristaps Porzingis", "PF", 2018, "New York Knicks", 22.7, 6.6, 1.2, 43.9, 39.5, 76.7, 21.5, 9.0, 2.5, 2, 0, 1],
  ["D'Angelo Russell", "PG", 2019, "Brooklyn Nets", 21.1, 3.9, 7.0, 43.0, 37.0, 82.0, 19.0, 8.5, 2.5, 1, 0, 0],
  ["Harrison Barnes", "SF", 2020, "Sacramento Kings", 17.0, 4.5, 2.2, 46.8, 38.5, 77.5, 15.5, 7.0, 0.5, 0, 0, 1],
  ["Mike Conley", "PG", 2017, "Memphis Grizzlies", 20.5, 3.4, 6.3, 43.8, 38.5, 83.0, 18.5, 9.0, 3.0, 1, 0, 1],
  ["Goran Dragic", "PG", 2018, "Miami Heat", 17.0, 3.8, 5.0, 46.1, 38.5, 82.5, 18.0, 8.5, 2.5, 1, 0, 0],
  ["Brook Lopez", "C", 2018, "Los Angeles Lakers", 20.5, 4.1, 1.7, 47.0, 35.5, 81.0, 20.5, 8.5, 2.0, 1, 0, 1],
  ["Serge Ibaka", "PF", 2014, "Oklahoma City Thunder", 14.2, 8.0, 1.2, 52.5, 28.5, 73.5, 18.0, 9.5, 2.0, 1, 0, 1],
  ["Nicolas Batum", "SF", 2016, "Charlotte Hornets", 14.5, 6.6, 5.9, 44.8, 36.5, 74.0, 15.5, 8.0, 2.0, 1, 0, 1],
  ["Eric Gordon", "SG", 2017, "Houston Rockets", 16.2, 2.5, 2.9, 41.5, 36.5, 87.5, 16.0, 7.0, 1.0, 1, 0, 0],
  ["Nikola Vucevic", "C", 2019, "Orlando Magic", 21.0, 11.8, 3.8, 50.3, 36.5, 82.3, 22.0, 11.5, 2.5, 2, 0, 0],
  ["Dillon Brooks", "SF", 2023, "Memphis Grizzlies", 14.3, 3.2, 2.3, 41.5, 35.0, 71.5, 12.5, 5.5, -0.5, 0, 0, 0],
  ["OG Anunoby", "SF", 2024, "New York Knicks", 14.7, 5.3, 1.7, 47.4, 37.0, 78.6, 14.5, 8.5, 2.0, 1, 0, 0],
  ["Josh Hart", "PF", 2024, "New York Knicks", 12.8, 10.5, 5.5, 51.8, 35.5, 73.8, 15.5, 8.5, 1.5, 0, 0, 0],
  ["Jordan Poole", "SG", 2022, "Golden State Warriors", 17.0, 3.4, 3.4, 44.5, 35.5, 87.8, 16.0, 6.5, 0.5, 0, 0, 1],
  ["Norman Powell", "SG", 2022, "Los Angeles Clippers", 17.6, 3.2, 1.6, 44.4, 38.5, 82.5, 15.5, 7.0, 0.5, 0, 0, 0],
  // 2020s current
  ["Ja Morant", "PG", 2023, "Memphis Grizzlies", 26.2, 5.9, 8.1, 47.1, 30.7, 76.5, 24.5, 10.0, 6.0, 2, 0, 0],
  ["Shai Gilgeous-Alexander", "PG", 2024, "Oklahoma City Thunder", 30.1, 5.5, 6.2, 53.5, 35.2, 87.4, 28.5, 13.5, 8.5, 3, 0, 0],
  ["Anthony Edwards", "SG", 2024, "Minnesota Timberwolves", 25.9, 5.4, 5.1, 46.0, 36.9, 83.5, 22.5, 10.0, 4.5, 2, 0, 0],
  ["Victor Wembanyama", "C", 2024, "San Antonio Spurs", 21.4, 10.6, 3.9, 46.5, 32.5, 79.5, 26.5, 11.5, 7.0, 1, 0, 0],
  ["Tyrese Haliburton", "PG", 2024, "Indiana Pacers", 20.1, 3.9, 10.9, 47.1, 40.2, 83.5, 21.0, 10.5, 5.5, 2, 0, 0],
  ["Cade Cunningham", "PG", 2024, "Detroit Pistons", 22.7, 4.4, 7.5, 44.8, 34.5, 80.0, 21.0, 9.5, 4.0, 1, 0, 0],
  ["Evan Mobley", "C", 2024, "Cleveland Cavaliers", 18.0, 8.2, 2.8, 55.0, 28.0, 74.5, 21.5, 10.0, 3.0, 1, 0, 0],
  ["Paolo Banchero", "PF", 2024, "Orlando Magic", 22.6, 6.9, 5.4, 46.2, 32.0, 73.5, 21.0, 9.5, 3.0, 1, 0, 0],
  ["Franz Wagner", "SF", 2024, "Orlando Magic", 22.8, 5.5, 4.8, 47.2, 33.5, 76.5, 20.5, 9.5, 2.5, 1, 0, 0],
  ["Scottie Barnes", "PF", 2024, "Toronto Raptors", 19.9, 8.2, 6.1, 48.6, 26.0, 74.8, 20.5, 10.0, 2.5, 1, 0, 0],
  ["Andrew Wiggins", "SF", 2022, "Golden State Warriors", 17.2, 4.5, 2.3, 47.3, 39.1, 73.5, 16.5, 8.0, 1.5, 1, 0, 1],
  ["Miles Bridges", "SF", 2022, "Charlotte Hornets", 20.2, 7.0, 3.8, 48.8, 39.0, 73.5, 19.0, 9.5, 2.5, 1, 0, 0],
  ["Jordan Clarkson", "SG", 2021, "Utah Jazz", 18.4, 4.0, 2.5, 42.0, 37.5, 82.5, 17.0, 6.5, 0.5, 1, 0, 0],
  ["Dario Saric", "PF", 2018, "Philadelphia 76ers", 13.9, 6.1, 3.0, 45.0, 38.5, 80.0, 16.5, 7.0, 1.0, 1, 0, 0],
  ["Marcus Smart", "PG", 2022, "Memphis Grizzlies", 12.1, 3.4, 6.0, 40.3, 34.5, 72.5, 12.5, 6.5, 1.5, 1, 0, 0],
  ["Kyle Lowry", "PG", 2016, "Toronto Raptors", 21.2, 4.7, 6.4, 43.1, 38.7, 81.5, 20.5, 10.0, 4.0, 7, 0, 1],
  ["Myles Turner", "C", 2023, "Indiana Pacers", 13.4, 6.9, 1.7, 54.0, 36.5, 79.2, 18.5, 9.5, 2.0, 1, 0, 0],
  ["Jaren Jackson Jr.", "PF", 2023, "Memphis Grizzlies", 18.6, 6.0, 1.7, 46.9, 37.8, 78.4, 19.5, 9.0, 2.5, 1, 0, 0],
  ["Alperen Sengun", "C", 2024, "Houston Rockets", 21.1, 9.3, 5.6, 55.1, 0.0, 71.8, 24.0, 11.0, 4.5, 1, 0, 0],
  ["Jalen Brunson", "PG", 2024, "New York Knicks", 28.7, 3.6, 6.7, 49.6, 40.1, 84.7, 24.0, 11.5, 5.5, 2, 0, 0],
  ["Coby White", "SG", 2024, "Chicago Bulls", 19.1, 4.2, 4.4, 46.8, 38.5, 83.0, 18.0, 8.0, 1.5, 1, 0, 0],
  ["Ivica Zubac", "C", 2024, "Los Angeles Clippers", 12.8, 9.4, 2.0, 63.5, 0.0, 79.2, 18.0, 9.0, 1.5, 1, 0, 0],
  ["Precious Achiuwa", "PF", 2023, "Toronto Raptors", 11.5, 7.8, 1.4, 55.5, 0.0, 72.0, 15.5, 7.0, 0.5, 0, 0, 0],
  ["Herbert Jones", "SF", 2023, "New Orleans Pelicans", 11.1, 5.0, 2.3, 50.5, 34.5, 73.5, 13.5, 7.0, 1.5, 0, 0, 0],
  ["Isaiah Joe", "SG", 2023, "Oklahoma City Thunder", 10.5, 2.8, 1.8, 44.5, 40.0, 83.0, 13.0, 5.5, 0.5, 0, 0, 0],
  ["Amen Thompson", "SF", 2024, "Houston Rockets", 12.0, 7.5, 3.8, 53.5, 14.0, 64.5, 16.5, 7.5, 1.5, 0, 0, 0],
  ["Ausar Thompson", "SF", 2024, "Detroit Pistons", 11.4, 5.3, 3.2, 51.0, 25.0, 60.0, 14.0, 6.5, 1.0, 0, 0, 0],
  ["Bilal Coulibaly", "SF", 2024, "Washington Wizards", 11.3, 4.1, 2.8, 46.5, 37.0, 73.0, 13.5, 6.5, 1.5, 0, 0, 0],
  ["Gradey Dick", "SG", 2024, "Toronto Raptors", 10.0, 2.7, 1.5, 42.5, 37.5, 82.0, 12.0, 5.0, 0.0, 0, 0, 0],
  ["Chet Holmgren", "C", 2024, "Oklahoma City Thunder", 16.5, 7.9, 2.2, 52.4, 39.5, 82.6, 22.5, 10.5, 4.0, 1, 0, 0],
  ["Scoot Henderson", "PG", 2024, "Portland Trail Blazers", 14.7, 3.5, 6.0, 40.8, 32.5, 74.5, 15.0, 5.5, 1.0, 0, 0, 0],
  // additional notable players
  ["Carmelo Anthony", "SF", 2013, "New York Knicks", 28.7, 6.9, 2.6, 44.9, 37.9, 83.4, 22.0, 10.5, 3.5, 10, 0, 0],
  ["Joe Johnson", "SG", 2010, "Atlanta Hawks", 21.3, 4.1, 4.8, 46.8, 39.5, 85.0, 19.5, 10.0, 2.5, 7, 0, 0],
  ["DeMarcus Cousins", "C", 2017, "Sacramento Kings", 27.8, 10.6, 4.6, 46.0, 36.0, 72.5, 27.5, 12.5, 5.5, 4, 0, 0],
  ["John Wall", "PG", 2017, "Washington Wizards", 23.1, 4.2, 10.7, 45.0, 29.5, 80.0, 22.5, 10.5, 5.5, 5, 0, 0],
  ["Gordon Hayward", "SF", 2017, "Utah Jazz", 21.9, 5.4, 3.5, 47.0, 39.5, 84.0, 21.0, 10.5, 4.0, 1, 0, 1],
  ["Paul Millsap", "PF", 2016, "Atlanta Hawks", 18.1, 7.7, 3.7, 47.5, 35.5, 78.5, 20.0, 11.0, 4.0, 4, 0, 0],
  ["Al Horford", "C", 2016, "Atlanta Hawks", 15.2, 7.3, 3.2, 54.0, 35.5, 84.5, 18.5, 10.5, 2.5, 6, 0, 1],
  ["Andre Drummond", "C", 2016, "Detroit Pistons", 16.2, 14.8, 1.6, 54.5, 0.0, 57.0, 21.0, 11.5, 2.5, 2, 0, 0],
  ["Tyreke Evans", "SG", 2012, "Sacramento Kings", 24.7, 6.8, 5.8, 46.0, 28.5, 70.0, 22.0, 10.0, 3.5, 1, 0, 0],
  ["Isaiah Thomas", "PG", 2017, "Boston Celtics", 28.9, 2.7, 5.9, 46.3, 37.9, 90.9, 24.0, 10.5, 6.5, 2, 0, 0],
  ["Deandre Ayton", "C", 2021, "Phoenix Suns", 14.4, 10.5, 1.9, 63.4, 0.0, 72.5, 22.5, 10.5, 2.0, 1, 0, 0],
  ["Mikal Bridges", "SF", 2023, "Brooklyn Nets", 26.1, 4.5, 3.6, 45.0, 38.0, 76.0, 19.5, 8.5, 2.5, 2, 0, 0],
  ["Bogdan Bogdanovic", "SG", 2021, "Atlanta Hawks", 17.0, 3.8, 3.5, 45.0, 39.5, 85.0, 17.0, 7.5, 2.0, 1, 0, 0],
  ["Spencer Dinwiddie", "PG", 2020, "Brooklyn Nets", 20.6, 3.5, 6.8, 43.5, 36.0, 84.0, 19.5, 9.0, 3.0, 0, 0, 0],
  ["Dejounte Murray", "PG", 2022, "San Antonio Spurs", 21.1, 8.3, 9.2, 46.5, 31.5, 74.5, 21.5, 10.5, 4.5, 1, 0, 0],
  ["Darius Garland", "PG", 2022, "Cleveland Cavaliers", 21.7, 3.3, 8.6, 46.4, 38.3, 86.8, 20.5, 9.5, 3.5, 2, 0, 0],
  ["Immanuel Quickley", "PG", 2024, "Toronto Raptors", 18.6, 4.8, 6.8, 44.2, 38.5, 87.5, 18.0, 8.5, 2.5, 1, 0, 0],
  ["Jalen Green", "SG", 2023, "Houston Rockets", 22.1, 4.3, 4.0, 43.3, 35.5, 82.5, 19.0, 8.0, 1.5, 1, 0, 0],
  ["Keegan Murray", "PF", 2024, "Sacramento Kings", 15.6, 4.9, 1.8, 46.5, 40.5, 83.5, 16.0, 8.0, 1.5, 0, 0, 0],
  ["Jabari Smith Jr.", "PF", 2024, "Houston Rockets", 14.5, 6.8, 1.6, 43.5, 37.5, 74.0, 16.5, 7.5, 1.0, 0, 0, 0],
  ["Walker Kessler", "C", 2024, "Utah Jazz", 11.1, 9.0, 1.4, 67.0, 0.0, 72.5, 19.0, 9.0, 3.0, 1, 0, 0],
  ["Bennedict Mathurin", "SG", 2024, "Indiana Pacers", 15.9, 4.2, 2.3, 43.5, 37.0, 78.0, 15.5, 6.5, 0.5, 0, 0, 0],
  ["Jeremy Sochan", "PF", 2024, "San Antonio Spurs", 15.0, 5.8, 4.9, 47.0, 36.5, 77.0, 16.0, 7.5, 1.5, 0, 0, 0],
  ["Ochai Agbaji", "SG", 2024, "Toronto Raptors", 13.6, 3.8, 2.0, 46.5, 39.5, 77.0, 14.5, 6.5, 0.5, 0, 0, 0],
  ["Jalen Williams", "SF", 2024, "Oklahoma City Thunder", 23.0, 4.5, 5.8, 51.2, 36.5, 83.5, 22.5, 11.0, 5.0, 1, 0, 0],
  ["Luguentz Dort", "SG", 2023, "Oklahoma City Thunder", 16.4, 4.5, 2.4, 44.5, 38.5, 82.0, 15.0, 7.5, 1.5, 0, 0, 0],
  ["Josh Giddey", "SF", 2024, "Chicago Bulls", 14.9, 6.4, 6.4, 44.0, 32.5, 65.0, 16.5, 7.5, 1.5, 0, 0, 0],
  ["Tari Eason", "PF", 2024, "Houston Rockets", 13.0, 7.2, 1.3, 51.0, 34.0, 71.5, 16.0, 7.5, 1.5, 0, 0, 0],
  ["Alex Sarr", "C", 2025, "Washington Wizards", 13.3, 6.5, 1.9, 43.0, 32.5, 73.0, 17.0, 7.0, 2.0, 0, 0, 0],
  ["Donovan Clingan", "C", 2025, "Portland Trail Blazers", 10.5, 9.0, 1.5, 62.5, 0.0, 62.0, 17.5, 8.0, 2.5, 0, 0, 0],
  ["Stephon Castle", "PG", 2025, "San Antonio Spurs", 12.2, 4.8, 5.2, 47.0, 35.5, 74.0, 15.5, 7.0, 1.5, 0, 0, 0],
  ["Ron Mercer", "SG", 1999, "Boston Celtics", 15.9, 3.3, 2.8, 45.0, 26.0, 72.5, 14.5, 6.5, 0.5, 0, 0, 0],
  ["David Wesley", "PG", 2002, "Charlotte Hornets", 13.7, 3.5, 5.0, 43.5, 37.0, 82.5, 14.0, 6.5, 1.5, 0, 0, 0],
  ["Nick Van Exel", "PG", 1997, "Los Angeles Lakers", 20.6, 3.0, 8.0, 41.5, 38.5, 78.0, 18.5, 7.5, 2.5, 1, 0, 0],
  ["Mookie Blaylock", "PG", 1997, "Atlanta Hawks", 17.5, 3.8, 6.3, 43.0, 35.5, 74.0, 16.5, 8.0, 2.5, 2, 0, 0],
  ["Chris Mullin", "SF", 1992, "Golden State Warriors", 25.1, 5.9, 4.0, 52.2, 37.5, 89.4, 24.0, 12.0, 5.0, 5, 0, 0],
  ["Drazen Petrovic", "SG", 1993, "New Jersey Nets", 22.3, 3.4, 3.1, 51.8, 44.7, 88.8, 20.5, 9.5, 4.0, 1, 0, 0],
  ["Nick Anderson", "SG", 1995, "Orlando Magic", 15.9, 5.3, 2.1, 44.5, 38.0, 76.0, 15.5, 7.5, 1.5, 1, 0, 0],
]

// Era-balanced salaries: [best-year salary $M, today's market value $M]
const SAL: Record<string, [number, number]> = {
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
  // pre-1990
  "Kareem Abdul-Jabbar": [0.7, 52], "Magic Johnson": [3.0, 46], "Larry Bird": [2.0, 42],
  "Julius Erving": [2.5, 34], "Moses Malone": [2.5, 36], "Isiah Thomas": [1.9, 30],
  "Pete Maravich": [0.4, 30], "George Gervin": [0.8, 26], "Bill Walton": [0.3, 20],
  "Bob McAdoo": [0.5, 28], "Rick Barry": [0.4, 26], "Walt Frazier": [0.3, 24],
  "Nate Archibald": [0.3, 26], "Dave Cowens": [0.3, 20], "Elvin Hayes": [0.4, 20],
  "Artis Gilmore": [0.5, 20], "Kevin McHale": [2.0, 28], "Robert Parish": [1.2, 18],
  "James Worthy": [2.5, 20], "Adrian Dantley": [0.8, 22], "Alex English": [0.8, 20],
  "Bernard King": [0.9, 22], "Dominique Wilkins": [1.8, 24], "Joe Dumars": [1.2, 12],
  "Tom Chambers": [2.0, 18],
  // late 80s-90s
  "Mark Price": [3.0, 14], "Detlef Schrempf": [3.5, 12], "Dan Majerle": [3.0, 12],
  "Jeff Hornacek": [4.0, 12], "Glen Rice": [6.5, 14], "Larry Johnson": [6.0, 12],
  "Latrell Sprewell": [6.0, 10], "Kevin Johnson": [5.5, 14], "Muggsy Bogues": [3.0, 8],
  "Dale Ellis": [1.5, 8], "Rolando Blackman": [1.0, 10], "Fat Lever": [0.9, 12],
  "Xavier McDaniel": [1.2, 10], "Mark Aguirre": [1.5, 10], "Byron Scott": [1.5, 8],
  "Terry Cummings": [1.2, 10], "Hersey Hawkins": [3.5, 10], "Derek Harper": [2.8, 8],
  "Buck Williams": [2.0, 8], "Otis Thorpe": [3.5, 8], "Larry Nance": [2.0, 10],
  "Terry Porter": [2.5, 10], "Sam Perkins": [4.0, 8], "Dennis Scott": [4.5, 6],
  "Sam Cassell": [8.0, 14], "Jamal Mashburn": [5.5, 12],
  // 2000s
  "Chauncey Billups": [11.0, 16], "Ben Wallace": [11.0, 14], "Richard Hamilton": [10.5, 12],
  "Gilbert Arenas": [17.0, 18], "Amar'e Stoudemire": [18.0, 22], "Shawn Marion": [16.0, 16],
  "Rasheed Wallace": [14.5, 12], "Zach Randolph": [16.0, 14], "Tony Parker": [12.5, 18],
  "Manu Ginobili": [14.0, 18], "Pau Gasol": [19.0, 22], "Elton Brand": [16.4, 16],
  "Lamar Odom": [14.5, 12], "Peja Stojakovic": [11.6, 12], "Andrei Kirilenko": [14.0, 14],
  "Mike Bibby": [10.0, 10], "Caron Butler": [10.0, 12], "Andre Iguodala": [12.0, 16],
  "Josh Smith": [13.5, 10], "Michael Redd": [14.5, 12], "Luol Deng": [14.0, 14],
  "Stephon Marbury": [14.0, 10], "Baron Davis": [11.0, 12], "Antoine Walker": [10.0, 8],
  "Ron Artest": [7.5, 10], "Carlos Boozer": [13.5, 12], "Marcus Camby": [10.0, 10],
  "Steve Francis": [10.0, 12], "Antawn Jamison": [13.0, 10], "Mo Williams": [10.0, 8],
  "Vlade Divac": [9.0, 8], "Ben Gordon": [10.0, 8], "Mike Miller": [6.0, 8],
  "Shareef Abdur-Rahim": [8.5, 10], "Jamal Crawford": [9.0, 8],
  "Deron Williams": [18.0, 16], "Jermaine O'Neal": [15.0, 14], "Jason Terry": [8.5, 8],
  "Al Jefferson": [13.0, 12], "Tyson Chandler": [13.0, 12], "Cuttino Mobley": [7.5, 8],
  // 2010s
  "Derrick Rose": [20.0, 22], "Marc Gasol": [21.5, 20], "Kyrie Irving": [33.0, 30],
  "Paul George": [35.5, 32], "Kevin Love": [25.0, 22], "LaMarcus Aldridge": [26.0, 22],
  "DeMar DeRozan": [27.0, 22], "Kemba Walker": [32.0, 20], "Devin Booker": [33.0, 32],
  "Bradley Beal": [34.5, 30], "Rudy Gobert": [41.0, 30], "Khris Middleton": [35.0, 24],
  "Zach LaVine": [34.5, 26], "Donovan Mitchell": [31.0, 28], "De'Aaron Fox": [30.0, 28],
  "Karl-Anthony Towns": [36.0, 32], "Trae Young": [36.0, 30], "Bam Adebayo": [32.0, 28],
  "Jimmy Butler": [37.0, 28], "Tobias Harris": [36.0, 20], "CJ McCollum": [30.0, 20],
  "Jamal Murray": [28.0, 26], "Brandon Ingram": [31.0, 26], "LaMelo Ball": [33.0, 28],
  "Jaylen Brown": [30.0, 28], "Ben Simmons": [33.0, 18], "Kristaps Porzingis": [27.0, 20],
  "D'Angelo Russell": [17.0, 16], "Harrison Barnes": [22.0, 14], "Mike Conley": [26.0, 16],
  "Goran Dragic": [19.0, 14], "Brook Lopez": [22.0, 16], "Serge Ibaka": [23.0, 14],
  "Nicolas Batum": [24.0, 10], "Eric Gordon": [14.0, 10], "Nikola Vucevic": [22.0, 18],
  "Dillon Brooks": [18.0, 10], "OG Anunoby": [36.0, 24], "Josh Hart": [14.0, 12],
  "Jordan Poole": [28.0, 14], "Norman Powell": [18.0, 14], "Kyle Lowry": [28.0, 14],
  "Myles Turner": [19.0, 16], "Jaren Jackson Jr.": [26.0, 22],
  // 2020s
  "Ja Morant": [34.0, 38], "Shai Gilgeous-Alexander": [34.0, 46], "Anthony Edwards": [41.0, 42],
  "Victor Wembanyama": [12.0, 50], "Tyrese Haliburton": [26.0, 32], "Cade Cunningham": [26.0, 28],
  "Evan Mobley": [24.5, 30], "Paolo Banchero": [10.0, 30], "Franz Wagner": [21.0, 28],
  "Scottie Barnes": [29.0, 26], "Andrew Wiggins": [33.0, 18], "Miles Bridges": [7.5, 18],
  "Jordan Clarkson": [15.0, 12], "Dario Saric": [8.5, 8], "Marcus Smart": [16.0, 12],
  "Alperen Sengun": [14.0, 32], "Jalen Brunson": [22.0, 36], "Coby White": [8.5, 16],
  "Ivica Zubac": [8.5, 12], "Precious Achiuwa": [8.5, 8], "Herbert Jones": [4.0, 8],
  "Isaiah Joe": [2.0, 6], "Amen Thompson": [7.5, 14], "Ausar Thompson": [7.5, 12],
  "Bilal Coulibaly": [4.5, 10], "Gradey Dick": [4.5, 8], "Chet Holmgren": [10.0, 24],
  "Scoot Henderson": [10.0, 14],
  "Carmelo Anthony": [24.0, 22], "Joe Johnson": [18.0, 14], "DeMarcus Cousins": [16.0, 20],
  "John Wall": [19.0, 18], "Gordon Hayward": [29.0, 18], "Paul Millsap": [20.0, 16],
  "Al Horford": [27.0, 18], "Andre Drummond": [25.0, 16], "Tyreke Evans": [12.0, 14],
  "Isaiah Thomas": [6.2, 18], "Deandre Ayton": [14.0, 22], "Mikal Bridges": [25.0, 26],
  "Bogdan Bogdanovic": [18.0, 14], "Spencer Dinwiddie": [12.0, 14], "Dejounte Murray": [15.0, 22],
  "Darius Garland": [32.0, 22], "Immanuel Quickley": [18.0, 18], "Jalen Green": [6.0, 22],
  "Keegan Murray": [4.0, 16], "Jabari Smith Jr.": [6.3, 16], "Walker Kessler": [3.5, 14],
  "Bennedict Mathurin": [5.5, 14], "Jeremy Sochan": [5.8, 14], "Ochai Agbaji": [2.1, 10],
  "Jalen Williams": [14.0, 28], "Luguentz Dort": [11.0, 12], "Josh Giddey": [6.0, 14],
  "Tari Eason": [2.0, 12], "Alex Sarr": [10.0, 18], "Donovan Clingan": [10.0, 14],
  "Stephon Castle": [10.0, 14], "Ron Mercer": [4.5, 6], "David Wesley": [4.0, 6],
  "Nick Van Exel": [5.5, 10], "Mookie Blaylock": [4.5, 8], "Chris Mullin": [3.5, 14],
  "Drazen Petrovic": [2.0, 12], "Nick Anderson": [4.0, 8],
}

const NBA_ID: Record<string, number> = {
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
  // pre-1990
  "Kareem Abdul-Jabbar": 76003, "Magic Johnson": 77142, "Larry Bird": 1449,
  "Julius Erving": 77140, "Moses Malone": 77449, "Isiah Thomas": 78499,
  "Pete Maravich": 78285, "George Gervin": 77182, "Bill Walton": 79457,
  "Bob McAdoo": 78271, "Rick Barry": 76375, "Walt Frazier": 77105,
  "Nate Archibald": 76098, "Dave Cowens": 76820, "Elvin Hayes": 77329,
  "Artis Gilmore": 77204, "Kevin McHale": 78334, "Robert Parish": 78434,
  "James Worthy": 79519, "Adrian Dantley": 76867, "Alex English": 77122,
  "Bernard King": 77768, "Dominique Wilkins": 79349,
  "Joe Dumars": 76998, "Tom Chambers": 76719,
  // late 80s-90s
  "Mark Price": 1005, "Glen Rice": 770, "Larry Johnson": 431, "Kevin Johnson": 437,
  "Detlef Schrempf": 284, "Sam Cassell": 188, "Jamal Mashburn": 232,
  // 2000s
  "Chauncey Billups": 1515, "Ben Wallace": 1991, "Richard Hamilton": 2006,
  "Gilbert Arenas": 2748, "Amar'e Stoudemire": 2405, "Shawn Marion": 2207,
  "Rasheed Wallace": 986, "Zach Randolph": 2760, "Tony Parker": 2225,
  "Manu Ginobili": 1938, "Pau Gasol": 2200, "Elton Brand": 1713,
  "Lamar Odom": 2199, "Peja Stojakovic": 2226, "Andrei Kirilenko": 2396,
  "Mike Bibby": 1714, "Caron Butler": 2435, "Andre Iguodala": 2738,
  "Josh Smith": 2741, "Michael Redd": 2210, "Luol Deng": 2787,
  "Stephon Marbury": 1003, "Baron Davis": 1886, "Antoine Walker": 948,
  "Ron Artest": 2223, "Carlos Boozer": 2561, "Marcus Camby": 960,
  "Steve Francis": 2037, "Antawn Jamison": 1723, "Mo Williams": 2596,
  "Vlade Divac": 234, "Ben Gordon": 2743, "Mike Miller": 2154,
  "Jamal Crawford": 2594, "Deron Williams": 101114, "Jermaine O'Neal": 1004,
  "Jason Terry": 1891, "Al Jefferson": 2744, "Tyson Chandler": 2199,
  // 2010s
  "Derrick Rose": 201565, "Marc Gasol": 201188, "Kyrie Irving": 202681,
  "Paul George": 202331, "Kevin Love": 201567, "LaMarcus Aldridge": 200746,
  "DeMar DeRozan": 201942, "Kemba Walker": 202689, "Devin Booker": 1626164,
  "Bradley Beal": 203078, "Rudy Gobert": 203497, "Khris Middleton": 203114,
  "Zach LaVine": 203897, "Donovan Mitchell": 1628378, "De'Aaron Fox": 1628368,
  "Karl-Anthony Towns": 1626157, "Trae Young": 1629027, "Bam Adebayo": 1628389,
  "Jimmy Butler": 202710, "Tobias Harris": 202699, "CJ McCollum": 203468,
  "Jamal Murray": 1627750, "Brandon Ingram": 1627742, "LaMelo Ball": 1630163,
  "Jaylen Brown": 1627759, "Ben Simmons": 1627732, "Kristaps Porzingis": 204001,
  "D'Angelo Russell": 1626156, "Harrison Barnes": 203084, "Mike Conley": 200765,
  "Goran Dragic": 201609, "Brook Lopez": 201572, "Serge Ibaka": 201586,
  "Nicolas Batum": 201587, "Eric Gordon": 201569, "Nikola Vucevic": 202696,
  "Dillon Brooks": 1628374, "OG Anunoby": 1628384, "Josh Hart": 1628404,
  "Jordan Poole": 1629673, "Norman Powell": 1626181, "Kyle Lowry": 200768,
  "Myles Turner": 1626167, "Jaren Jackson Jr.": 1628991,
  // 2020s
  "Ja Morant": 1629630, "Shai Gilgeous-Alexander": 1628983, "Anthony Edwards": 1630162,
  "Victor Wembanyama": 1641705, "Tyrese Haliburton": 1630169, "Cade Cunningham": 1630595,
  "Evan Mobley": 1630596, "Paolo Banchero": 1631094, "Franz Wagner": 1630532,
  "Scottie Barnes": 1630567, "Andrew Wiggins": 203952, "Miles Bridges": 1628998,
  "Jordan Clarkson": 203903, "Marcus Smart": 203935, "Alperen Sengun": 1630578,
  "Jalen Brunson": 1628386, "Chet Holmgren": 1631096, "Scoot Henderson": 1631105,
  "Carmelo Anthony": 2546, "Joe Johnson": 2207, "DeMarcus Cousins": 202326,
  "John Wall": 202322, "Gordon Hayward": 202330, "Paul Millsap": 200794,
  "Al Horford": 201143, "Andre Drummond": 203083, "Tyreke Evans": 202323,
  "Isaiah Thomas": 202738, "Deandre Ayton": 1629028, "Mikal Bridges": 1628969,
  "Bogdan Bogdanovic": 203992, "Spencer Dinwiddie": 203915, "Dejounte Murray": 1627750,
  "Darius Garland": 1629636, "Immanuel Quickley": 1630193, "Jalen Green": 1630224,
  "Keegan Murray": 1631099, "Jabari Smith Jr.": 1631100, "Walker Kessler": 1631119,
  "Bennedict Mathurin": 1631101, "Jeremy Sochan": 1631103, "Jalen Williams": 1631114,
  "Luguentz Dort": 1629057, "Josh Giddey": 1630581, "Alex Sarr": 1642357,
  "Donovan Clingan": 1641741, "Stephon Castle": 1641750, "Nick Van Exel": 980,
  "Mookie Blaylock": 785, "Chris Mullin": 294,
}

function eraLabel(y: number): string {
  if (y < 1990) return '80s'
  if (y < 2000) return '90s'
  if (y < 2010) return '2000s'
  if (y < 2020) return '2010s'
  return '2020s'
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[.''']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Build base players without similar field
const base = ROWS.map((r, i): Omit<Player, 'similar'> => {
  const [name, pos, year, team, ppg, rpg, apg, fg, tp, ft, per, ws, bpm, allstar, mvp, rings] = r
  const sal = SAL[name]
  const salary = sal ? sal[0] : 10
  const expected = sal ? sal[1] : 10
  const ratio = salary / expected
  const category: 'under' | 'over' | 'fair' = ratio < 0.82 ? 'under' : (ratio > 1.18 ? 'over' : 'fair')
  const nid = NBA_ID[name]
  const birthYear = year - 25
  return {
    id: i, name, pos, year, team, ppg, rpg, apg, fg, tp, ft, per, ws, bpm,
    allstar, mvp, rings, salary, expected,
    delta: salary - expected,
    category, era: eraLabel(year), birthYear,
    nbaId: nid,
    photoUrl: nid ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${nid}.png` : undefined,
    profileUrl: nid ? `https://www.nba.com/player/${nid}/${slug(name)}` : undefined,
    added: false,
  }
})

// Compute similar players by normalized stat vector (ppg, rpg, apg, per, ws, bpm)
const FEATS = ['ppg', 'rpg', 'apg', 'per', 'ws', 'bpm'] as const
type FeatsKey = typeof FEATS[number]
const ranges: Record<FeatsKey, [number, number]> = {} as Record<FeatsKey, [number, number]>
for (const f of FEATS) {
  const vals = base.map(p => p[f as keyof typeof p] as number)
  ranges[f] = [Math.min(...vals), Math.max(...vals)]
}
function vec(p: Omit<Player, 'similar'>): number[] {
  return FEATS.map(f => {
    const r = ranges[f]
    return ((p[f as keyof typeof p] as number) - r[0]) / (r[1] - r[0] || 1)
  })
}
const vecs = base.map(vec)

export const NBA_PLAYERS: Player[] = base.map((p, i) => {
  const dists = base.map((_, j) => {
    if (i === j) return { id: j, d: Infinity }
    let s = 0
    for (let k = 0; k < FEATS.length; k++) {
      const d = vecs[i][k] - vecs[j][k]
      s += d * d
    }
    return { id: j, d: s }
  })
  dists.sort((a, b) => a.d - b.d)
  return { ...p, similar: dists.slice(0, 5).map(x => x.id) }
})
