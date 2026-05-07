"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
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
  BookOpen,
  BookType,
  GraduationCap,
  IndianRupee,
  ListOrdered,

} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTopic, updateTopic } from "@/services/topics";
import { getChapters } from "@/services/chapter";
import { getSubjects } from "@/services/subject";
import { getClasses } from "@/services/class";
import PDFUpload from "@/components/custom/pdf-upload";
import useToast from "@/hooks/useToast";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Loader from "@/components/custom/loader";

function EditTopicPageInner() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const { topicId } = useParams();
  const searchParams = useSearchParams();
  const featureFromURL = searchParams.get("feature");

  const FEATURE_TABS = [
    { key: "explanationContent", label: "💡 Explanation" },
    { key: "revisionContent", label: "🧠 Revision Recall" },
    { key: "hiddenLinksContent", label: "🔗 Hidden Links" },
    { key: "exerciseRevivalContent", label: "📋 Exercise Revival" },
    { key: "masterExemplarContent", label: "🏆 Master Exemplar" },
    { key: "pyqContent", label: "📖 PYQs" },
    { key: "chapterCheckpointContent", label: "🛡️ Chapter Checkpoint" },
  ];

  const FEATURE_TO_TAB = {
    explanation: "explanationContent",
    revision_recall: "revisionContent",
    hidden_links: "hiddenLinksContent",
    exercise_revival: "exerciseRevivalContent",
    master_exemplar: "masterExemplarContent",
    pyq: "pyqContent",
    chapter_checkpoint: "chapterCheckpointContent",
  };

  const [activeTab, setActiveTab] = useState(
    featureFromURL ? (FEATURE_TO_TAB[featureFromURL] || "explanationContent") : "explanationContent"
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contentId: "",
    contentURL: "",
    contentThumbnail: "",
    explanationContent: "",
    revisionContent: "",
    hiddenLinksContent: "",
    exerciseRevivalContent: "",
    masterExemplarContent: "",
    pyqContent: "",
    chapterCheckpointContent: "",
    subjectId: "",
    chapterId: "",
    classId: "",
    sequence: 1,
    serviceType: "PREMIUM",
  });

  const loadTopic = async () => {
    setIsLoading(true);
    try {
      const { data } = await getTopic(topicId);
      setFormData(data);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitials = async () => {
    setIsLoading(true);
    try {
      const { data: subjectDocs } = await getSubjects();
      const { data: classDocs } = await getClasses();
      const { data: chapterDocs } = await getChapters();

      setSubjects(subjectDocs);
      setClasses(classDocs);
      setChapters(chapterDocs);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDirty()) {
      showError("Please fill all the fields");
      return;
    }
    try {
      setIsLoading(true);
      await updateTopic(topicId, formData);
      showSuccess("Topic updated successfully");
      router.push("/topics");
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = () => {
    if (
      formData.name === "" ||
      formData.description === "" ||
      
      
      formData.subjectId === "" ||
      formData.chapterId === "" ||
      formData.classId === ""
    ) {
      return true;
    }
    return false;
  };


  useEffect(() => {
    loadInitials();
  }, []);

  useEffect(() => {
    if (topicId) {
      loadTopic();
    } else {
      router.push("/topics");
    }
  }, [topicId]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header Section */}
      <div className="border-b bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Edit Topic
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Edit the topic for your NEET preparation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Basic Information</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Topic Name
                        </label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Enter topic name"
                          required
                          className="shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="description"
                          className="text-sm font-medium"
                        >
                          Description
                        </label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter topic description"
                          rows={4}
                          required
                          className="shadow-sm resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="contentURL"
                          className="text-sm font-medium"
                        >
                          Content URL
                        </label>
                        <Input
                          id="contentURL"
                          value={formData.contentURL}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contentURL: e.target.value,
                            })
                          }
                          placeholder="Enter content URL"
                          required
                          className="shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Classification</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <BookType className="w-4 h-4" />
                          Subject
                        </label>
                        <Select
                          value={formData.subjectId?.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              subjectId: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Class
                        </label>
                        <Select
                          value={formData.classId?.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              classId: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Chapter
                        </label>
                        <Select
                          value={formData.chapterId?.toString()}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              chapterId: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue placeholder="Select chapter" />
                          </SelectTrigger>
                          <SelectContent>
                            {chapters.map((chapter) => (
                              <SelectItem key={chapter.id} value={chapter.id}>
                                {chapter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <IndianRupee className="w-4 h-4" />
                          Service Type
                        </label>
                        <Select
                          value={formData.serviceType}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              serviceType: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="PREMIUM" value="PREMIUM">
                              Premium
                            </SelectItem>
                            <SelectItem key="FREE" value="FREE">
                              Free
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <ListOrdered className="w-4 h-4" />
                          Sequence
                        </label>
                        <Input
                          id="sequence"
                          type="number"
                          min="1"
                          value={formData.sequence}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sequence: parseInt(e.target.value),
                            })
                          }
                          placeholder="Enter sequence number"
                          required
                          className="shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Content Editors */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Feature Content</h2>
                    <p className="text-sm text-muted-foreground">
                      Har feature ka content alag add karo — app mein sirf usi feature ka content dikhega.
                    </p>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {FEATURE_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            activeTab === tab.key
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {tab.label}
                          {formData[tab.key] ? " ✓" : ""}
                        </button>
                      ))}
                    </div>

                    {/* Editor for active tab */}
                    {FEATURE_TABS.map((tab) => (
                      <div key={tab.key} className={activeTab === tab.key ? "block" : "hidden"}>
                        <div className="border rounded-lg overflow-hidden">
                          {/* Toolbar */}
                          <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
                            {[
                              { cmd: "bold", label: "B", style: "font-bold" },
                              { cmd: "italic", label: "I", style: "italic" },
                              { cmd: "underline", label: "U", style: "underline" },
                            ].map(({ cmd, label, style }) => (
                              <button
                                key={cmd}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); document.execCommand(cmd, false); }}
                                className={`px-3 py-1 text-sm rounded border border-border hover:bg-muted ${style}`}
                              >{label}</button>
                            ))}
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("formatBlock", false, "h2"); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted font-semibold">H2</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("formatBlock", false, "h3"); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted font-semibold">H3</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertUnorderedList", false); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted">• List</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertOrderedList", false); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted">1. List</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); const url = window.prompt("Image URL:"); if (url) document.execCommand("insertImage", false, url); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted">🖼 Image</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("removeFormat", false); }} className="px-3 py-1 text-sm rounded border border-border hover:bg-muted text-red-500">Clear</button>
                          </div>
                          {/* Editor */}
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setFormData((prev) => ({ ...prev, [tab.key]: e.currentTarget.innerHTML }))}
                            dangerouslySetInnerHTML={{ __html: formData[tab.key] || "" }}
                            className="min-h-[300px] p-4 outline-none prose prose-sm max-w-none dark:prose-invert"
                            style={{ lineHeight: "1.8" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                disabled={isLoading || isDirty()}
                type="submit"
                size="lg"
                className="shadow-lg hover:shadow-primary/25 transition-all"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EditTopicPage() {
  return (
    <Suspense fallback={<div />}>
      <EditTopicPageInner />
    </Suspense>
  );
}
