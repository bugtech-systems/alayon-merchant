"use client"

import { useState, forwardRef, useImperativeHandle, useRef } from "react"
import { Pencil, RefreshCw, Check, X, Square } from "lucide-react"
import Message from "./Message"
import Composer from "./Composer"
import { cls, timeAgo } from "./utils"
import ChatInterface from "@/chat-interface"


// Faster word delay for smoother streaming
const WORD_DELAY = 40 // ms per word
const CHUNK_SIZE = 2 // Number of words to add at once


function ThinkingMessage({ onPause }) {
  return (
    <Message role="assistant">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
        </div>
        <span className="text-sm text-zinc-500">AI is thinking...</span>
        <button
          onClick={onPause}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Square className="h-3 w-3" /> Pause
        </button>
      </div>
    </Message>
  )
}

const ChatPane = forwardRef(function ChatPane(
  { conversation, onSend, onEditMessage, onResendMessage, isThinking, onPauseThinking, setConversations, setThinkingConvId },
  ref,
) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingWords, setStreamingWords] = useState([])
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [completedMessages, setCompletedMessages] = useState(new Set())
  const composerRef = useRef(null)



  
  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent) => {
        composerRef.current?.insertTemplate(templateContent)
      },
    }),
    [],
  )

  if (!conversation) return null

  const tags = ["Certified", "Personalized", "Experienced", "Helpful"]
  const messages = Array.isArray(conversation.messages) ? conversation.messages : []
  const count = messages.length || conversation.messageCount || 0

  function startEdit(m) {
    setEditingId(m.id)
    setDraft(m.content)
  }
  function cancelEdit() {
    setEditingId(null)
    setDraft("")
  }
  function saveEdit() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    cancelEdit()
  }
  function saveAndResend() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    onResendMessage?.(editingId)
    cancelEdit()
  }

  async function sendMessage(convId, content, response) {
    if (!content.trim()) return

    const now = new Date().toISOString()
    const userMsg = { id: Math.random().toString(36).slice(2), role: "user", content, createdAt: now }
    
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = [...(c.messages || []), userMsg]
        return {
          ...c,
          messages: msgs,
          updatedAt: now,
          messageCount: msgs.length,
          preview: content.slice(0, 80),
        }
      }),
    )
    await simulateTextStreaming(response)


    await onSend?.(convId, content, response)
    onPauseThinking()

    setThinkingConvId(convId)
    const currentConvId = convId
      // Always clear thinking state and generate response for this specific conversation
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConvId) return c

          const ack = response
          const asstMsg = {
            id: Math.random().toString(36).slice(2),
            role: "assistant",
            content: ack,
            createdAt: new Date().toISOString(),
          }
          const msgs = [...(c.messages || []), asstMsg]
          return {
            ...c,
            messages: msgs,
            updatedAt: new Date().toISOString(),
            messageCount: msgs.length,
            preview: asstMsg.content.slice(0, 80),
          }
        }),
      )
  }


const simulateTextStreaming = async (text) => {
    // Split text into words
    const words = text.split(" ")
    let currentIndex = 0
    setStreamingWords([])
    setIsStreaming(true)

    return new Promise((resolve) => {
      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          // Add a few words at a time
          const nextIndex = Math.min(currentIndex + CHUNK_SIZE, words.length)
          const newWords = words.slice(currentIndex, nextIndex)

          setStreamingWords((prev) => [
            ...prev,
            {
              id: Date.now() + currentIndex,
              text: newWords.join(" ") + " ",
            },
          ])

          currentIndex = nextIndex
        } else {
          clearInterval(streamInterval)
          resolve()
        }
      }, WORD_DELAY)
    })
  }

  const getAIResponse = (userMessage) => {
    const responses = [
      `That's an interesting perspective. Let me elaborate on that a bit further. When we consider the implications of what you've shared, several key points come to mind. First, it's important to understand the context and how it relates to broader concepts. This allows us to develop a more comprehensive understanding of the situation. Would you like me to explore any specific aspect of this in more detail?`,

      `I appreciate you sharing that. From what I understand, there are multiple layers to consider here. The initial aspect relates to the fundamental principles we're discussing, but there's also a broader context to consider. This reminds me of similar scenarios where the underlying patterns reveal interesting connections. What aspects of this would you like to explore further?`,

      `Thank you for bringing this up. It's a fascinating topic that deserves careful consideration. When we analyze the details you've provided, we can identify several important elements that contribute to our understanding. This kind of discussion often leads to valuable insights and new perspectives. Is there a particular element you'd like me to focus on?`,

      `Your message raises some compelling points. Let's break this down systematically to better understand the various components involved. There are several key factors to consider, each contributing to the overall picture in unique ways. This kind of analysis often reveals interesting patterns and connections that might not be immediately apparent. What specific aspects would you like to delve into?`,
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

const simulateAIResponse = async (userMessage) => {
    const response = getAIResponse(userMessage)
    await sendMessage(conversation.id, userMessage, response)

    // Create a new message with empty content
    const messageId = Date.now().toString()
    setStreamingMessageId(messageId)
    setIsStreaming(true)

    // setMessages((prev) => [
    //   ...prev,
    //   {
    //     id: messageId,
    //     content: "",
    //     type: "system",
    //   },
    // ])

    // Add a delay before the second vibration
    setTimeout(() => {
      // Add vibration when streaming begins
      navigator.vibrate(50)
    }, 200) // 200ms delay to make it distinct from the first vibration
    // Stream the text

    // Update with complete message
    // setMessages((prev) =>
    //   prev.map((msg) => (msg.id === messageId ? { ...msg, content: response, completed: true } : msg)),
    // )

    // Add to completed messages set to prevent re-animation
    setCompletedMessages((prev) => new Set(prev).add(messageId))
    
    // Add vibration when streaming ends
    navigator.vibrate(50)

    // Reset streaming state
    setStreamingWords([])
    setStreamingMessageId(null)
    setIsStreaming(false)
    

  }

  return (

          <ChatInterface 
          conversation={conversation}
              ref={composerRef}
        onSend={async (text) => {
          if (!text.trim()) return
          setBusy(true)
          await simulateAIResponse?.(text)
          // await onSend?.(text)
          setTimeout(setBusy(false),2000)
          
        }}
        busy={busy}
        messages={messages}
          />

  )
})

export default ChatPane
