<<<<<<< HEAD
# project/ecm_analysis/ecm_analysis_v3.py
=======
# project/ecm_analysis/ecm_analysis_v2_optimized.py
>>>>>>> origin/main

import logging
import json
import warnings
import traceback
<<<<<<< HEAD
import time
from pathlib import Path
=======
from pathlib import Path
from multiprocessing import Pool, cpu_count
>>>>>>> origin/main

import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
import statsmodels.api as sm
<<<<<<< HEAD
import psutil
from statsmodels.tsa.api import VECM
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from statsmodels.stats.diagnostic import het_arch
from statsmodels.stats.stattools import durbin_watson, jarque_bera
from arch.unitroot import engle_granger
from esda.moran import Moran
from libpysal import weights
from statsmodels.tsa.vector_ar.vecm import select_order, select_coint_rank
from statsmodels.tsa.vector_ar.var_model import VAR
from sklearn.linear_model import Ridge
from joblib import Parallel, delayed, parallel_backend
from arch import arch_model

# Suppress warnings
warnings.simplefilter('ignore')
=======
from statsmodels.tsa.api import VECM
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from statsmodels.stats.diagnostic import het_arch, acorr_breusch_godfrey
from statsmodels.stats.stattools import durbin_watson, jarque_bera
from arch.unitroot import engle_granger
from esda.moran import Moran
from pysal.lib import weights
from statsmodels.tsa.vector_ar.vecm import select_order, select_coint_rank

from arch import arch_model
>>>>>>> origin/main

# Load configuration
def load_config(path='project/config/config.yaml'):
    try:
        with open(path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Setup logging
log_dir = Path(config['directories']['logs_dir'])
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=config['logging']['level'].upper(),
    format=config['logging']['format'],
    handlers=[
        logging.FileHandler(log_dir / 'ecm_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define base directory (Assuming script is in 'project/ecm_analysis/')
base_dir = Path(__file__).resolve().parents[2]  # Points to 'project'

# Define paths based on config
dirs = {k: base_dir / v for k, v in config['directories'].items()}
files = {k: base_dir / v for k, v in config['files'].items()}

# Parameters
params = config['parameters']
MIN_OBS = params['min_common_dates']
ECM_LAGS = params['lag_periods']
COIN_MAX_LAGS = params['cointegration_max_lags']
GRANGER_MAX_LAGS = params['granger_max_lags']
DIST_THRESH = params['distance_threshold']
COMMODITIES = params['commodities']
EXR_REGIMES = params['exchange_rate_regimes']
STN_SIG = params['stationarity_significance_level']
CIG_SIG = params['cointegration_significance_level']
<<<<<<< HEAD
=======
BOOT_SAMPLES = params.get('bootstrap_samples', 100)
>>>>>>> origin/main
RIDGE_ALPHA = params.get('ridge_alpha', 1.0)
MAX_EPOCHS = params.get('max_epochs', 1000)
LEARNING_RATE = params.get('learning_rate', 0.01)
MIN_REGIONS = params.get('min_regions', 5)
SPATIAL_THRESH_MULT = params['spatial_weights']['threshold_multiplier']
MIN_NEIGHBORS = params['min_neighbors']
<<<<<<< HEAD
PARALLEL_PROCESSES = params.get('parallel_processes', 8)  # Adjusted to utilize 8 cores
MEMORY_PER_PROCESS_GB = params.get('memory_per_process_gb', 4)  # Monitor memory usage per process

# Validate required columns
def validate_columns(data, required_columns):
    missing = required_columns - set(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    logger.debug("All required columns are present.")

# Load spatial weights
def load_spatial_weights(path, region_id_column):
    try:
        gdf = gpd.read_file(path)
        # Use region identifier (e.g., 'admin1') as index to correctly match regions
        if region_id_column in gdf.columns:
            gdf = gdf.set_index(region_id_column)
        else:
            raise KeyError(f"Region identifier column '{region_id_column}' not found in GeoJSON.")

        w = weights.Queen.from_dataframe(gdf)
        w.transform = 'R'  # row-standardization for weights
        logger.info("Spatial weights created successfully using Queen contiguity.")
=======
MAX_DIFF_ORDER = params.get('max_diff_order', 2)

# Load spatial weights
def load_spatial_weights(path):
    try:
        gdf = gpd.read_file(path)
        w = weights.Queen.from_dataframe(gdf, use_index=False)  # Explicitly set use_index
        w.transform = 'r'
>>>>>>> origin/main
        return w
    except Exception as e:
        logger.error(f"Spatial weights loading failed: {e}")
        logger.debug(traceback.format_exc())
        return None

<<<<<<< HEAD
spatial_weights = load_spatial_weights(files['spatial_geojson'], params['region_identifier'])

# Align data with spatial weights
def align_data_with_weights(data, spatial_weights, index_column):
    valid_indices = spatial_weights.neighbors.keys()
    aligned_data = data[data[index_column].isin(valid_indices)]
    logger.debug(f"Aligned data with spatial weights: {len(aligned_data)} records.")
    return aligned_data

# Load and preprocess data
def load_data(test_mode=False, max_groups=5):
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        # **Optimized Data Loading**: Convert GeoJSON to Parquet for faster loading if not already done
        parquet_path = files['spatial_geojson'].with_suffix('.parquet')
        if not parquet_path.exists():
            gdf = gpd.read_file(files['spatial_geojson'])
            gdf.to_parquet(parquet_path)
            logger.info(f"Converted GeoJSON to Parquet at {parquet_path}")
        else:
            gdf = gpd.read_parquet(parquet_path)
            logger.info(f"Loaded data from Parquet at {parquet_path}")

        df = pd.DataFrame(gdf)
        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'conflict_intensity', params['region_identifier']}
        validate_columns(df, required_columns)
=======
spatial_weights = load_spatial_weights(files['spatial_geojson'])

# Load and preprocess data
def load_data():
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        gdf = gpd.read_file(files['spatial_geojson'])
        df = pd.DataFrame(gdf)
        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'conflict_intensity', 'admin1'}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
>>>>>>> origin/main

        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        initial_length = len(df)
        df.drop_duplicates(inplace=True)
        df.dropna(subset=['date'], inplace=True)
        logger.info(f"Dropped {initial_length - len(df)} duplicate or NaN rows based on 'date'.")

<<<<<<< HEAD
        # Set 'date' as index with frequency
        df.set_index('date', inplace=True)
        df = df.asfreq('D')  # Set frequency to daily; adjust as per your data
        df = df.fillna(method='ffill')  # Forward fill missing dates
        logger.debug("Set 'date' as DataFrame index with daily frequency and filled missing dates.")

        # Exclude 'Amanat Al Asimah' if present
        if params['region_identifier'] in df.columns:
            df = df[df[params['region_identifier']] != 'Amanat Al Asimah']
            logger.info("Excluded records from 'Amanat Al Asimah'.")
        else:
            logger.warning(f"Column '{params['region_identifier']}' not found. Skipping exclusion of 'Amanat Al Asimah'.")
=======
        # Exclude 'Amanat Al Asimah'
        df = df[df['admin1'] != 'Amanat Al Asimah']
        logger.info("Excluded records from 'Amanat Al Asimah'.")
>>>>>>> origin/main

        # Filter commodities
        if COMMODITIES:
            df = df[df['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for specified commodities. Number of records: {len(df)}")
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Unify exchange rate regimes if needed
<<<<<<< HEAD
        if config['parameters'].get('new_regime_name') and config['parameters']['new_regime_name'] in EXR_REGIMES:
            df['exchange_rate_regime'] = config['parameters']['new_regime_name']
            logger.info(f"Unified exchange rate regimes to '{config['parameters']['new_regime_name']}'.")
=======
        if 'unified' in EXR_REGIMES:
            df['exchange_rate_regime'] = 'unified'
>>>>>>> origin/main

        # Filter based on exchange rate regimes
        df = df[df['exchange_rate_regime'].isin(EXR_REGIMES)]
        logger.debug(f"Data filtered for exchange rate regimes: {EXR_REGIMES}")

        # Convert categorical columns to 'category' dtype
        df['commodity'] = df['commodity'].astype('category')
        df['exchange_rate_regime'] = df['exchange_rate_regime'].astype('category')
<<<<<<< HEAD
        df[params['region_identifier']] = df[params['region_identifier']].astype('category')

        # Create dummy variables for exchange rate regimes
        exchange_dummies = pd.get_dummies(df['exchange_rate_regime'], prefix='er_regime', drop_first=True)
        if exchange_dummies.shape[1] > 0:
=======

        # Create dummy variables for exchange rate regimes
        exchange_dummies = pd.get_dummies(df['exchange_rate_regime'], prefix='er_regime', drop_first=True)
        if not exchange_dummies.empty:
>>>>>>> origin/main
            df = pd.concat([df, exchange_dummies], axis=1)
            logger.debug(f"Created dummy variables: {exchange_dummies.columns.tolist()}")
        else:
            logger.debug("No dummy variables created for exchange_rate_regime.")

        # Group data by commodity and exchange rate regime
        grouped_data = {
            (grp, rgm): grp_df
            for (grp, rgm), grp_df in df.groupby(['commodity', 'exchange_rate_regime'])
        }
        logger.debug(f"Data grouped into {len(grouped_data)} groups.")
<<<<<<< HEAD

        if test_mode:
            grouped_data = dict(list(grouped_data.items())[:max_groups])
            logger.info(f"Test mode: Limited data to {max_groups} groups.")

        # Filter regions with spatial weights
        logger.debug("Filtered all groups to include only valid regions with spatial weights.")

=======
>>>>>>> origin/main
        return grouped_data
    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Stationarity Tests with Automated Differencing
def run_stationarity_tests(series, variable):
    logger.debug(f"Running stationarity tests for {variable}")
    results = {}
    integration_order = None
    transformed_series = None
<<<<<<< HEAD

    for d in range(0, 3):  # MAX_DIFF_ORDER set to 2
=======
    for d in range(0, MAX_DIFF_ORDER + 1):
>>>>>>> origin/main
        transformed = series.diff(d).dropna()
        if transformed.empty:
            continue
        logger.debug(f"Testing series differenced {d} times")
        try:
<<<<<<< HEAD
            # Check if the transformed series is constant
            if transformed.nunique() == 1:
                logger.warning(f"{variable} series is constant after differencing order {d}, skipping further differencing.")
                integration_order = d
                transformed_series = transformed
                results[f'diff{d}'] = {
                    'ADF': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'KPSS': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'diff_order': d,
                    'constant_series': True
                }
                break  # Exit the loop as further differencing won't help
            # ADF Test
            adf_stat, adf_p = adfuller(transformed, autolag='AIC')[:2]
            # KPSS Test
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", UserWarning)  # Specify a warning category
                kpss_stat, kpss_p = kpss(transformed, regression='c', nlags='auto')[:2]
=======
            # ADF Test
            adf_stat, adf_p = adfuller(transformed, autolag='AIC')[:2]
            # KPSS Test
            kpss_stat, kpss_p = kpss(transformed, regression='c', nlags='auto')[:2]
>>>>>>> origin/main

            adf_stationary = adf_p < STN_SIG
            kpss_stationary = kpss_p > STN_SIG

            results[f'diff{d}'] = {
                'ADF': {
                    'Statistic': adf_stat,
                    'p-value': adf_p,
                    'Stationary': adf_stationary
                },
                'KPSS': {
                    'Statistic': kpss_stat,
                    'p-value': kpss_p,
                    'Stationary': kpss_stationary
                },
                'diff_order': d
            }

            logger.debug(f"ADF p={adf_p}, KPSS p={kpss_p} for differencing order {d}")

            if adf_stationary and kpss_stationary:
                integration_order = d
                transformed_series = transformed
                logger.debug(f"Series is stationary after differencing order {d}")
                break
<<<<<<< HEAD
        except ValueError as e:
            if "x is constant" in str(e):
                logger.warning(f"{variable} series is constant after differencing order {d}, skipping further differencing.")
                integration_order = d
                transformed_series = transformed
                results[f'diff{d}'] = {
                    'ADF': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'KPSS': {
                        'Statistic': None,
                        'p-value': None,
                        'Stationary': None
                    },
                    'diff_order': d,
                    'constant_series': True
                }
                break  # Exit the loop as further differencing won't help
            else:
                logger.error(f"Stationarity test failed for differencing order {d}: {e}")
                logger.debug(traceback.format_exc())

=======
        except Exception as e:
            logger.error(f"Stationarity test failed for differencing order {d}: {e}")
            logger.debug(traceback.format_exc())
>>>>>>> origin/main
    if integration_order is None:
        logger.warning(f"Could not achieve stationarity for {variable} within max differencing order")
        transformed_series = series.dropna()
        integration_order = 0
<<<<<<< HEAD

    return {
        'integration_order': integration_order,
        'transformed_series': transformed_series.tolist(),
        'results': results,
        'constant_series': transformed_series.nunique() == 1 if transformed_series is not None else False
=======
    return {
        'integration_order': integration_order,
        'transformed_series': transformed_series.tolist(),
        'results': results
>>>>>>> origin/main
    }

# Cointegration Tests
def run_cointegration_tests(y, x, stationarity_results):
    logger.debug("Running cointegration tests")
    try:
        combined = pd.concat([y, x], axis=1).dropna()
        if combined.empty or len(combined) < 2:
            raise ValueError("Insufficient data for cointegration test.")

        eg = engle_granger(combined.iloc[:, 0], combined.iloc[:, 1])
        coint_result = {
            'engle_granger': {
                'cointegration_statistic': eg.stat,
                'p_value': eg.pvalue,
                'critical_values': eg.critical_values.tolist(),
                'cointegrated': eg.pvalue < CIG_SIG,
                'rho': eg.rho
            },
<<<<<<< HEAD
            'price_transformation': 'original' if stationarity_results['usdprice']['integration_order'] == 0 else f"diff{stationarity_results['usdprice']['integration_order']}",
            'conflict_transformation': 'original' if stationarity_results['conflict_intensity']['integration_order'] == 0 else f"diff{stationarity_results['conflict_intensity']['integration_order']}"
=======
            'price_transformation': stationarity_results.get('usdprice', {}).get('transformation', 'original'),
            'conflict_transformation': stationarity_results.get('conflict_intensity', {}).get('transformation', 'original')
>>>>>>> origin/main
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

<<<<<<< HEAD
# Estimate ECM
def estimate_ecm(y, x, exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS):
    logger.debug(f"Estimating ECM with max_lags={max_lags}, ecm_lags={ecm_lags}")
=======
# Estimate Model (VECM or VAR)
def estimate_model(y, x, exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS, model_type='VECM'):
    logger.debug(f"Estimating {model_type} model with max_lags={max_lags}, ecm_lags={ecm_lags}")
>>>>>>> origin/main
    try:
        endog = pd.concat([y, x], axis=1).dropna()
        if exog is not None and not exog.empty:
            endog = pd.concat([endog, exog], axis=1)
            logger.debug(f"Including exogenous variables: {exog.columns.tolist()}")
        endog.columns = ['y'] + list(x.columns) + (list(exog.columns) if exog is not None else [])

<<<<<<< HEAD
        if len(endog) < MIN_OBS:
            logger.warning(f"Not enough observations after combining endogenous and exogenous variables. Skipping.")
            return None, None

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            lag_order_result = select_order(endog, maxlags=max_lags, deterministic='ci')

        # Accessing AIC from lag_order_result
        if hasattr(lag_order_result, 'aic') and lag_order_result.aic is not None:
            optimal_lags = lag_order_result.aic
        else:
            optimal_lags = ecm_lags

        # Ensure lag order is within desired limits
        optimal_lags = max(1, min(optimal_lags, ecm_lags))
        logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

        # Select cointegration rank
        coint_rank_result = select_coint_rank(endog, det_order=0, k_ar_diff=optimal_lags)
        coint_rank = coint_rank_result.rank
        logger.debug(f"Selected cointegration rank: {coint_rank}")

        if coint_rank == 0:
            logger.warning("No cointegration found based on selected rank.")
            return None, None

        # Fit VECM model
        model = VECM(endog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
        results = model.fit()

        # Convert results.resid to DataFrame without setting the attribute
        resid = results.resid
        if isinstance(resid, np.ndarray):
            endog_names = results.model.endog_names  # Get names from the model
            resid_df = pd.DataFrame(resid, columns=endog_names)
            # Do not set results.resid

        logger.info("ECM model estimated successfully")
        return model, results
    except Exception as e:
        logger.error(f"ECM estimation failed: {e}")
=======
        if model_type == 'VECM':
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                lag_order_result = select_order(endog, maxlags=max_lags, deterministic='ci')

            if hasattr(lag_order_result, 'aic') and lag_order_result.aic is not None:
                optimal_lags = lag_order_result.aic
            else:
                optimal_lags = ecm_lags

            optimal_lags = max(1, min(optimal_lags, ecm_lags))
            logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

            coint_rank_result = select_coint_rank(endog, det_order=0, k_ar_diff=optimal_lags)
            coint_rank = coint_rank_result.rank
            logger.debug(f"Selected cointegration rank: {coint_rank}")

            if coint_rank == 0:
                logger.warning("No cointegration found based on selected rank.")
                return None, None

            model = VECM(endog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
            results = model.fit()
            logger.info("VECM model estimated successfully")
        else:
            # VAR model estimation
            model = sm.tsa.VAR(endog)
            lag_order_result = model.select_order(maxlags=max_lags)
            optimal_lags = lag_order_result.aic
            optimal_lags = max(1, min(optimal_lags, ecm_lags))
            results = model.fit(optimal_lags)
            logger.info("VAR model estimated successfully")
        return model, results
    except Exception as e:
        logger.error(f"{model_type} estimation failed: {e}")
>>>>>>> origin/main
        logger.debug(traceback.format_exc())
        return None, None

# Compute Model Criteria
def compute_model_criteria(results, model):
    logger.debug("Computing model criteria (AIC, BIC, HQIC)")
    try:
<<<<<<< HEAD
        n = len(results.resid) if hasattr(results, 'resid') else 0
        k_params = (getattr(model, 'k_ar', 0) + 
                    getattr(model, 'k_trend', 0) + 
                    (results.rank if hasattr(results, 'rank') else 0))
        llf = results.llf if hasattr(results, 'llf') else None

        if llf is not None and n > k_params:
            aic = -2 * llf + 2 * k_params
            bic = -2 * llf + np.log(n) * k_params
            hqic = -2 * llf + 2 * np.log(np.log(n)) * k_params
        else:
            aic = bic = hqic = np.nan
=======
        if isinstance(results, sm.tsa.vector_ar.vecm.VECMResults):
            aic = results.aic
            bic = results.bic
            hqic = results.hqic
        else:
            aic = results.aic
            bic = results.bic
            hqic = results.hqic
>>>>>>> origin/main

        logger.debug(f"AIC: {aic}, BIC: {bic}, HQIC: {hqic}")
        return aic, bic, hqic
    except Exception as e:
        logger.error(f"Model criteria computation failed: {e}")
        logger.debug(traceback.format_exc())
        return np.nan, np.nan, np.nan

# Granger Causality Tests
def compute_granger_causality(y, x):
    logger.debug("Computing Granger causality")
    gc_results = {}
    try:
        for col in x.columns:
            test = grangercausalitytests(pd.concat([y, x[col]], axis=1).dropna(), maxlag=GRANGER_MAX_LAGS, verbose=False)
            gc_metrics = {}
            for lag, res in test.items():
                stats = res[0]
                gc_metrics[lag] = {
                    'ssr_ftest_pvalue': stats['ssr_ftest'][1],
                    'ssr_ftest_stat': stats['ssr_ftest'][0],
                    'ssr_chi2test_pvalue': stats['ssr_chi2test'][1],
                    'ssr_chi2test_stat': stats['ssr_chi2test'][0],
                    'lrtest_pvalue': stats['lrtest'][1],
                    'lrtest_stat': stats['lrtest'][0],
                    'params_ftest_pvalue': stats['params_ftest'][1],
                    'params_ftest_stat': stats['params_ftest'][0],
                }
            gc_results[col] = gc_metrics
        return gc_results
    except Exception as e:
        logger.error(f"Granger causality tests failed: {e}")
        logger.debug(traceback.format_exc())
        return gc_results

<<<<<<< HEAD
# Run spatial autocorrelation test
def run_spatial_autocorrelation(residuals, spatial_weights, filter_indices):
    """
    Runs spatial autocorrelation test after aligning residuals with spatial weights.
    """
=======
# Run Spatial Autocorrelation
def run_spatial_autocorrelation(residuals, spatial_weights, filter_indices):
>>>>>>> origin/main
    if spatial_weights is None:
        logger.warning("Spatial weights not loaded. Skipping spatial autocorrelation tests.")
        return None

    try:
<<<<<<< HEAD
        # Align indices between residuals and spatial weights
        residuals_clean, valid_indices = align_indices(residuals, spatial_weights, filter_indices)

        # If no valid indices, skip further processing
        if not valid_indices:
            logger.warning("No valid indices found in spatial weights for subsetting. Skipping spatial autocorrelation.")
            return None

        # Create a filtered weights object that matches the valid indices
        filtered_neighbors = {i: spatial_weights.neighbors[i] for i in valid_indices}
        filtered_weights = weights.W(filtered_neighbors)
        filtered_weights.transform = 'R'  # Row-standardization

        # Compute Moran's I for the cleaned residuals
        moran_results = {}
        if isinstance(residuals_clean, pd.DataFrame):
            for col in residuals_clean.columns:
                y = residuals_clean[col].values
                moran = Moran(y, filtered_weights)
                moran_results[col] = {'Moran_I': moran.I, 'p_value': moran.p_sim}
        else:
            moran = Moran(residuals_clean.values, filtered_weights)
            moran_results = {'Moran_I': moran.I, 'p_value': moran.p_sim}

        return moran_results

    except KeyError as e:
        logger.error(f"KeyError during spatial autocorrelation: {e}")
        return None
=======
        # Ensure filter_indices is a list
        if isinstance(filter_indices, pd.Index):
            filter_indices = filter_indices.tolist()
        elif isinstance(filter_indices, np.ndarray):
            filter_indices = filter_indices.tolist()

        # Create a new weights object with only the filtered indices
        filtered_weights = weights.W_subset(spatial_weights, filter_indices)

        # Ensure residuals are a pandas Series or DataFrame and drop any missing values
        if not isinstance(residuals, (pd.Series, pd.DataFrame)):
            residuals = pd.Series(residuals, index=filter_indices)
            logger.debug("Converted residuals to pandas Series.")

        # Drop any NaN values from the residuals and align with spatial weights
        residuals_clean = residuals.dropna()
        filter_indices_clean = residuals_clean.index

        # Check if filtered weights have 'id_order' attribute
        if hasattr(filtered_weights, 'id_order'):
            residuals_aligned = residuals_clean.loc[filtered_weights.id_order.intersection(filter_indices_clean)]
        else:
            raise ValueError("Spatial weights must have 'id_order' attribute for proper alignment.")

        # Ensure residuals and indices have matching lengths
        min_length = min(len(residuals_aligned), filtered_weights.n)
        residuals_aligned = residuals_aligned[:min_length]
        filtered_weights.sparse = filtered_weights.sparse[:min_length, :min_length]

        # Compute Moran's I
        moran = Moran(residuals_aligned, filtered_weights)
        return {'Moran_I': moran.I, 'p_value': moran.p_sim}

    except ValueError as ve:
        logger.error(f"ValueError encountered: {ve}")
        logger.debug(traceback.format_exc())
        return None

>>>>>>> origin/main
    except Exception as e:
        logger.error(f"Spatial autocorrelation test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

<<<<<<< HEAD
# Align indices for spatial autocorrelation
def align_indices(residuals, spatial_weights, filter_indices):
    """
    Align residuals and spatial weights based on valid indices.
    """
    # Ensure filter_indices is a list or Index
    if isinstance(filter_indices, pd.Index):
        filter_indices = filter_indices.tolist()
    elif isinstance(filter_indices, np.ndarray):
        filter_indices = filter_indices.tolist()

    # Get valid spatial indices from spatial weights
    spatial_keys = set(spatial_weights.neighbors.keys())

    # Filter indices that are present in both the residuals and spatial weights
    valid_indices = list(spatial_keys.intersection(set(filter_indices)))

    # Ensure valid indices exist in the residuals index
    valid_indices_in_residuals = [idx for idx in valid_indices if idx in residuals.index]

    if not valid_indices_in_residuals:
        logger.warning("No valid indices found in residuals. Skipping.")
        return pd.DataFrame(), []  # Return an empty DataFrame and empty index list

    # Subset residuals based on valid indices
    residuals_clean = residuals.loc[valid_indices_in_residuals].dropna()

    return residuals_clean, valid_indices_in_residuals

# Multivariate Diagnostics
def multivariate_durbin_watson_test(residuals):
    dw_results = {}
    for i, series in enumerate(residuals.T):
        try:
            dw_stat = durbin_watson(series)
            dw_results[f'series_{i}'] = dw_stat
        except Exception as e:
            logger.error(f"Durbin-Watson test failed for series {i}: {e}")
    return dw_results

def multivariate_arch_test(residuals, max_lags):
    arch_results = {}
    for i, series in enumerate(residuals.T):
        try:
            arch_test = het_arch(series, nlags=max_lags)
            arch_results[f'series_{i}'] = {
                'arch_test_stat': arch_test[0],
                'arch_test_pvalue': arch_test[1]
            }
        except Exception as e:
            logger.error(f"ARCH test failed for series {i}: {e}")
    return arch_results

def multivariate_acf_pacf(residuals, max_lags):
    acf_pacf_results = {}
    for i, series in enumerate(residuals.T):
        try:
            # Convert series to numpy array if it's not already
            if not isinstance(series, (np.ndarray, pd.Series)):
                series = np.array(series)
            
            # If it's a pandas Series, use dropna method
            if isinstance(series, pd.Series):
                series = series.dropna()
            # If it's a numpy array, remove NaN values
            elif isinstance(series, np.ndarray):
                series = series[~np.isnan(series)]
            
            # Check if the series has enough data points and is not constant
            if len(series) > max_lags and np.unique(series).size > 1:
                acf_vals = sm.tsa.acf(series, nlags=max_lags)
                pacf_vals = sm.tsa.pacf(series, nlags=max_lags)
                acf_pacf_results[f'series_{i}'] = {
                    'acf': acf_vals.tolist(),
                    'pacf': pacf_vals.tolist()
                }
            else:
                logger.warning(f"Series {i} is too short or constant, skipping ACF/PACF computation.")
                acf_pacf_results[f'series_{i}'] = {
                    'acf': None,
                    'pacf': None,
                    'warning': "Series too short or constant"
                }
        except Exception as e:
            logger.error(f"ACF/PACF computation failed for series {i}: {e}")
            acf_pacf_results[f'series_{i}'] = {
                'acf': None,
                'pacf': None,
                'error': str(e)
            }
    return acf_pacf_results

# Run Diagnostics
def run_diagnostics(results, model_type='VECM'):
=======
# Diagnostics
def run_diagnostics(results):
>>>>>>> origin/main
    if results is None:
        return {}
    try:
        resid = results.resid
<<<<<<< HEAD
        diagnostics = {}

        # Convert residuals to DataFrame if they're not already
        if isinstance(resid, np.ndarray):
            endog_names = results.model.endog_names if hasattr(results.model, 'endog_names') else [f'resid_{i}' for i in range(resid.shape[1])]
            resid = pd.DataFrame(resid, columns=endog_names)
        elif isinstance(resid, pd.Series):
            resid = resid.to_frame(name='resid')
        elif not isinstance(resid, pd.DataFrame):
            resid = pd.DataFrame(resid)

        diagnostics['durbin_watson'] = multivariate_durbin_watson_test(resid)
        diagnostics['arch_test'] = multivariate_arch_test(resid, ECM_LAGS)
        diagnostics['acf_pacf'] = multivariate_acf_pacf(resid, ECM_LAGS)

        return diagnostics
    except Exception as e:
        logger.error(f"Diagnostics computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None
=======
        if isinstance(resid, np.ndarray) and resid.ndim > 1:
            resid = resid[:, 0]  # Select the first column or apply an appropriate reduction
        elif isinstance(resid, pd.DataFrame):
            resid = resid.iloc[:, 0]

        # Breusch-Godfrey test
        bg_test = acorr_breusch_godfrey(results, nlags=ECM_LAGS)
        bg_stat, bg_p = bg_test[0], bg_test[1]

        # ARCH test
        arch_test = het_arch(resid, nlags=ECM_LAGS)
        arch_stat, arch_p = arch_test[0], arch_test[1]

        # Jarque-Bera test
        jb_stat, jb_p, _, _ = jarque_bera(resid)

        # Durbin-Watson test
        dw_stat = durbin_watson(resid)

        # ACF and PACF
        acf_vals = sm.tsa.acf(resid, nlags=20).tolist()
        pacf_vals = sm.tsa.pacf(resid, nlags=20).tolist()

        return {
            'breusch_godfrey_stat': float(bg_stat),
            'breusch_godfrey_pvalue': float(bg_p),
            'arch_test_stat': float(arch_stat),
            'arch_test_pvalue': float(arch_p),
            'jarque_bera_stat': float(jb_stat),
            'jarque_bera_pvalue': float(jb_p),
            'durbin_watson_stat': float(dw_stat),
            'acf': acf_vals,
            'pacf': pacf_vals
        }
    except Exception as e:
        logger.error(f"Diagnostic tests failed: {e}")
        logger.debug(traceback.format_exc())
        return {}
>>>>>>> origin/main

# Fit GARCH Model
def fit_garch_model(residuals):
    try:
        if isinstance(residuals, pd.DataFrame):
            residuals = residuals.iloc[:, 0].values
        elif isinstance(residuals, pd.Series):
            residuals = residuals.values
        elif isinstance(residuals, np.ndarray):
            residuals = residuals.flatten()
        else:
            residuals = np.array(residuals)

        am = arch_model(residuals, vol='GARCH', p=1, q=1, dist='normal')
        res = am.fit(update_freq=5, disp='off')
        return {
            'model_summary': res.summary().as_text(),
            'params': res.params.to_dict(),
            'conditional_volatility': res.conditional_volatility.tolist()
        }
    except Exception as e:
        logger.error(f"GARCH model fitting failed: {e}")
        logger.debug(traceback.format_exc())
        return None

<<<<<<< HEAD
# Johansen Cointegration Test
def run_johansen_cointegration_test(endog, det_order=0, k_ar_diff=ECM_LAGS):
    logger.debug("Running Johansen cointegration test")
    try:
        model = VECM(endog, k_ar_diff=k_ar_diff, deterministic='ci')
        results = model.fit()
        johansen_result = {
            'trace_stat': results.lr1.tolist(),
            'crit_values': results.cvt.tolist(),
            'rank': results.rank
        }
        logger.debug(f"Johansen Cointegration Test Rank: {results.rank}")
        return johansen_result
    except Exception as e:
        logger.error(f"Johansen cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Ridge Regression for VAR Models
def ridge_regression_var(endog, exog=None, alpha=RIDGE_ALPHA):
    logger.debug(f"Performing Ridge Regression with alpha={alpha}")
    try:
        model = Ridge(alpha=alpha)
        X = endog[:-1]
        y = endog[1:]
        model.fit(X, y)
        predictions = model.predict(X)
        coefficients = model.coef_.tolist()
        intercept = model.intercept_.tolist()
        return {
            'coefficients': coefficients,
            'intercept': intercept,
            'predictions': predictions.tolist()
        }
    except Exception as e:
        logger.error(f"Ridge Regression failed: {e}")
        logger.debug(traceback.format_exc())
        return None
=======
# Impulse Response Functions
def compute_irfs(results):
    try:
        if isinstance(results, sm.tsa.vector_ar.vecm.VECMResults):
            irf = results.irf(10)
            irf_ci = irf.cov_bs(steps=10, repl=BOOT_SAMPLES)
        else:
            irf = results.irf(10)
            irf_ci = irf.cov_boot(steps=10, reps=BOOT_SAMPLES)

        irf_data = {
            'impulse_response': irf.irfs.tolist(),
            'lower': irf_ci[0].tolist(),
            'upper': irf_ci[1].tolist()
        }
        return irf_data
    except Exception as e:
        logger.error(f"IRF computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Generate Residual Plots Data
def generate_residual_plots_data(residuals):
    try:
        if isinstance(residuals, pd.DataFrame):
            residuals = residuals.iloc[:, 0]
        elif isinstance(residuals, np.ndarray):
            residuals = pd.Series(residuals)
        elif isinstance(residuals, list):
            residuals = pd.Series(residuals)
        elif not isinstance(residuals, pd.Series):
            residuals = pd.Series(residuals)

        # ACF
        acf_vals = sm.tsa.acf(residuals, nlags=20).tolist()

        # PACF
        pacf_vals = sm.tsa.pacf(residuals, nlags=20).tolist()

        # QQ Plot Data
        qq = sm.qqplot(residuals, line='s', fit=True)
        qq_data = {
            'theoretical_quantiles': qq.gca().lines[1].get_xdata().tolist(),
            'sample_quantiles': qq.gca().lines[1].get_ydata().tolist()
        }

        return {
            'acf': acf_vals,
            'pacf': pacf_vals,
            'qq_plot': qq_data
        }
    except Exception as e:
        logger.error(f"Residual plots data generation failed: {e}")
        logger.debug(traceback.format_exc())
        return {}
>>>>>>> origin/main

# JSON Encoder for Numpy and Pandas types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.ndarray, pd.Series, pd.DataFrame)):
            return obj.tolist()
        if isinstance(obj, (np.number, bool)):
            return obj.item()
        return super().default(obj)

# Convert keys to strings recursively
def convert_keys_to_str(data):
    if isinstance(data, dict):
        return {str(k): convert_keys_to_str(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_str(i) for i in data]
    else:
        return data

<<<<<<< HEAD
# Save Results (Modified to handle list of results)
=======
# Save Results
>>>>>>> origin/main
def save_results(ecm_results):
    try:
        flattened = convert_keys_to_str(ecm_results)
        files['ecm_results'].parent.mkdir(parents=True, exist_ok=True)
        with open(files['ecm_results'], 'w') as f:
            json.dump(flattened, f, indent=4, cls=NumpyEncoder)
        logger.info(f"Results saved to {files['ecm_results']}")
    except Exception as e:
        logger.error(f"Saving results failed: {e}")
        logger.debug(traceback.format_exc())
        raise

<<<<<<< HEAD
# ECM Analysis for a Single Group
def ecm_analysis_group(args, spatial_weights):
    (commodity, regime), df = args
=======
# ECM Analysis for a single group
def ecm_analysis_group(args):
    (commodity, regime), df, stationarity_results, cointegration_results = args
>>>>>>> origin/main
    try:
        logger.info(f"Running ECM analysis for {commodity} in {regime} regime")
        if len(df) < MIN_OBS:
            logger.warning(f"Not enough observations for {commodity} in {regime} regime. Skipping.")
            return None

        key = f"{commodity}_{regime}"
<<<<<<< HEAD
        stationarity = {
            'usdprice': run_stationarity_tests(df['usdprice'], 'usdprice'),
            'conflict_intensity': run_stationarity_tests(df['conflict_intensity'], 'conflict_intensity')
        }
=======
        stationarity = stationarity_results.get(key)
        if not stationarity:
            logger.warning(f"No stationarity results for {key}. Skipping.")
            return None
>>>>>>> origin/main

        usdprice_integration_order = stationarity['usdprice']['integration_order']
        conflict_integration_order = stationarity['conflict_intensity']['integration_order']

<<<<<<< HEAD
        # New Check for Constant Series
        usdprice_constant = stationarity['usdprice'].get('constant_series', False)
        conflict_constant = stationarity['conflict_intensity'].get('constant_series', False)

        if usdprice_constant or conflict_constant:
            logger.warning(f"One or both variables are constant for {key}. Skipping.")
            return None

=======
>>>>>>> origin/main
        if usdprice_integration_order != conflict_integration_order:
            logger.warning(f"Variables have different integration orders for {key}. Skipping.")
            return None
        integration_order = usdprice_integration_order

        if integration_order == 0:
            model_type = 'VAR'
            y_transformed = df['usdprice'].dropna()
            x_transformed = df['conflict_intensity'].dropna()
        elif integration_order == 1:
<<<<<<< HEAD
            coint = run_cointegration_tests(df['usdprice'], df['conflict_intensity'], stationarity)
=======
            coint = cointegration_results.get(key)
>>>>>>> origin/main
            if coint and coint['engle_granger']['cointegrated']:
                model_type = 'VECM'
                y_transformed = df['usdprice'].dropna()
                x_transformed = df['conflict_intensity'].dropna()
<<<<<<< HEAD
                # Additional Johansen Test
                johansen_result = run_johansen_cointegration_test(pd.concat([y_transformed, x_transformed], axis=1))
=======
>>>>>>> origin/main
            else:
                model_type = 'VAR'
                y_transformed = pd.Series(stationarity['usdprice']['transformed_series'])
                x_transformed = pd.Series(stationarity['conflict_intensity']['transformed_series'])
        else:
            logger.warning(f"Variables have integration order higher than 1 for {key}. Skipping.")
            return None

<<<<<<< HEAD
        # Convert y_transformed and x_transformed to Series if they are lists
        if isinstance(y_transformed, list):
            y_transformed = pd.Series(y_transformed)
        if isinstance(x_transformed, list):
            x_transformed = pd.Series(x_transformed)

=======
>>>>>>> origin/main
        exog = df.filter(regex='^er_regime_')
        y, x = y_transformed.align(x_transformed, join='inner')
        if not exog.empty:
            exog = exog.loc[y.index]
        logger.debug(f"Aligned data length: {len(y)}")

        if len(y) < MIN_OBS:
            logger.warning(f"Not enough aligned observations for {commodity} in {regime} regime. Skipping.")
            return None

<<<<<<< HEAD
        # Ensure y and x are DataFrames before passing to ECM/VAR estimation
        if isinstance(y, pd.Series):
            y = y.to_frame(name='y')
        if isinstance(x, pd.Series):
            x = x.to_frame(name='x')

        # Call estimate_ecm without setting 'resid'
        model, results = estimate_ecm(y, x, exog)

=======
        model, results = estimate_model(y, x, exog, model_type=model_type)
>>>>>>> origin/main
        if model is None or results is None:
            logger.warning(f"{model_type} estimation failed for {commodity} in {regime} regime. Skipping.")
            return None

        aic, bic, hqic = compute_model_criteria(results, model)
<<<<<<< HEAD
        diagnostics = run_diagnostics(results, model_type=model_type)

        # Fit GARCH model if ARCH effects are present
        garch_results = None
        if diagnostics:
            if model_type == 'VECM':
                # For VECM, assuming residuals are multivariate
                arch_pvalues = [diag.get('arch_test_pvalue', 1) for diag in diagnostics.get('arch_test', {}).values()]
                if any(p < STN_SIG for p in arch_pvalues):
                    logger.info(f"ARCH effects detected in residuals for {key}. Fitting GARCH model.")
                    garch_results = fit_garch_model(results.resid)
            elif model_type == 'VAR':
                # For VAR, assuming residuals are multivariate
                arch_pvalues = [diag.get('arch_test_pvalue', 1) for diag in diagnostics.get('arch_test', {}).values()]
                if any(p < STN_SIG for p in arch_pvalues):
                    logger.info(f"ARCH effects detected in residuals for {key}. Fitting GARCH model.")
                    garch_results = fit_garch_model(results.resid)

        # Johansen results if applicable
        johansen_result = locals().get('johansen_result', None)

        # Ridge Regression for VAR Models
        ridge_results = None
        if model_type == 'VAR':
            endog = pd.concat([y, x], axis=1)
            ridge_results = ridge_regression_var(endog, exog, alpha=RIDGE_ALPHA)

        # IRF is skipped as per user request
        gc = compute_granger_causality(y, x)

        residuals_clean, valid_indices = align_indices(results.resid, spatial_weights, df.index)
        spatial = run_spatial_autocorrelation(residuals_clean, spatial_weights, valid_indices)

        # Explicitly delete variables to free memory
        del y, x, exog, model, results, df

        # Monitor memory usage
        process = psutil.Process()
        memory_usage = process.memory_info().rss / (1024 ** 3)  # in GB
        logger.debug(f"Current memory usage: {memory_usage:.2f} GB")
=======
        diagnostics = run_diagnostics(results)

        # Fit GARCH model if ARCH effects are present
        if diagnostics.get('arch_test_pvalue', 1) < STN_SIG:
            logger.info(f"ARCH effects detected in residuals for {key}. Fitting GARCH model.")
            garch_results = fit_garch_model(results.resid)
        else:
            garch_results = None

        irf = compute_irfs(results)
        gc = compute_granger_causality(y, x)

        filter_indices = df.index
        spatial = run_spatial_autocorrelation(results.resid, spatial_weights, filter_indices)

        residual_plots_data = generate_residual_plots_data(results.resid)
>>>>>>> origin/main

        return {
            'commodity': commodity,
            'regime': regime,
            'model_type': model_type,
            'aic': aic,
            'bic': bic,
            'hqic': hqic,
            'diagnostics': diagnostics,
            'garch_results': garch_results,
<<<<<<< HEAD
            'johansen_cointegration': johansen_result,
            'ridge_regression': ridge_results,
            'granger_causality': gc,
            'spatial_autocorrelation': spatial,
=======
            'irf': irf,
            'granger_causality': gc,
            'spatial_autocorrelation': spatial,
            'residual_analysis': residual_plots_data
>>>>>>> origin/main
        }
    except Exception as e:
        logger.error(f"ECM analysis failed for {commodity} in {regime} regime: {e}")
        logger.debug(traceback.format_exc())
        return None

<<<<<<< HEAD
# Wrapper for Parallel Processing
def ecm_analysis_group_wrapper(args, spatial_weights):
    try:
        return ecm_analysis_group(args, spatial_weights)
    except Exception as e:
        logger.error(f"Error in ECM analysis for group {args[0]}: {e}")
        logger.debug(traceback.format_exc())
        return None

# ECM Analysis
def run_ecm_analysis(data, spatial_weights):
    all_results = []
    num_cpus = min(PARALLEL_PROCESSES, len(data))  # Ensure not exceeding the number of groups
    logger.info(f"Starting ECM analysis with {num_cpus} parallel processes")
    data_items = list(data.items())

    try:
        with parallel_backend('loky'):
            results = Parallel(n_jobs=num_cpus)(
                delayed(ecm_analysis_group_wrapper)(item, spatial_weights) for item in data_items
            )
        all_results.extend([res for res in results if res is not None])
        logger.info(f"ECM analysis completed with {len(all_results)} successful analyses")
        return all_results
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())
        return all_results

# Main Function
def main():
    logger.info("Starting ECM analysis workflow")
    try:
        start_time = time.time()

        logger.info("Loading data")
        data = load_data()
        if not data:
            logger.error("Failed to load data. Exiting.")
            return

        logger.info(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")

        ecm_results = run_ecm_analysis(data, spatial_weights)
        if ecm_results:
            save_results(ecm_results)
            logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
        else:
            logger.warning("ECM analysis did not produce any results.")

=======
# ECM Analysis
def run_ecm_analysis(data, stationarity_results, cointegration_results):
    all_results = []
    pool_args = [
        (group, df, stationarity_results, cointegration_results)
        for group, df in data.items()
    ]
    with Pool(processes=cpu_count()) as pool:
        for result in pool.imap_unordered(ecm_analysis_group, pool_args):
            if result:
                all_results.append(result)
    return all_results

import time

def timed_log(msg):
    logger.info(f"{msg} at {time.strftime('%Y-%m-%d %H:%M:%S')}")

def process_stationarity_cointegration(args):
    (commodity, regime), df = args
    key = f"{commodity}_{regime}"
    if len(df) < MIN_OBS:
        logger.warning(f"Insufficient data for {commodity} in {regime}. Skipping stationarity and cointegration tests.")
        return key, None, None
    try:
        logger.info(f"Running stationarity tests for {key}")
        stationarity = {
            'usdprice': run_stationarity_tests(df['usdprice'], 'usdprice'),
            'conflict_intensity': run_stationarity_tests(df['conflict_intensity'], 'conflict_intensity')
        }

        usdprice_integration_order = stationarity['usdprice']['integration_order']
        conflict_integration_order = stationarity['conflict_intensity']['integration_order']

        coint = None
        if usdprice_integration_order == conflict_integration_order == 1:
            coint = run_cointegration_tests(df['usdprice'], df['conflict_intensity'], stationarity)
        return key, stationarity, coint
    except Exception as e:
        logger.error(f"Stationarity/Cointegration tests failed for {key}: {e}")
        logger.debug(traceback.format_exc())
        return key, None, None

def main():
    timed_log("Starting ECM analysis workflow")
    try:
        start_time = time.time()

        timed_log("Loading data")
        data = load_data()
        logger.info(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")

        stationarity_results, cointegration_results = {}, {}

        pool_args = list(data.items())
        with Pool(processes=cpu_count()) as pool:
            for key, stationarity, coint in pool.imap_unordered(process_stationarity_cointegration, pool_args):
                if stationarity:
                    stationarity_results[key] = stationarity
                if coint:
                    cointegration_results[key] = coint

        logger.info(f"Stationarity and Cointegration tests completed in {time.time() - start_time:.2f} seconds")

        timed_log("Running ECM analysis")
        ecm_start_time = time.time()
        ecm_results = run_ecm_analysis(data, stationarity_results, cointegration_results)
        logger.info(f"ECM analysis completed in {time.time() - ecm_start_time:.2f} seconds")

        timed_log("Saving results")
        save_results(ecm_results)

        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
>>>>>>> origin/main
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
<<<<<<< HEAD
=======
    warnings.simplefilter('ignore')
>>>>>>> origin/main
    main()