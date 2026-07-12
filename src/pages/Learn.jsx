import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { MiloAvatar } from '../components/Milo';
import Icon from '../components/Icon';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

function splitLesson(content = '') {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) || [content];
  const slides = [];
  for (let i = 0; i < sentences.length; i += 2) slides.push(sentences.slice(i, i + 2).join(' '));
  return slides.filter(Boolean);
}

export default function Learn() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [lessonIndex, setLessonIndex] = useState([]);
  const [card, setCard] = useState(null);
  const [stage, setStage] = useState('loading');
  const [lessonStep, setLessonStep] = useState(0);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    setStage('loading'); setLessonStep(0); setChoice(null); setResult(null); setErr('');
    try {
      const [st, mods, lessons, prog, pick] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('learn_modules').select('*').order('sort_order'),
        supabase.from('learn_lessons').select('id,module_id,title,sort_order').order('sort_order'),
        supabase.from('user_learning_progress').select('lesson_id,quiz_correct,completed_at,learn_lessons(module_id)').eq('user_id', user.id).eq('completed', true),
        api.learningCard(),
      ]);
      const dbError = [st, mods, lessons, prog].find((r) => r.error)?.error;
      if (dbError) throw dbError;
      setStreak(st.data || { current_streak: 0, longest_streak: 0, total_xp: 0, last_completed_date: null });
      setModules(mods.data || []); setLessonIndex(lessons.data || []); setProgress(prog.data || []);
      if (!pick.lesson_id) { setCard({ reason: pick.reason }); setStage('finished'); return; }
      const { data: lesson, error } = await supabase.from('learn_lessons').select('*').eq('id', pick.lesson_id).single();
      if (error) throw error;
      setCard({ lesson, reason: pick.reason }); setStage('ready');
    } catch (e) { setErr(e.message); setStage('error'); }
  };
  useEffect(() => { load(); }, [user.id]);

  const completedToday = streak?.last_completed_date === todayStr();
  const submitQuiz = async () => {
    const lesson = card.lesson;
    const correct = choice === lesson.correct_answer;
    const xp = 10 + (correct ? 5 : 0) + (completedToday ? 0 : 5);
    setResult({ correct, xp }); setStage('done');
    try {
      await supabase.from('user_learning_progress').upsert({ user_id: user.id, lesson_id: lesson.id, completed: true, quiz_correct: correct, xp_earned: xp, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
      const s = streak || {}; let current = s.current_streak || 0;
      if (s.last_completed_date !== todayStr()) current = s.last_completed_date === yesterdayStr() ? current + 1 : 1;
      const updated = { user_id: user.id, current_streak: current, longest_streak: Math.max(current, s.longest_streak || 0), total_xp: (s.total_xp || 0) + xp, last_completed_date: todayStr() };
      await supabase.from('user_streaks').upsert(updated);
      setStreak(updated); setProgress([...progress.filter((p) => p.lesson_id !== lesson.id), { lesson_id: lesson.id, quiz_correct: correct, learn_lessons: { module_id: lesson.module_id } }]);
    } catch (e) { setErr(e.message); }
  };

  const lesson = card?.lesson;
  let options = [];
  if (lesson) {
    try { options = typeof lesson.quiz_options === 'string' ? JSON.parse(lesson.quiz_options) : (lesson.quiz_options || []); }
    catch { options = []; }
  }
  const conceptSlides = useMemo(() => lesson ? splitLesson(lesson.content) : [], [lesson]);
  const lessonCards = lesson ? [
    ...conceptSlides.map((text, i) => ({ type: 'concept', kicker: `Idea ${i + 1}`, title: i === 0 ? lesson.title : 'Build the idea', text })),
    ...(lesson.example ? [{ type: 'example', kicker: 'In real life', title: 'Milo makes it practical', text: lesson.example }] : []),
    ...(lesson.reflection ? [{ type: 'reflect', kicker: 'Pause and reflect', title: 'Make it personal', text: lesson.reflection }] : []),
  ] : [];
  const currentCard = lessonCards[lessonStep];
  const totalLessonSteps = lessonCards.length + 1;
  const activeIndex = stage === 'ready' ? 0 : stage === 'quiz' || stage === 'done' ? totalLessonSteps : lessonStep + 1;
  const lessonProgress = totalLessonSteps ? activeIndex / totalLessonSteps * 100 : 0;
  const completedLessonIds = new Set(progress.map((p) => p.lesson_id));
  const moduleStats = modules.map((module) => {
    const lessons = lessonIndex.filter((x) => x.module_id === module.id);
    const completed = lessons.filter((x) => completedLessonIds.has(x.id)).length;
    return { module, lessons, completed, total: lessons.length, complete: lessons.length > 0 && completed >= lessons.length };
  });
  const currentModuleIndex = Math.max(0, moduleStats.findIndex((x) => !x.complete));
  const totalLessons = lessonIndex.length;
  const coursePct = totalLessons ? Math.round(completedLessonIds.size / totalLessons * 100) : 0;
  const currentModuleTitle = modules.find((m) => m.id === lesson?.module_id)?.title || 'Money foundations';
  const level = Math.max(1, Math.floor((streak?.total_xp || 0) / 100) + 1);

  if (stage === 'loading') return <div className="page page-wide"><div className="learn-v3-loading"><div className="skeleton" style={{height:260}}/><div className="skeleton" style={{height:520}}/></div></div>;

  return (
    <div className="page page-wide learn-v3-page">
      <section className="academy-hero-v3 fade-up">
        <div className="academy-copy-v3">
          <span className="academy-kicker">MoneyMilo Academy</span>
          <h1>Build money skills that stay with you.</h1>
          <p>Professor Milo turns proven ideas into short lessons connected to your actual habits, goals and investments.</p>
          <div className="academy-stats-v3">
            <div><strong>{streak?.current_streak ?? 0}<span>🔥</span></strong><small>day streak</small></div>
            <div><strong>{streak?.total_xp ?? 0}</strong><small>XP earned</small></div>
            <div><strong>Level {level}</strong><small>money learner</small></div>
            <div><strong>{coursePct}%</strong><small>course complete</small></div>
          </div>
        </div>
        <div className="professor-portrait-v3">
          <div className="professor-halo-v3"/>
          <MiloAvatar mode="learn" size={390} motion="point" glow/>
          <div className="professor-caption-v3"><span>Professor Milo</span><strong>“Small lessons. Better systems. Bigger freedom.”</strong></div>
        </div>
      </section>

      {stage === 'error' && <div className="data-notice error-notice">{err}<button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></div>}

      {stage === 'finished' && <section className="academy-complete-v3"><MiloAvatar mode="learn" size={280} motion="celebrate" glow/><div><span className="academy-kicker">Path complete</span><h2>You’ve completed every available lesson.</h2><p>{card.reason}</p><button className="btn btn-primary" onClick={load}>Check for a new lesson</button></div></section>}

      {stage === 'ready' && lesson && <section className="next-lesson-v41 fade-up">
        <div className="next-lesson-professor-v41"><div className="professor-board-v41"><span>PROFESSOR MILO</span><strong>Today’s class</strong></div><MiloAvatar mode="learn" size={390} motion="point" glow/><div className="professor-speech-v41"><span>Milo says</span><p>{card.reason || 'This is the next useful idea in your MoneyMilo course.'}</p></div></div>
        <div className="next-lesson-copy-v41"><span className="academy-kicker">Continue learning</span><div className="next-lesson-badge-v41">Next lesson</div><h2>{lesson.title}</h2><p>{currentModuleTitle} · about 5 minutes · {totalLessonSteps} short steps</p><div className="next-lesson-outline-v41"><div><b>1</b><span>Learn one clear idea</span></div><div><b>2</b><span>See it in your real money life</span></div><div><b>3</b><span>Answer one question and earn XP</span></div></div><button className="btn btn-primary btn-lg" onClick={()=>{setLessonStep(0);setStage('lesson');}}>Start this lesson <Icon name="arrow" size={18}/></button><small>Your progress is saved after the quiz.</small></div>
      </section>}

      {(stage === 'lesson' || stage === 'quiz') && lesson && <section className="lesson-experience-v3 fade-up">
        <aside className="lesson-guide-v3">
          <div className="guide-top-v3"><span>Today’s lesson</span><strong>{lesson.title}</strong><small>{currentModuleTitle} · about 5 minutes</small></div>
          <div className="guide-professor-v3"><MiloAvatar mode="learn" size={230} motion="point" glow/></div>
          <div className="guide-bubble-v3"><span>Milo chose this because</span><p>{stage === 'quiz' ? 'A quick check helps turn a good idea into something you can remember and use.' : (card.reason || 'This lesson matches patterns in your money life.')}</p></div>
          <div className="lesson-step-dots-v3">{Array.from({length:totalLessonSteps}).map((_,i)=><span key={i} className={i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}/>)}</div>
        </aside>

        <div className="lesson-workspace-v3">
          <div className="lesson-workspace-top-v3">
            <div><span className="badge badge-info">{stage === 'quiz' ? 'Knowledge check' : currentCard?.kicker}</span><h2>{stage === 'quiz' ? 'Make the idea stick' : currentCard?.title}</h2></div>
            <span>{stage === 'quiz' ? totalLessonSteps : lessonStep + 1} / {totalLessonSteps}</span>
          </div>
          <div className="lesson-progress-v3"><span style={{width:`${Math.max(8,lessonProgress)}%`}}/></div>

          {stage === 'lesson' && currentCard && <article className={`lesson-card-v3 ${currentCard.type}`} key={lessonStep}>
            <div className="lesson-card-symbol-v3">{currentCard.type === 'concept' ? '✦' : currentCard.type === 'example' ? '↗' : '◌'}</div>
            <div className="t-label">{currentCard.kicker}</div>
            <h3>{currentCard.title}</h3>
            <p>{currentCard.text}</p>
            {currentCard.type === 'example' && <div className="lesson-personal-v3"><Icon name="spark" size={16}/><span>Connected to your real financial life</span></div>}
          </article>}

          {stage === 'quiz' && <article className="lesson-card-v3 quiz">
            <div className="lesson-card-symbol-v3">?</div><div className="t-label">One quick check</div><h3>{lesson.quiz_question}</h3>
            <div className="quiz-options-v3">{options.map((opt,i)=><button key={i} className={choice===i?'selected':''} onClick={()=>setChoice(i)}><b>{String.fromCharCode(65+i)}</b><span>{opt}</span><i/></button>)}</div>
          </article>}

          <div className="lesson-controls-v3">
            <button className="btn btn-secondary" disabled={stage === 'lesson' && lessonStep === 0} onClick={()=> stage === 'quiz' ? setStage('lesson') : setLessonStep(Math.max(0,lessonStep-1))}>Back</button>
            {stage === 'lesson' ? <button className="btn btn-primary" onClick={()=> lessonStep < lessonCards.length-1 ? setLessonStep(lessonStep+1) : setStage('quiz')}>{lessonStep < lessonCards.length-1 ? 'Next idea' : 'Take the quiz'}<Icon name="arrow" size={16}/></button> : <button className="btn btn-primary" disabled={choice==null} onClick={submitQuiz}>Check my answer</button>}
          </div>
        </div>
      </section>}

      {stage === 'done' && result && <section className={`lesson-result-v3 ${result.correct ? 'correct' : 'try-again'}`}>
        <div className="result-burst-v3">{result.correct ? '✓' : '↻'}</div><MiloAvatar mode="learn" size={230} motion="celebrate" glow/><div><span className="academy-kicker">Lesson complete</span><h2>{result.correct ? 'Brilliant — that idea is yours now.' : 'Not quite, but this is how learning sticks.'}</h2><p>{result.correct ? `You earned ${result.xp} XP and protected your ${streak?.current_streak || 1}-day streak.` : <>The correct answer is <strong>{options[lesson.correct_answer]}</strong>. You still earned {result.xp} XP for completing the lesson.</>}</p>{lesson.action_challenge && <div className="action-challenge-v3"><span>Today’s action</span><strong>{lesson.action_challenge}</strong></div>}<button className="btn btn-primary" onClick={load}>Continue learning<Icon name="arrow" size={16}/></button></div>
      </section>}

      <section className="learning-roadmap-v3">
        <div className="section-head"><div><span className="academy-kicker">Your curriculum</span><h2>Follow the path, one useful skill at a time.</h2><p className="t-small">Modules unlock as your understanding grows.</p></div><span className="badge badge-info">{progress.length} lessons complete</span></div>
        <div className="module-map-v3">
          {moduleStats.map(({module:m,completed,total,complete},i)=>{
            const state = complete ? 'complete' : i === currentModuleIndex ? 'current' : 'locked';
            const pct = total ? Math.round(completed/total*100) : 0;
            return <article key={m.id} className={`module-node-v3 ${state}`}>
              <div className="module-number-v3">{state === 'complete' ? '✓' : String(i+1).padStart(2,'0')}</div>
              <div><span>Module {i+1}</span><h3>{m.title}</h3><p>{m.description}</p><div className="module-progress-v1"><i style={{width:`${pct}%`}}/><small>{completed} of {total || '—'} lessons</small></div></div>
              <div className="module-state-v3">{state === 'complete' ? 'Completed' : state === 'current' ? 'Continue here' : 'Locked'}</div>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
