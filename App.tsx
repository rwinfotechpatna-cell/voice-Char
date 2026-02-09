
import React, { useState, useRef, useEffect } from 'react';
import { GeminiTTSService } from './services/geminiService';
import { VoiceName, SpeechHistoryItem, GenerationSettings, SpeakerConfig } from './types';
import { VOICE_OPTIONS, MAX_TEXT_LENGTH, SAMPLE_RATE } from './constants';
import { decodeBase64, decodeAudioData, concatenatePcmBase64 } from './utils/audioUtils';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>({
    voice: 'Enceladus',
    mode: 'simple',
    speed: 1.0,
  });
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([
    { id: '1', name: 'Narrator', voice: 'Enceladus' },
    { id: '2', name: 'Alice', voice: 'Aoede' },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [history, setHistory] = useState<SpeechHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playAudio = async (base64Data: string) => {
    try {
      const ctx = initAudioContext();
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch (e) {}
        currentSourceRef.current = null;
      }
      const bytes = decodeBase64(base64Data);
      const audioBuffer = await decodeAudioData(bytes, ctx, SAMPLE_RATE, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = settings.speed;
      source.connect(ctx.destination);
      currentSourceRef.current = source;
      source.start(0);
      source.onended = () => { if (currentSourceRef.current === source) currentSourceRef.current = null; };
    } catch (err) {
      setError("Playback error. Try again.");
    }
  };

  const handlePreview = async (e: React.MouseEvent, voice: VoiceName) => {
    e.stopPropagation(); // Don't select the voice when clicking preview
    if (previewingVoiceId) return;
    
    setPreviewingVoiceId(voice);
    const service = new GeminiTTSService();
    try {
      const previewText = `Hi! I am the ${voice} voice. How do I sound?`;
      const base64Audio = await service.generateSpeech(previewText, voice);
      await playAudio(base64Audio);
    } catch (err) {
      setError("Preview failed.");
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const addSpeaker = () => {
    const nextId = (speakers.length + 1).toString();
    setSpeakers([...speakers, { id: nextId, name: `Speaker ${nextId}`, voice: 'Puck' }]);
  };

  const removeSpeaker = (id: string) => {
    if (speakers.length > 1) {
      setSpeakers(speakers.filter(s => s.id !== id));
    }
  };

  const updateSpeaker = (id: string, updates: Partial<SpeakerConfig>) => {
    setSpeakers(speakers.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Input is empty.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    const service = new GeminiTTSService();

    try {
      let finalAudioBase64 = '';

      if (settings.mode === 'script') {
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const audioChunks: string[] = [];

        for (const line of lines) {
          const match = line.match(/^([^:]+):(.*)$/);
          if (match) {
            const speakerName = match[1].trim();
            const content = match[2].trim();
            const speaker = speakers.find(s => s.name.toLowerCase() === speakerName.toLowerCase());
            const voice = speaker ? speaker.voice : settings.voice;
            const chunk = await service.generateSpeech(content, voice);
            audioChunks.push(chunk);
          } else {
            const chunk = await service.generateSpeech(line.trim(), settings.voice);
            audioChunks.push(chunk);
          }
        }
        finalAudioBase64 = concatenatePcmBase64(audioChunks);
      } else {
        finalAudioBase64 = await service.generateSpeech(text, settings.voice);
      }

      const newItem: SpeechHistoryItem = {
        id: Date.now().toString(),
        text: text.slice(0, 40) + "...",
        voice: settings.mode === 'script' ? 'Script Studio' : settings.voice,
        timestamp: Date.now(),
        audioData: finalAudioBase64,
      };

      setHistory(prev => [newItem, ...prev].slice(0, 15));
      await playAudio(finalAudioBase64);
    } catch (err: any) {
      setError(err.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Inter']">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">VOCALIZE <span className="text-indigo-600">STUDIO</span></h1>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em]">Next-Gen Neural Voice</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engine Status</span>
              <span className="text-xs font-semibold text-emerald-500 flex items-center">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                Ultra Depth Active
              </span>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, mode: s.mode === 'simple' ? 'script' : 'simple' }))}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${settings.mode === 'script' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}`}
            >
              {settings.mode === 'script' ? '🚀 SCRIPT MODE' : '📝 SIMPLE MODE'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Editor Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                {settings.mode === 'script' ? 'Conversation Script' : 'Text Editor'}
              </h2>
              <div className="flex space-x-2">
                 <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-400">
                    {text.length} / {MAX_TEXT_LENGTH}
                 </span>
              </div>
            </div>
            
            <textarea
              className="w-full h-[400px] p-8 text-xl border-none focus:ring-0 transition-all resize-none placeholder-slate-300 leading-relaxed font-medium text-slate-700"
              placeholder={settings.mode === 'script' 
                ? "Narrator: The journey begins...   \nAlice: Wait for me!   Where are we going?\nNarrator: To the edge of time." 
                : "Type something here... Use multiple spaces   to create human-like pauses."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isGenerating}
            />

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className="flex-1 sm:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-3 active:scale-95 group"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>PROCESS AUDIO...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span>GENERATE MASTERPIECE</span>
                  </>
                )}
              </button>

              {currentSourceRef.current && (
                 <button onClick={() => { if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch(e){} currentSourceRef.current = null; }}} className="p-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
                    STOP
                 </button>
              )}
            </div>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <span className="w-8 h-px bg-slate-200 mr-3"></span>
              Recent Generations
            </h3>
            {history.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-medium">
                Your audio library is empty.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow group">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <button onClick={() => playAudio(item.audioData)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                         </svg>
                      </button>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.text}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.voice}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Speaker Studio Section (Only in Script Mode) */}
          {settings.mode === 'script' && (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cast & Crew</h2>
                <button onClick={addSpeaker} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {speakers.map((s) => (
                  <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center space-x-2">
                       <input 
                         className="flex-1 bg-transparent border-none p-0 font-black text-slate-700 text-sm focus:ring-0 uppercase tracking-wide"
                         value={s.name}
                         onChange={(e) => updateSpeaker(s.id, { name: e.target.value })}
                         placeholder="Speaker Name"
                       />
                       <button onClick={() => removeSpeaker(s.id)} className="text-slate-300 hover:text-red-500">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-indigo-500"
                        value={s.voice}
                        onChange={(e) => updateSpeaker(s.id, { voice: e.target.value as VoiceName })}
                      >
                        {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <button 
                        onClick={(e) => handlePreview(e, s.voice)}
                        disabled={!!previewingVoiceId}
                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all"
                      >
                         {previewingVoiceId === s.voice ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                         )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Voice Config */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-6 space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Audio Dynamics</h2>
            
            {settings.mode === 'simple' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Voice</label>
                <div className="grid grid-cols-1 gap-2">
                  {VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSettings(s => ({ ...s, voice: v.id }))}
                      className={`relative text-left p-3 rounded-2xl border-2 transition-all group ${settings.voice === v.id ? 'bg-indigo-50 border-indigo-600 ring-4 ring-indigo-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-black ${settings.voice === v.id ? 'text-indigo-600' : 'text-slate-700'}`}>{v.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{v.style}</span>
                          <div 
                            onClick={(e) => handlePreview(e, v.id)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-indigo-600 hover:border-indigo-100 transition-all"
                          >
                             {previewingVoiceId === v.id ? (
                               <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             ) : (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                             )}
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{v.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Pace</label>
                  <span className="text-xs font-black text-indigo-600">{settings.speed}x</span>
               </div>
               <input 
                 type="range" min="0.5" max="2.0" step="0.1" 
                 value={settings.speed} 
                 onChange={(e) => setSettings(s => ({ ...s, speed: parseFloat(e.target.value) }))}
                 className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
               />
            </div>
          </div>
        </div>
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
           <span className="w-2 h-2 bg-red-500 rounded-full"></span>
           <span className="text-xs font-bold tracking-tight uppercase">{error}</span>
           <button onClick={() => setError(null)} className="ml-2 hover:text-red-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      )}
    </div>
  );
};

export default App;
