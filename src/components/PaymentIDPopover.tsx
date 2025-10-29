"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface PaymentIDPopoverProps {
  paymentId: string;
}

export function PaymentIDPopover({ paymentId }: PaymentIDPopoverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!paymentId || paymentId === "N/A") {
    return <code className="text-xs bg-muted px-2 py-1 rounded">N/A</code>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent text-left justify-start font-mono"
        >
          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[100px] block cursor-pointer hover:bg-muted/80 transition-colors">
            {paymentId}
          </code>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-md p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">Payment ID</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-600" />
                  <span className="text-xs text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
          <div className="bg-muted p-2 rounded">
            <code className="text-xs break-all">{paymentId}</code>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
