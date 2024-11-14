import json
import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict
import os
import statsmodels.api as sm
from scipy import stats
from scipy.spatial.distance import pdist, squareform
from sklearn.preprocessing import StandardScaler
import geopandas as gpd
from shapely.geometry import Point, Polygon
from arch import arch_model
from statsmodels.tsa.seasonal import STL
from statsmodels.stats.diagnostic import het_breuschpagan
import logging  # Added for logging

# File paths
geo_boundaries_path = './data/geoBoundaries-YEM-ADM1.geojson'
unified_data_path = './data/enhanced_unified_data_with_residual.geojson'
flow_maps_path = './data/time_varying_flows.csv'
weights_data_path = './data/transformed_spatial_weights.json'
output_dir = './data/preprocessed_by_commodity/'

# Ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)

# Set up logging
logging.basicConfig(
    filename='preprocessing.log',
    filemode='a',
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger()

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

# Enhanced Time Series Processing with GARCH and Conflict Adjustments
def process_time_series_data(features, selected_commodity=None, smoothing=True, outlier_removal=True):
    monthly_data = defaultdict(lambda: {
        "usdPrices": [], 
        "count": 0,
        "conflict_intensity": [],
        "returns": []
    })
    
    # Calculate returns for GARCH
    for feature in features:
        properties = feature["properties"]
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
            
        date_str = properties.get("date")
        if not date_str:
            continue

        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
            month = date.strftime("%Y-%m")
            
            price = properties.get("usdprice", np.nan)
            conflict = properties.get("conflict_intensity", 0)
            
            monthly_data[month]["usdPrices"].append(price)
            monthly_data[month]["conflict_intensity"].append(conflict)
            monthly_data[month]["count"] += 1
            
        except ValueError:
            continue

    # Process monthly data with GARCH
    time_series_output = []
    months = sorted(monthly_data.keys())
    
    # Calculate returns for GARCH
    prices_series = []
    for month in months:
        avg_price = np.nanmean(monthly_data[month]["usdPrices"])
        prices_series.append(avg_price)
    
    returns = np.diff(np.log(prices_series))
    
    # Fit GARCH(1,1) model if enough data points
    if len(returns) > 30:
        garch_volatility = fit_garch_model(returns)
    else:
        garch_volatility = [np.std(returns)] * len(returns)

    # Process each month
    for i, month in enumerate(months):
        data = monthly_data[month]
        clean_prices = [p for p in data["usdPrices"] if not pd.isna(p)]
        avg_conflict = np.mean(data["conflict_intensity"]) if data["conflict_intensity"] else 0
        
        if clean_prices:
            avg_usd_price = np.mean(clean_prices)
            basic_volatility = np.std(clean_prices) / avg_usd_price * 100
            
            # Adjust volatility based on conflict intensity
            conflict_adjustment = 1 + (avg_conflict / 100)
            adjusted_volatility = basic_volatility * conflict_adjustment
            
            # Add GARCH volatility if available
            garch_vol = garch_volatility[i-1] if i > 0 and i <= len(garch_volatility) else np.nan
            
            time_series_output.append({
                "month": month,
                "avgUsdPrice": avg_usd_price,
                "volatility": adjusted_volatility,
                "garch_volatility": garch_vol * 100,  # Convert to percentage
                "conflict_intensity": avg_conflict,
                "sampleSize": data["count"],
                "price_stability": calculate_price_stability(clean_prices, avg_conflict)
            })

    return time_series_output

def fit_garch_model(returns):
    try:
        # Remove NaN values
        returns = returns[~np.isnan(returns)]
        
        # Fit GARCH(1,1) model
        model = arch_model(returns, vol='Garch', p=1, q=1)
        results = model.fit(disp='off')
        
        # Get conditional volatility
        return results.conditional_volatility
    except:
        # Fallback to rolling standard deviation if GARCH fitting fails
        return pd.Series(returns).rolling(window=5).std().values

def calculate_price_stability(prices, conflict_intensity):
    """
    Calculate price stability score adjusted for conflict
    Returns a score between 0 (unstable) and 1 (stable)
    """
    if len(prices) < 2:
        return 0
        
    # Calculate coefficient of variation
    cv = np.std(prices) / np.mean(prices)
    
    # Calculate price jumps
    returns = np.diff(np.log(prices))
    jump_threshold = np.std(returns) * 2
    jump_count = np.sum(np.abs(returns) > jump_threshold)
    
    # Calculate stability score
    base_stability = 1 / (1 + cv)
    jump_penalty = jump_count / len(prices)
    conflict_penalty = conflict_intensity / 100
    
    stability = base_stability * (1 - jump_penalty) * (1 - conflict_penalty)
    return np.clip(stability, 0, 1)

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

# Enhanced Spatial Autocorrelation Analysis
def compute_spatial_autocorrelation(weights_data, features, selected_commodity=None):
    """Enhanced spatial autocorrelation analysis with local indicators"""
    if not isinstance(features, list):
        raise ValueError("Expected 'features' to be a list of feature dictionaries.")
    
    # Extract prices and locations
    prices = []
    regions = []
    coordinates = []
    
    for feature in features:
        properties = feature["properties"]
        geometry = feature.get("geometry", {})
        
        if selected_commodity and properties["commodity"].strip().lower() != selected_commodity:
            continue
            
        price = properties.get("usdprice")
        region = properties.get("admin1")
        
        if pd.notna(price) and region and geometry:
            prices.append(price)
            regions.append(region)
            
            # Extract centroid coordinates
            if geometry["type"] == "Point":
                coordinates.append(geometry["coordinates"])
            elif geometry["type"] == "Polygon":
                centroid = Polygon(geometry["coordinates"][0]).centroid
                coordinates.append([centroid.x, centroid.y])

    if not prices or not regions:
        return {
            "global": {"moran_i": None, "p_value": None, "significance": False},
            "local": {},
            "hotspots": {}
        }

    # Create spatial weights matrix
    weights_matrix = create_spatial_weights(regions, coordinates, weights_data)
    
    # Calculate Global Moran's I
    global_moran = calculate_global_morans_i(prices, weights_matrix)
    
    # Calculate Local Moran's I
    local_moran = calculate_local_morans_i(prices, weights_matrix)
    
    # Calculate Getis-Ord Gi* (Hot Spot Analysis)
    hotspots = calculate_getis_ord(prices, weights_matrix)
    
    return {
        "global": global_moran,
        "local": {
            region: {
                "local_i": local_i,
                "p_value": p_val,
                "cluster_type": cluster_type
            }
            for region, (local_i, p_val, cluster_type) in zip(regions, local_moran)
        },
        "hotspots": {
            region: {
                "gi_star": gi_star,
                "p_value": p_val,
                "intensity": intensity
            }
            for region, (gi_star, p_val, intensity) in zip(regions, hotspots)
        }
    }

def create_spatial_weights(regions, coordinates, weights_data):
    """Create spatial weights matrix using both distance and connectivity"""
    n = len(regions)
    W = np.zeros((n, n))
    
    # Create distance matrix
    coords_array = np.array(coordinates)
    dist_matrix = squareform(pdist(coords_array))
    
    # Combine distance and connectivity weights
    for i, region in enumerate(regions):
        neighbors = weights_data.get(region, {}).get("neighbors", [])
        for j, target in enumerate(regions):
            if target in neighbors:
                # Use inverse distance weight for connected regions
                W[i, j] = 1 / (dist_matrix[i, j] + 1)
    
    # Row-standardize weights
    row_sums = W.sum(axis=1)
    W = np.divide(W, row_sums[:, np.newaxis], where=row_sums[:, np.newaxis] != 0)
    
    return W

def calculate_global_morans_i(values, weights):
    """Calculate Global Moran's I with inference"""
    values = np.array(values)
    z_values = (values - np.mean(values)) / np.std(values)
    
    # Calculate Moran's I
    n = len(values)
    W_sum = np.sum(weights)
    
    numerator = np.sum(weights * np.outer(z_values, z_values))
    denominator = np.sum(z_values ** 2)
    
    I = (n / W_sum) * (numerator / denominator)
    
    # Calculate expected I and variance for inference
    E_I = -1 / (n - 1)
    S1 = 0.5 * np.sum((weights + weights.T) ** 2)
    S2 = np.sum((np.sum(weights, axis=0) + np.sum(weights, axis=1)) ** 2)
    
    var_I = (
        (n * S1 - n * S2 + 3 * W_sum ** 2) / 
        ((n ** 2 - 1) * W_sum ** 2) -
        E_I ** 2
    )
    
    z_score = (I - E_I) / np.sqrt(var_I)
    p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
    
    return {
        "moran_i": I,
        "p_value": p_value,
        "z_score": z_score,
        "significance": p_value < 0.05
    }

def calculate_local_morans_i(values, weights):
    """Calculate Local Moran's I statistics"""
    values = np.array(values)
    z_values = (values - np.mean(values)) / np.std(values)
    n = len(values)
    
    local_morans = []
    
    for i in range(n):
        Ii = z_values[i] * np.sum(weights[i] * z_values)
        
        # Calculate variance for inference
        m2 = np.sum(z_values ** 2) / n
        wi2_sum = np.sum(weights[i] ** 2)
        var_Ii = (wi2_sum * (n - 1) / (n - 2)) * m2
        
        z_score = Ii / np.sqrt(var_Ii)
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
        
        # Determine cluster type
        if p_value < 0.05:
            if z_values[i] > 0:
                if np.sum(weights[i] * z_values) > 0:
                    cluster_type = "high-high"
                else:
                    cluster_type = "high-low"
            else:
                if np.sum(weights[i] * z_values) > 0:
                    cluster_type = "low-low"
                else:
                    cluster_type = "low-high"
        else:
            cluster_type = "not_significant"
            
        local_morans.append((Ii, p_value, cluster_type))
    
    return local_morans

def calculate_getis_ord(values, weights):
    """Calculate Getis-Ord Gi* statistics"""
    values = np.array(values)
    n = len(values)
    hotspots = []
    
    mean_x = np.mean(values)
    std_x = np.std(values)
    
    for i in range(n):
        # Calculate Gi* statistic
        numerator = np.sum(weights[i] * values)
        denominator = std_x * np.sqrt(
            (n * np.sum(weights[i] ** 2) - np.sum(weights[i]) ** 2) / (n - 1)
        )
        
        Gi_star = (numerator - mean_x * np.sum(weights[i])) / denominator
        p_value = 2 * (1 - stats.norm.cdf(abs(Gi_star)))
        
        # Determine intensity
        if p_value < 0.05:
            if Gi_star > 0:
                intensity = "hot_spot"
            else:
                intensity = "cold_spot"
        else:
            intensity = "not_significant"
            
        hotspots.append((Gi_star, p_value, intensity))
    
    return hotspots

def calculate_enhanced_spatial_statistics(data, w, logger):
    """
    Calculate comprehensive spatial statistics including global and local indicators
    """
    try:
        # Calculate Global Moran's I with inference
        global_moran = calculate_global_morans_i(data)
        
        # Calculate Local Moran's I
        local_moran = calculate_local_morans_i(data, w)
        
        # Calculate Getis-Ord Gi* statistics
        hotspots = calculate_getis_ord(data, w)
        
        return {
            "global": {
                "moran_i": global_moran['I'],
                "p_value": global_moran['p_value'],
                "z_score": global_moran['z_score'],
                "significance": global_moran['p_value'] < 0.05
            },
            "local": local_moran,
            "hotspots": hotspots
        }
    except Exception as e:
        logger.error(f"Error calculating enhanced spatial statistics: {e}")
        raise

def calculate_seasonal_components(time_series_data, logger):
    """
    Calculate seasonal decomposition and patterns
    """
    try:
        def process_group(group):
            # Ensure data is sorted by date
            group = group.sort_values('date')
            
            # Perform STL decomposition
            stl = STL(group['usdprice'], period=12)
            result = stl.fit()
            
            seasonal_strength = 1 - np.var(result.resid) / np.var(result.seasonal + result.resid)
            
            return pd.Series({
                'seasonal_strength': seasonal_strength,
                'trend_strength': 1 - np.var(result.resid) / np.var(result.trend + result.resid),
                'peak_month': group.groupby(group['date'].dt.month)['usdprice'].mean().idxmax(),
                'trough_month': group.groupby(group['date'].dt.month)['usdprice'].mean().idxmin(),
                'seasonal_pattern': result.seasonal.tolist()
            })
        
        # Group by commodity and calculate seasonal components
        seasonal_components = (time_series_data
            .groupby('commodity')
            .apply(process_group)
            .reset_index())
        
        return seasonal_components
        
    except Exception as e:
        logger.error(f"Error calculating seasonal components: {e}")
        raise

def calculate_conflict_adjusted_metrics(time_series_data, logger):
    """
    Calculate conflict-adjusted price metrics
    """
    try:
        def adjust_for_conflict(group):
            # Calculate conflict adjustment factor
            conflict_factor = 1 + (group['conflict_intensity'] / 100)
            
            # Calculate adjusted metrics
            adjusted_price = group['usdprice'] * conflict_factor
            adjusted_volatility = group['volatility'] * conflict_factor
            
            # Calculate stability scores
            raw_stability = calculate_price_stability(group['usdprice'])
            adjusted_stability = calculate_price_stability(adjusted_price)
            
            # Identify high conflict periods
            high_conflict = group[group['conflict_intensity'] > 5]
            
            return pd.Series({
                'avg_raw_price': group['usdprice'].mean(),
                'avg_adjusted_price': adjusted_price.mean(),
                'avg_raw_volatility': group['volatility'].mean(),
                'avg_adjusted_volatility': adjusted_volatility.mean(),
                'raw_stability': raw_stability,
                'adjusted_stability': adjusted_stability,
                'high_conflict_periods': len(high_conflict),
                'avg_conflict_intensity': group['conflict_intensity'].mean(),
                'max_conflict_intensity': group['conflict_intensity'].max()
            })
        
        # Group by commodity and region
        conflict_metrics = (time_series_data
            .groupby(['commodity', 'admin1'])
            .apply(adjust_for_conflict)
            .reset_index())
            
        return conflict_metrics
        
    except Exception as e:
        logger.error(f"Error calculating conflict-adjusted metrics: {e}")
        raise

def calculate_garch_volatility(time_series_data, logger):
    """
    Calculate GARCH volatility for price series
    """
    try:
        def fit_garch(returns):
            if len(returns) < 20:  # Need sufficient observations
                return np.full(len(returns), np.nan)
                
            try:
                model = arch_model(returns, vol='Garch', p=1, q=1)
                result = model.fit(disp='off')
                return result.conditional_volatility
            except:
                return np.full(len(returns), np.nan)
        
        def process_price_series(group):
            # Calculate returns
            prices = group['usdprice']
            returns = np.log(prices) - np.log(prices.shift(1))
            
            # Fit GARCH model
            garch_vol = fit_garch(returns.dropna())
            
            # Align with original dates
            vol_series = pd.Series(index=group.index)
            vol_series.iloc[1:] = garch_vol
            
            return vol_series
            
        # Calculate GARCH volatility for each commodity-region combination
        garch_results = (time_series_data
            .groupby(['commodity', 'admin1'])
            .apply(process_price_series)
            .reset_index(level=[0,1]))
            
        return garch_results
        
    except Exception as e:
        logger.error(f"Error calculating GARCH volatility: {e}")
        raise

def calculate_price_correlations(data, logger):
    """
    Calculate price correlations between different regions
    """
    try:
        # Pivot data to have regions as columns and dates as rows
        price_corr = calculate_price_correlations(data, logger)
        
        # Calculate correlation matrix
        price_data = data.pivot(index='date', columns='admin1', values='usdprice')
        price_corr = price_data.corr()
        
        return price_corr
    except Exception as e:
        logger.error(f"Error calculating price correlations: {e}")
        raise

def calculate_flow_density(flows):
    """
    Calculate the density of trade flows between regions
    """
    if not isinstance(flows, pd.DataFrame):
        raise ValueError("Expected 'flows' to be a pandas DataFrame.")
    
    total_flows = flows['flow_weight'].sum()
    num_regions = flows['source'].nunique() + flows['target'].nunique()
    
    return total_flows / num_regions

def calculate_market_accessibility(data, weights_data):
    """
    Calculate market accessibility based on spatial weights
    """
    accessibility_scores = {}
    for region in weights_data:
        neighbors = weights_data[region].get("neighbors", [])
        accessibility_scores[region] = len(neighbors)
    return accessibility_scores

def calculate_market_integration_metrics(data, weights_data, flows, logger):
    """
        accessibility = calculate_market_accessibility(data, weights_data)
    """
    try:
        # Calculate price correlation matrix
        price_corr = calculate_price_correlations(data)
        
        # Calculate trade flow density
        flow_density = calculate_flow_density(flows)
        
        # Calculate market accessibility
        accessibility = calculate_market_accessibility(data, weights_data)
        
        # Calculate integration score
        integration_score = (price_corr.mean().mean() + flow_density + np.mean(list(accessibility.values()))) / 3
        
        return {
            'price_correlation': price_corr,
            'flow_density': flow_density,
            'accessibility': accessibility,
            'integration_score': integration_score
        }
        
    except Exception as e:
        logger.error(f"Error calculating market integration metrics: {e}")
        raise

def calculate_shock_detection_enhanced(data, time_series, conflict_data, logger):
    """
    Enhanced shock detection with conflict consideration
    """
    try:
        def detect_shocks(group):
            # Calculate baseline threshold
            volatility = group['volatility'].rolling(window=12, min_periods=1).mean()
            baseline_threshold = 2 * volatility
            
            # Adjust threshold based on conflict intensity
            conflict_factor = 1 + (group['conflict_intensity'] / 100)
            adjusted_threshold = baseline_threshold * conflict_factor
            
            # Detect price changes
            price_changes = group['usdprice'].pct_change()
            
            # Identify shocks
            shocks = []
            for idx in range(1, len(group)):
                if abs(price_changes.iloc[idx]) > adjusted_threshold.iloc[idx]:
                    shocks.append({
                        'date': group.index[idx],
                        'magnitude': price_changes.iloc[idx],
                        'type': 'surge' if price_changes.iloc[idx] > 0 else 'drop',
                        'conflict_intensity': group['conflict_intensity'].iloc[idx],
                        'threshold_used': adjusted_threshold.iloc[idx]
                    })
            
            return pd.DataFrame(shocks)
        
        # Detect shocks for each commodity-region combination
        shock_results = (data
            .groupby(['commodity', 'admin1'])
            .apply(detect_shocks)
            .reset_index())
            
        return shock_results
        
    except Exception as e:
        logger.error(f"Error in enhanced shock detection: {e}")
        raise

def calculate_cluster_efficiency(clusters, flows, w, logger):
    """
    Calculate enhanced cluster efficiency metrics
    """
    try:
        cluster_metrics = []
        
        for cluster in clusters:
            # Calculate internal connectivity
            internal_connections = calculate_internal_connectivity(cluster, flows, weights_data)
            
            # Calculate market coverage
            coverage = len(cluster['connected_markets']) / len(w.neighbors)
            
            # Calculate price convergence within cluster
            price_convergence = calculate_price_convergence(cluster, flows, weights_data)
            
            # Calculate cluster stability
            stability = calculate_cluster_stability(cluster, flows, weights_data)
            
            cluster_metrics.append({
                'cluster_id': cluster['cluster_id'],
                'internal_connectivity': internal_connections,
                'market_coverage': coverage,
                'price_convergence': price_convergence,
                'stability': stability,
                'efficiency_score': (internal_connections + coverage + price_convergence + stability) / 4
            })
            
        return pd.DataFrame(cluster_metrics)
        
    except Exception as e:
        logger.error(f"Error calculating cluster efficiency: {e}")
        raise

def calculate_internal_connectivity(cluster, flows, weights_data):
    """
    Calculate the internal connectivity of a cluster based on trade flows and spatial weights
    """
    internal_connections = 0
    for market in cluster['connected_markets']:
        neighbors = weights_data.get(market, {}).get("neighbors", [])
        for neighbor in neighbors:
            if neighbor in cluster['connected_markets']:
                internal_connections += 1
    return internal_connections

def calculate_price_convergence(cluster, flows, weights_data):
    """
    Calculate the price convergence within a cluster based on trade flows and spatial weights
    """
    prices = []
    for market in cluster['connected_markets']:
        market_flows = flows[(flows['source'] == market) | (flows['target'] == market)]
        market_prices = market_flows['price_differential'].tolist()
        prices.extend(market_prices)
    
    if not prices:
        return 0
    
    return np.std(prices) / np.mean(prices)

def calculate_cluster_stability(cluster, flows, weights_data):
    """
    Calculate the stability of a cluster based on trade flows and spatial weights
    """
    stability_scores = []
    for market in cluster['connected_markets']:
        market_flows = flows[(flows['source'] == market) | (flows['target'] == market)]
        market_prices = market_flows['price_differential'].tolist()
        if market_prices:
            stability_scores.append(np.std(market_prices) / np.mean(market_prices))
    if not stability_scores:
        return 0
    return np.mean(stability_scores)

# Define save_preprocessed_data function
def save_preprocessed_data(preprocessed_data, commodity, output_dir, logger):
    """
    Saves the preprocessed data to a JSON file.

    Parameters:
    - preprocessed_data (dict): The data to save.
    - commodity (str): The commodity name.
    - output_dir (str): Directory where the file will be saved.
    - logger (logging.Logger): Logger for logging information.
    """
    try:
        sanitized_commodity = commodity.replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').lower()
        output_file = f"preprocessed_yemen_market_data_{sanitized_commodity}.json"
        output_path = os.path.join(output_dir, output_file)
        with open(output_path, 'w') as f:
            json.dump(preprocessed_data, f, indent=2, default=str)
        logger.info(f"Preprocessed data for '{commodity}' saved to '{output_path}'.")
    except Exception as e:
        logger.error(f"Failed to save preprocessed data for '{commodity}': {e}")

# Preprocess data per commodity
def preprocess_data_per_commodity():
    commodities = get_unique_commodities(unified_data["features"])
    logger.info(f"Found {len(commodities)} unique commodities.")

    for commodity in commodities:
        logger.info(f"Processing commodity: {commodity}")
        
        try:
            # Get processed features
            processed_features = process_spatial_data(unified_data["features"], selected_commodity=commodity)
            
            # Calculate enhanced spatial statistics
            spatial_stats = calculate_enhanced_spatial_statistics(
                processed_features, 
                weights_data,
                logger
            )
            
            # Calculate seasonal components
            seasonal_components = calculate_seasonal_components(
                processed_features,
                logger
            )
            
            # Calculate conflict-adjusted metrics
            conflict_metrics = calculate_conflict_adjusted_metrics(
                processed_features,
                logger
            )
            
            # Calculate GARCH volatility
            garch_volatility = calculate_garch_volatility(
                processed_features,
                logger
            )
            
            # Calculate market integration metrics
            market_integration = calculate_market_integration_metrics(
                processed_features,
                weights_data,
                flow_maps_data,
                logger
            )
            
            # Enhanced shock detection
            market_shocks = calculate_shock_detection_enhanced(
                processed_features,
                time_series_data=None,  # Adjust based on your actual data flow
                conflict_data=None,     # Adjust based on your actual data flow
                logger=logger
            )
            
            # Calculate cluster efficiency
            market_clusters = compute_market_clusters(processed_features, weights_data)
            cluster_efficiency = calculate_cluster_efficiency(
                market_clusters,
                flow_maps_data,
                weights_data,
                logger
            )

            # Combine all analysis results
            preprocessed_data = {
                "time_series_data": process_time_series_data(
                    processed_features, 
                    selected_commodity=commodity,
                    garch_volatility=garch_volatility
                ),
                "market_shocks": market_shocks,
                "market_clusters": compute_market_clusters(
                    processed_features, 
                    weights_data,
                    cluster_efficiency
                ),
                "flow_analysis": analyze_flows(flow_maps_data, selected_commodity=commodity),
                "spatial_autocorrelation": spatial_stats,
                "seasonal_analysis": seasonal_components,
                "conflict_adjusted_metrics": conflict_metrics,
                "market_integration": market_integration,
                "metadata": {
                    "commodity": commodity.title(),
                    "data_source": "Unified Data & Weights",
                    "processed_date": datetime.now().isoformat(),
                    "total_clusters": len(market_clusters),
                    "analysis_parameters": {
                        "garch_parameters": {"p": 1, "q": 1},
                        "spatial_weights": "distance_connectivity_hybrid",
                        "significance_level": 0.05,
                        "seasonal_adjustment": True,
                        "conflict_adjustment": True
                    }
                }
            }

            # Save processed data
            save_preprocessed_data(preprocessed_data, commodity, output_dir, logger)

        except Exception as e:
            logger.error(f"Error processing commodity '{commodity}': {e}")
            continue

# Run the preprocessing for each commodity
if __name__ == "__main__":
    preprocess_data_per_commodity()
    logger.info("All commodities have been processed and saved.")
    print("All commodities have been processed and saved.")