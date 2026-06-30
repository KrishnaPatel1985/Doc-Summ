import React, { useState, useRef, useCallback } from 'react';
import './UploadArea.css';

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTS = ['.pdf', '.txt', '.docx'];
const MAX_SIZE_MB = 20;
const MAX_FILES = 10;
const MAX_TOTAL_SIZE_MB = 60;

interface UploadAreaProps {
  onSubmit: (
    files: File[],
    text: string | null,
    sentences: number,
    style: string,
    customInstructions: string,
    length: string,
    tone: string,
  ) => void;
}

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
];
const TONE_OPTIONS = [
  { value: 'simple', label: 'Simple' },
  { value: 'professional', label: 'Professional' },
  { value: 'academic', label: 'Academic' },
];

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAllowedExt = ALLOWED_EXTS.includes(ext);
  const isAllowedType = ALLOWED_TYPES.includes(file.type);

  if (!isAllowedExt && !isAllowedType) {
    return `Unsupported file type "${file.name}". Use PDF, TXT, or DOCX.`;
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return `File too large: ${sizeMB.toFixed(1)} MB. Maximum is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onSubmit }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [sentences, setSentences] = useState(7);
  const [style, setStyle] = useState('paragraph');
  const [length, setLength] = useState('medium');
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const validFiles: File[] = [];
    let error: string | null = null;

    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      const err = validateFile(f);
      if (err) {
        error = err;
      } else {
        // Prevent duplicate files
        if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
          validFiles.push(f);
        }
      }
    }

    if (!error) {
      const combined = [...files, ...validFiles];
      if (combined.length > MAX_FILES) {
        error = `Too many files. Maximum is ${MAX_FILES} per submission.`;
      } else {
        const totalMB = combined.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        if (totalMB > MAX_TOTAL_SIZE_MB) {
          error = `Combined file size (${totalMB.toFixed(1)} MB) exceeds the ${MAX_TOTAL_SIZE_MB} MB limit.`;
        }
      }
    }

    setFileError(error);

    if (!error && validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setText(''); // clear text when files are added
    }
    // Clear input value so selecting the same file again fires onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = (files.length > 0 || text.trim().length > 0) && !fileError;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(files, text.trim() || null, sentences, style, customInstructions, length, tone);
  };

  return (
    <div className="upload-area card animate-in">
      <div className="upload-area-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h2>Add your content</h2>
      </div>

      {/* Drop Zone / File List */}
      <div
        id="drop-zone"
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${files.length > 0 ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => files.length === 0 && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          onChange={onFileChange}
          style={{ display: 'none' }}
          id="file-input"
          multiple
        />

        {files.length > 0 ? (
          <div className="file-list" onClick={(e) => e.stopPropagation()}>
            <div className="file-list-header">
              <span>Selected Files ({files.length})</span>
            </div>
            {files.map((file, idx) => (
              <div key={idx} className="file-preview-card">
                <div className="file-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="file-info">
                  <p className="file-name" title={file.name}>{file.name}</p>
                  <p className="file-meta">{(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type.split('/').pop()?.toUpperCase()}</p>
                </div>
                <button
                  id={`remove-file-${idx}`}
                  className="btn btn-ghost remove-btn"
                  onClick={() => removeFile(idx)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Remove
                </button>
              </div>
            ))}
            <div className="file-list-actions">
              <button
                className="btn btn-ghost add-more-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add More Files
              </button>
            </div>
          </div>
        ) : (
          <div className="drop-zone-empty">
            <div className={`upload-icon ${dragOver ? 'pulse' : ''}`}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            </div>
            <p className="drop-label">{dragOver ? 'Drop files here' : 'Drag & drop your files here'}</p>
            <p className="drop-sub">— or —</p>
            <button id="browse-btn" className="btn btn-ghost" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              Browse Files
            </button>
            <p className="drop-types">Supports: PDF · TXT · DOCX · Max {MAX_SIZE_MB} MB per file</p>
          </div>
        )}
      </div>

      {/* File Error */}
      {fileError && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {fileError}
        </div>
      )}

      {/* Divider */}
      <div className="divider"><span>or paste / type text below</span></div>

      {/* Text Area */}
      <div className={`textarea-wrapper ${files.length > 0 ? 'dimmed' : ''}`}>
        <textarea
          id="text-input"
          className="text-input"
          placeholder="Type or paste your text here..."
          value={text}
          onChange={(e) => { setText(e.target.value); if (e.target.value) setFiles([]); }}
          disabled={files.length > 0}
          rows={6}
        />
        {text && files.length === 0 && (
          <div className="text-meta">
            <span>{text.length} chars · {wordCount} words</span>
            <button id="clear-text-btn" className="btn btn-ghost clear-btn" onClick={() => setText('')}>Clear</button>
          </div>
        )}
      </div>

      {/* Style Selector */}
      <div className="style-row">
        <label className="style-label">Output style:</label>
        <div className="style-options">
          {[
            { value: 'paragraph', label: '📝 Paragraph' },
            { value: 'bullets', label: '• Bullet Points' },
            { value: 'action_items', label: '✅ Action Items' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`style-btn ${style === opt.value ? 'active' : ''}`}
              onClick={() => setStyle(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Length Selector */}
      <div className="style-row">
        <label className="style-label">Length:</label>
        <div className="style-options">
          {LENGTH_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`style-btn ${length === opt.value ? 'active' : ''}`}
              onClick={() => setLength(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone Selector */}
      <div className="style-row">
        <label className="style-label">Tone:</label>
        <div className="style-options">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`style-btn ${tone === opt.value ? 'active' : ''}`}
              onClick={() => setTone(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced / Custom Instructions */}
      <div className="advanced-section">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced(v => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Custom instructions {customInstructions.trim() ? '(active)' : '(optional)'}
        </button>
        {showAdvanced && (
          <textarea
            className="text-input custom-instructions-input"
            placeholder='e.g. "Focus on financial figures" or "Write for a non-technical audience"'
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            rows={3}
          />
        )}
      </div>

      {/* Sentence Count + Submit */}
      <div className="submit-row">
        <div className="sentence-control">
          <span className="sentence-label">Summary sentences:</span>
          <button id="dec-sentences-btn" className="sentence-btn" onClick={() => setSentences(s => Math.max(1, s - 1))}>−</button>
          <span id="sentences-display" className="sentence-val">{sentences}</span>
          <button id="inc-sentences-btn" className="sentence-btn" onClick={() => setSentences(s => Math.min(20, s + 1))}>+</button>
        </div>
        <button
          id="summarize-btn"
          className="btn btn-primary summarize-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Summarize
        </button>
      </div>
    </div>
  );
};

export default UploadArea;
