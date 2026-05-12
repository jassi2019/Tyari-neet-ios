"use client";

import { useEffect, useState } from "react";
import {
  getFeatureContents,
  createFeatureContent,
  updateFeatureContent,
  deleteFeatureContent,
} from "@/services/featurecontent";
import { getSubjects } from "@/services/subject";
import { getChapters } from "@/services/chapter";
import { getClasses } from "@/services/class";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loader from "@/components/custom/loader";
import PDFUpload from "@/components/custom/pdf-upload";
import useToast from "@/hooks/useToast";
import {
  Plus,
  Pencil,
  Trash,
  Eye,
  EyeOff,
  Link2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const EMPTY = {
  title: "",
  description: "",
  contentURL: "",
  featureType: "hidden_links",
  serviceType: "FREE",
  sequence: 1,
  isActive: true,
  chapterId: "",
  subjectId: "",
  classId: "",
};

export default function HiddenLinksPage() {
  // Steps: subject -> class -> chapter -> pages
  const [step, setStep] = useState("subject");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Data
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [pages, setPages] = useState([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  const { showSuccess, showError } = useToast();

  // Load subjects & classes on mount
  useEffect(() => {
    const loadMeta = async () => {
      setLoading(true);
      try {
        const [s, c] = await Promise.all([getSubjects(), getClasses()]);
        setSubjects(s?.data || []);
        setClasses(c?.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadMeta();
  }, []);

  // Load chapters when subject+class selected
  useEffect(() => {
    if (!selectedSubject || !selectedClass) return;
    const loadChapters = async () => {
      setLoading(true);
      try {
        const r = await getChapters({
          subjectId: selectedSubject.id,
          classId: selectedClass.id,
        });
        setChapters(r?.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadChapters();
  }, [selectedSubject, selectedClass]);

  // Load pages when chapter selected
  const loadPages = async () => {
    if (!selectedChapter) return;
    setPagesLoading(true);
    try {
      const r = await getFeatureContents("hidden_links", {
        chapterId: selectedChapter.id,
      });
      setPages(r?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setPagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChapter) loadPages();
  }, [selectedChapter]);

  // Handlers
  const handleSubjectClick = (sub) => {
    setSelectedSubject(sub);
    setShowClassModal(true);
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setShowClassModal(false);
    setStep("chapter");
  };

  const handleChapterClick = (ch) => {
    setSelectedChapter(ch);
    setStep("pages");
  };

  const goBack = () => {
    if (step === "pages") {
      setSelectedChapter(null);
      setPages([]);
      setStep("chapter");
    } else if (step === "chapter") {
      setSelectedClass(null);
      setSelectedSubject(null);
      setChapters([]);
      setStep("subject");
    }
  };

  // CRUD
  const openAdd = () => {
    setEditItem(null);
    setForm({
      ...EMPTY,
      subjectId: selectedSubject?.id || "",
      classId: selectedClass?.id || "",
      chapterId: selectedChapter?.id || "",
    });
    setIsOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      contentURL: item.contentURL || "",
      featureType: "hidden_links",
      serviceType: item.serviceType,
      sequence: item.sequence,
      isActive: item.isActive,
      chapterId: item.chapterId,
      subjectId: item.subjectId,
      classId: item.classId,
    });
    setIsOpen(true);
  };

  const onClose = () => {
    setIsOpen(false);
    setEditItem(null);
    setForm({ ...EMPTY });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      showError("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await updateFeatureContent(editItem.id, form);
        showSuccess("Page updated");
      } else {
        await createFeatureContent(form);
        showSuccess("Page added");
      }
      onClose();
      loadPages();
    } catch (e) {
      showError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item) => {
    if (!confirm("Delete this page?")) return;
    try {
      await deleteFeatureContent(item.id);
      showSuccess("Deleted");
      loadPages();
    } catch (e) {
      showError("Failed to delete");
    }
  };

  const onToggle = async (item) => {
    try {
      await updateFeatureContent(item.id, { isActive: !item.isActive });
      loadPages();
    } catch (e) {
      showError("Failed");
    }
  };

  // Breadcrumb
  const breadcrumb = () => {
    const parts = ["Hidden Links"];
    if (selectedSubject) parts.push(selectedSubject.name);
    if (selectedClass) parts.push(selectedClass.name);
    if (selectedChapter) parts.push(selectedChapter.name);
    return parts;
  };

  if (loading && step === "subject") return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header + Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "subject" && (
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {breadcrumb().map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === breadcrumb().length - 1 ? "text-foreground font-semibold" : ""}>
                  {part}
                </span>
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-violet-600" />
            {step === "subject" && "Select Subject"}
            {step === "chapter" && "Select Chapter"}
            {step === "pages" && `Pages — ${selectedChapter?.name}`}
          </h1>
        </div>
        {step === "pages" && (
          <Button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        )}
      </div>

      {/* SUBJECT STEP */}
      {step === "subject" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <Card
              key={sub.id}
              className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all"
              onClick={() => handleSubjectClick(sub)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl">
                  🔗
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{sub.name}</h3>
                  {sub.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {sub.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {subjects.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              No subjects found. Add subjects first.
            </p>
          )}
        </div>
      )}

      {/* CLASS MODAL */}
      <Dialog open={showClassModal} onOpenChange={() => setShowClassModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Class</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            {selectedSubject?.name || "Subject"}
          </p>
          <div className="space-y-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleClassSelect(cls)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {cls.name?.replace(/[^0-9]/g, "") || "•"}
                  </span>
                </div>
                <span className="font-semibold flex-1">{cls.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {classes.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No classes found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CHAPTER STEP */}
      {step === "chapter" && (
        loading ? <Loader /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((ch) => (
              <Card
                key={ch.id}
                className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all"
                onClick={() => handleChapterClick(ch)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                    <span className="text-white font-bold">{ch.number}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{ch.name}</h3>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
            {chapters.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-12">
                No chapters found for this subject & class.
              </p>
            )}
          </div>
        )
      )}

      {/* PAGES STEP */}
      {step === "pages" && (
        pagesLoading ? <Loader /> : pages.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-muted-foreground">
              No pages yet. Click <strong>Add Page</strong> to create the first
              page for this chapter.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((item, idx) => (
              <Card
                key={item.id}
                className={!item.isActive ? "opacity-50" : ""}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-violet-700">
                          {idx + 1}
                        </span>
                      </div>
                      <Badge
                        variant={
                          item.serviceType === "PREMIUM"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {item.serviceType}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onToggle(item)}
                        className="p-1.5 rounded hover:bg-muted"
                      >
                        {item.isActive ? (
                          <Eye className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded hover:bg-red-50"
                      >
                        <Trash className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-base">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.contentURL && (
                    <a
                      href={item.contentURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-600 mt-2 block truncate hover:underline"
                    >
                      {item.contentURL}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit" : "Add"} Page
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Page title"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <PDFUpload
              label="Content PDF"
              currentUrl={form.contentURL}
              onUploadComplete={(url) => setForm({ ...form, contentURL: url })}
            />
            <div>
              <label className="text-sm font-medium mb-1 block">
                Or paste URL
              </label>
              <Input
                value={form.contentURL}
                onChange={(e) =>
                  setForm({ ...form, contentURL: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Access</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                  value={form.serviceType}
                  onChange={(e) =>
                    setForm({ ...form, serviceType: e.target.value })
                  }
                >
                  <option value="FREE">Free</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Sequence
                </label>
                <Input
                  type="number"
                  min="1"
                  value={form.sequence}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sequence: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                id="active-check"
              />
              <label htmlFor="active-check" className="text-sm">
                Active (visible in app)
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {saving ? "Saving..." : editItem ? "Update" : "Create"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
