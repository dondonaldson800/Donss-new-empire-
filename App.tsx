
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import MediaView from './components/MediaView';
import LiveVoice from './components/LiveVoice';
import Dashboard from './components/Dashboard';
import Paywall from './components/Paywall';
import { AppMode, SubscriptionTier, FeatureType } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GENERAL);
  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [activeFeature, setActiveFeature] = useState<FeatureType | 'dashboard'>('dashboard');
  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);

  const checkEmpireAccess = (appMode: AppMode) => {
    if (appMode === AppMode.GENERAL) return true;
    
    // Check if user has Empire Pro access
    if (tier === SubscriptionTier.EMPIRE_PRO) {
      return true;
    } else {
      setPendingMode(appMode);
      setShowPaywall(true);
      return false;
    }
  };

  const handleSelectMode = (newMode: AppMode) => {
    if (checkEmpireAccess(newMode)) {
      setMode(newMode);
      setActiveFeature('chat');
    }
  };

  const upgradeTier = (newTier: SubscriptionTier) => {
    setTier(newTier);
    setShowPaywall(false);
    if (pendingMode && newTier === SubscriptionTier.EMPIRE_PRO) {
      setMode(pendingMode);
      setActiveFeature('chat');
      setPendingMode(null);
    }
  };

  const renderContent = () => {
    if (activeFeature === 'dashboard') {
      return <Dashboard onSelect={handleSelectMode} />;
    }

    switch (activeFeature) {
      case 'chat':
        return <ChatView mode={mode} tier={tier} />;
      case 'voice_live':
        return <LiveVoice />;
      case 'image_gen':
      case 'image_edit':
      case 'video_gen':
      case 'analysis':
        return <MediaView feature={activeFeature} tier={tier} />;
      case 'tts':
        return (
          <div className="flex items-center justify-center h-full text-zinc-600 italic">
            TTS interface coming soon in this horizontal view...
          </div>
        );
      default:
        return <Dashboard onSelect={handleSelectMode} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0E14] overflow-hidden font-sans selection:bg-[#D4AF37]/30">
      <Sidebar 
        activeFeature={activeFeature === 'dashboard' ? 'chat' : activeFeature as FeatureType} 
        setActiveFeature={(f) => setActiveFeature(f)}
        mode={mode}
        setMode={handleSelectMode}
        tier={tier}
        onGoHome={() => setActiveFeature('dashboard')}
      />
      
      <main className="flex-grow flex flex-col relative">
        <header className="h-16 border-b border-zinc-800 bg-[#0A0E14] flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveFeature('dashboard')}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-tighter transition-colors"
            >
              Empire Hub
            </button>
            <span className="hidden md:block text-zinc-500 text-xs">|</span>
            <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              Grounding: <span className="text-green-500">Live</span>
            </span>
            {activeFeature !== 'dashboard' && (
              <>
                <span className="hidden md:block text-zinc-500 text-xs">|</span>
                <span className="hidden md:block text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">{mode.replace('_', ' ')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {tier !== SubscriptionTier.EMPIRE_PRO && (
              <button 
                onClick={() => setShowPaywall(true)}
                className="text-[10px] font-bold bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-black px-4 py-2 rounded-full transition-all uppercase tracking-widest shadow-lg shadow-[#D4AF37]/10 active:scale-95"
              >
                Go Empire Pro
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-[#D4AF37]">
              GE
            </div>
          </div>
        </header>

        <div className="flex-grow relative overflow-hidden">
          {renderContent()}
        </div>

        {showPaywall && (
          <Paywall 
            onUpgrade={upgradeTier} 
            onClose={() => setShowPaywall(false)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
