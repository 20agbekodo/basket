#!/usr/bin/env node
/**
 * Generate demo players.json and model.json using pure JS (no Python deps needed).
 * Run: node data/generate_demo.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/data');

const CURRENT_CAP_USD = 136_021_000;
const ERA_MIN = 1946, ERA_MAX = 2025;

const SALARY_CAP = {
  1985:3600000,1986:4233000,1987:4945000,1988:6164000,1989:7232000,
  1990:9802000,1991:11871000,1992:12500000,1993:14000000,1994:15175000,
  1995:15964000,1996:23000000,1997:24363000,1998:26900000,1999:30000000,
  2000:34000000,2001:35500000,2002:42500000,2003:40271000,2004:43870000,
  2005:43870000,2006:49500000,2007:53135000,2008:55630000,2009:58680000,
  2010:57700000,2011:58000000,2012:58000000,2013:58044000,2014:58679000,
  2015:63065000,2016:70000000,2017:94143000,2018:99093000,2019:101869000,
  2020:109140000,2021:109140000,2022:112414000,2023:123655000,2024:136021000,
  2025:140588000,
};

const CPI = {
  1947:14.0,1950:13.7,1955:12.4,1957:11.7,1960:11.2,1962:11.0,1963:10.8,
  1964:10.7,1965:10.5,1966:10.2,1967:9.9,1968:9.5,1969:9.0,1970:8.5,
  1971:8.2,1972:7.9,1973:7.5,1974:6.7,1975:6.1,1976:5.9,1977:5.5,
  1978:5.1,1979:4.6,1980:4.0,1981:3.6,1982:3.4,1983:3.3,1984:3.2,
};

const FEATURE_NAMES = [
  'salary_pct','ppg','rpg','apg','fg_pct','three_pct','ft_pct',
  'per','ws','bpm','is_pg','is_sg','is_sf','is_pf','is_c','era_norm','achievements',
];

// name, nbaId, pos, era, ppg, rpg, apg, fg%, 3p%, ft%, per, ws, bpm, salUSD, allStar, allNBA, mvp, rings, team
const PLAYERS = [
  ["Michael Jordan","893","SG",1996,30.1,6.6,5.9,.497,.000,.835,29.0,21.2,9.9,33000000,14,10,5,6,"CHI"],
  ["LeBron James","2544","SF",2013,27.1,7.9,7.2,.565,.401,.753,31.6,20.1,8.6,30013200,20,13,4,4,"MIA"],
  ["Kareem Abdul-Jabbar","76003","C",1972,34.8,17.5,4.6,.574,.000,.673,37.1,25.4,10.8,1000000,19,15,6,6,"MIL"],
  ["Magic Johnson","77142","PG",1990,22.3,6.6,11.9,.520,.196,.837,27.2,18.7,6.9,3000000,12,9,3,5,"LAL"],
  ["Larry Bird","1449","SF",1988,28.1,9.5,6.8,.527,.414,.886,29.4,21.0,8.6,2000000,12,9,3,3,"BOS"],
  ["Wilt Chamberlain","76375","C",1962,50.4,25.7,2.4,.506,.000,.613,43.7,29.1,11.8,250000,13,10,1,2,"PHW"],
  ["Bill Russell","77427","C",1965,14.1,24.1,4.3,.430,.000,.600,21.4,21.5,8.6,100001,12,3,0,11,"BOS"],
  ["Shaquille O'Neal","406","C",2000,29.7,13.6,3.8,.574,.000,.524,32.1,15.8,8.6,17100000,15,8,1,4,"LAL"],
  ["Tim Duncan","1495","PF",2003,23.3,12.9,3.9,.513,.000,.710,29.7,21.2,7.6,14720000,15,13,2,5,"SAS"],
  ["Kobe Bryant","977","SG",2006,35.4,5.3,4.5,.450,.347,.850,28.0,12.3,6.9,17918000,18,11,1,5,"LAL"],
  ["Oscar Robertson","77404","PG",1964,31.4,9.9,11.4,.485,.000,.853,30.7,19.9,8.4,100000,12,9,1,1,"CIN"],
  ["Jerry West","78497","PG",1970,31.2,4.6,7.5,.477,.000,.826,28.3,15.6,7.4,280000,14,12,0,1,"LAL"],
  ["Elgin Baylor","76085","SF",1963,38.3,18.6,4.6,.449,.000,.799,30.8,17.9,8.8,150000,11,10,0,0,"LAL"],
  ["Julius Erving","77220","SF",1982,24.4,6.8,3.7,.490,.000,.796,25.2,14.5,6.4,2000000,11,5,0,1,"PHI"],
  ["Moses Malone","77398","C",1983,24.5,15.3,1.3,.501,.000,.760,27.4,17.0,6.9,2000000,12,4,3,1,"PHI"],
  ["Kevin Durant","201142","SF",2014,32.0,7.4,5.5,.503,.391,.873,30.0,19.2,8.1,17832627,13,10,1,2,"OKC"],
  ["Stephen Curry","201939","PG",2016,30.1,5.4,6.7,.504,.454,.908,31.5,17.3,9.3,11370786,8,5,2,4,"GSW"],
  ["Giannis Antetokounmpo","203507","PF",2020,29.5,13.6,5.6,.553,.304,.633,30.8,12.9,8.8,24157304,8,5,2,1,"MIL"],
  ["Nikola Jokic","203999","C",2022,27.1,13.8,7.9,.581,.339,.810,37.3,16.5,12.3,29580120,7,4,3,1,"DEN"],
  ["Joel Embiid","203954","C",2023,33.1,10.2,4.2,.530,.330,.857,34.3,13.8,9.6,33616770,8,4,1,0,"PHI"],
  ["Luka Doncic","1629029","PG",2022,28.4,9.1,8.7,.460,.353,.733,31.2,12.6,8.5,37096500,6,3,0,0,"DAL"],
  ["Kawhi Leonard","202695","SF",2017,25.5,5.8,3.4,.488,.381,.880,26.6,14.2,7.1,21962579,6,5,0,2,"SAS"],
  ["Damian Lillard","203081","PG",2021,28.8,4.2,7.5,.451,.390,.929,26.2,10.2,7.5,29802321,7,2,0,0,"POR"],
  ["Anthony Davis","203076","PF",2020,26.7,9.7,3.5,.532,.330,.851,30.3,12.8,7.6,27093019,8,3,0,1,"LAL"],
  ["James Harden","201935","SG",2019,36.1,6.6,7.5,.442,.367,.877,30.6,13.5,7.7,30421854,10,7,1,1,"HOU"],
  ["Charles Barkley","76030","PF",1993,25.6,12.2,5.1,.520,.310,.765,27.3,15.9,8.3,4000000,11,5,1,0,"PHO"],
  ["Patrick Ewing","77220","C",1990,28.6,10.9,2.4,.514,.000,.749,26.8,12.4,6.6,4000000,11,3,0,0,"NYK"],
  ["Hakeem Olajuwon","165","C",1994,27.3,11.9,3.6,.528,.000,.716,29.4,15.9,8.4,7500000,12,6,1,2,"HOU"],
  ["David Robinson","195","C",1994,29.8,10.7,4.8,.507,.000,.748,31.7,18.7,9.2,4500000,10,8,1,2,"SAS"],
  ["Karl Malone","252","PF",1997,27.4,9.9,4.5,.536,.000,.729,28.4,17.5,7.2,4800000,14,11,2,0,"UTA"],
  ["John Stockton","314","PG",1994,17.0,3.1,12.6,.519,.390,.839,21.4,15.6,7.6,3300000,10,5,0,0,"UTA"],
  ["Clyde Drexler","76656","SG",1992,25.0,6.9,6.6,.488,.282,.780,23.7,14.8,5.2,3200000,10,4,0,1,"POR"],
  ["Scottie Pippen","294","SF",1994,22.0,8.7,5.6,.485,.303,.698,22.2,14.3,6.0,2775000,6,7,0,6,"CHI"],
  ["Gary Payton","288","PG",2000,24.2,4.7,8.9,.479,.288,.716,22.3,13.6,5.2,14000000,9,5,0,1,"SEA"],
  ["Jason Kidd","101108","PG",2002,14.7,7.3,9.9,.415,.348,.783,20.8,14.2,6.3,14000000,10,5,0,1,"NJN"],
  ["Allen Iverson","947","PG",2001,31.1,3.8,4.6,.420,.315,.814,27.7,8.3,6.0,11500000,11,4,1,0,"PHI"],
  ["Dirk Nowitzki","1717","PF",2007,24.6,8.9,3.4,.476,.416,.905,26.1,14.6,7.1,16800000,14,12,1,1,"DAL"],
  ["Dwyane Wade","2548","SG",2009,30.2,5.0,7.5,.491,.300,.762,28.2,12.8,5.8,15050000,13,8,0,3,"MIA"],
  ["Chris Paul","101108","PG",2009,22.8,5.5,11.0,.523,.375,.868,29.5,20.1,10.0,14940153,12,7,0,0,"NOH"],
  ["Kevin Garnett","708","PF",2004,24.2,13.9,5.0,.499,.000,.731,28.0,18.8,7.8,28000000,15,12,1,1,"MIN"],
  ["Carmelo Anthony","2546","SF",2013,28.7,6.9,2.6,.449,.379,.821,23.5,8.8,4.2,22458400,10,6,0,0,"NYK"],
  ["Steve Nash","959","PG",2006,18.8,4.2,10.5,.512,.439,.921,22.9,15.2,8.2,9000000,8,3,2,0,"PHO"],
  ["Russell Westbrook","201566","PG",2017,31.6,10.7,10.4,.425,.293,.845,29.0,12.5,6.7,26540100,9,5,1,0,"OKC"],
  ["Paul George","202331","SF",2019,28.0,8.2,4.1,.470,.386,.845,24.1,11.4,5.3,30560700,9,5,0,0,"OKC"],
  ["Kyrie Irving","202681","PG",2016,25.2,3.7,5.8,.470,.403,.901,23.9,8.7,5.2,19823000,7,3,0,1,"CLE"],
  ["Dwight Howard","2730","C",2009,20.6,13.8,1.4,.572,.000,.590,28.5,15.1,7.6,15015000,8,3,0,1,"ORL"],
  ["Blake Griffin","201933","PF",2014,24.1,9.5,4.0,.520,.232,.703,24.3,9.1,4.3,18955100,6,2,0,0,"LAC"],
  ["Tony Parker","2225","PG",2013,20.3,2.9,7.6,.516,.316,.778,21.8,9.4,4.7,12500000,6,4,0,4,"SAS"],
  ["Paul Pierce","1718","SF",2002,26.1,6.4,3.2,.449,.370,.854,22.3,9.1,4.9,13500000,10,1,0,1,"BOS"],
  ["Vince Carter","1713","SG",2001,27.6,5.5,4.1,.441,.381,.801,23.8,9.4,4.5,8900000,8,1,0,0,"TOR"],
  ["Tracy McGrady","1503","SF",2003,32.1,6.5,5.5,.457,.367,.797,29.3,11.6,6.4,14625000,7,4,0,0,"ORL"],
  ["Jayson Tatum","1628369","SF",2023,30.1,8.8,4.6,.466,.352,.853,26.5,10.1,6.4,32600060,6,4,0,1,"BOS"],
  ["Jimmy Butler","202710","SF",2020,19.9,6.7,6.0,.454,.243,.834,22.1,10.8,5.4,34380000,5,5,0,0,"MIA"],
  ["Devin Booker","1626164","SG",2022,26.8,5.0,4.8,.466,.351,.857,21.5,7.6,4.0,33000000,3,1,0,0,"PHO"],
  ["Donovan Mitchell","1628378","SG",2022,25.9,4.2,4.2,.444,.362,.841,21.5,7.0,3.8,30358440,3,1,0,0,"UTA"],
  ["Trae Young","1629027","PG",2022,28.4,3.7,9.7,.435,.360,.885,23.5,8.0,4.9,28000000,3,1,0,0,"ATL"],
  ["Ja Morant","1629630","PG",2022,27.4,5.7,6.7,.496,.343,.766,27.7,7.4,5.2,33142920,2,1,0,0,"MEM"],
  ["Shai Gilgeous-Alexander","1628983","SG",2023,31.4,4.8,6.2,.508,.351,.874,29.4,11.5,7.2,30913750,3,1,0,0,"OKC"],
  ["Anthony Edwards","1630162","SG",2023,24.6,5.4,4.4,.461,.361,.826,20.1,6.1,2.3,10174854,1,0,0,0,"MIN"],
  ["Zion Williamson","1629627","PF",2023,26.0,7.0,4.6,.600,.000,.690,26.0,7.0,5.3,31625000,2,1,0,0,"NOP"],
  ["Karl-Anthony Towns","1626157","C",2019,26.0,12.4,4.1,.526,.405,.828,28.0,10.7,6.2,29000000,3,1,0,0,"MIN"],
  ["Nikola Vucevic","203016","C",2021,24.5,11.8,3.8,.490,.334,.786,21.6,7.9,2.6,24000000,2,0,0,0,"CHI"],
  ["Rudy Gobert","203497","C",2022,15.6,14.7,1.1,.715,.000,.643,24.0,11.3,4.3,25000000,4,3,0,0,"UTA"],
  ["Khris Middleton","203114","SF",2021,20.4,6.0,5.4,.499,.417,.870,18.4,7.3,3.5,33000000,3,1,0,1,"MIL"],
  ["Pascal Siakam","1627783","PF",2020,22.9,7.3,3.5,.480,.359,.806,21.0,8.8,3.0,33000000,2,1,0,1,"TOR"],
  ["Bam Adebayo","1628389","C",2023,20.4,9.7,3.2,.532,.000,.733,20.1,7.9,2.4,32600060,3,1,0,0,"MIA"],
  ["Draymond Green","203110","PF",2016,14.0,9.5,7.4,.450,.310,.710,23.8,14.1,8.6,15330435,4,1,0,4,"GSW"],
  ["Klay Thompson","202691","SG",2016,22.3,3.8,2.1,.474,.424,.842,18.3,7.2,1.8,15501000,5,2,0,4,"GSW"],
  ["Kyle Lowry","200768","PG",2016,21.2,4.7,6.4,.429,.386,.871,20.5,9.4,4.8,12000000,6,1,0,1,"TOR"],
  ["Chris Bosh","2547","PF",2011,18.7,8.3,1.5,.481,.294,.798,20.8,10.4,3.5,14500000,11,2,0,2,"MIA"],
  ["Kevin McHale","77286","PF",1988,22.4,8.0,2.1,.604,.000,.836,24.4,14.5,5.7,1700000,7,6,0,3,"BOS"],
  ["John Havlicek","76994","SF",1972,27.5,7.1,7.5,.451,.000,.819,22.4,14.4,5.3,210000,13,8,0,8,"BOS"],
  ["Dennis Rodman","79453","PF",1996,5.7,14.9,2.5,.487,.201,.534,18.4,11.9,3.9,9000000,2,2,0,5,"CHI"],
  ["Isiah Thomas","78477","PG",1987,20.6,3.8,10.0,.456,.294,.780,22.6,10.5,5.7,1200000,12,5,0,2,"DET"],
  ["Walt Frazier","78241","PG",1975,19.9,6.1,6.9,.484,.000,.791,22.2,10.1,6.9,400000,7,5,0,2,"NYK"],
  ["Bob Pettit","77843","PF",1962,31.1,20.3,3.0,.437,.000,.771,28.6,16.3,8.1,75000,11,9,0,0,"STL"],
  ["Elvin Hayes","77121","PF",1975,23.5,14.9,1.6,.477,.000,.685,22.2,12.7,5.9,400000,12,3,0,0,"WSB"],
  ["Willis Reed","77401","C",1971,20.7,13.9,2.0,.495,.000,.746,22.9,12.8,5.7,250000,7,4,0,2,"NYK"],
  ["Pete Maravich","77455","PG",1977,31.1,5.1,5.4,.441,.000,.823,25.1,9.5,7.4,600000,5,1,0,0,"NOR"],
  ["Bob Cousy","76397","PG",1957,20.6,5.2,8.5,.378,.000,.805,21.8,12.4,6.1,25000,13,7,0,6,"BOS"],
  ["Bill Walton","78269","C",1978,18.9,13.2,5.0,.522,.000,.633,26.3,15.2,9.1,750000,2,1,0,2,"POR"],
  ["Alonzo Mourning","272","C",1999,20.1,10.3,1.7,.532,.000,.704,26.3,11.6,7.4,15000000,7,4,0,1,"MIA"],
  ["Dikembe Mutombo","76989","C",1998,11.4,11.8,1.2,.530,.000,.611,21.5,12.5,5.1,14500000,8,1,0,0,"ATL"],
  ["Robert Parish","78083","C",1984,19.0,10.6,2.1,.548,.000,.733,20.5,11.6,4.5,1400000,9,1,0,3,"BOS"],
  ["Pau Gasol","2200","PF",2008,18.8,9.8,3.8,.517,.000,.748,22.4,12.8,5.2,14703000,6,2,0,2,"LAL"],
  ["Ray Allen","951","SG",2005,22.0,4.2,3.7,.454,.415,.909,18.2,8.9,3.2,14000000,10,2,0,2,"SEA"],
  ["Reggie Miller","259","SG",1998,19.6,3.1,3.0,.440,.400,.886,17.8,7.4,2.8,7500000,5,1,0,0,"IND"],
  ["Manu Ginobili","1938","SG",2008,19.5,4.7,4.7,.470,.387,.846,23.3,9.8,6.2,9400000,2,0,0,4,"SAS"],
  ["Victor Wembanyama","1641705","C",2024,21.4,10.6,3.9,.465,.321,.793,27.0,9.5,6.8,12161160,1,1,0,0,"SAS"],
  ["Anthony Edwards","1630162","SG",2024,25.9,5.4,5.1,.461,.361,.826,22.0,7.5,3.4,26034026,2,0,0,0,"MIN"],
  ["Chet Holmgren","1631096","C",2024,16.5,7.9,2.4,.530,.350,.845,21.0,7.0,4.5,10770000,0,0,0,0,"OKC"],
  ["Paolo Banchero","1631094","PF",2023,20.0,6.9,3.7,.430,.300,.770,18.5,4.2,1.2,10239435,1,0,0,0,"ORL"],
  ["Evan Mobley","1630596","C",2023,15.7,8.3,2.5,.528,.319,.629,18.0,6.4,2.4,7726680,1,0,0,0,"CLE"],
  ["Jamal Murray","1627750","PG",2020,21.2,4.0,4.8,.485,.408,.869,19.5,6.2,2.9,31650000,0,0,0,1,"DEN"],
  ["Jrue Holiday","201950","PG",2021,17.7,5.4,6.1,.503,.395,.730,20.5,8.7,4.9,27000000,1,0,0,1,"MIL"],
  ["Fred VanVleet","1627832","PG",2021,20.3,4.4,6.3,.419,.378,.880,16.2,6.4,2.8,21875000,1,0,0,1,"TOR"],
  ["Andrew Wiggins","203952","SF",2022,17.2,4.5,2.3,.463,.396,.688,13.1,2.8,0.6,29542880,1,0,0,1,"GSW"],
  ["LaMarcus Aldridge","200746","PF",2018,23.1,8.8,2.3,.488,.278,.828,21.8,9.6,3.7,21500000,7,2,0,0,"SAS"],
  ["Dave Cowens","76560","C",1976,20.4,15.7,4.0,.458,.000,.797,22.2,14.7,7.0,400000,8,3,0,2,"BOS"],
  ["Nate Archibald","76023","PG",1976,23.6,4.3,8.4,.461,.000,.771,22.8,10.1,7.2,380000,6,4,0,1,"KCK"],
  ["James Worthy","78563","SF",1990,21.4,5.0,3.0,.521,.000,.765,20.4,9.8,3.3,2200000,7,3,0,3,"LAL"],
];

// ---- Math helpers ----

function dot(a, b) {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s;
}

function matMul(A, B) { // A: m×k, B: k×n → m×n
  const m = A.length, k = A[0].length, n = B[0].length;
  const C = Array.from({length: m}, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let l = 0; l < k; l++) C[i][j] += A[i][l] * B[l][j];
  return C;
}

function transpose(M) {
  return M[0].map((_, j) => M.map(row => row[j]));
}

// Power-iteration SVD for top-3 principal components
function simplePCA(X, nComp = 3) {
  const n = X.length, p = X[0].length;
  // Covariance matrix (p×p)
  const cov = Array.from({length: p}, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < p; k++)
        cov[j][k] += X[i][j] * X[i][k];
  for (let j = 0; j < p; j++)
    for (let k = 0; k < p; k++)
      cov[j][k] /= n;

  // Deflation: find top nComp eigenvectors
  const components = [];
  let C = cov.map(r => [...r]);
  for (let c = 0; c < nComp; c++) {
    let v = new Array(p).fill(1 / Math.sqrt(p));
    for (let iter = 0; iter < 200; iter++) {
      const Cv = C.map(row => dot(row, v));
      const norm = Math.sqrt(dot(Cv, Cv));
      v = Cv.map(x => x / norm);
    }
    components.push([...v]);
    // Deflate
    for (let j = 0; j < p; j++)
      for (let k = 0; k < p; k++)
        C[j][k] -= v[j] * v[k] * (dot(C[j], v));
  }
  // Project: coords[i][c] = dot(X[i], components[c])
  const coords = X.map(row => components.map(comp => dot(row, comp)));
  return { components, coords };
}

// Ridge regression: (XtX + αI)^-1 Xt y  (Cholesky-free, small p)
function ridge(X, y, alpha = 1.0) {
  const n = X.length, p = X[0].length;
  // XtX
  const XtX = Array.from({length: p}, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < p; k++) XtX[j][k] += X[i][j] * X[i][k];
    }
  }
  // Add ridge penalty
  for (let j = 0; j < p; j++) XtX[j][j] += alpha;
  // Solve via Gaussian elimination
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let col = 0; col < p; col++) {
    let maxRow = col;
    for (let row = col + 1; row < p; row++)
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = col; j <= p; j++) A[col][j] /= pivot;
    for (let row = 0; row < p; row++) {
      if (row === col) continue;
      const f = A[row][col];
      for (let j = col; j <= p; j++) A[row][j] -= f * A[col][j];
    }
  }
  const coef = A.map(r => r[p]);
  const pred = X.map(row => dot(row, coef));
  const resid = y.reduce((s, yi, i) => s + (yi - pred[i]) ** 2, 0);
  const rmse = Math.sqrt(resid / n);
  return { coef, intercept: 0, pred, rmse };
}

// ---- Feature helpers ----

function closestCap(season) {
  if (SALARY_CAP[season]) return SALARY_CAP[season];
  const years = Object.keys(SALARY_CAP).map(Number);
  return SALARY_CAP[years.reduce((a, b) => Math.abs(b - season) < Math.abs(a - season) ? b : a)];
}

function salaryPct(salUSD, season) {
  if (season >= 1985) return salUSD / closestCap(season);
  const years = Object.keys(CPI).map(Number);
  const yr = years.reduce((a, b) => Math.abs(b - season) < Math.abs(a - season) ? b : a);
  return salUSD * CPI[yr] / 10_000_000;
}

function eraFeat(season) { return (season - ERA_MIN) / (ERA_MAX - ERA_MIN); }

function posOneHot(pos) {
  const order = ['PG','SG','SF','PF','C'];
  return order.map(p => p === pos ? 1 : 0);
}

function achievementScore(allStar, allNBA, mvp, rings) {
  return Math.min(allStar * 0.10 + allNBA * 0.15 + mvp * 0.50 + rings * 0.30, 1.0);
}

function buildFeatureVec(p) {
  const [,, pos, era, ppg, rpg, apg, fg, tp, ft, per, ws, bpm, sal, allStar, allNBA, mvp, rings] = p;
  const sp = salaryPct(sal, era);
  const en = eraFeat(era);
  const oh = posOneHot(pos);
  const ach = achievementScore(allStar, allNBA, mvp, rings);
  return [sp, ppg, rpg, apg, fg, tp, ft, per, ws, bpm, ...oh, en, ach];
}

// ---- Main ----

mkdirSync(OUT_DIR, { recursive: true });

const n = PLAYERS.length;
const rawFeatures = PLAYERS.map(buildFeatureVec);
const salaryPcts = rawFeatures.map(r => r[0]);

// Z-score normalize
const p = FEATURE_NAMES.length;
const means = new Array(p).fill(0);
const stds  = new Array(p).fill(0);
for (const row of rawFeatures) row.forEach((v, j) => { means[j] += v; });
means.forEach((_, j) => { means[j] /= n; });
for (const row of rawFeatures) row.forEach((v, j) => { stds[j] += (v - means[j]) ** 2; });
stds.forEach((_, j) => { stds[j] = Math.sqrt(stds[j] / n) || 1; });

const WEIGHTS = { salary_pct:1.5, ppg:1.3, achievements:1.5, per:1.2 };
const wArr = FEATURE_NAMES.map(f => WEIGHTS[f] ?? 1.0);

const Xnorm = rawFeatures.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
const Xw    = Xnorm.map(row => row.map((v, j) => v * wArr[j]));

// PCA
console.log('Running PCA...');
const { components, coords } = simplePCA(Xw, 3);
const ev = components.map(comp => {
  const projected = Xw.map(row => dot(row, comp));
  const variance = projected.reduce((s, v) => s + v * v, 0) / n;
  return variance;
});
const totalVar = Xw.flat().reduce((s, v) => s + v * v, 0) / n / p;
console.log(`PCA explained variance approx: ${ev.map(v => (v / (totalVar * p)).toFixed(3)).join(' + ')}`);

// KNN (k=10)
console.log('Building KNN graph...');
const K = 10;
const neighborsFlat = [];
for (let i = 0; i < n; i++) {
  const dists = Xnorm.map((row, j) => ({ j, d: row.reduce((s, v, k) => s + (v - Xnorm[i][k]) ** 2, 0) }));
  dists.sort((a, b) => a.d - b.d);
  const nbrs = dists.slice(1, K + 1).map(x => x.j);
  neighborsFlat.push(...nbrs);
}

// Ridge regression models
const modelSpecs = {
  fullModel:     FEATURE_NAMES,
  scoringModel:  ['ppg','fg_pct','three_pct','ft_pct','is_pg','is_sg','is_sf','is_pf','is_c','era_norm'],
  physicalModel: ['is_pg','is_sg','is_sf','is_pf','is_c','era_norm'],
};

const models = {};
for (const [mname, feats] of Object.entries(modelSpecs)) {
  const idxs = feats.map(f => FEATURE_NAMES.indexOf(f));
  const Xsub = Xnorm.map(row => idxs.map(i => row[i]));
  const res = ridge(Xsub, salaryPcts);
  models[mname] = { featureNames: feats, coefficients: res.coef, intercept: 0, rmse: res.rmse };
  console.log(`  ${mname} RMSE=${res.rmse.toFixed(4)}`);
}

// Salary delta
const fullIdxs = FEATURE_NAMES.map((_, i) => i);
const Xfull = Xnorm.map(row => fullIdxs.map(i => row[i]));
const fullRes = ridge(Xfull, salaryPcts);
const salaryDelta = salaryPcts.map((sp, i) => (sp - fullRes.pred[i]) * CURRENT_CAP_USD);

// Era cap table
const eraNormTable = Object.entries(SALARY_CAP)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([s, c]) => ({ season: Number(s), capUsd: c }));

// Build output
const players = {
  ids:          PLAYERS.map((_, i) => String(i)),
  names:        PLAYERS.map(p => p[0]),
  x:            coords.map(c => Math.round(c[0] * 10000) / 10000),
  y:            coords.map(c => Math.round(c[1] * 10000) / 10000),
  z:            coords.map(c => Math.round(c[2] * 10000) / 10000),
  salaryBest:   PLAYERS.map(p => p[13]),
  salaryDelta:  salaryDelta.map(v => Math.round(v * 100) / 100),
  salaryPct:    salaryPcts.map(v => Math.round(v * 1000000) / 1000000),
  position:     PLAYERS.map(p => p[2]),
  era:          PLAYERS.map(p => p[3]),
  team:         PLAYERS.map(p => p[18]),
  ppg:          PLAYERS.map(p => p[4]),
  rpg:          PLAYERS.map(p => p[5]),
  apg:          PLAYERS.map(p => p[6]),
  fgPct:        PLAYERS.map(p => p[7]),
  threePct:     PLAYERS.map(p => p[8]),
  ftPct:        PLAYERS.map(p => p[9]),
  per:          PLAYERS.map(p => p[10]),
  ws:           PLAYERS.map(p => p[11]),
  bpm:          PLAYERS.map(p => p[12]),
  achievements: PLAYERS.map(p => Math.round(achievementScore(p[14], p[15], p[16], p[17]) * 10000) / 10000),
  allStarCount: PLAYERS.map(p => p[14]),
  mvpCount:     PLAYERS.map(p => p[16]),
  rings:        PLAYERS.map(p => p[17]),
  neighbors:    neighborsFlat,
  atlasIndex:   new Array(n).fill(0),
  atlasUvX:     new Array(n).fill(0),
  atlasUvY:     new Array(n).fill(0),
  atlasUvW:     new Array(n).fill(0),
  atlasUvH:     new Array(n).fill(0),
  nbaId:        PLAYERS.map(p => p[1]),
};

const model = {
  pcaW:              components,
  pcaMean:           means,
  pcaStd:            stds,
  featureNames:      FEATURE_NAMES,
  fullModel:         { featureNames: models.fullModel.featureNames, coefficients: models.fullModel.coefficients, intercept: 0 },
  scoringModel:      { featureNames: models.scoringModel.featureNames, coefficients: models.scoringModel.coefficients, intercept: 0 },
  physicalModel:     { featureNames: models.physicalModel.featureNames, coefficients: models.physicalModel.coefficients, intercept: 0 },
  eraNormTable,
  currentCapUsd:     CURRENT_CAP_USD,
  rmseFullModel:     models.fullModel.rmse,
  rmseScoringModel:  models.scoringModel.rmse,
  rmsePhysicalModel: models.physicalModel.rmse,
};

const playersPath = `${OUT_DIR}/players.json`;
const modelPath   = `${OUT_DIR}/model.json`;
writeFileSync(playersPath, JSON.stringify(players));
writeFileSync(modelPath,   JSON.stringify(model, null, 2));
console.log(`\nWrote ${playersPath} (${Math.round(JSON.stringify(players).length / 1024)} KB)`);
console.log(`Wrote ${modelPath}`);
