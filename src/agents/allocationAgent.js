// src/agents/allocationAgent.js
// Resource allocation agent using Groq llama-3.3-70b-versatile.
// DO NOT change model name — llama-3.3-70b-versatile is the correct current model.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function groupByWard(items) {
  if (!items || items.length === 0) return {};
  return items.reduce((acc, item) => {
    const ward = item.ward || 'Unknown';
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(item);
    return acc;
  }, {});
}

function countByWard(items) {
  if (!items || items.length === 0) return {};
  return items.reduce((acc, item) => {
    const ward = item.ward || 'Unknown';
    acc[ward] = (acc[ward] || 0) + 1;
    return acc;
  }, {});
}

function summarizeByWard(grouped) {
  const summary = {};
  for (const [ward, items] of Object.entries(grouped)) {
    summary[ward] = {
      count:      items.length,
      categories: [...new Set(items.map(i => i.category).filter(Boolean))],
    };
  }
  return summary;
}

export async function runAllocationAgent() {
  const { data: needs, error: needsError } = await supabase
    .from('needs')
    .select('ward, category, urgency_score, status')
    .eq('status', 'active')
    .limit(100);

  if (needsError) throw new Error(`Failed to fetch needs: ${needsError.message}`);

  const { data: history, error: historyError } = await supabase
    .from('historical_data')
    .select('ward, category, date_recorded')
    .gte(
      'date_recorded',
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    )
    .limit(100);

  if (historyError) throw new Error(`Failed to fetch history: ${historyError.message}`);

  const { data: volunteers, error: volError } = await supabase
    .from('volunteers')
    .select('ward, opted_in')
    .eq('opted_in', true)
    .limit(100);

  if (volError) throw new Error(`Failed to fetch volunteers: ${volError.message}`);

  const needsSummary    = summarizeByWard(groupByWard(needs || []));
  const historySummary  = summarizeByWard(groupByWard(history || []));
  const volunteerCount  = countByWard(volunteers || []);

  const prompt = `You are a resource allocation expert for Mumbai NGOs.

ACTIVE NEEDS BY WARD: ${JSON.stringify(needsSummary)}
HISTORICAL PATTERNS: ${JSON.stringify(historySummary)}
VOLUNTEERS BY WARD: ${JSON.stringify(volunteerCount)}

Return ONLY a valid JSON array of exactly 5 objects with these fields:
[{
  "priority_rank": 1,
  "ward_name": "string",
  "primary_issue": "string",
  "urgency_level": "Critical|High|Medium",
  "reasoning": "string",
  "recommended_action": "string",
  "volunteer_gap": true
}]

JSON array only. No explanation, no markdown.`;

  console.log('Calling Groq API for allocation, prompt length:', prompt.length);

  // ── Timeout handling — abort after 30 seconds ─────────────────────────────
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => {
    controller.abort();
    console.error("❌  Groq allocation agent timed out after 30s");
  }, 30000);

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  1024,
        temperature: 0.2
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Allocation agent timed out — try again');
    }
    throw new Error(`Groq fetch failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  console.log('Groq allocation response received, length:', text.length);

  const clean = text.replace(/```json|```/g, '').trim();

  let recommendations;
  try {
    recommendations = JSON.parse(clean);
  } catch {
    console.error("❌  Allocation agent non-JSON response:", text.substring(0, 200));
    throw new Error("Allocation agent returned invalid JSON");
  }

  await supabase.from('recommendations').insert({
    week_starting: new Date().toISOString().split('T')[0],
    recommendations,
    ward_count:    recommendations.length,
    input_summary: {
      active_needs:        (needs || []).length,
      historical_records:  (history || []).length,
      available_volunteers:(volunteers || []).length,
    }
  });

  return recommendations;
}