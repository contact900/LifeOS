"use client";

import { useChat } from "@ai-sdk/react";
import { InputBar } from "@/components/InputBar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { messages, isLoading, sendMessage } = useChat({
    api: "/api/chat",
  });

  const handleSend = async (
    message: string,
    attachments?: { type: "image"; data: string }[]
  ) => {
    if (attachments && attachments.length > 0) {
      // For image attachments, we'll send them as base64 in the message
      // The API route will need to handle vision inputs
      const imageMessage = `${message}\n\n[IMAGE:${attachments[0].data}]`;
      await sendMessage({
        text: imageMessage,
      });
    } else {
      await sendMessage({
        text: message,
      });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <h1 className="text-xl font-semibold">LifeOS</h1>
          <p className="ml-4 text-sm text-muted-foreground">
            Your Personal AI Chief of Staff
          </p>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl space-y-6 p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
              <Bot className="h-16 w-16 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Welcome to LifeOS</h2>
                <p className="text-muted-foreground max-w-md">
                  Your personal AI assistant is ready to help. Ask me anything, create tasks,
                  recall memories, or upload images for analysis.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {message.parts?.flatMap((part, partIndex) => {
                    if (part.type === "text") {
                      // Handle text parts - split by newlines and render each line
                      return part.text.split("\n").map((line, i) => {
                        // Check if line contains image data
                        if (line.startsWith("[IMAGE:")) {
                          const base64Data = line.replace("[IMAGE:", "").replace("]", "");
                          return (
                            <img
                              key={`${partIndex}-${i}`}
                              src={base64Data}
                              alt="Uploaded image"
                              className="my-2 max-w-full rounded-lg"
                            />
                          );
                        }
                        return (
                          <p key={`${partIndex}-${i}`} className={cn(i > 0 && "mt-2")}>
                            {line || "\u00A0"}
                          </p>
                        );
                      });
                    }
                    // Handle other part types (tool calls, files, etc.)
                    if (part.type === "tool") {
                      return (
                        <div key={partIndex} className="text-sm text-muted-foreground mt-2">
                          Tool: {"toolName" in part ? part.toolName : "Unknown"}
                        </div>
                      );
                    }
                    if (part.type === "file") {
                      return (
                        <div key={partIndex} className="text-sm text-muted-foreground mt-2">
                          File: {"name" in part ? part.name : "Unknown"}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-4xl p-4">
          <InputBar onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
