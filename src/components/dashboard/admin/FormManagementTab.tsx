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
import { Plus, Trash2, Edit } from "lucide-react";

interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

const FormManagementTab = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [formData, setFormData] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    is_required: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const { data, error } = await supabase
        .from("form_fields")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading fields",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async () => {
    try {
      if (!formData.field_name || !formData.field_label) {
        toast({
          variant: "destructive",
          title: "Missing fields",
          description: "Please fill in all required fields",
        });
        return;
      }

      if (editingField) {
        const { error } = await supabase
          .from("form_fields")
          .update({
            field_name: formData.field_name,
            field_label: formData.field_label,
            field_type: formData.field_type,
            is_required: formData.is_required,
          })
          .eq("id", editingField.id);

        if (error) throw error;
        toast({ title: "Field updated successfully" });
      } else {
        const maxOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.display_order)) : 0;
        const { error } = await supabase.from("form_fields").insert({
          ...formData,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast({ title: "Field added successfully" });
      }

      setDialogOpen(false);
      setEditingField(null);
      setFormData({
        field_name: "",
        field_label: "",
        field_type: "text",
        is_required: false,
      });
      loadFields();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving field",
        description: error.message,
      });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      const { error } = await supabase.from("form_fields").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Field deleted successfully" });
      loadFields();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting field",
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("form_fields")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      loadFields();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating field",
        description: error.message,
      });
    }
  };

  const openEditDialog = (field: FormField) => {
    setEditingField(field);
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading form fields...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage onboarding form fields that new employees will see during signup
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingField(null);
              setFormData({
                field_name: "",
                field_label: "",
                field_type: "text",
                is_required: false,
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Edit Field" : "Add New Field"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Field Name (internal)</Label>
                <Input
                  placeholder="e.g., aadhaar_card"
                  value={formData.field_name}
                  onChange={(e) =>
                    setFormData({ ...formData, field_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Field Label (displayed to users)</Label>
                <Input
                  placeholder="e.g., Aadhaar Card"
                  value={formData.field_label}
                  onChange={(e) =>
                    setFormData({ ...formData, field_label: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Field Type</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, field_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked })
                  }
                />
                <Label>Required Field</Label>
              </div>
              <Button onClick={handleSaveField} className="w-full">
                {editingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <Card key={field.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{field.field_label}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Type: {field.field_type} | {field.is_required ? "Required" : "Optional"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.is_active}
                    onCheckedChange={() => handleToggleActive(field.id, field.is_active)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(field)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteField(field.id)}
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

export default FormManagementTab;
