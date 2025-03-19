"""
NBA 3D Visualization Data Pipeline
====================================

DATA SOURCE — download ONE Kaggle dataset:
  https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats

Place these files (unzipped) in --raw-dir (default: data/raw/):

  REQUIRED:
    Player Per Game.csv        — per-season per-game stats
    Advanced.csv               — PER, WS, BPM, VORP
    Player Salaries.csv        — salary per player/season

  OPTIONAL (improves achievement scores):
    Player Award Shares.csv    — MVP, All-NBA, DPOY votes
    All-Star Selections.csv    — All-Star game appearances

Salary cap history is hardcoded — no extra file needed.
Rings are not in the dataset and are omitted (set to 0).

OUTPUTS (in --out-dir, default: ../public/data/):
  players.json   — columnar player data
  model.json     — PCA weights + regression models
  atlases/       — optional WebP headshot atlases (--atlases flag)
"""

import argparse
import json
import math
import os
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from PIL import Image
from sklearn.decomposition import PCA
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_squared_error
from sklearn.neighbors import NearestNeighbors
from tqdm import tqdm

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CURRENT_CAP_USD = 136_021_000  # 2023-24 NBA salary cap

SEASON_MIN = 1946
SEASON_MAX = 2025

# NBA salary cap by season (ending year, e.g. 2024 = 2023-24 season).
# Source: Basketball-Reference / HoopsHype cap history.
SALARY_CAP: dict[int, int] = {
    1985: 3_600_000,   1986: 4_233_000,   1987: 4_945_000,
    1988: 6_164_000,   1989: 7_232_000,   1990: 9_802_000,
    1991: 11_871_000,  1992: 12_500_000,  1993: 14_000_000,
    1994: 15_175_000,  1995: 15_964_000,  1996: 23_000_000,
    1997: 24_363_000,  1998: 26_900_000,  1999: 30_000_000,
    2000: 34_000_000,  2001: 35_500_000,  2002: 42_500_000,
    2003: 40_271_000,  2004: 43_870_000,  2005: 43_870_000,
    2006: 49_500_000,  2007: 53_135_000,  2008: 55_630_000,
    2009: 58_680_000,  2010: 57_700_000,  2011: 58_000_000,
    2012: 58_000_000,  2013: 58_044_000,  2014: 58_679_000,
    2015: 63_065_000,  2016: 70_000_000,  2017: 94_143_000,
    2018: 99_093_000,  2019: 101_869_000, 2020: 109_140_000,
    2021: 109_140_000, 2022: 112_414_000, 2023: 123_655_000,
    2024: 136_021_000, 2025: 140_588_000,
}

# CPI factors to convert pre-cap-era (pre-1985) salaries to cap-equivalent %.
# Source: US BLS CPI-U. Value = multiply nominal salary → ~2024-equivalent,
# then divide by 10M to get approximate salary_pct.
CPI_FACTORS: dict[int, float] = {
    1947: 14.0, 1948: 13.5, 1949: 13.6, 1950: 13.7,
    1951: 12.6, 1952: 12.4, 1953: 12.3, 1954: 12.3,
    1955: 12.4, 1956: 12.2, 1957: 11.7, 1958: 11.4,
    1959: 11.4, 1960: 11.2, 1961: 11.1, 1962: 11.0,
    1963: 10.8, 1964: 10.7, 1965: 10.5, 1966: 10.2,
    1967: 9.9,  1968: 9.5,  1969: 9.0,  1970: 8.5,
    1971: 8.2,  1972: 7.9,  1973: 7.5,  1974: 6.7,
    1975: 6.1,  1976: 5.9,  1977: 5.5,  1978: 5.1,
    1979: 4.6,  1980: 4.0,  1981: 3.6,  1982: 3.4,
    1983: 3.3,  1984: 3.2,
}

POSITION_COLS = ["is_pg", "is_sg", "is_sf", "is_pf", "is_c"]
POSITION_MAP = {"PG": "is_pg", "SG": "is_sg", "SF": "is_sf", "PF": "is_pf", "C": "is_c"}

STAT_FEATURES = [
    "salary_pct", "ppg", "rpg", "apg", "fg_pct", "three_pct", "ft_pct",
    "per", "ws", "bpm",
]
ALL_FEATURES = STAT_FEATURES + POSITION_COLS + ["era_norm", "achievements"]
# 10 stat + 5 position + 1 era_norm + 1 achievements = 17 total

FEATURE_WEIGHTS = {f: 1.0 for f in ALL_FEATURES}
FEATURE_WEIGHTS["salary_pct"] = 1.5
FEATURE_WEIGHTS["ppg"] = 1.3
FEATURE_WEIGHTS["achievements"] = 1.5


# ---------------------------------------------------------------------------
# Step 1 – Load and merge (sumitrodatta Kaggle dataset column names)
# ---------------------------------------------------------------------------

def load_and_merge(raw_dir: Path) -> pd.DataFrame:
    print("\n[1/13] Loading and merging raw data...")

    # --- Per-game stats ---
    pg_path = raw_dir / "Player Per Game.csv"
    if not pg_path.exists():
        raise FileNotFoundError(
            f"Missing: {pg_path}\n"
            "Download from: https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats"
        )
    pg = pd.read_csv(pg_path)
    pg.columns = [c.strip() for c in pg.columns]

    # Rename to internal names
    pg = pg.rename(columns={
        "player_id":    "player_id",
        "player":       "player_name",
        "pos":          "position",
        "tm":           "team",
        "season":       "season",
        "pts_per_game": "ppg",
        "trb_per_game": "rpg",
        "ast_per_game": "apg",
        "stl_per_game": "spg",
        "blk_per_game": "bpg",
        "fg_percent":   "fg_pct",
        "x3p_percent":  "three_pct",
        "ft_percent":   "ft_pct",
        "g":            "g",
        "mp_per_game":  "mp",
    })

    # Keep only needed columns (others are noise for PCA)
    keep_pg = ["player_id", "player_name", "position", "team", "season",
               "ppg", "rpg", "apg", "spg", "bpg", "fg_pct", "three_pct", "ft_pct", "g", "mp"]
    pg = pg[[c for c in keep_pg if c in pg.columns]].copy()

    # Drop duplicate player-season rows (multi-team stints) — keep TOT row if present, else first
    def dedupe_seasons(df):
        tot = df[df["team"] == "TOT"]
        non_tot = df[df["team"] != "TOT"]
        players_with_tot = set(tot[["player_id", "season"]].apply(tuple, axis=1))
        non_tot_filtered = non_tot[
            ~non_tot[["player_id", "season"]].apply(tuple, axis=1).isin(players_with_tot)
        ]
        return pd.concat([tot, non_tot_filtered], ignore_index=True)

    pg = dedupe_seasons(pg)

    # --- Advanced stats ---
    adv_path = raw_dir / "Advanced.csv"
    if adv_path.exists():
        adv = pd.read_csv(adv_path)
        adv.columns = [c.strip() for c in adv.columns]
        adv = adv.rename(columns={"player_id": "player_id", "player": "player_name"})
        adv = dedupe_seasons(adv)
        adv_cols = ["player_id", "season"]
        for c in ["per", "ws", "bpm", "vorp"]:
            if c in adv.columns:
                adv_cols.append(c)
        adv = adv[adv_cols].copy()
        df = pg.merge(adv, on=["player_id", "season"], how="left")
        print("    Merged Advanced.csv (PER, WS, BPM).")
    else:
        print("    Advanced.csv not found — PER/WS/BPM will be 0.")
        df = pg.copy()
        for c in ["per", "ws", "bpm"]:
            df[c] = np.nan

    # --- Salaries ---
    sal_path = raw_dir / "Player Salaries.csv"
    if not sal_path.exists():
        raise FileNotFoundError(
            f"Missing: {sal_path}\n"
            "Download from: https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats"
        )
    sal = pd.read_csv(sal_path)
    sal.columns = [c.strip() for c in sal.columns]
    sal = sal.rename(columns={"player_id": "player_id", "salary": "salary_usd"})
    sal["season"] = pd.to_numeric(sal["season"], errors="coerce")
    sal["salary_usd"] = pd.to_numeric(sal["salary_usd"], errors="coerce")

    # Take max salary per player-season (handles duplicate rows)
    sal = sal.groupby(["player_id", "season"], as_index=False)["salary_usd"].max()
    df = df.merge(sal[["player_id", "season", "salary_usd"]], on=["player_id", "season"], how="left")

    # Attach hardcoded salary cap
    df["season"] = pd.to_numeric(df["season"], errors="coerce").astype("Int64")
    df["cap_usd"] = df["season"].map(SALARY_CAP).astype(float)

    # --- Award shares → achievements ---
    awards_path = raw_dir / "Player Award Shares.csv"
    all_star_path = raw_dir / "All-Star Selections.csv"

    all_star_counts: dict[str, int] = {}
    all_nba_counts: dict[str, int] = {}
    mvp_counts: dict[str, int] = {}

    if awards_path.exists():
        aw = pd.read_csv(awards_path)
        aw.columns = [c.strip().lower() for c in aw.columns]

        # MVP wins
        mvp = aw[(aw["award"].str.lower().str.contains("mvp", na=False)) &
                 (aw["winner"] == True) &
                 (~aw["award"].str.lower().str.contains("finals", na=False)) &
                 (~aw["award"].str.lower().str.contains("all_star", na=False))]
        if "player_id" in mvp.columns:
            mvp_counts = mvp.groupby("player_id").size().to_dict()

        # All-NBA (winner=True, award contains 'all_nba' or 'all-nba')
        all_nba = aw[(aw["award"].str.lower().str.contains("all.nba|all_nba", na=False, regex=True)) &
                     (aw["winner"] == True)]
        if "player_id" in all_nba.columns:
            all_nba_counts = all_nba.groupby("player_id").size().to_dict()

        print(f"    Loaded Player Award Shares: {len(mvp)} MVP wins, {len(all_nba)} All-NBA selections.")
    else:
        print("    Player Award Shares.csv not found — MVP/All-NBA counts will be 0.")

    if all_star_path.exists():
        astar = pd.read_csv(all_star_path)
        astar.columns = [c.strip().lower() for c in astar.columns]
        if "player_id" in astar.columns:
            all_star_counts = astar.groupby("player_id").size().to_dict()
        elif "player" in astar.columns:
            # Fall back to name matching
            all_star_counts_by_name = astar.groupby("player").size().to_dict()
            # We'll join by name later
            all_star_counts = {}
            df["_all_star_by_name"] = df["player_name"].map(all_star_counts_by_name).fillna(0).astype(int)
        print(f"    Loaded All-Star Selections: {len(all_star_counts)} players.")
    else:
        print("    All-Star Selections.csv not found — All-Star counts will be 0.")

    # Attach achievement counts to df
    df["all_star_count"] = df["player_id"].map(all_star_counts).fillna(0).astype(int)
    if "_all_star_by_name" in df.columns:
        df["all_star_count"] = df["all_star_count"].where(
            df["all_star_count"] > 0, df["_all_star_by_name"]
        )
        df = df.drop(columns=["_all_star_by_name"])
    df["all_nba_count"] = df["player_id"].map(all_nba_counts).fillna(0).astype(int)
    df["mvp_count"]     = df["player_id"].map(mvp_counts).fillna(0).astype(int)
    df["rings"]         = 0  # not available in this dataset

    print(f"    Loaded {len(df):,} player-season rows, {df['player_id'].nunique():,} unique players.")
    return df


# ---------------------------------------------------------------------------
# Step 2 – Best season selection (highest PER, fall back to WS)
# ---------------------------------------------------------------------------

def select_best_seasons(df: pd.DataFrame) -> pd.DataFrame:
    print("[2/13] Selecting best season per player...")

    df = df.copy()
    df["per"] = pd.to_numeric(df.get("per", 0), errors="coerce")
    df["ws"]  = pd.to_numeric(df.get("ws", 0), errors="coerce")
    df["_best_score"] = df["per"].where(df["per"].notna(), df["ws"])

    idx = df.groupby("player_id")["_best_score"].idxmax()
    best = df.loc[idx].drop(columns=["_best_score"]).reset_index(drop=True)

    print(f"    Kept {len(best):,} players (one best-season row each).")
    return best


# ---------------------------------------------------------------------------
# Step 3 – Era normalization of salary
# ---------------------------------------------------------------------------

def compute_salary_pct(df: pd.DataFrame) -> pd.DataFrame:
    print("[3/13] Computing era-normalized salary percentage...")

    df = df.copy()
    df["salary_usd"] = pd.to_numeric(df["salary_usd"], errors="coerce")
    df["cap_usd"]    = pd.to_numeric(df["cap_usd"],    errors="coerce")

    salary_pct = []
    for _, row in df.iterrows():
        season = int(row["season"]) if pd.notna(row["season"]) else 2000
        sal    = float(row["salary_usd"]) if pd.notna(row["salary_usd"]) else np.nan
        cap    = float(row["cap_usd"])    if pd.notna(row["cap_usd"])    else np.nan

        if season >= 1985 and pd.notna(cap) and cap > 0 and pd.notna(sal):
            pct = sal / cap
        elif pd.notna(sal):
            factor = CPI_FACTORS.get(season, CPI_FACTORS.get(1984, 3.2))
            pct = sal * factor / 10_000_000
        else:
            pct = np.nan

        salary_pct.append(pct)

    df["salary_pct"] = salary_pct
    return df


# ---------------------------------------------------------------------------
# Step 4 – Build feature vector
# ---------------------------------------------------------------------------

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    print("[4/13] Building feature vectors...")

    df = df.copy()

    def primary_position(pos):
        if pd.isna(pos):
            return "C"
        pos = str(pos).upper().strip().replace("/", "-").split("-")[0].split()[0]
        return pos if pos in POSITION_MAP else "C"

    df["_primary_pos"] = df["position"].apply(primary_position)
    for col in POSITION_COLS:
        df[col] = 0
    for pos, col in POSITION_MAP.items():
        df.loc[df["_primary_pos"] == pos, col] = 1

    df["season"] = pd.to_numeric(df["season"], errors="coerce").fillna(2000).astype(int)
    df["era_norm"] = ((df["season"] - SEASON_MIN) / (SEASON_MAX - SEASON_MIN)).clip(0.0, 1.0)

    df["achievements"] = (
        df["all_star_count"] * 0.10
        + df["all_nba_count"] * 0.15
        + df["mvp_count"]     * 0.50
        + df["rings"]         * 0.30
    ).clip(0.0, 1.0)

    stat_cols = ["ppg", "rpg", "apg", "fg_pct", "three_pct", "ft_pct", "per", "ws", "bpm"]
    for col in stat_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            df[col] = np.nan

    print("    Filling missing values with position-group medians...")
    for col in stat_cols + ["salary_pct"]:
        if col not in df.columns:
            df[col] = np.nan
        group_med  = df.groupby("_primary_pos")[col].transform("median")
        global_med = df[col].median()
        df[col] = df[col].fillna(group_med).fillna(global_med).fillna(0.0)

    df = df.drop(columns=["_primary_pos"], errors="ignore")
    return df


# ---------------------------------------------------------------------------
# Step 5 – Era residualization
# ---------------------------------------------------------------------------

def residualize_era(df: pd.DataFrame) -> pd.DataFrame:
    print("[5/13] Residualizing stat features against era_norm...")

    df = df.copy()
    X_era = df[["era_norm"]].values
    for col in [c for c in STAT_FEATURES if c != "era_norm"]:
        y = df[col].values
        lr = LinearRegression().fit(X_era, y)
        df[col] = y - lr.predict(X_era)
    return df


# ---------------------------------------------------------------------------
# Step 6 – Z-score normalization
# ---------------------------------------------------------------------------

def zscore_normalize(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    print("[6/13] Z-score normalizing features...")

    X    = df[ALL_FEATURES].values.astype(float)
    mean = X.mean(axis=0)
    std  = X.std(axis=0)
    std[std == 0] = 1.0
    X_norm = (X - mean) / std

    df_norm = df.copy()
    for i, col in enumerate(ALL_FEATURES):
        df_norm[col] = X_norm[:, i]

    return df_norm, mean, std


# ---------------------------------------------------------------------------
# Step 7 – Weighted PCA to 3D
# ---------------------------------------------------------------------------

def run_pca(df_norm: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, PCA]:
    print("[7/13] Running weighted PCA to 3D...")

    X        = df_norm[ALL_FEATURES].values.astype(float)
    weights  = np.array([FEATURE_WEIGHTS[f] for f in ALL_FEATURES])
    X_w      = X * weights

    pca      = PCA(n_components=3)
    coords   = pca.fit_transform(X_w)
    ev       = pca.explained_variance_ratio_
    print(f"    Explained variance: {ev[0]:.3f} + {ev[1]:.3f} + {ev[2]:.3f} = {sum(ev):.3f}")
    return coords, pca.components_, pca


# ---------------------------------------------------------------------------
# Step 8 – KNN graph
# ---------------------------------------------------------------------------

def build_knn_graph(df_norm: pd.DataFrame, k: int = 10) -> list[list[int]]:
    print(f"[8/13] Building KNN graph (k={k})...")

    X    = df_norm[ALL_FEATURES].values.astype(float)
    nbrs = NearestNeighbors(n_neighbors=k + 1, metric="euclidean", algorithm="ball_tree")
    nbrs.fit(X)
    _, indices = nbrs.kneighbors(X)
    return [row[1:].tolist() for row in indices]


# ---------------------------------------------------------------------------
# Step 9 – Ridge regression models
# ---------------------------------------------------------------------------

def train_models(df_norm: pd.DataFrame, mean: np.ndarray, std: np.ndarray) -> dict:
    print("[9/13] Training Ridge regression models on salary_pct...")

    y = df_norm["salary_pct"].values

    model_specs = {
        "full_model": ALL_FEATURES,
        "scoring_model": [
            "ppg", "fg_pct", "three_pct", "ft_pct",
            "is_pg", "is_sg", "is_sf", "is_pf", "is_c", "era_norm",
        ],
        "physical_model": ["is_pg", "is_sg", "is_sf", "is_pf", "is_c", "era_norm"],
    }

    results = {}
    for name, features in model_specs.items():
        X    = df_norm[features].values.astype(float)
        mdl  = Ridge(alpha=1.0)
        mdl.fit(X, y)
        rmse = math.sqrt(mean_squared_error(y, mdl.predict(X)))
        results[name] = {
            "model":         mdl,
            "feature_names": features,
            "coef_":         mdl.coef_.tolist(),
            "intercept_":    float(mdl.intercept_),
            "rmse":          rmse,
        }
        print(f"    {name}: RMSE={rmse:.4f}")

    return results


# ---------------------------------------------------------------------------
# Step 10 – Salary delta
# ---------------------------------------------------------------------------

def compute_salary_delta(df_norm: pd.DataFrame, model_info: dict) -> np.ndarray:
    print("[10/13] Computing salary delta...")

    full     = model_info["full_model"]
    X        = df_norm[full["feature_names"]].values.astype(float)
    pred_pct = full["model"].predict(X)
    act_pct  = df_norm["salary_pct"].values
    return (act_pct - pred_pct) * CURRENT_CAP_USD


# ---------------------------------------------------------------------------
# Step 11 – Export players.json
# ---------------------------------------------------------------------------

def export_players_json(
    df: pd.DataFrame,
    coords_3d: np.ndarray,
    neighbors: list[list[int]],
    salary_delta_usd: np.ndarray,
    out_dir: Path,
) -> None:
    print("[11/13] Exporting players.json...")
    out_dir.mkdir(parents=True, exist_ok=True)

    def cf(series, d=4):
        return [round(float(v), d) if pd.notna(v) else 0.0 for v in series]

    def ci(series):
        return [int(v) if pd.notna(v) else 0 for v in series]

    def cs(series):
        return [str(v) if pd.notna(v) else "" for v in series]

    def nba_id(pid):
        try:
            int(str(pid))
            return str(pid)
        except (ValueError, TypeError):
            return None

    n = len(df)
    payload = {
        "ids":         cs(df["player_id"]),
        "names":       cs(df["player_name"]),
        "x":           cf(coords_3d[:, 0]),
        "y":           cf(coords_3d[:, 1]),
        "z":           cf(coords_3d[:, 2]),
        "salaryBest":  cf(df["salary_usd"]),
        "salaryDelta": cf(salary_delta_usd),
        "salaryPct":   cf(df["salary_pct"]),
        "position":    cs(df["position"]),
        "era":         ci(df["season"]),
        "team":        cs(df["team"]),
        "ppg":         cf(df["ppg"]),
        "rpg":         cf(df["rpg"]),
        "apg":         cf(df["apg"]),
        "fgPct":       cf(df["fg_pct"]),
        "threePct":    cf(df["three_pct"]),
        "ftPct":       cf(df["ft_pct"]),
        "per":         cf(df["per"]),
        "ws":          cf(df["ws"]),
        "bpm":         cf(df["bpm"]),
        "achievements":  cf(df["achievements"]),
        "allStarCount":  ci(df["all_star_count"]),
        "mvpCount":      ci(df["mvp_count"]),
        "rings":         ci(df["rings"]),
        "neighbors":     [n for row in neighbors for n in row],
        "atlasIndex":    [0] * n,
        "atlasUvX":      [0.0] * n,
        "atlasUvY":      [0.0] * n,
        "atlasUvW":      [0.0] * n,
        "atlasUvH":      [0.0] * n,
        "nbaId":         [nba_id(pid) for pid in df["player_id"]],
    }

    out_path = out_dir / "players.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"    Written {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


# ---------------------------------------------------------------------------
# Step 12 – Export model.json
# ---------------------------------------------------------------------------

def export_model_json(
    W: np.ndarray,
    mean: np.ndarray,
    std: np.ndarray,
    model_info: dict,
    out_dir: Path,
) -> None:
    print("[12/13] Exporting model.json...")

    def mentry(info):
        return {
            "featureNames": info["feature_names"],
            "coefficients": info["coef_"],
            "intercept":    info["intercept_"],
        }

    era_norm_table = [
        {"season": season, "capUsd": cap}
        for season, cap in sorted(SALARY_CAP.items())
    ]

    payload = {
        "pcaW":              W.tolist(),
        "pcaMean":           mean.tolist(),
        "pcaStd":            std.tolist(),
        "featureNames":      ALL_FEATURES,
        "fullModel":         mentry(model_info["full_model"]),
        "scoringModel":      mentry(model_info["scoring_model"]),
        "physicalModel":     mentry(model_info["physical_model"]),
        "eraNormTable":      era_norm_table,
        "currentCapUsd":     CURRENT_CAP_USD,
        "rmseFullModel":     model_info["full_model"]["rmse"],
        "rmseScoringModel":  model_info["scoring_model"]["rmse"],
        "rmsePhysicalModel": model_info["physical_model"]["rmse"],
    }

    out_path = out_dir / "model.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"    Written {out_path}")


# ---------------------------------------------------------------------------
# Step 13 – Atlas generation (optional)
# ---------------------------------------------------------------------------

ATLAS_SIZE        = 2048
THUMB_SIZE        = 64
PLAYERS_PER_ATLAS = 512
ATLAS_COLS        = ATLAS_SIZE // THUMB_SIZE   # 32
ATLAS_ROWS        = PLAYERS_PER_ATLAS // ATLAS_COLS  # 16


def generate_atlases(df: pd.DataFrame, out_dir: Path) -> None:
    print("[13/13] Generating player headshot atlases...")

    atlas_dir = out_dir / "atlases"
    atlas_dir.mkdir(parents=True, exist_ok=True)

    candidates = []
    for i, row in df.iterrows():
        try:
            nba_id = int(str(row["player_id"]))
            candidates.append((i, nba_id))
        except (ValueError, TypeError):
            pass
    print(f"    {len(candidates)} players have numeric NBA IDs.")

    manifest_entries: dict[int, dict] = {}
    current_atlas     = Image.new("RGBA", (ATLAS_SIZE, ATLAS_SIZE), (0, 0, 0, 0))
    current_atlas_idx = 0
    pos_in_atlas      = 0
    saved_atlases: list[Path] = []

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    for df_idx, nba_id in tqdm(candidates, desc="Downloading headshots"):
        url = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
        try:
            resp = session.get(url, timeout=10)
            if resp.status_code != 200:
                continue
            import io
            img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
            img = img.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
        except Exception:
            continue

        col = pos_in_atlas % ATLAS_COLS
        row = pos_in_atlas // ATLAS_COLS

        if row >= ATLAS_ROWS:
            atlas_path = atlas_dir / f"atlas-{current_atlas_idx}.webp"
            current_atlas.save(str(atlas_path), "WEBP", quality=90)
            saved_atlases.append(atlas_path)
            current_atlas_idx += 1
            current_atlas = Image.new("RGBA", (ATLAS_SIZE, ATLAS_SIZE), (0, 0, 0, 0))
            pos_in_atlas  = 0
            col, row      = 0, 0

        x, y = col * THUMB_SIZE, row * THUMB_SIZE
        current_atlas.paste(img, (x, y))

        manifest_entries[df_idx] = {
            "atlasIndex": current_atlas_idx,
            "uvX": x / ATLAS_SIZE,
            "uvY": y / ATLAS_SIZE,
            "uvW": THUMB_SIZE / ATLAS_SIZE,
            "uvH": THUMB_SIZE / ATLAS_SIZE,
        }
        pos_in_atlas += 1

    if pos_in_atlas > 0:
        atlas_path = atlas_dir / f"atlas-{current_atlas_idx}.webp"
        current_atlas.save(str(atlas_path), "WEBP", quality=90)
        saved_atlases.append(atlas_path)

    manifest = {
        "atlasSize":       ATLAS_SIZE,
        "thumbSize":       THUMB_SIZE,
        "playersPerAtlas": PLAYERS_PER_ATLAS,
        "atlasCount":      len(saved_atlases),
        "players":         {str(k): v for k, v in manifest_entries.items()},
    }
    with open(atlas_dir / "atlas-manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"    {len(saved_atlases)} atlas(es), {len(manifest_entries)} headshots.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="NBA 3D Visualization Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--raw-dir", default="data/raw",
                        help="Directory with raw CSV files (default: data/raw)")
    parser.add_argument("--out-dir", default=None,
                        help="Output dir (default: ../public/data relative to this script)")
    parser.add_argument("--atlases", action="store_true",
                        help="Download headshots and build WebP atlas files")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    raw_dir = (script_dir / args.raw_dir) if not Path(args.raw_dir).is_absolute() else Path(args.raw_dir)
    out_dir = (script_dir.parent / "public" / "data") if args.out_dir is None else (
        (script_dir / args.out_dir) if not Path(args.out_dir).is_absolute() else Path(args.out_dir)
    )

    print("=" * 60)
    print("NBA 3D Visualization Data Pipeline")
    print("=" * 60)
    print(f"  Raw data : {raw_dir}")
    print(f"  Output   : {out_dir}")
    print(f"  Atlases  : {'ON' if args.atlases else 'OFF'}")
    print("=" * 60)

    df_merged   = load_and_merge(raw_dir)
    df_best     = select_best_seasons(df_merged)
    df_salary   = compute_salary_pct(df_best)
    df_features = build_features(df_salary)
    df_resid    = residualize_era(df_features)
    df_norm, mean, std = zscore_normalize(df_resid)
    coords_3d, W, pca  = run_pca(df_norm)
    neighbors          = build_knn_graph(df_norm)
    model_info         = train_models(df_norm, mean, std)
    salary_delta       = compute_salary_delta(df_norm, model_info)

    export_players_json(df_features, coords_3d, neighbors, salary_delta, out_dir)
    export_model_json(W, mean, std, model_info, out_dir)

    if args.atlases:
        generate_atlases(df_features, out_dir)
    else:
        print("[13/13] Skipping atlases (pass --atlases to enable).")

    ev = pca.explained_variance_ratio_
    print("\n" + "=" * 60)
    print(f"  Players exported  : {len(df_features):,}")
    print(f"  PCA explained var : {ev[0]:.3f} + {ev[1]:.3f} + {ev[2]:.3f} = {sum(ev):.3f}")
    print(f"  RMSE full model   : {model_info['full_model']['rmse']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
