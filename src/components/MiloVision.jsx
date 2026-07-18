import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { MiloAvatar, MiloLogo } from './Milo';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value || 0)));

export default function MiloVision({
  open,
  onClose,
  name = 'there',
  score = 0,
  scoreLabel = 'Building',
  summary = '',
  netWorth = '—',
  monthlyDelta = '—',
  deltaPositive = true,
  win,
  watch,
  next,
  nextRoute = '/app/advisor',
  onNavigate,
}) {
  const [slide, setSlide] = useState(0);
  const slides = useMemo(() => [
    {
      id: 'welcome',
      eyebrow: 'Your one-minute money briefing',
      title: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${name}.`,
      body: summary || 'Milo has connected your cash flow, goals, wealth and learning into one clear picture.',
      mode: 'core',
    },
    {
      id: 'position',
      eyebrow: 'Your financial position',
      title: `${netWorth} net worth`,
      body: `${deltaPositive ? 'Up' : 'Down'} ${monthlyDelta} since the previous snapshot. This movement includes investments, wider assets and liabilities — not only monthly spending.`,
      mode: 'scientist',
    },
    {
      id: 'signals',
      eyebrow: 'What Milo noticed',
      title: 'One win. One thing to watch.',
      body: 'The point is not to monitor every number. It is to know which signal deserves attention now.',
      mode: 'ai',
    },
    {
      id: 'action',
      eyebrow: 'Your move for today',
      title: next?.value || 'Keep the system moving',
      body: next?.detail || 'Choose one useful action and let the rest of the plan continue in the background.',
      mode: 'goals',
    },
  ], [name, summary, netWorth, monthlyDelta, deltaPositive, next]);

  useEffect(() => {
    if (!open) return undefined;
    setSlide(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') setSlide((value) => Math.min(slides.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setSlide((value) => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, slides.length]);

  if (!open) return null;
  const current = slides[slide];
  const finalSlide = slide === slides.length - 1;
  const close = () => onClose?.();
  const goToAction = () => {
    close();
    onNavigate?.(nextRoute);
  };

  return (
    <div className="milo-vision-backdrop-v21" role="dialog" aria-modal="true" aria-label="Milo daily briefing">
      <section className={`milo-vision-v21 vision-${current.id}`}>
        <header className="milo-vision-head-v21">
          <div className="milo-vision-brand-v21"><MiloLogo size={54}/><span>Money<strong>Milo</strong><small>Daily vision</small></span></div>
          <button className="milo-vision-close-v21" onClick={close} aria-label="Close briefing"><Icon name="close" size={20}/></button>
        </header>

        <div className="milo-vision-stage-v21" key={current.id}>
          <div className="milo-vision-character-v21">
            <div className="milo-vision-orbit-v21"><i/><i/><i/></div>
            <MiloAvatar mode={current.mode} size={430} motion={current.id === 'action' ? 'point' : current.id === 'signals' ? 'think' : 'wave'} glow/>
          </div>

          <div className="milo-vision-copy-v21">
            <span className="milo-vision-eyebrow-v21">{current.eyebrow}</span>
            <h1>{current.title}</h1>
            <p>{current.body}</p>

            {current.id === 'welcome' && (
              <div className="milo-vision-score-v21">
                <div className="milo-vision-ring-v21" style={{'--vision-score': `${clamp(score) * 3.6}deg`}}><strong>{Math.round(score)}</strong><span>/100</span></div>
                <div><span>Money Pulse</span><strong>{scoreLabel}</strong><small>A transparent signal built from your connected financial picture.</small></div>
              </div>
            )}

            {current.id === 'position' && (
              <div className="milo-vision-position-v21">
                <article><span>Current net worth</span><strong>{netWorth}</strong></article>
                <article className={deltaPositive ? 'positive' : 'risk'}><span>Since last snapshot</span><strong>{deltaPositive ? '+' : '−'}{monthlyDelta}</strong></article>
              </div>
            )}

            {current.id === 'signals' && (
              <div className="milo-vision-signals-v21">
                <article className="positive"><span><Icon name="check" size={17}/>One win</span><strong>{win?.value || 'Your picture is connected'}</strong><p>{win?.detail}</p></article>
                <article className="caution"><span><Icon name="alert" size={17}/>Watch this</span><strong>{watch?.value || 'Keep data current'}</strong><p>{watch?.detail}</p></article>
              </div>
            )}

            {current.id === 'action' && (
              <div className="milo-vision-action-v21">
                <span>One useful action beats ten passive insights.</span>
                <button className="btn btn-primary btn-lg" onClick={goToAction}>Take me there <Icon name="arrow" size={18}/></button>
              </div>
            )}
          </div>
        </div>

        <footer className="milo-vision-footer-v21">
          <div className="milo-vision-dots-v21">{slides.map((item, index) => <button key={item.id} className={index === slide ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`Open briefing page ${index + 1}`}/>)}</div>
          <div className="milo-vision-controls-v21">
            {slide > 0 && <button className="btn btn-secondary" onClick={() => setSlide((value) => Math.max(0, value - 1))}>Back</button>}
            {!finalSlide ? <button className="btn btn-primary" onClick={() => setSlide((value) => Math.min(slides.length - 1, value + 1))}>Continue <Icon name="arrow" size={16}/></button> : <button className="btn btn-secondary" onClick={close}>Return to dashboard</button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
