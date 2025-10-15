import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ExternalLink } from "lucide-react";

interface TrainingSession {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string | null;
  duration_minutes: number | null;
  is_mandatory: boolean;
  department_id: string | null;
  departments?: { name: string };
}

interface Department {
  id: string;
  name: string;
}

const TrainingManagementTab = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    resource_type: "youtube",
    resource_url: "",
    duration_minutes: "",
    is_mandatory: false,
    department_id: "all",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, deptData] = await Promise.all([
        supabase
          .from("training_sessions")
          .select("*, departments(name)")
          .order("created_at", { ascending: false }),
        supabase.from("departments").select("*").order("name"),
      ]);

      if (sessionsData.error) throw sessionsData.error;
      if (deptData.error) throw deptData.error;

      setSessions(sessionsData.data || []);
      setDepartments(deptData.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSession = async () => {
    try {
      if (!formData.title || !formData.resource_url) {
        toast({
          variant: "destructive",
          title: "Missing fields",
          description: "Please fill in title and resource URL",
        });
        return;
      }

      const sessionData = {
        title: formData.title,
        description: formData.description || null,
        resource_type: formData.resource_type,
        resource_url: formData.resource_url,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        is_mandatory: formData.is_mandatory,
        department_id: formData.department_id === "all" ? null : formData.department_id,
      };

      if (editingSession) {
        const { error } = await supabase
          .from("training_sessions")
          .update(sessionData)
          .eq("id", editingSession.id);

        if (error) throw error;
        toast({ title: "Session updated successfully" });
      } else {
        const { error } = await supabase.from("training_sessions").insert(sessionData);

        if (error) throw error;
        toast({ title: "Session added successfully" });
      }

      setDialogOpen(false);
      setEditingSession(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving session",
        description: error.message,
      });
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const { error } = await supabase.from("training_sessions").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Session deleted successfully" });
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting session",
        description: error.message,
      });
    }
  };

  const openEditDialog = (session: TrainingSession) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || "",
      resource_type: session.resource_type,
      resource_url: session.resource_url || "",
      duration_minutes: session.duration_minutes?.toString() || "",
      is_mandatory: session.is_mandatory,
      department_id: session.department_id || "all",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      resource_type: "youtube",
      resource_url: "",
      duration_minutes: "",
      is_mandatory: false,
      department_id: "all",
    });
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading training sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage training sessions and assign them to departments
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSession(null);
              resetForm();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? "Edit Training Session" : "Add New Training Session"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Introduction to Company Policies"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the training session"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Resource Type *</Label>
                <Select
                  value={formData.resource_type}
                  onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="drive">Google Drive Link</SelectItem>
                    <SelectItem value="external">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resource URL *</Label>
                <Input
                  placeholder="https://..."
                  value={formData.resource_url}
                  onChange={(e) => setFormData({ ...formData, resource_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 45"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
              <div>
                <Label>Assign to Department (optional)</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_mandatory}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_mandatory: checked })
                  }
                />
                <Label>Mandatory Training</Label>
              </div>
              <Button onClick={handleSaveSession} className="w-full">
                {editingSession ? "Update Session" : "Add Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  {session.description && (
                    <p className="text-sm text-muted-foreground">{session.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={session.is_mandatory ? "default" : "secondary"}>
                      {session.is_mandatory ? "Mandatory" : "Optional"}
                    </Badge>
                    <Badge variant="outline">{session.resource_type}</Badge>
                    {session.duration_minutes && (
                      <Badge variant="outline">{session.duration_minutes} mins</Badge>
                    )}
                    {session.departments && (
                      <Badge variant="outline">{session.departments.name}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.resource_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(session.resource_url!, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(session)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrainingManagementTab;
