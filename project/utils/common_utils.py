"""
Common utility functions for Yemen Market Analysis.
"""

import numpy as np
import pandas as pd
import geopandas as gpd
import logging
from pathlib import Path
import yaml
from typing import Dict, List, Union, Optional, Tuple
import json
from datetime import datetime

def load_config(config_path: str = 'project/config/config.yaml') -> dict:
    """
    Load configuration from YAML file.
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Dictionary containing configuration parameters
    """
    try:
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
        return config
    except Exception as e:
        logging.error(f"Failed to load configuration file: {e}")
        raise

def setup_logging(log_dir: Path, level: str = 'INFO', 
                 filename: str = 'analysis.log') -> logging.Logger:
    """
    Set up logging configuration.
    
    Args:
        log_dir: Directory for log files
        level: Logging level
        filename: Name of log file
        
    Returns:
        Configured logger instance
    """
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / filename
    
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_path),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def load_spatial_data(file_path: Union[str, Path], 
                     date_column: str = 'date') -> gpd.GeoDataFrame:
    """
    Load spatial data from GeoJSON file.
    
    Args:
        file_path: Path to GeoJSON file
        date_column: Name of date column
        
    Returns:
        GeoDataFrame with loaded data
    """
    try:
        gdf = gpd.read_file(file_path)
        gdf[date_column] = pd.to_datetime(gdf[date_column])
        return gdf
    except Exception as e:
        logging.error(f"Failed to load spatial data from {file_path}: {e}")
        raise

def save_results(results: Dict, 
                output_path: Union[str, Path], 
                indent: int = 4) -> None:
    """
    Save analysis results to JSON file.
    
    Args:
        results: Dictionary of results to save
        output_path: Path to save results
        indent: JSON indentation level
    """
    def json_serial(obj):
        """JSON serializer for objects not serializable by default json code"""
        if isinstance(obj, (np.integer, int)):
            return int(obj)
        elif isinstance(obj, (np.floating, float)):
            return float(obj)
        elif isinstance(obj, (np.ndarray, list)):
            return obj.tolist()
        elif isinstance(obj, pd.Series):
            return obj.to_dict()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(results, f, default=json_serial, indent=indent)
        logging.info(f"Results saved to {output_path}")
    except Exception as e:
        logging.error(f"Failed to save results to {output_path}: {e}")
        raise

def validate_data(df: pd.DataFrame, 
                 required_columns: List[str], 
                 numeric_columns: Optional[List[str]] = None) -> bool:
    """
    Validate input data structure and content.
    
    Args:
        df: Input DataFrame
        required_columns: List of required column names
        numeric_columns: List of columns that should be numeric
        
    Returns:
        True if validation passes, raises ValueError otherwise
    """
    # Check required columns
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Check numeric columns
    if numeric_columns:
        non_numeric = [col for col in numeric_columns 
                      if not np.issubdtype(df[col].dtype, np.number)]
        if non_numeric:
            raise ValueError(f"Non-numeric columns that should be numeric: {non_numeric}")
    
    # Check for empty DataFrame
    if df.empty:
        raise ValueError("DataFrame is empty")
    
    return True

def calculate_market_distance(coord1: Tuple[float, float], 
                            coord2: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two market coordinates.
    
    Args:
        coord1: (longitude, latitude) of first market
        coord2: (longitude, latitude) of second market
        
    Returns:
        Distance between markets in kilometers
    """
    try:
        return np.sqrt(
            (coord1[0] - coord2[0])**2 + 
            (coord1[1] - coord2[1])**2
        ) * 111  # Approximate conversion to kilometers
    except Exception as e:
        logging.error(f"Error calculating distance between {coord1} and {coord2}: {e}")
        raise

def handle_missing_values(df: pd.DataFrame, 
                         numeric_columns: List[str],
                         max_missing_pct: float = 0.1) -> pd.DataFrame:
    """
    Handle missing values in DataFrame.
    
    Args:
        df: Input DataFrame
        numeric_columns: List of numeric columns to process
        max_missing_pct: Maximum allowed percentage of missing values
        
    Returns:
        DataFrame with handled missing values
    """
    # Check missing value percentage
    missing_pct = df[numeric_columns].isnull().mean()
    problematic_cols = missing_pct[missing_pct > max_missing_pct].index
    
    if not problematic_cols.empty:
        logging.warning(f"Columns with >={max_missing_pct*100}% missing values: {problematic_cols}")
    
    # Handle missing values
    df_clean = df.copy()
    for col in numeric_columns:
        # Interpolate missing values within groups
        df_clean[col] = df_clean.groupby(['commodity', 'admin1'])[col].transform(
            lambda x: x.interpolate(method='linear', limit_direction='both')
        )
    
    return df_clean

def detect_outliers(series: pd.Series, 
                   n_std: float = 3.0) -> pd.Series:
    """
    Detect outliers using z-score method.
    
    Args:
        series: Input series
        n_std: Number of standard deviations for threshold
        
    Returns:
        Boolean series indicating outliers
    """
    z_scores = np.abs((series - series.mean()) / series.std())
    return z_scores > n_std

def validate_coordinates(df: pd.DataFrame, 
                       lon_col: str = 'longitude',
                       lat_col: str = 'latitude') -> bool:
    """
    Validate geographic coordinates.
    
    Args:
        df: Input DataFrame
        lon_col: Name of longitude column
        lat_col: Name of latitude column
        
    Returns:
        True if validation passes, raises ValueError otherwise
    """
    # Check longitude range
    invalid_lon = df[df[lon_col].between(-180, 180) == False]
    if not invalid_lon.empty:
        raise ValueError(f"Invalid longitude values found: {invalid_lon[lon_col].unique()}")
    
    # Check latitude range
    invalid_lat = df[df[lat_col].between(-90, 90) == False]
    if not invalid_lat.empty:
        raise ValueError(f"Invalid latitude values found: {invalid_lat[lat_col].unique()}")
    
    return True
