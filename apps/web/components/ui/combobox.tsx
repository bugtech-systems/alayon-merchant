// components/ui/combobox.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No options found",
  isLoading = false,
  disabled = false,
  className,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex items-center w-full min-h-[40px] rounded-lg border bg-white cursor-pointer transition-all",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <div className="flex-1 flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-9 pr-8 bg-transparent"
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="flex-1 px-3 py-2 text-sm text-gray-900 truncate">
            {selectedOption?.label || placeholder}
          </div>
        )}
        
        {!disabled && (
          <button
            type="button"
            className="absolute right-2 p-1 rounded-md hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen && search) {
                setSearch("");
              } else if (value) {
                handleClear();
              } else {
                setIsOpen(!isOpen);
              }
            }}
          >
            {isOpen ? (
              search ? (
                <X className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform rotate-180" />
              )
            ) : value ? (
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto"
          >
            {isLoading ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer transition-colors",
                    highlightedIndex === index && "bg-blue-50",
                    value === option.value && "bg-blue-50 text-blue-700 font-medium"
                  )}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}