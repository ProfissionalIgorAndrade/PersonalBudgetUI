import { useState, useCallback } from 'react';

export function useNotify() {
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'error' ? 4200 : 2600);
  }, []);

  return { toast, notify, clearToast: () => setToast(null) };
}
