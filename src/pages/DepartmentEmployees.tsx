import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, BookOpen, Upload, Plus, X } from "lucide-react";
import DocumentUploadModal from "@/components/dashboard/DocumentUploadModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface EmployeeDetail {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: string;
  onboarding_status: string;
  departments?: { name: string };
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

interface TrainingProgress {
  id: string;
  progress_percentage: number;
  completed: boolean;
  training_sessions: {
    title: string;
    is_mandatory: boolean;
  };
}

interface AvailableTraining {
  id: string;
  title: string;
  description: string;
  resource_type: string;
}

const DepartmentEmployees = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [availableTraining, setAvailableTraining] = useState<AvailableTraining[]>([]);
  const [assignedTrainingIds, setAssignedTrainingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [assignTrainingOpen, setAssignTrainingOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");

  useEffect(() => {
    if (employeeId) loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      const [employeeData, docsData, progressData, trainingData, assignmentsData] = await Promise.all([
        supabase.from("profiles").select("*, departments(name)").eq("id", employeeId).single(),
        supabase.from("documents").select("*").eq("user_id", employeeId).order("created_at", { ascending: false }),
        supabase.from("training_progress").select("*, training_sessions(title, is_mandatory)").eq("user_id", employeeId),
        supabase.from("training_sessions").select("id, title, description, resource_type").order("title"),
        supabase.from("training_assignments").select("training_session_id").eq("user_id", employeeId),
      ]);

      if (employeeData.error) throw employeeData.error;
      setEmployee(employeeData.data);
      setDocuments(docsData.data || []);
      setTrainingProgress(progressData.data || []);
      setAvailableTraining(trainingData.data || []);
      setAssignedTrainingIds(assignmentsData.data?.map((a: any) => a.training_session_id) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTraining = async () => {
    if (!selectedTrainingId || !employeeId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("training_assignments")
        .insert({
          user_id: employeeId,
          training_session_id: selectedTrainingId,
          assigned_by: user?.id,
        });

      if (error) throw error;

      toast({ title: "Success", description: "Training session assigned successfully" });
      setAssignTrainingOpen(false);
      setSelectedTrainingId("");
      loadEmployeeData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleUnassignTraining = async (trainingId: string) => {
    if (!employeeId) return;

    try {
      const { error } = await supabase
        .from("training_assignments")
        .delete()
        .eq("user_id", employeeId)
        .eq("training_session_id", trainingId);

      if (error) throw error;

      toast({ title: "Success", description: "Training session unassigned" });
      loadEmployeeData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading || !employee) {
    return <DashboardLayout title="Employee Details" subtitle="Loading..."><div>Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title={employee.full_name} subtitle={employee.departments?.name || "No Department"}>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Employee Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Email</p><p>{employee.email}</p></div>
            <div><p className="text-sm text-muted-foreground">Phone</p><p>{employee.phone_number || "N/A"}</p></div>
          </CardContent>
        </Card>

        <Tabs defaultValue="documents">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" />Documents</TabsTrigger>
            <TabsTrigger value="training"><BookOpen className="w-4 h-4 mr-2" />Training</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Button onClick={() => setUploadModalOpen(true)}><Upload className="w-4 h-4 mr-2" />Upload for Employee</Button>
            <div className="grid gap-4">
              {documents.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No documents uploaded yet</CardContent></Card>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            // Check if it's an external URL
                            if (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')) {
                              // Check if it's a Supabase storage public URL (old documents)
                              if (doc.file_url.includes('supabase.co/storage')) {
                                const urlParts = doc.file_url.split('/storage/v1/object/public/');
                                if (urlParts.length > 1) {
                                  const [bucket, ...pathParts] = urlParts[1].split('/');
                                  const filePath = pathParts.join('/');

                                  const { data, error } = await supabase.storage
                                    .from(bucket)
                                    .createSignedUrl(filePath, 3600);

                                  if (error) throw error;
                                  if (data?.signedUrl) {
                                    // signedUrl is already a full URL from createSignedUrl
                                    const fullUrl = data.signedUrl.startsWith('http')
                                      ? data.signedUrl
                                      : `${import.meta.env.VITE_SUPABASE_URL}${data.signedUrl}`;
                                    window.open(fullUrl, "_blank");
                                    return;
                                  }
                                }
                              }
                              window.open(doc.file_url, "_blank");
                            } else {
                              const { data, error } = await supabase.storage
                                .from('employee_docs')
                                .createSignedUrl(doc.file_url, 3600);
                              if (error) throw error;
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, "_blank");
                              }
                            }
                          } catch (error: any) {
                            toast({ variant: "destructive", title: "Error", description: error.message });
                          }
                        }}
                      >
                        View
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="flex gap-2">
              <Dialog open={assignTrainingOpen} onOpenChange={setAssignTrainingOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Assign Training</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Training Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select training session" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTraining
                          .filter(t => !assignedTrainingIds.includes(t.id))
                          .map((training) => (
                            <SelectItem key={training.id} value={training.id}>
                              {training.title} ({training.resource_type})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAssignTrainingOpen(false)}>Cancel</Button>
                      <Button onClick={handleAssignTraining} disabled={!selectedTrainingId}>Assign</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {assignedTrainingIds.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No training sessions assigned yet</CardContent></Card>
              ) : (
                availableTraining
                  .filter(t => assignedTrainingIds.includes(t.id))
                  .map((training) => {
                    const progress = trainingProgress.find(p => p.training_sessions.title === training.title);
                    return (
                      <Card key={training.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{training.title}</CardTitle>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnassignTraining(training.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{training.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{progress?.progress_percentage || 0}%</span>
                            </div>
                            <Progress value={progress?.progress_percentage || 0} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DocumentUploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUploadComplete={loadEmployeeData} targetUserId={employeeId} isAdminUpload />
    </DashboardLayout>
  );
};

export default DepartmentEmployees;
