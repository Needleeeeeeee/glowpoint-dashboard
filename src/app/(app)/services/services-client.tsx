"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getColumns, Service } from "./columns";
import { DataTable } from "./data-table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CreateServiceForm from "@/components/CreateServiceForm";
import { EditServiceDialog } from "@/components/EditServiceDialog";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";

interface ServicesClientProps {
  services: Service[];
  categories: string[];
  isAdmin: boolean;
}

export default function ServicesClient({
  services,
  categories,
  isAdmin,
}: ServicesClientProps) {
  const [editingService, setEditingService] = useState<Service | null>(null);
  const router = useRouter();
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);

  const columns = getColumns(isAdmin, (service) => setEditingService(service));

  // This function will be called by the EditServiceDialog on successful update
  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Services</h1>
        {isAdmin && (
          <Sheet>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => setIsDeleteCategoryOpen(true)}>Delete Category</Button>
              <SheetTrigger asChild>
                <Button>Create Service</Button>
              </SheetTrigger>
            </div>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Service</SheetTitle>
                <SheetDescription>
                  Fill in the details to create a new service.
                </SheetDescription>
              </SheetHeader>
              <CreateServiceForm categories={categories} />
            </SheetContent>
          </Sheet>
        )}
      </div>
      <DataTable columns={columns} data={services} isAdmin={isAdmin} />
      {editingService && (
        <EditServiceDialog
          service={editingService}
          isOpen={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          onSuccess={handleSuccess}
        />
      )}
      {isAdmin && (
        <DeleteCategoryDialog
          isOpen={isDeleteCategoryOpen}
          onOpenChange={setIsDeleteCategoryOpen}
          onSuccess={handleSuccess} />
      )}
    </div>
  );
}
