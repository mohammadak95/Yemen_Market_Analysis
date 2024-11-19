import os
import json
import csv
import random
from datetime import datetime, timedelta
import argparse
import pandas as pd
import shutil
import math
from pathlib import Path

class ComprehensiveDataSampler:
    def __init__(self, data_dir="./results", output_dir="./samples"):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.ensure_output_dir()
        
    def ensure_output_dir(self):
        """Create output directory structure"""
        directories = [
            'preprocessed_by_commodity',
            'network_data',
            'choropleth_data',
            'price_diff_results',
            'ecm',
            'tv_mii_results'
        ]
        
        for dir_name in directories:
            dir_path = self.output_dir / dir_name
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"Created directory: {dir_path}")

    def sample_preprocessed_data(self, commodity="beans"):
        """Sample preprocessed commodity data"""
        try:
            source_file = self.data_dir / 'preprocessed_by_commodity' / f'preprocessed_yemen_market_data_{commodity}.json'
            if not source_file.exists():
                print(f"Warning: Preprocessed file not found for {commodity}")
                return None

            with open(source_file, 'r') as f:
                data = json.load(f)

            # Sample market clusters and time series data
            sampled_data = {
                'market_clusters': random.sample(data.get('market_clusters', []), 
                                              min(5, len(data.get('market_clusters', [])))),
                'time_series_data': random.sample(data.get('time_series_data', []), 
                                                min(100, len(data.get('time_series_data', []))))
            }

            output_file = self.output_dir / 'preprocessed_by_commodity' / f'preprocessed_{commodity}_sample.json'
            with open(output_file, 'w') as f:
                json.dump(sampled_data, f, indent=2)

            print(f"Saved preprocessed {commodity} samples to {output_file}")
            return sampled_data

        except Exception as e:
            print(f"Error sampling preprocessed data for {commodity}: {str(e)}")
            return None

    def sample_ecm_data(self):
        """Sample ECM analysis data"""
        try:
            # Sample unified ECM results
            ecm_files = [
                'ecm_analysis_results.json',
                'ecm_results_north_to_south.json',
                'ecm_results_south_to_north.json'
            ]

            for filename in ecm_files:
                source_file = self.data_dir / 'ecm' / filename
                if not source_file.exists():
                    print(f"Warning: ECM file not found: {filename}")
                    continue

                with open(source_file, 'r') as f:
                    data = json.load(f)

                # Sample the ECM analysis results
                if isinstance(data, dict) and 'ecm_analysis' in data:
                    sampled_data = {
                        'ecm_analysis': random.sample(data['ecm_analysis'], 
                                                    min(5, len(data['ecm_analysis'])))
                    }
                elif isinstance(data, list):
                    sampled_data = random.sample(data, min(5, len(data)))
                else:
                    sampled_data = data

                output_file = self.output_dir / 'ecm' / f'sample_{filename}'
                with open(output_file, 'w') as f:
                    json.dump(sampled_data, f, indent=2)

                print(f"Saved ECM samples to {output_file}")

        except Exception as e:
            print(f"Error sampling ECM data: {str(e)}")

    def sample_tvmii_data(self):
        """Sample TV-MII results"""
        try:
            tvmii_files = [
                'tv_mii_results.json',
                'tv_mii_market_results.json'
            ]

            for filename in tvmii_files:
                source_file = self.data_dir / filename
                if not source_file.exists():
                    print(f"Warning: TV-MII file not found: {filename}")
                    continue

                with open(source_file, 'r') as f:
                    data = json.load(f)

                # Sample the TV-MII results
                sampled_data = random.sample(data, min(50, len(data)))

                output_file = self.output_dir / f'sample_{filename}'
                with open(output_file, 'w') as f:
                    json.dump(sampled_data, f, indent=2)

                print(f"Saved TV-MII samples to {output_file}")

        except Exception as e:
            print(f"Error sampling TV-MII data: {str(e)}")

    def sample_price_differential_data(self):
        """Sample price differential analysis results"""
        try:
            source_file = self.data_dir / 'price_diff_results' / 'price_differential_results.json'
            if not source_file.exists():
                print("Warning: Price differential results file not found")
                return

            with open(source_file, 'r') as f:
                data = json.load(f)

            # Sample markets and their commodity results
            sampled_data = {'markets': {}}
            original_markets = list(data.get('markets', {}).keys())
            selected_markets = random.sample(original_markets, min(5, len(original_markets)))

            for market in selected_markets:
                market_data = data['markets'][market]
                sampled_data['markets'][market] = {
                    'commodity_results': {}
                }
                
                commodities = list(market_data.get('commodity_results', {}).keys())
                selected_commodities = random.sample(commodities, min(3, len(commodities)))
                
                for commodity in selected_commodities:
                    sampled_data['markets'][market]['commodity_results'][commodity] = \
                        market_data['commodity_results'][commodity]

            output_file = self.output_dir / 'price_diff_results' / 'sample_price_differential_results.json'
            with open(output_file, 'w') as f:
                json.dump(sampled_data, f, indent=2)

            print(f"Saved price differential samples to {output_file}")

        except Exception as e:
            print(f"Error sampling price differential data: {str(e)}")

    def copy_geojson_files(self):
        """Copy GeoJSON boundary files"""
        try:
            geojson_files = list(self.data_dir.glob('choropleth_data/*.geojson'))
            for file in geojson_files:
                shutil.copy2(file, self.output_dir / 'choropleth_data' / file.name)
                print(f"Copied GeoJSON file: {file.name}")

        except Exception as e:
            print(f"Error copying GeoJSON files: {str(e)}")

    def create_comprehensive_test_suite(self):
        """Create a complete test suite with samples from all data sources"""
        try:
            # Create test directory structure
            test_dir = self.output_dir / 'test_suite'
            test_dir.mkdir(exist_ok=True)
            
            # Sample data from all sources
            commodities = ['beans', 'wheat', 'rice']  # Add your actual commodities
            preprocessed_samples = {}
            for commodity in commodities:
                preprocessed_samples[commodity] = self.sample_preprocessed_data(commodity)
            
            self.sample_ecm_data()
            self.sample_tvmii_data()
            self.sample_price_differential_data()
            self.copy_geojson_files()
            
            # Create test suite manifest
            manifest = {
                'created_at': datetime.now().isoformat(),
                'data_sources': {
                    'preprocessed_data': {
                        'commodities': list(preprocessed_samples.keys()),
                        'samples_per_commodity': 100
                    },
                    'ecm_analysis': {
                        'files': ['unified', 'north_to_south', 'south_to_north'],
                        'samples_per_file': 5
                    },
                    'tvmii': {
                        'files': ['results', 'market_results'],
                        'samples_per_file': 50
                    },
                    'price_differential': {
                        'markets': 5,
                        'commodities_per_market': 3
                    },
                    'geojson': {
                        'files': [f.name for f in (self.output_dir / 'choropleth_data').glob('*.geojson')]
                    }
                }
            }
            
            # Save manifest
            with open(test_dir / 'manifest.json', 'w') as f:
                json.dump(manifest, f, indent=2)
            
            print(f"\nCreated comprehensive test suite in {test_dir}")
            print("Manifest:", json.dumps(manifest, indent=2))
            
        except Exception as e:
            print(f"Error creating comprehensive test suite: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Comprehensive Yemen market data sampler')
    parser.add_argument('--data-dir', default='./results', help='Directory containing source data files')
    parser.add_argument('--output-dir', default='./samples', help='Directory to save sampled data')
    args = parser.parse_args()
    
    sampler = ComprehensiveDataSampler(args.data_dir, args.output_dir)
    
    print("=== Yemen Market Data Comprehensive Sampler ===")
    print(f"Source directory: {args.data_dir}")
    print(f"Output directory: {args.output_dir}")
    print("\nCreating comprehensive test suite...")
    
    sampler.create_comprehensive_test_suite()
    
    print("\nDone! You can now use the sampled data for testing.")

if __name__ == "__main__":
    main()