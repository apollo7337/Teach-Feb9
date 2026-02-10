
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { HybridRecorder } from './components/HybridRecorder';
import { Teleprompter } from './components/Teleprompter';
import { AppStatus } from './types';
import { transcribeAudio, generateTeacherScript } from './services/geminiService';

const TWEAK_OPTIONS = [
  { label: '✨ More Visionary', prompt: 'Make it more visionary and focus on the future of education.' },
  { label: '💻 Focus on Remote Tech', prompt: 'Emphasize the expertise in remote learning tools and tactics.' },
  { label: '🎯 Goal Oriented', prompt: 'Focus more on specific student outcomes and tactical goals.' },
  { label: '⚡ Short & Punchy', prompt: 'Make it shorter, faster-paced, and more energetic.' },
  { label: '🤝 Warm & Friendly', prompt: 'Increase the warmth and approachable nature of the tone.' },
];

const App: React.FC = () => {
  const [bio, setBio] = useState('');
  const [script, setScript] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);

  // Listen for custom error events from child components (like Permission Denied)
  useEffect(() => {
    const handleAppError = (e: any) => {
      setErrorMessage(e.detail);
      setStatus(AppStatus.ERROR);
    };
    window.addEventListener('app-error', handleAppError);
    return () => window.removeEventListener('app-error', handleAppError);
  }, []);

  const handleAudioReady = async (base64: string, mimeType: string) => {
    try {
      setErrorMessage(null);
      setStatus(AppStatus.TRANSCRIBING);
      const text = await transcribeAudio(base64, mimeType);
      setBio(prev => prev ? `${prev}\n\n${text}` : text);
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to transcribe audio.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleGenerateScript = async (customInstruction?: string) => {
    if (!bio.trim()) return;
    try {
      setErrorMessage(null);
      setStatus(AppStatus.GENERATING);
      const generated = await generateTeacherScript(bio, customInstruction);
      setScript(generated);
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate script.");
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <Layout>
      <div className="space-y-12">
        {/* Step 1: Input */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Your Story</h2>
              <p className="text-[#86868b] text-sm">Paste your bio or record your voice to begin.</p>
            </div>
            <HybridRecorder 
              status={status} 
              onAudioReady={handleAudioReady} 
              setStatus={setStatus} 
            />
          </div>
          
          <div className="relative">
            <textarea
              className="w-full h-48 p-6 bg-[#f5f5f7] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#1d1d1f] transition-all placeholder:text-gray-400 font-medium"
              placeholder="Tell us about your teaching philosophy, remote learning experience, and educational goals..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={status === AppStatus.TRANSCRIBING || status === AppStatus.GENERATING}
            />
            {status === AppStatus.TRANSCRIBING && (
              <div className="absolute inset-0 bg-white/60 rounded-2xl backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-blue-600">Transcribing voice...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => handleGenerateScript()}
              disabled={!bio.trim() || status === AppStatus.TRANSCRIBING || status === AppStatus.GENERATING}
              className={`px-8 py-3 rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20 ${
                !bio.trim() || status === AppStatus.TRANSCRIBING || status === AppStatus.GENERATING
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {status === AppStatus.GENERATING ? '⏳ Drafting...' : 'Generate Script'}
            </button>
          </div>
        </section>

        {/* Step 2: Result & Refinement */}
        {script && (
          <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 animate-in slide-in-from-bottom-6 duration-700 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">Script Studio</h2>
                <p className="text-[#86868b] text-sm">Review and edit your intro. Changes here sync with the teleprompter.</p>
              </div>
              <button
                onClick={() => setShowTeleprompter(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition-all group shadow-xl shadow-blue-500/20"
              >
                Go to Teleprompter
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#86868b] px-1">Quick Refinements</span>
              <div className="flex flex-wrap gap-2">
                {TWEAK_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    disabled={status === AppStatus.TRANSCRIBING || status === AppStatus.GENERATING}
                    onClick={() => handleGenerateScript(option.prompt)}
                    className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              {status === AppStatus.GENERATING ? (
                <div className="p-8 bg-[#1d1d1f] text-white rounded-2xl flex items-center justify-center min-h-[160px]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                  </div>
                </div>
              ) : (
                <textarea
                  className="w-full min-h-[200px] p-8 bg-[#1d1d1f] text-white rounded-2xl font-medium text-lg leading-relaxed shadow-inner border-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Your script will appear here..."
                />
              )}
              
              <div className="absolute top-4 right-4 flex items-center gap-2">
                 <span className="bg-white/10 text-white/40 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">Editable</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm text-[#86868b]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Word Count: {script.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <button onClick={() => setScript('')} className="text-[#86868b] hover:text-red-500 transition-colors font-medium">Start Over</button>
            </div>
          </section>
        )}
      </div>

      {showTeleprompter && (
        <Teleprompter text={script} onClose={() => setShowTeleprompter(false)} />
      )}
      
      {/* Dynamic Error Toast with Troubleshooting */}
      {status === AppStatus.ERROR && (
        <div className="fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[480px] bg-white border border-red-200 p-6 rounded-[24px] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4 z-[110]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[#1d1d1f] text-lg">Access Denied</span>
              <p className="text-sm text-[#86868b] leading-relaxed">
                {errorMessage?.includes('PERMISSION_DENIED') 
                  ? "Your browser has blocked the microphone. To fix this, look for the 'Lock' icon next to the address bar, click it, and switch Microphone to 'Allow'."
                  : errorMessage || "An unexpected error occurred."}
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">How to Fix</span>
            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside font-medium">
              <li>Click the 🔒 Lock icon in the address bar.</li>
              <li>Change <strong>Microphone</strong> to <strong>Allow</strong>.</li>
              <li>Refresh the page to apply changes.</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 bg-red-600 text-white text-sm font-bold py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
              Refresh Now
            </button>
            <button 
              onClick={() => { setStatus(AppStatus.IDLE); setErrorMessage(null); }} 
              className="px-6 bg-gray-100 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
