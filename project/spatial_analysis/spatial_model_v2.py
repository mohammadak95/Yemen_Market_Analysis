# project/spatial_analysis/spatial_model_v2.py

import os
import sys
import logging
import json
import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_squared_error
from scipy import stats
from statsmodels.stats.outliers_influence import variance_inflation_factor
from libpysal.weights import KNN
from esda.moran import Moran
import warnings

# Suppress non-critical warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="urllib3.*")

def load_config(config_path):
    """
    Load the YAML configuration file.
    """
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        sys.exit(1)

def setup_logging(logs_dir, log_level, log_format):
    """
    Set up logging configuration.
    """
    logs_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=log_level.upper(),
        format=log_format,
        handlers=[
            logging.FileHandler(logs_dir / "spatial_analysis.log"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    logger = logging.getLogger(__name__)
    return logger

def load_geojson(file_path, time_column, region_identifier, logger):
    """
    Load the GeoJSON data and preprocess it.
    """
    try:
        logger.info(f"Loading GeoJSON data from {file_path}.")
        gdf = gpd.read_file(file_path)
        gdf[time_column] = pd.to_datetime(gdf[time_column], errors='coerce')
        logger.debug(f"Converted '{time_column}' to datetime.")

        # Assign 'region_id' using the specified region identifier
        if region_identifier in gdf.columns:
            gdf = gdf.rename(columns={region_identifier: 'region_id'})
            logger.info(f"'region_id' column assigned using '{region_identifier}'.")
        else:
            logger.error(f"'{region_identifier}' column not found in GeoJSON data.")
            sys.exit(1)

        # Check for missing 'region_id's
        if gdf['region_id'].isnull().any():
            logger.error("Some 'region_id' values are missing. Please check the data.")
            sys.exit(1)

        # Drop duplicate rows
        initial_count = len(gdf)
        gdf = gdf.drop_duplicates()
        final_count = len(gdf)
        logger.info(f"Dropped {initial_count - final_count} duplicate rows.")

        logger.info(f"GeoJSON data loaded with {len(gdf)} records.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data from {file_path}: {e}")
        sys.exit(1)

def load_and_debug_geojson(filepath, logger):
    try:
        logger.info(f"Loading GeoJSON data from {filepath}.")
        gdf = gpd.read_file(filepath)

        # Convert date column to datetime
        gdf['date'] = pd.to_datetime(gdf['date'])
        logger.debug("Converted 'date' to datetime.")

        # Assign region_id from 'admin1'
        gdf['region_id'] = gdf['admin1']
        logger.info("'region_id' column assigned using 'admin1'.")

        # Drop duplicates
        gdf.drop_duplicates(inplace=True)
        logger.info(f"Dropped {gdf.duplicated().sum()} duplicate rows.")
        logger.info(f"GeoJSON data loaded with {len(gdf)} records.")

        # Debug: Print out the columns present in the dataset
        logger.debug(f"Columns in the dataset: {gdf.columns}")

        # Check if 'admin1' and 'commodity' exist
        if 'admin1' not in gdf.columns or 'commodity' not in gdf.columns:
            raise KeyError("Required columns 'admin1' or 'commodity' are missing from the dataset.")

        return gdf

    except KeyError as e:
        logger.error(f"Column missing in data: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data: {e}")
        sys.exit(1)

def identify_duplicates(gdf, logger):
    # Check for duplicates in the data based on 'admin1', 'commodity', and 'date'
    duplicate_entries = gdf[gdf.duplicated(subset=['admin1', 'commodity', 'date'], keep=False)]
    if not duplicate_entries.empty:
        logger.info(f"Found {len(duplicate_entries)} duplicate entries.")
        logger.debug(f"Duplicate entries:\n{duplicate_entries}")
    else:
        logger.info("No duplicate entries found.")

    return duplicate_entries

def handle_duplicates(gdf, logger):
    # Separate numeric and non-numeric columns, excluding 'admin1', 'date', and 'commodity' from non-numeric columns
    numeric_cols = gdf.select_dtypes(include=['number']).columns
    non_numeric_cols = gdf.select_dtypes(exclude=['number']).drop(['admin1', 'date', 'commodity'], axis=1).columns

    # Group by 'admin1', 'commodity', and 'date', calculate mean for numeric columns
    gdf_numeric = gdf.groupby(['admin1', 'commodity', 'date'])[numeric_cols].mean().reset_index()

    # For non-numeric columns, take the first value, excluding 'admin1', 'date', and 'commodity'
    gdf_non_numeric = gdf.groupby(['admin1', 'commodity', 'date'])[non_numeric_cols].first().reset_index()

    # Merge numeric and non-numeric data back together
    gdf = pd.merge(gdf_numeric, gdf_non_numeric, on=['admin1', 'commodity', 'date'])

    logger.info("Handled duplicates by averaging numeric columns and keeping first non-numeric values.")
    return gdf

def create_unified_regime(gdf, exchange_rate_regime_column, regimes_to_unify, new_regime_name, logger):
    """
    Create a unified regime by combining specified regimes.
    """
    try:
        unified_df = gdf[gdf[exchange_rate_regime_column].isin(regimes_to_unify)].copy()
        unified_df[exchange_rate_regime_column] = new_regime_name
        logger.info(f"Unified regime created with {len(unified_df)} records.")
        return unified_df
    except Exception as e:
        logger.error(f"Failed to create unified regime: {e}")
        sys.exit(1)

def create_spatial_weights(gdf, k, logger):
    """
    Create a spatial weights matrix using K-Nearest Neighbors.
    """
    try:
        w = KNN.from_dataframe(gdf, k=k)
        logger.debug(f"Spatial weights matrix created using KNN with k={k}.")
        return w
    except Exception as e:
        logger.error(f"Failed to create spatial weights matrix: {e}")
        raise

def save_spatial_weights(gdf, w, output_path, logger):
    """
    Save the spatial weights matrix in JSON format.
    """
    spatial_weights = {}
    try:
        for region_idx, neighbors in w.neighbors.items():
            region_id = gdf.iloc[region_idx]['region_id']
            spatial_weights[region_id] = [gdf.iloc[n]['region_id'] for n in neighbors]

        with open(output_path, 'w') as f:
            json.dump(spatial_weights, f, indent=2)
        logger.info(f"Spatial weights saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save spatial weights to '{output_path}': {e}")

def save_flow_map(gdf, w, output_path, logger):
    """
    Save flow map data in CSV format.
    """
    flow_data = []
    try:
        for region_idx, neighbors in w.neighbors.items():
            source_id = gdf.iloc[region_idx]['region_id']
            source_geom = gdf.iloc[region_idx].geometry.centroid
            for neighbor_idx in neighbors:
                target_id = gdf.iloc[neighbor_idx]['region_id']
                target_geom = gdf.iloc[neighbor_idx].geometry.centroid
                flow_data.append({
                    'source': source_id,
                    'source_lat': source_geom.y,
                    'source_lng': source_geom.x,
                    'target': target_id,
                    'target_lat': target_geom.y,
                    'target_lng': target_geom.x,
                    'weight': 1  # Assuming binary weights; adjust if weights have different meaning
                })

        pd.DataFrame(flow_data).to_csv(output_path, index=False)
        logger.info(f"Flow map saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save flow map to '{output_path}': {e}")

def save_average_prices(gdf, output_path, time_column, logger):
    """
    Save average prices for each region and date in CSV format.
    """
    try:
        average_prices = gdf.groupby(['region_id', time_column])['usdprice'].mean().reset_index().rename(columns={'usdprice': 'avg_usdprice'})
        average_prices.to_csv(output_path, index=False)
        logger.info(f"Average prices saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save average prices to '{output_path}': {e}")

def calculate_spatial_lag(gdf, w, variable, logger):
    """
    Calculate the spatial lag of a specified variable.
    """
    try:
        lag = w.sparse.dot(gdf[variable])
        logger.debug(f"Spatial lag calculated for variable '{variable}'.")
        return lag
    except Exception as e:
        logger.error(f"Failed to calculate spatial lag for '{variable}': {e}")
        raise

def run_ridge_regression(X, y, alpha, logger):
    """
    Perform Ridge regression on the provided features and target.
    """
    try:
        model = Ridge(alpha=alpha)
        model.fit(X, y)
        logger.debug("Ridge regression model fitted successfully.")
        return model
    except Exception as e:
        logger.error(f"Ridge regression failed: {e}")
        raise

def calculate_p_values(model, X, y, logger):
    """
    Calculate p-values for Ridge regression coefficients.
    Note: Ridge regression does not provide p-values directly. This is an approximation.
    """
    try:
        mse = mean_squared_error(y, model.predict(X))
        X_with_const = np.hstack([np.ones((X.shape[0], 1)), X])
        inv = np.linalg.inv(X_with_const.T @ X_with_const)
        var_b = mse * inv.diagonal()
        t_stat = model.coef_ / np.sqrt(var_b[1:])  # Exclude intercept
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stat), df=len(y) - X.shape[1] - 1))
        logger.debug("P-values calculated for Ridge regression coefficients.")
        return p_values
    except Exception as e:
        logger.error(f"Failed to calculate p-values: {e}")
        raise

def calculate_vif(X, logger):
    """
    Calculate Variance Inflation Factor (VIF) for the features to assess multicollinearity.
    """
    try:
        if X.shape[1] <= 1:
            vif_data = pd.DataFrame({
                'Variable': X.columns,
                'VIF': [1.0] * X.shape[1]
            })
            logger.debug("Single predictor detected. VIF set to 1.0.")
        else:
            vif_data = pd.DataFrame({
                'Variable': X.columns,
                'VIF': [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
            })
            logger.debug("Variance Inflation Factor (VIF) calculated successfully.")
        return vif_data
    except Exception as e:
        logger.error(f"Failed to calculate VIF: {e}")
        raise

def calculate_moran(residual, w, logger):
    """
    Calculate Moran's I statistic for spatial autocorrelation of residual.
    """
    try:
        moran = Moran(residual, w)
        logger.debug("Moran's I calculated for residual.")
        return {
            'I': moran.I,
            'p-value': moran.p_sim
        }
    except Exception as e:
        logger.error(f"Failed to calculate Moran's I: {e}")
        raise

def resample_data(gdf, frequency, time_column, logger):
    """
    Resample the GeoDataFrame to the specified frequency.
    Aggregates numeric columns using the mean and retains the first geometry per group.
    """
    try:
        logger.info(f"Resampling data to '{frequency}' frequency.")
        gdf = gdf.set_index(time_column)

        # Identify numeric columns for aggregation
        numeric_cols = gdf.select_dtypes(include=['number']).columns.tolist()
        agg_dict = {col: 'mean' for col in numeric_cols}
        agg_dict['geometry'] = 'first'

        gdf_resampled = gdf.groupby('region_id').resample(frequency).agg(agg_dict).reset_index()

        logger.info(f"Data resampled to '{frequency}' frequency.")
        return gdf_resampled
    except Exception as e:
        logger.error(f"Failed to resample data: {e}")
        sys.exit(1)

def align_frequency(gdf, frequency, time_column, logger):
    """
    Align all data to the specified frequency within each 'region' and 'commodity' group,
    filling missing periods as needed for each region, commodity, and date combination.
    """
    try:
        # Check if 'admin1' and 'commodity' columns exist
        if 'admin1' not in gdf.columns or 'commodity' not in gdf.columns:
            raise KeyError("Required columns 'admin1' or 'commodity' are missing from the dataset.")
        
        logger.info(f"Aligning data to '{frequency}' frequency by region, date, and commodity.")

        # Create an empty list to store results for each commodity and region group
        aligned_gdfs = []

        # Group data by 'admin1' (region), 'commodity', and 'date'
        for (region, commodity), group in gdf.groupby(['admin1', 'commodity']):
            logger.debug(f"Aligning data for region: {region}, commodity: {commodity}")

            # Set the index to the 'date' for resampling
            group = group.set_index(time_column).sort_index()

            # Resample the data to the desired frequency
            resampled_group = group.resample(frequency).ffill()

            # Add back the region and commodity information after alignment
            resampled_group['admin1'] = region
            resampled_group['commodity'] = commodity

            # Append the aligned group to the results list
            aligned_gdfs.append(resampled_group.reset_index())

        # Concatenate all aligned data into a single DataFrame
        aligned_gdf = pd.concat(aligned_gdfs, ignore_index=True)

        logger.info(f"Data aligned to '{frequency}' frequency.")
        return aligned_gdf

    except KeyError as e:
        logger.error(f"Column missing in data: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to align data frequency: {e}")
        sys.exit(1)

def run_spatial_analysis(gdf, commodity, regime, params, logger):
    """
    Perform spatial analysis for a specific commodity and exchange rate regime.
    """
    try:
        # Subset the data for the given commodity and regime
        gdf_subset = gdf[
            (gdf['commodity'].str.lower() == commodity.lower()) & 
            (gdf[params['exchange_rate_regime_column']].str.lower() == regime.lower())
        ].copy()

        if len(gdf_subset) < params['min_regions']:
            logger.warning(f"Insufficient observations for '{commodity}' in '{regime}' regime. Skipping.")
            return None

        # Ensure data is sorted by region and time
        gdf_subset = gdf_subset.sort_values(['region_id', params['time_column']])

        # Create spatial weights
        w = create_spatial_weights(gdf_subset, params['initial_k'], logger)

        # Calculate spatial lag of 'usdprice'
        gdf_subset['spatial_lag_price'] = calculate_spatial_lag(gdf_subset, w, 'usdprice', logger)

        # Define independent variables and dependent variable
        X = gdf_subset[['spatial_lag_price']]
        y = gdf_subset['usdprice']

        # Handle missing values by imputing with median
        imputer = SimpleImputer(strategy='median')
        X_imputed = imputer.fit_transform(X)
        X = pd.DataFrame(X_imputed, columns=X.columns, index=X.index)
        logger.debug("Missing values imputed using median strategy.")

        # Standardize the features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
        logger.debug("Features standardized using StandardScaler.")

        # Run Ridge regression
        model = run_ridge_regression(X_scaled, y, params['ridge_alpha'], logger)

        # Calculate additional metrics
        p_values = calculate_p_values(model, X_scaled, y, logger)
        vif = calculate_vif(X, logger)
        residual = y - model.predict(X_scaled)
        moran_i = calculate_moran(residual, w, logger)

        # Prepare the residual DataFrame
        residual_df = gdf_subset[['region_id', params['time_column']]].copy()
        residual_df['residual'] = residual

        # Prepare the results dictionary
        results = {
            'commodity': commodity,
            'regime': regime,
            'coefficients': dict(zip(X.columns, model.coef_)),
            'intercept': model.intercept_,
            'p_values': dict(zip(X.columns, p_values)),
            'r_squared': model.score(X_scaled, y),
            'adj_r_squared': 1 - (1 - model.score(X_scaled, y)) * (len(y) - 1) / (len(y) - X_scaled.shape[1] - 1),
            'mse': mean_squared_error(y, model.predict(X_scaled)),
            'vif': vif.to_dict('records'),
            'moran_i': moran_i,
            'observations': len(y),
            'residual': residual_df.to_dict(orient='records')  # List of dicts with 'region_id', 'date', 'residual'
        }

        logger.info(f"Spatial analysis completed for '{commodity}' in '{regime}' regime.")
        return results
    except Exception as e:
        logger.error(f"Error in spatial analysis for '{commodity}' in '{regime}': {e}")
        return None

def process_commodity_regime(args):
    """
    Wrapper function to process a single commodity-regime combination.
    """
    gdf, commodity, regime, params, logger = args
    return run_spatial_analysis(gdf, commodity, regime, params, logger)

def aggregate_residuals(results, time_column, logger):
    """
    Aggregate residuals from all analysis results.
    """
    try:
        residual_list = []
        for r in results:
            commodity = r['commodity']
            regime = r['regime']
            for res in r['residual']:
                residual_list.append({
                    'region_id': res['region_id'],
                    time_column: res[time_column],
                    'commodity': commodity,
                    'regime': regime,
                    'residual': res['residual']
                })

        residual_df = pd.DataFrame(residual_list)

        # Aggregate residual by taking the mean to ensure uniqueness
        residual_agg = residual_df.groupby(['region_id', time_column, 'commodity', 'regime']).agg({
            'residual': 'mean'
        }).reset_index()

        logger.info("Residuals aggregated successfully.")
        return residual_agg
    except Exception as e:
        logger.error(f"Failed to aggregate residuals: {e}")
        raise

def simplify_geometries(gdf, tolerance, logger):
    """
    Simplify geometries to reduce GeoJSON size.
    """
    try:
        logger.info("Simplifying geometries to reduce GeoJSON size.")
        gdf['geometry'] = gdf['geometry'].simplify(tolerance=tolerance, preserve_topology=True)
        logger.info("Geometries simplified successfully.")
    except Exception as e:
        logger.error(f"Failed to simplify geometries: {e}")

def optimize_data_types(gdf, logger):
    """
    Optimize data types for memory efficiency.
    """
    try:
        logger.info("Optimizing data types for memory efficiency.")
        # Downcast float columns
        float_cols = gdf.select_dtypes(include=['float64']).columns
        gdf[float_cols] = gdf[float_cols].astype('float32')

        # Downcast integer columns
        int_cols = gdf.select_dtypes(include=['int64']).columns
        gdf[int_cols] = gdf[int_cols].astype('int32')

        logger.info("Data types optimized successfully.")
    except Exception as e:
        logger.error(f"Failed to optimize data types: {e}")

def select_essential_columns(gdf, required_columns, logger):
    """
    Select essential columns for the final GeoJSON.
    """
    try:
        logger.info("Selecting essential columns for the final GeoJSON.")
        missing_columns = [col for col in required_columns if col not in gdf.columns]
        if missing_columns:
            logger.warning(f"The following required columns are missing and will be filled with default values: {missing_columns}")
            for col in missing_columns:
                if col in ['usdprice', 'conflict_intensity']:
                    gdf[col] = np.nan  # Assign NaN for missing numerical columns
                elif col in ['commodity', 'regime']:
                    gdf[col] = 'Unknown'  # Assign 'Unknown' for missing categorical columns
                elif col == 'residual':
                    gdf[col] = 0  # Assign 0 for missing residual

        # Ensure 'residual' is numeric
        gdf['residual'] = pd.to_numeric(gdf['residual'], errors='coerce').fillna(0)

        # Select columns
        gdf_final = gdf[required_columns].copy()
        logger.info("Essential columns selected.")

        return gdf_final
    except Exception as e:
        logger.error(f"Failed to select essential columns: {e}")
        raise

def save_enhanced_geojson(gdf, output_path, logger):
    """
    Save the modified GeoDataFrame with residuals to a new GeoJSON file.
    """
    try:
        logger.info(f"Saving enhanced GeoJSON to '{output_path}'.")
        gdf.to_file(output_path, driver='GeoJSON')
        logger.info(f"Enhanced GeoJSON saved successfully.")
    except Exception as e:
        logger.error(f"Failed to save enhanced GeoJSON to '{output_path}': {e}")

def save_analysis_results(results, output_path, logger):
    """
    Save the analysis results to a JSON file.
    """
    try:
        # Convert Timestamps to strings
        def convert_timestamps(obj):
            if isinstance(obj, pd.Timestamp):
                return obj.isoformat()
            if isinstance(obj, dict):
                return {k: convert_timestamps(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [convert_timestamps(i) for i in obj]
            return obj

        results_with_str_timestamps = convert_timestamps(results)

        # Save results to JSON
        with open(output_path, 'w') as f:
            json.dump(results_with_str_timestamps, f, indent=4)
        logger.info(f"Results saved to {output_path}.")

        # Validate that residuals are present
        residuals_present = any(
            analysis.get('residual') for analysis in results_with_str_timestamps
        )
        if residuals_present:
            logger.info("Residuals are present in the analysis results.")
        else:
            logger.warning("No residuals found in the analysis results.")
    
    except Exception as e:
        logger.error(f"Failed to save results to '{output_path}': {e}")

def main():
    # Load configuration
    CONFIG_PATH = Path("project/config/config.yaml")
    config = load_config(CONFIG_PATH)

    # Extract configurations
    DATA_DIR = Path(config['directories']['data_dir'])
    PROCESSED_DATA_DIR = Path(config['directories']['processed_data_dir'])
    RESULTS_DIR = Path(config['directories']['results_dir'])
    LOGS_DIR = Path(config['directories']['logs_dir'])
    EXTERNAL_DATA_DIR = Path(config['directories']['external_data_dir'])

    FILES = config['files']
    SPATIAL_GEOJSON = Path(FILES['spatial_geojson'])
    ENHANCED_GEOJSON = PROCESSED_DATA_DIR / "enhanced_unified_data_with_residual.geojson"
    SPATIAL_ANALYSIS_RESULTS = Path(FILES['spatial_analysis_results'])
    SPATIAL_WEIGHTS_JSON = RESULTS_DIR / "spatial_weights" / "spatial_weights.json"
    NATURALEARTH_LOWRES = Path(FILES['naturalearth_lowres'])

    PARAMS = config['parameters']
    FREQUENCY = PARAMS.get('frequency', 'M')  # Default to monthly if not specified

    LOGGING_CONFIG = config['logging']
    LOG_LEVEL = LOGGING_CONFIG.get('level', 'INFO')
    LOG_FORMAT = LOGGING_CONFIG.get('format', '%(asctime)s - %(levelname)s - %(message)s')

    # Setup logging
    logger = setup_logging(LOGS_DIR, LOG_LEVEL, LOG_FORMAT)

    # Ensure necessary output directories exist
    for directory in [
        RESULTS_DIR / "ecm",
        RESULTS_DIR / "spatial_weights",
        RESULTS_DIR / "choropleth_data",
        RESULTS_DIR / "network_data",
        PROCESSED_DATA_DIR
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    # Step 1: Load the GeoJSON data
    gdf = load_and_debug_geojson("project/data/processed/unified_data.geojson", logger)

    # Identify duplicates
    duplicate_entries = identify_duplicates(gdf, logger)

    # Handle duplicates (e.g., averaging or removing)
    if not duplicate_entries.empty:
        gdf = handle_duplicates(gdf, logger)

    # Proceed with data alignment

    # Step 2: Resample or align frequency
    gdf = align_frequency(gdf, FREQUENCY, PARAMS['time_column'], logger)

    # Step 3: Create the unified regime
    unified_df = create_unified_regime(
        gdf,
        PARAMS['exchange_rate_regime_column'],
        PARAMS['regimes_to_unify'],
        PARAMS['new_regime_name'],
        logger
    )

    ### NEW STEP: Only keep the unified regime ###
    gdf = unified_df.copy()
    logger.info(f"Working exclusively with the unified regime: {PARAMS['new_regime_name']}")

    # Step 4: Prepare arguments for parallel processing
    unique_combinations = gdf[['commodity']].drop_duplicates()

    logger.info(f"Found {len(unique_combinations)} unique commodities for the unified regime.")

    args_list = [
        (gdf, row['commodity'], PARAMS['new_regime_name'], PARAMS, logger)
        for _, row in unique_combinations.iterrows()
    ]

    # Step 5: Run spatial analysis in parallel
    results = []
    max_workers = os.cpu_count() - 1 if os.cpu_count() > 1 else 1  # Reserve one core
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_args = {executor.submit(run_spatial_analysis, *args): args for args in args_list}
        for future in as_completed(future_to_args):
            args = future_to_args[future]
            commodity = args[1]
            try:
                result = future.result()
                if result is not None:
                    results.append(result)
            except Exception as exc:
                logger.error(f"Analysis for '{commodity}' in unified regime generated an exception: {exc}")

    # Step 6: Aggregate residuals
    if results:
        residual_agg = aggregate_residuals(results, PARAMS['time_column'], logger)

        # Merge aggregated residual into gdf
        gdf_merged = gdf.merge(
            residual_agg,
            on=['region_id', PARAMS['time_column'], 'commodity'],
            how='left'
        )

        # Convert merged DataFrame to GeoDataFrame
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

        # Replace NaN residual with 0 or another appropriate value
        gdf_merged['residual'] = gdf_merged['residual'].fillna(0)

        # Verify the merge
        original_count = len(gdf)
        merged_count = len(gdf_merged)
        if original_count != merged_count:
            logger.warning(f"Record count mismatch: {original_count} vs {merged_count}")
        duplicates = gdf_merged.duplicated(subset=['region_id', PARAMS['time_column'], 'commodity', 'regime']).sum()
        if duplicates > 0:
            logger.warning(f"There are {duplicates} duplicate residual entries after aggregation.")
        else:
            logger.info("No duplicate residual entries found after aggregation.")
    else:
        logger.error("No residual to process.")
        gdf_merged = gdf.copy()
        gdf_merged['residual'] = np.nan
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

    # Step 7: Simplify geometries and optimize data types
    simplify_geometries(gdf_merged, tolerance=0.01, logger=logger)
    optimize_data_types(gdf_merged, logger)

    # Step 8: Select essential columns for the final GeoJSON
    required_columns = [
        'region_id', PARAMS['time_column'], 'usdprice', 
        'conflict_intensity', 'residual', 'commodity', 'regime', 'geometry'
    ]
    gdf_final = select_essential_columns(gdf_merged, required_columns, logger)

    # Step 9: Save the modified GeoDataFrame with residuals to a new GeoJSON file
    save_enhanced_geojson(gdf_final, ENHANCED_GEOJSON, logger)

    # Step 10: Save spatial weights, flow maps, and average prices
    try:
        # Create spatial weights for the entire dataset
        w_full = create_spatial_weights(gdf_final, PARAMS['initial_k'], logger)
        save_spatial_weights(gdf_final, w_full, SPATIAL_WEIGHTS_JSON, logger)
    except Exception as e:
        logger.error(f"Failed to save spatial weights: {e}")

    try:
        save_flow_map(gdf_final, w_full, RESULTS_DIR / "network_data" / "flow_maps.csv", logger)
    except Exception as e:
        logger.error(f"Failed to save flow maps: {e}")

    try:
        save_average_prices(gdf_final, RESULTS_DIR / "choropleth_data" / "average_prices.csv", PARAMS['time_column'], logger)
    except Exception as e:
        logger.error(f"Failed to save average prices: {e}")

    # Step 11: Save the analysis results to JSON
    save_analysis_results(results, SPATIAL_ANALYSIS_RESULTS, logger)

    logger.info("Spatial analysis pipeline completed successfully.")

if __name__ == "__main__":
    main()