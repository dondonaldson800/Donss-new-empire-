
import React, { useState, useEffect, useRef } from 'react';
import { getAIClient } from '../services/geminiService';
import { Modality } from '@google/genai';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const LiveVoice: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);

  const toggleSession = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsActive(false);
      return;
    }

    try {
      const ai = getAIClient();
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a high-fidelity intelligence from Grounded Empire. Be helpful, concise, and professional.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) {
              setTranscripts(p => [...p.slice(-4), `AI: ${msg.serverContent!.outputTranscription!.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
              setTranscripts(p => [...p.slice(-4), `You: ${msg.serverContent!.inputTranscription!.text}`]);
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error("Live Error", e),
          onclose: () => setIsActive(false),
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      alert("Failed to start voice session. Check permissions.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 p-12">
      <div className="crooked-card bg-zinc-900 border border-zinc-800 p-12 rounded-3xl shadow-2xl flex flex-col items-center max-w-lg w-full">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isActive ? 'bg-amber-500/20 scale-110 shadow-[0_0_50px_rgba(245,158,11,0.2)]' : 'bg-zinc-800'}`}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${isActive ? 'border-amber-500 animate-pulse' : 'border-zinc-700'}`}>
            <span className="text-4xl">{isActive ? '🔊' : '🎙️'}</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Live Voice Bridge</h2>
        <p className="text-zinc-500 text-sm text-center mb-8">Low-latency conversational intelligence powered by Gemini 2.5 Native Audio.</p>

        <div className="w-full bg-black/40 rounded-xl p-4 mb-8 min-h-[120px] border border-zinc-800/50 flex flex-col gap-2">
          {transcripts.length === 0 && <p className="text-zinc-700 text-center italic text-sm mt-8">Transcriptions will appear here...</p>}
          {transcripts.map((t, i) => (
            <div key={i} className={`text-xs ${t.startsWith('AI:') ? 'text-amber-400' : 'text-zinc-400'}`}>
              {t}
            </div>
          ))}
        </div>

        <button
          onClick={toggleSession}
          className={`px-10 py-4 rounded-2xl font-bold transition-all ${isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} text-white shadow-xl active:scale-95`}
        >
          {isActive ? 'Disconnect Bridge' : 'Establish Connection'}
        </button>
      </div>
    </div>
  );
};

export default LiveVoice;
