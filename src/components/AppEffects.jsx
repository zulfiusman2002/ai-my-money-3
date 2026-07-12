import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_ROUTES, PRODUCT } from '../lib/product';

export default function AppEffects() {
  const location = useLocation();
  useEffect(() => {
    const page = APP_ROUTES[location.pathname];
    document.title = page ? `${page} · ${PRODUCT.name}` : `${PRODUCT.name} · Your smart money companion`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  return null;
}
