"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  UploadCloud, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database,
  FileText,
  Shield
} from "lucide-react"
import { ingestDocument } from "@/ai/flows/ingest-document-flow"
import { useToast } from "@/hooks/use-toast"

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [ingesting, setIngesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const startIngestion = async () => {
    if (files.length === 0) return
    setIngesting(true)
    setStatus("Starting intelligent ingestion pipeline...")

    try {
      for (const file of files) {
        setStatus(`Parsing ${file.name}...`)
        
        // Convert to data URI for ingestion flow
        const reader = new FileReader()
        const dataUri = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })

        setStatus(`Vectorizing ${file.name} to ChromaDB...`)
        await ingestDocument({
          fileDataUri: dataUri,
          fileName: file.name
        })
      }

      toast({
        title: "Ingestion Successful",
        description: `${files.length} documents added to the knowledge base.`,
      })
      setFiles([])
      setStatus("Completed successfully.")
    } catch (error) {
      toast({
        title: "Ingestion Failed",
        description: "An error occurred during document processing.",
        variant: "destructive"
      })
    } finally {
      setIngesting(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center px-8">
          <h1 className="font-headline text-xl font-bold flex items-center gap-2">
            <UploadCloud className="text-secondary w-5 h-5" />
            Document Intelligence Ingestion
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <div className="space-y-8">
            <Card className="glass-panel border-none border-dashed border-2 border-white/10 hover:border-primary/50 transition-colors">
              <CardContent className="p-12">
                <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold">Upload Knowledge Sources</h3>
                    <p className="text-sm text-muted-foreground">Drag and drop technical manuals, PDFs, or CSV logs.</p>
                  </div>
                  <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.csv,.xlsx" />
                  <Button variant="secondary" className="mt-2">Browse Files</Button>
                </label>
              </CardContent>
            </Card>

            {files.length > 0 && (
              <Card className="glass-panel border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Selected Documents ({files.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.name.split('.').pop()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-500">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="pt-4 flex flex-col items-center gap-4">
                    {ingesting && (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> {status}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-primary animate-pulse w-2/3" />
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={startIngestion} 
                      disabled={ingesting}
                      className="w-full bg-primary hover:bg-primary/90 h-12 text-md font-bold"
                    >
                      {ingesting ? "Processing Cluster..." : "Index Documents to Knowledge Base"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "RAG Optimized", desc: "Text is chunked with 200px overlap for superior context retrieval.", icon: Database },
                { title: "Secure Storage", desc: "Data is stored in local ChromaDB collections with metadata encryption.", icon: Shield },
                { title: "Auto-Tagging", desc: "AI automatically identifies document types and technical entities.", icon: CheckCircle2 },
              ].map((feature, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <feature.icon className="w-5 h-5 text-secondary" />
                  <h4 className="text-sm font-bold">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  )
}