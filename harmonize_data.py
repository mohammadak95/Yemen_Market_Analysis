import json
import pandas as pd
import geopandas as gpd
from pathlib import Path
import yaml
from datetime import datetime

# Regional mapping provided by you
region_mapping = {
    'Abyan Governorate': 'abyan',
    '‘Adan Governorate': 'aden',
    "Al Bayda' Governorate": 'al bayda',
    "Ad Dali' Governorate": "al dhale'e",
    'Al Hudaydah Governorate': 'al hudaydah',
    'Al Jawf Governorate': 'al jawf',
    'Al Mahrah Governorate': 'al maharah',
    'Al Mahwit Governorate': 'al mahwit',
    'Sanʿaʾ': 'amanat al asimah',
    "'Amran Governorate": 'amran',
    'Dhamar Governorate': 'dhamar',
    'Hadhramaut': 'hadramaut',
    'Hajjah Governorate': 'hajjah',
    'Ibb Governorate': 'ibb',
    'Lahij Governorate': 'lahj',
    "Ma'rib Governorate": 'marib',
    'Raymah Governorate': 'raymah',
    'Sanʿaʾ Governorate': "sana'a",
    'Shabwah Governorate': 'shabwah',
    'Socotra': 'socotra',
    "Ta'izz Governorate": 'taizz'
}

excluded_regions = ['Sa\'dah Governorate']

def map_regions(region):
    """Map region names using the region_mapping and exclude certain regions."""
    return region_mapping.get(region, region) if region not in excluded_regions else None

def load_data():
    """Load all the necessary data from provided files."""
    gdf = gpd.read_file("output_files/corrected_unified_data.geojson")
    flow_df = pd.read_csv("output_files/corrected_time_varying_flows.csv")
    with open("output_files/corrected_spatial_weights.json") as f:
        spatial_weights = json.load(f)
    with open("output_files/corrected_spatial_analysis_results.json") as f:
        spatial_analysis_results = json.load(f)
    return gdf, flow_df, spatial_weights, spatial_analysis_results

def harmonize_region_names(gdf, flow_df, spatial_weights):
    """Apply region mapping to harmonize region names in all datasets."""
    # Harmonize region names in GeoDataFrame (corrected_unified_data.geojson)
    if 'admin1' in gdf.columns:
        gdf['region'] = gdf['admin1'].apply(map_regions)
    gdf = gdf[gdf['region'].notnull()]  # Exclude rows with invalid regions

    # Harmonize region names in flow data (corrected_time_varying_flows.csv)
    if 'source' in flow_df.columns and 'target' in flow_df.columns:
        flow_df['source'] = flow_df['source'].apply(map_regions)
        flow_df['target'] = flow_df['target'].apply(map_regions)
        flow_df = flow_df.dropna(subset=['source', 'target'])  # Remove invalid regions

    # Harmonize region names in spatial weights
    spatial_weights = {map_regions(region): {
        "neighbors": [map_regions(neighbor) for neighbor in data['neighbors'] if map_regions(neighbor)]
    } for region, data in spatial_weights.items() if map_regions(region)}

    return gdf, flow_df, spatial_weights

def validate_and_convert_dates(flow_df, gdf):
    """Validate and convert dates in flow and unified data to YYYY-MM-DD format, and remove duplicate date columns."""
    # Process flow data
    if 'date' in flow_df.columns:
        flow_df['Date'] = pd.to_datetime(flow_df['date'], errors='coerce')
        flow_df = flow_df.dropna(subset=['Date'])  # Remove rows with invalid dates
        flow_df['Date'] = flow_df['Date'].dt.strftime('%Y-%m-%d')  # Format to YYYY-MM-DD
        flow_df = flow_df.drop(columns=['date'])  # Remove the original 'date' column

    # Process unified GeoJSON data
    if 'date' in gdf.columns:
        gdf['Date'] = pd.to_datetime(gdf['date'], errors='coerce')
        gdf = gdf.dropna(subset=['Date'])  # Remove rows with invalid dates
        gdf['Date'] = gdf['Date'].dt.strftime('%Y-%m-%d')  # Format to YYYY-MM-DD
        gdf = gdf.drop(columns=['date'])  # Remove the original 'date' column

    return flow_df, gdf

def save_corrected_files(gdf, flow_df, spatial_weights, spatial_analysis_results):
    """Save the harmonized data to new files."""
    gdf.to_file("output_files/final_unified_data.geojson", driver='GeoJSON')
    flow_df.to_csv("output_files/final_time_varying_flows.csv", index=False)
    with open("output_files/final_spatial_weights.json", "w") as f:
        json.dump(spatial_weights, f, indent=2)
    with open("output_files/final_spatial_analysis_results.json", "w") as f:
        json.dump(spatial_analysis_results, f, indent=2)

def main():
    # Load the data from actual files
    gdf, flow_df, spatial_weights, spatial_analysis_results = load_data()

    # Harmonize region names
    gdf, flow_df, spatial_weights = harmonize_region_names(gdf, flow_df, spatial_weights)

    # Validate and convert dates in both flow data and unified data
    flow_df, gdf = validate_and_convert_dates(flow_df, gdf)

    # Save the corrected files 
    save_corrected_files(gdf, flow_df, spatial_weights, spatial_analysis_results)

if __name__ == "__main__":
    main()