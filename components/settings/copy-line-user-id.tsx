"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyLineUserId({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`คลิกเพื่อ copy: ${userId}`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md border border-border bg-card/40 px-2 py-1 font-mono text-[11px] transition",
        "hover:border-primary/50 hover:bg-card",
        copied && "border-emerald-500/40 bg-emerald-500/10"
      )}
    >
      <span className="truncate max-w-[120px]">{userId.slice(0, 16)}...</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  );
}
