"use client";
import { useEffect, useState } from "react";
import { getAllNotifications, createNotification, deleteNotification } from "@/services/notifications";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import { Bell, Plus, Trash, Send } from "lucide-react";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", icon: "bell" });
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  const load = async () => {
    setLoading(true);
    try { const r = await getAllNotifications(); setItems(r?.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) { showError("Title and message required"); return; }
    setSaving(true);
    try { await createNotification({ ...form, isGlobal: true }); showSuccess("Notification sent to all users!"); setIsOpen(false); setForm({ title: "", message: "", icon: "bell" }); load(); }
    catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (id) => {
    if (!confirm("Delete this notification?")) return;
    try { await deleteNotification(id); showSuccess("Deleted"); load(); } catch (e) { showError("Failed"); }
  };
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"><Bell className="h-5 w-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-sm text-muted-foreground">{items.length} sent</p></div>
        </div>
        <Button onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-2" />Send Notification</Button>
      </div>
      {loading ? <Loader /> : items.length === 0 ? (
        <Card className="p-12 text-center"><Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No notifications sent yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-xl">{item.icon === "bell" ? "\ud83d\udd14" : item.icon}</div>
                  <div>
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{fmtDate(item.createdAt)} {item.isGlobal ? "\u00b7 All users" : "\u00b7 Specific user"}</p>
                  </div>
                </div>
                <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-red-50"><Trash className="h-4 w-4 text-red-500" /></button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={() => setIsOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Icon (emoji)</label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="bell or emoji" /></div>
            <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notification title" required /></div>
            <div><label className="text-sm font-medium mb-1 block">Message *</label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Notification message..." rows={3} required /></div>
            <div className="flex gap-2"><Button type="submit" disabled={saving} className="flex-1"><Send className="h-4 w-4 mr-2" />{saving ? "Sending..." : "Send to All Users"}</Button><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}