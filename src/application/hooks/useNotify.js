import { useState, useCallback } from 'react';

export function useNotify() {
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, type = 'success', durationMs) => {
    const ms = durationMs ?? (type === 'error' ? 4200 : 2600);
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  }, []);

  return { toast, notify, clearToast: () => setToast(null) };
}
