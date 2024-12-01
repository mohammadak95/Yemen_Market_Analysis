import React from 'react';
import { render } from '@testing-library/react';

describe('Basic React Test', () => {
  test('can render a basic component', () => {
    const TestComponent = () => <div>Test Component</div>;
    const { container } = render(<TestComponent />);
    expect(container).toBeTruthy();
  });
});
