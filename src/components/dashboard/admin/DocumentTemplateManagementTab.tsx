import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, Edit, Download, Eye } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface DocumentTemplate extends Tables<"department_document_templates"> {
    departments?: { name: string } | null;
}

interface Department {
    id: string;
    name: string;
}

const DocumentTemplateManagementTab = () => {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        department_id: "",
        is_required: false,
        file: null as File | null,
    });
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [templatesData, deptData] = await Promise.all([
                supabase
                    .from("department_document_templates")
                    .select("*, departments(name)")
                    .order("created_at", { ascending: false }),
                supabase.from("departments").select("*").order("name"),
            ]);

            if (templatesData.error) throw templatesData.error;
            if (deptData.error) throw deptData.error;

            setTemplates(templatesData.data || []);
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

    const handleSaveTemplate = async () => {
        try {
            if (!formData.title || !formData.department_id) {
                toast({
                    variant: "destructive",
                    title: "Missing fields",
                    description: "Please fill in all required fields",
                });
                return;
            }

            if (!formData.file && !editingTemplate) {
                toast({
                    variant: "destructive",
                    title: "File required",
                    description: "Please upload a file for the template",
                });
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let fileUrl = editingTemplate?.file_url;
            let fileName = editingTemplate?.file_name || "";

            if (formData.file) {
                // Upload new file
                const fileExt = formData.file.name.split(".").pop();
                const filePath = `templates/${formData.department_id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("employee_docs")
                    .upload(filePath, formData.file);

                if (uploadError) throw uploadError;

                fileUrl = filePath;
                fileName = formData.file.name;
            }

            if (editingTemplate) {
                const { error } = await supabase
                    .from("department_document_templates")
                    .update({
                        title: formData.title,
                        description: formData.description,
                        department_id: formData.department_id,
                        is_required: formData.is_required,
                        file_url: fileUrl,
                        file_name: fileName,
                    })
                    .eq("id", editingTemplate.id);

                if (error) throw error;
                toast({ title: "Template updated successfully" });
            } else {
                const { error } = await supabase.from("department_document_templates").insert({
                    title: formData.title,
                    description: formData.description,
                    department_id: formData.department_id,
                    is_required: formData.is_required,
                    file_url: fileUrl!,
                    file_name: fileName,
                    file_type: formData.file?.type || "application/pdf",
                    created_by: user.id,
                });

                if (error) throw error;
                toast({ title: "Template added successfully" });
            }

            setDialogOpen(false);
            setEditingTemplate(null);
            setFormData({
                title: "",
                description: "",
                department_id: "",
                is_required: false,
                file: null,
            });
            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving template",
                description: error.message,
            });
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            const { error } = await supabase
                .from("department_document_templates")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast({ title: "Template deleted successfully" });
            loadData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting template",
                description: error.message,
            });
        }
    };

    const handleViewTemplate = async (template: DocumentTemplate) => {
        try {
            const { data, error } = await supabase.storage
                .from("employee_docs")
                .createSignedUrl(template.file_url, 3600);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error viewing template",
                description: error.message,
            });
        }
    };

    const openEditDialog = (template: DocumentTemplate) => {
        setEditingTemplate(template);
        setFormData({
            title: template.title,
            description: template.description || "",
            department_id: template.department_id,
            is_required: template.is_required || false,
            file: null,
        });
        setDialogOpen(true);
    };

    if (loading) {
        return <div className="text-muted-foreground">Loading document templates...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    Manage department-specific document templates and PDFs
                </p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => {
                            setEditingTemplate(null);
                            setFormData({
                                title: "",
                                description: "",
                                department_id: "",
                                is_required: false,
                                file: null,
                            });
                        }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTemplate ? "Edit Template" : "Add New Template"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Template Title *</Label>
                                <Input
                                    placeholder="e.g., Employee Handbook"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input
                                    placeholder="Brief description of the template"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label>Department *</Label>
                                <Select
                                    value={formData.department_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, department_id: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Template File *</Label>
                                <Input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={(e) =>
                                        setFormData({ ...formData, file: e.target.files?.[0] || null })
                                    }
                                />
                                {editingTemplate && !formData.file && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Current file: {editingTemplate.file_name}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.is_required}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, is_required: checked })
                                    }
                                />
                                <Label>Required for employees</Label>
                            </div>
                            <Button onClick={handleSaveTemplate} className="w-full">
                                {editingTemplate ? "Update Template" : "Add Template"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {templates.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No document templates created yet
                        </CardContent>
                    </Card>
                ) : (
                    templates.map((template) => (
                        <Card key={template.id}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{template.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Department: {template.departments?.name}
                                            {template.is_required && (
                                                <span className="ml-2 text-green-600">• Required</span>
                                            )}
                                        </p>
                                        {template.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {template.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewTemplate(template)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditDialog(template)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteTemplate(template.id)}
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

export default DocumentTemplateManagementTab;