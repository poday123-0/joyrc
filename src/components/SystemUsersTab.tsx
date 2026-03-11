import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, UserCog } from "lucide-react";
import AdminManagementTab from "./AdminManagementTab";
import StaffManagementTab from "./StaffManagementTab";

const SystemUsersTab = () => {
  const [activeSubTab, setActiveSubTab] = useState("admins");

  return (
    <div className="space-y-4">

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Staff
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="admins" className="mt-4">
          <AdminManagementTab />
        </TabsContent>
        
        <TabsContent value="staff" className="mt-4">
          <StaffManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemUsersTab;
