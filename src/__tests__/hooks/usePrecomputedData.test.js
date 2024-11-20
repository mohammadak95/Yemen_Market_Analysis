// src/__tests__/hooks/usePrecomputedData.test.js
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { usePrecomputedData } from '../../hooks/dataHooks';

describe('usePrecomputedData', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = configureStore([thunk])({
      spatial: initialState
    });
  });

  test('fetches data on mount', async () => {
    const wrapper = ({ children }) => (
      <Provider store={mockStore}>{children}</Provider>
    );

    const { result, waitForNextUpdate } = renderHook(
      () => usePrecomputedData('test', '2023-01-01'),
      { wrapper }
    );

    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(mockStore.getActions()).toContainEqual(
      expect.objectContaining({
        type: 'spatial/fetchAllSpatialData/pending'
      })
    );
  });
});