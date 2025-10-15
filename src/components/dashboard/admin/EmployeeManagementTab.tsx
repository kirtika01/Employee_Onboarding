import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  department_id: string;
  created_at: string;
  departments?: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

const EmployeeManagementTab = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchQuery, selectedDept, employees]);

  const loadData = async () => {
    try {
      const [employeeData, deptData] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, departments(name)")
          .order("created_at", { ascending: false }),
        supabase.from("departments").select("*").order("name"),
      ]);

      if (employeeData.error) throw employeeData.error;
      if (deptData.error) throw deptData.error;

      setEmployees(employeeData.data || []);
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

  const filterEmployees = () => {
    let filtered = employees;

    if (selectedDept !== "all") {
      filtered = filtered.filter((emp) => emp.department_id === selectedDept);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (emp) =>
          emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading employees...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

      {/* Employee List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEmployees.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No employees found.
          </p>
        ) : (
          filteredEmployees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{emp.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{emp.email}</p>
                    {emp.phone_number && (
                      <p className="text-sm text-muted-foreground">
                        {emp.phone_number}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        {emp.departments?.name || "No Department"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Joined: {new Date(emp.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/dashboard/employee/${emp.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployeeManagementTab;
