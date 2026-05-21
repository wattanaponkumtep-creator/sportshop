"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export function CopyTrackLink({ trackToken }: { trackToken: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/track/${trackToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "คัดลอกลิงก์แล้ว", description: url });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      คัดลอกลิงก์ติดตาม
    </Button>
  );
}
