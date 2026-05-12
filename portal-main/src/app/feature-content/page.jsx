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
import { Plus, Pencil, Trash, Eye, EyeOff } from "lucide-react";

const LABELS = { explanation: "Explanation", revision_recall: "Revision Recall", hidden_links: "Hidden Links", exercise_revival: "Exercise Revival", master_exemplar: "Master Exemplar", pyq: "PYQs", chapter_checkpoint: "Chapter Checkpoint" };
const EMPTY = { title: "", description: "", contentURL: "", featureType: "", serviceType: "FREE", sequence: 1, isActive: true, chapterId: "", subjectId: "", classId: "" };

const QUESTION_TYPES = ["MCQ", "FILL_BLANK", "MATCH"];
const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
const CORRECT_OPTIONS = ["A", "B", "C", "D"];

function FeatureContentInner() {
  const searchParams = useSearchParams();
  const featureType = searchParams.get("type") || "explanation";
  const isRevisionRecall = featureType === "revision_recall";
  const label = LABELS[featureType] || featureType;

  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  // Form state — supports both content and question fields
  const [form, setForm] = useState({
    ...EMPTY,
    // Question fields for revision_recall
    text: "", questionType: "MCQ", optionA: "", optionB: "", optionC: "", optionD: "",
    correctOption: "", correctAnswer: "", matchPairs: "", explanation: "",
    difficulty: "MEDIUM", marks: "4",
  });

  const load = async () => {
    setLoading(true);
    try {
      if (isRevisionRecall) {
        const r = await getQuestions({ featureType: "revision_recall" });
        setItems(r?.data || []);
      } else {
        const r = await getFeatureContents(featureType);
        setItems(r?.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadMeta = async () => {
    try {
      const [s, c, ch] = await Promise.all([getSubjects(), getClasses(), getChapters()]);
      setSubjects(s?.data || []); setClasses(c?.data || []); setChapters(ch?.data || []);
    } catch (e) {}
  };

  useEffect(() => { load(); }, [featureType]);
  useEffect(() => { loadMeta(); }, []);

  const openAdd = () => {
    setEditItem(null);
    if (isRevisionRecall) {
      setForm({ ...EMPTY, featureType, text: "", questionType: "MCQ", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "", correctAnswer: "", matchPairs: "", explanation: "", difficulty: "MEDIUM", marks: "4", sequence: 1 });
    } else {
      setForm({ ...EMPTY, featureType });
    }
    setIsOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (isRevisionRecall) {
      setForm({
        ...EMPTY, featureType,
        text: item.text || "", questionType: item.questionType || "MCQ",
        optionA: item.optionA || "", optionB: item.optionB || "", optionC: item.optionC || "", optionD: item.optionD || "",
        correctOption: item.correctOption || "", correctAnswer: item.correctAnswer || "", matchPairs: item.matchPairs || "",
        explanation: item.explanation || "", difficulty: item.difficulty || "MEDIUM", marks: item.marks || "4",
        sequence: item.sequence || 1, subjectId: item.subjectId || "", classId: item.classId || "", chapterId: item.chapterId || "",
      });
    } else {
      setForm({ title: item.title, description: item.description || "", contentURL: item.contentURL || "", featureType: item.featureType, serviceType: item.serviceType, sequence: item.sequence, isActive: item.isActive, chapterId: item.chapterId, subjectId: item.subjectId, classId: item.classId });
    }
    setIsOpen(true);
  };

  const onClose = () => { setIsOpen(false); setEditItem(null); };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isRevisionRecall) {
        const payload = { text: form.text, questionType: form.questionType, featureType: "revision_recall", optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD, correctOption: form.correctOption, correctAnswer: form.correctAnswer, matchPairs: form.matchPairs, explanation: form.explanation || undefined, difficulty: form.difficulty, marks: String(form.marks), sequence: Number(form.sequence), subjectId: form.subjectId, classId: form.classId, chapterId: form.chapterId };
        if (editItem) { await updateQuestion(editItem.id, payload); } else { await createQuestion(payload); }
      } else {
        if (!form.title || !form.chapterId || !form.subjectId || !form.classId) { showError("Fill required fields"); setSaving(false); return; }
        if (editItem) { await updateFeatureContent(editItem.id, form); } else { await createFeatureContent(form); }
      }
      showSuccess(editItem ? "Updated" : "Created"); onClose(); load();
    } catch (e) { showError("Failed"); } finally { setSaving(false); }
  };

  const onDelete = async (item) => {
    if (!confirm("Delete this?")) return;
    try {
      if (isRevisionRecall) { await deleteQuestion(item.id); } else { await deleteFeatureContent(item.id); }
      showSuccess("Deleted"); load();
    } catch (e) { showError("Failed"); }
  };

  const onToggle = async (item) => {
    if (isRevisionRecall) return; // questions don't have isActive
    try { await updateFeatureContent(item.id, { isActive: !item.isActive }); load(); } catch (e) { showError("Failed"); }
  };

  const typeLabel = { MCQ: "MCQ", FILL_BLANK: "Fill in Blank", MATCH: "Match the Following" };
  const diffColor = { EASY: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700", HARD: "bg-red-100 text-red-700" };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">{label} Content</h1><p className="text-sm text-muted-foreground">{items.length} items</p></div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add {isRevisionRecall ? "Question" : "Content"}</Button>
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No {label} content yet. Click Add {isRevisionRecall ? "Question" : "Content"} to start.</p></Card>
      ) : isRevisionRecall ? (
        /* ── Question Cards ── */
        <div className="space-y-4">
          {items.map((q, idx) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-snug mb-2">{q.text}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">{typeLabel[q.questionType] || q.questionType}</Badge>
                      <Badge className={`${diffColor[q.difficulty] || ""} text-xs`}>{q.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">{q.marks} marks</span>
                    </div>
                    {(!q.questionType || q.questionType === "MCQ") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                        {["A", "B", "C", "D"].map((letter) => q[`option${letter}`] ? (
                          <div key={letter} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${q.correctOption === letter ? "bg-green-50 border border-green-200 text-green-800 font-medium" : "bg-muted/40 text-muted-foreground"}`}>
                            <span className="font-bold w-4">{letter}.</span>{q[`option${letter}`]}{q.correctOption === letter && <span className="ml-auto text-green-600">&#10003;</span>}
                          </div>
                        ) : null)}
                      </div>
                    )}
                    {q.questionType === "FILL_BLANK" && q.correctAnswer && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800 font-medium mb-2">
                        <span className="font-bold">Answer:</span> {q.correctAnswer}
                      </div>
                    )}
                    {q.questionType === "MATCH" && q.matchPairs && (
                      <div className="mb-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(() => { try { return JSON.parse(q.matchPairs || "[]"); } catch { return []; } })().map((pair, pi) => (
                            <div key={pi} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200">
                              <span className="font-medium text-blue-800">{pair.left}</span><span className="text-muted-foreground">&#8596;</span><span className="font-medium text-blue-800">{pair.right}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {q.explanation && <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">{q.explanation}</p>}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{q.Subject?.name}</span><span>{q.Chapter?.name}</span><span>{q.Class?.name}</span>
                    </div>
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
      ) : (
        /* ── Content Cards (default) ── */
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

      {/* ── ADD / EDIT DIALOG ── */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit" : "Add"} {isRevisionRecall ? "Question" : `${label} Content`}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">

            {isRevisionRecall ? (
              <>
                {/* ── Question Type Toggle ── */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question Type *</label>
                  <div className="flex gap-2">
                    {QUESTION_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => setForm({ ...form, questionType: t })}
                        className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold border-2 transition-all ${form.questionType === t ? "border-amber-600 bg-amber-600 text-white shadow-sm" : "border-muted bg-muted/30 text-muted-foreground hover:border-amber-300"}`}>
                        {t === "MCQ" ? "MCQ" : t === "FILL_BLANK" ? "Fill in Blank" : "Match"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Text */}
                <div><label className="text-sm font-medium mb-1 block">Question *</label><Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Enter the question..." rows={3} required /></div>

                {/* MCQ Options */}
                {form.questionType === "MCQ" && (
                  <>
                    {["A", "B", "C", "D"].map((letter) => (
                      <div key={letter}><label className="text-sm font-medium mb-1 block">Option {letter}</label><Input value={form[`option${letter}`]} onChange={(e) => setForm({ ...form, [`option${letter}`]: e.target.value })} placeholder={`Option ${letter}`} required /></div>
                    ))}
                    <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label>
                      <Select value={form.correctOption} onValueChange={(v) => setForm({ ...form, correctOption: v })}>
                        <SelectTrigger><SelectValue placeholder="Select correct option" /></SelectTrigger>
                        <SelectContent>{CORRECT_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>Option {opt}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Fill in Blank */}
                {form.questionType === "FILL_BLANK" && (
                  <div><label className="text-sm font-medium mb-1 block">Correct Answer *</label><Input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} placeholder="Type the correct answer" required /><p className="text-xs text-muted-foreground mt-1">Case-insensitive matching.</p></div>
                )}

                {/* Match the Following */}
                {form.questionType === "MATCH" && (
                  <div><label className="text-sm font-medium mb-1 block">Match Pairs * (JSON)</label><Textarea value={form.matchPairs} onChange={(e) => setForm({ ...form, matchPairs: e.target.value })} placeholder={'[{"left":"Cell","right":"Basic unit"},{"left":"DNA","right":"Genetic material"}]'} rows={4} required /><p className="text-xs text-muted-foreground mt-1">JSON array with &quot;left&quot; and &quot;right&quot; keys.</p></div>
                )}

                {/* Explanation */}
                <div><label className="text-sm font-medium mb-1 block">Explanation</label><Textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Explain why..." rows={2} /></div>

                {/* Difficulty, Marks, Sequence */}
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-sm font-medium mb-1 block">Difficulty</label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DIFFICULTY_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">Marks</label><Input value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} type="number" /></div>
                  <div><label className="text-sm font-medium mb-1 block">Sequence</label><Input value={form.sequence} onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 1 })} type="number" min="1" /></div>
                </div>

                {/* Subject, Class, Chapter */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium mb-1 block">Subject *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label className="text-sm font-medium mb-1 block">Class *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="text-sm font-medium mb-1 block">Chapter *</label><select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value })} required><option value="">Select</option>{chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
              </>
            ) : (
              <>
                {/* ── Default Content Form ── */}
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
              </>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FeatureContentPage() {
  return <Suspense fallback={<Loader />}><FeatureContentInner /></Suspense>;
}
