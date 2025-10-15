import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Building2, Briefcase } from "lucide-react";

interface UserInfoSidebarProps {
  profile: {
    full_name: string;
    email: string;
    phone_number?: string;
    departments?: { name: string };
    department_specific_data?: any;
  };
}

const UserInfoSidebar = ({ profile }: UserInfoSidebarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-3">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{profile.full_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm break-all">{profile.email}</p>
          </div>
        </div>

        {profile.phone_number && (
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm">{profile.phone_number}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Building2 className="w-4 h-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm">{profile.departments?.name || "Not Assigned"}</p>
          </div>
        </div>

        {profile.department_specific_data && 
         Object.keys(profile.department_specific_data).length > 0 && (
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Additional Info</p>
              {Object.entries(profile.department_specific_data).map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}:
                  </span>{" "}
                  {value as string}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserInfoSidebar;
