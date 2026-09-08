import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface DocumentSlotProps {
  label: string;
  type: string;
  onUpload: (file: File | null) => void;
  value: File | null;
  error?: string;
}

export function OptionalDocumentUploader({ label, onUpload, value, error }: DocumentSlotProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    // Basic validation
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PDF, JPG, PNG or DOCX.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max size is 5MB.');
      return;
    }
    onUpload(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</label>
      
      {!value ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
          className={cn(
            "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group",
            isDragging ? "border-accent bg-accent/5" : "border-[var(--border-light)] hover:border-accent/30 hover:bg-[var(--background)]/50",
            error && "border-red-200 bg-red-50/30"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center text-[var(--text)]/30 group-hover:text-accent transition-colors">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-accent">Click or drag to upload</p>
            <p className="text-[8px] opacity-40 font-medium mt-0.5">PDF, PNG, JPG, DOCX up to 5MB</p>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--background)] border border-accent/20 rounded-xl p-3 flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate max-w-[150px]">{value.name}</p>
              <p className="text-[9px] opacity-40 font-black uppercase tracking-tighter">{(value.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onUpload(null)}
              className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-[9px] text-red-500 font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
