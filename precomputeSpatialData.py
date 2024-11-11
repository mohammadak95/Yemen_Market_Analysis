import json
import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict
import os

# File paths
geo_boundaries_path = './data/geoBoundaries-YEM-ADM1.geojson'
unified_data_path = './data/enhanced_unified_data_with_residual.geojson'
flow_maps_path = './data/time_varying_flows.csv'
weights_data_path = './data/transformed_spatial_weights.json'
output_dir = './data/preprocessed_by_commodity/'

# Ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)

# Load files
with open(geo_boundaries_path, 'r') as f:
    geo_boundaries_data = json.load(f)

with open(unified_data_path, 'r') as f:
    unified_data = json.load(f)

flow_maps_data = pd.read_csv(flow_maps_path)

with open(weights_data_path, 'r') as f:
    weights_data = json.load(f)

# Function to get unique commodities
def get_unique_commodities(features):
    return sorted(
        list(set(
            feature["properties"]["commodity"].strip().lower()
            for feature in features
            if "commodity" in feature["properties"] and feature["properties"]["commodity"]
        ))
    )

# Spatial Data Processing Function
def process_spatial_data(features, selected_commodity=None, selected_date=None):
    processed_features = []
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    for feature in features:
        if not isinstance(feature, dict) or "properties" not in feature:
            raise ValueError("Each feature must be a dictionary with a 'properties' key.")
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
        if selected_date and properties.get("date") != selected_date:
            continue
        processed_features.append(feature)
    return processed_features

# Time Series Processing Function with Outlier Removal and Smoothing
def process_time_series_data(features, selected_commodity=None, smoothing=True, outlier_removal=True):
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    monthly_data = defaultdict(lambda: {"usdPrices": [], "count": 0})
    
    for feature in features:
        if not isinstance(feature, dict) or "properties" not in feature:
            raise ValueError("Each feature must be a dictionary with a 'properties' key.")
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
        date_str = properties.get("date")
        if not date_str:
            continue

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            print(f"Warning: Skipping feature with invalid date format - {date_str}")
            continue  # Skip invalid date formats
        month = date.strftime("%Y-%m")
        
        monthly_data[month]["usdPrices"].append(properties.get("usdprice", np.nan))
        monthly_data[month]["count"] += 1

    time_series_output = []
    months = sorted(monthly_data.keys())
    prices_series = []

    for month in months:
        data = monthly_data[month]
        clean_prices = [p for p in data["usdPrices"] if not pd.isna(p)]
        avg_usd_price = np.mean(clean_prices) if clean_prices else np.nan
        volatility = (np.std(clean_prices) / avg_usd_price * 100) if avg_usd_price else np.nan

        prices_series.append(avg_usd_price)
        time_series_output.append({
            "month": month,
            "avgUsdPrice": avg_usd_price,
            "volatility": volatility,
            "sampleSize": data["count"]
        })

    # Apply outlier removal
    if outlier_removal:
        prices_series = remove_outliers(prices_series)

    # Apply smoothing
    if smoothing:
        prices_series = apply_smoothing(prices_series)

    # Update the prices in the output
    for i, entry in enumerate(time_series_output):
        entry["avgUsdPrice"] = prices_series[i]

    return time_series_output

def remove_outliers(data, threshold=2):
    data = np.array(data)
    mean = np.nanmean(data)
    std_dev = np.nanstd(data)
    if std_dev == 0:
        return data.tolist()  # Avoid division by zero
    z_scores = (data - mean) / std_dev
    filtered_data = np.where(np.abs(z_scores) > threshold, np.nan, data)
    return filtered_data.tolist()

def apply_smoothing(data, window_size=3):
    data_series = pd.Series(data)
    smoothed_data = data_series.rolling(window=window_size, min_periods=1, center=True).mean()
    return smoothed_data.tolist()

# Market Shock Detection Function
def detect_market_shocks(features, selected_commodity, threshold=0.15):
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    grouped_features = defaultdict(list)

    for feature in features:
        if not isinstance(feature, dict) or "properties" not in feature:
            raise ValueError("Each feature must be a dictionary with a 'properties' key.")
        properties = feature["properties"]
        if properties.get("commodity").strip().lower() == selected_commodity:
            region = properties.get("admin1")
            if region:
                grouped_features[region].append(properties)

    shocks = []
    for region, properties in grouped_features.items():
        # Sort properties by date
        properties = sorted(properties, key=lambda x: x["date"] if x.get("date") else "")
        for i in range(1, len(properties)):
            prev_price = properties[i - 1].get("usdprice")
            current_price = properties[i].get("usdprice")
            date = properties[i].get("date")

            if pd.notna(prev_price) and pd.notna(current_price) and prev_price != 0:
                percent_change = (current_price - prev_price) / prev_price
                if abs(percent_change) > threshold:
                    shock_type = "price_surge" if percent_change > 0 else "price_drop"
                    shocks.append({
                        "region": region,
                        "date": date,
                        "shock_type": shock_type,
                        "magnitude": abs(percent_change) * 100,
                        "previous_price": prev_price,
                        "current_price": current_price
                    })

    return shocks

# Market Clustering Function
def compute_market_clusters(features, weights_data, min_cluster_size=2):
    clusters = []
    visited = set()
    
    def iterative_dfs(start_region):
        stack = [start_region]
        cluster = []
        while stack:
            region = stack.pop()
            if region not in visited:
                visited.add(region)
                cluster.append(region)
                neighbors = weights_data.get(region, {}).get("neighbors", [])
                stack.extend([neighbor for neighbor in neighbors if neighbor not in visited])
        return cluster

    for region in weights_data:
        if region not in visited:
            cluster = iterative_dfs(region)
            if len(cluster) >= min_cluster_size:
                clusters.append({
                    "cluster_id": len(clusters) + 1,
                    "main_market": cluster[0],
                    "connected_markets": cluster,
                    "market_count": len(cluster)
                })

    return clusters

# Flow Analysis Function with Flow Metrics
def analyze_flows(flow_data, selected_commodity=None):
    if not isinstance(flow_data, pd.DataFrame):
        raise ValueError("Expected 'flow_data' to be a pandas DataFrame.")
    if selected_commodity:
        flow_data = flow_data[flow_data["commodity"].str.strip().str.lower() == selected_commodity]

    flow_analysis = []
    grouped_flows = flow_data.groupby(['source', 'target'])

    for (source, target), group in grouped_flows:
        total_flow = group['flow_weight'].sum()
        avg_flow = group['flow_weight'].mean()
        flow_count = len(group)
        avg_price_diff = group['price_differential'].mean()
        flow_analysis.append({
            "source": source,
            "target": target,
            "total_flow": total_flow,
            "avg_flow": avg_flow,
            "flow_count": flow_count,
            "avg_price_differential": avg_price_diff
        })
    
    return flow_analysis

# Spatial Autocorrelation Analysis (Manual Moran's I Calculation)
def compute_spatial_autocorrelation(weights_data, features, selected_commodity=None):
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    prices = []
    regions = []

    for feature in features:
        if not isinstance(feature, dict) or "properties" not in feature:
            raise ValueError("Each feature must be a dictionary with a 'properties' key.")
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
        price = properties.get("usdprice")
        region = properties.get("admin1")  # Assuming 'admin1' corresponds to 'region'
        if pd.notna(price) and region:
            prices.append(price)
            regions.append(region)

    if not prices or not regions:
        return {"moran_i": None, "p_value": None, "significance": False}

    # Create spatial weights matrix manually
    weights_dict = {region: weights_data.get(region, {}).get("neighbors", []) for region in regions}
    region_indices = {region: idx for idx, region in enumerate(regions)}
    indices_weights = {
        region_indices[region]: [region_indices[nbr] for nbr in nbrs if nbr in region_indices]
        for region, nbrs in weights_dict.items()
    }

    # Ensure there are weights to compute Moran's I
    if not indices_weights:
        return {"moran_i": None, "p_value": None, "significance": False}

    y = np.array(prices)
    n = len(y)
    y_mean = np.mean(y)
    y_diff = y - y_mean
    numerator = 0.0
    denominator = np.sum(y_diff ** 2)

    for i in indices_weights:
        for j in indices_weights[i]:
            numerator += y_diff[i] * y_diff[j]

    # Assuming row-standardized weights
    moran_i = (n / np.sum([len(neighbors) for neighbors in indices_weights.values()])) * (numerator / denominator)
    p_value = 1 - abs(moran_i)  # Placeholder for p-value, actual p-value calculation would require permutations

    return {
        "moran_i": moran_i,
        "p_value": p_value,
        "significance": p_value < 0.05
    }

# Preprocess data per commodity
def preprocess_data_per_commodity():
    commodities = get_unique_commodities(unified_data["features"])
    print(f"Found {len(commodities)} unique commodities.")

    for commodity in commodities:
        print(f"Processing commodity: {commodity}")
        processed_features = process_spatial_data(unified_data["features"], selected_commodity=commodity)
        time_series_data = process_time_series_data(processed_features, selected_commodity=commodity, smoothing=True, outlier_removal=True)
        market_shocks = detect_market_shocks(processed_features, selected_commodity=commodity)
        market_clusters = compute_market_clusters(processed_features, weights_data)
        flow_analysis = analyze_flows(flow_maps_data, selected_commodity=commodity)
        spatial_autocorrelation = compute_spatial_autocorrelation(weights_data, processed_features, selected_commodity=commodity)

        preprocessed_data = {
            "time_series_data": time_series_data,
            "market_shocks": market_shocks,
            "market_clusters": market_clusters,
            "flow_analysis": flow_analysis,
            "spatial_autocorrelation": spatial_autocorrelation,
            "metadata": {
                "commodity": commodity.title(),  # Capitalize for readability
                "data_source": "Unified Data & Weights",
                "processed_date": datetime.now().isoformat(),
                "total_clusters": len(market_clusters)
            }
        }

        # Sanitize commodity name for filename
        sanitized_commodity = commodity.replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').lower()
        output_file = f"preprocessed_yemen_market_data_{sanitized_commodity}.json"
        output_path = os.path.join(output_dir, output_file)

        with open(output_path, 'w') as f:
            json.dump(preprocessed_data, f, indent=2, default=str)
        print(f"Preprocessed data for '{commodity}' saved to '{output_path}'\n")

# Run the preprocessing for each commodity
if __name__ == "__main__":
    preprocess_data_per_commodity()
    print("All commodities have been processed and saved.")
