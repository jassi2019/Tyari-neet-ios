"use client";
import { useEffect, useState, Suspense } from "react";
import { getFeatureContents, createFeatureContent, updateFeatureContent, deleteFeatureContent } from "@/services/featurecontent";
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from "@/services/questions";
import { getSubjects } from "@/services/subject";
import { getChapters } from "@/services/chapter";
import { getClasses } from "@/services/class";
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
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash, Eye, EyeOff, ArrowLeft, ChevronRight, Brain, Link2 } from "lucide-react";

const LABELS = { explanation: "Explanation", revision_recall: "Revision Recall", hidden_links: "Hidden Links", exercise_revival: "Exercise Revival", master_exemplar: "Master Exemplar", pyq: "PYQs", chapter_checkpoint: "Chapter Checkpoint" };
const EMPTY = { title: "", description: "", contentURL: "", featureType: "", serviceType: "FREE", sequence: 1, isActive: true, chapterId: "", subjectId: "", classId: "" };
const QUESTION_TYPES = ["MCQ", "FILL_BLANK", "MATCH"];
const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
const CORRECT_OPTIONS = ["A", "B", "C", "D"];

/* ═══════════════════════════════════════════════════
   HIDDEN LINKS — Subject → Class popup → Chapter → Pages
   ═══════════════════════════════════════════════════ */
function HiddenLinksFlow() {
  const [step, setStep] = useState("subject");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, featureType: "hidden_links" });
  const [saving, setSaving] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, c] = await Promise.all([getSubjects(), getClasses()]);
        setSubjects(s?.data || []); setClasses(c?.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubject || !selectedClass) return;
    (async () => {
      setLoading(true);
      try { const r = await getChapters({ subjectId: selectedSubject.id, classId: selectedClass.id }); setChapters(r?.data || []); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [selectedSubject, selectedClass]);

  const loadItems = async () => {
    if (!selectedChapter) return;
    setItemsLoading(true);
    try { const r = await getFeatureContents("hidden_links", { chapterId: selectedChapter.id }); setItems(r?.data || []); }
    catch (e) { console.error(e); }
    finally { setItemsLoading(false); }
  };
  useEffect(() => { if (selectedChapter) loadItems(); }, [selectedChapter]);

  const handleSubjectClick = (sub) => { setSelectedSubject(sub); setShowClassModal(true); };
  const handleClassSelect = (cls) => { setSelectedClass(cls); setShowClassModal(false); setStep("chapter"); };
  const handleChapterClick = (ch) => { setSelectedChapter(ch); setStep("pages"); };
  const goBack = () => {
    if (step === "pages") { setSelectedChapter(null); setItems([]); setStep("chapter"); }
    else if (step === "chapter") { setSelectedClass(null); setSelectedSubject(null); setChapters([]); setStep("subject"); }
  };

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY, featureType: "hidden_links", subjectId: selectedSubject?.id || "", classId: selectedClass?.id || "", chapterId: selectedChapter?.id || "" }); setIsOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ title: item.title, description: item.description || "", contentURL: item.contentURL || "", featureType: "hidden_links", serviceType: item.serviceType, sequence: item.sequence, isActive: item.isActive, chapterId: item.chapterId, subjectId: item.subjectId, classId: item.classId }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); };
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { showError("Title required"); return; }
    setSaving(true);
    try {
      if (editItem) { await updateFeatureContent(editItem.id, form); } else { await createFeatureContent(form); }
      showSuccess(editItem ? "Updated" : "Created"); onClose(); loadItems();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (item) => { if (!confirm("Delete?")) return; try { await deleteFeatureContent(item.id); showSuccess("Deleted"); loadItems(); } catch (e) { showError("Failed"); } };
  const onToggle = async (item) => { try { await updateFeatureContent(item.id, { isActive: !item.isActive }); loadItems(); } catch (e) { showError("Failed"); } };

  const breadcrumb = () => { const p = ["Hidden Links"]; if (selectedSubject) p.push(selectedSubject.name); if (selectedClass) p.push(selectedClass.name); if (selectedChapter) p.push(selectedChapter.name); return p; };

  if (loading && step === "subject") return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {step !== "subject" && <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {breadcrumb().map((part, i) => (<span key={i} className="flex items-center gap-2">{i > 0 && <ChevronRight className="h-3 w-3" />}<span className={i === breadcrumb().length - 1 ? "text-foreground font-semibold" : ""}>{part}</span></span>))}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-violet-600" />
            {step === "subject" && "Select Subject"}{step === "chapter" && "Select Chapter"}{step === "pages" && `Pages — ${selectedChapter?.name}`}
          </h1>
        </div>
        {step === "pages" && <Button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-2" />Add Page</Button>}
      </div>

      {step === "subject" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <Card key={sub.id} className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all" onClick={() => handleSubjectClick(sub)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center"><Link2 className="h-6 w-6 text-violet-600" /></div>
                <div className="flex-1"><h3 className="font-bold text-lg">{sub.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showClassModal} onOpenChange={() => setShowClassModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Class</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubject?.name}</p>
          <div className="space-y-2">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleClassSelect(cls)} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center"><span className="text-white font-bold text-sm">{cls.name?.replace(/[^0-9]/g, "") || "•"}</span></div>
                <span className="font-semibold flex-1">{cls.name}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {step === "chapter" && (loading ? <Loader /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((ch) => (
            <Card key={ch.id} className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all" onClick={() => handleChapterClick(ch)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center"><span className="text-white font-bold">{ch.number}</span></div>
                <div className="flex-1"><h3 className="font-semibold">{ch.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {chapters.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No chapters found.</p>}
        </div>
      ))}

      {step === "pages" && (itemsLoading ? <Loader /> : items.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No pages yet. Click <strong>Add Page</strong> to start.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className={!item.isActive ? "opacity-50" : ""}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={item.serviceType === "PREMIUM" ? "default" : "secondary"} className="text-xs">{item.serviceType}</Badge>
                  <div className="flex gap-1">
                    <button onClick={() => onToggle(item)} className="p-1 rounded hover:bg-muted">{item.isActive ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</button>
                    <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-50"><Trash className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                <h3 className="font-bold">{item.title}</h3>
                {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                {item.contentURL && <a href={item.contentURL} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-2 block truncate">{item.contentURL}</a>}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Page</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Title *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <PDFUpload label="Content PDF" currentUrl={form.contentURL} onUploadComplete={(url) => setForm({ ...form, contentURL: url })} />
            <div><label className="text-sm font-medium mb-1 block">Or paste URL</label><Input value={form.contentURL} onChange={(e) => setForm({ ...form, contentURL: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Access</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}><option value="FREE">Free</option><option value="PREMIUM">Premium</option></select></div>
              <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input type="number" min="1" value={form.sequence} onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active</label></div>
            <div className="flex gap-2"><Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700">{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REVISION RECALL — Subject → Class popup → Chapter → Questions (MCQ/Fill/Match)
   ═══════════════════════════════════════════════════ */
function RevisionRecallFlow() {
  const [step, setStep] = useState("subject");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ text: "", questionType: "MCQ", featureType: "revision_recall", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: "", classId: "", chapterId: "" });
  const [saving, setSaving] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const [s, c] = await Promise.all([getSubjects(), getClasses()]); setSubjects(s?.data || []); setClasses(c?.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubject || !selectedClass) return;
    (async () => {
      setLoading(true);
      try { const r = await getChapters({ subjectId: selectedSubject.id, classId: selectedClass.id }); setChapters(r?.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [selectedSubject, selectedClass]);

  const loadQuestions = async () => {
    if (!selectedChapter) return;
    setQuestionsLoading(true);
    try { const r = await getQuestions({ featureType: "revision_recall", chapterId: selectedChapter.id }); setQuestions(r?.data || []); }
    catch (e) { console.error(e); } finally { setQuestionsLoading(false); }
  };
  useEffect(() => { if (selectedChapter) loadQuestions(); }, [selectedChapter]);

  const handleSubjectClick = (sub) => { setSelectedSubject(sub); setShowClassModal(true); };
  const handleClassSelect = (cls) => { setSelectedClass(cls); setShowClassModal(false); setStep("chapter"); };
  const handleChapterClick = (ch) => { setSelectedChapter(ch); setStep("questions"); };
  const goBack = () => {
    if (step === "questions") { setSelectedChapter(null); setQuestions([]); setStep("chapter"); }
    else if (step === "chapter") { setSelectedClass(null); setSelectedSubject(null); setChapters([]); setStep("subject"); }
  };

  const openAdd = () => { setEditItem(null); setForm({ text: "", questionType: "MCQ", featureType: "revision_recall", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: selectedSubject?.id || "", classId: selectedClass?.id || "", chapterId: selectedChapter?.id || "" }); setIsOpen(true); };
  const openEdit = (q) => { setEditItem(q); setForm({ text: q.text, questionType: q.questionType || "MCQ", featureType: "revision_recall", optionA: q.optionA || "", optionB: q.optionB || "", optionC: q.optionC || "", optionD: q.optionD || "", correctOption: q.correctOption || "", correctAnswer: q.correctAnswer || "", matchPairs: q.matchPairs || "", explanation: q.explanation || "", difficulty: q.difficulty || "MEDIUM", marks: q.marks || "4", sequence: q.sequence || 1, subjectId: q.subjectId, classId: q.classId, chapterId: q.chapterId }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); };
  const onSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, marks: String(form.marks), sequence: Number(form.sequence), explanation: form.explanation || undefined };
      if (editItem) { await updateQuestion(editItem.id, payload); showSuccess("Updated"); } else { await createQuestion(payload); showSuccess("Added"); }
      onClose(); loadQuestions();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (q) => { if (!confirm("Delete?")) return; try { await deleteQuestion(q.id); showSuccess("Deleted"); loadQuestions(); } catch (e) { showError("Failed"); } };

  const breadcrumb = () => { const p = ["Revision Recall"]; if (selectedSubject) p.push(selectedSubject.name); if (selectedClass) p.push(selectedClass.name); if (selectedChapter) p.push(selectedChapter.name); return p; };
  const typeLabel = { MCQ: "MCQ", FILL_BLANK: "Fill in Blank", MATCH: "Match the Following" };
  const diffColor = { EASY: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700", HARD: "bg-red-100 text-red-700" };

  if (loading && step === "subject") return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {step !== "subject" && <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {breadcrumb().map((part, i) => (<span key={i} className="flex items-center gap-2">{i > 0 && <ChevronRight className="h-3 w-3" />}<span className={i === breadcrumb().length - 1 ? "text-foreground font-semibold" : ""}>{part}</span></span>))}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-amber-600" />
            {step === "subject" && "Select Subject"}{step === "chapter" && "Select Chapter"}{step === "questions" && `Questions — ${selectedChapter?.name}`}
          </h1>
        </div>
        {step === "questions" && <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4 mr-2" />Add Question</Button>}
      </div>

      {step === "subject" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <Card key={sub.id} className="cursor-pointer hover:border-amber-300 hover:shadow-md transition-all" onClick={() => handleSubjectClick(sub)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center"><Brain className="h-6 w-6 text-amber-600" /></div>
                <div className="flex-1"><h3 className="font-bold text-lg">{sub.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showClassModal} onOpenChange={() => setShowClassModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Class</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubject?.name}</p>
          <div className="space-y-2">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleClassSelect(cls)} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-amber-300 hover:bg-amber-50 transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center"><span className="text-white font-bold text-sm">{cls.name?.replace(/[^0-9]/g, "") || "•"}</span></div>
                <span className="font-semibold flex-1">{cls.name}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {step === "chapter" && (loading ? <Loader /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((ch) => (
            <Card key={ch.id} className="cursor-pointer hover:border-amber-300 hover:shadow-md transition-all" onClick={() => handleChapterClick(ch)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center"><span className="text-white font-bold">{ch.number}</span></div>
                <div className="flex-1"><h3 className="font-semibold">{ch.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {chapters.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No chapters found.</p>}
        </div>
      ))}

      {step === "questions" && (questionsLoading ? <Loader /> : questions.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No questions yet. Click <strong>Add Question</strong> to create MCQ, Fill in Blank, or Match questions.</p></Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-2">{q.text}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{typeLabel[q.questionType] || q.questionType}</Badge>
                      <Badge className={`${diffColor[q.difficulty] || ""} text-xs`}>{q.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} marks</span>
                    </div>
                    {(!q.questionType || q.questionType === "MCQ") && <div className="grid grid-cols-2 gap-1.5 mb-2">{["A","B","C","D"].map(l => q[`option${l}`] ? <div key={l} className={`px-3 py-1.5 rounded-lg text-sm ${q.correctOption===l?"bg-green-50 border border-green-200 text-green-800 font-medium":"bg-muted/40 text-muted-foreground"}`}><span className="font-bold">{l}.</span> {q[`option${l}`]}</div> : null)}</div>}
                    {q.questionType === "FILL_BLANK" && q.correctAnswer && <div className="px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800 font-medium mb-2">Answer: {q.correctAnswer}</div>}
                    {q.questionType === "MATCH" && q.matchPairs && <div className="grid grid-cols-2 gap-1.5 mb-2">{(()=>{try{return JSON.parse(q.matchPairs)}catch{return[]}})().map((p,i)=><div key={i} className="px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200"><span className="text-blue-800">{p.left} ↔ {p.right}</span></div>)}</div>}
                    {q.explanation && <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">{q.explanation}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(q)} className="p-1.5 rounded hover:bg-red-50"><Trash className="h-4 w-4 text-red-500" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div><label className="text-sm font-medium">Question Type *</label>
              <div className="flex gap-2 mt-1">{QUESTION_TYPES.map(t => <button key={t} type="button" onClick={() => setForm({...form, questionType: t})} className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold border-2 transition-all ${form.questionType===t?"border-amber-600 bg-amber-600 text-white":"border-muted bg-muted/30 text-muted-foreground hover:border-amber-300"}`}>{t==="MCQ"?"MCQ":t==="FILL_BLANK"?"Fill in Blank":"Match"}</button>)}</div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Question *</label><Textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={3} required /></div>
            {form.questionType === "MCQ" && <>
              {["A","B","C","D"].map(l=><div key={l}><label className="text-sm font-medium mb-1 block">Option {l}</label><Input value={form[`option${l}`]} onChange={e=>setForm({...form,[`option${l}`]:e.target.value})} required /></div>)}
              <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Select value={form.correctOption} onValueChange={v=>setForm({...form,correctOption:v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CORRECT_OPTIONS.map(o=><SelectItem key={o} value={o}>Option {o}</SelectItem>)}</SelectContent></Select></div>
            </>}
            {form.questionType === "FILL_BLANK" && <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Input value={form.correctAnswer} onChange={e=>setForm({...form,correctAnswer:e.target.value})} required /></div>}
            {form.questionType === "MATCH" && <div><label className="text-sm font-medium mb-1 block">Match Pairs (JSON) *</label><Textarea value={form.matchPairs} onChange={e=>setForm({...form,matchPairs:e.target.value})} placeholder={'[{"left":"A","right":"B"}]'} rows={4} required /></div>}
            <div><label className="text-sm font-medium mb-1 block">Explanation</label><Textarea value={form.explanation} onChange={e=>setForm({...form,explanation:e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Difficulty</label><Select value={form.difficulty} onValueChange={v=>setForm({...form,difficulty:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTY_OPTIONS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium mb-1 block">Marks</label><Input value={form.marks} onChange={e=>setForm({...form,marks:e.target.value})} type="number" /></div>
              <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input value={form.sequence} onChange={e=>setForm({...form,sequence:parseInt(e.target.value)||1})} type="number" min="1" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700">{saving ? "Saving..." : editItem ? "Update" : "Add Question"}</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GENERIC — flat list + form (Explanation, Exercise Revival, etc.)
   ═══════════════════════════════════════════════════ */
function GenericFlow({ featureType, label }) {
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

  const load = async () => { setLoading(true); try { const r = await getFeatureContents(featureType); setItems(r?.data || []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [featureType]);
  useEffect(() => { (async () => { try { const [s,c,ch] = await Promise.all([getSubjects(),getClasses(),getChapters()]); setSubjects(s?.data||[]); setClasses(c?.data||[]); setChapters(ch?.data||[]); } catch(e){} })(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY, featureType }); setIsOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ title: item.title, description: item.description||"", contentURL: item.contentURL||"", featureType: item.featureType, serviceType: item.serviceType, sequence: item.sequence, isActive: item.isActive, chapterId: item.chapterId, subjectId: item.subjectId, classId: item.classId }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); };
  const onSubmit = async (e) => { e.preventDefault(); if(!form.title||!form.chapterId||!form.subjectId||!form.classId){showError("Fill required fields");return;} setSaving(true); try { if(editItem){await updateFeatureContent(editItem.id,form);}else{await createFeatureContent(form);} showSuccess(editItem?"Updated":"Created"); onClose(); load(); } catch(e){showError("Failed");} finally{setSaving(false);} };
  const onDelete = async (item) => { if(!confirm("Delete?"))return; try{await deleteFeatureContent(item.id);showSuccess("Deleted");load();}catch(e){showError("Failed");} };
  const onToggle = async (item) => { try{await updateFeatureContent(item.id,{isActive:!item.isActive});load();}catch(e){showError("Failed");} };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">{label} Content</h1><p className="text-sm text-muted-foreground">{items.length} items</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Content</Button>
      </div>
      {loading ? <Loader /> : items.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No {label} content yet.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} className={!item.isActive ? "opacity-50" : ""}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={item.serviceType === "PREMIUM" ? "default" : "secondary"} className="text-xs">{item.serviceType}</Badge>
                  <div className="flex gap-1">
                    <button onClick={() => onToggle(item)} className="p-1 rounded hover:bg-muted">{item.isActive ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</button>
                    <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-50"><Trash className="h-3.5 w-3.5 text-red-500" /></button>
                  </div>
                </div>
                <h3 className="font-bold">{item.title}</h3>
                {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground"><span>{item.Subject?.name}</span><span>{item.Chapter?.name}</span><span>{item.Class?.name}</span></div>
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

/* ═══════════════════════════════════════════════════
   5-SECTION FLOW — Used by Exercise Revival, Master Exemplar, PYQs
   Subject → Class → Chapter → Section popup → Questions (MCQ/Fill/Match)
   ═══════════════════════════════════════════════════ */
function makeSections(prefix) {
  return [
    { key: `${prefix}_questions`, label: "Questions", icon: "📝", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-300" },
    { key: `${prefix}_explanation`, label: "Explanation", icon: "💡", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-300" },
    { key: `${prefix}_source_line`, label: "Source Line", icon: "📖", color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-300" },
    { key: `${prefix}_hidden_concepts`, label: "Hidden Concepts & Q&A", icon: "🔍", color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-300" },
    { key: `${prefix}_mcq_practice`, label: "MCQ Practice Zone", icon: "🎯", color: "text-rose-600", bg: "bg-rose-100", border: "border-rose-300" },
  ];
}

function FiveSectionFlow({ title, prefix, accentColor = "emerald" }) {
  const SECTIONS = makeSections(prefix);
  const accent = accentColor;
  const accentBg = `bg-${accent}-600`;
  const accentHoverBg = `hover:bg-${accent}-700`;
  const accentBorder = `hover:border-${accent}-300`;
  const accentLightBg = `bg-${accent}-100`;
  const [step, setStep] = useState("subject");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ text: "", questionType: "MCQ", featureType: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: "", classId: "", chapterId: "" });
  const [saving, setSaving] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const [s, c] = await Promise.all([getSubjects(), getClasses()]); setSubjects(s?.data || []); setClasses(c?.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubject || !selectedClass) return;
    (async () => {
      setLoading(true);
      try { const r = await getChapters({ subjectId: selectedSubject.id, classId: selectedClass.id }); setChapters(r?.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [selectedSubject, selectedClass]);

  const loadQuestions = async () => {
    if (!selectedChapter || !selectedSection) return;
    setQuestionsLoading(true);
    try { const r = await getQuestions({ featureType: selectedSection.key, chapterId: selectedChapter.id }); setQuestions(r?.data || []); }
    catch (e) { console.error(e); } finally { setQuestionsLoading(false); }
  };
  useEffect(() => { if (selectedChapter && selectedSection) loadQuestions(); }, [selectedChapter, selectedSection]);

  const handleSubjectClick = (sub) => { setSelectedSubject(sub); setShowClassModal(true); };
  const handleClassSelect = (cls) => { setSelectedClass(cls); setShowClassModal(false); setStep("chapter"); };
  const handleChapterClick = (ch) => { setSelectedChapter(ch); setShowSectionModal(true); };
  const handleSectionSelect = (sec) => { setSelectedSection(sec); setShowSectionModal(false); setStep("questions"); };
  const goBack = () => {
    if (step === "questions") { setSelectedSection(null); setQuestions([]); setStep("chapter"); }
    else if (step === "chapter") { setSelectedClass(null); setSelectedSubject(null); setChapters([]); setStep("subject"); }
  };

  const openAdd = () => { setEditItem(null); setForm({ text: "", questionType: "MCQ", featureType: selectedSection?.key || "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: selectedSubject?.id || "", classId: selectedClass?.id || "", chapterId: selectedChapter?.id || "" }); setIsOpen(true); };
  const openEdit = (q) => { setEditItem(q); setForm({ text: q.text, questionType: q.questionType || "MCQ", featureType: selectedSection?.key || q.featureType, optionA: q.optionA || "", optionB: q.optionB || "", optionC: q.optionC || "", optionD: q.optionD || "", correctOption: q.correctOption || "", correctAnswer: q.correctAnswer || "", matchPairs: q.matchPairs || "", explanation: q.explanation || "", difficulty: q.difficulty || "MEDIUM", marks: q.marks || "4", sequence: q.sequence || 1, subjectId: q.subjectId, classId: q.classId, chapterId: q.chapterId }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); };
  const onSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, marks: String(form.marks), sequence: Number(form.sequence), explanation: form.explanation || undefined };
      if (editItem) { await updateQuestion(editItem.id, payload); showSuccess("Updated"); } else { await createQuestion(payload); showSuccess("Added"); }
      onClose(); loadQuestions();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (q) => { if (!confirm("Delete?")) return; try { await deleteQuestion(q.id); showSuccess("Deleted"); loadQuestions(); } catch (e) { showError("Failed"); } };

  const breadcrumb = () => { const p = [title]; if (selectedSubject) p.push(selectedSubject.name); if (selectedClass) p.push(selectedClass.name); if (selectedChapter) p.push(selectedChapter.name); if (selectedSection) p.push(selectedSection.label); return p; };
  const typeLabel = { MCQ: "MCQ", FILL_BLANK: "Fill in Blank", MATCH: "Match the Following" };
  const diffColor = { EASY: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700", HARD: "bg-red-100 text-red-700" };

  if (loading && step === "subject") return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {step !== "subject" && <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></button>}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {breadcrumb().map((part, i) => (<span key={i} className="flex items-center gap-2">{i > 0 && <ChevronRight className="h-3 w-3" />}<span className={i === breadcrumb().length - 1 ? "text-foreground font-semibold" : ""}>{part}</span></span>))}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {step === "subject" && "Select Subject"}
            {step === "chapter" && "Select Chapter"}
            {step === "questions" && `${selectedSection?.label} — ${selectedChapter?.name}`}
          </h1>
        </div>
        {step === "questions" && <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" />Add Question</Button>}
      </div>

      {/* SUBJECT */}
      {step === "subject" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <Card key={sub.id} className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all" onClick={() => handleSubjectClick(sub)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">&#128218;</div>
                <div className="flex-1"><h3 className="font-bold text-lg">{sub.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CLASS POPUP */}
      <Dialog open={showClassModal} onOpenChange={() => setShowClassModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Class</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{selectedSubject?.name}</p>
          <div className="space-y-2">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleClassSelect(cls)} className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center"><span className="text-white font-bold text-sm">{cls.name?.replace(/[^0-9]/g, "") || "•"}</span></div>
                <span className="font-semibold flex-1">{cls.name}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CHAPTER */}
      {step === "chapter" && (loading ? <Loader /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((ch) => (
            <Card key={ch.id} className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all" onClick={() => handleChapterClick(ch)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center"><span className="text-white font-bold">{ch.number}</span></div>
                <div className="flex-1"><h3 className="font-semibold">{ch.name}</h3></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {chapters.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No chapters found.</p>}
        </div>
      ))}

      {/* SECTION POPUP — 5 options */}
      <Dialog open={showSectionModal} onOpenChange={() => setShowSectionModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Choose Section</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">{selectedChapter?.name}</p>
          <div className="space-y-2">
            {SECTIONS.map((sec) => (
              <button key={sec.key} onClick={() => handleSectionSelect(sec)} className={`w-full flex items-center gap-3 p-4 rounded-lg border hover:${sec.border} hover:shadow-sm transition-all text-left`}>
                <div className={`w-10 h-10 rounded-xl ${sec.bg} flex items-center justify-center text-xl`}>{sec.icon}</div>
                <span className={`font-bold flex-1 ${sec.color}`}>{sec.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* QUESTIONS */}
      {step === "questions" && (questionsLoading ? <Loader /> : questions.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No content yet. Click <strong>Add Question</strong> to start.</p></Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-2">{q.text}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{typeLabel[q.questionType] || q.questionType}</Badge>
                      <Badge className={`${diffColor[q.difficulty] || ""} text-xs`}>{q.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} marks</span>
                    </div>
                    {(!q.questionType || q.questionType === "MCQ") && <div className="grid grid-cols-2 gap-1.5 mb-2">{["A","B","C","D"].map(l => q[`option${l}`] ? <div key={l} className={`px-3 py-1.5 rounded-lg text-sm ${q.correctOption===l?"bg-green-50 border border-green-200 text-green-800 font-medium":"bg-muted/40 text-muted-foreground"}`}><span className="font-bold">{l}.</span> {q[`option${l}`]}</div> : null)}</div>}
                    {q.questionType === "FILL_BLANK" && q.correctAnswer && <div className="px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800 font-medium mb-2">Answer: {q.correctAnswer}</div>}
                    {q.questionType === "MATCH" && q.matchPairs && <div className="grid grid-cols-2 gap-1.5 mb-2">{(()=>{try{return JSON.parse(q.matchPairs)}catch{return[]}})().map((p,i)=><div key={i} className="px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200"><span className="text-blue-800">{p.left} ↔ {p.right}</span></div>)}</div>}
                    {q.explanation && <p className="text-xs text-muted-foreground italic border-l-2 border-emerald-300 pl-3 mt-2">{q.explanation}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(q)} className="p-1.5 rounded hover:bg-red-50"><Trash className="h-4 w-4 text-red-500" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} — {selectedSection?.label}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div><label className="text-sm font-medium">Question Type *</label>
              <div className="flex gap-2 mt-1">{QUESTION_TYPES.map(t => <button key={t} type="button" onClick={() => setForm({...form, questionType: t})} className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold border-2 transition-all ${form.questionType===t?"border-emerald-600 bg-emerald-600 text-white":"border-muted bg-muted/30 text-muted-foreground hover:border-emerald-300"}`}>{t==="MCQ"?"MCQ":t==="FILL_BLANK"?"Fill in Blank":"Match"}</button>)}</div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Question / Content *</label><Textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={3} required /></div>
            {form.questionType === "MCQ" && <>
              {["A","B","C","D"].map(l=><div key={l}><label className="text-sm font-medium mb-1 block">Option {l}</label><Input value={form[`option${l}`]} onChange={e=>setForm({...form,[`option${l}`]:e.target.value})} required /></div>)}
              <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Select value={form.correctOption} onValueChange={v=>setForm({...form,correctOption:v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CORRECT_OPTIONS.map(o=><SelectItem key={o} value={o}>Option {o}</SelectItem>)}</SelectContent></Select></div>
            </>}
            {form.questionType === "FILL_BLANK" && <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Input value={form.correctAnswer} onChange={e=>setForm({...form,correctAnswer:e.target.value})} required /></div>}
            {form.questionType === "MATCH" && <div><label className="text-sm font-medium mb-1 block">Match Pairs (JSON) *</label><Textarea value={form.matchPairs} onChange={e=>setForm({...form,matchPairs:e.target.value})} placeholder={'[{"left":"A","right":"B"}]'} rows={4} required /></div>}
            <div><label className="text-sm font-medium mb-1 block">Explanation</label><Textarea value={form.explanation} onChange={e=>setForm({...form,explanation:e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Difficulty</label><Select value={form.difficulty} onValueChange={v=>setForm({...form,difficulty:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTY_OPTIONS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium mb-1 block">Marks</label><Input value={form.marks} onChange={e=>setForm({...form,marks:e.target.value})} type="number" /></div>
              <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input value={form.sequence} onChange={e=>setForm({...form,sequence:parseInt(e.target.value)||1})} type="number" min="1" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{saving ? "Saving..." : editItem ? "Update" : "Add"}</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CHAPTER CHECKPOINT — Test only (no topic/chapter flow, just questions)
   ═══════════════════════════════════════════════════ */
function ChapterCheckpointFlow() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ text: "", questionType: "MCQ", featureType: "chapter_checkpoint", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: "", classId: "", chapterId: "" });
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [r, s, c, ch] = await Promise.all([getQuestions({ featureType: "chapter_checkpoint" }), getSubjects(), getClasses(), getChapters()]);
      setQuestions(r?.data || []); setSubjects(s?.data || []); setClasses(c?.data || []); setChapters(ch?.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ text: "", questionType: "MCQ", featureType: "chapter_checkpoint", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1, subjectId: "", classId: "", chapterId: "" }); setIsOpen(true); };
  const openEdit = (q) => { setEditItem(q); setForm({ text: q.text, questionType: q.questionType || "MCQ", featureType: "chapter_checkpoint", optionA: q.optionA || "", optionB: q.optionB || "", optionC: q.optionC || "", optionD: q.optionD || "", correctOption: q.correctOption || "", correctAnswer: q.correctAnswer || "", matchPairs: q.matchPairs || "", explanation: q.explanation || "", difficulty: q.difficulty || "MEDIUM", marks: q.marks || "4", sequence: q.sequence || 1, subjectId: q.subjectId || "", classId: q.classId || "", chapterId: q.chapterId || "" }); setIsOpen(true); };
  const onClose = () => { setIsOpen(false); setEditItem(null); };
  const onSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, marks: String(form.marks), sequence: Number(form.sequence), explanation: form.explanation || undefined };
      if (editItem) { await updateQuestion(editItem.id, payload); showSuccess("Updated"); } else { await createQuestion(payload); showSuccess("Added"); }
      onClose(); load();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };
  const onDelete = async (q) => { if (!confirm("Delete?")) return; try { await deleteQuestion(q.id); showSuccess("Deleted"); load(); } catch (e) { showError("Failed"); } };

  const typeLabel = { MCQ: "MCQ", FILL_BLANK: "Fill in Blank", MATCH: "Match the Following" };
  const diffColor = { EASY: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700", HARD: "bg-red-100 text-red-700" };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Chapter Checkpoint — Test Questions</h1><p className="text-sm text-muted-foreground">{questions.length} questions</p></div>
        <Button onClick={openAdd} className="bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4 mr-2" />Add Test Question</Button>
      </div>

      {loading ? <Loader /> : questions.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No test questions yet. Click <strong>Add Test Question</strong> to start.</p></Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-2">{q.text}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{typeLabel[q.questionType] || q.questionType}</Badge>
                      <Badge className={`${diffColor[q.difficulty] || ""} text-xs`}>{q.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} marks</span>
                      {q.Subject && <span className="text-xs text-muted-foreground">{q.Subject.name}</span>}
                      {q.Chapter && <span className="text-xs text-muted-foreground">{q.Chapter.name}</span>}
                    </div>
                    {(!q.questionType || q.questionType === "MCQ") && <div className="grid grid-cols-2 gap-1.5 mb-2">{["A","B","C","D"].map(l => q[`option${l}`] ? <div key={l} className={`px-3 py-1.5 rounded-lg text-sm ${q.correctOption===l?"bg-green-50 border border-green-200 text-green-800 font-medium":"bg-muted/40 text-muted-foreground"}`}><span className="font-bold">{l}.</span> {q[`option${l}`]}</div> : null)}</div>}
                    {q.questionType === "FILL_BLANK" && q.correctAnswer && <div className="px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800 font-medium mb-2">Answer: {q.correctAnswer}</div>}
                    {q.questionType === "MATCH" && q.matchPairs && <div className="grid grid-cols-2 gap-1.5 mb-2">{(()=>{try{return JSON.parse(q.matchPairs)}catch{return[]}})().map((p,i)=><div key={i} className="px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200"><span className="text-blue-800">{p.left} ↔ {p.right}</span></div>)}</div>}
                    {q.explanation && <p className="text-xs text-muted-foreground italic border-l-2 border-red-300 pl-3 mt-2">{q.explanation}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => onDelete(q)} className="p-1.5 rounded hover:bg-red-50"><Trash className="h-4 w-4 text-red-500" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} Test Question</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div><label className="text-sm font-medium">Question Type *</label>
              <div className="flex gap-2 mt-1">{QUESTION_TYPES.map(t => <button key={t} type="button" onClick={() => setForm({...form, questionType: t})} className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold border-2 transition-all ${form.questionType===t?"border-red-600 bg-red-600 text-white":"border-muted bg-muted/30 text-muted-foreground hover:border-red-300"}`}>{t==="MCQ"?"MCQ":t==="FILL_BLANK"?"Fill in Blank":"Match"}</button>)}</div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Question *</label><Textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={3} required /></div>
            {form.questionType === "MCQ" && <>
              {["A","B","C","D"].map(l=><div key={l}><label className="text-sm font-medium mb-1 block">Option {l}</label><Input value={form[`option${l}`]} onChange={e=>setForm({...form,[`option${l}`]:e.target.value})} required /></div>)}
              <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Select value={form.correctOption} onValueChange={v=>setForm({...form,correctOption:v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CORRECT_OPTIONS.map(o=><SelectItem key={o} value={o}>Option {o}</SelectItem>)}</SelectContent></Select></div>
            </>}
            {form.questionType === "FILL_BLANK" && <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Input value={form.correctAnswer} onChange={e=>setForm({...form,correctAnswer:e.target.value})} required /></div>}
            {form.questionType === "MATCH" && <div><label className="text-sm font-medium mb-1 block">Match Pairs (JSON) *</label><Textarea value={form.matchPairs} onChange={e=>setForm({...form,matchPairs:e.target.value})} placeholder={'[{"left":"A","right":"B"}]'} rows={4} required /></div>}
            <div><label className="text-sm font-medium mb-1 block">Explanation</label><Textarea value={form.explanation} onChange={e=>setForm({...form,explanation:e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Difficulty</label><Select value={form.difficulty} onValueChange={v=>setForm({...form,difficulty:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTY_OPTIONS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium mb-1 block">Marks</label><Input value={form.marks} onChange={e=>setForm({...form,marks:e.target.value})} type="number" /></div>
              <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input value={form.sequence} onChange={e=>setForm({...form,sequence:parseInt(e.target.value)||1})} type="number" min="1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium mb-1 block">Subject *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Class *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Chapter *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} required><option value="">Select</option>{chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700">{saving ? "Saving..." : editItem ? "Update" : "Add Test Question"}</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ROUTER — picks the right flow based on ?type=
   ═══════════════════════════════════════════════════ */
function FeatureContentInner() {
  const searchParams = useSearchParams();
  const featureType = searchParams.get("type") || "explanation";
  const label = LABELS[featureType] || featureType;

  if (featureType === "hidden_links") return <HiddenLinksFlow />;
  if (featureType === "revision_recall") return <RevisionRecallFlow />;
  if (featureType === "exercise_revival") return <FiveSectionFlow title="Exercise Revival" prefix="exercise_revival" accentColor="emerald" />;
  if (featureType === "master_exemplar") return <FiveSectionFlow title="Master Exemplar" prefix="master_exemplar" accentColor="amber" />;
  if (featureType === "pyq") return <FiveSectionFlow title="PYQs" prefix="pyq" accentColor="blue" />;
  if (featureType === "chapter_checkpoint") return <ChapterCheckpointFlow />;
  return <GenericFlow featureType={featureType} label={label} />;
}

export default function FeatureContentPage() {
  return <Suspense fallback={<Loader />}><FeatureContentInner /></Suspense>;
}
