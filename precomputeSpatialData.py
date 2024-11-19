#preprocess_data_per_commodity.py

import json
import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict
import os
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import acf
from arch import arch_model

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
    monthly_data = defaultdict(lambda: {"usdPrices": [], "count": 0, "conflict_intensities": []})
    
    for feature in features:
        if not isinstance(feature, dict) or "properties" not in feature:
            raise ValueError("Each feature must be a dictionary with a 'properties' key.")
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
        date_str = properties.get("date")
        if not date_str:
            continue

        # Adjusted date parsing to handle both formats
        date_formats = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"]
        for fmt in date_formats:
            try:
                date = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        else:
            print(f"Warning: Skipping feature with invalid date format - {date_str}")
            continue  # Skip invalid date formats

        month = date.strftime("%Y-%m")
        
        usd_price = properties.get("usdprice", np.nan)
        conflict_intensity = properties.get("conflict_intensity", np.nan)

        monthly_data[month]["usdPrices"].append(usd_price)
        monthly_data[month]["conflict_intensities"].append(conflict_intensity)
        monthly_data[month]["count"] += 1

    time_series_output = []
    months = sorted(monthly_data.keys())
    prices_series = []
    sample_sizes = []
    for month in months:
        data = monthly_data[month]
        clean_prices = [p for p in data["usdPrices"] if not pd.isna(p)]
        clean_conflict = [c for c in data["conflict_intensities"] if not pd.isna(c)]
        avg_usd_price = np.mean(clean_prices) if clean_prices else np.nan
        avg_conflict_intensity = np.mean(clean_conflict) if clean_conflict else np.nan
        volatility = (np.std(clean_prices) / avg_usd_price * 100) if avg_usd_price else np.nan

        prices_series.append(avg_usd_price)
        sample_sizes.append(data["count"])
        time_series_output.append({
            "month": month,
            "avgUsdPrice": avg_usd_price,
            "volatility": volatility,
            "sampleSize": data["count"],
            "conflict_intensity": avg_conflict_intensity
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

    # Compute GARCH volatility
    garch_volatility = compute_garch_volatility(prices_series)
    for i, entry in enumerate(time_series_output):
        entry["garch_volatility"] = garch_volatility[i]

    # Compute price stability
    price_stability = compute_price_stability(prices_series)
    for i, entry in enumerate(time_series_output):
        entry["price_stability"] = price_stability[i]

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

def compute_garch_volatility(prices):
    log_returns = np.diff(np.log(prices))
    if len(log_returns) < 10:  # Need sufficient data points
        return [np.nan] * len(prices)
    model = arch_model(log_returns, p=1, q=1)
    res = model.fit(disp='off')
    vol = res.conditional_volatility
    # Align with the original prices length
    vol = [np.nan] + vol.tolist()
    vol = [np.nan] + vol  # Adding another nan to align
    while len(vol) < len(prices):
        vol.append(np.nan)
    return vol

def compute_price_stability(prices):
    price_series = pd.Series(prices)
    rolling_std = price_series.rolling(window=3, min_periods=1, center=True).std()
    stability = 1 / (rolling_std + 1e-6)
    return stability.tolist()

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
            region = properties.get("region_id") or properties.get("admin1")  # Adjusted to handle both keys
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

    for feature in features:
        properties = feature["properties"]
        region = properties.get("region_id") or properties.get("admin1")
        if region and region not in visited:
            cluster = iterative_dfs(region)
            if len(cluster) >= min_cluster_size:
                clusters.append({
                    "cluster_id": len(clusters) + 1,
                    "main_market": cluster[0],
                    "connected_markets": cluster,
                    "market_count": len(cluster)
                })

    return clusters

# Cluster Efficiency Function
def compute_cluster_efficiency(clusters, flow_data, price_data):
    cluster_efficiency = []
    for cluster in clusters:
        cluster_id = cluster['cluster_id']
        markets = cluster['connected_markets']
        internal_flows = flow_data[(flow_data['source'].isin(markets)) & (flow_data['target'].isin(markets))]
        internal_connectivity = internal_flows['flow_weight'].sum()

        market_coverage = len(markets) / len(set(flow_data['source']).union(flow_data['target']))

        # Price convergence: Standard deviation of prices within the cluster
        cluster_prices = price_data[price_data['region_id'].isin(markets)]
        price_convergence = cluster_prices.groupby('date')['usdprice'].std().mean()

        # Stability: Mean of price stability within the cluster
        price_stability = cluster_prices.groupby('region_id')['usdprice'].std().mean()

        # Efficiency score (arbitrary formula for demonstration)
        efficiency_score = (internal_connectivity * market_coverage) / (price_convergence + 1e-6)

        cluster_efficiency.append({
            "cluster_id": cluster_id,
            "internal_connectivity": internal_connectivity,
            "market_coverage": market_coverage,
            "price_convergence": price_convergence,
            "stability": price_stability,
            "efficiency_score": efficiency_score
        })

    return cluster_efficiency

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

# Spatial Autocorrelation Analysis
def compute_spatial_autocorrelation(weights_data, features, selected_commodity=None):
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    prices = {}
    regions = set()

    for feature in features:
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
        price = properties.get("usdprice")
        region = properties.get("region_id") or properties.get("admin1")
        date = properties.get("date")
        if pd.notna(price) and region and date:
            key = (region, date)
            prices[key] = price
            regions.add(region)

    if not prices or not regions:
        return {"global": None, "local": None}

    # Prepare data for spatial autocorrelation
    region_list = list(regions)
    n = len(region_list)
    W = np.zeros((n, n))

    region_index = {region: idx for idx, region in enumerate(region_list)}
    for i, region_i in enumerate(region_list):
        neighbors = weights_data.get(region_i, {}).get("neighbors", [])
        for neighbor in neighbors:
            if neighbor in region_index:
                j = region_index[neighbor]
                W[i, j] = 1

    # Average price per region
    avg_prices = {}
    for region in region_list:
        region_prices = [price for (r, _), price in prices.items() if r == region]
        avg_prices[region] = np.mean(region_prices) if region_prices else np.nan

    y = np.array([avg_prices[region] for region in region_list])

    # Handle NaN values
    valid_indices = ~np.isnan(y)
    y = y[valid_indices]
    W = W[np.ix_(valid_indices, valid_indices)]
    region_list = [region_list[i] for i in range(len(region_list)) if valid_indices[i]]

    if len(y) < 2:
        return {"global": None, "local": None}

    # Compute global Moran's I
    moran_i, p_value, z_score = compute_global_morans_i(y, W)

    # Compute local Moran's I
    local_moran = compute_local_morans_i(y, W)

    # Prepare output
    spatial_autocorrelation = {
        "global": {
            "moran_i": moran_i,
            "p_value": p_value,
            "z_score": z_score,
            "significance": p_value is not None and p_value < 0.05
        },
        "local": {
            region_list[i]: {
                "local_i": local_moran[i],
                "p_value": None,  # Placeholder
                "cluster_type": determine_cluster_type(local_moran[i])
            }
            for i in range(len(region_list))
        }
    }

    return spatial_autocorrelation

def compute_global_morans_i(y, W):
    n = len(y)
    y_mean = np.mean(y)
    y_diff = y - y_mean
    numerator = 0.0
    for i in range(n):
        for j in range(n):
            numerator += W[i, j] * y_diff[i] * y_diff[j]
    denominator = np.sum(y_diff ** 2)
    W_sum = np.sum(W)
    moran_i = (n / W_sum) * (numerator / denominator)
    # Placeholder p-value and z-score (actual computation requires permutation test)
    p_value = None
    z_score = None
    return moran_i, p_value, z_score

def compute_local_morans_i(y, W):
    n = len(y)
    y_mean = np.mean(y)
    y_diff = y - y_mean
    s2 = np.sum(y_diff ** 2) / n
    local_i = np.zeros(n)
    for i in range(n):
        local_sum = 0.0
        for j in range(n):
            local_sum += W[i, j] * y_diff[j]
        local_i[i] = (y_diff[i] / s2) * local_sum
    return local_i

def determine_cluster_type(local_i_value):
    if local_i_value > 0:
        return "high-high"
    elif local_i_value < 0:
        return "low-low"
    else:
        return "not_significant"

# Seasonal Analysis Function
def perform_seasonal_analysis(time_series_data):
    prices = [entry['avgUsdPrice'] for entry in time_series_data]
    dates = [datetime.strptime(entry['month'], '%Y-%m') for entry in time_series_data]
    if len(prices) < 24:  # Need at least two years of data for seasonal analysis
        return {}
    price_series = pd.Series(prices, index=dates)
    decomposition = seasonal_decompose(price_series, model='additive', period=12, extrapolate_trend='freq')
    seasonal_strength = 1 - (np.var(decomposition.resid)) / (np.var(decomposition.resid + decomposition.seasonal))
    trend_strength = 1 - (np.var(decomposition.resid)) / (np.var(decomposition.resid + decomposition.trend))
    peak_month = decomposition.seasonal.idxmax().month
    trough_month = decomposition.seasonal.idxmin().month
    seasonal_pattern = decomposition.seasonal.tolist()
    seasonal_analysis = {
        "seasonal_strength": seasonal_strength,
        "trend_strength": trend_strength,
        "peak_month": peak_month,
        "trough_month": trough_month,
        "seasonal_pattern": seasonal_pattern
    }
    return seasonal_analysis

# Conflict Adjusted Metrics Function
def compute_conflict_adjusted_metrics(time_series_data):
    # Placeholder implementation
    conflict_adjusted_metrics = []
    for entry in time_series_data:
        conflict_intensity = entry.get('conflict_intensity', 0)
        adjusted_price = entry['avgUsdPrice'] * (1 + conflict_intensity / 100)
        conflict_adjusted_metrics.append({
            "month": entry['month'],
            "adjusted_price": adjusted_price
        })
    return conflict_adjusted_metrics

# Market Integration Function
def compute_market_integration(flow_analysis, features):
    # Price correlation between regions
    price_data = pd.DataFrame([{
        'region_id': feature['properties'].get('region_id') or feature['properties'].get('admin1'),
        'date': feature['properties']['date'],
        'usdprice': feature['properties']['usdprice']
    } for feature in features if feature['properties'].get('usdprice') is not None])
    price_pivot = price_data.pivot_table(index='date', columns='region_id', values='usdprice')
    price_correlation = price_pivot.corr().to_dict()

    # Flow density
    regions = set(price_data['region_id'])
    total_possible_flows = len(regions) * (len(regions) - 1)
    actual_flows = len(flow_analysis)
    flow_density = actual_flows / total_possible_flows if total_possible_flows > 0 else 0

    # Accessibility (placeholder)
    accessibility = {region: 5 for region in regions}

    # Integration score (arbitrary formula)
    integration_score = flow_density * np.mean(list(accessibility.values()))

    market_integration = {
        "price_correlation": price_correlation,
        "flow_density": flow_density,
        "accessibility": accessibility,
        "integration_score": integration_score
    }
    return market_integration

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
        price_data = pd.DataFrame([{
            'region_id': f['properties'].get('region_id') or f['properties'].get('admin1'),
            'date': f['properties']['date'],
            'usdprice': f['properties']['usdprice']
        } for f in processed_features if f['properties'].get('usdprice') is not None])
        cluster_efficiency = compute_cluster_efficiency(market_clusters, flow_maps_data, price_data)
        flow_analysis = analyze_flows(flow_maps_data, selected_commodity=commodity)
        spatial_autocorrelation = compute_spatial_autocorrelation(weights_data, processed_features, selected_commodity=commodity)
        seasonal_analysis = perform_seasonal_analysis(time_series_data)
        conflict_adjusted_metrics = compute_conflict_adjusted_metrics(time_series_data)
        market_integration = compute_market_integration(flow_analysis, processed_features)

        preprocessed_data = {
            "time_series_data": time_series_data,
            "market_shocks": market_shocks,
            "market_clusters": market_clusters,
            "cluster_efficiency": cluster_efficiency,
            "flow_analysis": flow_analysis,
            "spatial_autocorrelation": spatial_autocorrelation,
            "seasonal_analysis": seasonal_analysis,
            "conflict_adjusted_metrics": conflict_adjusted_metrics,
            "market_integration": market_integration,
            "metadata": {
                "commodity": commodity.title(),  # Capitalize for readability
                "data_source": "Unified Data & Weights",
                "processed_date": datetime.now().isoformat(),
                "analysis_parameters": {
                    "garch_parameters": {"p": 1, "q": 1},
                    "spatial_weights": "distance_connectivity_hybrid",
                    "significance_level": 0.05
                }
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