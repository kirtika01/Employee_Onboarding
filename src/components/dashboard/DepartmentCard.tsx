import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Department {
  id: string;
  name: string;
  description: string;
}

interface DepartmentCardProps {
  department: Department;
}

const DepartmentCard = ({ department }: DepartmentCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{department.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {department.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between group-hover:bg-primary/5"
          onClick={() => navigate(`/department/${department.id}`)}
        >
          View Employees
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default DepartmentCard;
