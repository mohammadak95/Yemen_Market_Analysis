# utils/common_utils.py

import logging
import numpy as np

logger = logging.getLogger(__name__)

def calculate_euclidean_distance(coord1, coord2):
    """Calculate Euclidean distance between two coordinates."""
    try:
        distance = np.sqrt((coord1[0] - coord2[0])**2 + (coord1[1] - coord2[1])**2)
        return distance
    except Exception as e:
        logger.error(f"Error calculating Euclidean distance between {coord1} and {coord2}: {e}")
        return np.nan