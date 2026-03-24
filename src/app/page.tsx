
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Activity, 
  Database, 
  Cpu, 
  BrainCircuit, 
  TrendingUp, 
  Clock,
  Layers,
  ArrowUpRight,
  FileText
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const data = [
  { name: '00:00', requests: 400, accuracy: 92 },
  { name: '04:00', requests: 300, accuracy: 94 },
  { name: '08:00', requests: 900, accuracy: 91 },
  { name: '12:00', requests: 1200, accuracy: 89 },
  { name: '16:00', requests: 1500, accuracy: 93 },
  { name: '20:00', requests: 1100, accuracy: 95 },
  { name: '23:59', requests: 600, accuracy: 94 },
];

const vectorData = [
  { label: 'Technical Manuals', value: 450, color: '#5533CC' },
  { label: 'Procedures', value: 320, color: '#4D8FE6' },
  { label: 'Incident Reports', value: 180, color: '#6366f1' },
  { label: 'Training Data', value: 120, color: '#8b5cf6' },
];

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center justify-between px-8 border-b border-white/5">
          <h1 className="font-headline text-xl font-bold">System Intelligence Monitoring</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Ollama Cluster: Online
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              ChromaDB: Optimized
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Nodes", value: "12", icon: Cpu, trend: "+2", color: "text-primary" },
              { label: "Total Vectors", value: "1.2M", icon: Database, trend: "+12k", color: "text-secondary" },
              { label: "Inference Speed", value: "42ms", icon: Activity, trend: "-5ms", color: "text-primary" },
              { label: "Learning Rate", value: "98.4%", icon: BrainCircuit, trend: "+0.2%", color: "text-secondary" },
            ].map((stat, i) => (
              <Card key={i} className="glass-panel border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="flex items-end gap-2">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <span className="text-xs text-green-500 mb-1 flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> {stat.trend}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inference Performance */}
            <Card className="lg:col-span-2 glass-panel border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Request & Accuracy Trends
                </CardTitle>
                <CardDescription>24-hour analysis of agent throughput and response quality</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5533CC" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#5533CC" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2a2831', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#5533CC" fillOpacity={1} fill="url(#colorRequests)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Knowledge Distribution */}
            <Card className="glass-panel border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-secondary" />
                  Vector Distribution
                </CardTitle>
                <CardDescription>Knowledge base composition by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vectorData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" stroke="#999" fontSize={11} width={100} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#2a2831', border: 'none', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {vectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Logs / Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Ingestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "SafetyManual_v2.pdf", status: "Indexed", size: "12.4MB" },
                    { name: "TurbineSpecs_TG1.xlsx", status: "Processing", size: "5.1MB" },
                    { name: "OperatorNotes_Oct.txt", status: "Indexed", size: "1.2MB" },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.size}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${doc.status === 'Indexed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500 animate-pulse'}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-none">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-secondary" />
                  Cache Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center h-full pb-8">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364} strokeDashoffset={364 * (1 - 0.72)} className="text-secondary" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">72%</span>
                    <span className="text-[10px] text-muted-foreground">HIT RATE</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center px-8">
                  Cache optimization has reduced inference costs by <span className="text-secondary font-bold">$240.00</span> this month.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
