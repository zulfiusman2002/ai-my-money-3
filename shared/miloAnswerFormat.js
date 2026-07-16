const TONES = new Set(['positive', 'caution', 'risk', 'neutral']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);

function decodeJsonString(value) {
  try { return JSON.parse(`"${value}"`); }
  catch { return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
}

function stripFences(value = '') {
  return String(value)
    .trim()
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function jsonCandidate(text = '') {
  const cleaned = stripFences(text);
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const start = objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart) ? objectStart : arrayStart;
  if (start < 0) return cleaned;
  const close = cleaned[start] === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(close);
  return end > start ? cleaned.slice(start, end + 1) : cleaned.slice(start);
}

function strictParse(text) {
  const candidates = [stripFences(text), jsonCandidate(text)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string' && parsed !== candidate) {
        try { return JSON.parse(stripFences(parsed)); } catch { return parsed; }
      }
      return parsed;
    } catch { /* try next */ }
  }
  return null;
}

function fieldString(text, key) {
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i');
  const match = String(text).match(re);
  return match ? decodeJsonString(match[1]) : '';
}

function findValueStart(text, key, opener) {
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\s*:\\s*\\${opener}`, 'i');
  const match = re.exec(text);
  if (!match) return -1;
  return match.index + match[0].lastIndexOf(opener);
}

function scanBalanced(text, start, opener, closer) {
  if (start < 0 || text[start] !== opener) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === opener) depth += 1;
    if (ch === closer) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function objectField(text, key) {
  const start = findValueStart(text, key, '{');
  const block = scanBalanced(text, start, '{', '}');
  if (!block) return null;
  try { return JSON.parse(block); } catch { return null; }
}

function objectArray(text, key) {
  const start = findValueStart(text, key, '[');
  if (start < 0) return [];
  const result = [];
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (depth === 0) objectStart = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        const block = text.slice(objectStart, i + 1);
        try { result.push(JSON.parse(block)); } catch { /* ignore incomplete object */ }
        objectStart = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }
  return result;
}

function stringArray(text, key) {
  const start = findValueStart(text, key, '[');
  if (start < 0) return [];
  const values = [];
  let inString = false;
  let escaped = false;
  let buffer = '';
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) { buffer += `\\${ch}`; escaped = false; }
      else if (ch === '\\') escaped = true;
      else if (ch === '"') { values.push(decodeJsonString(buffer)); buffer = ''; inString = false; }
      else buffer += ch;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === ']') break;
  }
  return values;
}

function clampArray(value, max) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(0, max) : [];
}

function normaliseObject(value, disclaimer) {
  const answer = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const verdict = answer.verdict && typeof answer.verdict === 'object' ? answer.verdict : {};
  const partial = Boolean(answer._partial || answer.format_status === 'partial');
  return {
    answer_type: answer.answer_type || 'general',
    title: answer.title || "Milo's answer",
    direct_answer: answer.direct_answer || answer.summary || 'Milo completed the review, but the answer could not be fully formatted.',
    verdict: {
      label: verdict.label || (partial ? 'Partial answer' : 'Explained'),
      tone: TONES.has(verdict.tone) ? verdict.tone : 'neutral',
      detail: verdict.detail || (partial ? 'Some supporting detail was interrupted while Milo was formatting the response.' : ''),
    },
    metrics: clampArray(answer.metrics, 6),
    goal_impacts: clampArray(answer.goal_impacts, 6),
    sections: clampArray(answer.sections, 5),
    actions: clampArray(answer.actions, 5),
    assumptions: Array.isArray(answer.assumptions) ? answer.assumptions.filter(Boolean).slice(0, 8) : [],
    data_gaps: Array.isArray(answer.data_gaps) ? answer.data_gaps.filter(Boolean).slice(0, 8) : [],
    follow_ups: Array.isArray(answer.follow_ups) ? answer.follow_ups.filter(Boolean).slice(0, 4) : [],
    confidence: CONFIDENCE.has(answer.confidence) ? answer.confidence : (partial ? 'low' : 'medium'),
    disclaimer: answer.disclaimer || disclaimer || 'Educational guidance based on your data — not regulated financial advice.',
    format_status: partial ? 'partial' : 'complete',
  };
}

function salvage(text, disclaimer) {
  const cleaned = jsonCandidate(text);
  const title = fieldString(cleaned, 'title');
  const direct = fieldString(cleaned, 'direct_answer') || fieldString(cleaned, 'summary');
  const verdict = objectField(cleaned, 'verdict') || {
    label: fieldString(cleaned, 'label') || 'Partial answer',
    tone: fieldString(cleaned, 'tone') || 'neutral',
    detail: fieldString(cleaned, 'detail') || 'Milo returned the main answer, but part of the structured response was interrupted.',
  };
  const looksStructured = Boolean(title || direct || /"(?:metrics|goal_impacts|sections|actions)"\s*:/.test(cleaned));
  if (!looksStructured) return null;
  return normaliseObject({
    answer_type: fieldString(cleaned, 'answer_type') || 'general',
    title: title || "Milo's answer",
    direct_answer: direct || 'Milo completed the analysis, but the main explanation was interrupted. Please ask the question again for the full answer.',
    verdict,
    metrics: objectArray(cleaned, 'metrics'),
    goal_impacts: objectArray(cleaned, 'goal_impacts'),
    sections: objectArray(cleaned, 'sections'),
    actions: objectArray(cleaned, 'actions'),
    assumptions: stringArray(cleaned, 'assumptions'),
    data_gaps: stringArray(cleaned, 'data_gaps'),
    follow_ups: stringArray(cleaned, 'follow_ups'),
    confidence: fieldString(cleaned, 'confidence') || 'low',
    disclaimer: fieldString(cleaned, 'disclaimer') || disclaimer,
    _partial: true,
  }, disclaimer);
}

export function decodeMiloAnswer(input, { disclaimer } = {}) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return { structured: true, partial: Boolean(input._partial || input.format_status === 'partial'), answer: normaliseObject(input, disclaimer), raw: '' };
  }
  const raw = String(input || '').trim();
  if (!raw) return { structured: false, partial: false, answer: null, raw: '' };
  const parsed = strictParse(raw);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { structured: true, partial: false, answer: normaliseObject(parsed, disclaimer), raw };
  }
  const repaired = salvage(raw, disclaimer);
  if (repaired) return { structured: true, partial: true, answer: repaired, raw };
  return { structured: false, partial: false, answer: null, raw };
}

export function answerToPlainText(answer) {
  const decoded = decodeMiloAnswer(answer);
  if (!decoded.structured) return decoded.raw;
  const value = decoded.answer;
  const lines = [value.title, value.direct_answer];
  if (value.verdict?.label) lines.push(`Verdict: ${value.verdict.label}. ${value.verdict.detail || ''}`);
  if (value.metrics?.length) lines.push(`Key figures: ${value.metrics.map((m) => `${m.label} ${m.value}`).join('; ')}`);
  if (value.actions?.length) lines.push(`Actions: ${value.actions.map((a) => `${a.title}: ${a.detail}`).join('; ')}`);
  return lines.filter(Boolean).join('\n').slice(0, 5000);
}
