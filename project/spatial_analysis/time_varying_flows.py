import pandas as pd
import geopandas as gpd
import numpy as np
from pathlib import Path
from libpysal.weights import KNN
from datetime import datetime
import logging
import json
import warnings
from typing import Dict, List, Tuple, Optional

class TimeVaryingFlowGenerator:
    def __init__(self, 
                 input_file: str,
                 output_dir: str,
                 time_window: str = 'M',
                 min_flow_value: float = 0.0,
                 k_neighbors: int = 5,
                 log_level: str = 'INFO'):
        # Setup paths and configuration
        self.input_file = Path(input_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.time_window = time_window
        self.min_flow_value = min_flow_value
        self.k_neighbors = k_neighbors
        
        # Setup logging
        self.logger = logging.getLogger('TimeVaryingFlowGenerator')
        self.logger.setLevel(log_level)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        
        # Initialize data structures
        self.gdf = None
        self.unique_regions = None
        self.weights = None
        self.flows = None
    
    def load_data(self) -> None:
        """Load and prepare the input GeoJSON data."""
        try:
            self.logger.info(f"Loading data from {self.input_file}")
            self.gdf = gpd.read_file(self.input_file)
            
            # Ensure required columns exist
            required_columns = {'region_id', 'date', 'usdprice', 'geometry'}
            missing_columns = required_columns - set(self.gdf.columns)
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Convert date to datetime
            self.gdf['date'] = pd.to_datetime(self.gdf['date'])
            
            # Create unique regions dataset
            self.unique_regions = (self.gdf.drop_duplicates('region_id')
                                 [['region_id', 'geometry']]
                                 .sort_values('region_id')
                                 .reset_index(drop=True))
            
            # Add centroid coordinates
            self.unique_regions['latitude'] = self.unique_regions.geometry.centroid.y
            self.unique_regions['longitude'] = self.unique_regions.geometry.centroid.x
            
            self.logger.info(f"Loaded {len(self.gdf)} records with {len(self.unique_regions)} unique regions")
            
        except Exception as e:
            self.logger.error(f"Error loading data: {e}")
            raise
    
    def create_spatial_weights(self) -> None:
        """Create spatial weights matrix using K-nearest neighbors."""
        try:
            self.logger.info(f"Creating spatial weights matrix with k={self.k_neighbors}")
            
            # Create KNN weights
            self.weights = KNN.from_dataframe(
                self.unique_regions,
                k=self.k_neighbors,
                ids=self.unique_regions.index.tolist()
            )
            
            # Convert weights to dense format for easier access
            self.weight_matrix = self.weights.full()[0]
            
            self.logger.info("Spatial weights matrix created successfully")
            
        except Exception as e:
            self.logger.error(f"Error creating spatial weights: {e}")
            raise
    
    def _calculate_period_flows(self, time_period: datetime, prices: pd.Series) -> List[Dict]:
        """Calculate flows for a specific time period."""
        flows = []
        
        for idx in range(len(self.unique_regions)):
            source_region = self.unique_regions.iloc[idx]
            source_id = source_region['region_id']
            source_price = prices.get(source_id, 0)
            
            # Get neighbors and their weights
            neighbor_indices = self.weights.neighbors[idx]
            
            for n_idx in neighbor_indices:
                try:
                    target_region = self.unique_regions.iloc[n_idx]
                    target_id = target_region['region_id']
                    target_price = prices.get(target_id, 0)
                    
                    # Calculate price differential
                    price_diff = abs(target_price - source_price)
                    if price_diff <= self.min_flow_value:
                        continue
                    
                    # Get weight from the weight matrix
                    weight = self.weight_matrix[idx, n_idx]
                    
                    # Create flow record
                    flow = {
                        'date': time_period,
                        'source': source_id,
                        'source_lat': source_region['latitude'],
                        'source_lng': source_region['longitude'],
                        'target': target_id,
                        'target_lat': target_region['latitude'],
                        'target_lng': target_region['longitude'],
                        'price_differential': price_diff,
                        'source_price': source_price,
                        'target_price': target_price,
                        'flow_weight': price_diff * weight if weight != 0 else 0
                    }
                    
                    flows.append(flow)
                    
                except IndexError as e:
                    self.logger.warning(f"Skipping invalid neighbor index {n_idx} for region {source_id}")
                    continue
        
        return flows
    
    def calculate_temporal_flows(self) -> None:
        """Calculate flows for each time period."""
        try:
            self.logger.info("Calculating temporal flows")
            flows_list = []
            temporal_stats = {}
            
            # Group data by time window
            grouped = self.gdf.groupby(pd.Grouper(key='date', freq=self.time_window))
            
            for time_period, period_data in grouped:
                if len(period_data) == 0:
                    continue
                
                # Calculate average prices for period
                prices = period_data.groupby('region_id')['usdprice'].mean()
                
                # Calculate flows between regions
                period_flows = self._calculate_period_flows(time_period, prices)
                
                if period_flows:
                    # Calculate period statistics
                    stats = {
                        'flow_count': len(period_flows),
                        'mean_price_diff': np.mean([f['price_differential'] for f in period_flows]),
                        'max_price_diff': max(f['price_differential'] for f in period_flows),
                        'mean_flow_weight': np.mean([f['flow_weight'] for f in period_flows]),
                        'active_regions': len(set(f['source'] for f in period_flows) | 
                                           set(f['target'] for f in period_flows))
                    }
                    
                    flows_list.extend(period_flows)
                    temporal_stats[time_period.strftime('%Y-%m-%d')] = stats
                    
                    self.logger.debug(f"Processed period {time_period}: {len(period_flows)} flows")
            
            self.flows = pd.DataFrame(flows_list)
            
            # Save results
            self._save_results(self.flows, temporal_stats)
            
            self.logger.info(f"Generated {len(self.flows)} flows across {len(temporal_stats)} time periods")
            
        except Exception as e:
            self.logger.error(f"Error calculating temporal flows: {e}")
            raise
    
    def _save_results(self, flows: pd.DataFrame, temporal_stats: Dict) -> None:
        """Save flow data and statistics."""
        # Save flows to CSV
        flow_file = self.output_dir / 'time_varying_flows.csv'
        flows.to_csv(flow_file, index=False)
        
        # Save statistics to JSON
        stats_file = self.output_dir / 'flow_statistics.json'
        with open(stats_file, 'w') as f:
            json.dump(temporal_stats, f, indent=2)
        
        self.logger.info(f"Results saved to {self.output_dir}")
    
    def generate(self) -> pd.DataFrame:
        """Execute the full flow map generation process."""
        self.load_data()
        self.create_spatial_weights()
        self.calculate_temporal_flows()
        return self.flows

def main():
    # Configuration
    INPUT_FILE = "project/data/processed/enhanced_unified_data_with_residual.geojson"
    OUTPUT_DIR = "results/network_data"
    
    # Create flow generator
    generator = TimeVaryingFlowGenerator(
        input_file=INPUT_FILE,
        output_dir=OUTPUT_DIR,
        time_window='M',  # Monthly aggregation
        min_flow_value=0.1,  # Minimum price differential to include
        k_neighbors=5,  # Number of nearest neighbors
        log_level='INFO'
    )
    
    # Generate flows
    flows = generator.generate()
    
    print(f"\nGenerated {len(flows)} flows")
    print("\nSample of generated flows:")
    print(flows.head())
    print("\nOutput files saved to:", OUTPUT_DIR)

if __name__ == "__main__":
    main()