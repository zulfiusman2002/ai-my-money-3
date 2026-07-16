import Icon from './Icon';

export function DataStatus({ month, fallback = false, updatedAt, children }) {
  const date = updatedAt ? new Date(updatedAt) : null;
  const valid = date && !Number.isNaN(date.getTime());
  return (
    <div className={`data-status-v1${fallback ? ' fallback' : ''}`}>
      <Icon name={fallback ? 'spark' : 'check'} size={15}/>
      <span>{children || (fallback ? `Using latest complete month: ${month}` : `Data period: ${month}`)}</span>
      {valid && <small>Updated {date.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</small>}
    </div>
  );
}
