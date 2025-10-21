# make_osm_heatmap_uk.py
# Run:  python make_osm_heatmap_uk.py

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import geopandas as gpd
import contextily as cx
import matplotlib.cm as cm

# ---------------- SETTINGS ----------------
XLSX_PATH = "property_list.xlsx"         # your workbook
SHEET = "property list 2"                # sheet name
OUT_PNG = "owned_properties_heatmap_osm_uk.png"

HEAT_BINS = 400                          # larger = smoother heat
HEAT_ALPHA = 0.65                        # heat overlay opacity
POINT_SIZE = 10
POINT_ALPHA = 0.85
OSM_ZOOM = 8                             # 6–8 works well for UK

# UK bounding box in EPSG:3857 (Web Mercator)
UK_BOUNDS = (-1300000, 700000, 6350000, 8550000)  # (xmin, xmax, ymin, ymax)

# Major cities (lon, lat, name)
CITIES = [
    (-0.1276, 51.5074, "London"),
    (-1.8986, 52.4895, "Birmingham"),
    (-2.2426, 53.4808, "Manchester"),
    (-3.1883, 55.9533, "Edinburgh"),
    (-4.2518, 55.8642, "Glasgow"),
    (-3.1791, 51.4816, "Cardiff"),
    (-2.5879, 51.4545, "Bristol"),
    (-2.9916, 53.4084, "Liverpool"),
    (-1.5491, 53.8008, "Leeds"),
    (-1.6132, 54.9783, "Newcastle"),
    (-5.9301, 54.5973, "Belfast"),
    (-0.1195, 52.2053, "Cambridge"),
    (-1.8262, 51.1789, "Bath"),
    (-0.3419, 53.7433, "Hull"),
]
# ------------------------------------------


def main():
    # Load & clean
    df = pd.read_excel(XLSX_PATH, sheet_name=SHEET)
    if "landlordName" in df.columns:
        df = df[~df["landlordName"].str.contains("test", case=False, na=False)].copy()

    # Detect latitude/longitude column names
    cols_lower = {c.lower(): c for c in df.columns}
    lat_col = next((cols_lower[c] for c in ["latitude", "lat"] if c in cols_lower), None)
    lon_col = next((cols_lower[c] for c in ["longitude", "lon", "lng", "long"] if c in cols_lower), None)
    if not lat_col or not lon_col:
        raise SystemExit("Couldn’t find latitude/longitude columns in the sheet.")

    df = df.dropna(subset=[lat_col, lon_col]).copy()
    df[lat_col] = df[lat_col].astype(float)
    df[lon_col] = df[lon_col].astype(float)

    # GeoDataFrame to Web Mercator
    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
        crs="EPSG:4326",
    ).to_crs(3857)

    # Lock to UK view
    xmin, xmax, ymin, ymax = UK_BOUNDS
    fig, ax = plt.subplots(figsize=(10, 12))
    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_facecolor((0, 0, 0, 0))  # transparent axes bg (just in case)

    # OSM basemap (UK only)
    cx.add_basemap(
        ax,
        source=cx.providers.OpenStreetMap.Mapnik,
        crs=gdf.crs,
        zoom=OSM_ZOOM,
        attribution_size=6,
    )

    # Points within UK bbox
    xs = gdf.geometry.x.values
    ys = gdf.geometry.y.values
    mask_uk = (xs >= xmin) & (xs <= xmax) & (ys >= ymin) & (ys <= ymax)
    xs_in, ys_in = xs[mask_uk], ys[mask_uk]

    # Heat grid ONLY inside UK bbox (no zero-tinted background)
    heat, xedges, yedges = np.histogram2d(
        ys_in, xs_in, bins=HEAT_BINS, range=[[ymin, ymax], [xmin, xmax]]
    )
    heat_T = heat.T

    # Transparent colormap for zero-density areas (no purple tint)
    cmap = cm.get_cmap("YlOrRd").copy()  # or 'hot'
    heat_masked = np.ma.masked_equal(heat_T, 0)  # mask zeros
    cmap.set_bad(alpha=0)  # fully transparent where masked

    ax.imshow(
        heat_masked,
        origin="lower",
        extent=[xmin, xmax, ymin, ymax],
        cmap=cmap,
        alpha=HEAT_ALPHA,
        interpolation="bilinear",
        aspect="auto",
    )

    # Scatter property points
    ax.scatter(xs_in, ys_in, s=POINT_SIZE, alpha=POINT_ALPHA)

    # City labels
    cities_gdf = gpd.GeoDataFrame(
        CITIES,
        columns=["lon", "lat", "name"],
        geometry=gpd.points_from_xy([c[0] for c in CITIES], [c[1] for c in CITIES]),
        crs="EPSG:4326",
    ).to_crs(3857)

    for _, row in cities_gdf.iterrows():
        ax.plot(row.geometry.x, row.geometry.y, marker="o", markersize=3, alpha=0.95)
        ax.text(row.geometry.x + 10_000, row.geometry.y + 10_000, row["name"], fontsize=9, alpha=0.95)

    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title("Owned Properties — Heatmap + Points + Labels (OpenStreetMap)", pad=12)

    plt.tight_layout()
    plt.savefig(OUT_PNG, dpi=220)
    print(f"Saved {OUT_PNG}")


if __name__ == "__main__":
    main()
