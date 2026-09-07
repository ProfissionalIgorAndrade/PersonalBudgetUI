import { useState, useEffect } from 'react';
import { load, save } from '../utils/storage';

/**
 * Like useState but persists to localStorage.
 * @param {string} key  localStorage key
 * @param {*} fallback  initial value if key not found
 */
export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback));
  useEffect(() => { save(key, value); }, [key, value]);
  return [value, setValue];
}
