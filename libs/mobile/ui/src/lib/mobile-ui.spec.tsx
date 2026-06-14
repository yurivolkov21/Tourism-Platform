import React from 'react';
import { render } from '@testing-library/react-native';
import MobileUi from './mobile-ui';

describe('MobileUi', () => {
  it('should render successfully', () => {
    const { root } = render(<MobileUi />);
    expect(root).toBeTruthy();
  });
});
