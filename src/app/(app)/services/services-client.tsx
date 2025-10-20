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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import CreateServiceForm from "@/components/CreateServiceForm";
import CreateServiceCategoryForm from "@/components/CreateServiceCategoryForm";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const columns = getColumns(isAdmin, (service) => setEditingService(service));

  // This function will be called by the forms on successful update
  const handleSuccess = () => {
    router.refresh();
    setIsSheetOpen(false);
  };

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Services</h1>
        {isAdmin && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => setIsDeleteCategoryOpen(true)}>Delete Category</Button>
              <SheetTrigger asChild>
                <Button>Create Service / Service Category</Button>
              </SheetTrigger>
            </div>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Create New Service / Service Category</SheetTitle>
                <SheetDescription>
                  Create a new Service or a new Service Category.
                </SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="service" className="mt-6 mx-3 mb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="service">Service</TabsTrigger>
                  <TabsTrigger value="category">Category</TabsTrigger>
                </TabsList>
                <TabsContent value="service" className="space-y-4">
                  <CreateServiceForm categories={categories} />
                </TabsContent>
                <TabsContent value="category" className="space-y-4">
                  <CreateServiceCategoryForm onSuccess={handleSuccess} />
                </TabsContent>
              </Tabs>
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
