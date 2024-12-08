# project/market_integration_index/compute_tv_mii.py

import pandas as pd
import numpy as np
import geopandas as gpd
import logging
import yaml
from pathlib import Path
from statsmodels.tsa.seasonal import seasonal_decompose
from sklearn.preprocessing import MinMaxScaler
import concurrent.futures
import os
from itertools import combinations
from statsmodels.tsa.statespace.mlemodel import MLEModel

# Define a top-level variable for frequency
GLOBAL_FREQUENCY = 'ME'


def load_config(config_path):
    """
    Load configuration from a YAML file.
    """
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except FileNotFoundError:
        logging.error(f"Configuration file not found at: {config_path}")
        raise
    except yaml.YAMLError as e:
        logging.error(f"Error parsing YAML file: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error loading configuration: {e}")
        raise


def setup_logging(log_level, log_format, log_file_path):
    """
    Set up logging with the specified level, format, and log file path.
    """
    try:
        # Ensure the log directory exists
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Remove all handlers associated with the root logger object.
        for handler in logging.root.handlers[:]:
            logging.root.removeHandler(handler)
        
        # Set up logging to file and console
        logging.basicConfig(
            level=getattr(logging, log_level.upper(), logging.INFO),
            format=log_format,
            handlers=[
                logging.FileHandler(log_file_path),
                logging.StreamHandler()
            ]
        )
        logging.debug("Logging setup completed.")
    except Exception as e:
        logging.error(f"Error setting up logging: {e}")
        raise


def load_data(geojson_path):
    """
    Load data from a GeoJSON file using GeoPandas.
    """
    try:
        logging.info("Loading data from GeoJSON file.")
        data = gpd.read_file(geojson_path)
        logging.info(f"Data loaded successfully. Number of rows: {len(data)}")
        return data
    except FileNotFoundError:
        logging.error(f"GeoJSON file not found at: {geojson_path}")
        raise
    except Exception as e:
        logging.error(f"Error loading GeoJSON data: {e}")
        raise


def preprocess_data(data, commodities, date_column):
    """
    Preprocess the data by converting dates, sorting, and filtering.
    """
    try:
        logging.info("Starting data preprocessing.")
        # Convert date field to datetime
        data[date_column] = pd.to_datetime(data[date_column], errors='coerce')
        if data[date_column].isnull().any():
            logging.warning("Some dates could not be converted and are set as NaT.")

        # Ensure data is sorted by date
        data = data.sort_values(date_column)
        logging.debug(f"Data sorted by {date_column}.")

        # Drop 'unified' regime
        if 'exchange_rate_regime' in data.columns:
            initial_length = len(data)
            data = data[data['exchange_rate_regime'] != 'unified']
            logging.debug(f"Dropped 'unified' exchange_rate_regime. Rows reduced from {initial_length} to {len(data)}.")
        else:
            logging.warning("'exchange_rate_regime' column not found in data.")

        # Filter data by commodities
        if 'commodity' in data.columns:
            initial_length = len(data)
            data = data[data['commodity'].isin(commodities)]
            logging.info(f"Filtered data by commodities. Rows reduced from {initial_length} to {len(data)}.")
        else:
            logging.warning("'commodity' column not found in data.")

        logging.info("Data preprocessing completed.")
        logging.debug(f"Preprocessed data preview:\n{data.head()}")
        return data
    except KeyError as e:
        logging.error(f"Missing expected column during preprocessing: {e}")
        raise
    except Exception as e:
        logging.error(f"Error during data preprocessing: {e}")
        raise


def fill_missing_prices(group, date_column, frequency, group_name):
    """
    Fill missing 'usdprice' values by resampling and interpolating.
    """
    try:
        logging.info(f"Filling missing prices for group: {group_name}")
        # Reset index to ensure date_column is a column
        group = group.reset_index(drop=True)
        group = group.set_index(date_column)
    
        # Handle duplicate dates by aggregating
        group = group.groupby(group.index).mean()
    
        # Resample to ensure consistent frequency
        group = group.resample(frequency).mean()
        logging.debug("Group resampled to ensure consistent frequency.")
    
        # Interpolate missing values for 'usdprice'
        if 'usdprice' in group.columns:
            group['usdprice'] = group['usdprice'].interpolate(method='time')
            logging.debug("Interpolated missing 'usdprice' values using time method.")
            # Forward/backward fill for leading/trailing NaNs
            group['usdprice'] = group['usdprice'].bfill().ffill()
            logging.debug("Applied forward/backward fill for 'usdprice'.")
        else:
            logging.warning(f"'usdprice' column not found in group: {group_name}")
    
        # Add grouping columns back
        group = group.reset_index()
        group['commodity'] = group_name[0]
        group['exchange_rate_regime'] = group_name[1]
        group['admin1'] = group_name[2]
    
        logging.info(f"Missing price filling completed for group: {group_name}")
        return group
    except Exception as e:
        logging.error(f"Error filling missing prices for group {group_name}: {e}")
        raise


def seasonal_adjustment(group, frequency):
    """
    Perform seasonal adjustment on the 'usdprice' or 'usdprice_smoothed' column.
    Handles cases where 'admin1' may not be present.
    """
    try:
        # Extract necessary information with fallbacks
        commodity = group['commodity'].iloc[0] if 'commodity' in group.columns else 'Unknown'
        regime = group['exchange_rate_regime'].iloc[0] if 'exchange_rate_regime' in group.columns else 'Unknown'
        admin1 = group['admin1'].iloc[0] if 'admin1' in group.columns else 'N/A'

        logging.info(f"Performing seasonal adjustment for {commodity} in {regime}, admin1: {admin1}.")

        logging.debug(f"Group size: {len(group)}")
        logging.debug(f"Group data:\n{group.head()}")

        # Determine period based on frequency
        if frequency == 'ME':
            period = 12  # Monthly-end data with annual seasonality
        elif frequency == 'D':
            period = 365  # Daily data with annual seasonality
        else:
            logging.warning(f"Unknown frequency '{frequency}', defaulting period to 12.")
            period = 12

        # Check if sufficient data points are available
        if len(group) < period * 2:
            logging.warning(f"Not enough data points for seasonal adjustment for {commodity} in {regime}, admin1: {admin1}. Group size: {len(group)}")
            group['usdprice_adjusted'] = group['usdprice_smoothed'] if 'usdprice_smoothed' in group.columns else group['usdprice']
            return group

        # Use 'usdprice_smoothed' if available, else 'usdprice'
        price_column = 'usdprice_smoothed' if 'usdprice_smoothed' in group.columns else 'usdprice'
        if price_column not in group.columns:
            logging.warning(f"Neither 'usdprice_smoothed' nor 'usdprice' found for seasonal adjustment in {commodity}, {regime}, admin1: {admin1}.")
            group['usdprice_adjusted'] = np.nan
            return group

        # Decompose the time series
        decomposition = seasonal_decompose(group[price_column], model='additive', period=period, extrapolate_trend='freq')
        group['usdprice_adjusted'] = group[price_column] - decomposition.seasonal
        logging.debug(f"Seasonal component removed for {commodity} in {regime}, admin1: {admin1}.")

        return group
    except Exception as e:
        # Handle cases where 'admin1' might not be set
        commodity = group['commodity'].iloc[0] if 'commodity' in group.columns else 'Unknown'
        regime = group['exchange_rate_regime'].iloc[0] if 'exchange_rate_regime' in group.columns else 'Unknown'
        admin1 = group['admin1'].iloc[0] if 'admin1' in group.columns else 'N/A'

        logging.error(f"Error during seasonal adjustment for {commodity} in {regime}, admin1: {admin1}: {e}")
        # Assign adjusted price as 'usdprice_smoothed' if available, else 'usdprice'
        group['usdprice_adjusted'] = group.get('usdprice_smoothed', group.get('usdprice', np.nan))
        return group


def smooth_prices(group, window_size=3):
    """
    Smooth the 'usdprice_adjusted' column using a rolling window.
    Handles cases where 'admin1' may not be present.
    """
    try:
        # Extract necessary information with fallbacks
        commodity = group['commodity'].iloc[0] if 'commodity' in group.columns else 'Unknown'
        regime = group['exchange_rate_regime'].iloc[0] if 'exchange_rate_regime' in group.columns else 'Unknown'

        # Check if 'admin1' exists
        if 'admin1' in group.columns:
            admin1 = group['admin1'].iloc[0]
            logging.info(f"Smoothing prices for {commodity} in {regime}, admin1: {admin1}.")
        else:
            logging.info(f"Smoothing prices for {commodity} in {regime}.")

        if 'usdprice_adjusted' not in group.columns:
            if 'admin1' in group.columns:
                logging.warning(f"'usdprice_adjusted' column not found for smoothing in {commodity}, {regime}, admin1: {admin1}.")
            else:
                logging.warning(f"'usdprice_adjusted' column not found for smoothing in {commodity}, {regime}.")
            group['usdprice_smoothed'] = np.nan
            return group

        group['usdprice_smoothed'] = group['usdprice_adjusted'].rolling(
            window=window_size, min_periods=1, center=True).mean()

        return group
    except Exception as e:
        # Handle cases where 'admin1' might not be set
        commodity = group['commodity'].iloc[0] if 'commodity' in group.columns else 'Unknown'
        regime = group['exchange_rate_regime'].iloc[0] if 'exchange_rate_regime' in group.columns else 'Unknown'
        admin1 = group['admin1'].iloc[0] if 'admin1' in group.columns else None

        if admin1:
            logging.error(f"Error during price smoothing for group {commodity} in {regime}, admin1: {admin1}: {e}")
        else:
            logging.error(f"Error during price smoothing for group {commodity} in {regime}: {e}")
        raise


class TVMIIModel(MLEModel):
    """
    State-space model for TV-MII estimation.
    """
    def __init__(self, endog):
        try:
            logging.info("Initializing TV-MII State-space model.")
            k_states = 1  # The state dimension
            k_posdef = 1  # The dimension of the state covariance matrix
            super(TVMIIModel, self).__init__(endog, k_states=k_states, k_posdef=k_posdef)
            self.ssm['design'] = np.array([[1]])
            self.ssm['transition'] = np.array([[1]])
            self.ssm['selection'] = np.array([[1]])
            self.initialize_state()
            logging.debug("TV-MII Model initialized.")
        except Exception as e:
            logging.error(f"Error initializing TV-MII Model: {e}")
            raise

    def initialize_state(self):
        try:
            logging.debug("Initializing state for TV-MII Model.")
            self.ssm.initialize_known(np.array([0]), np.array([[1]]))
        except Exception as e:
            logging.error(f"Error initializing state for TV-MII Model: {e}")
            raise

    @property
    def start_params(self):
        """
        Initial parameter guesses for the model.
        """
        return np.array([1.0, 1.0])  # [obs_cov, state_cov]

    @property
    def param_names(self):
        """
        Names of the parameters to be estimated.
        """
        return ['obs_cov', 'state_cov']

    def update(self, params, **kwargs):
        try:
            # Ensure covariance parameters are positive by exponentiating
            # This is a common technique to enforce positivity
            transformed_params = np.exp(params)
            super().update(transformed_params, **kwargs)
            logging.debug("Updating TV-MII Model parameters.")
            self.ssm['obs_cov', 0, 0] = transformed_params[0]  # Observation covariance
            self.ssm['state_cov', 0, 0] = transformed_params[1]  # State covariance
        except Exception as e:
            logging.error(f"Error updating TV-MII Model parameters: {e}")
            raise


def estimate_tv_mii(log_price_diff):
    """
    Estimate TV-MII using the State-space model.
    """
    try:
        logging.info("Estimating TV-MII using State-space model.")
        endog = log_price_diff.values
        model = TVMIIModel(endog)
        # Retrieve the start parameters from the model's property
        # Since we transformed parameters in the update method, we need to transform back for initial guesses
        initial_params = np.log(model.start_params)  # Inverse of exp
        # Fit the model with bounds to ensure positivity
        logging.debug("Fitting TV-MII Model.")
        res = model.fit(initial_params, disp=False, method='lbfgs')
        logging.info("TV-MII Model fitting completed.")
        # Log estimated parameters
        logging.debug(f"Estimated parameters: {res.params}")
        # Optionally, attempt to log the summary
        try:
            summary = res.summary()
            logging.debug(f"Model fitting results:\n{summary}")
        except Exception as e:
            logging.error(f"Error generating model summary: {e}")
        # Get the smoothed state estimates
        tv_mii_estimated = res.smoothed_state[0]
        return tv_mii_estimated
    except Exception as e:
        logging.error(f"Error estimating TV-MII: {e}")
        raise


def compute_tv_mii(data, commodity):
    """
    Compute TV-MII for a specific commodity between 'north' and 'south' exchange rate regimes.
    """
    try:
        logging.info(f"Computing TV-MII for commodity: {commodity}")
        data_commodity = data[data['commodity'] == commodity]

        # Pivot data to have separate columns for each exchange_rate_regime
        pivot_data = data_commodity.pivot_table(
            index='date',
            columns='exchange_rate_regime',
            values='usdprice_smoothed'
        )

        # Keep only dates where both 'north' and 'south' have data
        pivot_data = pivot_data.dropna(subset=['north', 'south'])

        if pivot_data.empty:
            logging.warning(f"No overlapping data for {commodity} between 'north' and 'south' regimes.")
            return pd.DataFrame()

        # Calculate log price differential
        pivot_data['log_price_diff'] = np.log(pivot_data['north']) - np.log(pivot_data['south'])

        # Estimate TV-MII
        logging.debug("Estimating TV-MII for North-South price differential.")
        tv_mii_estimated = estimate_tv_mii(pivot_data['log_price_diff'])

        # Normalize TV-MII
        scaler = MinMaxScaler(feature_range=(0, 1))
        tv_mii_normalized = scaler.fit_transform(tv_mii_estimated.reshape(-1, 1)).flatten()

        # Prepare results DataFrame
        pivot_data['tv_mii'] = tv_mii_normalized
        # Reset index first, then select 'date' and 'tv_mii'
        result = pivot_data.reset_index()[['date', 'tv_mii']]

        logging.info(f"TV-MII computation completed for commodity: {commodity}")
        return result
    except Exception as e:
        logging.error(f"Error computing TV-MII for commodity {commodity}: {e}")
        raise


def compute_tv_mii_market_pairs(data, commodity):
    """
    Compute TV-MII for all market pairs of a specific commodity.
    """
    try:
        logging.info(f"Computing TV-MII for market pairs of commodity: {commodity}")
        data_commodity = data[data['commodity'] == commodity]

        # Get list of unique markets (admin1 regions)
        markets = data_commodity['admin1'].unique()

        results_list = []
        # Generate all possible market pairs
        market_pairs = combinations(markets, 2)

        for market1, market2 in market_pairs:
            logging.debug(f"Processing market pair: {market1}-{market2} for commodity: {commodity}")
            data_market1 = data_commodity[data_commodity['admin1'] == market1]
            data_market2 = data_commodity[data_commodity['admin1'] == market2]

            # Merge on common dates
            merged_data = pd.merge(
                data_market1[['date', 'usdprice_smoothed']],
                data_market2[['date', 'usdprice_smoothed']],
                on='date',
                suffixes=('_' + market1, '_' + market2)
            )

            if len(merged_data) < 24:
                logging.warning(f"Not enough data points for TV-MII between {market1} and {market2} for {commodity}.")
                continue

            # Compute log price differential
            merged_data['log_price_diff'] = np.log(merged_data['usdprice_smoothed_' + market1]) - \
                                            np.log(merged_data['usdprice_smoothed_' + market2])

            # Estimate TV-MII
            logging.debug(f"Estimating TV-MII for market pair: {market1}-{market2}")
            tv_mii_estimated = estimate_tv_mii(merged_data['log_price_diff'])

            # Normalize TV-MII
            scaler = MinMaxScaler(feature_range=(0, 1))
            tv_mii_normalized = scaler.fit_transform(tv_mii_estimated.reshape(-1, 1)).flatten()

            # Prepare results DataFrame
            merged_data['tv_mii'] = tv_mii_normalized
            result = merged_data[['date', 'tv_mii']].copy()
            result['commodity'] = commodity
            result['market_pair'] = f"{market1}-{market2}"
            results_list.append(result)

        if results_list:
            tv_mii_market_results = pd.concat(results_list, ignore_index=True)
            logging.info(f"TV-MII computation for market pairs completed for commodity: {commodity}")
            return tv_mii_market_results
        else:
            logging.warning(f"No TV-MII market pair results generated for commodity: {commodity}")
            return pd.DataFrame()
    except Exception as e:
        logging.error(f"Error computing TV-MII market pairs for commodity {commodity}: {e}")
        raise


def compute_tv_mii_for_commodity(data_smoothed_commodity, commodity):
    """
    Wrapper function to compute TV-MII market pairs for a given commodity.
    Defined at the global scope to be picklable.
    """
    return compute_tv_mii_market_pairs(data_smoothed_commodity, commodity)


def save_results(data, tv_mii_avg_results, tv_mii_market_results, adjusted_prices_path, tv_mii_results_path, tv_mii_market_results_path):
    """
    Save the adjusted prices and TV-MII results to specified paths.
    """
    try:
        logging.info("Saving adjusted and smoothed price data.")
        # Save adjusted prices as JSON with indentation
        data.to_json(adjusted_prices_path, orient='records', date_format='iso', indent=4)
        logging.debug(f"Adjusted prices saved to {adjusted_prices_path}.")

        if not tv_mii_avg_results.empty:
            logging.info("Saving TV-MII average results.")
            tv_mii_avg_results.to_json(tv_mii_results_path, orient='records', date_format='iso', indent=4)
            logging.debug(f"TV-MII average results saved to {tv_mii_results_path}.")
        else:
            logging.warning(f"No TV-MII average results to save at {tv_mii_results_path}.")

        if not tv_mii_market_results.empty:
            logging.info("Saving TV-MII market pair results.")
            tv_mii_market_results.to_json(tv_mii_market_results_path, orient='records', date_format='iso', indent=4)
            logging.debug(f"TV-MII market pair results saved to {tv_mii_market_results_path}.")
        else:
            logging.warning(f"No TV-MII market pair results to save at {tv_mii_market_results_path}.")

        logging.info("All results saved successfully.")
    except Exception as e:
        logging.error(f"Error saving results: {e}")
        raise


def aggregate_prices_by_regime(data):
    """
    Aggregate 'usdprice_smoothed' by 'date', 'commodity', and 'exchange_rate_regime'.
    """
    try:
        logging.info("Aggregating prices by exchange_rate_regime.")
        if {'date', 'commodity', 'exchange_rate_regime', 'usdprice_smoothed'}.issubset(data.columns):
            data_grouped = data.groupby(['date', 'commodity', 'exchange_rate_regime'])['usdprice_smoothed'].mean().reset_index()
            logging.debug(f"Aggregated prices preview:\n{data_grouped.head()}")
            return data_grouped
        else:
            missing_cols = {'date', 'commodity', 'exchange_rate_regime', 'usdprice_smoothed'} - set(data.columns)
            logging.error(f"Missing columns for aggregation: {missing_cols}")
            return pd.DataFrame()
    except Exception as e:
        logging.error(f"Error aggregating prices by regime: {e}")
        raise


def process_group(group):
    """
    Top-level function to process a single group for seasonal adjustment.
    This is needed to avoid pickling errors with lambda functions in ProcessPoolExecutor.
    """
    return seasonal_adjustment(group, GLOBAL_FREQUENCY)


def main():
    """
    Main function to coordinate the workflow.
    """
    try:
        # Load configuration
        config_path = 'project/config/config.yaml'
        config = load_config(config_path)

        # Extract logging configuration
        log_level = config['logging']['level']
        log_format = config['logging']['format']
        log_directory = config['logging'].get('log_directory', 'logs')
        log_file_name = config['logging'].get('log_file_name', 'app.log')
        log_file_path = Path(log_directory) / log_file_name

        # Set up logging
        setup_logging(log_level, log_format, log_file_path)
        logging.info("Configuration and logging setup complete.")

        # Extract directories and files from config
        spatial_geojson_path = config['files']['spatial_geojson']
        processed_data_dir = Path(config['directories']['processed_data_dir'])
        results_dir = Path(config['directories']['results_dir'])
        adjusted_prices_path = processed_data_dir / 'adjusted_prices.json'  # Changed to .json
        tv_mii_results_path = results_dir / 'tv_mii_results.json'
        tv_mii_market_results_path = results_dir / 'tv_mii_market_results.json'

        # Extract parameters
        commodities = config['parameters']['commodities']
        date_column = config['parameters']['time_column']
        frequency_param = config['parameters']['frequency']
        window_size = config['parameters'].get('window_size', 3)  # Default window size is 3

        # Map frequency parameter to pandas frequency string
        if frequency_param == 'DA':
            frequency = 'D'
        elif frequency_param == 'ME':
            frequency = 'ME'  # Use 'ME' for month-end frequency
        else:
            logging.warning(f"Unknown frequency '{frequency_param}', defaulting to 'ME'")
            frequency = 'ME'  # Default to 'ME'

        # Set the global frequency variable
        global GLOBAL_FREQUENCY
        GLOBAL_FREQUENCY = frequency

        logging.debug(f"Commodities to process: {commodities}, Date column: {date_column}, Frequency: {frequency}, Window size: {window_size}")

        # Utilize all available CPU cores
        parallel_processes = os.cpu_count() or 1  # Fallback to 1 if os.cpu_count() returns None

        # Ensure directories exist
        processed_data_dir.mkdir(parents=True, exist_ok=True)
        results_dir.mkdir(parents=True, exist_ok=True)
        logging.debug(f"Ensured that directories '{processed_data_dir}' and '{results_dir}' exist.")

        # Load data
        data = load_data(spatial_geojson_path)

        # Drop 'geometry' column if not needed
        if 'geometry' in data.columns:
            data = data.drop(columns=['geometry'], errors='ignore')
            logging.debug("'geometry' column dropped from data.")
        else:
            logging.warning("'geometry' column not found in data.")

        # Preprocess data
        data = preprocess_data(data, commodities, date_column)

        # Ensure 'usdprice' is numeric
        if 'usdprice' in data.columns:
            data['usdprice'] = pd.to_numeric(data['usdprice'], errors='coerce')
            num_non_numeric = data['usdprice'].isna().sum()
            if num_non_numeric > 0:
                logging.warning(f"{num_non_numeric} 'usdprice' entries could not be converted to numeric and are set as NaN.")
        else:
            logging.error("'usdprice' column not found in data.")
            raise KeyError("'usdprice' column is missing.")

        # Proceed with grouping and filling missing prices
        logging.info("Grouping data and filling missing prices.")
        try:
            data = data.groupby(['commodity', 'exchange_rate_regime', 'admin1'], as_index=False, group_keys=False).apply(
                lambda x: fill_missing_prices(x, date_column, frequency, x.name)
            ).reset_index(drop=True)
            logging.debug("Grouping and filling missing prices completed.")
        except Exception as e:
            logging.error(f"Error during grouping and filling missing prices: {e}")
            raise

        # Ensure grouping columns are present
        required_columns = ['commodity', 'exchange_rate_regime', 'admin1']
        if not all(col in data.columns for col in required_columns):
            logging.error(f"Grouping columns missing after filling missing prices: {required_columns}")
            raise ValueError("Grouping columns missing after filling missing prices.")

        # Seasonal Adjustment with parallel processing at admin1 level
        logging.info("Starting seasonal adjustment for each group in parallel.")
        try:
            grouped = list(data.groupby(['commodity', 'exchange_rate_regime', 'admin1']))
            logging.info(f"Number of groups to process for seasonal adjustment: {len(grouped)}")

            with concurrent.futures.ProcessPoolExecutor(max_workers=parallel_processes) as executor:
                # Extract the group DataFrames for processing
                group_dfs = [group[1] for group in grouped]
                adjusted_data = list(executor.map(process_group, group_dfs))

            logging.info("Seasonal adjustment completed.")

            # Filter out any None or empty DataFrames
            adjusted_data = [df for df in adjusted_data if df is not None and not df.empty]
            if not adjusted_data:
                raise ValueError("No adjusted data available for concatenation.")

            data_adjusted = pd.concat(adjusted_data, ignore_index=True)
            logging.debug(f"Data shape after seasonal adjustment: {data_adjusted.shape}")
        except Exception as e:
            logging.error(f"Error during seasonal adjustment: {e}")
            raise

        # Smoothing
        logging.info("Starting price smoothing.")
        try:
            data_smoothed = data_adjusted.groupby(['commodity', 'exchange_rate_regime', 'admin1'], group_keys=False).apply(
                lambda x: smooth_prices(x, window_size)
            ).reset_index(drop=True)
            logging.info("Price smoothing completed.")
            logging.debug(f"Data preview after smoothing:\n{data_smoothed.head()}")
        except Exception as e:
            logging.error(f"Error during price smoothing: {e}")
            raise

        # Compute average prices by exchange_rate_regime
        logging.info("Aggregating smoothed prices by exchange_rate_regime.")
        try:
            data_avg_prices = aggregate_prices_by_regime(data_smoothed)
            if data_avg_prices.empty:
                logging.warning("Aggregated average prices DataFrame is empty.")
            else:
                logging.debug(f"Aggregated average prices preview:\n{data_avg_prices.head()}")
        except Exception as e:
            logging.error(f"Error aggregating average prices: {e}")
            raise

        # Seasonal Adjustment and Smoothing on average prices
        logging.info("Performing seasonal adjustment on average prices.")
        try:
            grouped_avg = list(data_avg_prices.groupby(['commodity', 'exchange_rate_regime']))
            logging.info(f"Number of groups to process for average seasonal adjustment: {len(grouped_avg)}")

            with concurrent.futures.ProcessPoolExecutor(max_workers=parallel_processes) as executor:
                # Extract the group DataFrames for processing
                group_dfs_avg = [group[1] for group in grouped_avg]
                adjusted_avg_data = list(executor.map(process_group, group_dfs_avg))

            logging.info("Seasonal adjustment on average prices completed.")

            # Filter out any None or empty DataFrames
            adjusted_avg_data = [df for df in adjusted_avg_data if df is not None and not df.empty]
            if not adjusted_avg_data:
                raise ValueError("No adjusted average data available for concatenation.")

            data_avg_prices_adjusted = pd.concat(adjusted_avg_data, ignore_index=True)
            logging.debug(f"Data shape after average seasonal adjustment: {data_avg_prices_adjusted.shape}")
        except Exception as e:
            logging.error(f"Error during seasonal adjustment of average prices: {e}")
            raise

        logging.info("Smoothing average prices.")
        try:
            data_avg_prices_smoothed = data_avg_prices_adjusted.groupby(['commodity', 'exchange_rate_regime'], group_keys=False).apply(
                lambda x: smooth_prices(x, window_size)
            ).reset_index(drop=True)
            logging.info("Smoothing on average prices completed.")
            logging.debug(f"Data preview after average smoothing:\n{data_avg_prices_smoothed.head()}")
        except Exception as e:
            logging.error(f"Error during smoothing of average prices: {e}")
            raise

        # Compute TV-MII between average prices of north and south
        logging.info("Computing TV-MII for average prices between 'north' and 'south' regimes.")
        tv_mii_avg_results_list = []
        try:
            for commodity in commodities:
                logging.debug(f"Processing TV-MII for commodity: {commodity}")
                result = compute_tv_mii(data_avg_prices_smoothed, commodity)
                if not result.empty:
                    result['commodity'] = commodity  # Ensure commodity is included
                    tv_mii_avg_results_list.append(result)
                else:
                    logging.warning(f"No TV-MII average results for commodity: {commodity}")
            if tv_mii_avg_results_list:
                tv_mii_avg_results = pd.concat(tv_mii_avg_results_list, ignore_index=True)
                logging.info("TV-MII computation for average prices completed.")
                logging.debug(f"TV-MII average results preview:\n{tv_mii_avg_results.head()}")
            else:
                tv_mii_avg_results = pd.DataFrame()
                logging.warning("No TV-MII average results to concatenate.")
        except Exception as e:
            logging.error(f"Error during TV-MII computation for average prices: {e}")
            raise

        # Compute TV-MII for market pairs
        logging.info("Computing TV-MII for all market pairs.")
        tv_mii_market_results_list = []
        try:
            # Prepare data subsets for each commodity
            data_smoothed_by_commodity = {commodity: data_smoothed[data_smoothed['commodity'] == commodity] for commodity in commodities}

            with concurrent.futures.ProcessPoolExecutor(max_workers=parallel_processes) as executor:
                futures = [
                    executor.submit(compute_tv_mii_for_commodity, data_smoothed_by_commodity[commodity], commodity)
                    for commodity in commodities
                ]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        result = future.result()
                        if not result.empty:
                            tv_mii_market_results_list.append(result)
                    except Exception as e:
                        logging.error(f"Exception during TV-MII market pair computation: {e}")

            # Remove empty DataFrames
            tv_mii_market_results_list = [df for df in tv_mii_market_results_list if not df.empty]

            if tv_mii_market_results_list:
                tv_mii_market_results = pd.concat(tv_mii_market_results_list, ignore_index=True)
                logging.info("TV-MII computation for market pairs completed.")
                logging.debug(f"TV-MII market pair results preview:\n{tv_mii_market_results.head()}")
            else:
                tv_mii_market_results = pd.DataFrame()
                logging.warning("No TV-MII market pair results to concatenate.")
        except Exception as e:
            logging.error(f"Error during TV-MII computation for market pairs: {e}")
            raise

        # Save results
        logging.info("Saving all results.")
        try:
            save_results(
                data_smoothed,
                tv_mii_avg_results,
                tv_mii_market_results,
                adjusted_prices_path,
                tv_mii_results_path,
                tv_mii_market_results_path
            )
        except Exception as e:
            logging.error(f"Error saving results: {e}")
            raise

        logging.info("Processing completed successfully.")

    except Exception as e:
        logging.critical(f"Critical error in main workflow: {e}")
        raise


if __name__ == '__main__':
    main()
