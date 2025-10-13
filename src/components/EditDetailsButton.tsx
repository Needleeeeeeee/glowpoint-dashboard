"use client";

import React from "react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface EditDetailsButtonProps {
  children: React.ReactNode;
}

export default function EditDetailsButton({ children }: EditDetailsButtonProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Edit Details</Button>
      </SheetTrigger>
      {children}
    </Sheet>
  );
}
