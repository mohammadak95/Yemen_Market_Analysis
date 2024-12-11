"""
Data preparation script for Yemen Market Analysis.
Processes raw data files into the required format for analysis.
"""

import pandas as pd
import geopandas as gpd
import numpy as np
from pathlib import Path
import logging
from datetime import datetime
import json
from typing import Dict, List, Optional, Union
import yaml

from project.utils.common_utils import (
    load_config,
    setup_logging,
    validate_data,
    handle_missing_values,
    validate_coordinates,
    detect_outliers
)

def setup_directories(config: Dict) -> Dict[str, Path]:
    """
    Create necessary directories and return paths.
    
    Args:
        config: Configuration dictionary
    
    Returns:
        Dictionary of Path objects for each directory
    """
    directories = {}
    for key, path in config['directories'].items():
        dir_path = Path(path)
        dir_path.mkdir(parents=True, exist_ok=True)
        directories[key] = dir_path
    return directories

def load_raw_data(
    raw_data_path: Union[str, Path],
    required_columns: List[str],
    date_column: str = 'date'
) -> pd.DataFrame:
    """
    Load and validate raw data.
    
    Args:
        raw_data_path: Path to raw data file
        required_columns: List of required columns
        date_column: Name of date column
    
    Returns:
        DataFrame with loaded and validated data
    """
    # Determine file type and read accordingly
    file_path = Path(raw_data_path)
    if file_path.suffix == '.csv':
        df = pd.read_csv(raw_data_path)
    elif file_path.suffix == '.xlsx':
        df = pd.read_excel(raw_data_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path.suffix}")
    
    # Validate required columns
    validate_data(df, required_columns)
    
    # Convert date column
    df[date_column] = pd.to_datetime(df[date_column])
    
    return df

def process_market_data(
    df: pd.DataFrame,
    config: Dict,
    logger: logging.Logger
) -> pd.DataFrame:
    """
    Process market data according to configuration parameters.
    
    Args:
        df: Raw market data
        config: Configuration dictionary
        logger: Logger instance
    
    Returns:
        Processed DataFrame
    """
    logger.info("Processing market data...")
    
    # Extract parameters from config
    numeric_columns = ['usdprice', 'conflict_intensity']
    
    # Handle missing values
    df = handle_missing_values(df, numeric_columns)
    
    # Validate coordinates
    validate_coordinates(df)
    
    # Detect and log outliers
    for col in numeric_columns:
        outliers = detect_outliers(df[col])
        if outliers.any():
            logger.warning(
                f"Detected {outliers.sum()} outliers in {col} "
                f"({(outliers.sum()/len(df))*100:.2f}% of data)"
            )
    
    # Filter by commodities if specified
    if config['parameters'].get('commodities'):
        df = df[df['commodity'].isin(config['parameters']['commodities'])]
    
    # Sort data
    df = df.sort_values(['commodity', config['parameters']['region_identifier'], 
                        config['parameters']['time_column']])
    
    return df

def create_geojson(
    df: pd.DataFrame,
    config: Dict,
    logger: logging.Logger
) -> gpd.GeoDataFrame:
    """
    Create GeoJSON from processed data.
    
    Args:
        df: Processed DataFrame
        config: Configuration dictionary
        logger: Logger instance
    
    Returns:
        GeoDataFrame with geometry
    """
    logger.info("Creating GeoJSON...")
    
    # Create geometry from coordinates
    geometry = gpd.points_from_xy(df['longitude'], df['latitude'])
    gdf = gpd.GeoDataFrame(df, geometry=geometry)
    
    # Set CRS to WGS84
    gdf.set_crs(epsg=4326, inplace=True)
    
    return gdf

def main():
    """Main data preparation process."""
    # Load configuration
    config = load_config()
    
    # Setup logging
    logger = setup_logging(
        Path(config['directories']['logs_dir']),
        config['parameters']['logging']['level'],
        'data_preparation.log'
    )
    
    try:
        logger.info("Starting data preparation process...")
        
        # Setup directories
        directories = setup_directories(config)
        
        # Define required columns
        required_columns = [
            'commodity',
            config['parameters']['region_identifier'],
            config['parameters']['time_column'],
            'usdprice',
            'conflict_intensity',
            'longitude',
            'latitude',
            config['parameters']['exchange_rate_regime_column']
        ]
        
        # Load raw data
        raw_data_path = directories['data_dir'] / 'raw' / 'market_data.csv'
        df = load_raw_data(raw_data_path, required_columns)
        logger.info(f"Loaded {len(df)} records from raw data")
        
        # Process data
        df_processed = process_market_data(df, config, logger)
        logger.info(f"Processed data contains {len(df_processed)} records")
        
        # Create GeoJSON
        gdf = create_geojson(df_processed, config, logger)
        
        # Save processed data
        output_path = Path(config['files']['spatial_geojson'])
        gdf.to_file(output_path, driver='GeoJSON')
        logger.info(f"Saved processed data to {output_path}")
        
        # Save processing summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'raw_records': len(df),
            'processed_records': len(df_processed),
            'commodities': df_processed['commodity'].unique().tolist(),
            'date_range': [
                df_processed[config['parameters']['time_column']].min().isoformat(),
                df_processed[config['parameters']['time_column']].max().isoformat()
            ],
            'regions': df_processed[config['parameters']['region_identifier']].unique().tolist()
        }
        
        summary_path = directories['processed_data_dir'] / 'processing_summary.json'
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=4)
        logger.info(f"Saved processing summary to {summary_path}")
        
        logger.info("Data preparation completed successfully")
        
    except Exception as e:
        logger.error(f"Error in data preparation: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    main()
