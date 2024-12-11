"""
Test script for Yemen Market Analysis reproduction package.
Tests core functionality including data loading, processing, and basic analysis.
"""

import unittest
import pandas as pd
import numpy as np
import geopandas as gpd
from pathlib import Path
import yaml
import logging
from datetime import datetime, timedelta

from project.utils.common_utils import (
    load_config,
    validate_data,
    handle_missing_values,
    validate_coordinates,
    detect_outliers,
    calculate_market_distance
)

class TestDataValidation(unittest.TestCase):
    """Test data validation functions."""
    
    def setUp(self):
        """Set up test data."""
        # Create sample data
        self.sample_data = pd.DataFrame({
            'date': pd.date_range(start='2020-01-01', periods=10),
            'commodity': ['wheat']*10,
            'admin1': ['region1']*10,
            'usdprice': np.random.uniform(10, 20, 10),
            'conflict_intensity': np.random.uniform(0, 1, 10),
            'longitude': np.random.uniform(42, 45, 10),
            'latitude': np.random.uniform(12, 15, 10),
            'exchange_rate_regime': ['north']*10
        })

    def test_validate_data(self):
        """Test data validation function."""
        required_columns = [
            'date', 'commodity', 'admin1', 'usdprice',
            'conflict_intensity', 'longitude', 'latitude'
        ]
        
        # Test with valid data
        self.assertTrue(validate_data(self.sample_data, required_columns))
        
        # Test with missing column
        invalid_data = self.sample_data.drop('usdprice', axis=1)
        with self.assertRaises(ValueError):
            validate_data(invalid_data, required_columns)

    def test_handle_missing_values(self):
        """Test missing value handling."""
        # Introduce missing values
        data_with_missing = self.sample_data.copy()
        data_with_missing.loc[0, 'usdprice'] = np.nan
        
        # Test handling
        numeric_columns = ['usdprice', 'conflict_intensity']
        cleaned_data = handle_missing_values(data_with_missing, numeric_columns)
        
        self.assertFalse(cleaned_data['usdprice'].isnull().any())

    def test_validate_coordinates(self):
        """Test coordinate validation."""
        # Test valid coordinates
        self.assertTrue(validate_coordinates(self.sample_data))
        
        # Test invalid longitude
        invalid_data = self.sample_data.copy()
        invalid_data.loc[0, 'longitude'] = 200
        with self.assertRaises(ValueError):
            validate_coordinates(invalid_data)
        
        # Test invalid latitude
        invalid_data = self.sample_data.copy()
        invalid_data.loc[0, 'latitude'] = 100
        with self.assertRaises(ValueError):
            validate_coordinates(invalid_data)

class TestDataProcessing(unittest.TestCase):
    """Test data processing functions."""
    
    def setUp(self):
        """Set up test data."""
        # Create sample time series data
        dates = pd.date_range(start='2020-01-01', periods=100)
        self.sample_data = pd.DataFrame({
            'date': dates,
            'commodity': ['wheat']*100,
            'admin1': ['region1']*100,
            'usdprice': np.sin(np.linspace(0, 4*np.pi, 100)) * 10 + 20,  # Sinusoidal price pattern
            'conflict_intensity': np.random.uniform(0, 1, 100),
            'longitude': [44.0]*100,
            'latitude': [13.0]*100,
            'exchange_rate_regime': ['north']*100
        })

    def test_detect_outliers(self):
        """Test outlier detection."""
        # Introduce outliers
        self.sample_data.loc[0, 'usdprice'] = 1000  # Clear outlier
        
        outliers = detect_outliers(self.sample_data['usdprice'])
        self.assertTrue(outliers[0])  # First value should be detected as outlier
        self.assertFalse(outliers[1:].any())  # Rest should not be outliers

    def test_market_distance(self):
        """Test market distance calculation."""
        coord1 = (44.0, 13.0)  # Sample coordinates in Yemen
        coord2 = (45.0, 14.0)  # About 157km apart
        
        distance = calculate_market_distance(coord1, coord2)
        
        # Check if distance is reasonable (should be around 157km)
        self.assertTrue(140 < distance < 170)

class TestConfigurationLoading(unittest.TestCase):
    """Test configuration loading and validation."""
    
    def setUp(self):
        """Set up test configuration."""
        self.config_path = Path('project/config/config.yaml')

    def test_load_config(self):
        """Test configuration loading."""
        config = load_config(str(self.config_path))
        
        # Check essential configuration sections
        self.assertIn('directories', config)
        self.assertIn('files', config)
        self.assertIn('parameters', config)
        
        # Check essential parameters
        self.assertIn('min_common_dates', config['parameters'])
        self.assertIn('commodities', config['parameters'])

def create_test_data():
    """Create test data for integration testing."""
    # Create directories
    Path('data/raw').mkdir(parents=True, exist_ok=True)
    
    # Generate synthetic market data
    dates = pd.date_range(start='2020-01-01', periods=365)
    regions = ['region1', 'region2', 'region3']
    commodities = ['wheat', 'rice']
    
    data = []
    for region in regions:
        for commodity in commodities:
            base_price = np.random.uniform(10, 20)
            prices = np.random.normal(base_price, 1, len(dates))
            
            data.extend([{
                'date': date,
                'commodity': commodity,
                'admin1': region,
                'usdprice': price,
                'conflict_intensity': np.random.uniform(0, 1),
                'longitude': np.random.uniform(42, 45),
                'latitude': np.random.uniform(12, 15),
                'exchange_rate_regime': np.random.choice(['north', 'south'])
            } for date, price in zip(dates, prices)])
    
    df = pd.DataFrame(data)
    df.to_csv('data/raw/market_data.csv', index=False)
    return df

class TestIntegration(unittest.TestCase):
    """Integration tests for the full pipeline."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment."""
        cls.test_data = create_test_data()
        
    def test_full_pipeline(self):
        """Test the full data processing pipeline."""
        from prepare_data import main as prepare_data_main
        
        # Run data preparation
        try:
            prepare_data_main()
            
            # Verify output files exist
            config = load_config()
            self.assertTrue(Path(config['files']['spatial_geojson']).exists())
            
            # Load and verify processed data
            gdf = gpd.read_file(config['files']['spatial_geojson'])
            self.assertGreater(len(gdf), 0)
            self.assertTrue(isinstance(gdf, gpd.GeoDataFrame))
            
        except Exception as e:
            self.fail(f"Pipeline failed with error: {str(e)}")

if __name__ == '__main__':
    # Setup logging for tests
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Run tests
    unittest.main(verbosity=2)
