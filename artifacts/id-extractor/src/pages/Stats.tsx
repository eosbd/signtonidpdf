import { AppLayout } from "@/components/layout/AppLayout";
import { useGetRecordStats, getGetRecordStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle, Activity, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Stats() {
  const { data: stats, isLoading } = useGetRecordStats({
    query: { queryKey: getGetRecordStatsQueryKey() }
  });

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of processing volume and activity.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !stats ? (
            <div className="text-center text-muted-foreground">Unable to load statistics.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed</CardTitle>
                    <FileText className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">documents overall</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Processed Today</CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.todayCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">documents today</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      Document Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.documentTypes.length > 0 ? (
                        stats.documentTypes.map((dt) => (
                          <div key={dt.type} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dt.type || "Unknown"}</span>
                            <span className="text-sm text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{dt.count}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">No data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((record) => (
                          <Link key={record.id} href={`/records/${record.id}`}>
                            <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer mb-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{record.fullName || "Unknown Name"}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                  <span className="font-mono">#{record.id}</span>
                                  <span>•</span>
                                  <span>{record.documentType || "Unknown Type"}</span>
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(record.createdAt), "MMM d, h:mm a")}
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
