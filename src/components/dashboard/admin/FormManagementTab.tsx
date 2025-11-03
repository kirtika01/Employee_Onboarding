import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DepartmentSignupFormBuilder from "./DepartmentSignupFormBuilder";
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    Building2,
    FileText
} from "lucide-react";

interface Department {
    id: string;
    name: string;
}

interface DepartmentSignupForm {
  id: string;
  department_id: string;
  form_name: string;
  form_description?: string;
  form_fields: any;
  created_at: string;
  updated_at: string;
  departments?: {
    name: string;
  };
}

const FormManagementTab = () => {
    const [forms, setForms] = useState<DepartmentSignupForm[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<DepartmentSignupForm | null>(null);
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadForms();
    }, [filterDepartment]);

    const loadData = async () => {
        await Promise.all([
            loadDepartments(),
            loadForms()
        ]);
        setLoading(false);
    };

    const loadDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .order("name");

            if (error) throw error;
            setDepartments(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading departments",
                description: error.message,
            });
        }
    };

    const loadForms = async () => {
        try {
            let query = supabase
                .from("department_signup_forms")
                .select(`
          *,
          departments (
            name
          )
        `)
                .order("updated_at", { ascending: false });

            if (filterDepartment !== "all") {
                query = query.eq("department_id", filterDepartment);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error loading forms:", error);

                // Check if the table exists
                if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
                    toast({
                        variant: "destructive",
                        title: "Table not found",
                        description: "The department_signup_forms table does not exist. Please run the database migration.",
                    });
                    return;
                }

                throw error;
            }

            setForms((data || []).map(form => ({
              ...form,
              form_fields: Array.isArray(form.form_fields) ? form.form_fields : []
            })));
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading forms",
                description: error.message,
            });
        }
    };

    const deleteForm = async (formId: string) => {
        if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
            return;
        }

        try {
            const { error } = await supabase
                .from("department_signup_forms")
                .delete()
                .eq("id", formId);

            if (error) throw error;

            toast({
                title: "Form deleted successfully",
            });

            await loadForms();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting form",
                description: error.message,
            });
        }
    };

    const editForm = (form: DepartmentSignupForm) => {
        setSelectedForm(form);
        setIsBuilderOpen(true);
    };

    const createNewForm = () => {
        setSelectedForm(null);
        setIsBuilderOpen(true);
    };

    const closeBuilder = () => {
        setIsBuilderOpen(false);
        setSelectedForm(null);
        loadForms();
    };

    const getDepartmentName = (departmentId: string) => {
        const dept = departments.find(d => d.id === departmentId);
        return dept?.name || "Unknown Department";
    };

    const getFieldCount = (formFields: any[]) => {
        return formFields?.length || 0;
    };

    if (loading) {
        return <div className="text-muted-foreground">Loading forms...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Department Forms Management</h2>
                    <p className="text-muted-foreground">Manage signup forms for different departments</p>
                </div>
                <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={createNewForm}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Form
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedForm ? 'Edit Form' : 'Create New Form'}
                            </DialogTitle>
                        </DialogHeader>
                        <DepartmentSignupFormBuilder />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Filter by Department</Label>
                            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All departments" />
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
                    </div>
                </CardContent>
            </Card>

            {/* Forms List */}
            <div className="grid gap-4">
                {forms.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No forms found</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {filterDepartment === "all"
                                    ? "Get started by creating your first department signup form."
                                    : "No forms found for this department."}
                            </p>
                            <Button onClick={createNewForm}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Form
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    forms.map((form) => (
                        <Card key={form.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{form.form_name}</CardTitle>
                                            <Badge variant="outline">
                                                <Building2 className="w-3 h-3 mr-1" />
                                                {form.departments?.name || getDepartmentName(form.department_id)}
                                            </Badge>
                                        </div>
                                        {form.form_description && (
                                            <p className="text-sm text-muted-foreground">{form.form_description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>{getFieldCount(form.form_fields)} fields</span>
                                            <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                                            <span>Updated: {new Date(form.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => editForm(form)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteForm(form.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default FormManagementTab;