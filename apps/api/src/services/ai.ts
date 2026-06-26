import type {
  FantasyDoctorResult,
  TradeAssistantResult,
  WaiverAssistantResult,
} from '@flos/shared';
import { config } from '../config.js';

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!config.aiApiKey) {
    return JSON.stringify(getMockResponse(systemPrompt));
  }

  if (config.aiProvider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = (await res.json()) as { content?: Array<{ text: string }> };
    return data.content?.[0]?.text ?? '{}';
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '{}';
}

function getMockResponse(systemPrompt: string): Record<string, unknown> {
  if (systemPrompt.includes('injury')) {
    return {
      playerId: 'mock',
      playerName: 'Player',
      expectedReturnWeek: 3,
      playProbability: 75,
      reinjuryRisk: 'medium',
      summary: 'Mock injury analysis — configure AI_API_KEY for live insights.',
      sources: ['mock'],
    };
  }
  if (systemPrompt.includes('waiver')) {
    return {
      recommendations: [
        {
          addPlayerId: '1234',
          addPlayerName: 'Breakout WR',
          priority: 'strong',
          reasoning: 'High target share trending up.',
        },
      ],
      dropCandidates: [],
    };
  }
  return {
    fairnessScore: 72,
    recommendation: 'counter',
    needAnalysis: 'Addresses RB need.',
    playoffImpact: 'Moderate positive.',
    summary: 'Mock trade analysis — configure AI_API_KEY for live insights.',
  };
}

function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? text) as T;
}

export async function getFantasyDoctor(
  playerId: string,
  playerName: string,
  context?: string,
): Promise<FantasyDoctorResult> {
  const system = `You are Fantasy Doctor. Return JSON only with keys: playerId, playerName, injuryStatus, expectedReturnWeek, playProbability (0-100), reinjuryRisk (low|medium|high), summary, sources (array).`;
  const user = `Analyze player ${playerName} (ID: ${playerId}). Context: ${context ?? 'NFL fantasy football'}`;
  const raw = await callLlm(system, user);
  return parseJson<FantasyDoctorResult>(raw);
}

export async function getWaiverAssistant(
  leagueContext: string,
): Promise<WaiverAssistantResult> {
  const system = `You are Waiver Assistant. Return JSON with recommendations array (addPlayerId, addPlayerName, dropPlayerId?, dropPlayerName?, faabBidCents?, priority: must_add|strong|speculative, reasoning) and dropCandidates array.`;
  const raw = await callLlm(system, leagueContext);
  return parseJson<WaiverAssistantResult>(raw);
}

export async function getTradeAssistant(
  tradeContext: string,
): Promise<TradeAssistantResult> {
  const system = `You are Trade Assistant. Return JSON with fairnessScore (0-100), recommendation (accept|decline|counter), needAnalysis, playoffImpact, summary.`;
  const raw = await callLlm(system, tradeContext);
  return parseJson<TradeAssistantResult>(raw);
}
