 "use client";

import { Payment, getColumns } from "./columns";
import { DataTable } from "./data-table";

interface PaymentsClientProps {
  data: Payment[];
  isAdmin: boolean;
  userId: string | null;
}

export function PaymentsClient({ data, isAdmin, userId }: PaymentsClientProps) {
  const columns = getColumns(isAdmin, userId);

  return <DataTable columns={columns} data={data} isAdmin={isAdmin} userId={userId} />;
}
