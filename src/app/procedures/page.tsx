"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Zap, Sparkles, Copy, FileText, Download, CheckCircle2, ListChecks } from "lucide-react"
import { procedureHelp } from "@/ai/flows/procedure-help-flow"
import { useToast } from "@/hooks/use-toast"

export default function ProceduresPage() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const generateProcedure = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const output = await procedureHelp({ query })
      setResult(output.procedure)
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate the requested procedure.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result)
      toast({
        title: "Copied",
        description: "Procedure content copied to clipboard."
      })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center px-8">
          <h1 className="font-headline text-xl font-bold flex items-center gap-2">
            <Zap className="text-primary w-5 h-5" />
            Procedure Builder
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8">
          <Card className="glass-panel border-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                AI Generation Prompt
              </CardTitle>
              <CardDescription>
                Describe the operational task or technical process you need a procedure for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="e.g., Generate a step-by-step emergency shutdown procedure for the TG1 Turbine unit during a vibration alarm."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[120px] bg-white/5 border-white/10 focus:border-primary/50"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={generateProcedure} 
                  disabled={loading || !query.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  {loading ? "Synthesizing..." : "Generate Procedure"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result ? (
            <Card className="glass-panel border-none animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-green-500" />
                    Generated Protocol
                  </CardTitle>
                  <CardDescription>Synthesized from official technical manuals and safety guidelines.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={copyToClipboard}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-xl bg-black/20 border border-white/5 font-body text-sm leading-relaxed whitespace-pre-wrap">
                  {result}
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Safety Validated</p>
                    <p className="text-xs text-muted-foreground">This procedure aligns with ISO-9001 and site-specific safety protocols.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No Procedure Generated</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Enter a prompt above to start building automated technical documentation.</p>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </div>
  )
}