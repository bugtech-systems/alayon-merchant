"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, X, Users, Send, AlertCircle, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isActive: boolean;
  status: string;
  phoneNumber?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  email?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  customers?: Customer[];
  currentUserPhone?: any;
  selectedConversation?: Conversation | null;
  onSelectConversation?: any;
  onSendBulkMessage?: any;
}

const BATCH_SIZE = 20;

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onSendBulkMessage,
  customers = []
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isFlashSms, setIsFlashSms] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);
  console.log(conversations, filteredConversations, 'CONVOOSS')
  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      customer.phone.includes(recipientSearch) ||
      (customer.email && customer.email.toLowerCase().includes(recipientSearch.toLowerCase()))
    );
  }, [customers, recipientSearch]);

  // Get visible customers (paginated)
  const visibleCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCount);
  }, [filteredCustomers, visibleCount]);

  // Check if all customers are selected
  useEffect(() => {
    if (customers.length > 0) {
      const allSelected = customers.every(c => selectedRecipients.includes(c.phone));
      setIsSelectAll(allSelected);
    }
  }, [selectedRecipients, customers]);

  // Reset visible count when search changes or dropdown opens
  useEffect(() => {
    if (isRecipientDropdownOpen) {
      setVisibleCount(BATCH_SIZE);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isRecipientDropdownOpen]);

  // Handle scroll to load more recipients
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
      if (visibleCount < filteredCustomers.length) {
        setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredCustomers.length));
      }
    }
  }, [visibleCount, filteredCustomers.length]);

  // Get recipient details
  const getRecipientDetails = useCallback((phone: string) => {
    return customers.find(c => c.phone === phone);
  }, [customers]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (isSelectAll) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(customers.map(c => c.phone));
    }
  }, [isSelectAll, customers]);

  // Handle recipient toggle
  const handleRecipientToggle = useCallback((phone: string) => {
    setSelectedRecipients(prev => {
      const newSelection = prev.includes(phone)
        ? prev.filter(item => item !== phone)
        : [...prev, phone];
      return newSelection;
    });
  }, []);

  // Remove recipient
  const removeRecipient = useCallback((phone: string) => {
    setSelectedRecipients(prev => prev.filter(p => p !== phone));
  }, []);

  // Get selected recipient names for display
  const getSelectedNames = useCallback(() => {
    const names = selectedRecipients
      .map(phone => {
        const customer = getRecipientDetails(phone);
        return customer?.name || phone;
      })
      .slice(0, 3);
    
    if (selectedRecipients.length > 3) {
      return `${names.join(", ")} +${selectedRecipients.length - 3} more`;
    }
    return names.join(", ");
  }, [selectedRecipients, getRecipientDetails]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    // Validation
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (messageText.length > 700) {
      toast.error("Message cannot exceed 700 characters");
      return;
    }

    try {
      setIsSending(true);
      
      if (onSendBulkMessage) {
        await onSendBulkMessage(
          messageText.trim(),
          selectedRecipients,
          isFlashSms,
        );
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success(`Message sent to ${selectedRecipients.length} recipient(s)`);
      }

      // Reset form
      setSelectedRecipients([]);
      setMessageText("");
      setIsFlashSms(false);
      setIsSelectAll(false);
      setIsNewMessageOpen(false);
      setRecipientSearch("");
      setVisibleCount(BATCH_SIZE);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [selectedRecipients, messageText, isFlashSms, onSendBulkMessage]);

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      // Reset form when dialog closes
      setSelectedRecipients([]);
      setMessageText("");
      setIsFlashSms(false);
      setIsSelectAll(false);
      setRecipientSearch("");
      setVisibleCount(BATCH_SIZE);
    }
    setIsNewMessageOpen(open);
  }, []);

  // Format character count
  const characterCount = messageText.length;
  const isNearLimit = characterCount > 650;
  const isOverLimit = characterCount > 700;


  return (
    <div className="flex h-[90vh] w-full flex-col bg-white">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <Dialog open={isNewMessageOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>
                  Send a message to one or more recipients
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Recipient Selection */}
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  
                  {/* Selected Recipients Display */}
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-gray-50 min-h-[40px] max-h-[120px] overflow-y-auto">
                      {selectedRecipients.map((phone) => {
                        const recipient = getRecipientDetails(phone);
                        if (!recipient) return null;
                        return (
                          <Badge
                            key={phone}
                            variant="secondary"
                            className="flex items-center gap-1.5 px-2 py-1 text-sm animate-in fade-in-50 slide-in-from-left-2"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={recipient.avatar} alt={recipient.name} />
                              <AvatarFallback className="text-[8px]">
                                {recipient.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[150px] truncate">{recipient.name}</span>
                            <button
                              onClick={() => removeRecipient(phone)}
                              className="ml-0.5 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown Trigger */}
                  <Popover
                    open={isRecipientDropdownOpen}
                    onOpenChange={setIsRecipientDropdownOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-auto min-h-[40px]",
                          selectedRecipients.length === 0 && "text-gray-500"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {selectedRecipients.length === 0 ? (
                            <>
                              <Users className="h-4 w-4 shrink-0" />
                              <span>Select recipients...</span>
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {getSelectedNames()}
                              </span>
                              <Badge variant="secondary" className="ml-auto shrink-0">
                                {selectedRecipients.length}
                              </Badge>
                            </>
                          )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[--radix-popover-trigger-width] p-0" 
                      align="start"
                    >
                      <div className="flex flex-col">
                        {/* Search Input */}
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              ref={searchInputRef}
                              placeholder="Search recipients..."
                              value={recipientSearch}
                              onChange={(e) => {
                                setRecipientSearch(e.target.value);
                                setVisibleCount(BATCH_SIZE);
                              }}
                              className="pl-8 h-9"
                            />
                          </div>
                        </div>

                        {/* Select All */}
                        <div 
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b"
                          onClick={handleSelectAll}
                        >
                          <Checkbox
                            checked={isSelectAll}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-sm font-medium">Select All</span>
                          <Badge variant="secondary" className="ml-auto">
                            {customers.length}
                          </Badge>
                        </div>

                        {/* Recipients List with Scroll */}
                        <ScrollArea 
                          className="h-[300px]"
                          ref={scrollContainerRef}
                          onScrollCapture={handleScroll}
                        >
                          <div className="p-1">
                            {filteredCustomers.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No recipients found
                              </div>
                            ) : (
                              visibleCustomers.map((customer) => {
                                const isSelected = selectedRecipients.includes(customer.phone);
                                return (
                                  <div
                                    key={customer.id}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                                      "hover:bg-gray-100",
                                      isSelected && "bg-blue-50 hover:bg-blue-100"
                                    )}
                                    onClick={() => handleRecipientToggle(customer.phone)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleRecipientToggle(customer.phone)}
                                      className="pointer-events-none"
                                    />
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={customer.avatar} alt={customer.name} />
                                      <AvatarFallback className="text-xs">
                                        {customer.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {customer.name}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {customer.phone}
                                        {customer.email && ` • ${customer.email}`}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-blue-500 shrink-0" />
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Recipient Count */}
                  {selectedRecipients.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message">Message</Label>
                    <span
                      className={cn(
                        "text-xs",
                        isOverLimit && "text-red-500",
                        isNearLimit && !isOverLimit && "text-yellow-500"
                      )}
                    >
                      {characterCount}/700
                    </span>
                  </div>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value.slice(0, 700))}
                    className={cn(
                      "min-h-[120px] resize-none",
                      isOverLimit && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {isOverLimit && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Message exceeds 700 characters
                    </p>
                  )}
                </div>

                {/* SMS Type Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Flash SMS</Label>
                    <p className="text-sm text-gray-500">
                      Flash SMS appears directly on the screen without saving to inbox
                    </p>
                  </div>
                  <Switch
                    checked={isFlashSms}
                    onCheckedChange={setIsFlashSms}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    isSending ||
                    selectedRecipients.length === 0 ||
                    !messageText.trim() ||
                    isOverLimit
                  }
                  className="gap-2"
                >
                  {isSending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search messages..."
            className="border-gray-200 bg-gray-50 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No conversations found</p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your search
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    "cursor-pointer border-b border-gray-100 p-4 transition-all duration-200 hover:bg-gray-50",
                    selectedConversation?.id === conversation.id
                      ? "border-l-4 border-l-blue-500 bg-blue-50 hover:bg-blue-100"
                      : "hover:translate-x-0.5",
                    index === 0 && "border-t"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.avatar} alt={conversation.name} />
                        <AvatarFallback>
                          {conversation.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isActive && (
                        <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 ring-2 ring-white"></div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                           
                        <h3 className="truncate text-sm font-medium text-gray-900">

                          {conversation.name} &nbsp; &nbsp;
                                {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-xs flex-shrink-0">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        </h3>
              
                        
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {conversation.timestamp}
                        </span>
                      </div>
                   <div className="flex items-center justify-between mt-1">
                        <h4 className="text-xs text-gray-500 whitespace-nowrap">
                          +63{conversation?.phoneNumber}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="truncate text-sm text-gray-600 flex-1 mr-2">
                          {conversation.lastMessage}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-xs flex-shrink-0">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}