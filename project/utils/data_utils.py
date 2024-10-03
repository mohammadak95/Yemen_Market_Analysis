# utils/data_utils.py

import json
import pandas as pd
from pathlib import Path
import logging
import geopandas as gpd

logger = logging.getLogger(__name__)

def load_geojson(file_path):
    """Load GeoJSON data into a GeoDataFrame."""
    try:
        gdf = gpd.read_file(file_path)
        logger.info(f"Loaded GeoJSON data from {file_path} with {len(gdf)} records.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data from {file_path}: {e}")
        raise

def save_json(data, file_path):
    """Save data to a JSON file."""
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
        logger.info(f"Saved data to {file_path}")
    except Exception as e:
        logger.error(f"Failed to save data to {file_path}: {e}")
        raise

def load_json(file_path):
    """Load data from a JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        logger.info(f"Loaded data from {file_path}")
        return data
    except Exception as e:
        logger.error(f"Failed to load data from {file_path}: {e}")
        raise