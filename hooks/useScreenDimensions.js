import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook to get responsive screen dimensions that update on screen size changes
 * Can be used across all pages for responsive layouts
 */
export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  return dimensions;
};

