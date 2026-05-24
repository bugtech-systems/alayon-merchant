"use client";

import { Switch } from "@/components/ui/switch";
import { setCompanyStatus } from "@/lib/actions";
import { useState } from "react";

export default function CompanyStatus({
  company,
}: {
  company: any;
}) {
  const [isOpen, setIsOpen] = useState(company.is_open);

  const handleStatusChange = async () => {
    setIsOpen(!isOpen);
    await setCompanyStatus(company.id, !isOpen);
  };

  return (
    <div className="flex items-center gap-x-2">
      <Switch
        id="manage-inventory"
        onCheckedChange={handleStatusChange}
        checked={isOpen}
      />
    </div>
  );
}
