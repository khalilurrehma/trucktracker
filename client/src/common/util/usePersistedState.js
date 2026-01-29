import { useEffect, useState } from 'react';

export const savePersistedState = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export default (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    if (!stickyValue) return defaultValue;
    try {
      return JSON.parse(stickyValue);
    } catch {
      // Fallback for legacy/plain string values (e.g., "en")
      return stickyValue;
    }
  });

  useEffect(() => {
    if (value !== defaultValue) {
      savePersistedState(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  }, [key, value]);

  return [value, setValue];
};
