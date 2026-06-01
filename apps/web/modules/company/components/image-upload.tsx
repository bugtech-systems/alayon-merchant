import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@medusajs/ui";
import { X } from "lucide-react";

interface ImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
}

export function ImageUpload({ value, onChange, accept = "image/*", maxSize = 5 * 1024 * 1024 }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      onChange(acceptedFiles[0]);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxSize,
    multiple: false,
  });

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img
            src={URL.createObjectURL(value)}
            alt="Preview"
            className="h-32 w-32 object-cover rounded-lg border"
          />
          <Button
            variant="danger"
            size="small"
            className="absolute -top-2 -right-2 rounded-full p-1"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors hover:border-blue-500
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          `}
        >
          <input {...getInputProps()} />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? "Drop the image here"
              : "Drag & drop an image here, or click to select"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPG, GIF up to {Math.floor(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      )}
    </div>
  );
}