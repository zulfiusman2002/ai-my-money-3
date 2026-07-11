import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MiloAvatar, MiloLogo } from '../components/Milo';
import Icon from '../components/Icon';

const slides = [
  {
    mode: 'core',
    eyebrow: 'Meet Milo',
    title: 'One clear view of your money life.',
    body: 'Track spending, savings, investments, goals and net worth together — without forcing every account into one provider.',
    features: [
      ['budget', 'Track income and expenses'],
      ['invest', 'See investments and wider wealth'],
      ['goals', 'Turn goals into monthly plans'],
      ['worth', 'Understand your complete net worth'],
    ],
    cta: 'Meet Milo',
    tone: 'intro-lavender',
  },
  {
    mode: 'ai',
    eyebrow: 'Ask Milo',
    title: 'Your finances, explained in plain English.',
    body: 'Milo connects every module and turns your real numbers into clear insights, risks and practical next actions.',
    features: [
      ['spark', 'Spot spending patterns'],
      ['invest', 'Review investment concentration'],
      ['goals', 'Check whether goals are on track'],
      ['advisor', 'Ask questions about your full picture'],
    ],
    cta: 'See how Milo thinks',
    tone: 'intro-mint',
  },
  {
    mode: 'learn',
    eyebrow: 'Learn with Milo',
    title: 'No time to read finance books?',
    body: 'Get one short lesson each day, curated around your habits, goals and investments. Build streaks, earn XP and make smarter decisions.',
    features: [
      ['learn', 'Daily bite-sized lessons'],
      ['spark', 'Personal examples from your data'],
      ['goals', 'Quick quizzes and action challenges'],
      ['worth', 'Progress that builds over time'],
    ],
    cta: 'Build my money profile',
    tone: 'intro-peach',
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const next = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else {
      if (user?.id) localStorage.setItem(`moneymilo_intro_seen_${user.id}`, '1');
      navigate('/onboarding');
    }
  };

  return (
    <div className={`welcome-shell ${slide.tone}`}>
      <header className="welcome-brand">
        <MiloLogo size={42}/><span className="brand-word">Money<span>Milo</span></span>
        <button className="welcome-skip" onClick={() => { if (user?.id) localStorage.setItem(`moneymilo_intro_seen_${user.id}`, '1'); navigate('/onboarding'); }}>Skip</button>
      </header>

      <main className="welcome-stage">
        <section className="welcome-copy fade-up" key={`copy-${index}`}>
          <div className="t-label">{slide.eyebrow}</div>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          <div className="welcome-features">
            {slide.features.map(([icon, text]) => (
              <div key={text}><span><Icon name={icon} size={18}/></span><strong>{text}</strong></div>
            ))}
          </div>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={next}>{slide.cta}<Icon name="arrow" size={17}/></button>
            <div className="welcome-dots" aria-label={`Slide ${index + 1} of ${slides.length}`}>
              {slides.map((_, i) => <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => setIndex(i)} className={i === index ? 'active' : ''}/>) }
            </div>
          </div>
        </section>

        <section className="welcome-visual fade-up" key={`visual-${index}`}>
          <div className="welcome-orb"/>
          <MiloAvatar mode={slide.mode} size={440}/>
          <div className="welcome-float-card card-one">
            <span className="t-label">{index === 0 ? 'Net worth' : index === 1 ? 'Milo noticed' : 'Today’s lesson'}</span>
            <strong>{index === 0 ? '£124,560' : index === 1 ? 'Your house goal needs £304 more / mo' : 'Systems beat goals'}</strong>
            <small>{index === 0 ? 'Everything you own, minus what you owe' : index === 1 ? 'A clear answer from your real numbers' : '5 minutes · personalised to you'}</small>
          </div>
          <div className="welcome-float-card card-two">
            <span className="t-label">{index === 0 ? 'Monthly savings' : index === 1 ? 'Next best action' : '3 day streak'}</span>
            <strong>{index === 0 ? '42%' : index === 1 ? 'Automate the extra contribution' : '+15 XP'}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}
