import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Video, 
  Mic, 
  Play, 
  Loader2, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateVideo, generateVideoKie, generateTTS } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [useKie, setUseKie] = useState(false);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleOpenKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'start') setStartImage(reader.result as string);
        else setEndImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!startImage || !endImage || !videoPrompt || !ttsText) {
      setError('Please provide all inputs: start frame, end frame, video prompt, and voice-over text.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setAudioUrl(null);

    try {
      setStatus('Generating Voice-over...');
      const audio = await generateTTS(ttsText);
      setAudioUrl(audio);

      setStatus('Initializing Video Generation...');
      if (useKie) {
        const video = await generateVideoKie(videoPrompt, startImage, endImage);
        setVideoUrl(video);
      } else {
        const video = await generateVideo(videoPrompt, startImage, endImage);
        setVideoUrl(video);
      }
      
      setStatus('Generation Complete!');
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '';
      setError(errorMessage || 'An error occurred during generation.');
      
      if (errorMessage.includes('Requested entity was not found') || 
          errorMessage.includes('PERMISSION_DENIED') || 
          errorMessage.includes('403')) {
        setHasKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSyncKie = async () => {
    setStatus('Syncing with kie.ai...');
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://api.kie.ai/v1/sync', // Example endpoint
          method: 'POST',
          body: { timestamp: new Date().toISOString() }
        })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus('Sync successful!');
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setError(`Kie Sync Error: ${err.message}`);
    }
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-black/5 text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Video className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">API Key Required</h1>
          <p className="text-gray-500 mb-8">
            Veo 3 video generation requires a paid Google Cloud project API key.
          </p>
          <button
            onClick={handleOpenKey}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            Select API Key
            <ExternalLink className="w-4 h-4" />
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
          >
            Learn about billing
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans selection:bg-indigo-100">
      <header className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Veo Studio</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-full border border-black/5 p-1">
            <button 
              onClick={() => setUseKie(false)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                !useKie ? "bg-black text-white" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Gemini
            </button>
            <button 
              onClick={() => setUseKie(true)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                useKie ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Kie.ai
            </button>
          </div>
          <button 
            onClick={handleSyncKie}
            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 rounded-full border border-black/5 text-xs font-medium text-indigo-600 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Kie Sync
          </button>
          <button 
            onClick={handleOpenKey}
            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 rounded-full border border-black/5 text-xs font-medium text-gray-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Sync API Key
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-black/5 text-xs font-medium text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {useKie ? 'Kie Veo 3' : 'Gemini Veo 3.1'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Frames</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Start Frame */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Start Frame</label>
                <div 
                  className={cn(
                    "relative aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
                    startImage ? "border-transparent" : "border-gray-200 hover:border-indigo-400 cursor-pointer"
                  )}
                  onClick={() => !startImage && document.getElementById('start-upload')?.click()}
                >
                  {startImage ? (
                    <>
                      <img src={startImage} className="w-full h-full object-cover" alt="Start" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setStartImage(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white hover:bg-black/70 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4 rotate-45" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-300 mb-2" />
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Upload</span>
                    </>
                  )}
                  <input 
                    id="start-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'start')} 
                  />
                </div>
              </div>

              {/* End Frame */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">End Frame</label>
                <div 
                  className={cn(
                    "relative aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
                    endImage ? "border-transparent" : "border-gray-200 hover:border-indigo-400 cursor-pointer"
                  )}
                  onClick={() => !endImage && document.getElementById('end-upload')?.click()}
                >
                  {endImage ? (
                    <>
                      <img src={endImage} className="w-full h-full object-cover" alt="End" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEndImage(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white hover:bg-black/70 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4 rotate-45" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-300 mb-2" />
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Upload</span>
                    </>
                  )}
                  <input 
                    id="end-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'end')} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Video Prompt</label>
                <textarea 
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Describe the transition between frames..."
                  className="w-full h-24 p-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice-over Script</label>
                <textarea 
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Enter the text for the AI voice-over..."
                  className="w-full h-24 p-4 bg-gray-50 rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm leading-relaxed"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all",
                isGenerating 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{status}</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Generate Cinematic Video</span>
                </>
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-red-50 rounded-xl flex items-start gap-3 border border-red-100"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 leading-relaxed">{error}</p>
              </motion.div>
            )}
          </section>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Output Preview</h2>
              {videoUrl && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <AnimatePresence mode="wait">
                {videoUrl ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black group">
                      <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {audioUrl && (
                      <div className="bg-gray-50 rounded-2xl p-6 border border-black/5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Mic className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium">Voice-over Audio</span>
                        </div>
                        <audio src={audioUrl} controls className="w-full" />
                      </div>
                    )}
                  </motion.div>
                ) : isGenerating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-8 h-8 text-indigo-200" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">{status}</p>
                      <p className="text-sm text-gray-400 max-w-xs mx-auto">
                        This may take 2-3 minutes. We're crafting your cinematic experience.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4 max-w-xs"
                  >
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <ImageIcon className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Generation Yet</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Upload your frames and provide a prompt to start the AI generation process.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

