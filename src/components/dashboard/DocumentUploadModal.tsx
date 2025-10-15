import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  targetUserId?: string;
  isAdminUpload?: boolean;
}

const DocumentUploadModal = ({
  open,
  onOpenChange,
  onUploadComplete,
  targetUserId,
  isAdminUpload = false,
}: DocumentUploadModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setExternalLink("");
    setFile(null);
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a document title",
      });
      return;
    }

    if (!file && !externalLink.trim()) {
      toast({
        variant: "destructive",
        title: "File or link required",
        description: "Please upload a file or provide an external link",
      });
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const uploadForUserId = isAdminUpload && targetUserId ? targetUserId : user.id;

      let fileUrl = externalLink;
      let fileName = "External Link";
      let fileType = "link";

      if (file) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${uploadForUserId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("employee_docs")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store file path instead of public URL for private bucket
        fileUrl = filePath;
        fileName = file.name;
        fileType = file.type;
      }

      const { error: insertError } = await supabase.from("documents").insert({
        user_id: uploadForUserId,
        title,
        description: description || null,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        uploaded_by_admin: isAdminUpload,
      });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      resetForm();
      onUploadComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">External Link (Optional)</Label>
            <Input
              id="link"
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={!!externalLink}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadModal;
