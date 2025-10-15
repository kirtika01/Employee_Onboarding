import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";
import UserInfoSidebar from "./UserInfoSidebar";
import { FileText, GraduationCap, ExternalLink, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TrainingSession {
  id: string;
  title: string;
  resource_type: string;
  resource_url: string;
  description: string;
  progress: number;
  is_mandatory: boolean;
}

const EmployeeDashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadDocumentCount(), loadProfile(), loadTrainingSessions()]);
  };

  const loadTrainingSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch assigned training sessions with progress
      const { data: sessions, error } = await supabase
        .from("training_sessions")
        .select(`
          id,
          title,
          description,
          resource_type,
          resource_url,
          is_mandatory,
          training_progress(progress_percentage)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedSessions = sessions?.map((session: any) => ({
        id: session.id,
        title: session.title,
        resource_type: session.resource_type,
        resource_url: session.resource_url || "#",
        description: session.description || "",
        progress: session.training_progress?.[0]?.progress_percentage || 0,
        is_mandatory: session.is_mandatory,
      })) || [];

      setTrainingSessions(formattedSessions);
    } catch (error: any) {
      console.error("Error loading training sessions:", error);
    }
  };

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments(name)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    }
  };

  const loadDocumentCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { count, error } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;

      setDocumentCount(count || 0);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading documents",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (session: TrainingSession) => {
    if (session.resource_url && session.resource_url !== "#") {
      window.open(session.resource_url, "_blank");
    }
  };

  if (loading || !profile) {
    return (
      <DashboardLayout title="My Dashboard" subtitle="Your personal workspace">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Dashboard" subtitle="Your personal workspace">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - User Info */}
        <div className="lg:col-span-1">
          <UserInfoSidebar profile={profile} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Documents Summary Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/dashboard/documents")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">My Documents</CardTitle>
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-4xl font-bold">{documentCount}</p>
                <p className="text-muted-foreground">
                  Document{documentCount !== 1 ? "s" : ""} uploaded
                </p>
                <div className="flex items-center gap-2 text-sm text-primary pt-2">
                  <span>View all documents</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training & Session Modules Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Training & Sessions</CardTitle>
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingSessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No training sessions assigned yet
                  </p>
                ) : (
                  trainingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{session.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {session.resource_type}
                            </Badge>
                            {session.is_mandatory && (
                              <Badge variant="destructive" className="text-xs">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.description}
                          </p>
                        </div>
                        <Play className="w-5 h-5 text-primary ml-2" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{session.progress}%</span>
                        </div>
                        <Progress value={session.progress} className="h-2" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
