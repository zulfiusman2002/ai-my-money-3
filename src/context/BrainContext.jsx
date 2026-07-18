import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';

const BrainContext = createContext(null);

export function BrainProvider({ children }) {
  const location = useLocation();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const next = await api.brain();
      setPayload(next);
      return next;
    } catch (e) {
      setError(e.message || 'Could not refresh connected intelligence.');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setTimeout(() => refresh({ silent: true }), 250);
    return () => window.clearTimeout(timer);
  }, [location.pathname, refresh]);
  useEffect(() => {
    const handler = () => refresh({ silent: true });
    window.addEventListener('moneymilo:data-changed', handler);
    return () => window.removeEventListener('moneymilo:data-changed', handler);
  }, [refresh]);

  const value = useMemo(() => ({
    brain: payload?.brain || null,
    timeline: payload?.timeline || [],
    sourceMonth: payload?.sourceMonth || null,
    triggerCount: payload?.triggerCount || 0,
    loading,
    error,
    refresh,
  }), [payload, loading, error, refresh]);

  return <BrainContext.Provider value={value}>{children}</BrainContext.Provider>;
}

export function useBrain() {
  const value = useContext(BrainContext);
  if (!value) throw new Error('useBrain must be used inside BrainProvider');
  return value;
}
