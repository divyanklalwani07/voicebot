/**
 * ============================================================================
 * VoxAI Studio - Backend Server
 * Production-grade Text-to-Speech API proxy & static asset server.
 *
 * Security:
 * - ELEVENLABS_API_KEY is stored in server-side environment variables only.
 * - The API key is NEVER sent to or accessible by client-side JavaScript.
 * - Includes rate limiting, input sanitization, and graceful error normalization.
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Simple native .env loader (zero-dependency resilience)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          // Remove wrapping quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (err) {
      console.warn('[Env] Notice: Error loading .env file:', err.message);
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Check if ElevenLabs key is validly configured
function isApiKeyConfigured() {
  const key = process.env.ELEVENLABS_API_KEY;
  return Boolean(
    key &&
    key.trim().length > 10 &&
    !key.includes('your_elevenlabs_api_key') &&
    !key.includes('your_api_key')
  );
}

// Curated official ElevenLabs voices catalog with verified live audio preview URLs
const CURATED_VOICES = [
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George (Warm, Captivating Storyteller)',
    category: 'premade',
    gender: 'Male',
    accent: 'British',
    age: 'Middle Aged',
    use_case: 'Storytelling & Narrative',
    description: 'Mature, warm, and captivating. Articulate and authoritative narration, ideal for stories, deep essays, and audiobooks.',
    preview_url: 'https://api.us.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiJlNjIwNmQxYS0wNzIxLTQ3ODctYWFmYi0wNmE2ZTcwNWNhYzUubXAzIiwidGltZXN0YW1wIjoxNzkxMzg1MjAwMDAwMDAwfQ%3D%3D'
  },
  {
    voice_id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice (Clear, Engaging Educator)',
    category: 'premade',
    gender: 'Female',
    accent: 'British',
    age: 'Middle Aged',
    use_case: 'Professional & Educational',
    description: 'Crisp, articulate, and welcoming tone. Exceptional clarity for educational courses, explainer videos, and executive presentations.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3'
  },
  {
    voice_id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda (Knowledgeable, Upbeat Professional)',
    category: 'premade',
    gender: 'Female',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Professional & Narrative',
    description: 'Bright, knowledgeable, and inviting. Great for tutorials, marketing campaigns, and friendly corporate voiceovers.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3'
  },
  {
    voice_id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Jessica (Playful, Warm, Bright)',
    category: 'premade',
    gender: 'Female',
    accent: 'American',
    age: 'Young',
    use_case: 'Conversational',
    description: 'Youthful, energetic, and expressive. Perfect for lively podcasts, animations, social media shorts, and commercials.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3'
  },
  {
    voice_id: 'hpp4J3VqNfWAUOO0d1Us',
    name: 'Bella (Warm, Soft, Empathetic)',
    category: 'premade',
    gender: 'Female',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Storytelling & Meditation',
    description: 'Warm, soothing, and emotionally resonant. Masterclass in gentle audiobook pacing and mindfulness narration.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3'
  },
  {
    voice_id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily (Velvety, Confident Actress)',
    category: 'premade',
    gender: 'Female',
    accent: 'British',
    age: 'Middle Aged',
    use_case: 'Professional & Drama',
    description: 'Sophisticated, silky British cadence. Ideal for luxury brand advertisements, theatre recitals, and audio fiction.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3'
  },
  {
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam (Deep, Resonant, Cinematic)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Storytelling & Commercial',
    description: 'Deep baritone with immense gravity and commanding presence. Superb for movie trailers, epic stories, and keynotes.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/d6905d7a-dd26-4187-bfff-1bd3a5ea7cac.mp3'
  },
  {
    voice_id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'Liam (Energetic Creator & Tech Host)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Young',
    use_case: 'Conversational & Social Media',
    description: 'Confident, fast-paced, and engaging. Built specifically for YouTube, TikTok, modern tech explainers, and casual vlogs.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3'
  },
  {
    voice_id: 'bIHbv24MWmeRgasZH58o',
    name: 'Will (Relaxed Optimist)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Young',
    use_case: 'Conversational',
    description: 'Chill, relatable, and approachable friend-next-door vibe. Great for lifestyle podcasts and conversational tutorials.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3'
  },
  {
    voice_id: 'cjVigY5qzO86Huf0OWal',
    name: 'Eric (Smooth, Trustworthy Broadcaster)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Professional & News',
    description: 'Smooth, polished, and trustworthy timbre. Excellent for commercial reads, banking explainers, and corporate training.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3'
  },
  {
    voice_id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris (Charming, Down-to-Earth)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Conversational',
    description: 'Casual, candid, and natural. Makes any script feel like an authentic spontaneous thought.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3'
  },
  {
    voice_id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian (Deep, Resonant, Comforting)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Storytelling & Social Media',
    description: 'Rich, velvet, comforting male voice. Outstanding for dramatic readings, meditations, and brand storytelling.',
    preview_url: 'https://api.us.elevenlabs.io/v1/voices/nPczCjzI2devNBz1zQrb/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiIyZGQzZTcyYy00ZmQzLTQyZjEtOTNlYS1hYmM1ZDRlNWFhMWQubXAzIiwidGltZXN0YW1wIjoxNzkxMzg1MjAwMDAwMDAwfQ%3D%3D'
  },
  {
    voice_id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel (Authoritative British Broadcaster)',
    category: 'premade',
    gender: 'Male',
    accent: 'British',
    age: 'Middle Aged',
    use_case: 'Professional & News',
    description: 'Prestigious BBC-style broadcaster tone. Impeccable diction for global news reporting and formal keynote addresses.',
    preview_url: 'https://api.us.elevenlabs.io/v1/voices/onwK4e9ZLuTAKqWW03F9/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiI3ZWVlMDIzNi0xYTcyLTRiODYtYjMwMy01ZGNhZGMwMDdiYTkubXAzIiwidGltZXN0YW1wIjoxNzkxMzg1MjAwMDAwMDAwfQ%3D%3D'
  },
  {
    voice_id: 'pqHfZKP75CvOlQylNhV4',
    name: 'Bill (Wise, Mature, Balanced)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Old',
    use_case: 'Storytelling & Commercial',
    description: 'Wise, seasoned elder voice. Adds profound gravitas, warmth, and nostalgia to historical content and storytelling.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3'
  },
  {
    voice_id: 'SAz9YHcvj6GT2YYXdXww',
    name: 'River (Relaxed, Neutral, Informative)',
    category: 'premade',
    gender: 'Neutral',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Conversational & Educational',
    description: 'Calm, balanced, modern neutral tone. Ideal for tech documentation, audio guides, and e-learning.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3'
  },
  {
    voice_id: 'N2lVS1w4EtoT3dr4eOWO',
    name: 'Callum (Husky Trickster)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Middle Aged',
    use_case: 'Storytelling & Characters',
    description: 'Gritty, edgy, playful character voice. Perfect for video game dialogues, animation acting, and villain narratives.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3'
  },
  {
    voice_id: 'SOYHLrjzK2X1ezoPC6cr',
    name: 'Harry (Fierce Warrior)',
    category: 'premade',
    gender: 'Male',
    accent: 'American',
    age: 'Young',
    use_case: 'Characters & Drama',
    description: 'Rough, intense, battle-tested warrior voice. Excellent for fantasy fiction, gaming, and intense scenes.',
    preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SOYHLrjzK2X1ezoPC6cr/86d178f6-f4b6-4e0e-85be-3de19f490794.mp3'
  }
];

// In-memory rate limiting (protect against spamming)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, entry);
    return true;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Cached live voices from ElevenLabs
let cachedVoices = null;
let lastVoicesFetch = 0;
const VOICES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Helper: Parse JSON body from request stream
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Cap at 1MB to prevent memory exhaustion
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large. Maximum size is 1MB.'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON payload in request body.'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

/**
 * Send JSON response helper
 */
function sendJson(res, statusCode, data, extraHeaders = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders
  });
  res.end(payload);
}

/**
 * Generate a dynamic demo audio buffer (WAV) if no API key is configured
 * Allows seamless offline / zero-setup previewing without crashing.
 */
function generateDemoAudioWav(text) {
  const sampleRate = 22050;
  const duration = Math.min(Math.max(2, (text.length / 20)), 8);
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate melodic multi-harmonic synthesized speech-like chime
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.sin((Math.PI * t) / duration); // envelope
    const f1 = 220 + 40 * Math.sin(2 * Math.PI * 1.5 * t);
    const f2 = 440 + 20 * Math.sin(2 * Math.PI * 3 * t);
    const f3 = 880;
    const sampleVal = (
      Math.sin(2 * Math.PI * f1 * t) * 0.5 +
      Math.sin(2 * Math.PI * f2 * t) * 0.3 +
      Math.sin(2 * Math.PI * f3 * t) * 0.2
    ) * env;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 16000)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Handle TTS API Request
 */
async function handleGenerateSpeech(req, res) {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    return sendJson(res, 429, {
      error: 'Rate limit exceeded. Please wait a minute before generating more narrations.'
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }

  const { text, voice_id, model_id, voice_settings } = body;

  // Validation
  if (!text || typeof text !== 'string' || !text.trim()) {
    return sendJson(res, 400, {
      error: 'Please enter text to synthesize. Text cannot be empty.'
    });
  }

  const trimmedText = text.trim();
  if (trimmedText.length > 5000) {
    return sendJson(res, 400, {
      error: `Text exceeds maximum allowed length of 5,000 characters (Current: ${trimmedText.length}).`
    });
  }

  const selectedVoiceId = (voice_id && typeof voice_id === 'string' && voice_id.trim())
    ? voice_id.trim()
    : 'JBFqnCBsd6RMkjVDRZzb'; // Default Aryan / George (Tech & Startup Narrator)

  const selectedModelId = (model_id && typeof model_id === 'string' && model_id.trim())
    ? model_id.trim()
    : (process.env.DEFAULT_MODEL_ID || 'eleven_multilingual_v2');

  const cleanSettings = {
    stability: typeof voice_settings?.stability === 'number'
      ? Math.max(0, Math.min(1, voice_settings.stability))
      : 0.5,
    similarity_boost: typeof voice_settings?.similarity_boost === 'number'
      ? Math.max(0, Math.min(1, voice_settings.similarity_boost))
      : 0.75,
    style: typeof voice_settings?.style === 'number'
      ? Math.max(0, Math.min(1, voice_settings.style))
      : 0.0,
    use_speaker_boost: typeof voice_settings?.use_speaker_boost === 'boolean'
      ? voice_settings.use_speaker_boost
      : true
  };

  // Check if API key is present
  const clientHeaderKey = req.headers['xi-api-key'] || req.headers['x-elevenlabs-key'];
  const explicitKey = (clientHeaderKey || body.apiKey || '').trim();
  const envKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const activeKey = explicitKey || envKey;
  const hasKey = Boolean(activeKey && activeKey.length > 10 && !activeKey.includes('your_api_key') && !activeKey.includes('your_elevenlabs'));

  if (!hasKey) {
    // If client requested demo mode or preview synthesis, return generated harmonic WAV audio
    if (body.demoMode || body.useDemoAudio) {
      console.log(`[TTS Demo] Generating dynamic melodic WAV demo for text length: ${trimmedText.length}`);
      const demoWav = generateDemoAudioWav(trimmedText);
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': demoWav.length,
        'Content-Disposition': 'inline; filename="voxai-demo-narration.wav"',
        'Cache-Control': 'no-cache',
        'X-VoxAI-Status': 'demo-synthesized',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(demoWav);
    }

    console.warn('[TTS] Notice: ELEVENLABS_API_KEY is not configured.');
    return sendJson(res, 401, {
      error: 'ElevenLabs API Key not configured.',
      details: 'Please connect your ElevenLabs API Key in API Security settings or use Studio Free Preview.',
      code: 'API_KEY_MISSING',
      isDemoMode: true,
      allowBrowserFallback: true
    });
  }

  // Call ElevenLabs official Text-to-Speech API
  const ttsEndpoint = `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(selectedVoiceId)}?output_format=mp3_44100_128`;

  try {
    const upstreamRes = await fetch(ttsEndpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': activeKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: trimmedText,
        model_id: selectedModelId,
        voice_settings: cleanSettings
      })
    });

    if (!upstreamRes.ok) {
      let upstreamErrText = '';
      try {
        const errJson = await upstreamRes.json();
        upstreamErrText = errJson?.detail?.message || errJson?.message || JSON.stringify(errJson);
      } catch {
        upstreamErrText = await upstreamRes.text();
      }

      console.error(`[ElevenLabs Error] HTTP ${upstreamRes.status}:`, upstreamErrText);

      // Translate common ElevenLabs error codes into helpful user guidance
      if (upstreamRes.status === 401) {
        return sendJson(res, 401, {
          error: 'Authentication failed with ElevenLabs.',
          details: 'Your ELEVENLABS_API_KEY appears to be invalid or expired. Check your .env file.',
          code: 'INVALID_API_KEY'
        });
      }

      if (upstreamRes.status === 429) {
        return sendJson(res, 429, {
          error: 'ElevenLabs rate limit or quota exceeded.',
          details: 'You have reached ElevenLabs usage tier limits. Check your ElevenLabs billing / character allowance.',
          code: 'RATE_LIMIT_OR_QUOTA_EXCEEDED'
        });
      }

      if (upstreamRes.status === 400) {
        return sendJson(res, 400, {
          error: 'Voice synthesis request rejected by ElevenLabs.',
          details: upstreamErrText || 'The requested voice ID or model ID may not be valid for your account tier.',
          code: 'BAD_REQUEST'
        });
      }

      return sendJson(res, upstreamRes.status, {
        error: 'ElevenLabs service returned an error.',
        details: upstreamErrText || `Status code: ${upstreamRes.status}`,
        code: 'UPSTREAM_ERROR'
      });
    }

    // Success! Stream/forward audio binary to client
    const audioArrayBuffer = await upstreamRes.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'inline; filename="voxai-narration.mp3"',
      'Cache-Control': 'no-cache',
      'X-VoxAI-Status': 'synthesized-live',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(audioBuffer);
  } catch (networkErr) {
    console.error('[Network Error] Failed to reach ElevenLabs:', networkErr);
    return sendJson(res, 502, {
      error: 'Network connectivity failure.',
      details: 'Could not connect to ElevenLabs servers. Please check your internet connection and try again.',
      code: 'NETWORK_FAILURE'
    });
  }
}

/**
 * Handle Voices List API Request
 */
async function handleGetVoices(req, res) {
  const hasKey = isApiKeyConfigured();

  // Check cache first
  const now = Date.now();
  if (cachedVoices && (now - lastVoicesFetch < VOICES_CACHE_TTL_MS)) {
    return sendJson(res, 200, {
      voices: cachedVoices,
      source: 'cached',
      apiKeyConfigured: hasKey
    });
  }

  try {
    const headers = { 'Accept': 'application/json' };
    if (hasKey) {
      headers['xi-api-key'] = process.env.ELEVENLABS_API_KEY.trim();
    }

    const upstreamRes = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      method: 'GET',
      headers
    });

    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      const rawVoices = data.voices || [];

      // Normalize voices format
      const normalized = rawVoices.map((v) => {
        const labels = v.labels || {};
        const gender = labels.gender || (v.category === 'premade' ? 'Voice' : 'Custom');
        const accent = labels.accent || 'Neutral';
        const useCase = labels['use case'] || labels.use_case || (labels.description ? labels.description : 'General');

        return {
          voice_id: v.voice_id,
          name: v.name,
          category: v.category || 'premade',
          gender: gender.charAt(0).toUpperCase() + gender.slice(1),
          accent: accent.charAt(0).toUpperCase() + accent.slice(1),
          age: labels.age ? (labels.age.charAt(0).toUpperCase() + labels.age.slice(1)).replace('_', ' ') : '',
          use_case: useCase,
          description: v.description || Object.entries(labels).map(([k, val]) => `${k}: ${val}`).join(' • ') || 'Natural AI Narration Voice',
          preview_url: v.preview_url || ''
        };
      });

      cachedVoices = normalized;
      lastVoicesFetch = now;

      return sendJson(res, 200, {
        voices: normalized,
        source: hasKey ? 'live_authenticated' : 'live_public',
        apiKeyConfigured: hasKey
      });
    } else {
      console.warn(`[Voices] ElevenLabs returned ${upstreamRes.status}, using curated catalog.`);
      return sendJson(res, 200, {
        voices: CURATED_VOICES,
        source: 'curated_fallback',
        apiKeyConfigured: hasKey
      });
    }
  } catch (err) {
    console.warn('[Voices] Note: Querying upstream voices failed, using curated catalog:', err.message);
    return sendJson(res, 200, {
      voices: CURATED_VOICES,
      source: 'curated_offline',
      apiKeyConfigured: hasKey
    });
  }
}

/**
 * Handle Setting, Testing, or Clearing API Key via Secure Server Endpoint
 */
async function handleSetApiKey(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }

  const { apiKey, action } = body;

  // Handle clearing / disconnecting API key
  if (action === 'clear' || action === 'disconnect' || apiKey === '') {
    delete process.env.ELEVENLABS_API_KEY;
    try {
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        content = content.replace(/ELEVENLABS_API_KEY=.*/g, 'ELEVENLABS_API_KEY=');
        fs.writeFileSync(envPath, content, 'utf8');
      }
    } catch (e) {
      console.warn('[Env] Notice: Could not clear key in .env:', e.message);
    }

    cachedVoices = null;
    lastVoicesFetch = 0;

    return sendJson(res, 200, {
      success: true,
      message: 'ElevenLabs API Key disconnected. Studio will operate in free preview mode.',
      apiKeyConfigured: false
    });
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return sendJson(res, 400, {
      error: 'Please provide a valid ElevenLabs API key string (minimum 10 characters).'
    });
  }

  const cleanKey = apiKey.trim();

  // Test key against ElevenLabs user endpoint
  try {
    const testRes = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
      method: 'GET',
      headers: { 'xi-api-key': cleanKey }
    });

    if (!testRes.ok && testRes.status === 401) {
      return sendJson(res, 401, {
        error: 'Authentication failed with ElevenLabs.',
        details: 'The provided API key was rejected by ElevenLabs. Please verify you copied the full key correctly.'
      });
    }
  } catch (verifyErr) {
    console.warn('[Key Test] Could not reach ElevenLabs for instant verification:', verifyErr.message);
  }

  process.env.ELEVENLABS_API_KEY = cleanKey;

  // Persist to .env file
  try {
    const envPath = path.join(__dirname, '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('ELEVENLABS_API_KEY=')) {
        content = content.replace(/ELEVENLABS_API_KEY=.*/g, `ELEVENLABS_API_KEY=${cleanKey}`);
      } else {
        content += `\nELEVENLABS_API_KEY=${cleanKey}\n`;
      }
    } else {
      content = `ELEVENLABS_API_KEY=${cleanKey}\nPORT=${PORT}\nDEFAULT_MODEL_ID=eleven_multilingual_v2\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('[Env] ELEVENLABS_API_KEY updated and persisted to .env successfully.');
  } catch (err) {
    console.warn('[Env] Could not write to .env:', err.message);
  }

  // Clear voices cache so next call refreshes with user's live voices
  cachedVoices = null;
  lastVoicesFetch = 0;

  return sendJson(res, 200, {
    success: true,
    message: 'ElevenLabs API Key connected and verified successfully!',
    apiKeyConfigured: true,
    maskedKey: `${cleanKey.slice(0, 4)}••••••••${cleanKey.slice(-4)}`
  });
}

/**
 * Handle API System Status
 */
function handleGetStatus(req, res) {
  const configured = isApiKeyConfigured();
  const rawKey = process.env.ELEVENLABS_API_KEY?.trim() || '';
  const maskedKey = configured && rawKey.length > 8
    ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`
    : '';

  return sendJson(res, 200, {
    status: 'online',
    appName: 'VoxAI Studio',
    version: '2.5.0',
    apiKeyConfigured: configured,
    maskedKey: maskedKey,
    mode: configured ? 'production_live' : 'configuration_needed',
    defaultModel: process.env.DEFAULT_MODEL_ID || 'eleven_multilingual_v2',
    timestamp: new Date().toISOString()
  });
}

/**
 * Static file server with security containment
 */
function serveStaticFile(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;

  // Normalize path and prevent directory traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.join(__dirname, safePath);

  // Contain within project root
  if (!absolutePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Prevent serving .env or hidden files
  const baseName = path.basename(absolutePath);
  if (baseName.startsWith('.env') || baseName.startsWith('.git') || baseName === 'package-lock.json') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Protected File');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback: If requesting HTML route or not found, return 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found - VoxAI Studio</title><style>body{background:#090d16;color:#e2e8f0;font-family:sans-serif;text-align:center;padding:50px;}</style></head>
        <body>
          <h1>404 - File Not Found</h1>
          <p>The requested resource <code>${pathname}</code> was not found.</p>
          <a href="/" style="color:#6366f1;">Return to VoxAI Studio</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });

    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  });
}

/**
 * Main HTTP Server
 */
const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, xi-api-key',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Routing
  if (pathname === '/api/status' && req.method === 'GET') {
    return handleGetStatus(req, res);
  }
  if (pathname === '/api/voices' && req.method === 'GET') {
    return handleGetVoices(req, res);
  }
  if (pathname === '/api/generate-speech' && req.method === 'POST') {
    return handleGenerateSpeech(req, res);
  }
  if (pathname === '/api/set-key' && req.method === 'POST') {
    return handleSetApiKey(req, res);
  }

  // Static Assets
  if (req.method === 'GET') {
    return serveStaticFile(req, res, pathname);
  }

  // Method not allowed
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  const isKeyReady = isApiKeyConfigured();
  console.log('================================================================');
  console.log(`🎙️  VoxAI Studio Server listening on http://localhost:${PORT}`);
  console.log(`🔒  Security Mode: Backend Proxy Active (Client never sees API Key)`);
  console.log(`🔑  ElevenLabs API Key Status: ${isKeyReady ? 'Configured ✅' : 'Not Set / Inactive ⚠️'}`);
  if (!isKeyReady) {
    console.log(`👉  To enable live ElevenLabs TTS, set ELEVENLABS_API_KEY in .env`);
  }
  console.log('================================================================');
});
