"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  SearchIcon,
  Plus,
  Star,
  Clock,
  FolderIcon,
  FileText,
  Settings,
  Asterisk,
  Menu, // ← added for mobile trigger
} from "lucide-react";
import { useEffect, useCallback, useState, useRef } from "react";
import SidebarSection from "./SidebarSection";
import ConversationRow from "./ConversationRow";
import FolderRow from "./FolderRow";
import TemplateRow from "./TemplateRow";
import ThemeToggle from "./ThemeToggle";
import CreateFolderModal from "./CreateFolderModal";
import CreateTemplateModal from "./CreateTemplateModal";
import SearchModal from "./SearchModal";
import SettingsPopover from "./SettingsPopover";
import { cls, makeId } from "./utils";
import {  n8nFetcher } from "@/hooks/useN8nQuery";
import { useMedusaAuth } from "@/providers/MedusaAuthProvider";

// Custom hook for media queries
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (event) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Hook to lock body scroll when sidebar is open on mobile
function useLockBodyScroll(lock) {
  useEffect(() => {
    if (lock) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [lock]);
}

export default function Sidebar({
  open,
  onClose,
  onOpen,        // ← new prop: called when mobile trigger is clicked
  theme,
  setTheme,
  collapsed,
  setCollapsed,
  conversations,
  pinned,
  recent,
  folders,
  folderCounts,
  selectedId,
  onSelect,
  togglePin,
  query,
  setQuery,
  searchRef,
  createFolder,
  createNewChat,
  templates = [],
  setTemplates = () => {},
  onUseTemplate = () => {},
  sidebarCollapsed = false,
  setSidebarCollapsed = () => {}
}) {
  const { user } = useMedusaAuth()
  // const { data: resetSession, refetch: resetChatSession } = useN8nQuery({endpoint: '/webhook/session/reset', method: "POST", body: {auth_id: user?.id, id: makeId('aisess_')}})
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [session, setSession] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const sidebarRef = useRef(null);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isMobile = !isDesktop;
  useLockBodyScroll(open && isMobile);

  const handleSession = async () => {
   let session_id = localStorage.getItem('session_id')

   let newSession = await n8nFetcher({endpoint: '/webhook/session', method: "POST", body: {auth_id: user?.id, id: session_id }}).catch(err => console.log(err, "ERR"));
      if(newSession.length){
          localStorage.setItem('session_id', newSession[0]?.id)
          setSession(newSession[0])
      } else {
            handleNewSession()
      }
      
  }

    const handleNewSession = async () => {
   let newSession = await n8nFetcher({endpoint: '/webhook/session/reset', method: "POST", body: {auth_id: user?.id, id: makeId('aisess_')}});
   console.log(newSession, 'new sess')
      if(newSession[0]){
          localStorage.setItem('session_id', newSession[0]?.id)
          setSession(newSession[0])
      }
      
  }



  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open && isMobile) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isMobile, onClose]);

  // Trap focus inside sidebar when open on mobile
  useEffect(() => {
    if (open && isMobile && sidebarRef.current) {
      const focusableElements = sidebarRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length) {
        focusableElements[0].focus();
      }
    }
  }, [open, isMobile]);


  useEffect(() => {
       let session_id = localStorage.getItem('session_id')

    if(session_id){
     handleSession()
    } else {
      handleNewSession()
    }
  }, [user])

  const handleSearchClick = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  const handleNewChatClick = useCallback(() => {
    createNewChat();
    if (isMobile) onClose();
  }, [createNewChat, isMobile, onClose]);

  const handleFoldersClick = useCallback(() => {
    setSidebarCollapsed(false);
    setCollapsed((s) => ({ ...s, folders: false }));
    if (isMobile) onClose();
  }, [setSidebarCollapsed, setCollapsed, isMobile, onClose]);

  const getConversationsByFolder = useCallback(
    (folderName) => {
      return conversations.filter((conv) => conv.folder === folderName);
    },
    [conversations]
  );

  const handleCreateFolder = useCallback(
    (folderName) => {
      createFolder(folderName);
      setShowCreateFolderModal(false);
    },
    [createFolder]
  );

  const handleDeleteFolder = useCallback((folderName) => {
    const updatedConversations = conversations.map((conv) =>
      conv.folder === folderName ? { ...conv, folder: null } : conv
    );
    console.log("Delete folder:", folderName, "Updated conversations:", updatedConversations);
  }, [conversations]);

  const handleRenameFolder = useCallback((oldName, newName) => {
    const updatedConversations = conversations.map((conv) =>
      conv.folder === oldName ? { ...conv, folder: newName } : conv
    );
    console.log("Rename folder:", oldName, "to", newName, "Updated conversations:", updatedConversations);
  }, [conversations]);

  const handleCreateTemplate = useCallback(
    (templateData) => {
      if (editingTemplate) {
        const updatedTemplates = templates.map((t) =>
          t.id === editingTemplate.id ? { ...templateData, id: editingTemplate.id } : t
        );
        setTemplates(updatedTemplates);
        setEditingTemplate(null);
      } else {
        const newTemplate = {
          ...templateData,
          id: Date.now().toString(),
        };
        setTemplates([...templates, newTemplate]);
      }
      setShowCreateTemplateModal(false);
    },
    [editingTemplate, templates, setTemplates]
  );

  const handleEditTemplate = useCallback((template) => {
    setEditingTemplate(template);
    setShowCreateTemplateModal(true);
  }, []);

  const handleRenameTemplate = useCallback(
    (templateId, newName) => {
      const updatedTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, name: newName, updatedAt: new Date().toISOString() } : t
      );
      setTemplates(updatedTemplates);
    },
    [templates, setTemplates]
  );

  const handleDeleteTemplate = useCallback(
    (templateId) => {
      const updatedTemplates = templates.filter((t) => t.id !== templateId);
      setTemplates(updatedTemplates);
    },
    [templates, setTemplates]
  );

  const handleUseTemplate = useCallback(
    (template) => {
      onUseTemplate(template);
      if (isMobile) onClose();
    },
    [onUseTemplate, isMobile, onClose]
  );

  const handleDragEnd = useCallback(
    (event, info) => {
      if (isMobile && info.offset.x < -100) {
        onClose();
      }
    },
    [isMobile, onClose]
  );

  const showCollapsedVariant = isDesktop && sidebarCollapsed;
  const showExpandedVariant = !showCollapsedVariant && (open || isDesktop);

  // --- Collapsed sidebar (desktop only) ---
  if (showCollapsedVariant) {
    return (
      <>
        <motion.aside
          initial={{ width: 320 }}
          animate={{ width: 64 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="z-50 flex h-full shrink-0 flex-col border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-center border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center gap-2 pt-4">
            <button
              onClick={handleNewChatClick}
              className="rounded-xl p-2.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px]"
              title="New Chat (⌘N)"
              aria-label="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>

            <button
              onClick={handleSearchClick}
              className="rounded-xl p-2.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px]"
              title="Search chats"
              aria-label="Search chats"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <button
              onClick={handleFoldersClick}
              className="rounded-xl p-2.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px]"
              title="Folders"
              aria-label="Folders"
            >
              <FolderIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 pb-4">
            <SettingsPopover>
              <button
                className="rounded-xl p-2.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px]"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </SettingsPopover>
          </div>
        </motion.aside>

        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          conversations={conversations}
          selectedId={selectedId}
          onSelect={onSelect}
          togglePin={togglePin}
          createNewChat={createNewChat}
        />
      </>
    );
  }

  // --- Expanded sidebar (desktop + mobile overlay) ---
  return (
    <>
      {/* Mobile drawer trigger button (appears when sidebar is closed on mobile) */}
  

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpandedVariant && (
          <motion.aside
            ref={sidebarRef}
            key="sidebar"
            initial={{ x: isMobile ? -340 : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ? -340 : undefined }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            drag={isMobile ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cls(
              "z-50 flex h-full w-80 shrink-0 flex-col border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900",
              isMobile
                ? "fixed inset-y-0 left-0 shadow-xl"
                : "relative"
            )}
            role="dialog"
            aria-modal={isMobile}
            aria-label="Sidebar navigation"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm dark:from-zinc-200 dark:to-zinc-300 dark:text-zinc-900">
                  <Asterisk className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold tracking-tight">AI Assistant</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {isDesktop && (
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose className="h-5 w-5" />
                  </button>
                )}

                {isMobile && (
                  <button
                    onClick={onClose}
                    className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
                    aria-label="Close sidebar"
                  >
                    <PanelLeftClose className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 pt-3">
              <label htmlFor="search" className="sr-only">
                Search conversations
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="search"
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  onClick={() => setShowSearchModal(true)}
                  onFocus={() => setShowSearchModal(true)}
                  className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950/50 min-h-[44px]"
                  aria-label="Search"
                />
              </div>
            </div>

            <div className="px-3 pt-3">
              <button
                onClick={handleNewChatClick}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-900 min-h-[44px]"
                title="New Chat (⌘N)"
              >
                <Plus className="h-4 w-4" /> Start New Chat
              </button>
            </div>

            <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
              {/* PINNED CHATS SECTION - Uncomment to enable */}
              {/* <SidebarSection ... /> */}

              <SidebarSection
                icon={<Clock className="h-4 w-4" />}
                title="RECENT"
                collapsed={collapsed.recent}
                onToggle={() => setCollapsed((s) => ({ ...s, recent: !s.recent }))}
              >
                {recent.length === 0 ? (
                  <div className="select-none rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    No conversations yet. Start a new one!
                  </div>
                ) : (
                  recent.map((c) => (
                    <ConversationRow
                      key={c.id}
                      data={c}
                      active={c.id === selectedId}
                      onSelect={() => onSelect(c.id)}
                      onTogglePin={() => togglePin(c.id)}
                      showMeta
                    />
                  ))
                )}
              </SidebarSection>

              {/* FOLDERS SECTION - Uncomment to enable */}
              {/* <SidebarSection ... /> */}

              <SidebarSection
                icon={<FileText className="h-4 w-4" />}
                title="TEMPLATES"
                collapsed={collapsed.templates}
                onToggle={() => setCollapsed((s) => ({ ...s, templates: !s.templates }))}
              >
                <div className="-mx-1">
                  <button
                    onClick={() => setShowCreateTemplateModal(true)}
                    className="mb-2 inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" /> Create template
                  </button>

                  {(Array.isArray(templates) ? templates : []).map((template) => (
                    <TemplateRow
                      key={template.id}
                      template={template}
                      onUseTemplate={handleUseTemplate}
                      onEditTemplate={handleEditTemplate}
                      onRenameTemplate={handleRenameTemplate}
                      onDeleteTemplate={handleDeleteTemplate}
                    />
                  ))}

                  {(!templates || templates.length === 0) && (
                    <div className="select-none rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      No templates yet. Create your first prompt template.
                    </div>
                  )}
                </div>
              </SidebarSection>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />

      <CreateTemplateModal
        isOpen={showCreateTemplateModal}
        onClose={() => {
          setShowCreateTemplateModal(false);
          setEditingTemplate(null);
        }}
        onCreateTemplate={handleCreateTemplate}
        editingTemplate={editingTemplate}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        conversations={conversations}
        selectedId={selectedId}
        onSelect={onSelect}
        togglePin={togglePin}
        createNewChat={createNewChat}
      />
    </>
  );
}