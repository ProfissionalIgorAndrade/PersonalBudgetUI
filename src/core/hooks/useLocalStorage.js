import { useState, useEffect } from 'react';
import { load, save } from '../utils/storage';

export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback));
  useEffect(() => { save(key, value); }, [key, value]);
  return [value, setValue];
}
