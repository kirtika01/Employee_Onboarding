import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "./DashboardLayout";
import StatsCard from "./StatsCard";
import { Users, FileText, Building2, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeManagementTab from "./admin/EmployeeManagementTab";
import FormManagementTab from "./admin/FormManagementTab";
import TrainingManagementTab from "./admin/TrainingManagementTab";

interface Stats {
  totalEmployees: number;
  totalDocuments: number;
  totalTrainingSessions: number;
  totalTemplates: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    totalDocuments: 0,
    totalTrainingSessions: 0,
    totalTemplates: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [profilesCount, documentsCount, trainingSessions, templatesCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }),
        supabase.from("department_document_templates").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalEmployees: profilesCount.count || 0,
        totalDocuments: documentsCount.count || 0,
        totalTrainingSessions: trainingSessions.count || 0,
        totalTemplates: templatesCount.count || 0,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Manage employees, forms, and training">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
          />
          <StatsCard
            title="Total Documents"
            value={stats.totalDocuments}
            icon={FileText}
          />
          <StatsCard
            title="Training Sessions"
            value={stats.totalTrainingSessions}
            icon={BookOpen}
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="forms">
              <Building2 className="w-4 h-4 mr-2" />
              Department Forms
            </TabsTrigger>
            <TabsTrigger value="training">
              <BookOpen className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6">
            <EmployeeManagementTab />
          </TabsContent>

          <TabsContent value="forms" className="mt-6">
            <FormManagementTab />
          </TabsContent>

          <TabsContent value="training" className="mt-6">
            <TrainingManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
