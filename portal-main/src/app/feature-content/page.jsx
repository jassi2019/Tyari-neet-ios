"use client";
import { useEffect, useState, Suspense } from "react";
import { getFeatureContents, createFeatureContent, updateFeatureContent, deleteFeatureContent } from "@/services/featurecontent";
import { getSubjects } from "@/services/subject";
import { getChapters } from "@/services/chapter";
import { getClasses } from "@/services/class";
import { uploadPDF } from "@/services/upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Loader from "@/components/custom/loader";
import PDFUpload from "@/components/custom/pdf-upload";
import useToast from "@/hooks/useToast";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Pencil, Trash, Eye, EyeOff } from "lucide-react";

const LABELS = { explanation: "Explanation", revision_recall: "Revision Recall", hidden_links: "Hidden Links", exercise_revival: "Exercise Revival", master_exemplar: "Master Exemplar", pyq: "PYQs", chapter_checkpoint: "Chapter Checkpoint" };
const EMPTY = { title: "", description: "", contentURL: "", featureType: "", serviceType: "FREE", sequence: 1, isActive: true, chapterId: "", subjectId: "", classId: "" };

function FeatureContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const featureType = searchParams.get("type") || "explanation";
  const isRedirect = featureType === "revision_recall" || featureType === "hidden_links";
  const label = LABELS[featureType] || featureType;
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  // Redirect dedicated feature types to their own pages
  useEffect(() => {
    if (featureType === "revision_recall") router.replace("/revision-recall");
    if (featureType === "hidden_links") router.replace("/hidden-links");
  }, [featureType, router]);

  const load = async () => {
    if (isRedirect) return;
    setLoading(true);
    try { const r = await getFeatureContents(featureType); setItems(r?.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadMeta = async () => {
    if (isRedirect) return;
    try {
      const [s, c, ch] = await Promise.all([getSubjects(), getClasses(), getChapters()]);
      setSubjects(s?.data || []); setClasses(c?.data || []); setChapters(ch?.data || []);
    } catch (e) {}
  };

  useEffect(() => { load(); }, [featureType]);
  useEffect(() => { loadMeta(); }, []);

  if (isRedirect) return <Loader />;

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY, featureType }); setIsOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ title: item.title, description: item.description || "", contentURL: item.contentURL || "", featureType: item.featureType, serviceType: item.serviceType, sequence: item.sequence, isActive: item.isActive, chapterId: item.chapterId, subjectId: item.subjectId, classId: item.classId }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); setForm({ ...EMPTY }); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.chapterId || !form.subjectId || !form.classId) { showError("Fill required fields"); return; }
    setSaving(true);
    try {
      if (editItem) { await updateFeatureContent(editItem.id, form); } else { await createFeatureContent(form); }
      showSuccess(editItem ? "Updated" : "Created"); onClose(); load();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (item) => {
    if (!confirm("Delete this content?")) return;
    try { await deleteFeatureContent(item.id); showSuccess("Deleted"); load(); } catch (e) { showError("Failed"); }
  };
  const onToggle = async (item) => {
    try { await updateFeatureContent(item.id, { isActive: !item.isActive }); load(); } catch (e) { showError("Failed"); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">{label} Content</h1><p className="text-sm text-muted-foreground">{items.length} items</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Content</Button>
      </div>
      {loading ? <Loader /> : items.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No {label} content yet. Click Add Content to start.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className={!item.isActive ? "opacity-50" : ""}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={item.serviceType === "PREMIUM" ? "default" : "secondary"} className="text-xs">{item.serviceType}</Badge>
                  <div className="flex gap-1">
                    <button onClick={() => onToggle(item)} className="p-1 rounded hover:bg-muted"><span>{item.isActive ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</span></button>
                    <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-50"><Trash className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                <h3 className="font-bold">{item.title}</h3>
                {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{item.Subject?.name}</span><span>{item.Chapter?.name}</span><span>{item.Class?.name}</span>
                </div>
                {item.contentURL && <a href={item.contentURL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-2 block truncate">{item.contentURL}</a>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} {label} Content</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <PDFUpload label="Content PDF" currentUrl={form.contentURL} onUploadComplete={(url) => setForm({ ...form, contentURL: url })} />
            <div><label className="text-sm font-medium mb-1 block">Or paste URL</label><Input value={form.contentURL} onChange={(e) => setForm({ ...form, contentURL: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Subject *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Class *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Chapter *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} required><option value="">Select</option>{chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Access</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}><option value="FREE">Free</option><option value="PREMIUM">Premium</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input type="number" min="1" value={form.sequence} onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 1 })} /></div>
              <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label></div>
            </div>
            <div className="flex gap-2"><Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FeatureContentPage() {
  return <Suspense fallback={<Loader />}><FeatureContentInner /></Suspense>;
}