import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Search, X, Package, Loader2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom Autocomplete Component
export const Autocomplete = ({
  value,
  onChange,
  items,
  onSelect,
  placeholder = 'Search...',
  emptyMessage = 'No items found',
  createNewLabel = 'Create new',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  items: any[];
  onSelect: (item: any) => void;
  placeholder?: string;
  emptyMessage?: string;
  createNewLabel?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter and sort items
  const getFilteredItems = useCallback(() => {
    const searchTerm = value.toLowerCase().replace(/\s+/g, '');
    
    let filtered = items.filter((item) => {
      if (!searchTerm) return true;
      
      const title = item.title?.toLowerCase().replace(/\s+/g, '') || '';
      const description = item.description?.toLowerCase().replace(/\s+/g, '') || '';
      const sku = item.sku?.toLowerCase().replace(/\s+/g, '') || '';
      
      // Search in title, description, and SKU
      return title.includes(searchTerm) || 
             description.includes(searchTerm) ||
             sku.includes(searchTerm);
    });
    
    // Sort by created_at (latest first)
    filtered = filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered.slice(0, 100);
  }, [items, value]);

  const filteredItems = getFilteredItems();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          onSelect(filteredItems[highlightedIndex]);
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  // Highlight matched text
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const normalizedText = text.toLowerCase().replace(/\s+/g, '');
    const normalizedSearch = searchTerm.toLowerCase().replace(/\s+/g, '');
    const index = normalizedText.indexOf(normalizedSearch);
    
    if (index === -1) return text;
    
    // Find the actual character positions in the original text
    let charIndex = 0;
    let startPos = -1;
    let endPos = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ' ') {
        if (charIndex === index) startPos = i;
        if (charIndex === index + normalizedSearch.length - 1) {
          endPos = i;
          break;
        }
        charIndex++;
      }
    }
    
    if (startPos === -1 || endPos === -1) return text;
    
    return (
      <>
        {text.slice(0, startPos)}
        <span className="bg-yellow-200 dark:bg-yellow-900/50 font-medium">
          {text.slice(startPos, endPos + 1)}
        </span>
        {text.slice(endPos + 1)}
      </>
    );
  };

  const searchTerm = value;

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 pl-9 pr-10 rounded-md border border-input',
            'bg-background text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover rounded-md border shadow-lg">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              // Empty state - Show create new option
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {emptyMessage}
                </p>
                {value.trim() && (
                  <button
                    onClick={() => {
                      // Handle create new
                      if (value.trim()) {
                        // Your create logic here
                        onSelect({ title: value.trim(), isNew: true });
                        setIsOpen(false);
                      }
                    }}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {createNewLabel} "{value.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = value === item.title;
                
                return (
                  <div
                    key={item.id}
                    ref={(el) => (itemRefs.current[index] = el)}
                    onClick={() => {
                      onSelect(item);
                      setIsOpen(false);
                      setHighlightedIndex(-1);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 rounded-md cursor-pointer',
                      'transition-colors duration-150',
                      isHighlighted && 'bg-accent',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <Check className={cn(
                      'h-4 w-4 mt-0.5 shrink-0 transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {highlightMatch(item.title, searchTerm)}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {highlightMatch(item.description, searchTerm)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {item.sku}
                      </span>
                      {item.created_at && (
                        <span className="text-[10px] text-muted-foreground/70">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};