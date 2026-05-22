"use client";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Channel = {
  channel_type: string;
  external_id: string | null;
  display_name: string | null;
};

export function QuickContact({
  customerName,
  phone,
  channels,
}: {
  customerName: string;
  phone: string | null;
  channels: Channel[];
}) {
  const lineChannels = channels.filter((c) => c.channel_type === "line" || c.channel_type === "line_oa");
  const fbChannels = channels.filter((c) => c.channel_type === "fb" || c.channel_type === "fb_page");

  if (!phone && lineChannels.length === 0 && fbChannels.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Phone className="h-4 w-4" /> ติดต่อ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ติดต่อ {customerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {phone && (
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3 transition hover:border-emerald-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                <Phone className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-medium">โทรศัพท์</div>
                <div className="font-mono text-xs text-muted-foreground">{phone}</div>
              </div>
            </a>
          )}

          {lineChannels.map((ch, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
                <MessageCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {ch.channel_type === "line_oa" ? "LINE OA" : "LINE"}
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {ch.display_name || ch.external_id || "-"}
                </div>
              </div>
            </div>
          ))}

          {fbChannels.map((ch, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                <MessageCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {ch.channel_type === "fb_page" ? "FB Page" : "Facebook"}
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {ch.display_name || ch.external_id || "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
