'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { 
  Send, 
  Sparkles, 
  Brain, 
  ListChecks, 
  Mic, 
  MicOff,
  Activity,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import VoiceMessage from '@/components/chat/VoiceMessage';
import VoiceControls from '@/components/chat/VoiceControls';
import { useVoiceEnhanced } from '@/hooks/useVoiceEnhanced';
import StepByStepGuide from '@/components/procedure/StepByStepGuide';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils'; // Importation de cn ajoutée

interface Message {
  role: 'user' | 'ai';
  text: string;
  sources?: string[];
  id: string;
  isAgentMission?: boolean;
  steps?: any[];
  suggestions?: string[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<'chat' | 'procedure'>('chat');

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    console.log(`[UI][CHAT] Envoi du message utilisateur : "${trimmed.substring(0, 50)}..."`);
    setLoading(true);
    if (!textOverride) setInput('');
    
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: Message = { role: 'user', text: trimmed, id: userMsgId };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log(`[UI][CHAT] Appel de l'API orchestrateur...`);
      const data = await api.chat(trimmed, messages);
      console.log(`[UI][CHAT] Réponse reçue de l'IA (Mode: ${data.isAgentMission ? 'AGENT' : 'RAG'})`);
      
      const aiMsgId = Math.random().toString(36).substring(7);
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.answer || "Désolé, je n'ai pas pu formuler de réponse.",
        sources: data.sources,
        id: aiMsgId,
        isAgentMission: data.isAgentMission,
        steps: data.steps,
        suggestions: data.suggestions
      }]);

      if (data.isAgentMission) {
        setExpandedMissionId(aiMsgId);
      }
    } catch (error) {
      console.error(`[UI][CHAT] Erreur lors de l'interaction :`, error);
      const errId = Math.random().toString(36).substring(7);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Désolé, une erreur est survenue lors de la communication avec l\'assistant.',
        id: errId
      }]);
    } finally {
      setLoading(false);
    }
  };

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    autoPlayResponse
  } = useVoiceEnhanced(handleSendMessage);

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript);
  }, [interimTranscript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMicClick = async () => {
    if (isListening) {
      console.log("[UI][CHAT] Micro désactivé.");
      await stopListening();
    } else {
      console.log("[UI][CHAT] Micro activé, écoute en cours...");
      await startListening();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#212121] relative">
      <div className="bg-[#171717] border-b border-white/5 p-2 flex justify-center gap-2 z-10">
        <Button
          onClick={() => setMode('chat')}
          variant={mode === 'chat' ? 'default' : 'ghost'}
          className={cn(mode === 'chat' ? 'bg-blue-600 text-white rounded-xl' : 'text-gray-400 hover:text-white rounded-xl')}
        >
          <Brain className="w-4 h-4 mr-2" /> Chat Intelligent
        </Button>
        <Button
          onClick={() => setMode('procedure')}
          variant={mode === 'procedure' ? 'default' : 'ghost'}
          className={cn(mode === 'procedure' ? 'bg-green-600 text-white rounded-xl' : 'text-gray-400 hover:text-white rounded-xl')}
        >
          <ListChecks className="w-4 h-4 mr-2" /> Mode Procédure
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-20">
          {mode === 'chat' ? (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-3xl flex items-center justify-center border border-blue-500/30 animate-pulse">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="space-y-3 px-4">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">AGENTIC ELITE 32</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Assistant Technique • RAG Hybride • Agent MCP</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md px-4">
                    {[
                      "Analyse la pression de la chaudière",
                      "Prépare un rapport de maintenance",
                      "Cherche la vanne HV701 dans les docs",
                      "Calcule le rendement énergétique"
                    ].map((prompt, i) => (
                      <Button 
                        key={i} 
                        variant="outline" 
                        onClick={() => handleSendMessage(prompt)}
                        className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl text-xs py-6 h-auto transition-all"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-10 md:space-y-12">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-6">
                    <VoiceMessage 
                      text={msg.text}
                      role={msg.role}
                      messageId={msg.id}
                      autoPlay={autoPlayResponse && msg.role === 'ai' && msg === messages[messages.length - 1]}
                    />
                    
                    {msg.isAgentMission && msg.steps && (
                      <div className="ml-12 mr-4 bg-purple-600/5 border border-purple-500/20 rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-purple-500/5">
                        <button 
                          onClick={() => {
                            const newExpanded = expandedMissionId === msg.id ? null : msg.id;
                            console.log(`[UI][CHAT] Mission ${msg.id} ${newExpanded ? 'dépliée' : 'repliée'}.`);
                            setExpandedMissionId(newExpanded);
                          }}
                          className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-600/20 rounded-xl">
                              <Target className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-left">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 block mb-0.5">Rapport d'Exécution Elite</span>
                              <span className="text-xs font-bold text-gray-300">{msg.steps.length} étapes orchestrées via MCP</span>
                            </div>
                          </div>
                          {expandedMissionId === msg.id ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                        </button>
                        
                        {expandedMissionId === msg.id && (
                          <div className="p-5 border-t border-white/5 space-y-4 bg-black/20">
                            {msg.steps.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
                                <div className="mt-1">
                                  {step.status === 'completed' ? (
                                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30 animate-pulse">
                                      <Clock className="w-3 h-3 text-yellow-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-gray-200 uppercase tracking-tight group-hover:text-white transition-colors">{step.description}</p>
                                  {step.result && (
                                    <div className="mt-2 p-3 bg-black/40 rounded-xl border border-white/5">
                                      <p className="text-[10px] text-gray-400 leading-relaxed font-medium italic">"{typeof step.result === 'string' ? step.result : JSON.stringify(step.result)}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 flex items-center justify-between">
                              <Badge className="bg-purple-600/20 text-purple-400 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1">Apprentissage par démonstration actif</Badge>
                              <span className="text-[9px] text-gray-600 font-bold uppercase">Innovation 22</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.role === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="ml-12 flex flex-wrap gap-2 animate-in fade-in duration-700">
                        {msg.suggestions.map((suggestion, i) => (
                          <Button 
                            key={i} 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSendMessage(suggestion)}
                            className="bg-blue-600/5 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-full px-4 border border-blue-500/10"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {loading && (
                <div className="flex gap-4 animate-pulse ml-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-4 w-48 bg-white/5 rounded-full" />
                    <div className="h-3 w-32 bg-white/5 rounded-full opacity-50" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <StepByStepGuide />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {mode === 'chat' && (
        <div className="p-4 md:p-8 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-[#2f2f2f] rounded-3xl border border-white/10 p-2 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-2xl">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isListening ? "🎤 Écoute active..." : "Posez une question technique..."}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 min-h-[56px] max-h-[200px] py-4 px-4 resize-none text-white placeholder:text-gray-500 text-sm font-medium"
                rows={1}
              />
              <div className="flex items-center gap-2 px-2">
                <Button 
                  onClick={handleMicClick} 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "w-10 h-10 rounded-2xl shrink-0 transition-all duration-500",
                    isListening ? "bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/20" : "bg-white/5 text-gray-400 hover:text-white"
                  )}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button 
                  onClick={() => handleSendMessage()} 
                  disabled={loading || !input.trim()} 
                  size="icon" 
                  className="bg-blue-600 text-white hover:bg-blue-500 rounded-2xl w-10 h-10 shrink-0 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
               <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Propulsé par le Cerveau Elite 32 • 100% Local</p>
            </div>
          </div>
        </div>
      )}
      <VoiceControls />
    </div>
  );
}