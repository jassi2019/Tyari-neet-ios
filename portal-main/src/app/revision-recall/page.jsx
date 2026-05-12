"use client";

import { useEffect, useState } from "react";
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/questions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import {
  Plus,
  Pencil,
  Trash,
  Brain,
  ChevronRight,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

const QUESTION_TYPES = ["MCQ", "FILL_BLANK", "MATCH"];
const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
const CORRECT_OPTIONS = ["A", "B", "C", "D"];

const EMPTY_FORM = {
  text: "",
  questionType: "MCQ",
  featureType: "revision_recall",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "",
  correctAnswer: "",
  matchPairs: "",
  explanation: "",
  difficulty: "MEDIUM",
  marks: "4",
  sequence: 1,
  subjectId: "",
  classId: "",
  chapterId: "",
};

export default function RevisionRecallPage() {
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
  const [form, setForm] = useState({ ...EMPTY_FORM });
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

  // Load questions when chapter selected
  const loadQuestions = async () => {
    if (!selectedChapter) return;
    setQuestionsLoading(true);
    try {
      const r = await getQuestions({
        featureType: "revision_recall",
        chapterId: selectedChapter.id,
      });
      setQuestions(r?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChapter) loadQuestions();
  }, [selectedChapter]);

  // Navigation
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
    setStep("questions");
  };

  const goBack = () => {
    if (step === "questions") {
      setSelectedChapter(null);
      setQuestions([]);
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
      ...EMPTY_FORM,
      subjectId: selectedSubject?.id || "",
      classId: selectedClass?.id || "",
      chapterId: selectedChapter?.id || "",
    });
    setIsOpen(true);
  };

  const openEdit = (q) => {
    setEditItem(q);
    setForm({
      text: q.text,
      questionType: q.questionType || "MCQ",
      featureType: "revision_recall",
      optionA: q.optionA || "",
      optionB: q.optionB || "",
      optionC: q.optionC || "",
      optionD: q.optionD || "",
      correctOption: q.correctOption || "",
      correctAnswer: q.correctAnswer || "",
      matchPairs: q.matchPairs || "",
      explanation: q.explanation || "",
      difficulty: q.difficulty || "MEDIUM",
      marks: q.marks || "4",
      sequence: q.sequence || 1,
      subjectId: q.subjectId,
      classId: q.classId,
      chapterId: q.chapterId,
    });
    setIsOpen(true);
  };

  const onClose = () => {
    setIsOpen(false);
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        marks: String(form.marks),
        sequence: Number(form.sequence),
        explanation: form.explanation || undefined,
      };
      if (editItem) {
        await updateQuestion(editItem.id, payload);
        showSuccess("Question updated");
      } else {
        await createQuestion(payload);
        showSuccess("Question added");
      }
      onClose();
      loadQuestions();
    } catch (e) {
      showError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (q) => {
    if (!confirm(`Delete this question?\n\n"${q.text.slice(0, 80)}..."`)) return;
    try {
      await deleteQuestion(q.id);
      showSuccess("Deleted");
      loadQuestions();
    } catch (e) {
      showError("Failed to delete");
    }
  };

  // Breadcrumb
  const breadcrumb = () => {
    const parts = ["Revision Recall"];
    if (selectedSubject) parts.push(selectedSubject.name);
    if (selectedClass) parts.push(selectedClass.name);
    if (selectedChapter) parts.push(selectedChapter.name);
    return parts;
  };

  const diffColor = {
    EASY: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HARD: "bg-red-100 text-red-700",
  };

  const typeLabel = {
    MCQ: "MCQ",
    FILL_BLANK: "Fill in Blank",
    MATCH: "Match the Following",
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
                <span
                  className={
                    i === breadcrumb().length - 1
                      ? "text-foreground font-semibold"
                      : ""
                  }
                >
                  {part}
                </span>
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-amber-600" />
            {step === "subject" && "Select Subject"}
            {step === "chapter" && "Select Chapter"}
            {step === "questions" &&
              `Questions — ${selectedChapter?.name}`}
          </h1>
        </div>
        {step === "questions" && (
          <Button
            onClick={openAdd}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        )}
      </div>

      {/* SUBJECT STEP */}
      {step === "subject" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => (
            <Card
              key={sub.id}
              className="cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
              onClick={() => handleSubjectClick(sub)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                  🧠
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{sub.name}</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {subjects.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              No subjects found.
            </p>
          )}
        </div>
      )}

      {/* CLASS MODAL */}
      <Dialog
        open={showClassModal}
        onOpenChange={() => setShowClassModal(false)}
      >
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
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-amber-300 hover:bg-amber-50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {cls.name?.replace(/[^0-9]/g, "") || "•"}
                  </span>
                </div>
                <span className="font-semibold flex-1">{cls.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CHAPTER STEP */}
      {step === "chapter" &&
        (loading ? (
          <Loader />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((ch) => (
              <Card
                key={ch.id}
                className="cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
                onClick={() => handleChapterClick(ch)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
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
        ))}

      {/* QUESTIONS STEP */}
      {step === "questions" &&
        (questionsLoading ? (
          <Loader />
        ) : questions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-muted-foreground">
              No questions yet. Click <strong>Add Question</strong> to
              create MCQ, Fill in Blank, or Match the Following questions.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base leading-snug mb-2">
                        {q.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                          {typeLabel[q.questionType] || q.questionType}
                        </Badge>
                        <Badge
                          className={`${diffColor[q.difficulty]} hover:${diffColor[q.difficulty]} text-xs`}
                        >
                          {q.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {q.marks} marks
                        </span>
                      </div>

                      {/* MCQ options */}
                      {(!q.questionType || q.questionType === "MCQ") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {["A", "B", "C", "D"].map((letter) =>
                            q[`option${letter}`] ? (
                              <div
                                key={letter}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                  q.correctOption === letter
                                    ? "bg-green-50 border border-green-200 text-green-800 font-medium"
                                    : "bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                <span className="font-bold w-4">
                                  {letter}.
                                </span>
                                {q[`option${letter}`]}
                                {q.correctOption === letter && (
                                  <span className="ml-auto text-green-600">
                                    ✓
                                  </span>
                                )}
                              </div>
                            ) : null
                          )}
                        </div>
                      )}

                      {/* Fill in blank answer */}
                      {q.questionType === "FILL_BLANK" && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800 font-medium mb-2">
                          <span className="font-bold">✓ Answer:</span>{" "}
                          {q.correctAnswer}
                        </div>
                      )}

                      {/* Match pairs */}
                      {q.questionType === "MATCH" && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Match Pairs:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {(() => {
                              try {
                                return JSON.parse(q.matchPairs || "[]");
                              } catch {
                                return [];
                              }
                            })().map((pair, pi) => (
                              <div
                                key={pi}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-blue-50 border border-blue-200"
                              >
                                <span className="font-medium text-blue-800">
                                  {pair.left}
                                </span>
                                <span className="text-muted-foreground">↔</span>
                                <span className="font-medium text-blue-800">
                                  {pair.right}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-amber-300 pl-3 mt-2">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(q)}
                        className="p-1.5 rounded hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => onDelete(q)}
                        className="p-1.5 rounded hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </button>
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
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit" : "Add"} Question
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            {/* Question Type - 3 toggle buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Type *</label>
              <div className="flex gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, questionType: t })
                    }
                    className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold border-2 transition-all ${
                      form.questionType === t
                        ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                        : "border-muted bg-muted/30 text-muted-foreground hover:border-amber-300"
                    }`}
                  >
                    {t === "MCQ"
                      ? "MCQ"
                      : t === "FILL_BLANK"
                      ? "Fill in Blank"
                      : "Match"}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Text *</label>
              <Textarea
                value={form.text}
                onChange={(e) =>
                  setForm({ ...form, text: e.target.value })
                }
                placeholder="Enter the question..."
                className="resize-none"
                rows={3}
                required
              />
            </div>

            {/* MCQ Options */}
            {form.questionType === "MCQ" && (
              <>
                {["A", "B", "C", "D"].map((letter) => (
                  <div key={letter} className="space-y-1">
                    <label className="text-sm font-medium">
                      Option {letter}
                    </label>
                    <Input
                      value={form[`option${letter}`]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [`option${letter}`]: e.target.value,
                        })
                      }
                      placeholder={`Enter option ${letter}`}
                      required
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Correct Answer *
                  </label>
                  <Select
                    value={form.correctOption}
                    onValueChange={(v) =>
                      setForm({ ...form, correctOption: v })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          Option {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Fill in the Blank */}
            {form.questionType === "FILL_BLANK" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Correct Answer *
                </label>
                <Input
                  value={form.correctAnswer}
                  onChange={(e) =>
                    setForm({ ...form, correctAnswer: e.target.value })
                  }
                  placeholder="Type the correct answer"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Student will type this answer. Case-insensitive matching.
                </p>
              </div>
            )}

            {/* Match the Following */}
            {form.questionType === "MATCH" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Match Pairs * (JSON)
                </label>
                <Textarea
                  value={form.matchPairs}
                  onChange={(e) =>
                    setForm({ ...form, matchPairs: e.target.value })
                  }
                  placeholder={
                    '[{"left":"Cell","right":"Basic unit of life"},{"left":"DNA","right":"Genetic material"}]'
                  }
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  JSON array of objects with &quot;left&quot; and &quot;right&quot; keys.
                </p>
              </div>
            )}

            {/* Difficulty + Marks */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Difficulty</label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) =>
                    setForm({ ...form, difficulty: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Marks</label>
                <Input
                  value={form.marks}
                  onChange={(e) =>
                    setForm({ ...form, marks: e.target.value })
                  }
                  type="number"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Sequence</label>
                <Input
                  value={form.sequence}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sequence: parseInt(e.target.value) || 1,
                    })
                  }
                  type="number"
                  min="1"
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Explanation{" "}
                <span className="text-muted-foreground font-normal">
                  (shown after answering)
                </span>
              </label>
              <Textarea
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
                placeholder="Explain why this answer is correct..."
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={
                  !form.text ||
                  (form.questionType === "MCQ" &&
                    (!form.optionA ||
                      !form.optionB ||
                      !form.correctOption)) ||
                  (form.questionType === "FILL_BLANK" &&
                    !form.correctAnswer) ||
                  (form.questionType === "MATCH" &&
                    !form.matchPairs) ||
                  saving
                }
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {saving
                  ? "Saving..."
                  : editItem
                  ? "Update Question"
                  : "Add Question"}
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
