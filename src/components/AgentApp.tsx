'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Renderer } from '@openuidev/react-lang';
import { openuiLibrary } from '@openuidev/react-ui';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { init, generateUIStream } from '../lib/llmClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing model…');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    init((text) => setLoadingStatus(text))
      .then(() => {
        setIsModelLoading(false);
        setLoadingStatus('');
      })
      .catch((err: unknown) => {
        setLoadingStatus(
          `Failed to load model: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStream]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const prompt = input.trim();
      if (!prompt || isModelLoading || isGenerating) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsGenerating(true);
      setCurrentStream('');

      let accumulated = '';

      try {
        await generateUIStream(prompt, (chunk) => {
          accumulated += chunk;
          setCurrentStream(accumulated);
        });

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setCurrentStream('');
        setIsGenerating(false);
        inputRef.current?.focus();
      }
    },
    [input, isModelLoading, isGenerating],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const isDisabled = isModelLoading || isGenerating;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
          <Bot size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none">
            In-Browser Generative UI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Powered by WebGPU · Runs 100% in your browser
          </p>
        </div>
      </header>

      {/* Model loading banner */}
      {isModelLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span className="truncate">{loadingStatus}</span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !isModelLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-slate-400">
            <Bot size={48} className="text-indigo-300" />
            <div>
              <p className="text-lg font-medium text-slate-600">
                Ready to generate UI
              </p>
              <p className="text-sm mt-1">
                Try: "Create a login form" or "Build a pricing card"
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {message.role === 'user' ? (
                <User size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
            <div
              className={`max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}
            >
              {message.role === 'user' ? (
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {message.content}
                </div>
              ) : (
                <div className="bg-white rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm p-4 w-full">
                  <Renderer
                    response={message.content}
                    library={openuiLibrary}
                    isStreaming={false}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Active streaming response */}
        {isGenerating && currentStream && (
          <div className="flex gap-3 flex-row">
            <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 bg-slate-200 text-slate-600">
              <Bot size={14} />
            </div>
            <div className="max-w-[85%] flex flex-col items-start">
              <div className="bg-white rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm p-4 w-full">
                <Renderer
                  response={currentStream}
                  library={openuiLibrary}
                  isStreaming={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Generating indicator (no output yet) */}
        {isGenerating && !currentStream && (
          <div className="flex gap-3 flex-row">
            <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 bg-slate-200 text-slate-600">
              <Bot size={14} />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isModelLoading
                ? 'Loading model…'
                : 'Ask me to create a UI component…'
            }
            disabled={isDisabled}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
          <button
            type="submit"
            disabled={isDisabled || !input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
            aria-label="Send message"
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-2">
          Runs entirely in your browser · No data sent to any server
        </p>
      </div>
    </div>
  );
}
