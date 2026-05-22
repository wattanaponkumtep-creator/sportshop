"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

type Template = {
  id: string;
  channel: string;
  channelLabel: string;
  title: string;
  text: string;
};

export function TemplateCard({ template }: { template: Template }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(template.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{template.title}</h3>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {template.channelLabel}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {template.text}
        </pre>
      </CardContent>
    </Card>
  );
}
