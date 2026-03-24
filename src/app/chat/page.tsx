"use client"

import { useState, useRef, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Database, 
  Search,
  Volume2,
  Paperclip,
  MoreVertical,
  Maximize2
} from "lucide-react"
import { chatFlow } from "@/ai/flows/chat-flow"
import { voiceChatInteraction } from "@/ai/flows/voice-chat-flow"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasAudio?: boolean
  audioUrl?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your InstantPage AI assistant. How can I help you today? I have access to all vectorized documents in the repository.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    try {
      // For standard text chat, we'd use chatFlow
      // For simplicity in this demo component, we use the provided chatFlow server action
      const response = await chatFlow({ query: messageText })
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      toast({
        title: "Communication Error",
        description: "Failed to connect to the AI agent. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsTyping(false)
    }
  }

  const toggleVoice = async () => {
    if (isRecording) {
      setIsRecording(false)
      // Simulate stopping recording and sending
      handleVoiceSend("How do I perform a cold start on Turbine TG1?")
    } else {
      setIsRecording(true)
    }
  }

  const handleVoiceSend = async (voiceQuery: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: voiceQuery,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      const response = await voiceChatInteraction({ query: voiceQuery })
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        hasAudio: true,
        audioUrl: response.audio
      }
      setMessages(prev => [...prev, aiMessage])
      
      // Auto play audio
      const audio = new Audio(response.audio)
      audio.play()
    } catch (error) {
      toast({
        title: "Voice Processing Error",
        description: "Could not process voice query.",
        variant: "destructive"
      })
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        {/* Chat Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-card/20 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-sm leading-none">InstantPage AI Assistant</h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Database className="w-3 h-3" /> Vector RAG Mode Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground"><Search className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                  m.role === 'assistant' ? 'bg-primary text-white' : 'bg-secondary text-white'
                }`}>
                  {m.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    m.role === 'assistant' 
                      ? 'bg-card border-white/5' 
                      : 'bg-primary text-white border-transparent'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    {m.hasAudio && (
                      <Button variant="outline" size="sm" className="mt-3 bg-white/5 border-white/10 hover:bg-white/10 text-xs h-8" onClick={() => {
                        const audio = new Audio(m.audioUrl)
                        audio.play()
                      }}>
                        <Volume2 className="w-3 h-3 mr-2" /> Play Response
                      </Button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-card border border-white/5 p-4 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-6 border-t border-white/5 bg-background">
          <div className="max-w-4xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative bg-card border border-white/10 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask about procedures, manuals, or metrics..."
                className="w-full bg-transparent p-4 pr-12 text-sm focus:outline-none resize-none min-h-[56px] max-h-[200px]"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={toggleVoice}
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 ${isRecording ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-white'}`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => handleSend()}
              disabled={!input.trim() && !isRecording}
              className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4">
            Powered by RAG Engine • Ollama Llama3 • ChromaDB Vector Store
          </p>
        </div>
      </SidebarInset>
    </div>
  )
}