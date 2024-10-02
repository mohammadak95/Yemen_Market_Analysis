# project/spatial_analysis/data_prepration_for_spatial_chart.py

import os
import sys
import json
import pandas as pd
import geopandas as gpd
from pathlib import Path
from libpysal.weights import KNN
from esda.moran import Moran
import logging
import networkx as nx  # For connectivity checks
from libpysal.weights.spatial_lag import lag_spatial
from concurrent.futures import ProcessPoolExecutor, as_completed

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
RESULTS_DIR = Path("results")
DATA_DIR = Path("project/data/processed")  # Updated to match spatial_model.py output
ENHANCED_GEOJSON_FILE = DATA_DIR / "enhanced_unified_data_with_residuals.geojson"  # Updated GeoJSON path
CHOROPLETH_OUTPUT_DIR = RESULTS_DIR / "choropleth_data"
WEIGHTS_OUTPUT_DIR = RESULTS_DIR / "spatial_weights"
TIME_SERIES_OUTPUT_DIR = RESULTS_DIR / "time_series_data"
RESIDUALS_OUTPUT_DIR = RESULTS_DIR / "residuals_data"
NETWORK_DATA_OUTPUT_DIR = RESULTS_DIR / "network_data"

# Create output directories if they don't exist
for directory in [CHOROPLETH_OUTPUT_DIR, WEIGHTS_OUTPUT_DIR, TIME_SERIES_OUTPUT_DIR, RESIDUALS_OUTPUT_DIR, NETWORK_DATA_OUTPUT_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

def load_geojson_data(file_path):
    """Load GeoJSON data and apply consistent sorting."""
    try:
        gdf = gpd.read_file(file_path)
        logger.info(f"Loaded GeoJSON data from {file_path} with {len(gdf)} records")
        
        # Rename 'residual' column to 'residuals' if it exists
        if 'residual' in gdf.columns:
            gdf.rename(columns={'residual': 'residuals'}, inplace=True)

        # Log GeoDataFrame columns for debugging
        logger.debug(f"GeoDataFrame columns: {gdf.columns.tolist()}")
        
        # Ensure 'date' is in datetime format
        gdf['date'] = pd.to_datetime(gdf['date'], errors='coerce')
        
        # Apply consistent sorting by region_id and date
        gdf = gdf.sort_values(by=['region_id', 'date']).reset_index(drop=True)
        return gdf
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data from '{file_path}': {e}")
        sys.exit(1)

def check_unique_identifier(gdf, identifier='region_id'):
    """Check if the specified identifier is unique in the GeoDataFrame."""
    if gdf[identifier].is_unique:
        logger.info(f"All '{identifier}'s are unique.")
        return True
    else:
        duplicate_ids = gdf[identifier][gdf[identifier].duplicated()].unique()
        logger.warning(f"Duplicate '{identifier}'s found: {duplicate_ids}")
        return False

def prepare_unique_regions_gdf(gdf, identifier='region_id'):
    """
    Create a GeoDataFrame with unique regions based on the specified identifier.
    Assumes that all entries for a given region_id have the same geometry.
    """
    unique_regions_gdf = gdf.drop_duplicates(subset=[identifier]).copy().reset_index(drop=True)
    logger.info(f"Created unique regions GeoDataFrame with {len(unique_regions_gdf)} records based on '{identifier}'.")
    return unique_regions_gdf

def is_fully_connected(w):
    """
    Check if the spatial weights matrix is fully connected.
    """
    try:
        G = w.to_networkx()
        G_undirected = G.to_undirected()
        connected = nx.is_connected(G_undirected)
        if connected:
            logger.info("Spatial weights matrix is fully connected.")
        else:
            logger.warning("Spatial weights matrix is NOT fully connected.")
        return connected
    except Exception as e:
        logger.error(f"Error checking connectivity: {e}")
        return False

def inspect_neighbors(w, unique_gdf, sample_size=5):
    """
    Inspect a sample of neighbors to ensure no region includes itself.
    """
    region_ids = unique_gdf['region_id'].tolist()
    sample_indices = range(min(sample_size, len(region_ids)))

    for idx in sample_indices:
        region = region_ids[idx]
        neighbors = [region_ids[n] for n in w.neighbors[idx]]
        if region in neighbors:
            logger.warning(f"Region '{region}' includes itself as a neighbor.")
        else:
            logger.info(f"Region '{region}' neighbors: {neighbors}")

def verify_spatial_weights(w, unique_gdf, sample_size=5):
    """
    Verify that no region includes itself as a neighbor and that neighbors are distinct.
    """
    region_ids = unique_gdf['region_id'].tolist()
    sample_indices = range(min(sample_size, len(region_ids)))

    for idx in sample_indices:
        region = region_ids[idx]
        neighbors = [region_ids[n] for n in w.neighbors[idx]]
        if region in neighbors:
            logger.error(f"Region '{region}' includes itself as a neighbor.")
        else:
            logger.info(f"Region '{region}' neighbors: {neighbors}")

def export_spatial_weights(unique_gdf, initial_k=5, max_k=20, identifier='region_id'):
    """
    Export spatial weights matrix as JSON, automatically increasing k until connected.
    """
    try:
        # Ensure the GeoDataFrame is sorted by the identifier for consistent indexing
        unique_gdf = unique_gdf.sort_values(by=[identifier]).reset_index(drop=True)
        region_ids = unique_gdf[identifier].tolist()
        k = initial_k

        while k <= max_k:
            logger.info(f"Attempting to create KNN weights with k={k}...")
            w = KNN.from_dataframe(unique_gdf, k=k)
            
            logger.info("Checking if the weights matrix is fully connected...")
            if is_fully_connected(w):
                logger.info(f"Spatial weights matrix is fully connected with k={k}.")
                break
            else:
                logger.warning(f"Spatial weights matrix is NOT fully connected with k={k}.")
                k += 1

        if k > max_k:
            logger.error(f"Failed to create a fully connected spatial weights matrix with k up to {max_k}.")
            k_final = k-1
            logger.warning(f"Proceeding with k={k_final} which may have disconnected components.")
            w = KNN.from_dataframe(unique_gdf, k=k_final)

        neighbors_dict = w.neighbors
        weights_dict = {}

        for region_idx, neighbors in neighbors_dict.items():
            if region_idx >= len(region_ids):
                logger.error(f"Region index {region_idx} exceeds the number of unique regions.")
                continue
            
            region = region_ids[region_idx]
            neighbor_regions = [region_ids[n] for n in neighbors if n != region_idx and n < len(region_ids)]

            if not neighbor_regions:
                logger.warning(f"Region '{region}' has no valid neighbors.")
            else:
                weights_dict[region] = neighbor_regions

        with open(WEIGHTS_OUTPUT_DIR / "spatial_weights.json", 'w') as f:
            json.dump(weights_dict, f, indent=2)

        logger.info("Spatial weights matrix exported to JSON.")
        inspect_neighbors(w, unique_gdf)
        verify_spatial_weights(w, unique_gdf)

        return w
    except Exception as e:
        logger.error(f"Failed to export spatial weights matrix: {e}")
        raise

def prepare_choropleth_data(gdf):
    """
    Prepare data for choropleth maps: Average prices, Conflict intensity, Price changes, Residuals.
    """
    try:
        # Ensure 'date' is in datetime format
        gdf['date'] = pd.to_datetime(gdf['date'], errors='coerce')
        
        # 1. Average Prices per Region and Time
        avg_prices = gdf.groupby(['region_id', 'date'])['usdprice'].mean().reset_index().rename(columns={'usdprice': 'avg_usdprice'})
        avg_prices.to_csv(CHOROPLETH_OUTPUT_DIR / "average_prices.csv", index=False)
        logger.info("Prepared average prices for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare average prices: {e}")
        raise

    try:
        # 2. Conflict Intensity per Region and Time
        conflict_intensity = gdf.groupby(['region_id', 'date'])['conflict_intensity'].mean().reset_index().rename(columns={'conflict_intensity': 'avg_conflict_intensity'})
        conflict_intensity.to_csv(CHOROPLETH_OUTPUT_DIR / "conflict_intensity.csv", index=False)
        logger.info("Prepared conflict intensity for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare conflict intensity: {e}")
        raise

    try:
        # 3. Price Changes per Region and Time
        gdf_sorted = gdf.sort_values(['region_id', 'date'])
        gdf_sorted['price_change_pct'] = gdf_sorted.groupby('region_id')['usdprice'].pct_change() * 100
        price_changes = gdf_sorted.groupby(['region_id', 'date'])['price_change_pct'].mean().reset_index()
        price_changes.to_csv(CHOROPLETH_OUTPUT_DIR / "price_changes.csv", index=False)
        logger.info("Prepared price changes for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare price changes: {e}")
        raise

    try:
        # 4. Residuals per Region and Time
        # Assuming 'residuals' is a dict with keys as 'commodity_regime' and values as residuals
        residuals_expanded = gdf[['region_id', 'date', 'residuals']].copy()
        residuals_expanded = residuals_expanded.explode('residuals')
        residuals_expanded['commodity_regime'] = residuals_expanded['residuals'].apply(lambda x: list(x.keys())[0] if isinstance(x, dict) and x else None)
        residuals_expanded['residual'] = residuals_expanded['residuals'].apply(lambda x: list(x.values())[0] if isinstance(x, dict) and x else None)
        residuals_expanded.dropna(subset=['commodity_regime', 'residual'], inplace=True)
        residuals_expanded.to_csv(CHOROPLETH_OUTPUT_DIR / "residuals.csv", index=False)
        logger.info("Prepared residuals for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare residuals: {e}")
        raise

def prepare_time_series_data(gdf):
    """
    Prepare time series data for prices and conflict intensity.
    """
    try:
        gdf = gdf.sort_values(by=['region_id', 'date']).reset_index(drop=True)
        
        # Time series per Commodity and Regime
        prices_ts = gdf.pivot_table(
            index=['region_id', 'date'], 
            columns=['commodity', 'regime'], 
            values='usdprice'
        ).reset_index()
        prices_ts.to_csv(TIME_SERIES_OUTPUT_DIR / "prices_time_series.csv", index=False)
        logger.info("Prepared and saved time series data for prices.")
    except Exception as e:
        logger.error(f"Failed to prepare prices time series data: {e}")
        raise

    try:
        # Conflict Intensity Time Series
        conflict_ts = gdf.groupby(['region_id', 'date'])['conflict_intensity'].mean().reset_index().rename(columns={'conflict_intensity': 'avg_conflict_intensity'})
        conflict_ts.to_csv(TIME_SERIES_OUTPUT_DIR / "conflict_intensity_time_series.csv", index=False)
        logger.info("Prepared and saved time series data for conflict intensity.")
    except Exception as e:
        logger.error(f"Failed to prepare conflict intensity time series data: {e}")
        raise

def generate_network_data(gdf, unique_regions_gdf, w):
    """Generate flow maps using the spatial weights matrix and include latitude/longitude."""
    flow_data = []
    try:
        # Get the list of region_ids based on the order in w
        region_ids_in_order = unique_regions_gdf['region_id'].tolist()

        # Map the id_order (numerical index) from w to the corresponding region_ids
        id_to_region_map = {i: region for i, region in enumerate(region_ids_in_order)}

        # Extract latitude and longitude from unique_regions_gdf
        unique_gdf = unique_regions_gdf.copy()
        unique_gdf['latitude'] = unique_gdf.geometry.centroid.y  # Assuming latitude from centroid
        unique_gdf['longitude'] = unique_gdf.geometry.centroid.x  # Assuming longitude from centroid

        # Calculate average usdprice per region
        usdprice_avg = gdf.groupby('region_id')['usdprice'].mean().reindex(region_ids_in_order).fillna(0)
        unique_gdf['avg_usdprice'] = usdprice_avg.values

        # Calculate spatial lag
        unique_gdf['spatial_lag_usdprice'] = lag_spatial(w, unique_gdf['avg_usdprice'])

        for idx, source_id in enumerate(w.id_order):
            source = id_to_region_map[idx]
            neighbors = w.neighbors[idx]
            for neighbor_idx in neighbors:
                target = id_to_region_map[neighbor_idx]
                weight = unique_gdf.loc[idx, 'spatial_lag_usdprice']  # Adjusted to use 'avg_usdprice'

                # Retrieve latitude and longitude for both source and target from the unique GeoDataFrame
                source_coords = unique_gdf.loc[idx, ['latitude', 'longitude']].values
                target_coords = unique_gdf.loc[neighbor_idx, ['latitude', 'longitude']].values

                flow_data.append({
                    'source': source,
                    'source_lat': source_coords[0],
                    'source_lng': source_coords[1],
                    'target': target,
                    'target_lat': target_coords[0],
                    'target_lng': target_coords[1],
                    'weight': weight
                })

        # Create a DataFrame from the flow data and save it to CSV
        flow_df = pd.DataFrame(flow_data)
        flow_df.to_csv(NETWORK_DATA_OUTPUT_DIR / "flow_maps.csv", index=False)
        logger.info("Generated and saved flow maps data with coordinates for network graphs.")
    except Exception as e:
        logger.error(f"Failed to generate network data: {e}")
        raise

def main():
    # Load GeoJSON data
    gdf = load_geojson_data(ENHANCED_GEOJSON_FILE)

    # Check if 'usdprice' and 'conflict_intensity' columns exist
    required_columns = ['region_id', 'date', 'usdprice', 'conflict_intensity', 'residuals']
    for col in required_columns:
        if col not in gdf.columns:
            logger.error(f"Required column '{col}' not found in GeoJSON data.")
            sys.exit(1)

    # Prepare unique regions GeoDataFrame
    unique_regions_gdf = prepare_unique_regions_gdf(gdf, identifier='region_id')

    # Check for unique 'region_id's in unique_regions_gdf
    if not check_unique_identifier(unique_regions_gdf, identifier='region_id'):
        logger.error("Non-unique 'region_id's detected in unique regions. Exiting.")
        return

    # Prepare and export choropleth data
    prepare_choropleth_data(gdf)

    # Export spatial weights matrix with dynamic k on unique regions
    w = export_spatial_weights(unique_regions_gdf, initial_k=5, max_k=20, identifier='region_id')

    # Prepare and export time series data
    prepare_time_series_data(gdf)

    # Generate and export network data for flow maps
    generate_network_data(gdf, unique_regions_gdf, w)

    logger.info("All data files generated successfully.")

if __name__ == "__main__":
    main()
