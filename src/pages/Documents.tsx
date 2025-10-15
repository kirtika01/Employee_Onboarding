import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentUploadModal from "@/components/dashboard/DocumentUploadModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_url: string;
  file_type: string;
  status: string;
  created_at: string;
  uploaded_by_admin: boolean;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading documents",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (doc: Document) => {
    try {
      // Check if it's an external URL (Google Drive, etc.)
      if (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')) {
        // Check if it's a Supabase storage public URL (old documents)
        if (doc.file_url.includes('supabase.co/storage')) {
          // Extract the file path from the public URL
          const urlParts = doc.file_url.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');

            // Create signed URL from the original bucket
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
        // For other external URLs (Google Drive, etc.), open directly
        window.open(doc.file_url, "_blank");
        return;
      }

      // For new storage format (file path only), create signed URL from employee_docs
      const { data, error } = await supabase.storage
        .from('employee_docs')
        .createSignedUrl(doc.file_url, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error opening document",
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout
      title="My Documents"
      subtitle="View and manage your uploaded documents"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">All Documents</h2>
            <p className="text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50" />
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by uploading your first document
              </p>
              <Button onClick={() => setUploadModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openDocument(doc)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="w-8 h-8 text-primary" />
                    {doc.uploaded_by_admin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(doc.created_at), "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {doc.status}
                    </Badge>
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={loadDocuments}
      />
    </DashboardLayout>
  );
};

export default Documents;
