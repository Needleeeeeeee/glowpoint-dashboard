"use client";
import { Payment } from "@/app/(app)/payments/columns";

export function exportPaymentsToExcel(data: Payment[], filename: string = 'payments') {
  // Define headers
  const headers = [
    'Name',
    'Phone',
    'Date',
    'Time',
    'Services',
    'Amount',
    'Status',
    'Date Created',
    'Claimed By',
    'Claimed Service'
  ];

  // Convert data to CSV rows
  const csvRows = data.map(payment => [
    payment.username,
    payment.phone,
    payment.date,
    payment.time,
    Array.isArray(payment.services) ? payment.services.join(', ') : payment.services,
    payment.amount,
    payment.status,
    payment.date_created,
    payment.claimed_by_username || 'N/A',
    payment.claimed_service || 'N/A'
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  // Combine headers and data
  const csvContent = [
    headers.join(','),
    ...csvRows
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${timestamp}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
