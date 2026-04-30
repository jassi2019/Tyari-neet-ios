"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash,
  HelpCircle,
  BookOpen,
  GraduationCap,
  BookType,
  Filter,
} from "lucide-react";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/questions";
import { getSubjects } from "@/services/subject";
import { getClasses } from "@/services/class";
import { getChapters } from "@/services/chapter";

const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
const CORRECT_OPTIONS = ["A", "B", "C", "D"];

const emptyForm = {
  text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "",
  explanation: "",
  difficulty: "MEDIUM",
  marks: "4",
  sequence: 1,
  subjectId: "",
  classId: "",
  chapterId: "",
};

export default function QuestionsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Filter state
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterChapterId, setFilterChapterId] = useState("");

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const filteredChapters = chapters.filter(
    (ch) =>
      (!filterSubjectId || ch.subjectId === filterSubjectId) &&
      (!filterClassId || ch.classId === filterClassId)
  );

  const formChapters = chapters.filter(
    (ch) =>
      (!formData.subjectId || ch.subjectId === formData.subjectId) &&
      (!formData.classId || ch.classId === formData.classId)
  );

  const loadMeta = async () => {
    const [{ data: subs }, { data: cls }, { data: chs }] = await Promise.all([
      getSubjects(),
      getClasses(),
      getChapters(),
    ]);
    setSubjects(subs);
    setClasses(cls);
    setChapters(chs);
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (filterSubjectId) params.subjectId = filterSubjectId;
      if (filterClassId) params.classId = filterClassId;
      if (filterChapterId) params.chapterId = filterChapterId;
      const { data } = await getQuestions(params);
      setQuestions(data);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta().catch(showError);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filterSubjectId, filterClassId, filterChapterId]);

  const getName = (list, id) => list.find((x) => x.id === id)?.name || "—";

  const onAddQuestion = () => {
    setEditingQuestion(null);
    setFormData({
      ...emptyForm,
      subjectId: filterSubjectId,
      classId: filterClassId,
      chapterId: filterChapterId,
    });
    setIsOpen(true);
  };

  const onEditQuestion = (q) => {
    setEditingQuestion(q);
    setFormData({
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation || "",
      difficulty: q.difficulty,
      marks: q.marks,
      sequence: q.sequence,
      subjectId: q.subjectId,
      classId: q.classId,
      chapterId: q.chapterId,
    });
    setIsOpen(true);
  };

  const onDelete = async (q) => {
    if (!confirm(`Delete this question?\n\n"${q.text.slice(0, 80)}..."`)) return;
    try {
      setIsLoading(true);
      await deleteQuestion(q.id);
      await loadQuestions();
      showSuccess("Question deleted successfully");
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onClose = () => {
    setIsOpen(false);
    setEditingQuestion(null);
    setFormData(emptyForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload = {
        ...formData,
        marks: String(formData.marks),
        sequence: Number(formData.sequence),
        explanation: formData.explanation || undefined,
      };
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        showSuccess("Question updated successfully");
      } else {
        await createQuestion(payload);
        showSuccess("Question added successfully");
      }
      await loadQuestions();
      onClose();
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyColor = {
    EASY: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HARD: "bg-red-100 text-red-700",
  };

  if (isLoading && questions.length === 0) return <Loader />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Questions
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage MCQ questions for NEET preparation
              </p>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={onAddQuestion} size="sm" className="shadow-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? "Edit Question" : "Add New Question"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4 mt-4">
                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select
                      value={formData.subjectId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, subjectId: v, chapterId: "" })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class</label>
                    <Select
                      value={formData.classId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, classId: v, chapterId: "" })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chapter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chapter</label>
                    <Select
                      value={formData.chapterId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, chapterId: v })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select chapter" />
                      </SelectTrigger>
                      <SelectContent>
                        {formChapters.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {ch.number}. {ch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Question text */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Question Text</label>
                    <Textarea
                      value={formData.text}
                      onChange={(e) =>
                        setFormData({ ...formData, text: e.target.value })
                      }
                      placeholder="Enter the question..."
                      className="resize-none"
                      rows={3}
                      required
                    />
                  </div>

                  {/* Options */}
                  {["A", "B", "C", "D"].map((letter) => (
                    <div key={letter} className="space-y-2">
                      <label className="text-sm font-medium">
                        Option {letter}
                      </label>
                      <Input
                        value={formData[`option${letter}`]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [`option${letter}`]: e.target.value,
                          })
                        }
                        placeholder={`Enter option ${letter}`}
                        required
                      />
                    </div>
                  ))}

                  {/* Correct option */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Correct Answer</label>
                    <Select
                      value={formData.correctOption}
                      onValueChange={(v) =>
                        setFormData({ ...formData, correctOption: v })
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

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(v) =>
                        setFormData({ ...formData, difficulty: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
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

                  {/* Marks + Sequence row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Marks</label>
                      <Input
                        value={formData.marks}
                        onChange={(e) =>
                          setFormData({ ...formData, marks: e.target.value })
                        }
                        placeholder="4"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sequence</label>
                      <Input
                        value={formData.sequence}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sequence: e.target.value,
                          })
                        }
                        placeholder="1"
                        type="number"
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Explanation{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </label>
                    <Textarea
                      value={formData.explanation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          explanation: e.target.value,
                        })
                      }
                      placeholder="Explain why this answer is correct..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !formData.text ||
                        !formData.optionA ||
                        !formData.optionB ||
                        !formData.optionC ||
                        !formData.optionD ||
                        !formData.correctOption ||
                        !formData.subjectId ||
                        !formData.classId ||
                        !formData.chapterId ||
                        isLoading
                      }
                    >
                      {editingQuestion ? "Update" : "Add"} Question
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={filterSubjectId}
              onValueChange={(v) => {
                setFilterSubjectId(v === "__all__" ? "" : v);
                setFilterChapterId("");
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterClassId}
              onValueChange={(v) => {
                setFilterClassId(v === "__all__" ? "" : v);
                setFilterChapterId("");
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterChapterId}
              onValueChange={(v) =>
                setFilterChapterId(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Chapters</SelectItem>
                {filteredChapters.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.number}. {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterSubjectId || filterClassId || filterChapterId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterSubjectId("");
                  setFilterClassId("");
                  setFilterChapterId("");
                }}
              >
                Clear filters
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="container mx-auto px-4 py-8">
        {isLoading && questions.length === 0 ? (
          <Loader />
        ) : questions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No questions yet</p>
            <p className="text-sm mt-1">
              Select a chapter and click "Add Question" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card
                key={q.id}
                className="group hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs font-bold text-muted-foreground w-6 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {q.text}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[q.difficulty]}`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookType className="w-3 h-3" />
                          {getName(subjects, q.subjectId)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap className="w-3 h-3" />
                          {getName(classes, q.classId)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="w-3 h-3" />
                          {getName(chapters, q.chapterId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {q.marks} marks
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="solid"
                        size="icon"
                        onClick={() => onEditQuestion(q)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="solid"
                        size="icon"
                        onClick={() => onDelete(q)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-9">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                    {["A", "B", "C", "D"].map((letter) => (
                      <div
                        key={letter}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                          q.correctOption === letter
                            ? "bg-green-50 border border-green-200 text-green-800 font-medium"
                            : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold w-4">{letter}.</span>
                        {q[`option${letter}`]}
                        {q.correctOption === letter && (
                          <span className="ml-auto text-green-600">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3 mt-2">
                      {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
