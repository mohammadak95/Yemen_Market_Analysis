# GeoJSON Processing Utility

## Overview

The GeoJSON processing utility provides robust handling of geographical data across spatial visualizations in the Yemen Market Analysis project. It ensures consistent data preprocessing, error handling, and feature normalization.

## Key Components

### `geoJSONProcessor.js`

#### `preprocessGeoJSON(geoJSON, visualizationMode)`

Standardizes GeoJSON features with robust region identification and property mapping.

**Parameters:**
- `geoJSON`: Original GeoJSON object
- `visualizationMode`: Context of visualization (e.g., 'prices', 'conflicts')

**Features:**
- Fallback region identification
- Dynamic value extraction
- Consistent property naming

**Identification Fallback Strategy:**
1. `region_id`
2. `normalizedName`
3. `name`
4. `id`

#### `validateGeoJSON(geoJSON)`

Validates GeoJSON structure to ensure data integrity.

**Validation Checks:**
- Presence of features
- Feature type
- Geometry existence
- Properties presence

#### `safeGeoJSONProcessor(geoJSON, visualizationMode)`

Provides error-safe GeoJSON processing with fallback mechanisms.

## Usage Example

```javascript
import { safeGeoJSONProcessor } from '../utils/geoJSONProcessor';

const processedGeoJSON = safeGeoJSONProcessor(
  originalGeoJSON, 
  'seasonal'
);
```

## Error Handling

- Graceful error management
- Fallback to original data if processing fails
- Comprehensive error logging

## Best Practices

1. Always use `safeGeoJSONProcessor` for GeoJSON handling
2. Provide a `visualizationMode` for context-aware processing
3. Implement `SpatialErrorBoundary` for visualization components

## Troubleshooting

### Common Issues
- Missing region identifiers
- Inconsistent property names
- Invalid geometry

### Debugging
- Check browser console for detailed error messages
- Verify input GeoJSON structure
- Use `validateGeoJSON()` for preliminary checks

## Performance Considerations

- Memoize processed GeoJSON
- Minimize repeated processing
- Use React's `useMemo` for caching

## Future Improvements
- Enhanced validation rules
- More flexible region identification
- Advanced error tracking
