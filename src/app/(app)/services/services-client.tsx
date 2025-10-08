"use client";

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
  const columns = getColumns(isAdmin);

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Services</h1>
        {isAdmin && (
          <Sheet>
            <SheetTrigger asChild>
              <Button>Create Service</Button>
            </SheetTrigger>
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
      <DataTable columns={columns} data={services} />
    </div>
  );
}
