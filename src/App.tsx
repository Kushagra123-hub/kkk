import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Mic2, 
  Download, 
  Loader2, 
  ChevronRight, 
  Volume2, 
  Play,
  History,
  Settings,
  User,
  LogOut,
  Zap
} from 'lucide-react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Audio Utilities ---

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Int16Array, sampleRate: number = 24000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return buffer;
}

// --- Components ---

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0502]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="atmosphere absolute inset-0 pointer-events-none" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="mb-8 inline-block"
        >
          <div className="w-24 h-24 rounded-full border-2 border-orange-500/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-orange-500 animate-spin" />
            <Sparkles className="w-10 h-10 text-orange-500" />
          </div>
        </motion.div>
        
        <h1 className="text-6xl font-serif italic mb-2 tracking-tighter">KushagraGPT</h1>
        <p className="text-orange-500/80 font-mono text-sm tracking-widest uppercase mb-8">Version 2.12</p>
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ duration: 2, delay: 0.5 }}
          className="h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto"
        />
      </motion.div>
      
      <motion.button
        onClick={onComplete}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
        className="mt-12 px-8 py-3 glass rounded-full text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 group"
      >
        Enter Experience
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'image' | 'voice'>('image');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'image' | 'audio', data: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    aiRef.current = new GoogleGenAI({ apiKey });
  }, []);

  const generateImage = async () => {
    if (!prompt) return;
    if (!import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      setError("API Key is missing. Please set VITE_GEMINI_API_KEY in your environment variables and rebuild the app.");
      return;
    }
    if (!aiRef.current) return;
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setResult({
          type: 'image',
          data: `data:image/png;base64,${imagePart.inlineData.data}`
        });
      } else {
        throw new Error("No image data received from AI");
      }
    } catch (err: any) {
      console.error("Image generation failed:", err);
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateVoice = async () => {
    if (!prompt) return;
    if (!import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      setError("API Key is missing. Please set VITE_GEMINI_API_KEY in your environment variables and rebuild the app.");
      return;
    }
    if (!aiRef.current) return;
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this clearly: ${prompt}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const audioData = audioPart?.inlineData?.data;
      if (audioData) {
        // Convert base64 to Int16Array (assuming 16-bit PCM)
        const binaryString = atob(audioData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // The data is raw PCM 16-bit mono at 24kHz
        const samples = new Int16Array(bytes.buffer);
        const wavBuffer = encodeWAV(samples, 24000);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        setResult({
          type: 'audio',
          data: url
        });
      } else {
        throw new Error("No audio data received from AI");
      }
    } catch (err: any) {
      console.error("Voice generation failed:", err);
      setError(err.message || "Failed to generate voice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.data;
    link.download = result.type === 'image' ? `kushagra-gpt-image-${Date.now()}.png` : `kushagra-gpt-audio-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Background Elements */}
      <div className="atmosphere fixed inset-0 pointer-events-none z-0" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 glass">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="w-6 h-6 text-black fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic leading-none">KushagraGPT</h2>
            <span className="text-[10px] font-mono tracking-widest text-orange-500 uppercase opacity-70">v2.12 Premium</span>
          </div>
        </div>
        
        <div className="flex-1 max-w-sm overflow-hidden whitespace-nowrap ml-auto mr-8">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <span className="text-white font-serif italic text-sm tracking-widest mx-4">JAI MATA DI • JAI MATA DI • JAI MATA DI • </span>
            <span className="text-white font-serif italic text-sm tracking-widest mx-4">JAI MATA DI • JAI MATA DI • JAI MATA DI • </span>
          </motion.div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Sidebar - Controls */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-widest text-orange-500">Select Module</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setActiveTab('image'); setResult(null); }}
                className={cn(
                  "p-6 rounded-3xl flex flex-col items-center gap-3 transition-all duration-300",
                  activeTab === 'image' ? "glass bg-white/10 border-orange-500/50" : "glass hover:bg-white/5"
                )}
              >
                <ImageIcon className={cn("w-8 h-8", activeTab === 'image' ? "text-orange-500" : "text-white/40")} />
                <span className="text-sm font-medium">Image Gen</span>
              </button>
              <button 
                onClick={() => { setActiveTab('voice'); setResult(null); }}
                className={cn(
                  "p-6 rounded-3xl flex flex-col items-center gap-3 transition-all duration-300",
                  activeTab === 'voice' ? "glass bg-white/10 border-orange-500/50" : "glass hover:bg-white/5"
                )}
              >
                <Mic2 className={cn("w-8 h-8", activeTab === 'voice' ? "text-orange-500" : "text-white/40")} />
                <span className="text-sm font-medium">AI Voice</span>
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-orange-500">Input Prompt</h3>
              {activeTab === 'voice' && (
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-transparent text-xs font-mono border-none focus:ring-0 text-white/60 cursor-pointer hover:text-white"
                >
                  {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(v => (
                    <option key={v} value={v} className="bg-[#0a0502]">{v} Voice</option>
                  ))}
                </select>
              )}
            </div>
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'image' ? "Describe the image you want to create..." : "Enter text to convert to speech..."}
                className="w-full h-48 p-6 glass rounded-3xl resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50 placeholder:text-white/20 text-lg leading-relaxed"
              />
              <div className="absolute bottom-6 right-6 flex gap-2">
                <button 
                  onClick={activeTab === 'image' ? generateImage : generateVoice}
                  disabled={loading || !prompt}
                  className="px-6 py-3 bg-orange-500 text-black rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 active:scale-95"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  Generate
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Content - Preview */}
        <div className="lg:col-span-7">
          <div className="h-full min-h-[500px] glass rounded-[40px] relative flex flex-col overflow-hidden">
            <div className="absolute top-8 left-8 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Live Preview</span>
            </div>

            <div className="flex-1 flex items-center justify-center p-12">
              {error && (
                <div className="text-center p-8 glass bg-red-500/10 border-red-500/20 rounded-3xl max-w-sm">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="mt-4 text-xs font-mono uppercase tracking-widest text-white/40 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {!error && loading ? (
                <div className="text-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full mx-auto"
                  />
                  <p className="text-sm font-mono text-white/40 animate-pulse">Synthesizing Neural Patterns...</p>
                </div>
              ) : result ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center gap-8"
                >
                  {result.type === 'image' ? (
                    <div className="relative group">
                      <img 
                        src={result.data} 
                        alt="Generated" 
                        className="max-w-full max-h-[400px] rounded-3xl shadow-2xl border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                         <button 
                          onClick={downloadResult}
                          className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        >
                          <Download className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-md space-y-8">
                      <div className="p-12 glass rounded-[32px] flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                          <Volume2 className="w-10 h-10 text-orange-500" />
                        </div>
                        <div className="text-center">
                          <h4 className="font-serif italic text-xl">Audio Synthesized</h4>
                          <p className="text-xs text-white/40 font-mono mt-1">Voice: {selectedVoice}</p>
                        </div>
                        <audio controls src={result.data} className="w-full mt-4" />
                      </div>
                      <button 
                        onClick={downloadResult}
                        className="w-full py-4 glass hover:bg-white/10 rounded-2xl flex items-center justify-center gap-3 text-sm font-medium transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Download Audio File
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center space-y-4 opacity-20">
                  <Sparkles className="w-16 h-16 mx-auto" />
                  <p className="text-sm font-mono uppercase tracking-widest">Awaiting Neural Input</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-mono text-white/40 uppercase">System Ready</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-white/20 uppercase">Latency</span>
                  <span className="text-xs font-mono">142ms</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-white/20 uppercase">Model</span>
                  <span className="text-xs font-mono">Gemini 2.5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-12 px-8 border-t border-white/5 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4 opacity-40">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-widest">KushagraGPT Neural Engine</span>
          </div>
          <div className="flex items-center gap-8 text-xs font-mono text-white/20 uppercase tracking-widest">
          </div>
          <div className="text-xs font-mono text-white/20">
            © 2026 KUSHAGRA INDUSTRIES
          </div>
        </div>
      </footer>
    </div>
  );
}
