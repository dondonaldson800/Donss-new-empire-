
import React, { useState, useRef, useEffect } from 'react';
import { runGroundedSearch } from '../services/geminiService';
import { AppMode, ChatMessage, SubscriptionTier } from '../types';

interface ChatViewProps {
  mode: AppMode;
  tier: SubscriptionTier;
}

const ChatView: React.FC<ChatViewProps> = ({ mode, tier }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [errorType, setErrorType] = useState<'none' | 'quota' | 'general'>('none');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setErrorType('none');
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const result = await runGroundedSearch(currentInput, mode, useThinking);
      const aiMsg: ChatMessage = {
        role: 'model',
        content: result.text,
        sources: result.sources,
        isThinking: useThinking
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("API ERROR:", error);
      const errorStr = JSON.stringify(error).toLowerCase();
      const isQuota = errorStr.includes('429') || errorStr.includes('resource_exhausted') || errorStr.includes('quota');
      setErrorType(isQuota ? 'quota' : 'general');
      
      const errorMsg: ChatMessage = { 
        role: 'model', 
        content: isQuota 
          ? "CRITICAL: Public Empire Node Saturated. Shared capacity has reached its ceiling. Establish a private bridge with your own API key to bypass all limits and unlock the full speed of the Grounded Empire."
          : "Transmission Error: Failed to secure grounded response. Verify Empire Node connectivity." 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions to avoid race conditions
      setErrorType('none');
    } else {
      alert("Empire key management is unavailable in this environment.");
    }
  };

  const isMedicalOrLegal = mode === AppMode.LEGAL || mode === AppMode.MEDICAL;

  return (
    <div className="flex flex-col h-full bg-[#0A0E14] relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0A0E14]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8a6d1d] p-[1px]">
              <div className="w-full h-full rounded-2xl bg-[#0A0E14] flex items-center justify-center text-xl shadow-inner">
                🏛️
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0A0E14]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              {mode.replace('_', ' ')} Intelligence
              <span className="text-[10px] font-black bg-[#D4AF37] text-black px-1.5 py-0.5 rounded-md shadow-sm">CORE</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Grounding Engine v3.2</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${useThinking ? 'text-[#D4AF37]' : 'text-zinc-500'}`}>
               {useThinking ? 'Reasoning Active' : 'Fast Mode'}
             </span>
             <button 
               onClick={() => tier !== SubscriptionTier.FREE && setUseThinking(!useThinking)}
               disabled={tier === SubscriptionTier.FREE}
               className={`relative w-12 h-6 rounded-full transition-all duration-300 ${useThinking ? 'bg-[#D4AF37]' : 'bg-zinc-800'} ${tier === SubscriptionTier.FREE ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
             >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${useThinking ? 'left-7' : 'left-1'}`} />
             </button>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto px-4 md:px-12 py-8 space-y-10 scroll-smooth custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="w-24 h-24 rounded-3xl bg-[#1C222D] border border-white/5 flex items-center justify-center text-5xl mb-8 shadow-2xl relative">
              <div className="absolute inset-0 bg-[#D4AF37]/10 blur-2xl rounded-full" />
              🔍
            </div>
            <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Verified Grounding</h1>
            <p className="text-zinc-500 text-lg leading-relaxed mb-12">
              Search the live web with zero hallucinations. Every answer is backed by verified authority sources.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {[
                { label: 'Market Sentiment', q: 'Analyze global semiconductor volatility' },
                { label: 'Legal Statutes', q: 'Summary of 2026 AI Safety compliance protocols' },
                { label: 'Medical Research', q: 'Latest peer-reviewed data on mRNA breakthroughs' },
                { label: 'Logistics Optimization', q: 'Map current trans-pacific congestion routes' }
              ].map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => setInput(item.q)}
                  className="group p-4 bg-[#1C222D]/40 border border-white/5 rounded-2xl text-left hover:border-[#D4AF37]/50 hover:bg-[#1C222D]/60 transition-all duration-300"
                >
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors line-clamp-1">{item.q}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
          >
            <div className={`relative max-w-[85%] sm:max-w-2xl group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`p-5 rounded-3xl shadow-2xl transition-all duration-300 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#b8952b] text-[#0A0E14] font-bold rounded-tr-sm' 
                  : 'bg-[#1C222D] text-zinc-100 rounded-tl-sm border border-white/5'
              }`}>
                {msg.isThinking && (
                  <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-[#D4AF37] uppercase tracking-tighter">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                    </span>
                    Deep Reason Cycle Completed
                  </div>
                )}
                
                <div className={`whitespace-pre-wrap text-sm sm:text-base leading-relaxed`}>
                  {msg.content}
                </div>

                {isMedicalOrLegal && msg.role === 'model' && (
                  <div className="mt-6 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <span className="text-xs">⚠️</span>
                    <p className="text-[10px] text-red-200/70 font-bold uppercase leading-tight tracking-tight">
                      Regulatory Guardrail: Informational research only. Professional consultation is mandatory for legal/medical decisions.
                    </p>
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Source Evidence
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, idx) => (
                        <a 
                          key={idx} 
                          href={src.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#0A0E14]/50 border border-white/5 rounded-full text-[10px] text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#0A0E14] transition-all max-w-full truncate"
                        >
                          <span className="text-[#D4AF37]">🔗</span>
                          <span className="truncate">{src.title || src.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empire Override Action for Quota Issues */}
                {i === messages.length - 1 && errorType === 'quota' && (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-3 text-left">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">Empire Node Overloaded</h4>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">The Grounded Empire's shared nodes are under heavy load. To bypass the queue and ensure zero-latency response, establish a private bridge using your own billing key.</p>
                    <button 
                      onClick={handleSwitchKey}
                      className="bg-[#D4AF37] hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      Establish Private Bridge (Switch Key)
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 hover:text-white transition-colors underline text-center">API Billing Documentation</a>
                  </div>
                )}
              </div>
              
              <div className={`mt-2 px-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.role === 'user' ? 'Transmission confirmed' : `Grounded Engine v3.2 Verified • ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[#1C222D] p-6 rounded-3xl rounded-tl-sm border border-white/5 shadow-2xl flex flex-col gap-4 max-w-md w-full">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#D4AF37] animate-spin" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] animate-pulse">Syncing Empire Node</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Grounding Web Sources...</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-shimmer" />
                </div>
                <div className="h-2 w-3/4 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-shimmer delay-150" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#0A0E14] border-t border-white/5 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative group transition-all duration-300">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/20 to-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            
            <div className="relative flex items-end gap-3 bg-[#1C222D] border border-white/10 p-2 rounded-2xl focus-within:border-[#D4AF37]/50 shadow-2xl">
              <div className="p-3 text-[#D4AF37] opacity-50">
                🏛️
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={`Query the ${mode.replace('_', ' ')} Expert...`}
                className="flex-grow bg-transparent border-none py-3 px-1 text-sm sm:text-base text-white focus:ring-0 resize-none max-h-48 scrollbar-hide"
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'inherit';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="group relative h-11 w-11 flex items-center justify-center rounded-xl bg-[#D4AF37] disabled:bg-zinc-800 transition-all duration-300 active:scale-95 shadow-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                {loading ? (
                   <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-black font-black text-xl leading-none">↑</span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 opacity-50">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Real-time Grounding</span>
              <span className="w-1 h-1 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Zero Hallucinations Node</span>
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.2);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ChatView;
