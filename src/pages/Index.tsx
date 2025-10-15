import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Users, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary rounded-2xl shadow-lg">
              <Building2 className="w-16 h-16 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Employee Management
            <span className="block text-primary mt-2">Dashboard</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline document management, task assignments, and communication across all departments in one unified platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20">
          <div className="p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Document Management</h3>
            <p className="text-muted-foreground">
              Upload, review, and manage all employee documents in one secure location.
            </p>
          </div>

          <div className="p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-accent/10 rounded-lg w-fit mb-4">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-Department</h3>
            <p className="text-muted-foreground">
              Organize employees across Educators, Sales, Marketing, IT, and more.
            </p>
          </div>

          <div className="p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Role-Based Access</h3>
            <p className="text-muted-foreground">
              Secure access controls for admins and employees with proper permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
