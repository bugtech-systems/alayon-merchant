"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Database, Link } from "lucide-react";
import { useState, useEffect } from "react";
import {  n8nFetcher, useN8nQuery } from "@/hooks/useN8nQuery";

const TABS = [
  { id: "parameters", label: "Parameters", icon: Settings },
  { id: "context", label: "Context", icon: Database },
  { id: "urls", label: "URLs", icon: Link },
];

export default function AIConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig = null,
}) {
  const { data: modelsData } = useN8nQuery({endpoint: '/webhook/get-models'})
  const [activeTab, setActiveTab] = useState("parameters");
  const [config, setConfig] = useState({
    // Parameters
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    // Context (JSON)
    context: { },
    // URLs
    chatUrl: "",
    feedbackUrl: "",
    regenerationUrl: "",
  });
  const [contextJsonString, setContextJsonString] = useState("");
  const [jsonError, setJsonError] = useState(null);

  const isEditing = !!initialConfig;

  // Load initial config into state
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        model: initialConfig.model ?? "gpt-4",
        temperature: initialConfig.temperature ?? 0.7,
        maxTokens: initialConfig.maxTokens ?? 2048,
        topP: initialConfig.topP ?? 1.0,
        frequencyPenalty: initialConfig.frequencyPenalty ?? 0,
        presencePenalty: initialConfig.presencePenalty ?? 0,
        context: initialConfig.context ?? { },
        chatUrl: initialConfig.chatUrl ?? "",
        feedbackUrl: initialConfig.feedbackUrl ?? "",
        regenerationUrl: initialConfig.regenerationUrl ?? "",
      });
    } else {
      // Reset to defaults when opening for creation
      setConfig({
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
        context: { },
        chatUrl: "",
        feedbackUrl: "",
        regenerationUrl: "",
      });
      setJsonError(null);
    }
  }, [initialConfig, isOpen]);

  // Sync context object ↔ JSON string when context changes
  useEffect(() => {
    setContextJsonString(JSON.stringify(config.context, null, 2));
  }, [config.context]);

  const handleContextChange = (value) => {
    setContextJsonString(value);
    try {
      const parsed = JSON.parse(value);
      setConfig((prev) => ({ ...prev, context: parsed }));
      setJsonError(null);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(contextJsonString);
      setContextJsonString(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      // keep as is, error already shown
    }
  };

  const handleParamChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleUrlChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Final validation – ensure context is valid JSON
    try {
      JSON.parse(contextJsonString);
      onSave(config);
      onClose();
    } catch (err) {
      setJsonError("Invalid JSON in context. Please fix before saving.");
    }
  };

  const handleCancel = () => {
    setActiveTab("parameters");
    setJsonError(null);
    onClose();
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">
                {isEditing ? "Edit AI Configuration" : "Create AI Configuration"}
              </h2>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 px-6 dark:border-zinc-800">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[60vh] overflow-y-auto p-6">
                {/* Parameters Tab */}
                {activeTab === "parameters" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Model</label>
                      <select
                        value={config.model}
                        onChange={(e) => handleParamChange("model", e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        {modelsData.map(a => {
                          return (<option value={a.model_name}>{a.name}</option>)

                        })}
                        
                        <option value="llama3.2:3b">Llama3.2 3b</option>
                        <option value="qwen2.5:7b">Qwen 2.5 7b</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Temperature: {config.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        value={config.temperature}
                        onChange={(e) => handleParamChange("temperature", parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Higher = more creative, lower = more focused.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Max Tokens</label>
                      <input
                        type="number"
                        min="1"
                        max="8192"
                        value={config.maxTokens}
                        onChange={(e) => handleParamChange("maxTokens", parseInt(e.target.value, 10))}
                        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Top P: {config.topP}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={config.topP}
                        onChange={(e) => handleParamChange("topP", parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Nucleus sampling – lower value makes output more focused.
                      </p>
                    </div>

                    {/* <div>
                      <label className="block text-sm font-medium mb-2">Frequency Penalty</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={config.frequencyPenalty}
                        onChange={(e) => handleParamChange("frequencyPenalty", parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Presence Penalty</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={config.presencePenalty}
                        onChange={(e) => handleParamChange("presencePenalty", parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div> */}
                  </div>
                )}

                {/* Context Tab – JSON Editor */}
                {activeTab === "context" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium">Context (JSON)</label>
                      <button
                        type="button"
                        onClick={formatJson}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Pretty‑print
                      </button>
                    </div>
                    <textarea
                      value={contextJsonString}
                      onChange={(e) => handleContextChange(e.target.value)}
                      rows={12}
                      className={`w-full rounded-lg border font-mono text-sm px-4 py-3 outline-none focus:ring-2 resize-y ${
                        jsonError
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-zinc-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700"
                      } dark:bg-zinc-800`}
                      placeholder='{"system": "You are a helpful assistant.", "user": ""}'
                    />
                    {jsonError && (
                      <p className="text-sm text-red-500">Invalid JSON: {jsonError}</p>
                    )}
                    <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <strong>Hint:</strong> The context object is merged with the chat request. Standard fields like
                      <code className="mx-1 rounded bg-zinc-200 px-1 dark:bg-zinc-700">system</code> and{" "}
                      <code className="mx-1 rounded bg-zinc-200 px-1 dark:bg-zinc-700">user</code> are often used.
                    </div>
                  </div>
                )}

                {/* URLs Tab */}
                {activeTab === "urls" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Chat URL</label>
                      <input
                        // type="url"
                        value={config.chatUrl}
                        onChange={(e) => handleUrlChange("chatUrl", e.target.value)}
                        placeholder="https://api.example.com/chat"
                        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Endpoint for sending chat messages.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Feedback URL</label>
                      <input
                        // type="url"
                        value={config.feedbackUrl}
                        onChange={(e) => handleUrlChange("feedbackUrl", e.target.value)}
                        placeholder="https://api.example.com/feedback"
                        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Endpoint for submitting user feedback (thumbs up/down).</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Regeneration URL</label>
                      <input
                        // type="url"
                        value={config.regenerationUrl}
                        onChange={(e) => handleUrlChange("regenerationUrl", e.target.value)}
                        placeholder="https://api.example.com/regenerate"
                        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Endpoint for requesting a new response.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!jsonError}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  {isEditing ? "Update Configuration" : "Save Configuration"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}