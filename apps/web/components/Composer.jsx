"use client"

import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { Send, Loader2, Plus, Mic } from "lucide-react"
import ComposerActionsPopover from "./ComposerActionsPopover"
import AIConfigModal from "./AiConfigModal";
import { cls } from "./utils"
import { n8nFetcher } from "@/hooks/useN8nQuery";
import { useMedusaAuth } from "@/providers/MedusaAuthProvider";

const Composer = forwardRef(function Composer({ onSend, busy }, ref) {
    const { user } = useMedusaAuth()
  
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [lineCount, setLineCount] = useState(1)
  const inputRef = useRef(null)

  const handleSession = async () => {
   let session_id = localStorage.getItem('session_id')

   let newSession = await n8nFetcher({endpoint: '/webhook/session', method: "POST", body: {auth_id: user?.id, id: session_id }}).catch(err => console.log(err, "ERR"));
      if(newSession.length){
        let { context, metadata} = newSession[0];
            setCurrentConfig({...currentConfig, context, ...metadata})
      } 
  }


  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current
      const lineHeight = 24
      const minHeight = 24

      textarea.style.height = "auto"
      const scrollHeight = textarea.scrollHeight
      const calculatedLines = Math.max(1, Math.ceil(scrollHeight / lineHeight))

      setLineCount(calculatedLines)

      if (calculatedLines <= 12) {
        textarea.style.height = `${Math.max(minHeight, scrollHeight)}px`
        textarea.style.overflowY = "hidden"
      } else {
        textarea.style.height = `${12 * lineHeight}px`
        textarea.style.overflowY = "auto"
      }
    }
  }, [value])


  useEffect(() => {
      if(isModalOpen){
        handleSession()
      }

  }, [isModalOpen])

  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent) => {
        setValue((prev) => {
          const newValue = prev ? `${prev}\n\n${templateContent}` : templateContent
          setTimeout(() => {
            inputRef.current?.focus()
            const length = newValue.length
            inputRef.current?.setSelectionRange(length, length)
          }, 0)
          return newValue
        })
      },
      focus: () => {
        inputRef.current?.focus()
      },
    }),
    [],
  )

  async function handleSend() {
    if (!value.trim() || sending) return
    setSending(true)
    try {
      await onSend?.(value)
      setValue("")
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  async function handleAction(action) {
    console.log(action, 'SET ACTION')
    if(action.id == 'ai-config'){
     return setIsModalOpen(true);
    }

    setIsModalOpen(false)
  }

  async function handleSaveConfig(e){
       let session_id = localStorage.getItem('session_id')

    let { context, ...metadata } = e;

     let newSession = await n8nFetcher({endpoint: '/webhook/session', method: "PUT", body: {id: session_id, auth_id: user?.id, ...e, context, metadata}}).catch(err => console.log(err, "ERR"));

      console.log(e, context, metadata, 'HANDLE SAVE', newSession)

  }


  const hasContent = value.trim().length > 0

  return (
  <>
    <AIConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConfig}
        initialConfig={currentConfig}
      />
    <div className="border-t border-zinc-200/60 p-4 dark:border-zinc-800">
      <div
        className={cls(
          "mx-auto flex flex-col rounded-3xl border bg-white shadow-sm dark:bg-zinc-950 transition-all duration-200",
          "max-w-3xl border-zinc-200 dark:border-zinc-800",
        )}
      >
        {/* Textarea area - grows upward */}
        <div className="flex-1 px-4 pt-4 pb-2">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="How can I help you today?"
            rows={1}
            className={cls(
              "w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400 transition-all duration-200",
              "min-h-[24px] text-left leading-6",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
        </div>

        {/* Bottom toolbar: + on left, mic/send on right */}
        <div className="flex items-center justify-between px-3 pb-3">
          <ComposerActionsPopover onSelect={handleAction}>
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="Add attachment"
            >
              <Plus className="h-5 w-5" />
            </button>
          </ComposerActionsPopover>

          <div className="flex items-center gap-1 shrink-0">
            <button
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="Voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={sending || busy || !hasContent}
              className={cls(
                "inline-flex shrink-0 items-center justify-center rounded-full p-2.5 transition-colors",
                hasContent
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed",
              )}
            >
              {sending || busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-3xl px-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        AI can make mistakes. Check important info.
      </div>
    </div>
  </>

  )
})

export default Composer
