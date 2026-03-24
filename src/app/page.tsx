// src/app/page.tsx
'use client';

import { useState } from 'react';
import Chat from '@/components/chat/Chat';
import Upload from '@/components/upload/DocumentUploader';
import {
  Bot,
  MessageSquare,
  ShieldCheck,
  HardDrive,
  Menu,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Camera,
  UploadCloud,
  Database,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="p-4 md:p-6 flex flex-col h-full bg-[#171717] overflow-hidden">
      <Link href="/" className={cn(
        "flex items-center gap-3 px-2 py-1 mb-10 hover:opacity-80 transition-all group shrink-0",
        collapsed && "justify-center px-0"
      )}>
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 shrink-0">
          <Bot className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="font-bold text-white tracking-tighter text-lg leading-none">AGENTIC</div>
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Hybrid RAG AI</div>
          </div>
        )}
      </Link>

      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
        <div className="space-y-1">
          {!collapsed && (
            <div className="text-[10px] font-bold text-gray-600 px-3 py-2 uppercase tracking-[0.2em] mb-2 animate-in fade-in">
              Navigation
            </div>
          )}

          {/* Chat Intelligent */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-bold text-white bg-blue-600/10 border border-blue-500/20 rounded-xl transition-all",
              collapsed && "justify-center px-0 border-none bg-transparent hover:bg-blue-600/10"
            )}
          >
            <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
            {!collapsed && <span className="truncate">Chat Intelligent</span>}
          </Link>

          {/* Recherche par Image */}
          <Link
            href="/vision"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group",
              collapsed && "justify-center px-0"
            )}
          >
            <Camera className="w-4 h-4 group-hover:text-purple-400 transition-colors shrink-0" />
            {!collapsed && <span className="truncate">Recherche par Image</span>}
            {!collapsed && (
              <Badge className="ml-auto bg-purple-500/10 text-purple-400 border-none text-[8px] font-black uppercase">
                NOUVEAU
              </Badge>
            )}
          </Link>

          {/* Base de Connaissances */}
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group",
              collapsed && "justify-center px-0"
            )}
          >
            <HardDrive className="w-4 h-4 group-hover:text-purple-400 transition-colors shrink-0" />
            {!collapsed && <span className="truncate">Base de Connaissances</span>}
          </Link>

          {/* Upload de Documents */}
          <Link
            href="/documents/upload"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group",
              collapsed && "justify-center px-0"
            )}
          >
            <UploadCloud className="w-4 h-4 group-hover:text-green-400 transition-colors shrink-0" />
            {!collapsed && <span className="truncate">Upload Documents</span>}
            {!collapsed && (
              <Badge className="ml-auto bg-green-500/10 text-green-400 border-none text-[8px] font-black uppercase">
                IMPORT
              </Badge>
            )}
          </Link>

          {/* Gestion des Documents */}
          <Link
            href="/documents/manage"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group",
              collapsed && "justify-center px-0"
            )}
          >
            <Database className="w-4 h-4 group-hover:text-blue-400 transition-colors shrink-0" />
            {!collapsed && <span className="truncate">GÃ©rer Documents</span>}
          </Link>

          {/* Documentation */}
          <Link
            href="/docs"
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group",
              collapsed && "justify-center px-0"
            )}
          >
            <BookOpen className="w-4 h-4 group-hover:text-orange-400 transition-colors shrink-0" />
            {!collapsed && <span className="truncate">Documentation</span>}
            {!collapsed && (
              <Badge className="ml-auto bg-orange-500/10 text-orange-400 border-none text-[8px] font-black uppercase">
                GUIDE
              </Badge>
            )}
          </Link>
        </div>

        {!collapsed && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Innovation AI</span>
            </div>
            <p className="text-[9px] text-gray-500 leading-relaxed">
              Le RAG Hybride combine sÃ©mantique et graphe de relations pour une prÃ©cision maximale.
            </p>
          </div>
        )}
      </div>

      <div className="pt-6 mt-auto border-t border-white/5 space-y-4 shrink-0">
        {!collapsed ? (
          <>
            <div className="px-3 py-2 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" /> SÃ©curitÃ©
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-none text-[8px] font-black uppercase">Local VFS</Badge>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-2" title="Mode SÃ©curisÃ© Local">
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="h-screen flex bg-[#171717] overflow-hidden selection:bg-blue-500/30">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "flex-col hidden lg:flex border-r border-white/5 bg-[#171717] transition-all duration-300 relative z-30",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-12 z-50 bg-[#171717] border border-white/5 rounded-full h-8 w-8 hover:bg-blue-600 hover:text-white shadow-xl transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
        {/* Mobile Header */}
        <header className="h-16 border-b border-white/5 flex items-center px-4 justify-between lg:hidden bg-[#171717] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white" aria-label="Ouvrir le menu">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-72 bg-[#171717]">
                <SheetHeader className="p-6">
                  <SheetTitle className="text-white text-sm uppercase font-black tracking-widest">Menu de Navigation</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="font-bold text-white text-sm uppercase tracking-widest text-center flex-1">Assistant Professionnel</h1>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden relative">
          <Chat />
        </div>

        {/* Document Ingestion Bar */}
        <Upload />
      </div>
    </main>
  );
}
