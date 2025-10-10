"use client";

export type Users = {
  id: string;
  username: string;
  email: string;
  phone: string;
  location: string;
  isAdmin: boolean | null;
  is_active: boolean;
};

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { reactivateUser } from "@/actions";
import EditUsers from "@/components/EditUsers";

export const columns: ColumnDef<Users>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows"
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select row ${row.index}`}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        checked={row.getIsSelected()}
      />
    ),
    size: 60,
  },
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold w-full justify-start"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    size: 200,
  },
  {
    accessorKey: "email",
    header: "Email",
    size: 300,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    size: 150,
  },
  {
    accessorKey: "location",
    header: "Location",
    size: 150,
  },
  {
    accessorKey: "isAdmin",
    accessorFn: (row) => (row.isAdmin ? "Admin" : "Employee"),
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.isAdmin ? "Admin" : "Employee";
      return (
        <div
          className={cn(
            `p-1 rounded-md w-max text-xs`,
            row.original.isAdmin ? "bg-green-500/40" : "bg-yellow-500/40"
          )}
        >
          {role as string}
        </div>
      );
    },
    size: 120,
    filterFn: "equals",
  },
  {
    accessorKey: "is_active",
    accessorFn: (row) => (row.is_active ? "Active" : "Disabled"),
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      return (
        <div
          className={cn(
            "p-1 rounded-md w-max text-xs font-medium",
            isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}
        >
          {isActive ? "Active" : "Disabled"}
        </div>
      );
    },
    filterFn: "equals",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const users = row.original;
      const [isPending, startTransition] = useTransition();

      const handleReactivate = () => {
        startTransition(async () => {
          const result = await reactivateUser(users.id); // This is already correct

          console.log(result);
        });
      };

      return (
        <Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(users.username)}
              >
                Copy user Name
              </DropdownMenuItem>
              {users.is_active ? (
                <>
                  <DropdownMenuSeparator />
                  <SheetTrigger asChild>
                    <DropdownMenuItem>Edit User</DropdownMenuItem>
                  </SheetTrigger>
                </>
              ) : (
                <DropdownMenuItem onClick={handleReactivate}>Re-activate User</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit {users.username}</SheetTitle>
            </SheetHeader>
            <EditUsers userProfile={users} />
          </SheetContent>
        </Sheet>
      );
    },
    size: 80,
  },
];
