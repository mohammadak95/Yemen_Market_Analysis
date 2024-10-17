import json
import pandas as pd

# Load the data files
with open('public/results/choropleth_data/geoBoundaries-YEM-ADM1.geojson', 'r') as file:
    geo_boundaries_data = json.load(file)

with open('public/results/enhanced_unified_data_with_residual.geojson', 'r') as file:
    enhanced_data = json.load(file)

# Extract all regions from geoBoundaries
geo_boundaries_regions = {
    feature['properties'].get('shapeName', '') 
    for feature in geo_boundaries_data['features']
}

# Extract all regions from the enhanced data
enhanced_regions = {
    feature['properties'].get('region_id', '') 
    for feature in enhanced_data['features']
}

# Output both sets for comparison
print("Regions in GeoBoundaries:")
print(sorted(geo_boundaries_regions))

print("\nRegions in Enhanced Data:")
print(sorted(enhanced_regions))