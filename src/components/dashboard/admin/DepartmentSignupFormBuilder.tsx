import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';
import {
    Plus,
    Trash2,
    Edit,
    GripVertical,
    Eye,
    Save,
    FileText,
    Mail,
    Phone,
    List,
    Upload,
    AlertCircle,
    CheckCircle
} from "lucide-react";

// Types for form fields
interface FormField {
    id: string;
    type: 'text' | 'email' | 'phone' | 'dropdown' | 'file';
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[]; // For dropdown fields
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
    fileTypes?: string[]; // For file upload fields
    maxFileSize?: number; // In MB
}

interface Department {
    id: string;
    name: string;
}

interface DepartmentSignupForm {
    id?: string;
    department_id: string;
    form_name: string;
    form_description?: string;
    form_fields: FormField[];
}

// Sortable field component
const SortableField = ({ field, onEdit, onDelete, onToggleRequired }: {
    field: FormField;
    onEdit: (field: FormField) => void;
    onDelete: (id: string) => void;
    onToggleRequired: (id: string) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getFieldIcon = (type: string) => {
        switch (type) {
            case 'text': return <FileText className="w-4 h-4" />;
            case 'email': return <Mail className="w-4 h-4" />;
            case 'phone': return <Phone className="w-4 h-4" />;
            case 'dropdown': return <List className="w-4 h-4" />;
            case 'file': return <Upload className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2 flex-1">
                {getFieldIcon(field.type)}
                <div className="flex-1">
                    <div className="font-medium text-sm">{field.label}</div>
                    <div className="text-xs text-gray-500">{field.id} • {field.type}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    checked={field.required}
                    onCheckedChange={() => onToggleRequired(field.id)}
                />
                <Badge variant={field.required ? "default" : "outline"} className="text-xs">
                    {field.required ? "Required" : "Optional"}
                </Badge>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(field)}
                    className="h-8 w-8 p-0"
                >
                    <Edit className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(field.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

// Form Preview Component
const FormPreview = ({ fields, formName, formDescription }: {
    fields: FormField[];
    formName: string;
    formDescription?: string;
}) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateField = (field: FormField, value: any): string | null => {
        if (field.required && (!value || value.toString().trim() === '')) {
            return `${field.label} is required`;
        }

        if (field.type === 'email' && value) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
                return 'Please enter a valid email address';
            }
        }

        if (field.type === 'phone' && value) {
            const phonePattern = /^[\d\s\-\+\(\)]+$/;
            if (!phonePattern.test(value)) {
                return 'Please enter a valid phone number';
            }
        }

        if (field.validation) {
            if (field.validation.min && value && value.length < field.validation.min) {
                return `Minimum ${field.validation.min} characters required`;
            }
            if (field.validation.max && value && value.length > field.validation.max) {
                return `Maximum ${field.validation.max} characters allowed`;
            }
        }

        return null;
    };

    const handleFieldChange = (fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));

        const field = fields.find(f => f.id === fieldName);
        if (field) {
            const error = validateField(field, value);
            setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        fields.forEach(field => {
            const error = validateField(field, formData[field.id]);
            if (error) {
                newErrors[field.id] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            alert('Form validation passed! (This is a preview)');
        }
    };

    const renderField = (field: FormField) => {
        const error = errors[field.id];
        const value = formData[field.id] || '';

        switch (field.type) {
            case 'text':
            case 'email':
            case 'phone':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                            id={field.id}
                            type={field.type === 'phone' ? 'tel' : field.type}
                            placeholder={field.placeholder}
                            value={value}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className={error ? 'border-red-500' : ''}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                );

            case 'dropdown':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Select
                            value={value}
                            onValueChange={(val) => handleFieldChange(field.id, val)}
                        >
                            <SelectTrigger className={error ? 'border-red-500' : ''}>
                                <SelectValue placeholder={field.placeholder || 'Select an option'} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map((option, index) => (
                                    <SelectItem key={index} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                );

            case 'file':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <FileUploadField
                            field={field}
                            value={value}
                            onChange={(file) => handleFieldChange(field.id, file)}
                            error={error}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Form Preview
                </CardTitle>
                {formDescription && (
                    <p className="text-sm text-gray-600">{formDescription}</p>
                )}
            </CardHeader>
            <CardContent>
                {fields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No fields added yet. Add fields to see the preview.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {fields.map(renderField)}
                        <Button type="submit" className="w-full">
                            Submit Form (Preview)
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
};

// File Upload Field Component
const FileUploadField = ({
    field,
    value,
    onChange,
    error
}: {
    field: FormField;
    value: File | null;
    onChange: (file: File | null) => void;
    error?: string;
}) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                // Validate file size
                const file = acceptedFiles[0];
                const maxSizeMB = field.maxFileSize || 5;
                const maxSizeBytes = maxSizeMB * 1024 * 1024;

                if (file.size > maxSizeBytes) {
                    alert(`File size must be less than ${maxSizeMB}MB`);
                    return;
                }

                // Validate file type
                if (field.fileTypes && field.fileTypes.length > 0) {
                    const fileExt = file.name.split('.').pop()?.toLowerCase();
                    if (!fileExt || !field.fileTypes.includes(fileExt)) {
                        alert(`File type must be one of: ${field.fileTypes.join(', ')}`);
                        return;
                    }
                }

                onChange(file);
            }
        },
        accept: field.fileTypes?.reduce((acc, type) => {
            if (type === 'pdf') acc['application/pdf'] = ['.pdf'];
            if (type === 'docx') acc['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
            if (type === 'image') acc['image/*'] = ['.jpg', '.jpeg', '.png', '.gif'];
            return acc;
        }, {} as Record<string, string[]>),
        maxSize: (field.maxFileSize || 5) * 1024 * 1024, // Convert MB to bytes
        multiple: false,
    });

    return (
        <div>
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : error
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
            >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                {value ? (
                    <div className="text-sm">
                        <p className="font-medium text-green-600">File selected:</p>
                        <p className="text-gray-600">{value.name}</p>
                        <p className="text-xs text-gray-500">
                            {(value.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                ) : (
                    <div className="text-sm text-gray-600">
                        {isDragActive
                            ? 'Drop the file here...'
                            : 'Drag & drop a file here, or click to select'
                        }
                    </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                    Allowed: {field.fileTypes?.join(', ') || 'PDF, DOCX, Images'}
                    {field.maxFileSize && ` • Max ${field.maxFileSize}MB`}
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    );
};

// Field Editor Dialog
const FieldEditor = ({
    field,
    isOpen,
    onClose,
    onSave
}: {
    field: FormField | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (field: FormField) => void;
}) => {
    const [editingField, setEditingField] = useState<FormField>(field || {
        id: Date.now().toString(),
        type: 'text',
        label: '',
        required: false,
        options: [],
        fileTypes: ['pdf', 'docx', 'image'],
        maxFileSize: 5,
    });

    useEffect(() => {
        if (field) {
            setEditingField(field);
        } else {
            setEditingField({
                id: Date.now().toString(),
                type: 'text',
                label: '',
                required: false,
                options: [],
                fileTypes: ['pdf', 'docx', 'image'],
                maxFileSize: 5,
            });
        }
    }, [field]);

    const handleSave = () => {
        if (!editingField.id || !editingField.label) {
            return;
        }
        onSave(editingField);
        onClose();
    };

    const addOption = () => {
        setEditingField(prev => ({
            ...prev,
            options: [...(prev.options || []), '']
        }));
    };

    const updateOption = (index: number, value: string) => {
        setEditingField(prev => ({
            ...prev,
            options: prev.options?.map((opt, i) => i === index ? value : opt)
        }));
    };

    const removeOption = (index: number) => {
        setEditingField(prev => ({
            ...prev,
            options: prev.options?.filter((_, i) => i !== index)
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {field ? 'Edit Field' : 'Add New Field'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Field Type</Label>
                            <Select
                                value={editingField.type}
                                onValueChange={(value: FormField['type']) =>
                                    setEditingField(prev => ({ ...prev, type: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="phone">Phone</SelectItem>
                                    <SelectItem value="dropdown">Dropdown</SelectItem>
                                    <SelectItem value="file">File Upload</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Field ID (Internal)</Label>
                            <Input
                                placeholder="e.g., first_name"
                                value={editingField.id}
                                onChange={(e) => setEditingField(prev => ({
                                    ...prev,
                                    id: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Field Label (Display)</Label>
                        <Input
                            placeholder="e.g., First Name"
                            value={editingField.label}
                            onChange={(e) => setEditingField(prev => ({
                                ...prev,
                                label: e.target.value
                            }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Placeholder</Label>
                        <Input
                            placeholder="Enter placeholder text..."
                            value={editingField.placeholder || ''}
                            onChange={(e) => setEditingField(prev => ({
                                ...prev,
                                placeholder: e.target.value
                            }))}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={editingField.required}
                            onCheckedChange={(checked) => setEditingField(prev => ({
                                ...prev,
                                required: checked
                            }))}
                        />
                        <Label>Required Field</Label>
                    </div>

                    {editingField.type === 'dropdown' && (
                        <div className="space-y-2">
                            <Label>Dropdown Options</Label>
                            <div className="space-y-2">
                                {editingField.options?.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder={`Option ${index + 1}`}
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeOption(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    onClick={addOption}
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        </div>
                    )}

                    {editingField.type === 'file' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Allowed File Types</Label>
                                <div className="flex gap-2">
                                    {['pdf', 'docx', 'image'].map(type => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Switch
                                                checked={editingField.fileTypes?.includes(type)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setEditingField(prev => ({
                                                            ...prev,
                                                            fileTypes: [...(prev.fileTypes || []), type]
                                                        }));
                                                    } else {
                                                        setEditingField(prev => ({
                                                            ...prev,
                                                            fileTypes: prev.fileTypes?.filter(t => t !== type)
                                                        }));
                                                    }
                                                }}
                                            />
                                            <Label className="text-sm capitalize">{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Maximum File Size (MB)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editingField.maxFileSize || 5}
                                    onChange={(e) => setEditingField(prev => ({
                                        ...prev,
                                        maxFileSize: parseInt(e.target.value) || 5
                                    }))}
                                />
                            </div>
                        </div>
                    )}

                    {(editingField.type === 'text' || editingField.type === 'email' || editingField.type === 'phone') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Minimum Length</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Optional"
                                    value={editingField.validation?.min || ''}
                                    onChange={(e) => setEditingField(prev => ({
                                        ...prev,
                                        validation: {
                                            ...prev.validation,
                                            min: e.target.value ? parseInt(e.target.value) : undefined
                                        }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Maximum Length</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="Optional"
                                    value={editingField.validation?.max || ''}
                                    onChange={(e) => setEditingField(prev => ({
                                        ...prev,
                                        validation: {
                                            ...prev.validation,
                                            max: e.target.value ? parseInt(e.target.value) : undefined
                                        }
                                    }))}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!editingField.id || !editingField.label}>
                            {field ? 'Update' : 'Add'} Field
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Main Component
const DepartmentSignupFormBuilder = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [existingFormId, setExistingFormId] = useState<string | null>(null);
    const [noFormFound, setNoFormFound] = useState(false);
    const [tableMissing, setTableMissing] = useState(false);

    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        if (selectedDepartment) {
            loadExistingForm(selectedDepartment);
        } else {
            setNoFormFound(false);
            resetForm();
        }
    }, [selectedDepartment]);

    const resetForm = () => {
        setFormName("");
        setFormDescription("");
        setFormFields([]);
        setExistingFormId(null);
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
        } finally {
            setLoading(false);
        }
    };

    const loadExistingForm = async (deptId: string) => {
        try {
            const { data, error } = await supabase
                .from("department_signup_forms")
                .select("*")
                .eq("department_id", deptId)
                .maybeSingle();

            if (error) {
                console.error("Error loading department signup form:", error);

                // Check if the table exists
                if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
                    // Table doesn't exist, show migration message
                    setTableMissing(true);
                    await createDepartmentSignupFormsTable();
                    return; // Don't retry, let user handle migration
                }
                throw error;
            }

            if (data) {
                setFormName(data.form_name);
                setFormDescription(data.form_description || "");
                setFormFields((data.form_fields as unknown) as FormField[]);
                setExistingFormId(data.id);
                setNoFormFound(false);
            } else {
                // No form found for this department
                resetForm();
                setNoFormFound(true);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading form",
                description: error.message,
            });
        }
    };

    const createDepartmentSignupFormsTable = async () => {
        try {
            // Show user-friendly error message with migration instructions
            toast({
                variant: "destructive",
                title: "Database Migration Required",
                description: "The department_signup_forms table is missing. Please run the migration or contact your system administrator.",
                duration: 10000,
            });

            console.error("Table creation needed - please run the migration from supabase/migrations/20251103111300_create_department_signup_forms.sql");
            throw new Error("Table does not exist. Please run the database migration from supabase/migrations/20251103111300_create_department_signup_forms.sql");
        } catch (error) {
            console.error("Failed to create table:", error);
            // Continue without the table - user will see an error message
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setFormFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }

        setActiveId(null);
    };

    const addField = (type: FormField['type']) => {
        const newField: FormField = {
            id: `${type}_field_${formFields.length + 1}`,
            type,
            label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
            required: false,
            options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
            fileTypes: ['pdf', 'docx', 'image'],
            maxFileSize: 5,
        };

        setEditingField(newField);
        setIsFieldEditorOpen(true);
    };

    const editField = (field: FormField) => {
        setEditingField(field);
        setIsFieldEditorOpen(true);
    };

    const saveField = (field: FormField) => {
        if (existingFormId && formFields.find(f => f.id === field.id)) {
            // Update existing field
            setFormFields(prev => prev.map(f => f.id === field.id ? field : f));
        } else {
            // Add new field
            setFormFields(prev => [...prev, field]);
        }
    };

    const deleteField = (id: string) => {
        setFormFields(prev => prev.filter(field => field.id !== id));
    };

    const toggleFieldRequired = (id: string) => {
        setFormFields(prev => prev.map(field =>
            field.id === id ? { ...field, required: !field.required } : field
        ));
    };

    const saveForm = async () => {
        // Validate department selection
        if (!selectedDepartment) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a department",
            });
            return;
        }

        // Validate form name
        if (!formName || formName.trim().length === 0) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please enter a form name",
            });
            return;
        }

        if (formName.trim().length < 3) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Form name must be at least 3 characters long",
            });
            return;
        }

        // Validate form fields
        if (formFields.length === 0) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please add at least one field to the form",
            });
            return;
        }

        // Validate each field has proper structure
        const invalidFields = formFields.filter(field =>
            !field.id || !field.label || !field.type
        );

        if (invalidFields.length > 0) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "All fields must have an ID, label, and type",
            });
            return;
        }

        setSaving(true);

        try {
            const formData = {
                department_id: selectedDepartment,
                form_name: formName,
                form_description: formDescription,
                form_fields: formFields as unknown as Json[],
            };

            let error;
            if (existingFormId) {
                const { error: updateError } = await supabase
                    .from("department_signup_forms")
                    .update(formData)
                    .eq("id", existingFormId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("department_signup_forms")
                    .insert(formData);
                error = insertError;
            }

            if (error) {
                console.error("Error saving department signup form:", error);
                throw error;
            }

            toast({
                title: "Success",
                description: existingFormId ? "Form updated successfully" : "Form created successfully",
            });

            // Reload to get the form ID
            await loadExistingForm(selectedDepartment);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving form",
                description: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-muted-foreground">Loading form builder...</div>;
    }

    if (tableMissing) {
        return (
            <div className="space-y-6">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                        <h3 className="text-lg font-semibold text-destructive">Database Migration Required</h3>
                    </div>
                    <p className="text-destructive mb-4">
                        The <code className="bg-destructive/20 px-1 rounded">department_signup_forms</code> table is missing from your database.
                    </p>
                    <div className="bg-background rounded-lg p-4 mb-4">
                        <h4 className="font-medium mb-2">To fix this issue:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Dashboard</a></li>
                            <li>Navigate to <strong>SQL Editor</strong></li>
                            <li>Run the migration from: <code className="bg-muted px-1 rounded">supabase/migrations/20251103111300_create_department_signup_forms.sql</code></li>
                            <li>Refresh this page after the migration completes</li>
                        </ol>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        If you need help, contact your system administrator or check the migration guide in the project documentation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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

                    <div className="space-y-2">
                        <Label>Form Name</Label>
                        <Input
                            placeholder="e.g., Employee Signup Form"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Form Description</Label>
                    <Textarea
                        placeholder="Describe the purpose of this form..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                    />
                </div>

            </div>

            {selectedDepartment && (
                <>
                    {noFormFound && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-600 mb-2">No form found</p>
                            <p className="text-sm text-gray-500 mb-4">
                                Please create a signup form for this department
                            </p>
                        </div>
                    )}

                    <Tabs defaultValue="builder" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="builder">Form Builder</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>

                        <TabsContent value="builder" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Department Signup Form Editor</span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addField('text')}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Field
                                            </Button>
                                            <Button
                                                onClick={saveForm}
                                                disabled={saving}
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                {saving ? 'Saving...' : 'Save Form'}
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Quick Add Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addField('text')}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Text
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addField('email')}
                                        >
                                            <Mail className="w-4 h-4 mr-2" />
                                            Email
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addField('phone')}
                                        >
                                            <Phone className="w-4 h-4 mr-2" />
                                            Phone
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addField('dropdown')}
                                        >
                                            <List className="w-4 h-4 mr-2" />
                                            Dropdown
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addField('file')}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            File Upload
                                        </Button>
                                    </div>

                                    {/* Fields List */}
                                    {formFields.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                            <div className="space-y-2">
                                                <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
                                                <p>No fields added yet</p>
                                                <p className="text-sm">Click the buttons above to add fields to your form</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={formFields.map(f => f.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-2">
                                                    {formFields.map((field) => (
                                                        <SortableField
                                                            key={field.id}
                                                            field={field}
                                                            onEdit={editField}
                                                            onDelete={deleteField}
                                                            onToggleRequired={toggleFieldRequired}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="preview">
                            <FormPreview
                                fields={formFields}
                                formName={formName}
                                formDescription={formDescription}
                            />
                        </TabsContent>
                    </Tabs>
                </>
            )}

            <FieldEditor
                field={editingField}
                isOpen={isFieldEditorOpen}
                onClose={() => {
                    setIsFieldEditorOpen(false);
                    setEditingField(null);
                }}
                onSave={saveField}
            />
        </div>
    );
};

export default DepartmentSignupFormBuilder;