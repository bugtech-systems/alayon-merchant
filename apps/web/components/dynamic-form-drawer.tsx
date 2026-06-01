// components/dynamic-form-drawer.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { FieldConfig } from '@/types/dynamic-table';

interface DynamicFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  initialValues: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

export function DynamicFormDrawer({ open, onOpenChange, title, fields, initialValues, onSubmit }: DynamicFormDrawerProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { register, handleSubmit, setValue, watch, reset } = useForm({ defaultValues: initialValues });

  React.useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const onValid = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = watch(field.name);
    switch (field.type) {
      case 'textarea':
        return <Textarea {...register(field.name)} placeholder={field.placeholder} />;
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => setValue(field.name, val)}>
            <SelectTrigger><SelectValue placeholder={field.placeholder} /></SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 size-4" />{value ? format(new Date(value), 'PPP') : 'Pick date'}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={value ? new Date(value) : undefined} onSelect={(date) => setValue(field.name, date?.toISOString())} /></PopoverContent>
          </Popover>
        );
      case 'number':
        return <Input type="number" {...register(field.name)} placeholder={field.placeholder} />;
      case 'custom':
        return field.customComponent ? <field.customComponent value={value} onChange={(val) => setValue(field.name, val)} field={field} /> : null;
      default:
        return <Input {...register(field.name)} placeholder={field.placeholder} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 py-4">
          {fields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}{field.required && '*'}</Label>
              {renderField(field)}
            </div>
          ))}
          <SheetFooter className="pt-4">
            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}