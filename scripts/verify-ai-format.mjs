import { decodeMiloAnswer } from '../shared/miloAnswerFormat.js';

const full = '```json\n{"answer_type":"review","title":"Your goals are funded","direct_answer":"Your monthly savings cover the current goal contributions.","verdict":{"label":"On track","tone":"positive","detail":"The recorded surplus is greater than the committed amount."},"metrics":[{"label":"Monthly savings","value":"£3,021","detail":"Recorded surplus","tone":"positive"}],"confidence":"high"}\n```';
const complete = decodeMiloAnswer(full);
if (!complete.structured || complete.partial || complete.answer.title !== 'Your goals are funded') {
  throw new Error('Complete fenced JSON was not formatted correctly.');
}

const truncated = '```json\n{"answer_type":"review","title":"Your goals are funded","direct_answer":"Your monthly savings cover the current goal contributions.","verdict":{"label":"On track","tone":"positive","detail":"Dependent on consistency."},"metrics":[{"label":"Monthly savings","value":"£3,021","detail":"Recorded surplus","tone":"positive"}],"actions":[{"title":"Keep saving","detail":"Maintain';
const recovered = decodeMiloAnswer(truncated);
if (!recovered.structured || !recovered.partial || recovered.answer.metrics.length !== 1) {
  throw new Error('Truncated AI JSON was not recovered into cards.');
}

console.log('✓ Complete and interrupted AI responses render as structured MoneyMilo answers.');
