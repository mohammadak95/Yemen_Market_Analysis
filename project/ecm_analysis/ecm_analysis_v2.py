# project/ecm_analysis/ecm_analysis_v2.py

import logging
import json
import warnings
import traceback
from pathlib import Path

import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
import statsmodels.api as sm
from statsmodels.tsa.api import VECM
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss, zivot_andrews
from statsmodels.stats.diagnostic import het_arch
from statsmodels.stats.stattools import durbin_watson, jarque_bera
from arch.unitroot import engle_granger
from esda.moran import Moran
from pysal.lib import weights
from statsmodels.tsa.vector_ar.vecm import select_order, select_coint_rank

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
BOOT_SAMPLES = params.get('bootstrap_samples', 100)
RIDGE_ALPHA = params.get('ridge_alpha', 1.0)
MAX_EPOCHS = params.get('max_epochs', 1000)
LEARNING_RATE = params.get('learning_rate', 0.01)
MIN_REGIONS = params.get('min_regions', 5)
SPATIAL_THRESH_MULT = params['spatial_weights']['threshold_multiplier']
MIN_NEIGHBORS = params['min_neighbors']

# Load spatial weights
def load_spatial_weights(path):
    try:
        gdf = gpd.read_file(path)
        w = weights.Queen.from_dataframe(gdf, use_index=False)  # Explicitly set use_index
        w.transform = 'r'
        return w
    except Exception as e:
        logger.error(f"Spatial weights loading failed: {e}")
        logger.debug(traceback.format_exc())
        return None

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

        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        initial_length = len(df)
        df.drop_duplicates(inplace=True)
        df.dropna(subset=['date'], inplace=True)
        logger.info(f"Dropped {initial_length - len(df)} duplicate or NaN rows based on 'date'.")

        # Exclude 'Amanat Al Asimah'
        df = df[df['admin1'] != 'Amanat Al Asimah']
        logger.info("Excluded records from 'Amanat Al Asimah'.")

        # Filter commodities
        if COMMODITIES:
            df = df[df['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for specified commodities. Number of records: {len(df)}")
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Unify exchange rate regimes if needed
        if 'unified' in EXR_REGIMES:
            df['exchange_rate_regime'] = 'unified'

        # Filter based on exchange rate regimes
        df = df[df['exchange_rate_regime'].isin(EXR_REGIMES)]
        logger.debug(f"Data filtered for exchange rate regimes: {EXR_REGIMES}")

        # Convert categorical columns to 'category' dtype
        df['commodity'] = df['commodity'].astype('category')
        df['exchange_rate_regime'] = df['exchange_rate_regime'].astype('category')

        # Create dummy variables for exchange rate regimes
        exchange_dummies = pd.get_dummies(df['exchange_rate_regime'], prefix='er_regime', drop_first=True)
        if not exchange_dummies.empty:
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
        return grouped_data
    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Stationarity Tests
def run_stationarity_tests(series, variable):
    logger.debug(f"Running stationarity tests for {variable}")
    results = {}
    transformations = {'original': series, 'diff': series.diff().dropna()}
    if (series > 0).all():
        transformations.update({'log': np.log(series), 'log_diff': np.log(series).diff().dropna()})
        logger.debug("Applied log transformations.")

    selected_transformation = None
    for name, transformed in transformations.items():
        logger.debug(f"Testing transformation: {name}")
        try:
            # Structural Break Tests
            if params.get('structural_break_test') == 'zivot_andrews':
                za = zivot_andrews(transformed, maxlag=1, regression='c')
                structural_break = {
                    'test_statistic': za[0],
                    'p_value': za[1],
                    'break_point': za[2]
                }
                logger.debug(f"Zivot-Andrews: stat={za[0]}, p={za[1]}, break={za[2]}")
            elif params.get('structural_break_test') == 'bai_perron':
                structural_break = {
                    'test_statistic': None,
                    'p_value': None,
                    'break_points': []
                }
                logger.warning("Bai-Perron test not implemented.")
            else:
                structural_break = None

            # ADF Test
            adf_stat, adf_p = adfuller(transformed, autolag='AIC')[:2]
            # KPSS Test
            kpss_stat, kpss_p = kpss(transformed, regression='c', nlags='auto')[:2]

            adf_stationary = adf_p < STN_SIG
            kpss_stationary = kpss_p > STN_SIG

            results[name] = {
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
                'Structural_Break': structural_break
            }

            logger.debug(f"ADF p={adf_p}, KPSS p={kpss_p} for {name}")

            if adf_stationary and kpss_stationary:
                selected_transformation = name
                logger.debug(f"Selected transformation: {name}")
                break
        except Exception as e:
            logger.error(f"Stationarity test failed for {name}: {e}")
            logger.debug(traceback.format_exc())

    if not selected_transformation:
        selected_transformation = 'original'
        logger.warning(f"No stationary transformation found for {variable}. Using 'original'.")

    return {
        'transformation': selected_transformation,
        'series': transformations[selected_transformation].tolist(),
        'results': results.get(selected_transformation, {})
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
            'price_transformation': stationarity_results.get('usdprice', {}).get('transformation', 'original'),
            'conflict_transformation': stationarity_results.get('conflict_intensity', {}).get('transformation', 'original')
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Estimate ECM
def estimate_ecm(y, x, exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS):
    logger.debug(f"Estimating ECM with max_lags={max_lags}, ecm_lags={ecm_lags}")
    try:
        endog = pd.concat([y, x], axis=1).dropna()
        if exog is not None and not exog.empty:
            endog = pd.concat([endog, exog], axis=1)
            logger.debug(f"Including exogenous variables: {exog.columns.tolist()}")
        endog.columns = ['y'] + list(x.columns) + (list(exog.columns) if exog is not None else [])

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            lag_order_result = select_order(endog, maxlags=max_lags, deterministic='ci')

        # Accessing AIC from lag_order_result
        # select_order returns an object with aic, bic, hqic, etc.
        # Make sure to check if aic is present
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
        logger.info("ECM model estimated successfully")
        return model, results
    except Exception as e:
        logger.error(f"ECM estimation failed: {e}")
        logger.debug(traceback.format_exc())
        return None, None

# Compute Model Criteria
def compute_model_criteria(results, model):
    logger.debug("Computing model criteria (AIC, BIC, HQIC)")
    try:
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

from pysal.lib import weights
import pandas as pd

def run_spatial_autocorrelation(residuals, spatial_weights, filter_indices):
    if spatial_weights is None:
        logger.warning("Spatial weights not loaded. Skipping spatial autocorrelation tests.")
        return None

    try:
        # Ensure filter_indices is a list
        if isinstance(filter_indices, pd.Index):
            filter_indices = filter_indices.tolist()
        elif isinstance(filter_indices, np.ndarray):
            filter_indices = filter_indices.tolist()
        
        # Create a new weights object with only the filtered indices
        filtered_weights = weights.w_subset(spatial_weights, filter_indices)

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

    except Exception as e:
        logger.error(f"Spatial autocorrelation test failed: {e}")
        logger.debug(traceback.format_exc())
        return None


# Diagnostics
def run_diagnostics(ols_results):
    if ols_results is None:
        return {}
    try:
        resid = ols_results.resid
        if resid.ndim > 1:
            resid = resid[:, 0]  # Select the first column or apply an appropriate reduction
        bg_stat, bg_p = het_arch(resid, nlags=ECM_LAGS, store=False)[:2]
        arch_stat, arch_p, _, _ = het_arch(resid)
        jb_stat, jb_p, _, _ = jarque_bera(resid)
        dw_stat = durbin_watson(resid)
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

# Impulse Response Functions
def compute_irfs(results):
    try:
        irf = results.irf(10)
        irf_data = {
            'impulse_response': {
                'irf': irf.irfs.tolist(),
                'lower': irf.ci[:, :, 0].tolist() if hasattr(irf, 'ci') else None,
                'upper': irf.ci[:, :, 1].tolist() if hasattr(irf, 'ci') else None
            }
        }
        return irf_data
    except Exception as e:
        logger.error(f"IRF computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

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

# Save Results
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

# ECM Analysis
def run_ecm_analysis(data, stationarity_results, cointegration_results):
    all_results = []
    for (commodity, regime), df in data.items():
        try:
            logger.info(f"Running ECM analysis for {commodity} in {regime} regime")
            if len(df) < MIN_OBS:
                logger.warning(f"Not enough observations for {commodity} in {regime} regime. Skipping.")
                continue

            key = f"{commodity}_{regime}"
            stationarity = stationarity_results.get(key)
            if not stationarity:
                logger.warning(f"No stationarity results for {key}. Skipping.")
                continue

            coint = cointegration_results.get(key)
            if not coint or not coint['engle_granger']['cointegrated']:
                logger.warning(f"No cointegration results for {key}. Skipping.")
                continue

            y = df['usdprice']
            x = df[['conflict_intensity']]
            exog = df.filter(regex='^er_regime_')
            y, x = y.align(x, join='inner')
            if not exog.empty:
                exog = exog.loc[y.index]
            logger.debug(f"Aligned data length: {len(y)}")

            if len(y) < MIN_OBS:
                logger.warning(f"Not enough aligned observations for {commodity} in {regime} regime. Skipping.")
                continue

            model, results = estimate_ecm(y, x, exog)
            if model is None or results is None:
                logger.warning(f"ECM estimation failed for {commodity} in {regime} regime. Skipping.")
                continue

            aic, bic, hqic = compute_model_criteria(results, model)
            diagnostics = run_diagnostics(results)
            irf = compute_irfs(results)
            gc = compute_granger_causality(y, x)

            # Filter spatial weights based on the current commodity and regime combination
            filter_indices = df.index
            spatial = run_spatial_autocorrelation(results.resid, spatial_weights, filter_indices)

            all_results.append({
                'commodity': commodity,
                'regime': regime,
                'aic': aic,
                'bic': bic,
                'hqic': hqic,
                'diagnostics': diagnostics,
                'irf': irf,
                'granger_causality': gc,
                'spatial_autocorrelation': spatial,
            })
        except Exception as e:
            logger.error(f"ECM analysis failed for {commodity} in {regime} regime: {e}")
            logger.debug(traceback.format_exc())
    return all_results

import time

def timed_log(msg):
    logger.info(f"{msg} at {time.strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    timed_log("Starting ECM analysis workflow")
    try:
        start_time = time.time()
        
        timed_log("Loading data")
        data = load_data()
        timed_log(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")
        
        stationarity_results, cointegration_results = {}, {}
        
        for (commodity, regime), df in data.items():
            start_group_time = time.time()
            if len(df) < MIN_OBS:
                logger.warning(f"Insufficient data for {commodity} in {regime}. Skipping stationarity and cointegration tests.")
                continue
            key = f"{commodity}_{regime}"
            timed_log(f"Running stationarity tests for {key}")
            stationarity_results[key] = {
                'usdprice': run_stationarity_tests(df['usdprice'], 'usdprice'),
                'conflict_intensity': run_stationarity_tests(df['conflict_intensity'], 'conflict_intensity')
            }
            timed_log(f"Stationarity tests for {key} completed in {time.time() - start_group_time:.2f} seconds")
            
            coint = run_cointegration_tests(df['usdprice'], df['conflict_intensity'], stationarity_results[key])
            if coint:
                cointegration_results[key] = coint
        
        ecm_results = run_ecm_analysis(data, stationarity_results, cointegration_results)
        save_results(ecm_results)
        
        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
    warnings.simplefilter('ignore')
    main()
