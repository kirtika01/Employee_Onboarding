import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  title: string;
  description: string;
  file_name: string;
  status: string;
  created_at: string;
  uploaded_by_admin: boolean;
}

interface DocumentListCardProps {
  title: string;
  documents: Document[];
  loading: boolean;
}

const DocumentListCard = ({ title, documents, loading }: DocumentListCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-accent text-accent-foreground";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{documents.length} documents</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No documents yet
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                  <Button size="sm" variant="ghost">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentListCard;
