import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Send } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/InputGroup';
import FacultyDirectory from './FacultyDirectory';

const EXAM_TYPES = ['MTE', 'TEE', 'CAT-1', 'CAT-2', 'FAT'];
const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26'];

const getPaperUrls = (url) => {
  if (!url) return [];
  if (Array.isArray(url)) return url;
  if (typeof url === 'string') {
    if (url.includes(',')) {
      return url.split(',').map(u => u.trim()).filter(Boolean);
    }
    return [url];
  }
  return [];
};

const isImageUrl = (url) => {
  if (!url) return false;
  const urls = getPaperUrls(url);
  if (urls.length === 0) return false;
  const imageRegex = /\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i;
  return urls.every(u => imageRegex.test(u) || u.includes('/image/upload/'));
};

const loadTesseract = () => {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = (err) => reject(new Error('Failed to load OCR engine.'));
    document.head.appendChild(script);
  });
};

const loadJsPDF = () => {
  return new Promise((resolve, reject) => {
    if (window.jspdf) {
      resolve(window.jspdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf);
    script.onerror = (err) => reject(new Error('Failed to load PDF engine.'));
    document.head.appendChild(script);
  });
};

const preprocessCanvasForOCR = (canvas) => {
  try {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to high-contrast grayscale & binarization (black text on white paper)
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = gray < 160 ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.warn('OCR preprocessing warning:', e);
  }
  return canvas;
};

const cleanOCRText = (text) => {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      // Filter out noisy gibberish lines with few real characters
      const alphaNum = (line.match(/[a-zA-Z0-9]/g) || []).length;
      return alphaNum >= 3 || line.length > 8;
    })
    .join('\n');
};

const getImageDimensions = (base64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 1130 }); // Default A4 ratio fallback
    };
  });
};

const convertImagesToPDF = async (base64Images) => {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  
  // Create a new PDF document. Default is A4 size.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < base64Images.length; i++) {
    const base64 = base64Images[i];
    
    // Add page if it is not the first one
    if (i > 0) {
      doc.addPage();
    }

    try {
      const dimensions = await getImageDimensions(base64);
      const ratio = dimensions.width / dimensions.height;
      
      let imgWidth = pageWidth;
      let imgHeight = pageWidth / ratio;
      
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = pageHeight * ratio;
      }
      
      // Center the image on the page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      
      doc.addImage(base64, 'JPEG', x, y, imgWidth, imgHeight);
    } catch (err) {
      console.error('Failed to add image to PDF:', err);
      // Fallback: add image at full page dimensions
      doc.addImage(base64, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
  }

  // Generate standard base64 DataURL of the compiled PDF from blob to avoid extra filename parameter in header
  const pdfBlob = doc.output('blob');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(pdfBlob);
  });
};

const loadPdfJS = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      try {
        if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
      } catch (e) {
        console.warn('PDF.js worker setup warning:', e);
      }
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => reject(new Error('Failed to load PDF reader engine.'));
    document.head.appendChild(script);
  });
};

const loadPdfLib = () => {
  return new Promise((resolve, reject) => {
    if (window.PDFLib) {
      resolve(window.PDFLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    script.onload = () => resolve(window.PDFLib);
    script.onerror = (err) => reject(new Error('Failed to load PDF compiler engine.'));
    document.head.appendChild(script);
  });
};

const extractTextFromPDF = async (arrayBuffer, tesseractWorker) => {
  const pdfjsLib = await loadPdfJS();
  const uint8Data = new Uint8Array(arrayBuffer);
  
  let loadingTask;
  try {
    loadingTask = pdfjsLib.getDocument({ data: uint8Data });
  } catch (err) {
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  }
  
  const pdf = await loadingTask.promise;
  let combinedText = '';
  
  const maxPages = Math.min(pdf.numPages, 5);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    let pageText = '';
    try {
      const textContent = await page.getTextContent();
      pageText = textContent.items.map(item => item.str).join(' ');
    } catch (tErr) {
      console.warn(`Text extraction failed for page ${i}:`, tErr);
    }
    
    combinedText += pageText + '\n';
    
    // Perform OCR if text is sparse (< 200 chars) or missing course code
    const isSparse = pageText.trim().length < 200;
    const hasCourseCode = /\b[A-Za-z]{3,4}\d{3,4}\b/.test(pageText);
    
    if ((isSparse || !hasCourseCode) && tesseractWorker) {
      try {
        const viewport = page.getViewport({ scale: 2.0 }); // 2.0x scale for sharp OCR
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        // High-contrast binarization preprocessing before OCR
        preprocessCanvasForOCR(canvas);
        
        const ocrResult = await tesseractWorker.recognize(canvas);
        if (ocrResult && ocrResult.data && ocrResult.data.text) {
          combinedText += ocrResult.data.text + '\n';
        }
      } catch (ocrErr) {
        console.warn(`OCR page render failed for PDF page ${i}:`, ocrErr);
      }
    }
  }
  
  return cleanOCRText(combinedText);
};

const mergePDFs = async (pdfArrayBuffers) => {
  const PDFLib = await loadPdfLib();
  const { PDFDocument } = PDFLib;
  
  const mergedPdf = await PDFDocument.create();
  
  for (const buffer of pdfArrayBuffers) {
    const srcPdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const parsePaperText = (text, existingPapers) => {
  const result = {};
  if (!text) return result;
  
  // 1. Extract Course Code (e.g. MAT3002, CSE101, CSD2001)
  const codeMatch = text.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    result.courseCode = code;
    
    // Check if we can autofill the title from existing papers database
    const match = existingPapers.find(p => p.courseCode && p.courseCode.trim().toUpperCase() === code);
    if (match && match.courseTitle) {
      result.courseTitle = match.courseTitle;
    }
  }

  // 2. Extract Exam Type
  const lowerText = text.toLowerCase();
  if (lowerText.includes('mid term') || lowerText.includes('mte') || lowerText.includes('midterm')) {
    result.examType = 'MTE';
  } else if (lowerText.includes('term end') || lowerText.includes('tee') || lowerText.includes('fat') || lowerText.includes('final assessment')) {
    result.examType = 'TEE';
  } else if (lowerText.includes('cat 1') || lowerText.includes('cat-1')) {
    result.examType = 'CAT-1';
  } else if (lowerText.includes('cat 2') || lowerText.includes('cat-2')) {
    result.examType = 'CAT-2';
  }

  // 3. Extract Exam Month
  const monthRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i;
  const monthMatch = text.match(monthRegex);
  if (monthMatch) {
    const raw = monthMatch[1].toLowerCase();
    const monthMap = {
      jan: 'Jan', january: 'Jan',
      feb: 'Feb', february: 'Feb',
      mar: 'Mar', march: 'Mar',
      apr: 'Apr', april: 'Apr',
      may: 'May',
      jun: 'Jun', june: 'Jun',
      jul: 'Jul', july: 'Jul',
      aug: 'Aug', august: 'Aug',
      sep: 'Sept', sept: 'Sept', september: 'Sept',
      oct: 'Oct', october: 'Oct',
      nov: 'Nov', november: 'Nov',
      dec: 'Dec', december: 'Dec'
    };
    result.month = monthMap[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1, 3));
  }

  // 4. Extract Academic Year (e.g., 2024-25, 2025-26)
  const yearMatch = text.match(/\b(202\d)[-/](2\d)\b/);
  if (yearMatch) {
    result.year = `${yearMatch[1]}-${yearMatch[2]}`;
  } else {
    const fullYearMatch = text.match(/\b(202\d)[-/](202\d)\b/);
    if (fullYearMatch) {
      result.year = `${fullYearMatch[1]}-${fullYearMatch[2].substring(2)}`;
    }
  }

  // 5. Extract Semester
  const semMatch = text.match(/\bsem(?:ester)?\s*([0-9IVX]+)\b/i);
  if (semMatch) {
    const semVal = semMatch[1].toUpperCase();
    if (semVal === 'I' || semVal === '1') result.semester = '1';
    else if (semVal === 'II' || semVal === '2') result.semester = '2';
    else if (semVal === 'III' || semVal === '3') result.semester = '3';
    else if (semVal === 'IV' || semVal === '4') result.semester = '4';
    else if (semVal === 'V' || semVal === '5') result.semester = '5';
    else if (semVal === 'VI' || semVal === '6') result.semester = '6';
  } else {
    const alternateSemMatch = text.match(/\b([1-9])(?:st|nd|rd|th)?\s*sem(?:ester)?\b/i);
    if (alternateSemMatch) {
      result.semester = alternateSemMatch[1];
    }
  }

  return result;
};

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/* ── MEMOIZED SUB-COMPONENTS FOR HIGH PERFORMANCE ── */

/**
 * FilterDropdown Component
 * Isolates open/close popover state & portal calculations to prevent main page re-renders.
 */
const FilterDropdown = memo(function FilterDropdown({ value, options, onChange, allLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  const toggleDropdown = useCallback(() => {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(10, rect.left)
      });
    }
    setIsOpen(prev => !prev);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        popoverRef.current && !popoverRef.current.contains(event.target) &&
        btnRef.current && !btnRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback((val) => {
    onChange(val);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <button
        ref={btnRef}
        onClick={toggleDropdown}
        style={{
          width: '100%',
          padding: '0.65rem 0.9rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }}
      >
        <span>{value ? value : allLabel}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="base-nav-menu-popover"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '160px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: '#121215',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '14px',
            padding: '0.45rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          <button
            onClick={() => handleSelect('')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.38rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: value === '' ? 700 : 500,
              color: value === '' ? '#38bdf8' : '#e2e8f0',
              background: value === '' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{allLabel}</span>
            {value === '' && <span style={{ color: '#38bdf8' }}>✓</span>}
          </button>
          {options.map(opt => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.38rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#38bdf8' : '#e2e8f0',
                  background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{opt}</span>
                {isSelected && <span style={{ color: '#38bdf8' }}>✓</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
});

/**
 * CourseGroupCard Component
 * Memoized card item for PYQ Grid.
 */
const CourseGroupCard = memo(function CourseGroupCard({ group, onSelect }) {
  const handleClick = useCallback(() => {
    onSelect(group.courseCode);
  }, [group.courseCode, onSelect]);

  return (
    <div
      className="pyq-paper-card"
      onClick={handleClick}
      style={{ cursor: 'pointer', gap: '0.8rem', display: 'flex', flexDirection: 'column' }}
    >
      <div className="paper-card-header">
        <span className="paper-sem-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid hsla(var(--border-glass))', color: 'hsl(var(--text-secondary))' }}>
          Sem {group.semester}
        </span>
        <span className="paper-count-badge" style={{ background: 'hsla(var(--primary) / 0.12)', color: 'hsl(var(--primary))', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid hsla(var(--primary) / 0.25)', fontFamily: 'var(--font-accent)' }}>
          {group.papersList.length} {group.papersList.length === 1 ? 'Paper' : 'Papers'}
        </span>
      </div>
      
      <div className="paper-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexGrow: 1 }}>
        <h4 className="paper-code">
          {group.courseCode}
        </h4>
        <p className="paper-title" title={group.courseTitle} style={{ margin: '0.25rem 0 0.5rem 0', height: '2.8rem' }}>
          {group.courseTitle}
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--primary))', gap: '0.25rem', marginTop: 'auto' }}>
        <span>View Papers</span>
        <span style={{ transition: 'transform 0.2s' }}>→</span>
      </div>
    </div>
  );
});

/**
 * PaperFileItem Component
 * Memoized single paper item row in course sub-page view.
 */
const PaperFileItem = memo(function PaperFileItem({ paper, user, onDelete }) {
  const badgeProps = useMemo(() => {
    const t = (paper.examType || '').toUpperCase();
    if (t.includes('MTE')) {
      return { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.08))', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#f59e0b' };
    }
    if (t.includes('TEE') || t.includes('FAT')) {
      return { bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(109, 40, 217, 0.08))', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#a78bfa' };
    }
    return { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(4, 120, 87, 0.08))', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981' };
  }, [paper.examType]);

  const urls = useMemo(() => getPaperUrls(paper.url), [paper.url]);

  const handleOpenPaper = useCallback((e) => {
    e.stopPropagation();
    for (let i = 1; i < urls.length; i++) {
      window.open(urls[i], '_blank');
    }
  }, [urls]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(paper._id);
  }, [paper._id, onDelete]);

  return (
    <div 
      className="paper-file-item" 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        padding: '1.2rem 1.4rem', 
        background: 'hsla(var(--bg-card) / 0.55)', 
        backdropFilter: 'blur(12px)',
        border: '1px solid hsla(var(--border-glass))', 
        borderRadius: '16px', 
        boxShadow: '0 8px 32px -10px rgba(0,0,0,0.3)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.35)';
        e.currentTarget.style.boxShadow = '0 12px 40px -10px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'hsla(var(--border-glass))';
        e.currentTarget.style.boxShadow = '0 8px 32px -10px rgba(0,0,0,0.3)';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.2rem 0.65rem', fontSize: '0.68rem', borderRadius: '6px', background: badgeProps.bg, border: badgeProps.border, color: badgeProps.color, fontWeight: '700', letterSpacing: '0.02em' }}>
            {paper.examType}
          </span>
          {paper.status === 'pending' && (
            <span style={{ 
              padding: '0.2rem 0.65rem', 
              fontSize: '0.68rem', 
              borderRadius: '6px', 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.08))', 
              border: '1px solid rgba(245, 158, 11, 0.35)', 
              color: '#f59e0b', 
              fontWeight: '700', 
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              ⏳ In Process
            </span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: '600' }}>
            Year {paper.year}
          </span>
          {paper.month && (
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--secondary))', fontWeight: '700', background: 'hsla(var(--secondary) / 0.08)', border: '1px solid hsla(var(--secondary) / 0.25)', padding: '0.15rem 0.55rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              🗓️ {paper.month}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          👤 Contributed by {paper.uploadedBy || 'Community'}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <a
          href={urls[0] || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="paper-btn download"
          onClick={handleOpenPaper}
          style={{
            margin: 0,
            padding: '0.5rem 1.15rem',
            fontSize: '0.8rem',
            borderRadius: '10px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, hsl(var(--primary)), #4f46e5)',
            border: 'none',
            color: '#fff',
            boxShadow: '0 4px 12px hsla(var(--primary) / 0.25)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px hsla(var(--primary) / 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px hsla(var(--primary) / 0.25)';
          }}
        >
          📖 Open Paper {urls.length > 1 ? `(${urls.length} Pages)` : ''}
        </a>
        {user && user.role === 'admin' && (
          <button
            className="paper-btn delete"
            onClick={handleDelete}
            title="Delete Paper"
            style={{
              position: 'static',
              padding: '0.5rem 1.15rem',
              fontSize: '0.8rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
            }}
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * ModerationCard Component
 * Memoized card item for Admin Moderation Queue.
 */
const ModerationCard = memo(function ModerationCard({ paper, onApprove, onDelete }) {
  const urls = useMemo(() => getPaperUrls(paper.url), [paper.url]);

  const handleOpenDoc = useCallback((e) => {
    for (let i = 1; i < urls.length; i++) {
      window.open(urls[i], '_blank');
    }
  }, [urls]);

  const handleApprove = useCallback(() => {
    onApprove(paper._id);
  }, [paper._id, onApprove]);

  const handleDelete = useCallback(() => {
    onDelete(paper._id);
  }, [paper._id, onDelete]);

  return (
    <div className="moderation-card">
      <div className="moderation-card-header">
        <span className="mod-badge code">{paper.courseCode}</span>
        <span className="mod-badge dept">{paper.department}</span>
      </div>
      <h4>{paper.courseTitle}</h4>
      <p className="mod-meta">
        Type: <strong>{paper.examType}</strong> | Year: <strong>{paper.year}</strong> | Sem: <strong>{paper.semester}</strong>
      </p>
      <p className="mod-uploader">
        Uploaded by: {paper.uploadedBy}
        {paper.uploaderIp && (
          <span style={{ display: 'block', color: 'hsl(var(--danger))', fontSize: '0.75rem', marginTop: '0.15rem', fontWeight: 600 }}>
            📍 IP: {paper.uploaderIp}
          </span>
        )}
        {paper.month && (
          <span style={{ display: 'block', color: 'hsl(var(--secondary))', fontSize: '0.75rem', marginTop: '0.15rem', fontWeight: 600 }}>
            🗓️ Month: {paper.month}
          </span>
        )}
      </p>
      <div className="moderation-actions">
        <a
          href={urls[0] || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="mod-action-btn view"
          onClick={handleOpenDoc}
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          🔍 View Doc {urls.length > 1 ? `(${urls.length})` : ''}
        </a>
        <button onClick={handleApprove} className="mod-action-btn approve">
          ✅ Approve
        </button>
        <button onClick={handleDelete} className="mod-action-btn reject">
          ❌ Reject
        </button>
      </div>
    </div>
  );
});

/**
 * ChatMessageItem Component
 * High performance memoized chat message row.
 */
const ChatMessageItem = memo(function ChatMessageItem({ message, currentUser, onLike }) {
  const isSelf = currentUser && message.author === (currentUser.name || currentUser.email);
  const handleLike = useCallback(() => {
    if (onLike) onLike(message.id);
  }, [message.id, onLike]);

  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      padding: '0.85rem 1rem',
      borderRadius: '12px',
      background: isSelf ? 'hsla(var(--primary) / 0.08)' : 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${isSelf ? 'hsla(var(--primary) / 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
      alignItems: 'flex-start',
      transition: 'background 0.2s ease'
    }}>
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: isSelf ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '0.85rem',
        color: '#ffffff',
        flexShrink: 0
      }}>
        {message.avatar || (message.author ? message.author.charAt(0).toUpperCase() : 'U')}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
              {message.author}
            </span>
            {message.role && (
              <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                {message.role}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
            {message.timestamp}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.45', wordBreak: 'break-word' }}>
          {message.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
          <button
            onClick={handleLike}
            style={{
              background: 'transparent',
              border: 'none',
              color: message.liked ? '#f43f5e' : 'hsl(var(--text-muted))',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: 0
            }}
          >
            <span>{message.liked ? '❤️' : '🤍'}</span>
            <span>{message.likes || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * StudentChatSection Component
 * Memoized chat feed and channel manager for Student Chats sub-tab.
 */
const StudentChatSection = memo(function StudentChatSection({ user }) {
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([
    { id: '1', channel: 'general', author: 'Rahul Sharma', avatar: 'R', role: 'CSE 3rd Year', content: 'Hey everyone! Has anyone downloaded the CAT-2 Discrete Mathematics papers from 2024?', timestamp: '10:14 AM', likes: 4, liked: false },
    { id: '2', channel: 'general', author: 'Ananya Verma', avatar: 'A', role: 'ECE 2nd Year', content: 'Yes! Check out the MAT3002 section under PYQ Hub, all sets are updated with OCR text tags.', timestamp: '10:18 AM', likes: 7, liked: true },
    { id: '3', channel: 'pyq-doubts', author: 'Vikram Singh', avatar: 'V', role: 'MECH 4th Year', content: 'Does anyone have solution keys for Thermofluids TEE 2024-25 paper?', timestamp: '11:05 AM', likes: 2, liked: false },
    { id: '4', channel: 'exam-prep', author: 'Priya Nair', avatar: 'P', role: 'CSE 1st Year', content: 'Forming a study group for Data Structures Mid Terms tomorrow at Central Library floor 2. Anyone interested?', timestamp: '11:30 AM', likes: 9, liked: true }
  ]);
  const [chatSearch, setChatSearch] = useState('');
  const [debouncedChatSearch, setDebouncedChatSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedChatSearch(chatSearch), 150);
    return () => clearTimeout(timer);
  }, [chatSearch]);

  const handleLikeMessage = useCallback((id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: m.liked ? m.likes - 1 : m.likes + 1, liked: !m.liked } : m));
  }, []);

  const handleSendMessage = useCallback((e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      id: String(Date.now()),
      channel: activeChannel,
      author: user ? (user.name || user.email) : 'Student',
      avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'S',
      role: user && user.role === 'admin' ? 'Admin' : 'Student',
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0,
      liked: false
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  }, [newMessage, activeChannel, user]);

  const filteredMessages = useMemo(() => {
    let list = messages.filter(m => m.channel === activeChannel);
    const q = debouncedChatSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(m => m.content.toLowerCase().includes(q) || m.author.toLowerCase().includes(q));
    }
    return list;
  }, [messages, activeChannel, debouncedChatSearch]);

  const CHANNELS = [
    { id: 'general', label: 'general-discussion', icon: '💬' },
    { id: 'pyq-doubts', label: 'pyq-doubts-clearing', icon: '📄' },
    { id: 'exam-prep', label: 'exam-prep-groups', icon: '📚' }
  ];

  const activeChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
    <div className="pyq-workspace animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="pyq-header-banner" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))' }}>
        <div className="pyq-banner-content">
          <h2>💬 Student Community Chats & Study Circles</h2>
          <p>Real-time peer discussions, course doubt-solving, and study group coordination.</p>
        </div>
      </div>

      <div className="chat-layout-grid">
        {/* Sidebar Channels */}
        <div className="chat-channels-sidebar">
          <span className="chat-channels-title">
            Channels
          </span>
          <div className="chat-channels-list">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`chat-channel-btn ${activeChannel === ch.id ? 'active' : ''}`}
              >
                <span>{ch.icon}</span>
                <span>#{ch.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="chat-feed-box">
          {/* Header & Filter */}
          <div className="chat-feed-header">
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--text-primary))' }}>
              #{activeChannelObj.label}
            </h4>
            <div className="chat-search-input-box">
              <InputGroup style={{ height: '34px' }}>
                <InputGroupAddon align="inline-start">
                  <Search size={14} />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder="Filter messages..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  style={{ fontSize: '0.78rem' }}
                />
              </InputGroup>
            </div>
          </div>

          {/* Messages list */}
          <div className="chat-messages-scroll-area">
            {filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'hsl(var(--text-muted))' }}>
                <span>💬</span>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>No messages found in this channel.</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  currentUser={user}
                  onLike={handleLikeMessage}
                />
              ))
            )}
          </div>

          {/* Message input form */}
          <form onSubmit={handleSendMessage} className="chat-message-form">
            <input
              type="text"
              placeholder={`Message #${activeChannelObj.label}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="chat-input-field"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="chat-send-btn"
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

/* ── MAIN COMMUNITY PAGE COMPONENT ── */

function CommunityPage({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('pyq'); // 'pyq' | 'chats' | 'marketplace'
  const [papers, setPapers] = useState([]);
  const [pendingPapers, setPendingPapers] = useState([]);

  // Search input state (immediate for input field) and debounced search state (for heavy filtering index)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // 50ms search debounce handler
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 50);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [selectedCourseCode, setSelectedCourseCode] = useState(null);

  // Chunked loading / progressive rendering state (20 courses per chunk)
  const [visibleChunkCount, setVisibleChunkCount] = useState(20);
  const sentinelRef = useRef(null);
  const uploadSuccessTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (uploadSuccessTimerRef.current) clearTimeout(uploadSuccessTimerRef.current);
    };
  }, []);

  // Reset chunk count whenever search query or filters change
  useEffect(() => {
    setVisibleChunkCount(20);
  }, [debouncedQuery, filterExamType, filterYear, activeSubTab]);

  // Fetch ALL papers once — filtering is client-side (instant, no re-fetch per keystroke)
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/papers', { headers });
      if (!res.ok) {
        setPapers([]);
        return;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setPapers(data.papers || []);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingPapers = useCallback(async () => {
    try {
      const token = localStorage.getItem('ds_ai_token');
      const res = await fetch('/api/papers/moderation', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPendingPapers(data.papers || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending papers:', err);
    }
  }, []);

  // Pre-indexed Course Groups (built once whenever papers array changes)
  const indexedCourseGroups = useMemo(() => {
    const groupMap = new Map();
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      const code = (paper.courseCode || '').trim().toUpperCase();
      if (!code) continue;

      let group = groupMap.get(code);
      if (!group) {
        group = {
          courseCode: code,
          courseTitle: paper.courseTitle || code,
          department: paper.department,
          semester: paper.semester,
          searchText: `${code} ${paper.courseTitle || ''} ${paper.department || ''}`.toLowerCase(),
          papersList: []
        };
        groupMap.set(code, group);
      }
      group.papersList.push(paper);
    }
    return Array.from(groupMap.values());
  }, [papers]);

  // High-performance search list indexing & filter calculation
  const filteredCourseGroups = useMemo(() => {
    let groups = indexedCourseGroups;
    const q = debouncedQuery.trim().toLowerCase();

    if (q) {
      groups = groups.filter(group => group.searchText.includes(q));
    }

    if (filterExamType || filterYear) {
      groups = groups.map(group => {
        let matchingPapers = group.papersList;
        if (filterExamType) {
          matchingPapers = matchingPapers.filter(p => p.examType === filterExamType);
        }
        if (filterYear) {
          matchingPapers = matchingPapers.filter(p => p.year === filterYear);
        }
        if (matchingPapers.length === 0) return null;
        return {
          ...group,
          papersList: matchingPapers
        };
      }).filter(Boolean);
    }

    return groups;
  }, [indexedCourseGroups, debouncedQuery, filterExamType, filterYear]);

  // Total matching papers count across filtered groups
  const totalFilteredPapersCount = useMemo(() => {
    return filteredCourseGroups.reduce((sum, g) => sum + g.papersList.length, 0);
  }, [filteredCourseGroups]);

  const visibleCourseGroups = useMemo(() => {
    return filteredCourseGroups.slice(0, visibleChunkCount);
  }, [filteredCourseGroups, visibleChunkCount]);

  // Derived selected course group
  const selectedCourseGroup = useMemo(() => {
    if (!selectedCourseCode) return null;
    const coursePapers = papers.filter(p => (p.courseCode || '').trim().toUpperCase() === selectedCourseCode);
    if (coursePapers.length === 0) return null;
    return {
      courseCode: selectedCourseCode,
      courseTitle: coursePapers[0].courseTitle || selectedCourseCode,
      semester: coursePapers[0].semester,
      papersList: coursePapers
    };
  }, [selectedCourseCode, papers]);

  // IntersectionObserver to auto-load next chunk when scrolling near end
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleChunkCount < filteredCourseGroups.length) {
        setVisibleChunkCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleChunkCount, filteredCourseGroups.length]);

  // Network fetch on initial mount and when admin status changes
  useEffect(() => {
    fetchPapers();
    if (user && user.role === 'admin') fetchPendingPapers();
  }, [fetchPapers, fetchPendingPapers, user]);

  useEffect(() => {
    if (showUploadModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUploadModal]);

  const readAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const readAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFiles || selectedFiles.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    setUploadLoading(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      
      const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
      const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

      const uploadTasks = [];

      // 1. Initialize Tesseract worker
      setSuccess('⚙️ Initializing analysis engine...');
      const Tesseract = await loadTesseract();
      const worker = await Tesseract.createWorker('eng');

      // 2. Prepare Task for Images
      if (imageFiles.length > 0) {
        setSuccess(`🔍 Analyzing ${imageFiles.length} images...`);
        const imageDatas = [];
        let fullTextCombined = '';

        for (const file of imageFiles) {
          const base64Data = await compressImage(file);
          imageDatas.push(base64Data);

          try {
            const ret = await worker.recognize(base64Data);
            if (ret.data && ret.data.text) {
              fullTextCombined += ret.data.text + '\n';
            }
          } catch (ocrErr) {
            console.warn('OCR page scan failed:', ocrErr);
          }
        }

        const detected = parsePaperText(fullTextCombined, papers);
        const courseCodeVal = detected.courseCode || 'UNKNOWN';
        const courseTitleVal = detected.courseTitle || 'Scanned Question Paper';
        const examTypeVal = detected.examType || 'MTE';
        const yearVal = detected.year || '2024-25';
        const semesterVal = detected.semester || '1';

        uploadTasks.push({
          type: 'images',
          fileName: `${courseCodeVal.toLowerCase()}_scanned_${Date.now()}.pdf`,
          courseCode: courseCodeVal,
          courseTitle: courseTitleVal,
          examType: examTypeVal,
          year: yearVal,
          month: detected.month || null,
          semester: semesterVal,
          fullText: fullTextCombined,
          compileFileData: async () => {
            return await convertImagesToPDF(imageDatas);
          }
        });
      }

      // 3. Prepare Task for each PDF
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        setSuccess(`🔍 Analyzing PDF ${i + 1} of ${pdfFiles.length}: ${file.name}...`);

        if (file.size > 3.3 * 1024 * 1024) {
          throw new Error(`PDF file "${file.name}" is too large (maximum 3.3MB). Please compress the PDF first.`);
        }

        const arrayBuffer = await readAsArrayBuffer(file);
        let fullTextCombined = '';

        try {
          const extractedText = await extractTextFromPDF(arrayBuffer, worker);
          if (extractedText) {
            fullTextCombined = extractedText;
          }
        } catch (pdfReadErr) {
          console.warn('Failed to extract text from PDF:', pdfReadErr);
        }

        const detected = parsePaperText(fullTextCombined, papers);
        let courseCodeVal = detected.courseCode;
        if (!courseCodeVal) {
          const nameCodeMatch = file.name.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
          courseCodeVal = nameCodeMatch ? nameCodeMatch[1].toUpperCase() : 'UNKNOWN';
        }
        const courseTitleVal = detected.courseTitle || file.name.replace(/\.[^/.]+$/, "");
        const examTypeVal = detected.examType || 'MTE';
        const yearVal = detected.year || '2024-25';
        const semesterVal = detected.semester || '1';

        uploadTasks.push({
          type: 'pdf',
          fileName: file.name,
          courseCode: courseCodeVal,
          courseTitle: courseTitleVal,
          examType: examTypeVal,
          year: yearVal,
          month: detected.month || null,
          semester: semesterVal,
          fullText: fullTextCombined,
          compileFileData: async () => {
            return await readAsDataURL(file);
          }
        });
      }

      await worker.terminate();

      // 4. Run all upload tasks
      let successCount = 0;
      for (let i = 0; i < uploadTasks.length; i++) {
        const task = uploadTasks[i];
        setSuccess(`🚀 Uploading paper ${i + 1} of ${uploadTasks.length}: ${task.fileName}...`);

        const fileData = await task.compileFileData();
        const payload = {
          courseCode: task.courseCode,
          courseTitle: task.courseTitle,
          examType: task.examType,
          year: task.year,
          month: task.month,
          semester: task.semester,
          fileData,
          fileName: task.fileName,
          fullText: task.fullText
        };

        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/papers', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          successCount++;
        } else {
          console.warn(`Failed to submit ${task.fileName}:`, data.error);
          if (uploadTasks.length === 1) {
            throw new Error(data.error || 'Failed to submit paper.');
          }
        }
      }

      setSelectedFiles([]);
      setShowUploadModal(false);
      setSuccess(`Successfully processed ${successCount} paper(s)!`);
      
      if (uploadSuccessTimerRef.current) clearTimeout(uploadSuccessTimerRef.current);
      uploadSuccessTimerRef.current = setTimeout(() => {
        setSuccess('');
      }, 3000);

      fetchPapers();
      if (user && user.role === 'admin') {
        fetchPendingPapers();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process uploads. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleApprovePaper = useCallback(async (id) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('ds_ai_token');
      const res = await fetch(`/api/papers/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve paper.');

      setSuccess('Paper approved successfully!');
      fetchPapers();
      fetchPendingPapers();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchPapers, fetchPendingPapers]);

  const handleDeletePaper = useCallback(async (id) => {
    if (!user || user.role !== 'admin') {
      setError('Unauthorized: Only administrators can delete papers.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this paper?')) return;
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('ds_ai_token');
      const res = await fetch(`/api/papers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete paper.');

      setSuccess('Paper deleted successfully.');
      fetchPapers();
      fetchPendingPapers();
    } catch (err) {
      setError(err.message);
    }
  }, [user, fetchPapers, fetchPendingPapers]);

  const handleSelectCourse = useCallback((code) => {
    setSelectedCourseCode(code);
  }, []);

  return (
    <div className="community-container">
      {/* Upper Navigation Tabs */}
      <div className="community-tabs">
        <button
          className={`community-tab-btn ${activeSubTab === 'pyq' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pyq')}
        >
          📄 PYQ Hub
        </button>
        <button
          className={`community-tab-btn ${activeSubTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('chats')}
        >
          💬 Student Chats
        </button>
        <button
          className={`community-tab-btn ${activeSubTab === 'cabins' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('cabins')}
        >
          🏫 Faculty Cabins
        </button>
        <button
          className={`community-tab-btn ${activeSubTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('marketplace')}
        >
          🛍️ Buy & Sell
        </button>
      </div>

      {activeSubTab === 'pyq' && (
        <div className="pyq-workspace animate-fade-in">
          {/* Top Info Banner (Shown only on main PYQ listing page, hidden inside course view) */}
          {!selectedCourseGroup && (
            <div className="pyq-header-banner">
              <div className="pyq-banner-content">
                <h2>Previous Year Questions (PYQ) Hub</h2>
                <p>Browse, view, and share semester exam papers contributed by the student community.</p>
              </div>
              <button
                className="pyq-upload-trigger-btn"
                onClick={() => setShowUploadModal(true)}
              >
                <span>+</span> Share a Paper
              </button>
            </div>
          )}

          {/* Banner Messages */}
          {error && <div className="aurora-error-banner" style={{ margin: '1rem 0' }}><span>⚠️</span> {error}</div>}
          {success && <div className="aurora-success-banner" style={{ margin: '1rem 0' }}><span>✅</span> {success}</div>}

          {selectedCourseGroup ? (
            /* Sub-page view for the selected course's papers */
            <div className="pyq-subpage-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderBottom: '1px solid hsla(var(--border-glass))', paddingBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setSelectedCourseCode(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid hsla(var(--border-glass))',
                    color: 'hsl(var(--text-secondary))',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '30px',
                    fontWeight: '600',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'hsl(var(--text-primary))';
                    e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.color = 'hsl(var(--text-secondary))';
                    e.currentTarget.style.borderColor = 'hsla(var(--border-glass))';
                  }}
                >
                  ← Back to Courses
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                    {selectedCourseGroup.courseCode}
                  </h3>
                  <span style={{ fontSize: '0.92rem', color: 'hsl(var(--text-secondary))', fontWeight: '500' }}>
                    {selectedCourseGroup.courseTitle}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'hsl(var(--text-muted))', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Available Papers 
                    <span style={{ background: 'hsla(var(--primary) / 0.12)', color: 'hsl(var(--primary))', padding: '0.15rem 0.6rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid hsla(var(--primary) / 0.25)' }}>
                      {selectedCourseGroup.papersList.length}
                    </span>
                  </h4>
                </div>
                
                <div className="paper-files-list scroll-fade-y" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem 0.25rem' }}>
                  {selectedCourseGroup.papersList.map(paper => (
                    <PaperFileItem
                      key={paper._id}
                      paper={paper}
                      user={user}
                      onDelete={handleDeletePaper}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Otherwise show search, filter dropdowns, moderation queue, and course grid */
            <>
              {/* Search and Filters Bento Grid */}
              <div className="pyq-filters-container">
                <InputGroup className="pyq-search-input-group">
                  <InputGroupAddon align="inline-start">
                    <Search size={16} />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="text"
                    placeholder="Search course code (e.g. MAT3002) or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {searchQuery && (
                    <InputGroupAddon align="inline-end">
                      <button onClick={() => setSearchQuery('')} title="Clear search">
                        <X size={14} />
                      </button>
                    </InputGroupAddon>
                  )}
                  <InputGroupAddon align="inline-end">
                    {totalFilteredPapersCount} result{totalFilteredPapersCount !== 1 ? 's' : ''}
                  </InputGroupAddon>
                </InputGroup>
                
                <div className="pyq-filter-dropdowns" style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                  <FilterDropdown
                    value={filterExamType}
                    options={EXAM_TYPES}
                    onChange={setFilterExamType}
                    allLabel="All Exam Types"
                  />
                  <FilterDropdown
                    value={filterYear}
                    options={ACADEMIC_YEARS}
                    onChange={setFilterYear}
                    allLabel="All Years"
                  />
                </div>
              </div>

              {/* Admin Moderation Queue */}
              {user && user.role === 'admin' && pendingPapers.length > 0 && (
                <div className="moderation-panel">
                  <h3>🛡️ Pending Paper Submissions ({pendingPapers.length})</h3>
                  <div className="moderation-grid">
                    {pendingPapers.map(paper => (
                      <ModerationCard
                        key={paper._id}
                        paper={paper}
                        onApprove={handleApprovePaper}
                        onDelete={handleDeletePaper}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Public Papers List */}
              <div className="pyq-list-section scroll-fade-b">
                <h3>Available Question Papers ({totalFilteredPapersCount})</h3>
                {loading ? (
                  <div className="pyq-loading-state">
                    <div className="aurora-spinner" />
                    <p>Loading papers...</p>
                  </div>
                ) : filteredCourseGroups.length === 0 ? (
                  <div className="pyq-empty-state">
                    <span>📂</span>
                    <p>{searchQuery ? `No papers match "${searchQuery}".` : 'No papers found matching the selected criteria.'}</p>
                    <p className="subtitle">{searchQuery ? 'Try a different search term.' : 'Be the first to share one!'}</p>
                  </div>
                ) : (
                  <>
                    <div className="pyq-papers-grid">
                      {visibleCourseGroups.map(group => (
                        <CourseGroupCard
                          key={group.courseCode}
                          group={group}
                          onSelect={handleSelectCourse}
                        />
                      ))}
                    </div>

                    {/* Infinite Scroll Sentinel & Chunk Load Trigger */}
                    {visibleChunkCount < filteredCourseGroups.length && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', marginBottom: '1.5rem' }}>
                        <div ref={sentinelRef} style={{ height: '20px', width: '100%' }} />
                        <button
                          className="pyq-load-more-btn"
                          onClick={() => setVisibleChunkCount(prev => prev + 20)}
                          style={{
                            padding: '0.65rem 1.6rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, hsla(var(--primary) / 0.15), hsla(var(--primary) / 0.05))',
                            border: '1px solid hsla(var(--primary) / 0.3)',
                            color: 'hsl(var(--primary))',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 16px hsla(var(--primary) / 0.12)'
                          }}
                        >
                          <span>Show More Courses ({filteredCourseGroups.length - visibleChunkCount} remaining)</span>
                          <span>↓</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'chats' && (
        <StudentChatSection user={user} />
      )}

      {activeSubTab === 'cabins' && (
        <div className="pyq-workspace animate-fade-in" style={{ paddingBottom: '95px' }}>
          <FacultyDirectory user={user} />
        </div>
      )}

      {activeSubTab === 'marketplace' && (
        <div className="community-locked-section animate-fade-in">
          <div className="locked-card">
            <span className="locked-icon">🔒</span>
            <h2>Buy & Sell Marketplace</h2>
            <p>Peer-to-peer campus marketplace to trade textbooks, bicycles, mattresses, lab coats, and other student essentials.</p>
            <div className="locked-tag">BETA STAGE</div>
          </div>
        </div>
      )}

      {/* ── SHARE A PAPER MODAL ── */}
      {showUploadModal && (
        <div className="aurora-modal-overlay" onClick={() => setShowUploadModal(false)} style={{ padding: 0, zIndex: 99999 }}>
          <div 
            className="aurora-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '100vw', 
              width: '100vw', 
              height: '100vh', 
              maxHeight: '100vh', 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: '0px', 
              border: 'none', 
              background: '#0b0f19', 
              position: 'relative',
              overflowY: 'auto'
            }}
          >
            <div className="aurora-modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid hsla(var(--border-glass))' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'hsl(var(--text-primary))' }}>Share Exam Paper</h3>
              <button 
                className="aurora-modal-close" 
                onClick={() => setShowUploadModal(false)}
                style={{
                  fontSize: '2.5rem',
                  color: '#ef4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  margin: 0
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="aurora-form" style={{ padding: '2rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px', margin: '0 auto', width: '100%', position: 'relative' }}>
              {uploadLoading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(11, 15, 25, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 100, borderRadius: '8px' }}>
                  <span className="aurora-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'hsl(var(--primary))' }} />
                  <span style={{ fontSize: '1rem', color: 'hsl(var(--primary))', fontWeight: 700, letterSpacing: '0.5px' }}>🔍 SCANNING PAPER DETAILS...</span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center', maxWidth: '80%', lineHeight: '1.4' }}>
                    Reading full question paper and cross-checking against database to prevent duplicates. Please wait a moment.
                  </span>
                </div>
              )}

              {error && <div className="aurora-error" style={{ animation: 'shake 0.3s' }}>⚠️ {error}</div>}

              <div className="floating-field active" style={{ border: '1px dashed hsla(var(--border-glass))', padding: '2rem 1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', textAlign: 'center' }}>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  required
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  style={{ display: 'none' }}
                  id="paper-file-upload-input"
                />
                <label htmlFor="paper-file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.8rem' }}>📤</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'hsl(var(--primary))', display: 'block' }}>
                    {selectedFiles.length > 0 
                      ? (selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`) 
                      : 'Upload Question Paper'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '0.4rem' }}>
                    Supports PDF and multiple Images
                  </span>
                </label>
              </div>

              <button type="submit" className="aurora-submit-btn" disabled={uploadLoading} style={{ marginTop: '1rem', padding: '0.75rem 1rem' }}>
                {uploadLoading ? 'Scanning & Submitting...' : 'Upload & Auto-Fill'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CommunityPage);
