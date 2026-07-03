import React, { useState, useRef, useCallback } from 'react';
import type { TaskKey, DocInput } from '../types';
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
  task: TaskKey;
  onSubmit: (
    files: File[],
    text: string | null,
    sentences: number,
    style: string,
    customInstructions: string,
    length: string,
    tone: string,
  ) => void;
  onCompare?: (a: DocInput, b: DocInput, focus: string) => void;
}

const CTA_LABELS: Record<TaskKey, string> = {
  summarize: 'Summarize Document',
  study: 'Generate Study Pack',
  ask: 'Prepare Document',
  compare: 'Compare Documents',
  risk: 'Generate Risk Report',
  action: 'Extract Action Plan',
  evidence: 'Generate Evidence Map',
};

type MenuKey = 'style' | 'length' | 'tone' | 'sentences' | 'more' | null;

const STYLE_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'action_items', label: 'Action Items' },
];
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
const SENTENCE_OPTIONS = [3, 5, 7, 10];
const FOCUS_OPTIONS = [
  'General',
  'Risks',
  'Opportunities',
  'Financials',
  'Technical details',
  'Study notes',
  'Decisions/action items',
];
const INCLUDE_OPTIONS = [
  { key: 'numbers', label: 'Include key numbers' },
  { key: 'entities', label: 'Include names/entities' },
  { key: 'recommendations', label: 'Include recommendations' },
  { key: 'risks', label: 'Include risks/red flags' },
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

const UploadArea: React.FC<UploadAreaProps> = ({ task, onSubmit, onCompare }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [compareA, setCompareA] = useState<File | null>(null);
  const [compareB, setCompareB] = useState<File | null>(null);
  const [compareAText, setCompareAText] = useState('');
  const [compareBText, setCompareBText] = useState('');
  const [compareFocus, setCompareFocus] = useState('');
  const compareARef = useRef<HTMLInputElement>(null);
  const compareBRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [sentences, setSentences] = useState(7);
  const [style, setStyle] = useState('paragraph');
  const [length, setLength] = useState('medium');
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [focusArea, setFocusArea] = useState('General');
  const [includePrefs, setIncludePrefs] = useState<Record<string, boolean>>({
    numbers: false,
    entities: false,
    recommendations: false,
    risks: false,
  });
  const [showCustomSentences, setShowCustomSentences] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
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
      } else if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
        validFiles.push(f);
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
      setText('');
    }
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

  const isCompare = task === 'compare';
  const showSummaryControls = task === 'summarize';
  const ctaLabel = CTA_LABELS[task];
  const canSubmit = (files.length > 0 || text.trim().length > 0) && !fileError && !isCompare;

  const hasDocA = !!compareA || compareAText.trim().length > 0;
  const hasDocB = !!compareB || compareBText.trim().length > 0;
  const canCompare = hasDocA && hasDocB;
  const handleCompare = () => {
    if (!canCompare || !onCompare) return;
    onCompare({ file: compareA, text: compareAText }, { file: compareB, text: compareBText }, compareFocus);
  };
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const selectedStyle = STYLE_OPTIONS.find(opt => opt.value === style)?.label || 'Paragraph';
  const selectedLength = LENGTH_OPTIONS.find(opt => opt.value === length)?.label || 'Medium';
  const selectedTone = TONE_OPTIONS.find(opt => opt.value === tone)?.label || 'Professional';
  const hasMoreOptions =
    customInstructions.trim() ||
    focusArea !== 'General' ||
    Object.values(includePrefs).some(Boolean);

  const buildCustomInstructions = () => {
    const parts: string[] = [];
    if (customInstructions.trim()) parts.push(customInstructions.trim());
    if (focusArea !== 'General') parts.push(`Focus area: ${focusArea}.`);
    const included = INCLUDE_OPTIONS
      .filter(opt => includePrefs[opt.key])
      .map(opt => opt.label.replace('Include ', '').toLowerCase());
    if (included.length) parts.push(`Include: ${included.join(', ')}.`);
    return parts.join('\n');
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(files, text.trim() || null, sentences, style, buildCustomInstructions(), length, tone);
  };

  const toggleMenu = (menu: MenuKey) => {
    setOpenMenu(current => current === menu ? null : menu);
  };

  const setValidatedSentences = (value: number) => {
    if (!Number.isFinite(value)) return;
    setSentences(Math.min(50, Math.max(1, Math.round(value))));
  };

  const toggleIncludePref = (key: string) => {
    setIncludePrefs(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div
      className={`upload-area composer-card animate-in ${dragOver ? 'composer-card--drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="upload-area-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <h2>{isCompare ? 'Add two documents to compare' : 'Add your content'}</h2>
      </div>

      {isCompare && (
        <div className="compare-block">
          <div className="compare-cols">
            <CompareDoc label="Document A" file={compareA} inputRef={compareARef} onPick={setCompareA} text={compareAText} onText={setCompareAText} />
            <CompareDoc label="Document B" file={compareB} inputRef={compareBRef} onPick={setCompareB} text={compareBText} onText={setCompareBText} />
          </div>
          <input
            className="text-input compare-focus-input"
            placeholder="Optional: focus the comparison (e.g. pricing terms, risks, methodology)…"
            value={compareFocus}
            onChange={(e) => setCompareFocus(e.target.value)}
          />
          <div className="compare-cta-row">
            <button type="button" className="btn btn-primary summarize-btn" onClick={handleCompare} disabled={!canCompare}>
              <ScalesIcon />
              Compare Documents
            </button>
            {!canCompare && <span className="compare-soon-note">Add a file or text to both documents to compare.</span>}
          </div>
        </div>
      )}

      {!isCompare && (
      <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTS.join(',')}
        onChange={onFileChange}
        style={{ display: 'none' }}
        id="file-input"
        multiple
      />

      <div className={`textarea-wrapper ${files.length > 0 ? 'dimmed' : ''}`}>
        <textarea
          id="text-input"
          className="text-input"
          placeholder="Paste text or ask DocSumm to summarize a document..."
          value={text}
          onChange={(e) => { setText(e.target.value); if (e.target.value) setFiles([]); }}
          disabled={files.length > 0}
          rows={6}
        />
      </div>

      {(files.length > 0 || (text && files.length === 0)) && (
        <div className="composer-meta-row">
          {files.length > 0 ? (
            <div className="file-chip-list">
              {files.map((file, idx) => (
                <span key={idx} className="file-chip" title={file.name}>
                  <FileIcon />
                  <span>{file.name}</span>
                  <button id={`remove-file-${idx}`} type="button" onClick={() => removeFile(idx)} aria-label={`Remove ${file.name}`}>
                    <XIcon />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-meta">
              <span>{text.length} chars / {wordCount} words</span>
              <button id="clear-text-btn" className="clear-text-btn" type="button" onClick={() => setText('')}>Clear</button>
            </div>
          )}
        </div>
      )}

      {fileError && (
        <div className="error-banner composer-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {fileError}
        </div>
      )}

      <div className="control-toolbar">
        <div className="control-group" aria-label="Summary customization controls">
          <button id="browse-btn" type="button" className="toolbar-btn attach-btn" onClick={() => fileInputRef.current?.click()}>
            <PaperclipIcon />
            Attach file
          </button>

          {showSummaryControls && (
          <>
          <div className="menu-control">
            <button type="button" className="toolbar-btn" onClick={() => toggleMenu('style')} aria-expanded={openMenu === 'style'}>
              <span>Style: {selectedStyle}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'style' && (
              <MenuList>
                {STYLE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} active={style === opt.value} onClick={() => { setStyle(opt.value); setOpenMenu(null); }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </MenuList>
            )}
          </div>

          <div className="menu-control">
            <button type="button" className="toolbar-btn" onClick={() => toggleMenu('length')} aria-expanded={openMenu === 'length'}>
              <span>Length: {selectedLength}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'length' && (
              <MenuList>
                {LENGTH_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} active={length === opt.value} onClick={() => { setLength(opt.value); setOpenMenu(null); }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </MenuList>
            )}
          </div>

          <div className="menu-control">
            <button type="button" className="toolbar-btn" onClick={() => toggleMenu('tone')} aria-expanded={openMenu === 'tone'}>
              <span>Tone: {selectedTone}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'tone' && (
              <MenuList>
                {TONE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} active={tone === opt.value} onClick={() => { setTone(opt.value); setOpenMenu(null); }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </MenuList>
            )}
          </div>

          <div className="menu-control">
            <button type="button" className="toolbar-btn" onClick={() => toggleMenu('sentences')} aria-expanded={openMenu === 'sentences'}>
              <span>Sentences: {sentences}</span>
              <ChevronIcon />
            </button>
            {openMenu === 'sentences' && (
              <MenuList compact>
                {SENTENCE_OPTIONS.map(opt => (
                  <MenuItem key={opt} active={sentences === opt && !showCustomSentences} onClick={() => { setSentences(opt); setShowCustomSentences(false); setOpenMenu(null); }}>
                    {opt}
                  </MenuItem>
                ))}
                <button
                  type="button"
                  className={`menu-item ${showCustomSentences || !SENTENCE_OPTIONS.includes(sentences) ? 'active' : ''}`}
                  onClick={() => setShowCustomSentences(true)}
                >
                  <span>Custom</span>
                </button>
                {showCustomSentences && (
                  <label className="custom-sentence-field">
                    <span>Sentences</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sentences}
                      onChange={(e) => setValidatedSentences(Number(e.target.value))}
                      onBlur={() => setValidatedSentences(sentences)}
                    />
                  </label>
                )}
              </MenuList>
            )}
          </div>

          <div className="menu-control more-options">
            <button
              type="button"
              className={`toolbar-btn more-options-btn ${openMenu === 'more' || hasMoreOptions ? 'active' : ''}`}
              onClick={() => toggleMenu('more')}
              aria-expanded={openMenu === 'more'}
            >
              More options
              {hasMoreOptions && <span className="active-dot" aria-label="Advanced options active" />}
              <ChevronIcon />
            </button>
            {openMenu === 'more' && (
              <div className="more-options-popover">
                <div className="more-options-section">
                  <label htmlFor="custom-instructions" className="more-options-label">Custom instructions</label>
                  <textarea
                    id="custom-instructions"
                    className="text-input custom-instructions-input"
                    placeholder='e.g. "Focus on business risks" or "Explain for a beginner"'
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="more-options-section">
                  <span className="more-options-label">Focus area</span>
                  <div className="focus-chip-grid">
                    {FOCUS_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={`focus-chip ${focusArea === option ? 'active' : ''}`}
                        onClick={() => setFocusArea(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="more-options-hint">Detail level uses the Length control in the toolbar.</p>

                <div className="more-options-section">
                  <span className="more-options-label">Include</span>
                  <div className="include-options">
                    {INCLUDE_OPTIONS.map(option => (
                      <label key={option.key} className="include-option">
                        <input
                          type="checkbox"
                          checked={includePrefs[option.key]}
                          onChange={() => toggleIncludePref(option.key)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>

        <button id="summarize-btn" className="btn btn-primary summarize-btn" onClick={handleSubmit} disabled={!canSubmit}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          {ctaLabel}
        </button>
      </div>
      </>
      )}
    </div>
  );
};

const CompareDoc: React.FC<{
  label: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File | null) => void;
  text: string;
  onText: (t: string) => void;
}> = ({ label, file, inputRef, onPick, text, onText }) => (
  <div className={`compare-doc ${file ? 'has-file' : ''}`}>
    <div className="compare-doc-head">
      <span className="compare-doc-label">{label}</span>
      <button type="button" className="toolbar-btn attach-btn" onClick={() => inputRef.current?.click()}>
        <PaperclipIcon />
        {file ? 'Change file' : 'Attach'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTS.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </div>
    {file ? (
      <div className="compare-doc-file">
        <span className="file-chip" title={file.name}>
          <FileIcon />
          <span>{file.name}</span>
          <button type="button" onClick={() => onPick(null)} aria-label={`Remove ${file.name}`}><XIcon /></button>
        </span>
      </div>
    ) : (
      <textarea
        className="text-input compare-doc-textarea"
        placeholder={`Paste ${label} text, or attach a PDF, DOCX, or TXT…`}
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={5}
      />
    )}
  </div>
);

const ScalesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M5 21h14M3 7l4-4 4 4M21 7l-4-4-4 4"/>
    <path d="M3 7l-2 6a4 4 0 0 0 8 0L7 7M21 7l-2 6a4 4 0 0 0 8 0"/>
  </svg>
);

const MenuList: React.FC<{ children: React.ReactNode; compact?: boolean }> = ({ children, compact }) => (
  <div className={`menu-list ${compact ? 'menu-list--compact' : ''}`}>
    {children}
  </div>
);

const MenuItem: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" className={`menu-item ${active ? 'active' : ''}`} onClick={onClick}>
    <span>{children}</span>
    {active && (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )}
  </button>
);

const ChevronIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05 12 20.49a6 6 0 0 1-8.49-8.49l9.9-9.9a4 4 0 0 1 5.66 5.66l-9.9 9.9a2 2 0 1 1-2.83-2.83l8.49-8.49"/>
  </svg>
);

export default UploadArea;
