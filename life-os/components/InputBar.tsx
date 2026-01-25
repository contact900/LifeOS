"use client";

import { useState, useRef } from "react";
import { Mic, Image as ImageIcon, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputBarProps {
  onSend: (message: string, attachments?: { type: "image"; data: string }[]) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, disabled = false }: InputBarProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Web Speech API
  const initializeSpeechRecognition = () => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      alert(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return recognition;
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = initializeSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      } else if (file.name.endsWith(".csv")) {
        // Handle CSV file (placeholder for future P&L parsing)
        alert("CSV parsing feature coming soon!");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      } else if (file.name.endsWith(".csv")) {
        alert("CSV parsing feature coming soon!");
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() && !imagePreview) return;

    const attachments = imagePreview
      ? [{ type: "image" as const, data: imagePreview }]
      : undefined;

    onSend(input.trim(), attachments);
    setInput("");
    setImagePreview(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Image Preview */}
      {imagePreview && (
        <div className="relative inline-block rounded-lg border p-2">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-32 w-auto rounded object-contain"
          />
          <button
            onClick={() => setImagePreview(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Input Container */}
      <div
        className={cn(
          "relative flex w-full items-end gap-2 rounded-lg border bg-background p-2 transition-colors",
          isDragOver && "border-primary bg-muted"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (or drag & drop image/CSV)"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          rows={1}
          disabled={disabled}
        />

        <div className="flex items-center gap-1">
          {/* Voice Mode Button */}
          <button
            onClick={handleVoiceClick}
            disabled={disabled}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-muted",
              isRecording && "bg-red-500 text-white hover:bg-red-600"
            )}
            title="Voice input"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Vision Mode Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
            title="Upload image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          {/* CSV Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-lg p-2 transition-colors hover:bg-muted"
            title="Upload CSV"
          >
            <FileText className="h-5 w-5" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && !imagePreview)}
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mode Indicators */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {isRecording && (
          <span className="flex items-center gap-1 text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording...
          </span>
        )}
      </div>
    </div>
  );
}

