import React from 'react';

export default function Clock({ className, style, showSeconds = true }) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined
  });

  const dateStr = now.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  return (
    <div
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: 10, ...style }}
      aria-label="Текущие дата и время"
    >
      <span style={{ fontWeight: 800, fontSize: '1.15em', lineHeight: 1 }}>{timeStr}</span>
      <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span>
      <span style={{ opacity: 0.95, fontSize: '0.95em', textTransform: 'capitalize', fontWeight: 700 }}>{dateStr}</span>
    </div>
  );
}


