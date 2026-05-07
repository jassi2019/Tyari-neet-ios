"use client";

import { useState, useRef } from "react";
import { uploadPDF } from "@/services/upload";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, ExternalLink } from "lucide-react";

export default function PDFUpload({ onUploadComplete, currentUrl, label = "Upload PDF" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const result = await uploadPDF(file);
      if (result?.data?.url) {
        onUploadComplete(result.data.url);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>

      {/* Current URL display */}
      {currentUrl && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 truncate flex-1">{currentUrl}</span>
          <a href={currentUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 text-green-600 hover:text-green-800" />
          </a>
          <button onClick={() => onUploadComplete("")} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a PDF here, or <span className="text-primary font-medium">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground">PDF only, max 50MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
