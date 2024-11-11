import json
import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict

# File paths
geo_boundaries_path = './data/geoBoundaries-YEM-ADM1.geojson'
unified_data_path = './data/enhanced_unified_data_with_residual.geojson'
flow_maps_path = './data/time_varying_flows.csv'
weights_data_path = './data/transformed_spatial_weights.json'
output_path = './data/preprocessed_yemen_market_data.json'

# Load files
with open(geo_boundaries_path, 'r') as f:
    geo_boundaries_data = json.load(f)
with open(unified_data_path, 'r') as f:
    unified_data = json.load(f)
flow_maps_data = pd.read_csv(flow_maps_path)
with open(weights_data_path, 'r') as f:
    weights_data = json.load(f)

# Time Series Processing Function
def process_time_series_data(features, selected_commodity=None):
    monthly_data = defaultdict(lambda: {"prices": [], "conflict_intensity": [], "usdPrices": [], "count": 0})
    
    for feature in features:
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].lower() != selected_commodity.lower():
            continue
        date_str = properties.get("date")
        if not date_str:
            continue

        date = datetime.strptime(date_str, "%Y-%m-%d")
        month = date.strftime("%Y-%m")
        
        monthly_data[month]["prices"].append(properties.get("price", np.nan))
        monthly_data[month]["conflict_intensity"].append(properties.get("conflict_intensity", np.nan))
        monthly_data[month]["usdPrices"].append(properties.get("usdprice", np.nan))
        monthly_data[month]["count"] += 1

    time_series_output = []
    for month, data in monthly_data.items():
        clean_prices = [p for p in data["prices"] if not np.isnan(p)]
        avg_price = np.mean(clean_prices) if clean_prices else np.nan
        avg_conflict_intensity = np.mean([c for c in data["conflict_intensity"] if not np.isnan(c)]) if data["conflict_intensity"] else np.nan
        avg_usd_price = np.mean([u for u in data["usdPrices"] if not np.isnan(u)]) if data["usdPrices"] else np.nan
        volatility = (np.std(clean_prices) / avg_price * 100) if avg_price else np.nan

        time_series_output.append({
            "month": month,
            "avgPrice": avg_price,
            "volatility": volatility,
            "avgConflictIntensity": avg_conflict_intensity,
            "avgUsdPrice": avg_usd_price,
            "sampleSize": data["count"]
        })

    return time_series_output

# Market Shock Detection Function
def detect_market_shocks(features, selected_commodity, threshold=0.15):
    grouped_features = defaultdict(list)

    for feature in features:
        properties = feature["properties"]
        if properties.get("commodity").lower() == selected_commodity.lower():
            region = properties["admin1"]
            grouped_features[region].append(properties)

    shocks = []
    for region, properties in grouped_features.items():
        properties = sorted(properties, key=lambda x: x["date"])
        for i in range(1, len(properties)):
            prev_price = properties[i - 1].get("price")
            current_price = properties[i].get("price")
            date = properties[i].get("date")

            if prev_price and current_price:
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

    def dfs(region, cluster):
        if region in visited:
            return
        visited.add(region)
        cluster.append(region)
        neighbors = weights_data.get(region, {}).get("neighbors", [])
        for neighbor in neighbors:
            if neighbor not in visited:
                dfs(neighbor, cluster)

    for region in weights_data:
        if region not in visited:
            cluster = []
            dfs(region, cluster)
            if len(cluster) >= min_cluster_size:
                clusters.append({
                    "cluster_id": len(clusters) + 1,
                    "main_market": cluster[0],
                    "connected_markets": cluster,
                    "market_count": len(cluster)
                })

    return clusters

# Preprocess data
def preprocess_data():
    commodity = 'beans (kidney red)'  # Sample commodity for preprocessing
    time_series_data = process_time_series_data(unified_data["features"], commodity)
    market_shocks = detect_market_shocks(unified_data["features"], commodity)
    market_clusters = compute_market_clusters(unified_data["features"], weights_data)

    # Compile the results into a dictionary structured for dashboard integration
    preprocessed_data = {
        "time_series_data": time_series_data,
        "market_shocks": market_shocks,
        "market_clusters": market_clusters,
        "metadata": {
            "commodity": commodity,
            "data_source": "Unified Data & Weights",
            "processed_date": datetime.now().isoformat(),
            "total_clusters": len(market_clusters)
        }
    }

    # Save the preprocessed data to a JSON file
    with open(output_path, 'w') as f:
        json.dump(preprocessed_data, f, indent=2)

# Run the preprocessing
preprocess_data()
print(f"Preprocessed data saved to {output_path}")
