#!/usr/bin/env python3
"""
Generate demo players.json and model.json from hardcoded famous NBA player data.
Outputs to ../public/data/  (same location as the real pipeline).

Usage:
    cd data && python3 generate_demo.py
"""

import json
import math
import numpy as np
from pathlib import Path
from sklearn.decomposition import PCA
from sklearn.linear_model import Ridge
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import mean_squared_error

CURRENT_CAP_USD = 136_021_000
ERA_MIN = 1946
ERA_MAX = 2025

SALARY_CAP = {
    1985: 3_600_000, 1986: 4_233_000, 1987: 4_945_000, 1988: 6_164_000,
    1989: 7_232_000, 1990: 9_802_000, 1991: 11_871_000, 1992: 12_500_000,
    1993: 14_000_000, 1994: 15_175_000, 1995: 15_964_000, 1996: 23_000_000,
    1997: 24_363_000, 1998: 26_900_000, 1999: 30_000_000, 2000: 34_000_000,
    2001: 35_500_000, 2002: 42_500_000, 2003: 40_271_000, 2004: 43_870_000,
    2005: 43_870_000, 2006: 49_500_000, 2007: 53_135_000, 2008: 55_630_000,
    2009: 58_680_000, 2010: 57_700_000, 2011: 58_000_000, 2012: 58_000_000,
    2013: 58_044_000, 2014: 58_679_000, 2015: 63_065_000, 2016: 70_000_000,
    2017: 94_143_000, 2018: 99_093_000, 2019: 101_869_000, 2020: 109_140_000,
    2021: 109_140_000, 2022: 112_414_000, 2023: 123_655_000, 2024: 136_021_000,
    2025: 140_588_000,
}

CPI_FACTORS = {
    1947: 14.0, 1950: 13.7, 1955: 12.4, 1957: 11.7, 1960: 11.2,
    1962: 11.0, 1963: 10.8, 1964: 10.7, 1965: 10.5, 1966: 10.2,
    1967: 9.9,  1968: 9.5,  1969: 9.0,  1970: 8.5,  1971: 8.2,
    1972: 7.9,  1973: 7.5,  1974: 6.7,  1975: 6.1,  1976: 5.9,
    1977: 5.5,  1978: 5.1,  1979: 4.6,  1980: 4.0,  1981: 3.6,
    1982: 3.4,  1983: 3.3,  1984: 3.2,
}

# Canonical feature order (must match frontend src/data/knn.ts and projection.ts)
FEATURE_NAMES = [
    "salary_pct", "ppg", "rpg", "apg", "fg_pct", "three_pct", "ft_pct",
    "per", "ws", "bpm", "is_pg", "is_sg", "is_sf", "is_pf", "is_c",
    "era_norm", "achievements",
]

FEATURE_WEIGHTS = {f: 1.0 for f in FEATURE_NAMES}
FEATURE_WEIGHTS["salary_pct"] = 1.5
FEATURE_WEIGHTS["ppg"] = 1.3
FEATURE_WEIGHTS["achievements"] = 1.5
FEATURE_WEIGHTS["per"] = 1.2

# (name, nba_id_or_None, position, era, ppg, rpg, apg, fg_pct, three_pct, ft_pct,
#  per, ws, bpm, salary_usd, all_star_count, all_nba_count, mvp_count, rings, team)
PLAYERS = [
    # Legends
    ("Michael Jordan",      "893",     "SG", 1996, 30.1,  6.6,  5.9, 0.497, 0.000, 0.835, 29.0, 21.2,  9.9, 33000000, 14, 10, 5, 6, "CHI"),
    ("LeBron James",        "2544",    "SF", 2013, 27.1,  7.9,  7.2, 0.565, 0.401, 0.753, 31.6, 20.1,  8.6, 30013200, 20, 13, 4, 4, "MIA"),
    ("Kareem Abdul-Jabbar", "76003",   "C",  1972, 34.8, 17.5,  4.6, 0.574, 0.000, 0.673, 37.1, 25.4, 10.8,  1000000, 19, 15, 6, 6, "MIL"),
    ("Magic Johnson",       "77142",   "PG", 1990, 22.3,  6.6, 11.9, 0.520, 0.196, 0.837, 27.2, 18.7,  6.9,  3000000, 12,  9, 3, 5, "LAL"),
    ("Larry Bird",          "1449",    "SF", 1988, 28.1,  9.5,  6.8, 0.527, 0.414, 0.886, 29.4, 21.0,  8.6,  2000000, 12,  9, 3, 3, "BOS"),
    ("Wilt Chamberlain",    "76375",   "C",  1962, 50.4, 25.7,  2.4, 0.506, 0.000, 0.613, 43.7, 29.1, 11.8,   250000, 13, 10, 1, 2, "PHW"),
    ("Bill Russell",        "77427",   "C",  1965, 14.1, 24.1,  4.3, 0.430, 0.000, 0.600, 21.4, 21.5,  8.6,   100001, 12,  3, 0,11, "BOS"),
    ("Shaquille O'Neal",    "406",     "C",  2000, 29.7, 13.6,  3.8, 0.574, 0.000, 0.524, 32.1, 15.8,  8.6, 17100000, 15,  8, 1, 4, "LAL"),
    ("Tim Duncan",          "1495",    "PF", 2003, 23.3, 12.9,  3.9, 0.513, 0.000, 0.710, 29.7, 21.2,  7.6, 14720000, 15, 13, 2, 5, "SAS"),
    ("Kobe Bryant",         "977",     "SG", 2006, 35.4,  5.3,  4.5, 0.450, 0.347, 0.850, 28.0, 12.3,  6.9, 17918000, 18, 11, 1, 5, "LAL"),
    ("Oscar Robertson",     "77404",   "PG", 1964, 31.4,  9.9, 11.4, 0.485, 0.000, 0.853, 30.7, 19.9,  8.4,   100000, 12,  9, 1, 1, "CIN"),
    ("Jerry West",          "78497",   "PG", 1970, 31.2,  4.6,  7.5, 0.477, 0.000, 0.826, 28.3, 15.6,  7.4,   280000, 14, 12, 0, 1, "LAL"),
    ("Elgin Baylor",        "76085",   "SF", 1963, 38.3, 18.6,  4.6, 0.449, 0.000, 0.799, 30.8, 17.9,  8.8,   150000, 11, 10, 0, 0, "LAL"),
    ("Julius Erving",       "77142",   "SF", 1982, 24.4,  6.8,  3.7, 0.490, 0.000, 0.796, 25.2, 14.5,  6.4,  2000000, 11,  5, 0, 1, "PHI"),
    ("Moses Malone",        "77398",   "C",  1983, 24.5, 15.3,  1.3, 0.501, 0.000, 0.760, 27.4, 17.0,  6.9,  2000000, 12,  4, 3, 1, "PHI"),
    # Modern superstars
    ("Kevin Durant",        "201142",  "SF", 2014, 32.0,  7.4,  5.5, 0.503, 0.391, 0.873, 30.0, 19.2,  8.1, 17832627, 13, 10, 1, 2, "OKC"),
    ("Stephen Curry",       "201939",  "PG", 2016, 30.1,  5.4,  6.7, 0.504, 0.454, 0.908, 31.5, 17.3,  9.3, 11370786,  8,  5, 2, 4, "GSW"),
    ("Giannis Antetokounmpo","203507", "PF", 2020, 29.5, 13.6,  5.6, 0.553, 0.304, 0.633, 30.8, 12.9,  8.8, 24157304,  8,  5, 2, 1, "MIL"),
    ("Nikola Jokic",        "203999",  "C",  2022, 27.1, 13.8,  7.9, 0.581, 0.339, 0.810, 37.3, 16.5, 12.3, 29580120,  7,  4, 3, 1, "DEN"),
    ("Joel Embiid",         "203954",  "C",  2023, 33.1, 10.2,  4.2, 0.530, 0.330, 0.857, 34.3, 13.8,  9.6, 33616770,  8,  4, 1, 0, "PHI"),
    ("Luka Doncic",         "1629029", "PG", 2022, 28.4,  9.1,  8.7, 0.460, 0.353, 0.733, 31.2, 12.6,  8.5, 37096500,  6,  3, 0, 0, "DAL"),
    ("Kawhi Leonard",       "202695",  "SF", 2017, 25.5,  5.8,  3.4, 0.488, 0.381, 0.880, 26.6, 14.2,  7.1, 21962579,  6,  5, 0, 2, "SAS"),
    ("Damian Lillard",      "203081",  "PG", 2021, 28.8,  4.2,  7.5, 0.451, 0.390, 0.929, 26.2, 10.2,  7.5, 29802321,  7,  2, 0, 0, "POR"),
    ("Anthony Davis",       "203076",  "PF", 2020, 26.7,  9.7,  3.5, 0.532, 0.330, 0.851, 30.3, 12.8,  7.6, 27093019,  8,  3, 0, 1, "LAL"),
    ("James Harden",        "201935",  "SG", 2019, 36.1,  6.6,  7.5, 0.442, 0.367, 0.877, 30.6, 13.5,  7.7, 30421854, 10,  7, 1, 1, "HOU"),
    # Classic stars
    ("Charles Barkley",     "76030",   "PF", 1993, 25.6, 12.2,  5.1, 0.520, 0.310, 0.765, 27.3, 15.9,  8.3,  4000000, 11,  5, 1, 0, "PHO"),
    ("Patrick Ewing",       "77220",   "C",  1990, 28.6, 10.9,  2.4, 0.514, 0.000, 0.749, 26.8, 12.4,  6.6,  4000000, 11,  3, 0, 0, "NYK"),
    ("Hakeem Olajuwon",     "165",     "C",  1994, 27.3, 11.9,  3.6, 0.528, 0.000, 0.716, 29.4, 15.9,  8.4,  7500000, 12,  6, 1, 2, "HOU"),
    ("David Robinson",      "195",     "C",  1994, 29.8, 10.7,  4.8, 0.507, 0.000, 0.748, 31.7, 18.7,  9.2,  4500000, 10,  8, 1, 2, "SAS"),
    ("Karl Malone",         "252",     "PF", 1997, 27.4,  9.9,  4.5, 0.536, 0.000, 0.729, 28.4, 17.5,  7.2,  4800000, 14, 11, 2, 0, "UTA"),
    ("John Stockton",       "314",     "PG", 1994, 17.0,  3.1, 12.6, 0.519, 0.390, 0.839, 21.4, 15.6,  7.6,  3300000, 10,  5, 0, 0, "UTA"),
    ("Clyde Drexler",       "76656",   "SG", 1992, 25.0,  6.9,  6.6, 0.488, 0.282, 0.780, 23.7, 14.8,  5.2,  3200000, 10,  4, 0, 1, "POR"),
    ("Scottie Pippen",      "294",     "SF", 1994, 22.0,  8.7,  5.6, 0.485, 0.303, 0.698, 22.2, 14.3,  6.0,  2775000,  6,  7, 0, 6, "CHI"),
    ("Gary Payton",         "288",     "PG", 2000, 24.2,  4.7,  8.9, 0.479, 0.288, 0.716, 22.3, 13.6,  5.2, 14000000,  9,  5, 0, 1, "SEA"),
    ("Jason Kidd",          "101108",  "PG", 2002, 14.7,  7.3,  9.9, 0.415, 0.348, 0.783, 20.8, 14.2,  6.3, 14000000, 10,  5, 0, 1, "NJN"),
    # More all-stars
    ("Allen Iverson",       "947",     "PG", 2001, 31.1,  3.8,  4.6, 0.420, 0.315, 0.814, 27.7,  8.3,  6.0, 11500000, 11,  4, 1, 0, "PHI"),
    ("Dirk Nowitzki",       "1717",    "PF", 2007, 24.6,  8.9,  3.4, 0.476, 0.416, 0.905, 26.1, 14.6,  7.1, 16800000, 14, 12, 1, 1, "DAL"),
    ("Dwyane Wade",         "2548",    "SG", 2009, 30.2,  5.0,  7.5, 0.491, 0.300, 0.762, 28.2, 12.8,  5.8, 15050000, 13,  8, 0, 3, "MIA"),
    ("Chris Paul",          "101108",  "PG", 2009, 22.8,  5.5, 11.0, 0.523, 0.375, 0.868, 29.5, 20.1, 10.0, 14940153, 12,  7, 0, 0, "NOH"),
    ("Kevin Garnett",       "708",     "PF", 2004, 24.2, 13.9,  5.0, 0.499, 0.000, 0.731, 28.0, 18.8,  7.8, 28000000, 15, 12, 1, 1, "MIN"),
    ("Carmelo Anthony",     "2546",    "SF", 2013, 28.7,  6.9,  2.6, 0.449, 0.379, 0.821, 23.5,  8.8,  4.2, 22458400, 10,  6, 0, 0, "NYK"),
    ("Paul Pierce",         "1718",    "SF", 2002, 26.1,  6.4,  3.2, 0.449, 0.370, 0.854, 22.3,  9.1,  4.9, 13500000, 10,  1, 0, 1, "BOS"),
    ("Vince Carter",        "1713",    "SG", 2001, 27.6,  5.5,  4.1, 0.441, 0.381, 0.801, 23.8,  9.4,  4.5,  8900000,  8,  1, 0, 0, "TOR"),
    ("Tracy McGrady",       "1503",    "SF", 2003, 32.1,  6.5,  5.5, 0.457, 0.367, 0.797, 29.3, 11.6,  6.4, 14625000,  7,  4, 0, 0, "ORL"),
    ("Dwight Howard",       "2730",    "C",  2009, 20.6, 13.8,  1.4, 0.572, 0.000, 0.590, 28.5, 15.1,  7.6, 15015000,  8,  3, 0, 1, "ORL"),
    ("Steve Nash",          "959",     "PG", 2006, 18.8,  4.2, 10.5, 0.512, 0.439, 0.921, 22.9, 15.2,  8.2,  9000000,  8,  3, 2, 0, "PHO"),
    ("Russell Westbrook",   "201566",  "PG", 2017, 31.6, 10.7, 10.4, 0.425, 0.293, 0.845, 29.0, 12.5,  6.7, 26540100,  9,  5, 1, 0, "OKC"),
    ("Paul George",         "202331",  "SF", 2019, 28.0,  8.2,  4.1, 0.470, 0.386, 0.845, 24.1, 11.4,  5.3, 30560700,  9,  5, 0, 0, "OKC"),
    ("Blake Griffin",       "201933",  "PF", 2014, 24.1,  9.5,  4.0, 0.520, 0.232, 0.703, 24.3,  9.1,  4.3, 18955100,  6,  2, 0, 0, "LAC"),
    ("Tony Parker",         "2225",    "PG", 2013, 20.3,  2.9,  7.6, 0.516, 0.316, 0.778, 21.8,  9.4,  4.7, 12500000,  6,  4, 0, 4, "SAS"),
    ("Kyrie Irving",        "202681",  "PG", 2016, 25.2,  3.7,  5.8, 0.470, 0.403, 0.901, 23.9,  8.7,  5.2, 19823000,  7,  3, 0, 1, "CLE"),
    ("LaMarcus Aldridge",   "200746",  "PF", 2018, 23.1,  8.8,  2.3, 0.488, 0.278, 0.828, 21.8,  9.6,  3.7, 21500000,  7,  2, 0, 0, "SAS"),
    ("Ray Allen",           "951",     "SG", 2005, 22.0,  4.2,  3.7, 0.454, 0.415, 0.909, 18.2,  8.9,  3.2, 14000000, 10,  2, 0, 2, "SEA"),
    ("Reggie Miller",       "259",     "SG", 1998, 19.6,  3.1,  3.0, 0.440, 0.400, 0.886, 17.8,  7.4,  2.8,  7500000,  5,  1, 0, 0, "IND"),
    ("Pau Gasol",           "2200",    "PF", 2008, 18.8,  9.8,  3.8, 0.517, 0.000, 0.748, 22.4, 12.8,  5.2, 14703000,  6,  2, 0, 2, "LAL"),
    ("Chris Bosh",          "2547",    "PF", 2011, 18.7,  8.3,  1.5, 0.481, 0.294, 0.798, 20.8, 10.4,  3.5, 14500000, 11,  2, 0, 2, "MIA"),
    # Recent stars
    ("Klay Thompson",       "202691",  "SG", 2016, 22.3,  3.8,  2.1, 0.474, 0.424, 0.842, 18.3,  7.2,  1.8, 15501000,  5,  2, 0, 4, "GSW"),
    ("Jimmy Butler",        "202710",  "SF", 2020, 19.9,  6.7,  6.0, 0.454, 0.243, 0.834, 22.1, 10.8,  5.4, 34380000,  5,  5, 0, 0, "MIA"),
    ("Devin Booker",        "1626164", "SG", 2022, 26.8,  5.0,  4.8, 0.466, 0.351, 0.857, 21.5,  7.6,  4.0, 33000000,  3,  1, 0, 0, "PHO"),
    ("Donovan Mitchell",    "1628378", "SG", 2022, 25.9,  4.2,  4.2, 0.444, 0.362, 0.841, 21.5,  7.0,  3.8, 30358440,  3,  1, 0, 0, "UTA"),
    ("Jayson Tatum",        "1628369", "SF", 2023, 30.1,  8.8,  4.6, 0.466, 0.352, 0.853, 26.5, 10.1,  6.4, 32600060,  6,  4, 0, 1, "BOS"),
    ("Trae Young",          "1629027", "PG", 2022, 28.4,  3.7,  9.7, 0.435, 0.360, 0.885, 23.5,  8.0,  4.9, 28000000,  3,  1, 0, 0, "ATL"),
    ("Ja Morant",           "1629630", "PG", 2022, 27.4,  5.7,  6.7, 0.496, 0.343, 0.766, 27.7,  7.4,  5.2, 33142920,  2,  1, 0, 0, "MEM"),
    ("Shai Gilgeous-Alexander","1628983","SG", 2023, 31.4,  4.8,  6.2, 0.508, 0.351, 0.874, 29.4, 11.5,  7.2, 30913750,  3,  1, 0, 0, "OKC"),
    ("Anthony Edwards",     "1630162", "SG", 2023, 24.6,  5.4,  4.4, 0.461, 0.361, 0.826, 20.1,  6.1,  2.3, 10174854,  1,  0, 0, 0, "MIN"),
    ("Zion Williamson",     "1629627", "PF", 2023, 26.0,  7.0,  4.6, 0.600, 0.000, 0.690, 26.0,  7.0,  5.3, 31625000,  2,  1, 0, 0, "NOP"),
    ("Karl-Anthony Towns",  "1626157", "C",  2019, 26.0, 12.4,  4.1, 0.526, 0.405, 0.828, 28.0, 10.7,  6.2, 29000000,  3,  1, 0, 0, "MIN"),
    ("Rudy Gobert",         "203497",  "C",  2022, 15.6, 14.7,  1.1, 0.715, 0.000, 0.643, 24.0, 11.3,  4.3, 25000000,  4,  3, 0, 0, "UTA"),
    ("Khris Middleton",     "203114",  "SF", 2021, 20.4,  6.0,  5.4, 0.499, 0.417, 0.870, 18.4,  7.3,  3.5, 33000000,  3,  1, 0, 1, "MIL"),
    ("Pascal Siakam",       "1627783", "PF", 2020, 22.9,  7.3,  3.5, 0.480, 0.359, 0.806, 21.0,  8.8,  3.0, 33000000,  2,  1, 0, 1, "TOR"),
    ("Bam Adebayo",         "1628389", "C",  2023, 20.4,  9.7,  3.2, 0.532, 0.000, 0.733, 20.1,  7.9,  2.4, 32600060,  3,  1, 0, 0, "MIA"),
    ("Draymond Green",      "203110",  "PF", 2016, 14.0,  9.5,  7.4, 0.450, 0.310, 0.710, 23.8, 14.1,  8.6, 15330435,  4,  1, 0, 4, "GSW"),
    ("Kyle Lowry",          "200768",  "PG", 2016, 21.2,  4.7,  6.4, 0.429, 0.386, 0.871, 20.5,  9.4,  4.8, 12000000,  6,  1, 0, 1, "TOR"),
    ("Fred VanVleet",       "1627832", "PG", 2021, 20.3,  4.4,  6.3, 0.419, 0.378, 0.880, 16.2,  6.4,  2.8, 21875000,  1,  0, 0, 1, "TOR"),
    ("Brandon Ingram",      "1627742", "SF", 2020, 24.3,  6.3,  4.2, 0.470, 0.388, 0.839, 21.1,  6.4,  3.1, 31650000,  1,  1, 0, 0, "NOP"),
    ("Victor Wembanyama",   "1641705", "C",  2024, 21.4, 10.6,  3.9, 0.465, 0.321, 0.793, 27.0,  9.5,  6.8, 12161160,  1,  1, 0, 0, "SAS"),
    ("Chet Holmgren",       "1631096", "C",  2024, 16.5,  7.9,  2.4, 0.530, 0.350, 0.845, 21.0,  7.0,  4.5, 10770000,  0,  0, 0, 0, "OKC"),
    ("Paolo Banchero",      "1631094", "PF", 2023, 20.0,  6.9,  3.7, 0.430, 0.300, 0.770, 18.5,  4.2,  1.2, 10239435,  1,  0, 0, 0, "ORL"),
    ("Evan Mobley",         "1630596", "C",  2023, 15.7,  8.3,  2.5, 0.528, 0.319, 0.629, 18.0,  6.4,  2.4,  7726680,  1,  0, 0, 0, "CLE"),
    # Hall of Famers and legends
    ("Isiah Thomas",        "78477",   "PG", 1987, 20.6,  3.8, 10.0, 0.456, 0.294, 0.780, 22.6, 10.5,  5.7,  1200000, 12,  5, 0, 2, "DET"),
    ("Dennis Rodman",       "79453",   "PF", 1996,  5.7, 14.9,  2.5, 0.487, 0.201, 0.534, 18.4, 11.9,  3.9,  9000000,  2,  2, 0, 5, "CHI"),
    ("Kevin McHale",        "77286",   "PF", 1988, 22.4,  8.0,  2.1, 0.604, 0.000, 0.836, 24.4, 14.5,  5.7,  1700000,  7,  6, 0, 3, "BOS"),
    ("John Havlicek",       "76994",   "SF", 1972, 27.5,  7.1,  7.5, 0.451, 0.000, 0.819, 22.4, 14.4,  5.3,   210000, 13,  8, 0, 8, "BOS"),
    ("Walt Frazier",        "78241",   "PG", 1975, 19.9,  6.1,  6.9, 0.484, 0.000, 0.791, 22.2, 10.1,  6.9,   400000,  7,  5, 0, 2, "NYK"),
    ("Bob Pettit",          "77843",   "PF", 1962, 31.1, 20.3,  3.0, 0.437, 0.000, 0.771, 28.6, 16.3,  8.1,    75000, 11,  9, 0, 0, "STL"),
    ("Elvin Hayes",         "77121",   "PF", 1975, 23.5, 14.9,  1.6, 0.477, 0.000, 0.685, 22.2, 12.7,  5.9,   400000, 12,  3, 0, 0, "WSB"),
    ("Willis Reed",         "77401",   "C",  1971, 20.7, 13.9,  2.0, 0.495, 0.000, 0.746, 22.9, 12.8,  5.7,   250000,  7,  4, 0, 2, "NYK"),
    ("Dave Cowens",         "76560",   "C",  1976, 20.4, 15.7,  4.0, 0.458, 0.000, 0.797, 22.2, 14.7,  7.0,   400000,  8,  3, 0, 2, "BOS"),
    ("Pete Maravich",       "77455",   "PG", 1977, 31.1,  5.1,  5.4, 0.441, 0.000, 0.823, 25.1,  9.5,  7.4,   600000,  5,  1, 0, 0, "NOR"),
    ("Bob Cousy",           "76397",   "PG", 1957, 20.6,  5.2,  8.5, 0.378, 0.000, 0.805, 21.8, 12.4,  6.1,    25000, 13,  7, 0, 6, "BOS"),
    ("Bill Walton",         "78269",   "C",  1978, 18.9, 13.2,  5.0, 0.522, 0.000, 0.633, 26.3, 15.2,  9.1,   750000,  2,  1, 0, 2, "POR"),
    ("Alonzo Mourning",     "272",     "C",  1999, 20.1, 10.3,  1.7, 0.532, 0.000, 0.704, 26.3, 11.6,  7.4, 15000000,  7,  4, 0, 1, "MIA"),
    ("Dikembe Mutombo",     "76989",   "C",  1998, 11.4, 11.8,  1.2, 0.530, 0.000, 0.611, 21.5, 12.5,  5.1, 14500000,  8,  1, 0, 0, "ATL"),
    ("Robert Parish",       "78083",   "C",  1984, 19.0, 10.6,  2.1, 0.548, 0.000, 0.733, 20.5, 11.6,  4.5,  1400000,  9,  1, 0, 3, "BOS"),
    ("James Worthy",        "78563",   "SF", 1990, 21.4,  5.0,  3.0, 0.521, 0.000, 0.765, 20.4,  9.8,  3.3,  2200000,  7,  3, 0, 3, "LAL"),
    ("Nate Archibald",      "76023",   "PG", 1976, 23.6,  4.3,  8.4, 0.461, 0.000, 0.771, 22.8, 10.1,  7.2,   380000,  6,  4, 0, 1, "KCK"),
    ("Manu Ginobili",       "1938",    "SG", 2008, 19.5,  4.7,  4.7, 0.470, 0.387, 0.846, 23.3,  9.8,  6.2,  9400000,  2,  0, 0, 4, "SAS"),
    ("Jamal Murray",        "1627750", "PG", 2020, 21.2,  4.0,  4.8, 0.485, 0.408, 0.869, 19.5,  6.2,  2.9, 31650000,  0,  0, 0, 1, "DEN"),
    ("Ben Simmons",         "1627732", "PG", 2020, 16.9,  7.8,  8.0, 0.557, 0.000, 0.591, 22.3, 10.4,  5.7, 33000000,  3,  1, 0, 0, "PHI"),
    ("Jrue Holiday",        "201950",  "PG", 2021, 17.7,  5.4,  6.1, 0.503, 0.395, 0.730, 20.5,  8.7,  4.9, 27000000,  1,  0, 0, 1, "MIL"),
    ("Andrew Wiggins",      "203952",  "SF", 2022, 17.2,  4.5,  2.3, 0.463, 0.396, 0.688, 13.1,  2.8,  0.6, 29542880,  1,  0, 0, 1, "GSW"),
]


def closest_cap(season: int) -> int:
    """Get the closest year's cap from SALARY_CAP."""
    if season in SALARY_CAP:
        return SALARY_CAP[season]
    # Find nearest
    years = sorted(SALARY_CAP.keys())
    return SALARY_CAP[min(years, key=lambda y: abs(y - season))]


def salary_pct(salary_usd: float, season: int) -> float:
    if season >= 1985:
        cap = closest_cap(season)
        return salary_usd / cap if cap > 0 else 0.0
    # Pre-cap era: CPI adjustment
    years = sorted(CPI_FACTORS.keys())
    factor = CPI_FACTORS.get(season) or CPI_FACTORS[min(years, key=lambda y: abs(y - season))]
    return salary_usd * factor / 10_000_000


def era_norm(season: int) -> float:
    return (season - ERA_MIN) / (ERA_MAX - ERA_MIN)


def position_onehot(pos: str) -> list[float]:
    order = ["PG", "SG", "SF", "PF", "C"]
    return [1.0 if pos == p else 0.0 for p in order]


def achievements_score(all_star: int, all_nba: int, mvp: int, rings: int) -> float:
    raw = all_star * 0.10 + all_nba * 0.15 + mvp * 0.50 + rings * 0.30
    return min(raw, 1.0)


def build_feature_vector(row: tuple) -> list[float]:
    (name, nba_id, pos, season, ppg, rpg, apg, fg_pct, three_pct, ft_pct,
     per, ws, bpm, sal_usd, all_star, all_nba, mvp, rings, team) = row

    sp = salary_pct(sal_usd, season)
    en = era_norm(season)
    oh = position_onehot(pos)
    ach = achievements_score(all_star, all_nba, mvp, rings)

    return [sp, ppg, rpg, apg, fg_pct, three_pct, ft_pct, per, ws, bpm,
            oh[0], oh[1], oh[2], oh[3], oh[4], en, ach]


def main():
    out_dir = Path(__file__).parent.parent / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    n = len(PLAYERS)
    print(f"Processing {n} players...")

    raw_features = np.array([build_feature_vector(p) for p in PLAYERS], dtype=float)
    salary_pcts  = raw_features[:, 0]

    # Z-score normalize
    mean = raw_features.mean(axis=0)
    std  = raw_features.std(axis=0)
    std[std == 0] = 1.0

    # Apply feature weights before PCA
    weights = np.array([FEATURE_WEIGHTS[f] for f in FEATURE_NAMES])
    X_norm = (raw_features - mean) / std
    X_w    = X_norm * weights

    # PCA → 3D coords
    pca    = PCA(n_components=3, random_state=42)
    coords = pca.fit_transform(X_w)
    ev     = pca.explained_variance_ratio_
    print(f"PCA explained variance: {ev[0]:.3f} + {ev[1]:.3f} + {ev[2]:.3f} = {sum(ev):.3f}")

    # KNN graph (k=10)
    k = 10
    nbrs = NearestNeighbors(n_neighbors=k + 1, metric="euclidean")
    nbrs.fit(X_norm)
    _, indices = nbrs.kneighbors(X_norm)
    neighbors_nested = [row[1:].tolist() for row in indices]

    # Ridge regression models
    y = salary_pcts

    model_specs = {
        "full_model":     FEATURE_NAMES,
        "scoring_model":  ["ppg", "fg_pct", "three_pct", "ft_pct", "is_pg", "is_sg", "is_sf", "is_pf", "is_c", "era_norm"],
        "physical_model": ["is_pg", "is_sg", "is_sf", "is_pf", "is_c", "era_norm"],
    }

    models = {}
    for name, feat_subset in model_specs.items():
        col_idx = [FEATURE_NAMES.index(f) for f in feat_subset]
        X_sub   = X_norm[:, col_idx]
        mdl     = Ridge(alpha=1.0)
        mdl.fit(X_sub, y)
        rmse    = math.sqrt(mean_squared_error(y, mdl.predict(X_sub)))
        models[name] = {
            "featureNames": feat_subset,
            "coefficients": mdl.coef_.tolist(),
            "intercept":    float(mdl.intercept_),
            "rmse":         rmse,
        }
        print(f"  {name}: RMSE={rmse:.4f}")

    # Salary delta: actual - predicted (in USD)
    full_idx  = [FEATURE_NAMES.index(f) for f in model_specs["full_model"]]
    pred_pct  = Ridge(alpha=1.0).fit(X_norm[:, full_idx], y).predict(X_norm[:, full_idx])
    sal_delta = (salary_pcts - pred_pct) * CURRENT_CAP_USD

    # Flat neighbors array (10 per player)
    neighbors_flat = [n for row in neighbors_nested for n in row]

    # Era cap table for model.json
    era_norm_table = [{"season": s, "capUsd": c} for s, c in sorted(SALARY_CAP.items())]

    # Build players.json payload
    players_payload = {
        "ids":          [str(i) for i in range(n)],
        "names":        [p[0] for p in PLAYERS],
        "x":            [round(float(v), 4) for v in coords[:, 0]],
        "y":            [round(float(v), 4) for v in coords[:, 1]],
        "z":            [round(float(v), 4) for v in coords[:, 2]],
        "salaryBest":   [float(p[13]) for p in PLAYERS],
        "salaryDelta":  [round(float(v), 2) for v in sal_delta],
        "salaryPct":    [round(float(v), 6) for v in salary_pcts],
        "position":     [p[2] for p in PLAYERS],
        "era":          [p[3] for p in PLAYERS],
        "team":         [p[18] for p in PLAYERS],
        "ppg":          [p[4] for p in PLAYERS],
        "rpg":          [p[5] for p in PLAYERS],
        "apg":          [p[6] for p in PLAYERS],
        "fgPct":        [p[7] for p in PLAYERS],
        "threePct":     [p[8] for p in PLAYERS],
        "ftPct":        [p[9] for p in PLAYERS],
        "per":          [p[10] for p in PLAYERS],
        "ws":           [p[11] for p in PLAYERS],
        "bpm":          [p[12] for p in PLAYERS],
        "achievements": [round(achievements_score(p[14], p[15], p[16], p[17]), 4) for p in PLAYERS],
        "allStarCount": [p[14] for p in PLAYERS],
        "mvpCount":     [p[16] for p in PLAYERS],
        "rings":        [p[17] for p in PLAYERS],
        "neighbors":    neighbors_flat,
        "atlasIndex":   [0] * n,
        "atlasUvX":     [0.0] * n,
        "atlasUvY":     [0.0] * n,
        "atlasUvW":     [0.0] * n,
        "atlasUvH":     [0.0] * n,
        "nbaId":        [p[1] for p in PLAYERS],
    }

    model_payload = {
        "pcaW":              pca.components_.tolist(),
        "pcaMean":           mean.tolist(),
        "pcaStd":            std.tolist(),
        "featureNames":      FEATURE_NAMES,
        "fullModel":         {k: v for k, v in models["full_model"].items() if k != "rmse"},
        "scoringModel":      {k: v for k, v in models["scoring_model"].items() if k != "rmse"},
        "physicalModel":     {k: v for k, v in models["physical_model"].items() if k != "rmse"},
        "eraNormTable":      era_norm_table,
        "currentCapUsd":     CURRENT_CAP_USD,
        "rmseFullModel":     models["full_model"]["rmse"],
        "rmseScoringModel":  models["scoring_model"]["rmse"],
        "rmsePhysicalModel": models["physical_model"]["rmse"],
    }

    players_path = out_dir / "players.json"
    model_path   = out_dir / "model.json"

    with open(players_path, "w") as f:
        json.dump(players_payload, f, separators=(",", ":"))
    with open(model_path, "w") as f:
        json.dump(model_payload, f, indent=2)

    print(f"\nWrote {players_path} ({players_path.stat().st_size // 1024} KB)")
    print(f"Wrote {model_path} ({model_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
