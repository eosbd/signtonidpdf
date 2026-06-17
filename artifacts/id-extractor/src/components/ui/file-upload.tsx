import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  className?: string;
  accept?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  loadingText?: string;
}

export function FileUpload({
  onFileSelect,
  isLoading,
  className,
  accept = "application/pdf,image/*",
  title = "Click to upload or drag and drop",
  description = "PDF, JPG, PNG (Max 10MB)",
  buttonText = "Select Document",
  loadingText = "Extracting fields...",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-lg transition-colors overflow-hidden",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isLoading && fileInputRef.current?.click()}
      data-testid="file-upload-zone"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        data-testid="file-upload-input"
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-medium">{loadingText}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted-foreground p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-primary mb-2 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground font-['Hind_Siliguri']">{title}</p>
            <p className="text-sm mt-1 font-['Hind_Siliguri']">{description}</p>
          </div>
          <Button variant="outline" className="mt-2 pointer-events-none font-['Hind_Siliguri']">
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
}
