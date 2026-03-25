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
  Target,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import VoiceMessage from '@/components/chat/VoiceMessage';
import VoiceControls from '@/components/chat/VoiceControls';
import { useVoiceEnhanced } from '@/hooks/useVoiceEnhanced';
import StepByStepGuide from '@/components/procedure/StepByStepGuide';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Importation des nouveaux composants de procédure
import { ProcedureProposal } from '@/components/chat/ProcedureProposal';
import { ProcedureSteps } from '@/components/chat/ProcedureSteps';
import { ProcedureGuide } from '@/components/chat/ProcedureGuide';

interface Message {
  role: 'user' | 'ai';
  text: string;
  sources?: string[];
  id: string;
  isAgentMission?: boolean;
  steps?: any[];
  suggestions?: string[];
  procedure?: any; // Métadonnées de procédure
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<'chat' | 'procedure'>('chat');

  // États pour les procédures interactives
  const [activeProcedure, setActiveProcedure] = useState<any>(null);
  const [showStepsFor, setShowStepsFor] = useState<any>(null);
  const [runningGuide, setRunningGuide] = useState<any>(null);

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    if (!textOverride) setInput('');
    
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: Message = { role: 'user', text: trimmed, id: userMsgId };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, history: messages.slice(-5) })
      });
      
      const data = await response.json();
      const aiMsgId = Math.random().toString(36).substring(7);
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.answer,
        sources: data.sources,
        id: aiMsgId,
        procedure: data.procedure // Récupération de l'intention de procédure
      }]);

    } catch (error) {
      console.error(`[UI][CHAT] Error:`, error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Erreur de communication.', id: 'err' }]);
    } finally {
      setLoading(false);
    }
  };

  const { isListening, interimTranscript, startListening, stopListening, autoPlayResponse } = useVoiceEnhanced(handleSendMessage);

  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript);
  }, [interimTranscript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulation de récupération des étapes (à remplacer par un appel API réel si disponible)
  const fetchSteps = (proc: any) => {
    return [
      { number: 1, description: "Vérifier la pression du circuit gaz", safetyNote: "Port du casque obligatoire", verification: "Manomètre G1 > 25 bar" },
      { number: 2, description: "Lancer la ventilation de purge", subSteps: ["Attendre 5 minutes", "Vérifier le débit d'air"], expectedOutcome: "Voyant Purge OK" },
      { number: 3, description: "Activation du virement", verification: "Rotation stable à 500 tr/min" }
    ];
  };

  return (
    <div className="flex flex-col h-full bg-[#212121] relative">
      {/* Header Mode */}
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
            <div className="space-y-10 md:space-y-12">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-6">
                  <VoiceMessage 
                    text={msg.text}
                    role={msg.role}
                    messageId={msg.id}
                    autoPlay={autoPlayResponse && msg.role === 'ai' && msg === messages[messages.length - 1]}
                  />
                  
                  {/* Elite 32: Détection et proposition de procédure */}
                  {msg.role === 'ai' && msg.procedure?.isProcedure && (
                    <div className="ml-12 mr-4">
                      <ProcedureProposal 
                        procedureName={msg.procedure.procedureName}
                        equipment={msg.procedure.equipment}
                        onShowSteps={() => setShowStepsFor({ 
                          name: msg.procedure.procedureName, 
                          steps: fetchSteps(msg.procedure) 
                        })}
                        onStartGuide={() => setRunningGuide({ 
                          name: msg.procedure.procedureName, 
                          steps: fetchSteps(msg.procedure) 
                        })}
                        onClose={() => {/* Ignorer */}}
                      />
                    </div>
                  )}

                  {/* Affichage des étapes en bloc dans le chat */}
                  {showStepsFor && msg.role === 'ai' && msg.procedure?.procedureName === showStepsFor.name && (
                    <div className="ml-12 mr-4">
                      <ProcedureSteps 
                        procedureName={showStepsFor.name}
                        steps={showStepsFor.steps}
                        onStartGuide={() => {
                          setRunningGuide(showStepsFor);
                          setShowStepsFor(null);
                        }}
                        onClose={() => setShowStepsFor(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <StepByStepGuide />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Guide Pas à Pas (Overlay flottant) */}
      {runningGuide && (
        <ProcedureGuide 
          procedureName={runningGuide.name}
          steps={runningGuide.steps}
          onComplete={() => {
            setRunningGuide(null);
            handleSendMessage(`J'ai terminé la procédure de ${runningGuide.name} avec succès.`);
          }}
          onClose={() => setRunningGuide(null)}
        />
      )}

      {mode === 'chat' && (
        <div className="p-4 md:p-8 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent sticky bottom-0 z-20">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-[#2f2f2f] rounded-3xl border border-white/10 p-2 shadow-2xl">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isListening ? "🎤 Écoute active..." : "Posez une question ou demandez une procédure..."}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 min-h-[56px] py-4 px-4 resize-none text-white placeholder:text-gray-500 text-sm"
                rows={1}
              />
              <div className="flex items-center gap-2 px-2">
                <Button onClick={() => isListening ? stopListening() : startListening()} variant="ghost" size="icon" className={cn("w-10 h-10 rounded-2xl", isListening && "bg-red-600 text-white animate-pulse")}>
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button onClick={() => handleSendMessage()} disabled={loading || !input.trim()} size="icon" className="bg-blue-600 text-white hover:bg-blue-500 rounded-2xl w-10 h-10 shadow-lg">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <VoiceControls isListening={isListening} />
    </div>
  );
}
