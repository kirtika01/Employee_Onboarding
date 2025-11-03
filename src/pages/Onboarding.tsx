import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileCheck, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface Department {
  id: string;
  name: string;
}

const Onboarding = () => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [documents, setDocuments] = useState<{
    aadhaar_card?: File;
    police_verification?: File;
    offer_letter?: File;
    resume?: File;
  }>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formFields, setFormFields] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadDepartments();
  }, []);

  useEffect(() => {
    const fetchFields = async () => {
      if (selectedDepartment) {
        const fields = await loadDepartmentFormFields(selectedDepartment);
        setFormFields(fields);
      } else {
        setFormFields([]);
      }
    };
    fetchFields();
  }, [selectedDepartment]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
  };

  const loadDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    if (data) setDepartments(data);
  };

  const loadDepartmentFormFields = async (departmentId: string) => {
    try {
      // Get the department signup form which contains all fields
      const { data: formData, error: formError } = await supabase
        .from("department_signup_forms")
        .select("form_fields")
        .eq("department_id", departmentId)
        .single();

      if (formError) {
        console.error("Error loading department signup form:", formError);

        // Check if the table exists
        if (formError.message?.includes('does not exist') || formError.code === 'PGRST116') {
          console.log("Department signup forms table does not exist. Please run the migration.");
          return [];
        }

        return [];
      }

      // Return the form fields from the form configuration
      return (formData?.form_fields as unknown as any[]) || [];
    } catch (error: any) {
      console.error("Error loading department form fields:", error);
      return [];
    }
  };

  const getFieldComponent = (field: any) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.id}
            name={field.id}
            type="text"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      case "email":
        return (
          <Input
            id={field.id}
            name={field.id}
            type="email"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      case "phone":
        return (
          <Input
            id={field.id}
            name={field.id}
            type="tel"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      case "textarea":
        return (
          <Textarea
            id={field.id}
            name={field.id}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            rows={3}
          />
        );
      case "dropdown":
        const options = field.options || [];
        return (
          <Select name={field.id} required={field.required}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string, index: number) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "file":
        return (
          <Input
            id={field.id}
            type="file"
            accept={field.fileTypes?.map((type: string) => {
              if (type === 'pdf') return '.pdf';
              if (type === 'docx') return '.docx';
              if (type === 'image') return '.jpg,.jpeg,.png';
              return '.*';
            }).join(',') || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
            onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
            className="cursor-pointer"
            required={field.required}
          />
        );
      default:
        return (
          <Input
            id={field.id}
            name={field.id}
            type="text"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  const handleFileChange = (documentType: string, file: File | null) => {
    if (file) {
      setDocuments(prev => ({ ...prev, [documentType]: file }));
    }
  };

  const uploadDocuments = async (userId: string) => {
    const docEntries = Object.entries(documents).filter(([_, file]) => file);
    let completed = 0;

    for (const [docType, file] of docEntries) {
      if (!file) continue;

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('onboarding_documents')
        .insert([{
          user_id: userId,
          document_type: docType as any,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
        }]);

      if (dbError) throw dbError;

      completed++;
      setUploadProgress((completed / docEntries.length) * 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData(e.currentTarget);
    const departmentId = selectedDepartment;

    if (!departmentId) {
      toast({
        variant: "destructive",
        title: "Please select a department",
      });
      setLoading(false);
      return;
    }

    const requiredDocs = ['aadhaar_card', 'police_verification', 'offer_letter'];
    const missingDocs = requiredDocs.filter(doc => !documents[doc as keyof typeof documents]);

    if (missingDocs.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing required documents",
        description: `Please upload: ${missingDocs.map(d => d.replace(/_/g, ' ')).join(', ')}`,
      });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const departmentSpecificData: Record<string, any> = {};
      formFields
        .filter((field) => field.type !== "file")
        .forEach((field) => {
          const value = formData.get(field.id) as string;
          if (value) departmentSpecificData[field.id] = value;
        });

      await uploadDocuments(user.id);

      await supabase
        .from('profiles')
        .update({
          department_id: departmentId,
          department_specific_data: departmentSpecificData,
          onboarding_status: 'documents_uploaded'
        })
        .eq('id', user.id);

      toast({
        title: "Onboarding completed!",
        description: "Your documents have been uploaded successfully.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error completing onboarding",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalDocs = Object.keys(documents).length;
  const uploadedDocs = Object.values(documents).filter(Boolean).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-2xl shadow-lg border-primary/10 my-8">
        <CardHeader className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Upload your documents and provide department information
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDepartment && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Department Information</h3>
                {formFields
                  .filter((field) => field.type !== "file")
                  .map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {getFieldComponent(field)}
                    </div>
                  ))}
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Required Documents</h3>
                <span className="text-sm text-muted-foreground">
                  {uploadedDocs} of 3 required
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhaar" className="flex items-center gap-2">
                    Aadhaar Card *
                    {documents.aadhaar_card && <FileCheck className="w-4 h-4 text-green-600" />}
                  </Label>
                  <Input
                    id="aadhaar"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('aadhaar_card', e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {documents.aadhaar_card && (
                    <p className="text-xs text-muted-foreground">{documents.aadhaar_card.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="police" className="flex items-center gap-2">
                    Police Verification *
                    {documents.police_verification && <FileCheck className="w-4 h-4 text-green-600" />}
                  </Label>
                  <Input
                    id="police"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('police_verification', e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {documents.police_verification && (
                    <p className="text-xs text-muted-foreground">{documents.police_verification.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer" className="flex items-center gap-2">
                    Offer Letter *
                    {documents.offer_letter && <FileCheck className="w-4 h-4 text-green-600" />}
                  </Label>
                  <Input
                    id="offer"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('offer_letter', e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {documents.offer_letter && (
                    <p className="text-xs text-muted-foreground">{documents.offer_letter.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    Resume (Optional)
                    {documents.resume && <FileCheck className="w-4 h-4 text-green-600" />}
                  </Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange('resume', e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {documents.resume && (
                    <p className="text-xs text-muted-foreground">{documents.resume.name}</p>
                  )}
                </div>
              </div>
            </div>

            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading documents...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedDepartment || uploadedDocs < 3}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading documents...
                </>
              ) : (
                "Save & Continue to Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
