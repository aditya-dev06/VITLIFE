import { useState, useEffect, useCallback, useMemo, useRef, memo, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Send } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/InputGroup';
import FacultyDirectory from './FacultyDirectory';
import { encryptText, decryptText } from '../utils/crypto.js';

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
  });
};

export const getSafeAuthorName = (u) => {
  if (!u || u.isGuest) return 'Guest Student';
  if (u.name && typeof u.name === 'string' && u.name.trim()) return u.name.trim();
  if (u.email && typeof u.email === 'string' && u.email.includes('@')) return u.email.split('@')[0];
  if (u.username && typeof u.username === 'string' && u.username.trim()) return u.username.trim();
  return 'Student';
};

export const getUserBatchYear = (user) => {
  if (!user || user.isGuest) return null;

  // 1. Check explicit regNo / registrationNo / regNumber field on user
  const regNo = user.regNo || user.registrationNo || user.regNumber || user.studentId || '';
  if (regNo) {
    const match = String(regNo).trim().match(/^(\d{2})/);
    if (match) return match[1];
  }

  // 2. Parse Email prefix (e.g. 23bce10045@vitbhopal.ac.in or 25bse10012@vitbhopal.ac.in)
  const email = (user.email || '').trim().toLowerCase();
  
  // Starts directly with 2 digits (e.g. 25bce10045...)
  const directMatch = email.match(/^(\d{2})/);
  if (directMatch) return directMatch[1];

  // Regex pattern for VIT Registration number in email (e.g. 25bce10045)
  const regPatternMatch = email.match(/(\d{2})[a-z]{2,4}\d{4,5}/i);
  if (regPatternMatch) return regPatternMatch[1];

  // Any 2 digits after dot/underscore (e.g. aditya.24bse10012)
  const dotPatternMatch = email.split('@')[0].match(/(?:^|[._-])(\d{2})[a-z]+/i);
  if (dotPatternMatch) return dotPatternMatch[1];

  // 3. Check username / name if it starts with 2 digits
  const username = (user.username || user.name || '').trim();
  const unameMatch = username.match(/^(\d{2})/);
  if (unameMatch) return unameMatch[1];

  return null;
};

export const isFacultyOrOfficial = (user) => {
  if (!user || user.isGuest) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  // Explicit faculty roles only
  if (role === 'faculty' || role === 'teacher' || role === 'professor' || role === 'staff') {
    return true;
  }

  // Explicit faculty email prefixes only
  if (email.startsWith('faculty.') || email.startsWith('prof.') || email.startsWith('dr.')) {
    return true;
  }

  return false;
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
 * Helper to get or create persistent guest client ID
 */
const getGuestClientId = () => {
  let id = localStorage.getItem('ds_guest_client_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substr(2, 8);
    localStorage.setItem('ds_guest_client_id', id);
  }
  return id;
};

/**
 * ChatMessageItem Component
 * 1:1 WhatsApp Web style message bubble with Reply Quotes, Voice Notes, Polls, Starred Messages, Edit, Delete, and Reactions.
 */
const ChatMessageItem = memo(function ChatMessageItem({ 
  message, 
  currentUser, 
  onReact, 
  onEdit, 
  onDelete, 
  onReply, 
  onStar, 
  onVotePoll, 
  onForward, 
  onRequireAuth, 
  onPreviewImage 
}) {
  const currentUserId = currentUser && !currentUser.isGuest 
    ? (currentUser._id || currentUser.id || currentUser.email)
    : getGuestClientId();

  const isOwner = Boolean(
    (message.authorId && message.authorId === currentUserId) || 
    (currentUser && !currentUser.isGuest && currentUser.name === message.author)
  );

  const reactions = message.reactions || { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] };
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [showMenu, setShowMenu] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    if (onEdit) onEdit(message.id, editText.trim());
    setIsEditing(false);
  };

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      alert("Copied to clipboard!");
    }
    setShowMenu(false);
  };

  return (
    <div className={`wa-msg-row ${isOwner ? 'sent' : 'received'} animate-fade-in`}>
      <div className={`wa-msg-bubble ${isOwner ? 'sent' : 'received'}`}>
        {/* Header Name for Received Messages */}
        {!isOwner && (
          <div className="wa-msg-author">
            {message.author}
            {message.role && (
              <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#aebac1' }}>
                {message.role}
              </span>
            )}
          </div>
        )}

        {/* WhatsApp Hover Dropdown Trigger Chevron for ALL Messages */}
        <button
          className="wa-msg-dropdown-trigger"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          title="Message options"
        >
          ▼
        </button>

        {showMenu && (
          <div className="wa-dropdown-menu" onClick={(e) => e.stopPropagation()}>
            <div className="wa-dropdown-item" onClick={() => { setShowMenu(false); onReply && onReply(message); }}>
              <span>💬 Reply</span>
            </div>
            <div className="wa-dropdown-item" onClick={() => { setShowMenu(false); onStar && onStar(message.id); }}>
              <span>{message.isStarred ? '⭐ Unstar' : '⭐ Star Message'}</span>
            </div>
            <div className="wa-dropdown-item" onClick={handleCopyText}>
              <span>📋 Copy Text</span>
            </div>
            <div className="wa-dropdown-item" onClick={() => { setShowMenu(false); onForward && onForward(message); }}>
              <span>↪️ Forward</span>
            </div>
            {isOwner && (
              <>
                <div className="wa-dropdown-item" onClick={() => { setIsEditing(true); setEditText(message.content || ''); setShowMenu(false); }}>
                  <span>✏️ Edit Message</span>
                </div>
                <div className="wa-dropdown-item delete" onClick={() => { setShowMenu(false); if (window.confirm("Delete this message?")) onDelete && onDelete(message.id); }}>
                  <span>🗑️ Delete Message</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* WhatsApp Quoted Reply Preview */}
        {message.replyTo && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderLeft: '4px solid #00a884',
            borderRadius: '6px',
            padding: '0.35rem 0.6rem',
            marginBottom: '0.4rem',
            fontSize: '0.78rem'
          }}>
            <div style={{ color: '#00a884', fontWeight: 700, fontSize: '0.72rem' }}>
              {message.replyTo.author}
            </div>
            <div style={{ color: '#aebac1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.replyTo.content || 'Photo attachment'}
            </div>
          </div>
        )}

        {/* Voice Note Bubble */}
        {message.isAudio ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0.2rem', minWidth: '180px' }}>
            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#00a884',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isPlayingAudio ? '⏸️' : '▶️'}
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: isPlayingAudio ? '100%' : '35%', height: '100%', background: '#00a884', transition: isPlayingAudio ? 'width 3s linear' : 'none' }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: '#8696a0' }}>
                🎙️ Voice Note • {message.audioDuration || '0:05'}
              </div>
            </div>
          </div>
        ) : isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                background: '#111b21',
                border: '1px solid #00a884',
                borderRadius: '6px',
                color: '#e9edef',
                fontSize: '0.88rem',
                padding: '0.4rem 0.6rem',
                outline: 'none'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aebac1', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ background: '#00a884', border: 'none', color: '#ffffff', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          message.content && (
            <div style={{ color: '#e9edef', fontSize: '0.9rem', lineHeight: '1.45', wordBreak: 'break-word', paddingTop: isOwner ? '0.1rem' : 0 }}>
              {message.content}
            </div>
          )
        )}

        {/* WhatsApp Poll Bubble */}
        {message.poll && (
          <div style={{ marginTop: '0.5rem', background: '#111b21', borderRadius: '8px', padding: '0.65rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e9edef', marginBottom: '0.5rem' }}>
              📊 {message.poll.question}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {message.poll.options.map((opt, idx) => {
                const votes = message.poll.votes ? (message.poll.votes[idx] || 0) : 0;
                return (
                  <button
                    key={idx}
                    onClick={() => onVotePoll && onVotePoll(message.id, idx)}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      background: '#202c33',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      color: '#e9edef',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{opt}</span>
                    <span style={{ fontWeight: 700, color: '#00a884', fontSize: '0.75rem' }}>{votes} votes</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachment Image */}
        {message.attachment && (
          <div style={{ marginTop: '0.35rem' }}>
            <img 
              src={message.attachment} 
              alt="Chat attachment" 
              onClick={() => onPreviewImage && onPreviewImage(message.attachment)}
              style={{
                maxWidth: '240px',
                maxHeight: '180px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>
        )}

        {/* Timestamp & Read Receipt */}
        <div className="wa-msg-meta">
          {message.isStarred && <span style={{ color: '#eab308', marginRight: '0.2rem' }}>⭐</span>}
          {message.isEdited && <span style={{ fontSize: '0.65rem', fontStyle: 'italic', marginRight: '0.2rem' }}>(edited)</span>}
          <span>{message.timestamp}</span>
          {isOwner && <span className="wa-msg-checks">✓✓</span>}
        </div>

        {/* Reactions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.35rem', flexWrap: 'wrap', clear: 'both' }}>
          {['👍', '❤️', '💡', '🔥', '🚀'].map(emoji => {
            const list = reactions[emoji] || [];
            const count = list.length;
            const hasReacted = list.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => onReact && onReact(message.id, emoji)}
                style={{
                  background: hasReacted ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid ' + (hasReacted ? '#00a884' : 'rgba(255, 255, 255, 0.08)'),
                  borderRadius: '10px',
                  padding: '0.1rem 0.35rem',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  color: '#e9edef',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span style={{ fontWeight: 700, fontSize: '0.65rem' }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

/**
 * StudentChatSection Component
 * WhatsApp Web Style Community Chat.
 */
const StudentChatSection = memo(function StudentChatSection({ user, onRequireAuth, onBackToApp }) {
  // Faculty & VIT Official Access Restriction: Chat section is strictly for students
  const isFaculty = useMemo(() => isFacultyOrOfficial(user), [user]);

  const [activeChannel, setActiveChannel] = useState('general');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ds_community_messages_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean out legacy preseeded mock message IDs ('1', '2', '3', '4')
          return parsed.filter(m => m.id !== '1' && m.id !== '2' && m.id !== '3' && m.id !== '4');
        }
      }
    } catch (e) {}
    return [];
  });

  const [chatSearch, setChatSearch] = useState('');
  const [debouncedChatSearch, setDebouncedChatSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');

  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Sync messages to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('ds_community_messages_v2', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const ALL_BATCH_CHANNELS = useMemo(() => [
    { id: 'batch-2023', label: '23-batch-lounge', icon: '🎓', name: '23 Batch Lounge', desc: 'Exclusive community channel for 2023 Batch students', batchYear: '23', isPublic: false, isBatch: true },
    { id: 'batch-2024', label: '24-batch-lounge', icon: '🎓', name: '24 Batch Lounge', desc: 'Exclusive community channel for 2024 Batch students', batchYear: '24', isPublic: false, isBatch: true },
    { id: 'batch-2025', label: '25-batch-lounge', icon: '🎓', name: '25 Batch Lounge', desc: 'Exclusive community channel for 2025 Batch students', batchYear: '25', isPublic: false, isBatch: true },
    { id: 'batch-2026', label: '26-batch-lounge', icon: '🎓', name: '26 Batch Lounge', desc: 'Exclusive community channel for 2026 Batch students', batchYear: '26', isPublic: false, isBatch: true }
  ], []);

  const userBatchYear = useMemo(() => getUserBatchYear(user), [user]);

  const CHANNELS = useMemo(() => {
    const baseChannels = [
      { id: 'general', label: 'general-discussion', icon: '💬', name: 'General Campus', desc: 'General campus discussion & updates', isPublic: true },
      { id: 'pyq-doubts', label: 'pyq-doubt-solver', icon: '📄', name: 'PYQ Doubts', desc: 'Past year paper solutions & doubts', isPublic: false },
      { id: 'exam-prep', label: 'exam-prep-groups', icon: '📚', name: 'Exam Prep', desc: 'Study circles & CAT/TEE prep', isPublic: false },
      { id: 'buy-sell', label: 'campus-buy-sell', icon: '🛍️', name: 'Buy & Sell', desc: 'Textbooks, bicycles & hostel gear', isPublic: false },
      { id: 'placements', label: 'placements-internships', icon: '💼', name: 'Placements', desc: 'OA questions & placement prep', isPublic: false },
      { id: 'lost-found', label: 'lost-and-found', icon: '🔍', name: 'Lost & Found', desc: 'Campus lost & found items', isPublic: false }
    ];

    // Guests: Show base channels and batch lounge channels marked as locked
    if (!user || user.isGuest) {
      return [
        ...baseChannels,
        ...ALL_BATCH_CHANNELS
      ];
    }

    // Admin & Faculty can view all batch lounges
    if (user.role === 'admin' || user.role === 'Faculty' || user.role === 'Teacher') {
      return [...baseChannels, ...ALL_BATCH_CHANNELS];
    }

    // Students: ONLY show the specific batch lounge they belong to (e.g. 25 Batch Lounge for 25bce... emails)
    if (userBatchYear) {
      const matchBatch = ALL_BATCH_CHANNELS.find(b => b.batchYear === userBatchYear) || {
        id: `batch-20${userBatchYear}`,
        label: `${userBatchYear}-batch-lounge`,
        icon: '🎓',
        name: `${userBatchYear} Batch Lounge`,
        desc: `Exclusive community channel for 20${userBatchYear} Batch students`,
        batchYear: userBatchYear,
        isPublic: false,
        isBatch: true
      };
      return [...baseChannels, matchBatch];
    }

    // Fallback: If student account has no batch prefix in email, show all batch lounges
    return [...baseChannels, ...ALL_BATCH_CHANNELS];
  }, [user, userBatchYear, ALL_BATCH_CHANNELS]);

  const activeChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];
  const isGuestUser = !user || user.isGuest;
  const isChannelLockedForGuest = isGuestUser && activeChannel !== 'general' && !activeChannelObj.isPublic;

  // Auto-switch to general if active channel is not visible to current user
  useEffect(() => {
    const isChannelAvailable = CHANNELS.some(c => c.id === activeChannel);
    if (!isChannelAvailable) {
      setActiveChannel('general');
    }
  }, [CHANNELS, activeChannel]);

  // Fetch messages from backend API & merge with decryption
  useEffect(() => {
    fetch(`/api/chat/messages?channel=${activeChannel}`)
      .then(res => res.json())
      .then(async (data) => {
        if (data.success && data.messages && data.messages.length > 0) {
          const decryptedMsgs = await Promise.all(data.messages.map(async (m) => ({
            ...m,
            content: await decryptText(m.content)
          })));
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newServerMsgs = decryptedMsgs.filter(m => !existingIds.has(m.id));
            if (newServerMsgs.length === 0) return prev;
            return [...prev, ...newServerMsgs];
          });
        }
      })
      .catch(err => console.log("Using cached chat feed:", err));
  }, [activeChannel]);

  // Clear unread count when switching channel
  const handleChannelSelect = (chId) => {
    setActiveChannel(chId);
    setUnreadCounts(prev => ({ ...prev, [chId]: 0 }));
    setShowMobileChat(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedChatSearch(chatSearch), 150);
    return () => clearTimeout(timer);
  }, [chatSearch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  // Handle Image Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }
    setSelectedAttachment(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  // React to Message
  const handleReactMessage = useCallback((messageId, emoji) => {
    const token = localStorage.getItem('ds_ai_token');
    const isGuest = !user || user.isGuest;
    if (isGuest && activeChannel !== 'general') {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const userId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] };
      const currentList = reactions[emoji] || [];
      const hasReacted = currentList.includes(userId);
      const updatedList = hasReacted ? currentList.filter(id => id !== userId) : [...currentList, userId];
      return { ...m, reactions: { ...reactions, [emoji]: updatedList } };
    }));

    fetch('/api/chat/react', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ messageId, emoji, guestUserId: userId })
    }).catch(err => console.error("Reaction sync failed:", err));
  }, [user, activeChannel, onRequireAuth]);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingPeerName, setTypingPeerName] = useState('Rahul Sharma');

  // Connect to Redis Presence & Typing Engine
  // Presence & typing polling (throttled for performance)
  useEffect(() => {
    const userId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const username = user && !user.isGuest ? (user.name || user.email) : 'Guest Student';

    // Delayed initial presence heartbeat (don't block mount)
    const initTimer = setTimeout(() => {
      fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      }).catch(() => {});
    }, 3000);

    // Presence heartbeat every 30s (was 10s)
    const presenceInterval = setInterval(() => {
      fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      }).catch(() => {});
    }, 30000);

    // Typing poll every 5s (was 2s)
    const typingPollInterval = setInterval(() => {
      fetch(`/api/chat/typing-status?channel=${activeChannel}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.typers) {
            const activeTypers = data.typers.filter(name => name !== username);
            if (activeTypers.length > 0) {
              setIsPeerTyping(true);
              setTypingPeerName(activeTypers[0]);
            }
          }
        }).catch(() => {});
    }, 5000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(presenceInterval);
      clearInterval(typingPollInterval);
    };
  }, [activeChannel, user]);

  // Debounced typing notifier (fires at most once per 2s instead of every keystroke)
  const lastTypingNotify = useRef(0);
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Debounce typing API calls — max once every 2 seconds
    const now = Date.now();
    if (now - lastTypingNotify.current > 2000) {
      lastTypingNotify.current = now;
      const userId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
      const username = user && !user.isGuest ? (user.name || user.email) : 'Guest Student';
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: activeChannel, username, userId })
      }).catch(() => {});
    }
  };

  // Star / Unstar Message Handler
  const handleStarMessage = useCallback((messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStarred: !m.isStarred } : m));
  }, []);

  // Poll Vote Handler
  const handleVotePoll = useCallback((messageId, optionIdx) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.poll) return m;
      const votes = [...(m.poll.votes || [0, 0])];
      votes[optionIdx] = (votes[optionIdx] || 0) + 1;
      return { ...m, poll: { ...m.poll, votes } };
    }));
  }, []);

  // Forward Message Handler
  const handleForwardMessage = useCallback((msgToForward) => {
    const targetChannel = window.prompt("Enter target channel (general, pyq-doubts, exam-prep, buy-sell, placements, lost-found):", "general");
    if (!targetChannel) return;
    const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const forwardedMsg = {
      ...msgToForward,
      id: String(Date.now()),
      channel: targetChannel,
      author: getSafeAuthorName(user),
      authorId: currentAuthorId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isForwarded: true
    };
    setMessages(prev => [...prev, forwardedMsg]);
    alert(`Forwarded to #${targetChannel}!`);
  }, [user]);

  // Voice Note Handler
  const handleSendVoiceNote = () => {
    const isGuest = !user || user.isGuest;
    if (isGuest && activeChannel !== 'general') {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice(false);
      const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
      const voiceMsg = {
        id: String(Date.now()),
        channel: activeChannel,
        author: getSafeAuthorName(user),
        authorId: currentAuthorId,
        avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'G',
        role: user && !user.isGuest ? (user.role === 'admin' ? 'Admin' : (user.program || 'Student')) : 'Guest User',
        isAudio: true,
        audioDuration: '0:05',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] }
      };
      setMessages(prev => [...prev, voiceMsg]);
    }, 1800);
  };

  // Submit Poll Creator
  const handleCreatePollSubmit = (e) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;
    const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const pollMsg = {
      id: String(Date.now()),
      channel: activeChannel,
      author: getSafeAuthorName(user),
      authorId: currentAuthorId,
      avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'G',
      role: user && !user.isGuest ? (user.role === 'admin' ? 'Admin' : (user.program || 'Student')) : 'Guest User',
      poll: {
        question: pollQuestion.trim(),
        options: [pollOpt1.trim(), pollOpt2.trim()],
        votes: [0, 0]
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] }
    };
    setMessages(prev => [...prev, pollMsg]);
    setPollQuestion('');
    setPollOpt1('');
    setPollOpt2('');
    setShowPollModal(false);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const isGuest = !user || user.isGuest;

    // If on a locked channel and user is a guest, prompt login
    if (isGuest && activeChannel !== 'general') {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!newMessage.trim() && !selectedAttachment) return;

    setUploading(true);
    let attachmentUrl = null;

    if (selectedAttachment) {
      const formData = new FormData();
      formData.append('file', selectedAttachment);
      const token = localStorage.getItem('ds_ai_token');
      try {
        const res = await fetch('/api/chat/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
        const data = await res.json();
        if (data.success) attachmentUrl = data.url;
      } catch (err) {
        attachmentUrl = attachmentPreview;
      }
    }

    const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const rawText = newMessage.trim();
    const encryptedContent = await encryptText(rawText);

    const msg = {
      id: String(Date.now()),
      channel: activeChannel,
      author: getSafeAuthorName(user),
      authorId: currentAuthorId,
      avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'G',
      role: user && !user.isGuest ? (user.role === 'admin' ? 'Admin' : (user.program || 'Student')) : 'Guest User',
      content: rawText,
      attachment: attachmentUrl,
      replyTo: replyingToMessage ? { author: replyingToMessage.author, content: replyingToMessage.content } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] }
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setSelectedAttachment(null);
    setAttachmentPreview(null);
    setReplyingToMessage(null);
    setUploading(false);

    const token = localStorage.getItem('ds_ai_token');
    fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ 
        channel: activeChannel, 
        content: encryptedContent, 
        attachment: attachmentUrl,
        authorName: msg.author,
        authorRole: msg.role
      })
    }).catch(err => console.error("Server message sync failed:", err));
  };

  // Edit Message Handler
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, isEdited: true } : m));
    const encrypted = await encryptText(newContent);
    fetch(`/api/chat/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: encrypted })
    }).catch(err => console.error("Edit sync failed:", err));
  }, []);

  // Delete Message Handler
  const handleDeleteMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE'
    }).catch(err => console.error("Delete sync failed:", err));
  }, []);

  const filteredMessages = useMemo(() => {
    let list = messages.filter(m => m.channel === activeChannel);
    const q = debouncedChatSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(m => (m.content && m.content.toLowerCase().includes(q)) || (m.author && m.author.toLowerCase().includes(q)));
    }
    return list;
  }, [messages, activeChannel, debouncedChatSearch]);

  // Interactive Popup States for WhatsApp Buttons
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showChannelInfoModal, setShowChannelInfoModal] = useState(false);
  const [inHeaderSearch, setInHeaderSearch] = useState(false);

  const EMOJI_LIST = ['😊', '😂', '🔥', '🚀', '👍', '❤️', '💡', '🎉', '🙌', '👏', '💯', '📄', '📚', '🎓', '💻', '⭐', '✅', '📌'];

  const handleInsertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleClearHistory = () => {
    if (window.confirm(`Clear all messages in #${activeChannelObj.label}?`)) {
      setMessages(prev => prev.filter(m => m.channel !== activeChannel));
      setShowHeaderMenu(false);
    }
  };

  if (isFaculty) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#111b21', color: '#e9edef', borderRadius: '16px', border: '1px solid #2a3942', maxWidth: '640px', margin: '4rem auto', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: '3.8rem', marginBottom: '1rem', filter: 'drop-shadow(0 4px 12px rgba(239,68,68,0.3))' }}>🛡️</div>
        <h2 style={{ color: '#00a884', fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.8rem', letterSpacing: '-0.02em' }}>
          Student-Only Encrypted Zone
        </h2>
        <p style={{ color: '#8696a0', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          The Community Chat section is strictly restricted to <strong>VIT Bhopal Students</strong> to maintain peer privacy and end-to-end encrypted discussions.
        </p>
        <div style={{ padding: '0.75rem 1.25rem', background: '#202c33', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#fb7185', border: '1px solid rgba(251,113,133,0.2)' }}>
          🔒 Faculty & Official Accounts Are Restricted From Accessing Chat
        </div>
      </div>
    );
  }

  return (
    <div className="wa-container animate-fade-in" onClick={() => { setShowHeaderMenu(false); setShowAttachMenu(false); setShowEmojiPicker(false); }}>
      {/* WhatsApp Left Sidebar */}
      <div className={`wa-sidebar ${showMobileChat ? 'mobile-hidden' : ''}`}>
        {/* Sidebar Header */}
        <div className="wa-sidebar-header">
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setShowProfileDrawer(true); }}
            title="Click to view profile"
          >
            <div className="wa-user-avatar">
              {user && user.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <div style={{ color: '#e9edef', fontWeight: 700, fontSize: '0.9rem' }}>
                {getSafeAuthorName(user)}
              </div>
              <div style={{ color: '#00a884', fontSize: '0.7rem', fontWeight: 600 }}>
                ● Online
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); if (onBackToApp) onBackToApp(); }}
              title="Return to Main App"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(0, 168, 132, 0.15)',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                borderRadius: '20px',
                color: '#00a884',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              ← Back to App
            </button>
            <span 
              title="Campus Status Stories" 
              onClick={(e) => { e.stopPropagation(); setShowStatusModal(true); }}
              style={{ cursor: 'pointer', fontSize: '1.1rem', color: '#aebac1' }}
            >
              ⭕
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="wa-search-box">
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0', fontSize: '0.85rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search or start new chat"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="wa-search-input"
            />
          </div>
        </div>

        {/* Rooms List */}
        <div className="wa-chat-list">
          {CHANNELS.map(ch => {
            const isLocked = isGuestUser && !ch.isPublic;
            const channelMsgs = messages.filter(m => m.channel === ch.id);
            const lastMsg = channelMsgs[channelMsgs.length - 1];

            return (
              <div
                key={ch.id}
                onClick={() => handleChannelSelect(ch.id)}
                className={`wa-chat-item ${activeChannel === ch.id ? 'active' : ''}`}
              >
                <div className="wa-chat-item-avatar">
                  {ch.icon}
                </div>
                <div className="wa-chat-item-info">
                  <div className="wa-chat-item-name">
                    <span>#{ch.label}</span>
                    <span className="wa-chat-item-time">{lastMsg ? lastMsg.timestamp : ''}</span>
                  </div>
                  <div className="wa-chat-item-preview">
                    {isLocked ? (
                      <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        🔒 Locked for Guest
                      </span>
                    ) : (
                      <span>{lastMsg ? `${(lastMsg.author || 'Student').split(' ')[0]}: ${lastMsg.content || 'Photo attachment'}` : ch.desc}</span>
                    )}
                  </div>
                </div>
                {!isLocked && unreadCounts[ch.id] > 0 && activeChannel !== ch.id && (
                  <div style={{ background: '#00a884', color: '#111b21', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800 }}>
                    {unreadCounts[ch.id]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Right Chat Panel */}
      <div className={`wa-chat-panel ${!showMobileChat ? 'mobile-hidden' : ''}`}>
        {/* Header */}
        <div className="wa-chat-header">
          {/* Mobile Back Button */}
          <button 
            className="wa-mobile-back-btn" 
            onClick={(e) => { e.stopPropagation(); setShowMobileChat(false); }}
            title="Back to Chats"
          >
            ←
          </button>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flex: 1, minWidth: 0, overflow: 'hidden' }}
            onClick={(e) => { e.stopPropagation(); setShowChannelInfoModal(true); }}
            title="Click for Channel Details"
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#2a3942', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
              {activeChannelObj.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#e9edef', fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
                #{activeChannelObj.label}
              </div>
              <div style={{ color: isPeerTyping ? '#00a884' : '#8696a0', fontSize: '0.7rem', fontWeight: isPeerTyping ? 700 : 400, transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isPeerTyping ? (
                  `🟢 ${typingPeerName} is typing...`
                ) : (
                  <>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>online • 494 members</span>
                    <span style={{ color: '#00a884', background: 'rgba(0,168,132,0.12)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}>🔒 E2EE</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#aebac1', position: 'relative' }}>
            {/* Inline Header Search Bar */}
            {inHeaderSearch ? (
              <input
                type="text"
                placeholder="Search messages..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#111b21', border: '1px solid #00a884', borderRadius: '6px', color: '#e9edef', padding: '0.25rem 0.6rem', fontSize: '0.82rem', outline: 'none', width: '160px' }}
              />
            ) : (
              <span 
                title="Search Messages" 
                onClick={(e) => { e.stopPropagation(); setInHeaderSearch(true); }} 
                style={{ cursor: 'pointer', fontSize: '1.1rem' }}
              >
                🔍
              </span>
            )}

            {/* Header Options Menu Button */}
            <span 
              title="Channel Options" 
              onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }} 
              style={{ cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ⋮
            </span>

            {/* Floating Options Dropdown Menu */}
            {showHeaderMenu && (
              <div className="wa-dropdown-menu" onClick={(e) => e.stopPropagation()} style={{ right: 0, top: '35px', width: '180px' }}>
                <div className="wa-dropdown-item" onClick={() => { setShowChannelInfoModal(true); setShowHeaderMenu(false); }}>
                  <span>ℹ️ Channel Info</span>
                </div>
                <div className="wa-dropdown-item" onClick={() => { alert("Notifications muted for 8 hours."); setShowHeaderMenu(false); }}>
                  <span>🔔 Mute Notifications</span>
                </div>
                <div className="wa-dropdown-item" onClick={handleClearHistory}>
                  <span>🧹 Clear Messages</span>
                </div>
                {isGuestUser && (
                  <div className="wa-dropdown-item" onClick={() => { if (onRequireAuth) onRequireAuth(); setShowHeaderMenu(false); }}>
                    <span>🔒 Log In Account</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Locked Screen for Guest Accounts on non-general channels */}
        {isChannelLockedForGuest ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: '#202c33', padding: '2.5rem 2rem', borderRadius: '16px', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.8rem' }}>🔒</span>
              <h3 style={{ color: '#e9edef', margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
                #{activeChannelObj.label} is Locked
              </h3>
              <p style={{ color: '#8696a0', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Only <strong>#general-discussion</strong> is open for guest previews. Please log in to unlock PYQ doubt solvers, study groups, placement QAs, and campus trading.
              </p>
              <button 
                onClick={() => { if (onRequireAuth) onRequireAuth(); }}
                style={{
                  width: '100%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Log In / Create Account
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="wa-chat-messages-area" ref={chatScrollRef}>
              <div className="wa-date-divider">TODAY</div>
              {filteredMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8696a0' }}>
                  <span style={{ fontSize: '2.5rem' }}>💬</span>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem' }}>No messages yet in #{activeChannelObj.label}. Send a message to get started!</p>
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    currentUser={user}
                    onReact={handleReactMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={(m) => setReplyingToMessage(m)}
                    onStar={handleStarMessage}
                    onVotePoll={handleVotePoll}
                    onForward={handleForwardMessage}
                    onRequireAuth={onRequireAuth}
                    onPreviewImage={(url) => setPreviewImageModal(url)}
                  />
                ))
              )}

              {/* Animated WhatsApp Typing Bubble */}
              {isPeerTyping && (
                <div className="wa-msg-row received animate-fade-in">
                  <div className="wa-msg-bubble received" style={{ padding: '0.4rem 0.85rem 0.4rem 0.85rem' }}>
                    <div className="wa-msg-author" style={{ fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                      {typingPeerName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0' }}>
                      <span className="wa-typing-dot">●</span>
                      <span className="wa-typing-dot delay-1">●</span>
                      <span className="wa-typing-dot delay-2">●</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Replying To Message Banner */}
            {replyingToMessage && (
              <div style={{ padding: '0.4rem 1rem', background: '#182229', borderLeft: '4px solid #00a884', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#00a884', fontWeight: 700 }}>Replying to {replyingToMessage.author}</div>
                  <div style={{ fontSize: '0.8rem', color: '#aebac1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{replyingToMessage.content || 'Attachment'}</div>
                </div>
                <button onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            {/* Attachment Preview Bar */}
            {attachmentPreview && (
              <div style={{ padding: '0.5rem 1.25rem', background: '#202c33', display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={attachmentPreview} alt="Preview" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                <span style={{ fontSize: '0.82rem', color: '#e9edef', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedAttachment ? selectedAttachment.name : 'Attached Image'}
                </span>
                <button 
                  onClick={() => { setSelectedAttachment(null); setAttachmentPreview(null); }}
                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input Bar with Emojis & Attachment Popup */}
            <form onSubmit={handleSendMessage} className="wa-input-bar" style={{ position: 'relative' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,.pdf,.doc,.docx" 
                style={{ display: 'none' }} 
              />

              {/* Emoji Picker Trigger */}
              <span 
                title="Emojis" 
                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
                style={{ color: '#8696a0', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                😊
              </span>

              {/* Floating Emoji Picker Palette */}
              {showEmojiPicker && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '70px',
                    left: '10px',
                    background: '#233138',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '0.65rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '0.4rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 200
                  }}
                >
                  {EMOJI_LIST.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleInsertEmoji(em)}
                      style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {/* Attachment Menu Paperclip Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
                title="Attach File or Image"
                style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                📎
              </button>

              {/* Floating Attachment Menu Popup */}
              {showAttachMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '70px',
                    left: '45px',
                    background: '#233138',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '0.4rem 0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 200,
                    minWidth: '170px'
                  }}
                >
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); if (fileInputRef.current) fileInputRef.current.click(); }}>
                    <span>📷 Photos & Videos</span>
                  </div>
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); if (fileInputRef.current) fileInputRef.current.click(); }}>
                    <span>📄 PYQ Document</span>
                  </div>
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); setShowPollModal(true); }}>
                    <span>📊 Create Poll</span>
                  </div>
                </div>
              )}

              {/* WhatsApp Message Field */}
              <input
                type="text"
                placeholder={isRecordingVoice ? "🎙️ Recording Voice Note..." : "Type a message"}
                value={newMessage}
                onChange={handleInputChange}
                className="wa-input-field"
                disabled={isRecordingVoice}
              />

              {/* WhatsApp Voice Mic or Send Button */}
              {(!newMessage.trim() && !selectedAttachment) ? (
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="wa-send-btn"
                  title="Send Voice Note"
                  style={{ background: isRecordingVoice ? '#f43f5e' : '#00a884' }}
                >
                  🎙️
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={uploading}
                  className="wa-send-btn"
                  title="Send Message"
                >
                  <Send size={18} />
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {/* WhatsApp Interactive Poll Creator Modal */}
      {showPollModal && (
        <div className="aurora-modal-overlay" onClick={() => setShowPollModal(false)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', background: '#111b21', color: '#e9edef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>📊 Create WhatsApp Poll</h3>
              <button onClick={() => setShowPollModal(false)} style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreatePollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#8696a0', fontWeight: 600 }}>Question</label>
                <input
                  type="text"
                  placeholder="e.g. Is CAT-2 preparation complete?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required
                  style={{ width: '100%', background: '#202c33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#e9edef', marginTop: '0.2rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#8696a0', fontWeight: 600 }}>Option 1</label>
                <input
                  type="text"
                  placeholder="Option 1"
                  value={pollOpt1}
                  onChange={(e) => setPollOpt1(e.target.value)}
                  required
                  style={{ width: '100%', background: '#202c33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#e9edef', marginTop: '0.2rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#8696a0', fontWeight: 600 }}>Option 2</label>
                <input
                  type="text"
                  placeholder="Option 2"
                  value={pollOpt2}
                  onChange={(e) => setPollOpt2(e.target.value)}
                  required
                  style={{ width: '100%', background: '#202c33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', color: '#e9edef', marginTop: '0.2rem', outline: 'none' }}
                />
              </div>
              <button
                type="submit"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem', borderRadius: '8px', background: '#00a884', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Post Poll to Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Campus Status Modal */}
      {showStatusModal && (
        <div className="aurora-modal-overlay" onClick={() => setShowStatusModal(false)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem', borderRadius: '16px', background: '#111b21', color: '#e9edef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⭕ Campus Stories & Status</h3>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8696a0', fontSize: '0.88rem' }}>
              <span>⭕ No active campus stories at the moment.</span>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Drawer */}
      {showProfileDrawer && (
        <div className="aurora-modal-overlay" onClick={() => setShowProfileDrawer(false)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', padding: '1.5rem', borderRadius: '16px', background: '#111b21', color: '#e9edef', textAlign: 'center' }}>
            <div className="wa-user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.8rem', margin: '0 auto 0.75rem auto' }}>
              {user && user.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {getSafeAuthorName(user)}
            </h3>
            <span style={{ fontSize: '0.78rem', background: 'rgba(0,168,132,0.2)', color: '#00a884', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>
              {user && !user.isGuest ? (user.program || 'Verified Student') : 'Guest Account Mode'}
            </span>
            <p style={{ fontSize: '0.82rem', color: '#8696a0', marginTop: '1rem', lineHeight: 1.4 }}>
              {user && !user.isGuest ? 'Access to all student community channels unlocked.' : 'Guest accounts can send messages in #general-discussion. Log in to unlock specialized doubt solvers and trade markets.'}
            </p>
            {isGuestUser ? (
              <button 
                onClick={() => { setShowProfileDrawer(false); if (onRequireAuth) onRequireAuth(); }}
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem', borderRadius: '10px', background: '#00a884', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Log In / Create Account
              </button>
            ) : (
              <button 
                onClick={() => { setShowProfileDrawer(false); localStorage.removeItem('ds_ai_token'); window.location.reload(); }}
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.65rem', borderRadius: '10px', background: 'rgba(244,63,94,0.2)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Channel Info Modal */}
      {showChannelInfoModal && (
        <div className="aurora-modal-overlay" onClick={() => setShowChannelInfoModal(false)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', background: '#111b21', color: '#e9edef', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#2a3942', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 0.75rem auto' }}>
              {activeChannelObj.icon}
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
              #{activeChannelObj.label}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#8696a0', margin: '0 0 1rem 0' }}>
              {activeChannelObj.desc}
            </p>
            <div style={{ background: '#202c33', borderRadius: '10px', padding: '0.85rem', textStyle: 'left', fontSize: '0.82rem', color: '#aebac1' }}>
              <div>👥 494 Members (VIT Bhopal)</div>
              <div style={{ marginTop: '0.35rem' }}>⚡ Real-time Peer Discussion</div>
              <div style={{ marginTop: '0.35rem' }}>📄 PYQ & Notes attachments supported</div>
            </div>
            <button 
              onClick={() => setShowChannelInfoModal(false)}
              style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', borderRadius: '10px', background: '#2a3942', color: '#e9edef', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Close Info
            </button>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImageModal && (
        <div className="aurora-modal-overlay" onClick={() => setPreviewImageModal(null)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', padding: '1rem', borderRadius: '16px', textAlign: 'center', background: '#111b21' }}>
            <img src={previewImageModal} alt="Expanded Attachment" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', objectFit: 'contain' }} />
            <button 
              onClick={() => setPreviewImageModal(null)}
              style={{ marginTop: '0.75rem', padding: '0.5rem 1.5rem', fontSize: '0.85rem', borderRadius: '8px', background: '#00a884', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

/* ── MAIN COMMUNITY PAGE COMPONENT ── */

function CommunityPage({ user, onRequireAuth, initialSubTab = 'pyq', onBackToApp }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // 'pyq' | 'chats' | 'marketplace'

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

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
      const data = await res.json();
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
    <div className={`community-container ${activeSubTab === 'chats' ? 'chats-mode-active' : ''}`}>
      {/* Upper Navigation Tabs (Hidden in pure Chat mode) */}
      {activeSubTab !== 'chats' && (
        <div className="community-tabs">
          <button
            className={`community-tab-btn ${activeSubTab === 'pyq' ? 'active' : ''}`}
            onClick={() => startTransition(() => setActiveSubTab('pyq'))}
          >
            📄 PYQ Hub
          </button>
          <button
            className={`community-tab-btn ${activeSubTab === 'cabins' ? 'active' : ''}`}
            onClick={() => startTransition(() => setActiveSubTab('cabins'))}
          >
            🏫 Faculty Cabins
          </button>
          <button
            className={`community-tab-btn ${activeSubTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => startTransition(() => setActiveSubTab('marketplace'))}
          >
            🛍️ Buy & Sell
          </button>
        </div>
      )}

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
        <StudentChatSection user={user} onRequireAuth={onRequireAuth} onBackToApp={onBackToApp} />
      )}

      {activeSubTab === 'cabins' && (
        <div className="pyq-workspace animate-fade-in" style={{ paddingBottom: '95px' }}>
          <FacultyDirectory user={user} onRequireAuth={onRequireAuth} />
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
