/**
 * ============================================================================
 * VoxAI Studio — Frontend Controller
 * Enterprise-grade Vanilla JS application.
 *
 * Features:
 * - Realtime Web Audio API waveform visualization (HTML5 Canvas + AnalyserNode)
 * - Complete custom audio player (Play/Pause, Seek, Speed, Volume, Download)
 * - ElevenLabs voice catalog browsing, category filtering, and audio preview
 * - Live character counter, word counter, and estimated duration
 * - Keyboard shortcuts (Ctrl/Cmd + Enter = Generate, Spacebar = Play/Pause)
 * - Persistent Generation History (localStorage)
 * - Graceful error handling and interactive API security guide
 * ============================================================================
 */

(() => {
  'use strict';

  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const state = {
    apiKeyConfigured: false,
    maskedKey: '',
    voices: [],
    selectedVoiceId: 'JBFqnCBsd6RMkjVDRZzb', // Default George
    selectedFilter: 'all',
    isGenerating: false,
    activePreviewAudio: null,
    activePreviewBtn: null,
    currentAudioBlob: null,
    currentAudioUrl: null,
    currentScriptText: '',
    history: [],
    audioContext: null,
    analyserNode: null,
    audioSourceNode: null,
    animationFrameId: null
  };

  // Sample Scripts for Quick Start
  const SAMPLE_SCRIPTS = {
    story: "The old lighthouse stood defiant against the tempest, its crystalline beam slicing through the torrential deluge. Down in the harbor, young Captain Vance checked the compass one last time. Every legend of the Siren's Reef warned sailors to turn back before the midnight tide, but tonight, the ancient map held secrets that could alter the fate of the entire realm.",
    keynote: "Welcome, innovators and creators. Today, we are unveiling a fundamental leap forward in synthetic media. By combining deep neural vocal synthesis with zero-latency streaming architecture, we are not merely generating speech—we are restoring the authentic emotion, rhythm, and nuanced presence of human conversation.",
    podcast: "Hey everyone, welcome back to another episode of Future Sync! I'm your host, and today we're tackling something that is changing every single industry: the rise of multimodal artificial intelligence. Make sure to hit that subscribe button, grab your favorite beverage, and let's jump right into today's conversation.",
    meditation: "Take a slow, deep breath in through your nose... feeling your chest expand with calm clarity. As you exhale slowly through your mouth, release any lingering tension from your shoulders and jaw. Allow your thoughts to settle like still water in a quiet, secluded forest.",
    news: "Good evening. We begin tonight with a major breakthrough in renewable energy transmission. Officials at the International Clean Energy Commission have announced successful deployment of superconducting grid nodes, marking a historic milestone in decarbonizing urban transportation."
  };

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const DOM = {
    // Nav & Status
    aiStatusPill: document.getElementById('aiStatusPill'),
    statusPulseDot: document.getElementById('statusPulseDot'),
    statusText: document.getElementById('statusText'),
    btnOpenConfigGuide: document.getElementById('btnOpenConfigGuide'),
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    
    // Script Editor
    scriptText: document.getElementById('scriptText'),
    btnSamplesMenu: document.getElementById('btnSamplesMenu'),
    samplesDropdown: document.getElementById('samplesDropdown'),
    samplesMenu: document.getElementById('samplesMenu'),
    btnPasteText: document.getElementById('btnPasteText'),
    btnCopyText: document.getElementById('btnCopyText'),
    btnClearText: document.getElementById('btnClearText'),
    wordCount: document.getElementById('wordCount'),
    charCount: document.getElementById('charCount'),
    charCounterPill: document.getElementById('charCounterPill'),
    estDuration: document.getElementById('estDuration'),
    
    // Voice Selector
    voiceCardsList: document.getElementById('voiceCardsList'),
    activeVoiceBadge: document.getElementById('activeVoiceBadge'),
    activeVoiceAvatar: document.getElementById('activeVoiceAvatar'),
    activeVoiceName: document.getElementById('activeVoiceName'),
    btnPreviewActiveVoice: document.getElementById('btnPreviewActiveVoice'),
    filterTabs: document.querySelectorAll('.voice-filter-tabs .tab-btn'),
    
    // Settings
    btnToggleSettings: document.getElementById('btnToggleSettings'),
    voiceSettingsAccordion: document.querySelector('.voice-settings-accordion'),
    sliderStability: document.getElementById('sliderStability'),
    sliderSimilarity: document.getElementById('sliderSimilarity'),
    sliderStyle: document.getElementById('sliderStyle'),
    checkSpeakerBoost: document.getElementById('checkSpeakerBoost'),
    selectModel: document.getElementById('selectModel'),
    valStability: document.getElementById('valStability'),
    valSimilarity: document.getElementById('valSimilarity'),
    valStyle: document.getElementById('valStyle'),
    btnResetSettings: document.getElementById('btnResetSettings'),
    
    // Generate CTA
    btnGenerate: document.getElementById('btnGenerate'),
    btnGeneratingText: document.getElementById('btnGeneratingText'),
    
    // Audio Player Result
    audioResultWrapper: document.getElementById('audioResultWrapper'),
    audioEmptyState: document.getElementById('audioEmptyState'),
    generatedAudioCard: document.getElementById('generatedAudioCard'),
    mainAudioElement: document.getElementById('mainAudioElement'),
    playerVoiceAvatar: document.getElementById('playerVoiceAvatar'),
    playerVoiceName: document.getElementById('playerVoiceName'),
    playerTimestamp: document.getElementById('playerTimestamp'),
    playerEngineBadge: document.getElementById('playerEngineBadge'),
    playerFormatTag: document.getElementById('playerFormatTag'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    waveformHoverTime: document.getElementById('waveformHoverTime'),
    currentTime: document.getElementById('currentTime'),
    totalDuration: document.getElementById('totalDuration'),
    scrubberTrack: document.getElementById('scrubberTrack'),
    scrubberProgress: document.getElementById('scrubberProgress'),
    scrubberThumb: document.getElementById('scrubberThumb'),
    btnPlayPause: document.getElementById('btnPlayPause'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    btnRestartAudio: document.getElementById('btnRestartAudio'),
    btnSkipBack: document.getElementById('btnSkipBack'),
    btnSkipForward: document.getElementById('btnSkipForward'),
    speedBtns: document.querySelectorAll('.speed-btn'),
    btnMuteToggle: document.getElementById('btnMuteToggle'),
    volumeHighIcon: document.getElementById('volumeHighIcon'),
    volumeMutedIcon: document.getElementById('volumeMutedIcon'),
    volumeSlider: document.getElementById('volumeSlider'),
    btnDownloadAudio: document.getElementById('btnDownloadAudio'),
    btnGenerateAnother: document.getElementById('btnGenerateAnother'),
    
    // History
    historyGrid: document.getElementById('historyGrid'),
    historyEmpty: document.getElementById('historyEmpty'),
    btnClearHistory: document.getElementById('btnClearHistory'),
    
    // Catalog Section
    fullCatalogGrid: document.getElementById('fullCatalogGrid'),
    
    // Modal
    configGuideModal: document.getElementById('configGuideModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCloseModalBtn: document.getElementById('btnCloseModalBtn'),
    btnFooterConfigGuide: document.getElementById('btnFooterConfigGuide'),
    btnCopyEnvSample: document.getElementById('btnCopyEnvSample'),
    
    // Modal Key Management Elements
    inputApiKey: document.getElementById('inputApiKey'),
    btnToggleKeyVisibility: document.getElementById('btnToggleKeyVisibility'),
    iconEyeOpen: document.getElementById('iconEyeOpen'),
    iconEyeClosed: document.getElementById('iconEyeClosed'),
    btnSaveApiKey: document.getElementById('btnSaveApiKey'),
    btnSaveApiKeyText: document.getElementById('btnSaveApiKeyText'),
    apiConnectFeedback: document.getElementById('apiConnectFeedback'),
    connectedKeyActions: document.getElementById('connectedKeyActions'),
    connectedKeyMasked: document.getElementById('connectedKeyMasked'),
    btnDisconnectKey: document.getElementById('btnDisconnectKey'),
    modalKeyStatusBadge: document.getElementById('modalKeyStatusBadge'),
    modalStatusDot: document.getElementById('modalStatusDot'),
    modalStatusText: document.getElementById('modalStatusText'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-message">${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --------------------------------------------------------------------------
  // Initialization & Backend Communication
  // --------------------------------------------------------------------------
  async function init() {
    loadSavedHistory();
    setupEventListeners();
    updateMetrics();
    initWaveformStatic();
    
    // Check system status and load voices
    await checkSystemStatus();
    await loadVoicesCatalog();
  }

  const FALLBACK_VOICES = [
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

  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        state.apiKeyConfigured = Boolean(data.apiKeyConfigured);
        state.maskedKey = data.maskedKey || '';
        updateKeyStatusUI(state.apiKeyConfigured, state.maskedKey);
      }
    } catch (err) {
      console.warn('[Status] Could not query server status:', err);
      updateKeyStatusUI(false);
      DOM.statusText.textContent = 'Standalone Mode';
    }
  }

  function updateKeyStatusUI(isConfigured, maskedKey = '') {
    state.apiKeyConfigured = isConfigured;
    if (isConfigured) {
      DOM.aiStatusPill.className = 'status-indicator-pill';
      DOM.statusText.textContent = 'AI Engine Ready';
      DOM.aiStatusPill.title = 'ElevenLabs API Key active • Click to manage';
      
      if (DOM.modalKeyStatusBadge) {
        DOM.modalKeyStatusBadge.className = 'api-connect-status-badge connected';
        DOM.modalStatusText.textContent = 'ElevenLabs Connected ✅';
      }
      if (DOM.connectedKeyActions) {
        DOM.connectedKeyActions.style.display = 'flex';
      }
      if (DOM.connectedKeyMasked) {
        DOM.connectedKeyMasked.textContent = maskedKey || 'Active Key';
      }
      if (DOM.inputApiKey) {
        DOM.inputApiKey.placeholder = 'Replace key (paste new key)...';
      }
    } else {
      DOM.aiStatusPill.className = 'status-indicator-pill status-warning';
      DOM.statusText.textContent = 'API Key Needed';
      DOM.aiStatusPill.title = 'Click to connect your ElevenLabs API Key';

      if (DOM.modalKeyStatusBadge) {
        DOM.modalKeyStatusBadge.className = 'api-connect-status-badge';
        DOM.modalStatusText.textContent = 'No API Key Configured';
      }
      if (DOM.connectedKeyActions) {
        DOM.connectedKeyActions.style.display = 'none';
      }
      if (DOM.inputApiKey) {
        DOM.inputApiKey.placeholder = 'Paste your ElevenLabs API Key (e.g. sk_...)';
      }
    }
  }

  function showConnectFeedback(msg, type = '') {
    if (!DOM.apiConnectFeedback) return;
    if (!msg) {
      DOM.apiConnectFeedback.style.display = 'none';
      return;
    }
    DOM.apiConnectFeedback.className = `api-connect-feedback ${type}`;
    DOM.apiConnectFeedback.textContent = msg;
    DOM.apiConnectFeedback.style.display = 'block';
  }

  async function handleSaveApiKey() {
    const keyInput = DOM.inputApiKey.value.trim();
    if (!keyInput) {
      showConnectFeedback('Please paste your ElevenLabs API Key first.', 'error');
      DOM.inputApiKey.focus();
      return;
    }

    if (keyInput.length < 10) {
      showConnectFeedback('API Key appears too short (must be at least 10 characters).', 'error');
      return;
    }

    DOM.btnSaveApiKey.disabled = true;
    DOM.btnSaveApiKeyText.textContent = 'Verifying...';
    showConnectFeedback('Connecting and verifying with ElevenLabs servers...', '');

    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        state.apiKeyConfigured = true;
        state.maskedKey = data.maskedKey || `${keyInput.slice(0, 4)}••••••••${keyInput.slice(-4)}`;
        updateKeyStatusUI(true, state.maskedKey);
        showConnectFeedback('✓ Connected successfully! Live ElevenLabs neural engine active.', 'success');
        DOM.inputApiKey.value = '';
        showToast('✨ ElevenLabs API Key connected successfully!', 'success');
        
        // Refresh voices live
        await loadVoicesCatalog();
      } else {
        const errMsg = data.error || data.details || 'Failed to authenticate key.';
        showConnectFeedback(`Error: ${errMsg}`, 'error');
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.warn('[SetKey] Network error:', err);
      showConnectFeedback('Could not reach backend server to save key.', 'error');
    } finally {
      DOM.btnSaveApiKey.disabled = false;
      DOM.btnSaveApiKeyText.textContent = 'Connect Key';
    }
  }

  async function handleDisconnectApiKey() {
    if (!confirm('Disconnect this ElevenLabs API Key? Studio will switch to free preview mode.')) return;

    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });

      if (res.ok) {
        state.apiKeyConfigured = false;
        state.maskedKey = '';
        updateKeyStatusUI(false);
        showConnectFeedback('Key disconnected. Studio is in free preview mode.', '');
        showToast('API Key disconnected.', 'info');
        await loadVoicesCatalog();
      }
    } catch (err) {
      console.warn('[Disconnect] Error:', err);
    }
  }

  async function loadVoicesCatalog() {
    try {
      const res = await fetch('/api/voices');
      if (res.ok) {
        const data = await res.json();
        state.voices = (data.voices && data.voices.length > 0) ? data.voices : FALLBACK_VOICES;
      } else {
        state.voices = FALLBACK_VOICES;
      }
    } catch (err) {
      console.warn('[Voices] Note: Using verified offline voices catalog:', err);
      state.voices = FALLBACK_VOICES;
    }

    renderVoiceCards();
    renderFullCatalog();
  }

  // --------------------------------------------------------------------------
  // Voice Selection & Catalog Rendering
  // --------------------------------------------------------------------------
  function renderVoiceCards() {
    if (!DOM.voiceCardsList) return;
    DOM.voiceCardsList.innerHTML = '';

    const filter = state.selectedFilter.toLowerCase();
    const filteredVoices = state.voices.filter(v => {
      if (filter === 'all') return true;
      if (filter === 'male') return (v.gender && v.gender.toLowerCase() === 'male');
      if (filter === 'female') return (v.gender && v.gender.toLowerCase() === 'female');
      if (filter === 'storytelling') return (v.use_case && v.use_case.toLowerCase().includes('story'));
      if (filter === 'conversational') return (v.use_case && v.use_case.toLowerCase().includes('convers'));
      if (filter === 'professional') return (v.use_case && (v.use_case.toLowerCase().includes('prof') || v.use_case.toLowerCase().includes('news')));
      return true;
    });

    if (filteredVoices.length === 0) {
      DOM.voiceCardsList.innerHTML = `
        <div style="text-align:center; padding: 24px; color: var(--text-muted); font-size: 0.8125rem;">
          No voices found for category "${state.selectedFilter}".
        </div>
      `;
      return;
    }

    filteredVoices.forEach(voice => {
      const isSelected = (voice.voice_id === state.selectedVoiceId);
      const firstLetter = voice.name.charAt(0).toUpperCase();

      const card = document.createElement('div');
      card.className = `voice-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      card.setAttribute('tabindex', '0');
      card.dataset.voiceId = voice.voice_id;

      card.innerHTML = `
        <div class="voice-card-left">
          <div class="voice-avatar">${firstLetter}</div>
          <div class="voice-info">
            <div class="voice-name-row">
              <span class="voice-name">${voice.name}</span>
              <span class="voice-tag">${voice.gender || 'Voice'}</span>
              <span class="voice-tag tag-accent">${voice.accent || 'Neutral'}</span>
            </div>
            <p class="voice-desc">${voice.description || 'Natural speech synthesis'}</p>
          </div>
        </div>
        <div class="voice-card-right">
          ${voice.preview_url ? `
            <button type="button" class="btn-preview-voice" data-preview-url="${voice.preview_url}" title="Preview ${voice.name}'s voice" aria-label="Preview ${voice.name}'s voice">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <polygon points="6 4 16 10 6 16 6 4"></polygon>
              </svg>
            </button>
          ` : ''}
        </div>
      `;

      // Select voice on card click
      card.addEventListener('click', (e) => {
        // Prevent selection if preview button was clicked
        if (e.target.closest('.btn-preview-voice')) return;
        selectVoice(voice);
      });

      // Keyboard selection (Enter or Space)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectVoice(voice);
        }
      });

      // Preview Audio Button Click
      const previewBtn = card.querySelector('.btn-preview-voice');
      if (previewBtn) {
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleVoicePreview(voice.preview_url, previewBtn);
        });
      }

      DOM.voiceCardsList.appendChild(card);
    });

    // Make sure active voice badge is updated
    const activeVoice = state.voices.find(v => v.voice_id === state.selectedVoiceId);
    if (activeVoice) {
      updateActiveVoiceBadge(activeVoice);
    }
  }

  function selectVoice(voice) {
    state.selectedVoiceId = voice.voice_id;
    updateActiveVoiceBadge(voice);

    // Update selected class on cards
    document.querySelectorAll('.voice-card').forEach(el => {
      const match = el.dataset.voiceId === voice.voice_id;
      el.classList.toggle('selected', match);
      el.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    showToast(`Narrator set to ${voice.name}`, 'info', 2000);
  }

  function updateActiveVoiceBadge(voice) {
    if (!DOM.activeVoiceAvatar || !DOM.activeVoiceName) return;
    DOM.activeVoiceAvatar.textContent = voice.name.charAt(0).toUpperCase();
    DOM.activeVoiceName.textContent = voice.name;
  }

  function toggleVoicePreview(previewUrl, buttonEl) {
    // If clicking the currently playing preview, stop it
    if (state.activePreviewAudio && state.activePreviewBtn === buttonEl) {
      stopVoicePreview();
      return;
    }

    // Stop existing preview if any
    stopVoicePreview();

    // Pause main player if playing
    if (!DOM.mainAudioElement.paused) {
      pauseAudio();
    }

    const audio = new Audio(previewUrl);
    state.activePreviewAudio = audio;
    state.activePreviewBtn = buttonEl;

    buttonEl.classList.add('playing');
    buttonEl.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor">
        <rect x="5" y="4" width="3.5" height="12" rx="1"></rect>
        <rect x="11.5" y="4" width="3.5" height="12" rx="1"></rect>
      </svg>
    `;

    audio.play().catch(err => {
      console.warn('[Preview] Could not play preview audio:', err);
      stopVoicePreview();
      showToast('Could not play voice preview audio.', 'warning');
    });

    audio.onended = () => {
      stopVoicePreview();
    };

    audio.onerror = () => {
      stopVoicePreview();
    };
  }

  function stopVoicePreview() {
    if (state.activePreviewAudio) {
      state.activePreviewAudio.pause();
      state.activePreviewAudio.currentTime = 0;
      state.activePreviewAudio = null;
    }
    if (state.activePreviewBtn) {
      state.activePreviewBtn.classList.remove('playing');
      state.activePreviewBtn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor">
          <polygon points="6 4 16 10 6 16 6 4"></polygon>
        </svg>
      `;
      state.activePreviewBtn = null;
    }
  }

  function renderFullCatalog() {
    if (!DOM.fullCatalogGrid) return;
    DOM.fullCatalogGrid.innerHTML = '';

    state.voices.forEach(voice => {
      const card = document.createElement('div');
      card.className = 'catalog-card';
      const firstLetter = voice.name.charAt(0).toUpperCase();

      card.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="voice-avatar" style="width:34px; height:34px; font-size:0.875rem;">${firstLetter}</div>
            <div>
              <h4 style="font-size:0.9375rem; font-weight:700;">${voice.name}</h4>
              <span style="font-size:0.6875rem; color:var(--text-muted);">${voice.gender || ''} • ${voice.accent || ''}</span>
            </div>
          </div>
          ${voice.preview_url ? `
            <button type="button" class="btn-preview-voice" data-url="${voice.preview_url}" title="Preview voice">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <polygon points="6 4 16 10 6 16 6 4"></polygon>
              </svg>
            </button>
          ` : ''}
        </div>
        <p style="font-size:0.8125rem; color:var(--text-secondary); margin-bottom:14px; min-height:38px; line-height:1.4;">${voice.description || 'Natural speech synthesis'}</p>
        <button type="button" class="btn btn-secondary btn-xs btn-use-voice" style="width:100%;">
          Select in Studio
        </button>
      `;

      // Preview button inside catalog
      const previewBtn = card.querySelector('.btn-preview-voice');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => {
          toggleVoicePreview(voice.preview_url, previewBtn);
        });
      }

      // Use voice button
      const useBtn = card.querySelector('.btn-use-voice');
      useBtn.addEventListener('click', () => {
        selectVoice(voice);
        const studioEl = document.getElementById('studio');
        if (studioEl) {
          studioEl.scrollIntoView({ behavior: 'smooth' });
        }
      });

      DOM.fullCatalogGrid.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // Script Editor & Metrics
  // --------------------------------------------------------------------------
  function updateMetrics() {
    const text = DOM.scriptText.value || '';
    const charCount = text.length;
    DOM.charCount.textContent = charCount.toLocaleString();

    // Limit warning styling
    DOM.charCounterPill.classList.remove('limit-warn', 'limit-danger');
    if (charCount > 4800) {
      DOM.charCounterPill.classList.add('limit-danger');
    } else if (charCount > 4000) {
      DOM.charCounterPill.classList.add('limit-warn');
    }

    // Word count
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    DOM.wordCount.textContent = words.toLocaleString();

    // Estimated duration: ~150 words per minute average reading speed
    const seconds = Math.round((words / 150) * 60);
    if (seconds === 0) {
      DOM.estDuration.textContent = '~0s';
    } else if (seconds < 60) {
      DOM.estDuration.textContent = `~${seconds}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const remSecs = seconds % 60;
      DOM.estDuration.textContent = `~${mins}m ${remSecs}s`;
    }
  }

  // --------------------------------------------------------------------------
  // Voice Generation Flow
  // --------------------------------------------------------------------------
  async function generateVoice() {
    if (state.isGenerating) return;

    const text = DOM.scriptText.value.trim();
    if (!text) {
      showToast('Please enter or paste a script before generating voice.', 'warning');
      DOM.scriptText.focus();
      return;
    }

    if (text.length > 5000) {
      showToast('Script exceeds 5,000 characters. Please shorten your script.', 'error');
      return;
    }

    // Stop previews
    stopVoicePreview();

    // Voice Settings
    const voiceSettings = {
      stability: parseFloat(DOM.sliderStability.value) || 0.5,
      similarity_boost: parseFloat(DOM.sliderSimilarity.value) || 0.75,
      style: parseFloat(DOM.sliderStyle.value) || 0.0,
      use_speaker_boost: DOM.checkSpeakerBoost.checked
    };

    const modelId = DOM.selectModel.value;

    // Set UI Generating state
    setGeneratingState(true);

    try {
      const isDemoMode = !state.apiKeyConfigured;
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice_id: state.selectedVoiceId,
          model_id: modelId,
          voice_settings: voiceSettings,
          useDemoAudio: isDemoMode
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const isLiveTts = response.headers.get('x-voxai-status') === 'synthesized-live';

      // If binary audio returned
      if (response.ok && (contentType.includes('audio/') || contentType.includes('application/octet-stream'))) {
        const audioBlob = await response.blob();
        state.currentAudioBlob = audioBlob;
        state.currentScriptText = text;

        if (state.currentAudioUrl) {
          URL.revokeObjectURL(state.currentAudioUrl);
        }
        state.currentAudioUrl = URL.createObjectURL(audioBlob);

        // Active voice metadata
        const activeVoice = state.voices.find(v => v.voice_id === state.selectedVoiceId) || {
          name: 'George',
          voice_id: state.selectedVoiceId,
          gender: 'Male'
        };

        // Load into player and play
        loadAudioIntoPlayer(state.currentAudioUrl, activeVoice, text, !isLiveTts);

        // If in demo preview, also trigger browser SpeechSynthesis for real spoken words
        if (!isLiveTts && window.speechSynthesis) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            const sysVoices = window.speechSynthesis.getVoices();
            if (sysVoices && sysVoices.length > 0) {
              const match = sysVoices.find(v => {
                const n = v.name.toLowerCase();
                if (activeVoice.gender === 'Female') {
                  return n.includes('female') || n.includes('zira') || n.includes('samantha') || n.includes('google us');
                } else {
                  return n.includes('male') || n.includes('david') || n.includes('george') || n.includes('mark');
                }
              }) || sysVoices[0];
              if (match) utterance.voice = match;
            }
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('[SpeechSynthesis] Notice:', e);
          }
        }

        // Save to recent history
        saveToHistory({
          id: Date.now(),
          textSnippet: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
          fullText: text,
          voiceName: activeVoice.name,
          voiceId: activeVoice.voice_id,
          engine: isLiveTts ? 'ElevenLabs' : 'Preview',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateString: new Date().toLocaleDateString()
        });

        if (isLiveTts) {
          showToast('✨ High-fidelity ElevenLabs voice generated successfully!', 'success');
        } else {
          showToast('✨ Rendered in Studio Free Preview mode. Connect ElevenLabs key for cinema neural voices.', 'info', 5000);
        }

        // Scroll to player card
        DOM.audioResultWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        // Handle error responses from backend
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { error: 'Voice synthesis request failed.' };
        }

        console.error('[Generate Error]', errData);

        if (errData.code === 'API_KEY_MISSING') {
          showToast('ElevenLabs API Key not configured. Opening setup modal...', 'warning', 5000);
          openConfigGuideModal();
        } else if (errData.code === 'INVALID_API_KEY') {
          showToast('Invalid ElevenLabs API key. Please check your API Security settings.', 'error', 6000);
          openConfigGuideModal();
        } else if (errData.code === 'RATE_LIMIT_OR_QUOTA_EXCEEDED') {
          showToast('ElevenLabs character quota or rate limit exceeded.', 'error', 6000);
        } else {
          showToast(errData.error || errData.details || 'Synthesis failed. Please try again.', 'error', 6000);
        }
      }
    } catch (netErr) {
      console.error('[Network Error]', netErr);
      showToast('Network error: Could not connect to the backend server.', 'error');
    } finally {
      setGeneratingState(false);
    }
  }

  function setGeneratingState(generating) {
    state.isGenerating = generating;
    if (generating) {
      DOM.btnGenerate.classList.add('generating');
      DOM.btnGenerate.disabled = true;

      const progressSteps = [
        'Connecting to AI engine...',
        'Synthesizing phonemes...',
        'Applying neural timbre...',
        'Rendering studio audio...'
      ];
      let stepIndex = 0;
      DOM.btnGeneratingText.textContent = progressSteps[0];
      
      const interval = setInterval(() => {
        if (!state.isGenerating) {
          clearInterval(interval);
          return;
        }
        stepIndex = (stepIndex + 1) % progressSteps.length;
        DOM.btnGeneratingText.textContent = progressSteps[stepIndex];
      }, 1200);
    } else {
      DOM.btnGenerate.classList.remove('generating');
      DOM.btnGenerate.disabled = false;
      DOM.btnGeneratingText.textContent = 'Synthesizing Voice...';
    }
  }

  // --------------------------------------------------------------------------
  // Custom Audio Player & Web Audio API Visualizer
  // --------------------------------------------------------------------------
  function loadAudioIntoPlayer(audioUrl, voice, scriptText, isDemo = false) {
    DOM.audioEmptyState.style.display = 'none';
    DOM.generatedAudioCard.style.display = 'block';

    DOM.playerVoiceAvatar.textContent = (voice.name || 'G').charAt(0).toUpperCase();
    DOM.playerVoiceName.textContent = `${voice.name} — Studio Narration`;
    DOM.playerTimestamp.textContent = `Generated today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (DOM.playerEngineBadge) {
      if (isDemo) {
        DOM.playerEngineBadge.className = 'engine-badge badge-preview';
        DOM.playerEngineBadge.textContent = 'Studio Free Preview';
      } else {
        DOM.playerEngineBadge.className = 'engine-badge badge-neural';
        DOM.playerEngineBadge.textContent = 'ElevenLabs Neural';
      }
    }

    if (DOM.playerFormatTag) {
      DOM.playerFormatTag.textContent = isDemo ? '22.0 kHz • WAV Demo' : '44.1 kHz • MP3';
    }

    DOM.mainAudioElement.src = audioUrl;
    DOM.mainAudioElement.playbackRate = 1.0;

    // Reset speeds
    DOM.speedBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.speed === '1.0'));

    // Setup Web Audio API context for waveform
    setupAudioContext();

    DOM.mainAudioElement.play().catch(e => {
      console.log('Autoplay deferred until user interaction:', e);
    });
  }

  function setupAudioContext() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audioContext = new AudioCtx();
        state.analyserNode = state.audioContext.createAnalyser();
        state.analyserNode.fftSize = 256;
        
        try {
          state.audioSourceNode = state.audioContext.createMediaElementSource(DOM.mainAudioElement);
          state.audioSourceNode.connect(state.analyserNode);
          state.analyserNode.connect(state.audioContext.destination);
        } catch (err) {
          console.warn('[AudioContext] Could not connect MediaElementSource:', err);
        }
      }
    }

    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }

    startWaveformVisualizer();
  }

  function togglePlayPause() {
    if (DOM.mainAudioElement.paused) {
      if (state.audioContext && state.audioContext.state === 'suspended') {
        state.audioContext.resume();
      }
      DOM.mainAudioElement.play();
    } else {
      pauseAudio();
    }
  }

  function pauseAudio() {
    DOM.mainAudioElement.pause();
  }

  function startWaveformVisualizer() {
    const canvas = DOM.waveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = state.analyserNode ? state.analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
    }

    function draw() {
      state.animationFrameId = requestAnimationFrame(draw);

      if (state.analyserNode && !DOM.mainAudioElement.paused) {
        state.analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Fallback or resting subtle vibration
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(10, (dataArray[i] || 20) * 0.95);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barCount = 72;
      const barWidth = (width / barCount) - 2;
      const step = Math.floor(bufferLength / barCount);

      // Playback progress ratio
      const progressRatio = DOM.mainAudioElement.duration 
        ? (DOM.mainAudioElement.currentTime / DOM.mainAudioElement.duration) 
        : 0;
      const progressX = progressRatio * width;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 15;
        const barHeight = Math.max(6, (val / 255) * height * 0.85);
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        // Gradient based on playback position
        if (x < progressX) {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(1, '#6366f1');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      // Draw subtle timeline playhead line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(progressX, 0, 2, height);
    }

    draw();
  }

  function initWaveformStatic() {
    const canvas = DOM.waveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const barCount = 72;
    const barWidth = (width / barCount) - 2;

    for (let i = 0; i < barCount; i++) {
      // Deterministic pleasant wave envelope
      const wave = Math.sin((i / barCount) * Math.PI);
      const barHeight = Math.max(8, wave * 50);
      const x = i * (barWidth + 2);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }

  // --------------------------------------------------------------------------
  // History Management (localStorage)
  // --------------------------------------------------------------------------
  const HISTORY_STORAGE_KEY = 'voxai_studio_history_v1';

  function loadSavedHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        state.history = JSON.parse(stored);
      }
    } catch (err) {
      console.warn('[History] Could not read localStorage:', err);
      state.history = [];
    }
    renderHistory();
  }

  function saveToHistory(item) {
    state.history.unshift(item);
    if (state.history.length > 20) {
      state.history = state.history.slice(0, 20);
    }
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (err) {
      console.warn('[History] Could not save to localStorage:', err);
    }
    renderHistory();
  }

  function renderHistory() {
    if (!DOM.historyGrid) return;
    DOM.historyGrid.innerHTML = '';

    if (state.history.length === 0) {
      DOM.historyGrid.appendChild(DOM.historyEmpty);
      DOM.historyEmpty.style.display = 'block';
      return;
    }

    DOM.historyEmpty.style.display = 'none';

    state.history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const firstLetter = (item.voiceName || 'R').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="history-card-header">
          <div class="history-voice-meta">
            <div class="history-avatar">${firstLetter}</div>
            <div>
              <h4 class="history-voice-name">${item.voiceName || 'Narrator'}</h4>
              <span class="history-date">${item.dateString} • ${item.timestamp}</span>
            </div>
          </div>
          <button type="button" class="btn-icon-control btn-delete-item" style="width:28px; height:28px;" title="Delete item">
            <svg viewBox="0 0 20 20" fill="currentColor" style="width:14px; height:14px;"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
        <div class="history-text-preview">"${item.textSnippet}"</div>
        <div class="history-card-actions">
          <button type="button" class="btn btn-ghost btn-xs btn-copy-script">
            <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-2V5H5v14h6v2H5a2 2 0 01-2-2V5z"/></svg>
            <span>Copy Text</span>
          </button>
          <button type="button" class="btn btn-secondary btn-xs btn-load-script">
            <span>Load in Studio</span>
          </button>
        </div>
      `;

      // Copy Script Button
      card.querySelector('.btn-copy-script').addEventListener('click', () => {
        navigator.clipboard.writeText(item.fullText || item.textSnippet);
        showToast('Script copied to clipboard!', 'success');
      });

      // Load Script Button
      card.querySelector('.btn-load-script').addEventListener('click', () => {
        DOM.scriptText.value = item.fullText || item.textSnippet;
        updateMetrics();
        if (item.voiceId) {
          const matchVoice = state.voices.find(v => v.voice_id === item.voiceId);
          if (matchVoice) selectVoice(matchVoice);
        }
        document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
        showToast('Script loaded into editor.', 'info');
      });

      // Delete Button
      card.querySelector('.btn-delete-item').addEventListener('click', () => {
        deleteHistoryItem(item.id);
      });

      DOM.historyGrid.appendChild(card);
    });
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter(item => item.id !== id);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (err) {
      console.warn(err);
    }
    renderHistory();
    showToast('Item removed from history.', 'info');
  }

  function clearAllHistory() {
    if (state.history.length === 0) return;
    if (confirm('Are you sure you want to clear your entire generation history?')) {
      state.history = [];
      try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
      } catch (err) {
        console.warn(err);
      }
      renderHistory();
      showToast('Generation history cleared.', 'info');
    }
  }

  // --------------------------------------------------------------------------
  // Modals & Navigation
  // --------------------------------------------------------------------------
  function openConfigGuideModal() {
    DOM.configGuideModal.classList.add('open');
    DOM.configGuideModal.setAttribute('aria-hidden', 'false');
  }

  function closeConfigGuideModal() {
    DOM.configGuideModal.classList.remove('open');
    DOM.configGuideModal.setAttribute('aria-hidden', 'true');
  }

  // --------------------------------------------------------------------------
  // Event Listeners Setup
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Textarea input
    DOM.scriptText.addEventListener('input', updateMetrics);

    // Keyboard Shortcuts: Ctrl/Cmd + Enter to Generate
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateVoice();
      }
      // Spacebar plays/pauses when not typing in textarea/input
      if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        if (DOM.mainAudioElement.src) {
          e.preventDefault();
          togglePlayPause();
        }
      }
    });

    // Paste Button
    DOM.btnPasteText.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          DOM.scriptText.value = (DOM.scriptText.value ? DOM.scriptText.value + '\n\n' : '') + text;
          updateMetrics();
          showToast('Text pasted from clipboard!', 'success');
        }
      } catch (err) {
        showToast('Clipboard access was blocked or empty.', 'warning');
      }
    });

    // Copy Script Button
    DOM.btnCopyText.addEventListener('click', () => {
      const text = DOM.scriptText.value;
      if (!text.trim()) {
        showToast('Script is empty.', 'warning');
        return;
      }
      navigator.clipboard.writeText(text);
      showToast('Script copied to clipboard!', 'success');
    });

    // Clear Script Button
    DOM.btnClearText.addEventListener('click', () => {
      if (!DOM.scriptText.value.trim()) return;
      if (confirm('Clear the script editor?')) {
        DOM.scriptText.value = '';
        updateMetrics();
        showToast('Editor cleared.', 'info');
      }
    });

    // Sample Scripts Dropdown
    DOM.btnSamplesMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = DOM.samplesDropdown.classList.contains('open');
      DOM.samplesDropdown.classList.toggle('open', !isOpen);
      DOM.btnSamplesMenu.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!DOM.samplesDropdown.contains(e.target)) {
        DOM.samplesDropdown.classList.remove('open');
        DOM.btnSamplesMenu.setAttribute('aria-expanded', 'false');
      }
    });

    // Selecting a sample script
    DOM.samplesMenu.querySelectorAll('.dropdown-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const sampleKey = btn.dataset.sample;
        if (SAMPLE_SCRIPTS[sampleKey]) {
          DOM.scriptText.value = SAMPLE_SCRIPTS[sampleKey];
          updateMetrics();
          DOM.samplesDropdown.classList.remove('open');
          showToast('Sample script loaded!', 'info');
        }
      });
    });

    // Filter Tabs
    DOM.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.filterTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        state.selectedFilter = tab.dataset.filter;
        renderVoiceCards();
      });
    });

    // Settings Sliders
    DOM.sliderStability.addEventListener('input', (e) => {
      DOM.valStability.textContent = `${Math.round(e.target.value * 100)}%`;
    });
    DOM.sliderSimilarity.addEventListener('input', (e) => {
      DOM.valSimilarity.textContent = `${Math.round(e.target.value * 100)}%`;
    });
    DOM.sliderStyle.addEventListener('input', (e) => {
      DOM.valStyle.textContent = `${Math.round(e.target.value * 100)}%`;
    });

    // Settings Accordion Toggle
    DOM.btnToggleSettings.addEventListener('click', () => {
      const isCollapsed = DOM.voiceSettingsAccordion.classList.toggle('collapsed');
      DOM.btnToggleSettings.setAttribute('aria-expanded', !isCollapsed ? 'true' : 'false');
    });

    // Reset Defaults
    DOM.btnResetSettings.addEventListener('click', () => {
      DOM.sliderStability.value = 0.5;
      DOM.sliderSimilarity.value = 0.75;
      DOM.sliderStyle.value = 0.0;
      DOM.checkSpeakerBoost.checked = true;
      DOM.selectModel.value = 'eleven_multilingual_v2';
      DOM.valStability.textContent = '50%';
      DOM.valSimilarity.textContent = '75%';
      DOM.valStyle.textContent = '0%';
      showToast('Settings reset to recommended defaults.', 'info');
    });

    // Generate CTA
    DOM.btnGenerate.addEventListener('click', generateVoice);

    // Audio Player Controls
    DOM.btnPlayPause.addEventListener('click', togglePlayPause);

    DOM.mainAudioElement.addEventListener('play', () => {
      DOM.playIcon.style.display = 'none';
      DOM.pauseIcon.style.display = 'block';
    });

    DOM.mainAudioElement.addEventListener('pause', () => {
      DOM.playIcon.style.display = 'block';
      DOM.pauseIcon.style.display = 'none';
    });

    DOM.mainAudioElement.addEventListener('timeupdate', () => {
      const cur = DOM.mainAudioElement.currentTime;
      const dur = DOM.mainAudioElement.duration || 0;
      DOM.currentTime.textContent = formatTime(cur);

      if (dur > 0) {
        const pct = (cur / dur) * 100;
        DOM.scrubberProgress.style.width = `${pct}%`;
        DOM.scrubberThumb.style.left = `${pct}%`;
        DOM.scrubberTrack.setAttribute('aria-valuenow', Math.round(pct));
      }
    });

    DOM.mainAudioElement.addEventListener('loadedmetadata', () => {
      DOM.totalDuration.textContent = formatTime(DOM.mainAudioElement.duration);
    });

    DOM.mainAudioElement.addEventListener('ended', () => {
      DOM.playIcon.style.display = 'block';
      DOM.pauseIcon.style.display = 'none';
      DOM.scrubberProgress.style.width = '0%';
      DOM.scrubberThumb.style.left = '0%';
    });

    // Scrubber Seeking
    function seekFromEvent(e, element) {
      const rect = element.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      if (DOM.mainAudioElement.duration) {
        DOM.mainAudioElement.currentTime = ratio * DOM.mainAudioElement.duration;
      }
    }

    DOM.scrubberTrack.addEventListener('click', (e) => {
      seekFromEvent(e, DOM.scrubberTrack);
    });

    // Waveform click to seek
    DOM.waveformCanvas.addEventListener('click', (e) => {
      seekFromEvent(e, DOM.waveformCanvas);
    });

    // Waveform hover time preview
    DOM.waveformCanvas.addEventListener('mousemove', (e) => {
      const rect = DOM.waveformCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      if (DOM.mainAudioElement.duration) {
        const hoverSecs = ratio * DOM.mainAudioElement.duration;
        DOM.waveformHoverTime.textContent = formatTime(hoverSecs);
      }
    });

    // Skip Buttons
    DOM.btnSkipBack.addEventListener('click', () => {
      DOM.mainAudioElement.currentTime = Math.max(0, DOM.mainAudioElement.currentTime - 5);
    });
    DOM.btnSkipForward.addEventListener('click', () => {
      DOM.mainAudioElement.currentTime = Math.min(DOM.mainAudioElement.duration || 0, DOM.mainAudioElement.currentTime + 5);
    });

    // Restart Audio
    DOM.btnRestartAudio.addEventListener('click', () => {
      DOM.mainAudioElement.currentTime = 0;
      DOM.mainAudioElement.play();
    });

    // Playback Speed Controls
    DOM.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed);
        DOM.mainAudioElement.playbackRate = speed;
      });
    });

    // Volume Slider & Mute Toggle
    DOM.volumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      DOM.mainAudioElement.volume = vol;
      DOM.mainAudioElement.muted = (vol === 0);
      updateVolumeIcons(vol === 0);
    });

    DOM.btnMuteToggle.addEventListener('click', () => {
      DOM.mainAudioElement.muted = !DOM.mainAudioElement.muted;
      updateVolumeIcons(DOM.mainAudioElement.muted);
      if (!DOM.mainAudioElement.muted && DOM.mainAudioElement.volume === 0) {
        DOM.mainAudioElement.volume = 1;
        DOM.volumeSlider.value = 1;
      }
    });

    function updateVolumeIcons(isMuted) {
      DOM.volumeHighIcon.style.display = isMuted ? 'none' : 'block';
      DOM.volumeMutedIcon.style.display = isMuted ? 'block' : 'none';
    }

    // Download Generated Audio
    DOM.btnDownloadAudio.addEventListener('click', () => {
      if (!state.currentAudioBlob && !state.currentAudioUrl) {
        showToast('No audio available for download.', 'warning');
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `voxai-narration-${timestamp}.mp3`;
      
      const link = document.createElement('a');
      link.href = state.currentAudioUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading ${filename}`, 'success');
    });

    // Generate Another Narration
    DOM.btnGenerateAnother.addEventListener('click', () => {
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
      DOM.scriptText.focus();
    });

    // History Clear All
    DOM.btnClearHistory.addEventListener('click', clearAllHistory);

    // Active Voice Preview Button in Studio Header
    if (DOM.btnPreviewActiveVoice) {
      DOM.btnPreviewActiveVoice.addEventListener('click', (e) => {
        e.stopPropagation();
        const activeVoice = state.voices.find(v => v.voice_id === state.selectedVoiceId);
        if (activeVoice && activeVoice.preview_url) {
          toggleVoicePreview(activeVoice.preview_url, DOM.btnPreviewActiveVoice);
        } else {
          showToast('No preview audio available for this voice.', 'info');
        }
      });
    }

    // Modal API Key Connect Handlers
    if (DOM.btnSaveApiKey) {
      DOM.btnSaveApiKey.addEventListener('click', handleSaveApiKey);
    }

    if (DOM.inputApiKey) {
      DOM.inputApiKey.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveApiKey();
        }
      });
    }

    if (DOM.btnDisconnectKey) {
      DOM.btnDisconnectKey.addEventListener('click', handleDisconnectApiKey);
    }

    if (DOM.btnToggleKeyVisibility) {
      DOM.btnToggleKeyVisibility.addEventListener('click', () => {
        const isPassword = DOM.inputApiKey.type === 'password';
        DOM.inputApiKey.type = isPassword ? 'text' : 'password';
        if (DOM.iconEyeOpen && DOM.iconEyeClosed) {
          DOM.iconEyeOpen.style.display = isPassword ? 'none' : 'block';
          DOM.iconEyeClosed.style.display = isPassword ? 'block' : 'none';
        }
      });
    }

    // Modal Triggers
    DOM.btnOpenConfigGuide.addEventListener('click', openConfigGuideModal);
    DOM.aiStatusPill.addEventListener('click', openConfigGuideModal);
    DOM.btnFooterConfigGuide.addEventListener('click', openConfigGuideModal);
    DOM.btnCloseModal.addEventListener('click', closeConfigGuideModal);
    DOM.btnCloseModalBtn.addEventListener('click', closeConfigGuideModal);

    DOM.configGuideModal.addEventListener('click', (e) => {
      if (e.target === DOM.configGuideModal) {
        closeConfigGuideModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.configGuideModal.classList.contains('open')) {
        closeConfigGuideModal();
      }
    });

    DOM.btnCopyEnvSample.addEventListener('click', () => {
      navigator.clipboard.writeText('ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here');
      showToast('Environment snippet copied!', 'success');
    });

    // Mobile Drawer Toggle
    DOM.mobileMenuToggle.addEventListener('click', () => {
      const isOpen = DOM.mobileDrawer.classList.toggle('open');
      DOM.mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        DOM.mobileDrawer.classList.remove('open');
        DOM.mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Active Navigation Highlight on Scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset;
      sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 120;
        const sectionId = current.getAttribute('id');
        const navItem = document.querySelector(`.desktop-nav a[href*="${sectionId}"]`);
        if (navItem && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          document.querySelectorAll('.desktop-nav .nav-link').forEach(n => n.classList.remove('active'));
          navItem.classList.add('active');
        }
      });
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
