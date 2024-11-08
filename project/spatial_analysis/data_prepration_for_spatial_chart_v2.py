# project/spatial_analysis/data_preparation_for_spatial_chart.py

import os
import sys
import json
import pandas as pd
import geopandas as gpd
from pathlib import Path
from libpysal.weights import KNN
import logging
import networkx as nx  # For connectivity checks
from libpysal.weights.spatial_lag import lag_spatial

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
RESULTS_DIR = Path("results")
DATA_DIR = Path("project/data/processed")  # Updated to match spatial_model.py output
ENHANCED_GEOJSON_FILE = DATA_DIR / "enhanced_unified_data_with_residual.geojson"  # Updated GeoJSON path
CHOROPLETH_OUTPUT_DIR = RESULTS_DIR / "choropleth_data"
WEIGHTS_OUTPUT_DIR = RESULTS_DIR / "spatial_weights"
TIME_SERIES_OUTPUT_DIR = RESULTS_DIR / "time_series_data"
RESIDUALS_OUTPUT_DIR = RESULTS_DIR / "residuals_data"
NETWORK_DATA_OUTPUT_DIR = RESULTS_DIR / "network_data"

# Create output directories if they don't exist
for directory in [
    CHOROPLETH_OUTPUT_DIR,
    WEIGHTS_OUTPUT_DIR,
    TIME_SERIES_OUTPUT_DIR,
    RESIDUALS_OUTPUT_DIR,
    NETWORK_DATA_OUTPUT_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)


def load_geojson_data(file_path, logger):
    """
    Load GeoJSON data and apply consistent sorting.

    Parameters:
        file_path (str or Path): Path to the GeoJSON file.
        logger (logging.Logger): Logger for logging messages.

    Returns:
        gpd.GeoDataFrame: Loaded and sorted GeoDataFrame.
    """
    try:
        gdf = gpd.read_file(file_path)
        logger.info(f"Loaded GeoJSON data from {file_path} with {len(gdf)} records")

        # Ensure 'date' is in datetime format
        if 'date' in gdf.columns:
            gdf['date'] = pd.to_datetime(gdf['date'], errors='coerce')
        else:
            logger.error("'date' column not found in GeoJSON data.")
            sys.exit(1)

        # Apply consistent sorting by region_id and date
        gdf = gdf.sort_values(by=['region_id', 'date']).reset_index(drop=True)
        return gdf
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data from '{file_path}': {e}")
        sys.exit(1)


def check_unique_identifier(gdf, identifier='region_id', logger=logger):
    """
    Check if the specified identifier is unique in the GeoDataFrame.

    Parameters:
        gdf (gpd.GeoDataFrame): The GeoDataFrame to check.
        identifier (str): The column name to check for uniqueness.

    Returns:
        bool: True if unique, False otherwise.
    """
    if gdf[identifier].is_unique:
        logger.info(f"All '{identifier}'s are unique.")
        return True
    else:
        duplicate_ids = gdf[identifier][gdf[identifier].duplicated()].unique()
        logger.warning(f"Duplicate '{identifier}'s found: {duplicate_ids}")
        return False


def prepare_unique_regions_gdf(gdf, identifier='region_id', logger=logger):
    """
    Create a GeoDataFrame with unique regions based on the specified identifier.

    Parameters:
        gdf (gpd.GeoDataFrame): The original GeoDataFrame.
        identifier (str): The column name to use for uniqueness.

    Returns:
        gpd.GeoDataFrame: GeoDataFrame with unique regions.
    """
    unique_regions_gdf = gdf.drop_duplicates(subset=[identifier]).copy().reset_index(drop=True)
    logger.info(f"Created unique regions GeoDataFrame with {len(unique_regions_gdf)} records based on '{identifier}'.")
    return unique_regions_gdf


def is_fully_connected(w, logger=logger):
    """
    Check if the spatial weights matrix is fully connected.

    Parameters:
        w (libpysal.weights.W): Spatial weights object.

    Returns:
        bool: True if fully connected, False otherwise.
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


def inspect_neighbors(w, unique_gdf, sample_size=5, logger=logger):
    """
    Inspect a sample of neighbors to ensure no region includes itself.

    Parameters:
        w (libpysal.weights.W): Spatial weights object.
        unique_gdf (gpd.GeoDataFrame): GeoDataFrame with unique regions.
        sample_size (int): Number of samples to inspect.
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


def verify_spatial_weights(w, unique_gdf, sample_size=5, logger=logger):
    """
    Verify that no region includes itself as a neighbor and that neighbors are distinct.

    Parameters:
        w (libpysal.weights.W): Spatial weights object.
        unique_gdf (gpd.GeoDataFrame): GeoDataFrame with unique regions.
        sample_size (int): Number of samples to verify.
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


def export_spatial_weights(unique_gdf, initial_k=5, max_k=20, identifier='region_id', logger=logger):
    """
    Export spatial weights matrix as JSON, automatically increasing k until connected.

    Parameters:
        unique_gdf (gpd.GeoDataFrame): GeoDataFrame with unique regions.
        initial_k (int): Initial number of neighbors.
        max_k (int): Maximum number of neighbors to attempt.
        identifier (str): Column name used as the identifier.

    Returns:
        libpysal.weights.W: Spatial weights object.
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
            if is_fully_connected(w, logger):
                logger.info(f"Spatial weights matrix is fully connected with k={k}.")
                break
            else:
                logger.warning(f"Spatial weights matrix is NOT fully connected with k={k}.")
                k += 1

        if k > max_k:
            logger.error(f"Failed to create a fully connected spatial weights matrix with k up to {max_k}.")
            k_final = k - 1
            logger.warning(f"Proceeding with k={k_final} which may have disconnected components.")
            w = KNN.from_dataframe(unique_gdf, k=k_final)

        neighbors_dict = {}
        for region_idx, neighbors in w.neighbors.items():
            region = region_ids[region_idx]
            neighbor_regions = [region_ids[n] for n in neighbors if n != region_idx and n < len(region_ids)]

            if not neighbor_regions:
                logger.warning(f"Region '{region}' has no valid neighbors.")
            else:
                neighbors_dict[region] = neighbor_regions

        with open(WEIGHTS_OUTPUT_DIR / "spatial_weights.json", 'w') as f:
            json.dump(neighbors_dict, f, indent=2)

        logger.info("Spatial weights matrix exported to JSON.")
        inspect_neighbors(w, unique_gdf, sample_size=5, logger=logger)
        verify_spatial_weights(w, unique_gdf, sample_size=5, logger=logger)

        return w
    except Exception as e:
        logger.error(f"Failed to export spatial weights matrix: {e}")
        raise


def prepare_choropleth_data(gdf, choropleth_output_dir, logger=logger):
    """
    Prepare data for choropleth maps: Average prices, Conflict intensity, Price changes, Residuals.

    Parameters:
        gdf (gpd.GeoDataFrame): The main GeoDataFrame.
        choropleth_output_dir (Path): Output directory for choropleth data.
    """
    try:
        # Ensure 'date' is in datetime format
        gdf['date'] = pd.to_datetime(gdf['date'], errors='coerce')

        # 1. Average Prices per Region and Time
        avg_prices = gdf.groupby(['region_id', 'date'])['usdprice'].mean().reset_index().rename(columns={'usdprice': 'avg_usdprice'})
        avg_prices.to_csv(choropleth_output_dir / "average_prices.csv", index=False)
        logger.info("Prepared average prices for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare average prices: {e}")
        raise

    try:
        # 2. Conflict Intensity per Region and Time
        conflict_intensity = gdf.groupby(['region_id', 'date'])['conflict_intensity'].mean().reset_index().rename(columns={'conflict_intensity': 'avg_conflict_intensity'})
        conflict_intensity.to_csv(choropleth_output_dir / "conflict_intensity.csv", index=False)
        logger.info("Prepared conflict intensity for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare conflict intensity: {e}")
        raise

    try:
        # 3. Price Changes per Region and Time
        gdf_sorted = gdf.sort_values(['region_id', 'date'])
        gdf_sorted['price_change_pct'] = gdf_sorted.groupby('region_id')['usdprice'].pct_change() * 100
        price_changes = gdf_sorted.groupby(['region_id', 'date'])['price_change_pct'].mean().reset_index()
        price_changes.to_csv(choropleth_output_dir / "price_changes.csv", index=False)
        logger.info("Prepared price changes for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare price changes: {e}")
        raise

    try:
        # 4. Residuals per Region and Time
        residuals_expanded = gdf[['region_id', 'date', 'residual']].copy()
        residuals_expanded = residuals_expanded.explode('residual')
        residuals_expanded['commodity_regime'] = residuals_expanded['residual'].apply(lambda x: list(x.keys())[0] if isinstance(x, dict) and x else None)
        residuals_expanded['residual'] = residuals_expanded['residual'].apply(lambda x: list(x.values())[0] if isinstance(x, dict) and x else None)
        residuals_expanded.dropna(subset=['commodity_regime', 'residual'], inplace=True)
        residuals_expanded.to_csv(choropleth_output_dir / "residuals.csv", index=False)
        logger.info("Prepared residuals for choropleth maps.")
    except Exception as e:
        logger.error(f"Failed to prepare residuals: {e}")
        raise


def prepare_time_series_data(gdf, time_series_output_dir, logger=logger):
    """
    Prepare time series data for prices and conflict intensity.

    Parameters:
        gdf (gpd.GeoDataFrame): The main GeoDataFrame.
        time_series_output_dir (Path): Output directory for time series data.
    """
    try:
        gdf = gdf.sort_values(by=['region_id', 'date']).reset_index(drop=True)

        # Time series per Commodity and Regime
        prices_ts = gdf.pivot_table(
            index=['region_id', 'date'],
            columns=['commodity', 'regime'],
            values='usdprice'
        ).reset_index()
        prices_ts.to_csv(time_series_output_dir / "prices_time_series.csv", index=False)
        logger.info("Prepared and saved time series data for prices.")
    except Exception as e:
        logger.error(f"Failed to prepare prices time series data: {e}")
        raise

    try:
        # Conflict Intensity Time Series
        conflict_ts = gdf.groupby(['region_id', 'date'])['conflict_intensity'].mean().reset_index().rename(columns={'conflict_intensity': 'avg_conflict_intensity'})
        conflict_ts.to_csv(time_series_output_dir / "conflict_intensity_time_series.csv", index=False)
        logger.info("Prepared and saved time series data for conflict intensity.")
    except Exception as e:
        logger.error(f"Failed to prepare conflict intensity time series data: {e}")
        raise


def generate_network_data(gdf, unique_regions_gdf, w, network_data_output_dir, logger=logger):
    """
    Generate flow maps using the spatial weights matrix and include latitude/longitude.

    Parameters:
        gdf (gpd.GeoDataFrame): The main GeoDataFrame.
        unique_regions_gdf (gpd.GeoDataFrame): GeoDataFrame with unique regions.
        w (libpysal.weights.W): Spatial weights object.
        network_data_output_dir (Path): Output directory for network data.
    """
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
                weight = unique_gdf.loc[idx, 'spatial_lag_usdprice']  # Adjusted to use 'spatial_lag_usdprice'

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
        flow_df.to_csv(network_data_output_dir / "flow_maps.csv", index=False)
        logger.info("Generated and saved flow maps data with coordinates for network graphs.")
    except Exception as e:
        logger.error(f"Failed to generate network data: {e}")
        raise


def main():
    # Load GeoJSON data
    gdf = load_geojson_data(ENHANCED_GEOJSON_FILE, logger)

    # Check if required columns exist
    required_columns = ['region_id', 'date', 'usdprice', 'conflict_intensity', 'residual']
    missing_columns = [col for col in required_columns if col not in gdf.columns]
    if missing_columns:
        logger.error(f"Required columns missing in GeoJSON data: {missing_columns}")
        sys.exit(1)

    # Prepare unique regions GeoDataFrame
    unique_regions_gdf = prepare_unique_regions_gdf(gdf, identifier='region_id', logger=logger)

    # Check for unique 'region_id's in unique_regions_gdf
    if not check_unique_identifier(unique_regions_gdf, identifier='region_id', logger=logger):
        logger.error("Non-unique 'region_id's detected in unique regions. Exiting.")
        sys.exit(1)

    # Prepare and export choropleth data
    prepare_choropleth_data(gdf, CHOROPLETH_OUTPUT_DIR, logger)

    # Export spatial weights matrix with dynamic k on unique regions
    w = export_spatial_weights(unique_regions_gdf, initial_k=5, max_k=20, identifier='region_id', logger=logger)

    # Prepare and export time series data
    prepare_time_series_data(gdf, TIME_SERIES_OUTPUT_DIR, logger)

    # Generate and export network data for flow maps
    generate_network_data(gdf, unique_regions_gdf, w, NETWORK_DATA_OUTPUT_DIR, logger)

    logger.info("All data files generated successfully.")


if __name__ == "__main__":
    main()