import { useState, useEffect, useCallback, useMemo, useRef, memo, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Send } from 'lucide-react';
import Pusher from 'pusher-js';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/InputGroup';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';
import { Bubble, BubbleContent, BubbleReactions, BubbleGroup } from './ui/bubble';
import FacultyDirectory from './FacultyDirectory';
import { encryptText, decryptText } from '../utils/crypto.js';
import { getSynchronousHardwareDeviceId } from '../utils/deviceFingerprint.js';
import { WhatsAppPollModal } from './WhatsAppPollModal';
import { WhatsAppPollVotingCard } from './WhatsAppPollVotingCard';
import { WhatsAppVoterListDrawer } from './WhatsAppVoterListDrawer';
import { ForwardMessageModal } from './ForwardMessageModal';
import { useToast } from '../hooks/useToast';
import { useTheme } from './theme-provider';
import MarketplacePage from './MarketplacePage';
import './WhatsAppPolls.css';


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
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  const urls = getPaperUrls(url);
  if (urls.length === 0) return false;
  const imageRegex = /\.(jpg|jpeg|png|webp|gif|svg)(\?|#|$)/i;
  return urls.every(u => imageRegex.test(u) || u.includes('/image/upload/') || u.startsWith('data:image/'));
};

const isDocumentUrl = (url) => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:application/pdf') || trimmed.startsWith('data:application/msword') || trimmed.startsWith('data:application/vnd')) return true;
  const docRegex = /\.(pdf|doc|docx|ppt|pptx|txt)(\?|#|$)/i;
  return docRegex.test(trimmed);
};

// --- WHATSAPP STYLE LOCAL FILE DB ---
const initFileDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VITLife_WhatsApp_Files', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('chatMedia');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storeLocalFile = async (id, base64Data) => {
  try {
    const db = await initFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chatMedia', 'readwrite');
      tx.objectStore('chatMedia').put(base64Data, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.error("Local DB store error:", e);
  }
};

export const getLocalFile = async (id) => {
  try {
    const db = await initFileDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chatMedia', 'readonly');
      const req = tx.objectStore('chatMedia').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch(e) {
    console.error("Local DB get error:", e);
    return null;
  }
};
// ------------------------------------

const RelayImage = ({ src, alt, onClick, style }) => {
  const [actualSrc, setActualSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const resolveSrc = async () => {
      if (!src) return;
      if (!src.startsWith('relay://')) {
        setActualSrc(src);
        return;
      }
      
      const id = src.replace('relay://', '');
      
      // Check local device storage (user as host)
      const cached = await getLocalFile(id);
      if (cached) {
        if (isMounted) setActualSrc(cached);
        return;
      }
      
      // Fetch from ephemeral relay
      try {
        const token = localStorage.getItem('ds_ai_token');
        const res = await fetch(`/api/relay/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && data.data) {
          if (isMounted) setActualSrc(data.data);
          // Save to local device storage to act as host
          await storeLocalFile(id, data.data);
        } else {
          if (isMounted) setError(true);
        }
      } catch(e) {
        if (isMounted) setError(true);
      }
    };
    
    resolveSrc();
    return () => { isMounted = false; };
  }, [src]);

  if (error) {
    return <div style={{ fontSize: '0.75rem', color: '#fb7185', padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>⚠️ Preview Unavailable</div>;
  }
  
  if (!actualSrc) {
    return <div style={{ width: '150px', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ opacity: 0.5 }}>Loading...</span></div>;
  }

  return (
    <img 
      src={sanitizeImageSrc(actualSrc)} 
      alt={alt} 
      onClick={() => onClick && onClick(actualSrc)}
      style={style}
    />
  );
};

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

// Tesseract.js has been removed — OCR is now handled server-side via Gemini Vision API
// See POST /api/ocr/vision in server.js


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

const sanitizeImageSrc = (url) => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('data:application/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  return '';
};

const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return '#';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  return '#';
};

// preprocessCanvasForOCR removed — OCR is now server-side via Gemini Vision API


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
  if (!u || u.isGuest) {
    const guestId = getGuestClientId();
    const shortCode = guestId ? guestId.replace('guest_', '').slice(-4).toUpperCase() : 'STUDENT';
    return `Guest #${shortCode}`;
  }
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

// extractTextFromPDF — lightweight PDF.js text layer extraction (no Tesseract)
const extractTextFromPDF = async (arrayBuffer) => {
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
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      combinedText += pageText + '\n';
    } catch (tErr) {
      console.warn(`Text extraction failed for page ${i}:`, tErr);
    }
  }
  
  return combinedText.trim();
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
const PaperFileItem = memo(function PaperFileItem({ paper, user, onDelete, onOpenAskAi }) {
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
      const safe = sanitizeUrl(urls[i]);
      if (safe !== '#') window.open(safe, '_blank');
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
          href={sanitizeUrl(urls[0])}
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
        <button
          className="paper-btn ask-ai"
          onClick={() => onOpenAskAi && onOpenAskAi(paper)}
          title="Ask AI Tutor about this paper"
          style={{
            margin: 0,
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            borderRadius: '10px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))';
          }}
        >
          🤖 Ask AI
        </button>
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
const generateSecureId = (prefix = '') => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return prefix ? `${prefix}_${window.crypto.randomUUID()}` : window.crypto.randomUUID();
  }
  const array = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  }
  return prefix ? `${prefix}_${Date.now()}_${Array.from(array, b => b.toString(36)).join('')}` : `id_${Date.now()}_${Array.from(array, b => b.toString(36)).join('')}`;
};

const getGuestClientId = () => {
  return getSynchronousHardwareDeviceId();
};

export const isMessageOwner = (message, currentUser) => {
  if (!message) return false;

  const guestClientId = getGuestClientId();
  const isCurrentGuest = !currentUser || Boolean(currentUser.isGuest);
  const currentUserId = currentUser && !currentUser.isGuest 
    ? String(currentUser._id || currentUser.id || currentUser.email || '')
    : guestClientId;
  const currentAuthorName = getSafeAuthorName(currentUser);

  // 1. Match by explicit authorId or userId (unique ID for both registered users and guests)
  const msgAuthorId = (message.authorId !== undefined && message.authorId !== null && message.authorId !== '')
    ? message.authorId
    : ((message.userId !== undefined && message.userId !== null && message.userId !== '') ? message.userId : null);

  if (msgAuthorId !== null) {
    const strAuthorId = String(msgAuthorId);
    if (isCurrentGuest) {
      return strAuthorId === String(guestClientId);
    } else {
      return strAuthorId === currentUserId ||
        (currentUser._id && strAuthorId === String(currentUser._id)) ||
        (currentUser.id && strAuthorId === String(currentUser.id)) ||
        (currentUser.email && strAuthorId === String(currentUser.email));
    }
  }

  // 2. Fallback matching when authorId is NOT provided (e.g. legacy static messages):
  // For guests, NEVER match generic 'Guest Student', 'Guest User', or 'Guest' by display name alone
  if (isCurrentGuest) {
    return false;
  }

  // For logged-in users, match by name only if author name is not generic
  if (message.author) {
    const rawAuthor = String(message.author).trim().toLowerCase();
    const isGenericName = ['guest student', 'guest user', 'guest', 'student'].includes(rawAuthor);
    if (!isGenericName) {
      return message.author === currentAuthorName || (currentUser?.name && message.author === currentUser.name);
    }
  }

  return false;
};

/**
 * ChatMessageItem Component
 * 1:1 WhatsApp Web style message bubble with Reply Quotes, Voice Notes, Polls, Starred Messages, Edit, Delete, and Reactions.
 */
const ChatMessageItem = memo(function ChatMessageItem({ 
  message, 
  currentUser, 
  activeMenuMsgId,
  setActiveMenuMsgId,
  onReact, 
  onEdit, 
  onDelete, 
  onReply,
  onReplyPrivately,
  onDirectMessageUser,
  onAskMetaAI,
  onReportMessage,
  onSelectMessage,
  isSelected,
  isSelectionMode,
  onStar, 
  onVotePoll, 
  onOpenVoterList,
  onForward, 
  onCopySuccess,
  onRequireAuth, 
  onPreviewImage 
}) {
  if (!message) return null;
  const { theme } = useTheme();

  const currentAuthorName = getSafeAuthorName(currentUser);
  const guestClientId = getGuestClientId();
  const currentUserId = currentUser && !currentUser.isGuest 
    ? String(currentUser._id || currentUser.id || currentUser.email || '')
    : guestClientId;
  const isOwner = isMessageOwner(message, currentUser);

  const reactions = message.reactions || { '👍': [], '❤️': [], '😂': [], '😮': [], '😢': [], '🙏': [], '💡': [], '🔥': [], '🚀': [] };
  const activeReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏', '💡', '🔥', '🚀']
    .map(emoji => ({
      emoji,
      count: (reactions[emoji] || []).length,
      hasReacted: (reactions[emoji] || []).includes(currentUserId)
    }))
    .filter(item => item.count > 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [decryptedReplyContent, setDecryptedReplyContent] = useState(message?.replyTo?.content || '');

  useEffect(() => {
    let isMounted = true;
    if (message?.replyTo?.content && message.replyTo.content.startsWith('🔒e2ee:')) {
      decryptText(message.replyTo.content).then(res => {
        if (isMounted) setDecryptedReplyContent(res);
      });
    } else {
      setDecryptedReplyContent(message?.replyTo?.content || '');
    }
    return () => { isMounted = false; };
  }, [message?.replyTo?.content]);

  const showMenu = activeMenuMsgId === message.id;
  const setShowMenu = useCallback((val) => {
    if (val) {
      if (setActiveMenuMsgId) setActiveMenuMsgId(message.id);
    } else {
      if (setActiveMenuMsgId && activeMenuMsgId === message.id) setActiveMenuMsgId(null);
    }
  }, [activeMenuMsgId, message.id, setActiveMenuMsgId]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Touch & Mouse Swipe-to-Reply & Long Press Gestures
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const longPressTimerRef = useRef(null);

  const handleGestureStart = (clientX, clientY) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    setIsSwiping(false);

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      setShowMenu(true);
    }, 450);
  };

  const handleGestureMove = (clientX, clientY) => {
    const deltaX = clientX - startXRef.current;
    const deltaY = Math.abs(clientY - startYRef.current);

    if (deltaY > 14 && !isSwiping) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      setSwipeOffset(0);
      return;
    }

    if (Math.abs(deltaX) > 8 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (deltaX > 0) {
      setIsSwiping(true);
      const offset = Math.min(deltaX * 0.45, 70);
      setSwipeOffset(offset);
    }
  };

  const handleGestureEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (swipeOffset >= 35) {
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
      if (onReply) onReply(message);
    }
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    if (onEdit) onEdit(message.id, editText.trim());
    setIsEditing(false);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content).then(() => {
        // Toast is shown from parent; no local alert needed
      }).catch(() => {});
    }
    if (onCopySuccess) onCopySuccess();
    setShowMenu(false);
  };

  return (
    <div
      className={`wa-msg-row ${isOwner ? 'sent' : 'received'} animate-fade-in`}
      style={{ 
        display: 'flex', 
        width: '100%', 
        justifyContent: isOwner ? 'flex-end' : 'flex-start', 
        alignItems: 'center',
        margin: '0.4rem 0', 
        position: 'relative',
        gap: '0.5rem',
        cursor: isSelectionMode ? 'pointer' : 'default'
      }}
      onClick={isSelectionMode ? () => onSelectMessage && onSelectMessage(message.id) : undefined}
    >
      {/* Checkbox when in Multi-Selection Mode */}
      {isSelectionMode && (
        <div
          className="wa-msg-checkbox-wrapper"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMessage && onSelectMessage(message.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.35rem',
            cursor: 'pointer',
            flexShrink: 0,
            order: -1
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '5px',
              border: isSelected ? '2px solid #00a884' : '2px solid rgba(255, 255, 255, 0.4)',
              background: isSelected ? '#00a884' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 0 8px rgba(0, 168, 132, 0.4)' : 'none'
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}
      <Bubble
        variant={isOwner ? 'default' : 'secondary'}
        align={isOwner ? 'end' : 'start'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          touchAction: 'pan-y'
        }}
        onTouchStart={(e) => handleGestureStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleGestureMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleGestureEnd}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          isMouseDownRef.current = true;
          handleGestureStart(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (!isMouseDownRef.current) return;
          handleGestureMove(e.clientX, e.clientY);
        }}
        onMouseUp={() => {
          if (isMouseDownRef.current) {
            isMouseDownRef.current = false;
            handleGestureEnd();
          }
        }}
        onMouseLeave={() => {
          if (isMouseDownRef.current) {
            isMouseDownRef.current = false;
            handleGestureEnd();
          }
        }}
      >
          {/* Swipe-to-Reply Floating Trigger Icon */}
          {swipeOffset > 5 && (
            <div
              style={{
                position: 'absolute',
                left: '-34px',
                top: '50%',
                transform: `translateY(-50%) scale(${Math.min(swipeOffset / 35, 1.2)})`,
                opacity: Math.min(swipeOffset / 25, 1),
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#00a884',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                transition: isSwiping ? 'none' : 'all 0.2s ease',
                zIndex: 12
              }}
            >
              ↪️
            </div>
          )}

          {/* Header Name for Received Messages */}
          {!isOwner && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: theme === 'light' ? '#0284c7' : '#38bdf8', marginBottom: '0.15rem', padding: '0.5rem 0.85rem 0 0.85rem' }}>
              {message.author}
              {message.role && (
                <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)', color: theme === 'light' ? '#475569' : '#aebac1', fontWeight: 400 }}>
                  {message.role}
                </span>
              )}
            </div>
          )}


        <BubbleContent style={{ padding: !isOwner ? '0.2rem 0.85rem 0.4rem 0.85rem' : '0.55rem 0.85rem 0.4rem 0.85rem' }}>
          {/* Forwarded Badge */}
          {message.isForwarded && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontStyle: 'italic',
              color: theme === 'light' ? '#64748b' : '#8696a0',
              marginBottom: '0.35rem',
              background: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 17 20 12 15 7" />
                <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
              </svg>
              <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>Forwarded</span>
            </div>
          )}

          {/* Quoted Reply Preview */}
          {message.replyTo && (
            <div style={{
              background: theme === 'light' ? 'rgba(0, 168, 132, 0.08)' : 'rgba(0, 0, 0, 0.25)',
              borderLeft: '3px solid #00a884',
              borderRadius: '4px',
              padding: '0.35rem 0.6rem',
              marginBottom: '0.4rem',
              fontSize: '0.78rem'
            }}>
              <div style={{ color: '#00a884', fontWeight: 700, fontSize: '0.72rem' }}>
                {message.replyTo.author}
              </div>
              <div style={{ color: theme === 'light' ? '#334155' : '#aebac1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {decryptedReplyContent || 'Photo attachment'}
              </div>
            </div>
          )}

          {/* Marketplace Item Reference Card */}
          {message.marketplaceItem && (
            <div style={{
              background: 'rgba(236, 72, 153, 0.08)',
              borderLeft: '4px solid #ec4899',
              borderRadius: '8px',
              padding: '0.6rem 0.75rem',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              {message.marketplaceItem.imageUrl && (
                <img 
                  src={message.marketplaceItem.imageUrl} 
                  alt={message.marketplaceItem.title} 
                  style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px' }}
                />
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🛒 Marketplace Item Reference
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {message.marketplaceItem.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                  Price: ₹{message.marketplaceItem.price} • Seller: {message.marketplaceItem.sellerName}
                </div>
              </div>
            </div>
          )}

          {/* Poll Card or Voice Note / Text */}
          {message.poll ? (
            <WhatsAppPollVotingCard
              poll={message.poll}
              currentUserId={currentUserId}
              currentUserName={currentAuthorName}
              currentUserAvatar={currentUser?.avatar}
              currentUserRole={currentUser?.role}
              onCastVote={(pollId, voteData) => onVotePoll && onVotePoll(message.id, voteData)}
              onOpenVoterList={(pollObj) => onOpenVoterList && onOpenVoterList(pollObj)}
            />
          ) : message.isAudio ? (
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
                <div style={{ height: '6px', background: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: isPlayingAudio ? '100%' : '35%', height: '100%', background: '#00a884', transition: isPlayingAudio ? 'width 3s linear' : 'none' }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: theme === 'light' ? '#64748b' : '#8696a0' }}>
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
                  background: theme === 'light' ? '#ffffff' : '#111b21',
                  border: '1px solid #00a884',
                  borderRadius: '6px',
                  color: theme === 'light' ? '#0f172a' : '#e9edef',
                  fontSize: '0.88rem',
                  padding: '0.4rem 0.6rem',
                  outline: 'none'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.1)', border: 'none', color: theme === 'light' ? '#475569' : '#aebac1', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}
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
              <div style={{ color: theme === 'light' ? '#0f172a' : (isOwner ? '#ffffff' : '#e9edef'), fontSize: '0.9rem', lineHeight: '1.45', wordBreak: 'break-word' }}>
                {message.content}
              </div>
            )
          )}

          {/* Attachment Rendering */}
          {(message.attachment || message.imageUrl) && (
            <div style={{ marginTop: '0.35rem' }}>
              {isDocumentUrl(message.attachment || message.imageUrl) ? (
                <a
                  href={sanitizeUrl(message.attachment || message.imageUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.8rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <span>📄 Document Attachment</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>↗ View</span>
                </a>
              ) : (
                <RelayImage 
                  src={message.imageUrl || message.attachment}
                  alt="Chat attachment"
                  onClick={onPreviewImage}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '12px',
                    objectFit: 'contain',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                />
              )}
            </div>
          )}

          {/* Timestamp & Read Receipt */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.68rem', color: '#8696a0' }}>
            {message.isStarred && <span style={{ color: '#eab308' }}>⭐</span>}
            {message.isEdited && <span style={{ fontStyle: 'italic' }}>(edited)</span>}
            <span>{message.timestamp}</span>
            {isOwner && (
              <span style={{ color: message.status === 'sending' ? '#8696a0' : '#53bdeb', fontWeight: 700, fontSize: '0.75rem' }}>
                {message.status === 'sending' ? '⏱️' : '✓✓'}
              </span>
            )}
          </div>
        </BubbleContent>

        {/* WhatsApp Real-Time Edge Reactions Pill (Only displayed when active votes exist!) */}
        {activeReactions.length > 0 && (
          <BubbleReactions side="bottom" align={isOwner ? 'end' : 'start'} role="img" aria-label="Reactions">
            {activeReactions.map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onReact && onReact(message.id, emoji); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: hasReacted ? '#00a884' : '#e9edef',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.15rem'
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span style={{ fontWeight: 700, fontSize: '0.65rem' }}>{count}</span>}
              </button>
            ))}
          </BubbleReactions>
        )}
        {/* Base UI / Shadcn DropdownMenu for Message Actions */}
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger
            className={`wa-msg-dropdown-trigger ${showMenu ? 'open' : ''}`}
            showChevron={false}
            title="Message options"
          >
            <svg
              style={{
                width: '12px',
                height: '12px',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </DropdownMenuTrigger>

          <DropdownMenuContent align={isOwner ? 'end' : 'start'} side="bottom">
            {/* ── Quick Emoji Reactions Header (Authentic WhatsApp Pill Style) ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              background: '#111b21',
              borderRadius: '24px',
              marginBottom: '6px',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}>
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    transition: 'transform 0.12s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.28)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={(e) => { e.stopPropagation(); onReact && onReact(message.id, emoji); setShowMenu(false); }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#8696a0',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  flexShrink: 0
                }}
                title="More reactions"
              >
                +
              </button>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {/* 1. Reply */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>}
                onClick={() => onReply && onReply(message)}
              >
                Reply
              </DropdownMenuItem>

              {/* 2. Reply privately */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                onClick={() => onReplyPrivately && onReplyPrivately(message)}
              >
                Reply privately
              </DropdownMenuItem>

              {/* 3. Message Author */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                onClick={() => onDirectMessageUser && onDirectMessageUser(message)}
              >
                Message {message.author ? message.author : 'User'}
              </DropdownMenuItem>

              {/* 4. Copy */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                onClick={handleCopyText}
              >
                Copy
              </DropdownMenuItem>

              {/* 5. Forward */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>}
                onClick={() => onForward && onForward(message)}
              >
                Forward
              </DropdownMenuItem>

              {/* 6. Ask Meta AI */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>}
                onClick={() => onAskMetaAI && onAskMetaAI(message)}
              >
                Ask Meta AI
              </DropdownMenuItem>

              {/* 7. Star */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                onClick={() => onStar && onStar(message.id)}
              >
                {message.isStarred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>

              {/* 8. Select */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                onClick={() => {
                  setShowMenu(false);
                  onSelectMessage && onSelectMessage(message.id);
                }}
              >
                {isSelected ? 'Deselect' : 'Select'}
              </DropdownMenuItem>

              {isOwner && (
                <DropdownMenuItem
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
                  onClick={() => { setIsEditing(true); setEditText(message.content || ''); }}
                >
                  Edit
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* 9. Report */}
              <DropdownMenuItem
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4.3v7a2.31 2.31 0 0 1-2.33 2.3H17"/></svg>}
                onClick={() => onReportMessage && onReportMessage(message)}
              >
                Report
              </DropdownMenuItem>

              {/* 10. Delete */}
              <DropdownMenuItem
                variant="destructive"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>}
                onClick={() => { onDelete && onDelete(message.id); }}
              >
                {isOwner ? 'Delete for everyone' : 'Delete for me'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </Bubble>
    </div>
  );
});

/**
 * ImageZoomModal Component
 * Interactive Modal with Zoom In/Out, Reset, Rotation, Pan/Drag, Keyboard Shortcuts, and File Download.
 */
const ImageZoomModal = memo(function ImageZoomModal({ imageSrc, onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const safeSrc = useMemo(() => sanitizeImageSrc(imageSrc), [imageSrc]);

  // Reset transforms
  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setScale(prev => {
      const next = Math.min(Math.max(prev + delta, 0.5), 4);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Mouse drag to pan when scale > 1
  const handleMouseDown = useCallback((e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [scale, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double click zoom toggle
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  }, [scale, handleReset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key.toLowerCase() === 'r') {
        handleReset();
      } else if (e.key === 'ArrowLeft') {
        setPosition(p => ({ ...p, x: p.x + 30 }));
      } else if (e.key === 'ArrowRight') {
        setPosition(p => ({ ...p, x: p.x - 30 }));
      } else if (e.key === 'ArrowUp') {
        setPosition(p => ({ ...p, y: p.y + 30 }));
      } else if (e.key === 'ArrowDown') {
        setPosition(p => ({ ...p, y: p.y - 30 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleReset]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!safeSrc) return;
    const a = document.createElement('a');
    a.href = safeSrc;
    a.download = `image_attachment_${Date.now()}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [safeSrc]);

  return (
    <div
      className="aurora-modal-overlay animate-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* Top Toolbar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(17, 27, 33, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '0.45rem 1rem',
          borderRadius: '30px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          zIndex: 100000
        }}
      >
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          disabled={scale <= 0.5}
          style={{ background: 'none', border: 'none', color: scale <= 0.5 ? '#555' : '#e9edef', fontSize: '1.1rem', cursor: scale <= 0.5 ? 'not-allowed' : 'pointer', padding: '0 0.3rem' }}
        >
          🔍-
        </button>
        <span style={{ color: '#00a884', fontWeight: 700, fontSize: '0.85rem', minWidth: '45px', textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          disabled={scale >= 4}
          style={{ background: 'none', border: 'none', color: scale >= 4 ? '#555' : '#e9edef', fontSize: '1.1rem', cursor: scale >= 4 ? 'not-allowed' : 'pointer', padding: '0 0.3rem' }}
        >
          🔍+
        </button>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

        <button
          onClick={handleReset}
          title="Reset View (R)"
          style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0 0.3rem' }}
        >
          ↺ Reset
        </button>
        <button
          onClick={handleRotate}
          title="Rotate 90°"
          style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '1rem', cursor: 'pointer', padding: '0 0.3rem' }}
        >
          ↻
        </button>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

        <button
          onClick={handleDownload}
          title="Download Image"
          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          ⬇ Save
        </button>

        {safeSrc && (
          <a
            href={safeSrc}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Original Image in New Tab"
            style={{ color: '#e9edef', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            ↗ Open
          </a>
        )}

        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{ background: 'rgba(244,63,94,0.2)', border: 'none', color: '#fb7185', fontSize: '0.9rem', fontWeight: 700, borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
      </div>

      {/* Main Image Container */}
      <div
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          width: '92vw',
          height: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          position: 'relative'
        }}
      >
        {isLoading && !imageError && (
          <div style={{ position: 'absolute', color: '#00a884', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <span className="aurora-spinner" style={{ width: '24px', height: '24px' }} />
            Loading preview...
          </div>
        )}

        {imageError ? (
          <div style={{ color: '#fb7185', textAlign: 'center', background: '#111b21', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(251,113,133,0.3)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>⚠️</span>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Unable to display image preview</div>
            <div style={{ fontSize: '0.8rem', color: '#8696a0', marginTop: '0.25rem' }}>The image link may be broken or restricted.</div>
          </div>
        ) : (
          safeSrc && (
            <img
              src={safeSrc}
              alt="Preview Zoom"
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setImageError(true); }}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '8px',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
              }}
              draggable={false}
            />
          )
        )}
      </div>

      {/* Footer Hints */}
      <div style={{ position: 'absolute', bottom: '15px', color: '#8696a0', fontSize: '0.75rem', display: 'flex', gap: '1.2rem' }}>
        <span>Scroll to Zoom</span>
        <span>•</span>
        <span>Drag to Pan</span>
        <span>•</span>
        <span>Double-click to toggle 2x</span>
        <span>•</span>
        <span>Press ESC to close</span>
      </div>
    </div>
  );
});

/**
 * ReportMessageModal — multi-step report flow
 */
function ReportMessageModal({ message, currentUser, onClose, onSubmit }) {
  const REASONS = [
    'Spam or Promotional Content',
    'Harassment or Bullying',
    'Hate Speech or Discrimination',
    'Misinformation or False Information',
    'Inappropriate Content / NSFW',
    'Scam or Fraud',
    'Other'
  ];
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  if (!message) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#111b21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '400px', maxWidth: '94vw', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', color: '#e9edef' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#fb7185' }}>
            👎 Report Message
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {step === 1 && (
          <>
            <p style={{ fontSize: '0.84rem', color: '#8696a0', margin: '0 0 0.85rem 0' }}>
              Reporting message from <strong style={{ color: '#e9edef' }}>{message.author}</strong>. Select a reason:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
              {REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: selectedReason === r ? 'rgba(0,168,132,0.12)' : '#182229', border: `1px solid ${selectedReason === r ? '#00a884' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#e9edef', transition: 'all 0.15s' }}>
                  <input type="radio" name="report_reason" value={r} checked={selectedReason === r} onChange={() => setSelectedReason(r)} style={{ accentColor: '#00a884' }} />
                  {r}
                </label>
              ))}
            </div>
            <button
              onClick={() => { if (selectedReason) setStep(2); }}
              disabled={!selectedReason}
              style={{ width: '100%', padding: '0.65rem', background: selectedReason ? '#00a884' : '#2a3942', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: selectedReason ? 'pointer' : 'not-allowed', fontSize: '0.875rem', transition: 'background 0.15s' }}
            >
              Next →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: '0.84rem', color: '#8696a0', margin: '0 0 0.65rem 0' }}>Reason: <strong style={{ color: '#00a884' }}>{selectedReason}</strong></p>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Add more details (optional)..."
              style={{ width: '100%', minHeight: '90px', background: '#182229', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e9edef', fontSize: '0.84rem', padding: '0.65rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.6rem', background: '#182229', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e9edef', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
              <button
                onClick={() => { setStep(3); onSubmit(selectedReason, details); }}
                style={{ flex: 2, padding: '0.6rem', background: '#fb7185', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Submit Report
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>✅</div>
            <h3 style={{ color: '#00a884', margin: '0 0 0.5rem 0', fontWeight: 800 }}>Report Submitted!</h3>
            <p style={{ color: '#8696a0', fontSize: '0.84rem', lineHeight: 1.5 }}>Our moderators will review this within 24 hours. Thank you for keeping the community safe.</p>
            <button onClick={onClose} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', background: '#00a884', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StudentChatSection Component
 * WhatsApp Web Style Community Chat.
 */
const StudentChatSection = memo(function StudentChatSection({ user, onRequireAuth, onBackToApp }) {
  const isFaculty = useMemo(() => isFacultyOrOfficial(user), [user]);
  const { showToast } = useToast();
  const guestClientId = useMemo(() => getGuestClientId(), []);

  const [activeChannel, setActiveChannel] = useState('general');
  const [showMobileChat, setShowMobileChat] = useState(true);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [forwardModalMsg, setForwardModalMsg] = useState(null);
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

  const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ds_deleted_for_me_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [onlineStats, setOnlineStats] = useState({ onlineCount: 1, totalMembers: 1 });

  useEffect(() => {
    const fetchStats = () => {
      const token = localStorage.getItem('ds_ai_token');
      if (!token) return;
      fetch('/api/chat/online-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            setOnlineStats({
              onlineCount: data.onlineCount || 1,
              totalMembers: data.totalMembers || 1
            });
          }
        })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [user]);

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
  const [activeVoterDrawerPoll, setActiveVoterDrawerPoll] = useState(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');

  // Interactive Popup States for WhatsApp Buttons
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showChannelInfoModal, setShowChannelInfoModal] = useState(false);
  const [inHeaderSearch, setInHeaderSearch] = useState(false);

  // States for Context Menu Actions (Meta AI, Report, Select)
  const [metaAiModalMessage, setMetaAiModalMessage] = useState(null);
  const [reportModalMessage, setReportModalMessage] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('channels'); // 'channels' or 'dms'

  const handleReplyPrivately = useCallback((msg) => {
    if (!user || user.isGuest) {
      showToast('🔒 Please log in to send private messages.', 'error');
      return;
    }
    const myId = user.regNo || user.email?.split('@')[0] || user.id || 'me';
    const theirId = msg.authorId || msg.author.replace(/\s+/g, '');
    const dmChannelId = 'dm_' + [myId, theirId].sort().join('_');
    
    setDmChannels(prev => {
      if (!prev.find(c => c.id === dmChannelId)) {
        return [...prev, {
          id: dmChannelId,
          label: dmChannelId,
          icon: '👤',
          name: `Chat with ${msg.author || 'User'}`,
          desc: 'Direct Message',
          isPublic: false
        }];
      }
      return prev;
    });
    setSidebarTab('dms');
    setActiveChannel(dmChannelId);
    setReplyingToMessage(msg);
  }, [user, showToast]);

  const handleDirectMessageUser = useCallback((msg) => {
    if (!user || user.isGuest) {
      showToast('🔒 Please log in to send private messages.', 'error');
      return;
    }
    const myId = user.regNo || user.email?.split('@')[0] || user.id || 'me';
    const theirId = msg.authorId || msg.author.replace(/\s+/g, '');
    const dmChannelId = 'dm_' + [myId, theirId].sort().join('_');
    
    setDmChannels(prev => {
      if (!prev.find(c => c.id === dmChannelId)) {
        return [...prev, {
          id: dmChannelId,
          label: dmChannelId,
          icon: '👤',
          name: `Chat with ${msg.author || 'User'}`,
          desc: 'Direct Message',
          isPublic: false
        }];
      }
      return prev;
    });
    setSidebarTab('dms');
    setActiveChannel(dmChannelId);
  }, [user, showToast]);

  const handleAskMetaAI = useCallback((msg) => {
    setMetaAiModalMessage(msg);
  }, []);

  const handleReportMessage = useCallback((msg) => {
    setReportModalMessage(msg);
  }, []);

  const handleSelectMessage = useCallback((msgId) => {
    setIsSelectionMode(true);
    setSelectedMsgIds(prev => prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]);
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMsgIds([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    const visibleIds = (Array.isArray(messages) ? messages : [])
      .filter(m => m && m.channel === activeChannel)
      .map(m => m.id);
    if (selectedMsgIds.length === visibleIds.length && visibleIds.length > 0) {
      setSelectedMsgIds([]);
    } else {
      setSelectedMsgIds(visibleIds);
    }
  }, [messages, activeChannel, selectedMsgIds.length]);

  const handleBulkCopy = useCallback(() => {
    if (selectedMsgIds.length === 0) return;
    const selectedMsgs = messages.filter(m => selectedMsgIds.includes(m.id));
    const text = selectedMsgs.map(m => {
      const textContent = m.content || (m.poll ? `[Poll: ${m.poll.question}]` : m.attachment ? '[Image Attachment]' : '[Voice Note]');
      return `[${m.author} - ${m.timestamp}]: ${textContent}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    showToast(`${selectedMsgIds.length} message(s) copied 📋`, 'success');
  }, [messages, selectedMsgIds, showToast]);

  const handleBulkForward = useCallback(() => {
    if (selectedMsgIds.length === 0) return;
    const selectedMsgs = messages.filter(m => selectedMsgIds.includes(m.id));
    if (selectedMsgs.length > 0) {
      setForwardModalMsg({ _bulk: true, _msgs: selectedMsgs, author: 'Selected Messages', content: `${selectedMsgs.length} messages` });
    }
  }, [messages, selectedMsgIds]);

  // Delete Message Handler (Delete for everyone if author/admin, Delete for me if recipient)
  const handleDeleteMessage = useCallback((messageId) => {
    const targetMsg = messages.find(m => m && (m.id === messageId || m.tempId === messageId));
    const isMsgOwner = Boolean(
      user?.role === 'admin' ||
      isMessageOwner(targetMsg, user)
    );

    const idsToDelete = [messageId];
    if (targetMsg?.id) idsToDelete.push(targetMsg.id);
    if (targetMsg?.tempId) idsToDelete.push(targetMsg.tempId);

    if (isMsgOwner) {
      // Deleting OUR message completely for everyone
      setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id) && !idsToDelete.includes(m.tempId)));
      showToast('Message deleted for everyone', 'info');

      // Send WS real-time deletion stanza to all connected users
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'delete_message',
          channel: activeChannel,
          id: targetMsg?.id || messageId
        }));
      }

      const token = localStorage.getItem('ds_ai_token');
      const targetId = targetMsg?.id || messageId;
      fetch(`/api/chat/messages/${targetId}?channel=${encodeURIComponent(activeChannel)}`, {
        method: 'DELETE',
        headers: {
          'x-guest-user-id': guestClientId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).catch(err => console.error('Delete sync failed:', err));
    } else {
      // Deleting OTHER user's message ONLY from my view
      setDeletedForMeIds(prev => {
        const next = Array.from(new Set([...prev, ...idsToDelete]));
        try { localStorage.setItem('ds_deleted_for_me_ids', JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setMessages(prev => prev.filter(m => !idsToDelete.includes(m.id) && !idsToDelete.includes(m.tempId)));
      showToast('Message deleted for you', 'info');
    }
  }, [messages, user, showToast, activeChannel, guestClientId]);

  const handleBulkDelete = useCallback(() => {
    if (selectedMsgIds.length === 0) return;
    const count = selectedMsgIds.length;
    selectedMsgIds.forEach(id => {
      handleDeleteMessage(id);
    });
    showToast(`${count} message(s) deleted`, 'info');
    handleExitSelectionMode();
  }, [selectedMsgIds, handleDeleteMessage, handleExitSelectionMode, showToast]);



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

  const [dmChannels, setDmChannels] = useState([]);

  useEffect(() => {
    if (user && !user.isGuest) {
      const token = localStorage.getItem('ds_ai_token');
      fetch('/api/chat/dm-channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.channels) {
          setDmChannels(data.channels);
        }
      })
      .catch(err => console.error('Failed to fetch DM channels:', err));
    }
  }, [user]);

  const CHANNELS = useMemo(() => {
    const baseChannels = [
      { id: 'general', label: 'general', icon: '💬', name: 'General Campus', desc: 'General campus discussion & updates', isPublic: true },
      ...dmChannels,
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
  }, [user, userBatchYear, ALL_BATCH_CHANNELS, dmChannels]);

  const activeChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];
  const isGuestUser = !user || user.isGuest;
  const isChannelLockedForGuest = isGuestUser && activeChannel !== 'general' && !activeChannelObj.isPublic;

  // Peer Typing Engine State, Refs, and Helpers
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingPeerName, setTypingPeerName] = useState('Rahul Sharma');
  const peerTypingTimerRef = useRef(null);
  const lastPeerTypingTimeRef = useRef(0);

  const cancelPeerTyping = useCallback(() => {
    if (peerTypingTimerRef.current) {
      clearTimeout(peerTypingTimerRef.current);
      peerTypingTimerRef.current = null;
    }
    setIsPeerTyping(false);
  }, []);

  const triggerPeerTyping = useCallback((peerName) => {
    if (!peerName) return;
    setTypingPeerName(peerName);
    setIsPeerTyping(true);
    lastPeerTypingTimeRef.current = Date.now();

    if (peerTypingTimerRef.current) {
      clearTimeout(peerTypingTimerRef.current);
    }
    peerTypingTimerRef.current = setTimeout(() => {
      setIsPeerTyping(false);
      peerTypingTimerRef.current = null;
    }, 3500);
  }, []);

  // --- PUSHER REAL-TIME ENGINE ---
  // Replaces the broken WebSocket. Works on Vercel serverless + localhost.
  // Pusher delivers events instantly to ALL connected browser tabs.
  const wsRef = useRef(null); // kept for local-dev WS typing stanza only
  const wsReconnectTimerRef = useRef(null);
  const wsReconnectAttemptsRef = useRef(0);
  const pusherRef = useRef(null);

  useEffect(() => {
    // Pusher public key loaded from env (VITE_ prefix exposes it to the browser)
    const pusherKey = import.meta.env.VITE_PUSHER_KEY || 'ad35a515130550297260';
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      forceTLS: true
    });
    pusherRef.current = pusher;

    // Subscribe to this channel's Pusher channel
    // Channel name matches server: 'chat-' + channelId
    const safeChannelName = ('chat-' + activeChannel).replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 200);
    const pusherChannel = pusher.subscribe(safeChannelName);

    // New message from another user
    pusherChannel.bind('new_message', async (data) => {
      if (!data || !data.message) return;
      const msgAuthor = data.message.author || data.message.authorName;
      if (msgAuthor && msgAuthor !== getSafeAuthorName(user)) {
        cancelPeerTyping();
      }
      const rawContent = await decryptText(data.message.content);
      const tsFormatted = data.message.timestamp
        ? (data.message.timestamp.includes('T') ? new Date(data.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : data.message.timestamp)
        : 'Just now';
      const serverMsg = { ...data.message, content: rawContent, timestamp: tsFormatted, rawTimestamp: data.message.timestamp, status: 'sent' };
      setMessages(prev => {
        const exists = prev.some(m => m.id === serverMsg.id || (serverMsg.tempId && m.tempId === serverMsg.tempId));
        if (exists) return prev.map(m => (m.id === serverMsg.id || (serverMsg.tempId && m.tempId === serverMsg.tempId)) ? serverMsg : m);
        return [...prev, serverMsg];
      });
    });

    // Message deleted for everyone
    pusherChannel.bind('delete_message', (data) => {
      if (data && data.id) {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      }
    });

    // Message edited
    pusherChannel.bind('edit_message', async (data) => {
      if (data && data.id) {
        const rawContent = await decryptText(data.content);
        setMessages(prev => prev.map(m =>
          m.id === data.id
            ? { ...m, content: rawContent, isEdited: true, editedAt: data.editedAt, editHistory: data.editHistory }
            : m
        ));
      }
    });

    // Emoji reaction updated
    pusherChannel.bind('reaction_update', (data) => {
      if (data && data.messageId) {
        setMessages(prev => prev.map(m =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        ));
      }
    });

    // Poll vote updated
    pusherChannel.bind('poll_vote', (data) => {
      if (data && data.messageId && data.poll) {
        setMessages(prev => prev.map(m =>
          m.id === data.messageId ? { ...m, poll: data.poll } : m
        ));
      }
    });

    // Peer typing indicator
    pusherChannel.bind('peer_typing', (data) => {
      const currentAuthor = getSafeAuthorName(user);
      if (data && data.username && data.username !== currentAuthor) {
        if (data.isTyping) triggerPeerTyping(data.username);
        else cancelPeerTyping();
      }
    });

    return () => {
      cancelPeerTyping();
      try {
        pusherChannel.unbind_all();
        pusher.unsubscribe(safeChannelName);
        pusher.disconnect();
      } catch (e) {}
      pusherRef.current = null;
    };
  }, [activeChannel, user, cancelPeerTyping, triggerPeerTyping]);

  // Auto-switch to general if active channel is not visible to current user
  useEffect(() => {
    const isChannelAvailable = CHANNELS.some(c => c.id === activeChannel);
    if (!isChannelAvailable) {
      setActiveChannel('general');
    }
  }, [CHANNELS, activeChannel]);

  // Polling Loop — 10s interval, catch-up backup only (Pusher handles real-time delivery)
  useEffect(() => {
    let isMounted = true;
    let currentController = null;

    const syncMessages = async () => {
      if (!isMounted) return;
      const token = localStorage.getItem('ds_ai_token');
      if (!token) return;
      if (currentController) currentController.abort();
      currentController = new AbortController();
      try {
        const res = await fetch(`/api/chat/messages?channel=${encodeURIComponent(activeChannel)}`, {
          signal: currentController.signal,
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && Array.isArray(data.messages)) {
          const validServerMsgs = data.messages.filter(m => m && !deletedForMeIds.includes(m.id));
          const decryptedMsgs = await Promise.all(validServerMsgs.map(async (m) => {
            const rawContent = await decryptText(m.content);
            const tsFormatted = m.timestamp
              ? (m.timestamp.includes('T') ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.timestamp)
              : 'Just now';
            return { ...m, content: rawContent, timestamp: tsFormatted, rawTimestamp: m.timestamp };
          }));

          setMessages(prev => {
            const existingMap = new Map();
            prev.forEach(m => {
              if (m.id) existingMap.set(m.id, m);
              if (m.tempId) existingMap.set(m.tempId, m);
            });

            let hasChanges = false;
            let merged = [...prev];

            for (const serverMsg of decryptedMsgs) {
              const existingById = existingMap.get(serverMsg.id);
              const existingByTemp = serverMsg.tempId ? existingMap.get(serverMsg.tempId) : null;
              const existing = existingById || existingByTemp;

              if (existing) {
                const idx = merged.findIndex(m => m === existing || m.id === existing.id);
                if (idx !== -1) {
                  const needsUpdate = merged[idx].status === 'sending' ||
                    JSON.stringify(merged[idx].reactions) !== JSON.stringify(serverMsg.reactions) ||
                    merged[idx].content !== serverMsg.content ||
                    merged[idx].isEdited !== serverMsg.isEdited;
                  if (needsUpdate) {
                    merged[idx] = { ...serverMsg, status: 'sent' };
                    hasChanges = true;
                  }
                }
              } else {
                const optMatchIdx = merged.findIndex(m =>
                  m.status === 'sending' &&
                  m.authorId === serverMsg.authorId &&
                  m.content === serverMsg.content
                );
                if (optMatchIdx !== -1) {
                  merged[optMatchIdx] = { ...serverMsg, status: 'sent' };
                  hasChanges = true;
                } else {
                  merged.push({ ...serverMsg, status: 'sent' });
                  hasChanges = true;
                }
              }
            }

            const serverIds = new Set(decryptedMsgs.map(m => m.id));
            const now = Date.now();
            const afterDelete = merged.filter(m => {
              if (m.status === 'sending' || !m.id || serverIds.has(m.id)) return true;
              if (m.id && m.id.startsWith('msg_')) {
                const ts = parseInt(m.id.split('_')[1], 10);
                if (!isNaN(ts) && (now - ts < 30000)) return true; // keep if newer than 30s to shield from race conditions
              }
              return false;
            });
            if (afterDelete.length !== merged.length) hasChanges = true;

            return hasChanges ? afterDelete : prev;
          });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {} // Network error — retry next cycle
      }
    };

    syncMessages(); // fetch immediately on mount / channel switch
    const interval = setInterval(syncMessages, 10000); // 10s — Pusher handles real-time, this is catch-up only

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (currentController) currentController.abort();
    };
  }, [activeChannel, deletedForMeIds]);

  // Clear unread count when switching channel & push history state
  const handleChannelSelect = (chId) => {
    setActiveChannel(chId);
    setUnreadCounts(prev => ({ ...prev, [chId]: 0 }));
    setShowMobileChat(true);
    // Clear stale localStorage message cache so we don't show old channel's messages
    try {
      localStorage.removeItem('ds_community_messages_v2');
    } catch (e) {}
    try {
      window.history.pushState({ view: 'chat-channel', channel: chId }, '', `#channel-${chId}`);
    } catch (e) {}
  };

  // Phone Gesture & Hardware Back Button (popstate) Listener
  useEffect(() => {
    const handleCommunityPopState = (e) => {
      // 1. High Priority: Close any open modals/drawers first
      if (previewImageModal) {
        setPreviewImageModal(null);
        return;
      }
      if (activeVoterDrawerPoll) {
        setActiveVoterDrawerPoll(null);
        return;
      }
      if (showPollModal) {
        setShowPollModal(false);
        return;
      }
      if (showStatusModal) {
        setShowStatusModal(false);
        return;
      }

      // 2. Medium Priority: If user is inside an active chat channel on mobile (showMobileChat === true)
      if (showMobileChat) {
        setShowMobileChat(false);
        return;
      }

      // 3. Low Priority: Only return to dashboard if popped to dashboard state
      const state = e.state;
      if (state && state.tab === 'dashboard' && onBackToApp) {
        onBackToApp();
      }
    };

    window.addEventListener('popstate', handleCommunityPopState);
    return () => window.removeEventListener('popstate', handleCommunityPopState);
  }, [showMobileChat, previewImageModal, activeVoterDrawerPoll, showPollModal, showStatusModal, onBackToApp]);

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

  // Clean up object URL when attachmentPreview changes or unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      if (attachmentPreview && attachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const clearAttachment = useCallback(() => {
    if (attachmentPreview && attachmentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setSelectedAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachmentPreview]);

  // Handle Attachment Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be smaller than 5MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (attachmentPreview && attachmentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setSelectedAttachment(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  // React to Message
  const handleReactMessage = useCallback((messageId, emoji) => {
    const token = localStorage.getItem('ds_ai_token');
    const isGuest = !user || user.isGuest;
    if (isGuest || !token) {
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
      // Pass channel so server finds message in Redis directly
      body: JSON.stringify({ messageId, emoji, guestUserId: userId, channel: activeChannel })
    }).catch(err => console.error("Reaction sync failed:", err));
  }, [user, activeChannel, onRequireAuth]);

  // Connect to Redis Presence & Typing Engine
  // Presence & typing polling (throttled for performance)
  useEffect(() => {
    const token = localStorage.getItem('ds_ai_token');
    if (!token || !user || user.isGuest) return undefined;
    const userId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const username = user && !user.isGuest ? (user.name || user.email) : 'Guest Student';

    // Delayed initial presence heartbeat (don't block mount)
    const initTimer = setTimeout(() => {
      fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, username })
      }).catch(() => {});
    }, 3000);

    // Presence heartbeat every 30s (was 10s)
    const presenceInterval = setInterval(() => {
      fetch('/api/chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, username })
      }).catch(() => {});
    }, 30000);

    // Real-time typing poll every 1.2s with premature cancellation protection
    const typingPollInterval = setInterval(() => {
      fetch(`/api/chat/typing-status?channel=${activeChannel}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.typers)) {
            const activeTypers = data.typers.filter(name => name !== username && name !== getSafeAuthorName(user));
            if (activeTypers.length > 0) {
              triggerPeerTyping(activeTypers[0]);
            } else {
              // Only cancel if 3.5s have passed since the last confirmed typing signal
              const elapsedSinceTyping = Date.now() - lastPeerTypingTimeRef.current;
              if (elapsedSinceTyping > 3500) {
                cancelPeerTyping();
              }
            }
          }
        }).catch(() => {});
    }, 1200);

    return () => {
      clearTimeout(initTimer);
      clearInterval(presenceInterval);
      clearInterval(typingPollInterval);
    };
  }, [activeChannel, user, triggerPeerTyping, cancelPeerTyping]);

  // Typing notifier (fires instant HTTP + WS stanzas with 400ms throttle)
  const lastTypingNotify = useRef(0);
  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);

    const token = localStorage.getItem('ds_ai_token');
    if (!token || !user || user.isGuest) return;

    const userId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const authorName = getSafeAuthorName(user);

    if (val.length > 0) {
      const now = Date.now();
      if (now - lastTypingNotify.current > 400) {
        lastTypingNotify.current = now;
        fetch('/api/chat/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ channel: activeChannel, username: authorName, userId, isTyping: true })
        }).catch(() => {});
      }
    } else {
      lastTypingNotify.current = 0;
      fetch('/api/chat/typing', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ channel: activeChannel, username: authorName, userId, isTyping: false })
      }).catch(() => {});
    }
  };

  // Star / Unstar Message Handler
  const handleStarMessage = useCallback((messageId) => {
    setMessages(prev => {
      const msg = prev.find(m => m.id === messageId);
      const willStar = msg ? !msg.isStarred : true;
      showToast(willStar ? 'Message starred ⭐' : 'Removed from starred', willStar ? 'success' : 'info');
      return prev.map(m => m.id === messageId ? { ...m, isStarred: !m.isStarred } : m);
    });
  }, [showToast]);

  // Poll Vote Handler
  const handleVotePoll = useCallback(async (messageId, voteData) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.poll) return m;
      if (typeof voteData === 'number') {
        const votes = Array.isArray(m.poll.votes) ? [...m.poll.votes] : [0, 0];
        votes[voteData] = (votes[voteData] || 0) + 1;
        return { ...m, poll: { ...m.poll, votes } };
      }
      const existingVotes = (Array.isArray(m.poll.votes) ? m.poll.votes : []).filter(v => typeof v === 'object' && String(v.userId) !== String(voteData.userId));
      const updatedVotes = voteData.selectedOptionIndexes.length > 0
        ? [...existingVotes, voteData]
        : existingVotes;
      return {
        ...m,
        poll: { ...m.poll, votes: updatedVotes }
      };
    }));

    try {
      const token = localStorage.getItem('ds_ai_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const guestClientId = getGuestClientId();
      if (guestClientId) headers['X-Guest-User-Id'] = guestClientId;

      await fetch('/api/chat/poll-vote', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId,
          channel: activeChannel,
          voteData
        })
      });
    } catch (err) {
      console.error('Failed to submit poll vote:', err);
    }
  }, [activeChannel]);

  // Forward Message Handler — opens modal
  const handleForwardMessage = useCallback((msgToForward) => {
    setForwardModalMsg(msgToForward);
  }, []);

  // Actual forward after user picks channels in modal
  const handleDoForward = useCallback((msgToForward, targetChannels) => {
    const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const now = Date.now();
    const forwardedMsgs = targetChannels.map((ch, i) => ({
      ...msgToForward,
      id: String(now + i),
      channel: ch,
      author: getSafeAuthorName(user),
      authorId: currentAuthorId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isForwarded: true,
      replyTo: null
    }));
    setMessages(prev => [...prev, ...forwardedMsgs]);
    showToast(`Forwarded to ${targetChannels.length} channel${targetChannels.length > 1 ? 's' : ''}`, 'success');
  }, [user, showToast]);

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
        id: generateSecureId('voice'),
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

    if (isGuest) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!newMessage.trim() && !selectedAttachment) return;

    setUploading(true);
    let attachmentUrl = null;

    if (selectedAttachment) {
      const token = localStorage.getItem('ds_ai_token');
      try {
        const base64Data = await readAsDataURL(selectedAttachment);
        const relayId = generateSecureId('relay');
        
        // Save to our local "host" IndexedDB immediately
        await storeLocalFile(relayId, base64Data);
        
        // Relay to server (ephemeral)
        const res = await fetch('/api/relay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: relayId,
            data: base64Data,
            contentType: selectedAttachment.type
          })
        });
        const data = await res.json();
        
        if (data.success) {
          // Tell others to fetch from this relay ID
          attachmentUrl = `relay://${relayId}`;
        } else {
          attachmentUrl = base64Data; // fallback
        }
      } catch (err) {
        try {
          attachmentUrl = await readAsDataURL(selectedAttachment);
        } catch (readErr) {
          attachmentUrl = null;
        }
      }
    }

    const tempId = generateSecureId('temp');
    const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
    const rawText = newMessage.trim();
    const encryptedContent = await encryptText(rawText);
    const encryptedReplyTo = replyingToMessage ? {
      author: replyingToMessage.author,
      content: await encryptText(replyingToMessage.content)
    } : null;

    const msg = {
      id: tempId,
      tempId: tempId,
      channel: activeChannel,
      author: getSafeAuthorName(user),
      authorId: currentAuthorId,
      avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'G',
      role: user && !user.isGuest ? (user.role === 'admin' ? 'Admin' : (user.program || 'Student')) : 'Guest User',
      content: rawText,
      attachment: attachmentUrl,
      imageUrl: attachmentUrl,
      replyTo: replyingToMessage ? { author: replyingToMessage.author, content: replyingToMessage.content } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: new Date().toISOString(),
      status: 'sending',
      reactions: { '👍': [], '❤️': [], '💡': [], '🔥': [], '🚀': [] }
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setSelectedAttachment(null);
    setAttachmentPreview(null);
    setReplyingToMessage(null);
    setUploading(false);

    // Instant WebSocket stanza transmission (0ms latency!)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        channel: activeChannel,
        username: getSafeAuthorName(user),
        isTyping: false
      }));
      wsRef.current.send(JSON.stringify({
        type: 'message',
        tempId: tempId,
        channel: activeChannel,
        content: encryptedContent,
        attachment: attachmentUrl,
        imageUrl: attachmentUrl,
        authorName: msg.author,
        authorRole: msg.role,
        userId: currentAuthorId,
        replyTo: encryptedReplyTo
      }));
    } else {
      // Fallback to HTTP POST if WebSocket is disconnected
      const token = localStorage.getItem('ds_ai_token');
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-guest-user-id': guestClientId,
          'x-device-fingerprint': guestClientId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          tempId: tempId,
          channel: activeChannel, 
          content: encryptedContent, 
          attachment: attachmentUrl,
          imageUrl: attachmentUrl,
          authorName: msg.author,
          authorRole: msg.role,
          userId: currentAuthorId,
          replyTo: encryptedReplyTo
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.message) {
          const confirmedMsg = {
            ...data.message,
            tempId: tempId,
            content: rawText,
            timestamp: new Date(data.message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent'
          };
          setMessages(prev => prev.map(m => (m.id === tempId || m.tempId === tempId) ? confirmedMsg : m));
        }
      })
      .catch(err => console.error("Server message fallback POST failed:", err));
    }
  };

  // Edit Message Handler
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, isEdited: true } : m));
    showToast('Message updated ✏️', 'success');
    const encrypted = await encryptText(newContent);
    const token = localStorage.getItem('ds_ai_token');
    const guestUserId = getGuestClientId();
    fetch(`/api/chat/messages/${messageId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-guest-user-id': guestUserId,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      // Pass channel so server can find the message in Redis directly
      body: JSON.stringify({ content: encrypted, guestUserId, channel: activeChannel })
    }).catch(err => console.error('Edit sync failed:', err));
  }, [showToast, activeChannel]);



  const filteredMessages = useMemo(() => {
    let list = (Array.isArray(messages) ? messages : []).filter(m => m && m.channel === activeChannel && !deletedForMeIds.includes(m.id));
    
    // Sort chronologically (oldest first, newest last) to guarantee chat order
    list.sort((a, b) => {
      const getTs = (m) => {
        if (m.rawTimestamp) return new Date(m.rawTimestamp).getTime();
        if (m.id && m.id.startsWith('msg_')) return parseInt(m.id.split('_')[1], 10);
        return 0;
      };
      return getTs(a) - getTs(b);
    });

    const q = debouncedChatSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(m => m && ((m.content && m.content.toLowerCase().includes(q)) || (m.author && m.author.toLowerCase().includes(q))));
    }
    return list;
  }, [messages, activeChannel, debouncedChatSearch, deletedForMeIds]);

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
        <div className="wa-search-box" style={{ padding: '0.45rem 0.75rem', background: '#111b21', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search size={15} />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search or start new chat"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
            />
            {chatSearch && (
              <InputGroupAddon align="inline-end">
                <button type="button" onClick={() => setChatSearch('')} title="Clear search">
                  <X size={14} />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {/* Sidebar Filter Tabs */}
        <div style={{ display: 'flex', padding: '0.2rem 0.75rem 0.5rem', background: '#111b21', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button 
            onClick={() => setSidebarTab('channels')} 
            style={{ flex: 1, padding: '0.35rem', borderRadius: '12px', background: sidebarTab === 'channels' ? '#202c33' : 'transparent', color: sidebarTab === 'channels' ? '#00a884' : '#8696a0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
          >
            Channels
          </button>
          <button 
            onClick={() => setSidebarTab('dms')} 
            style={{ flex: 1, padding: '0.35rem', borderRadius: '12px', background: sidebarTab === 'dms' ? '#202c33' : 'transparent', color: sidebarTab === 'dms' ? '#00a884' : '#8696a0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
          >
            Private
          </button>
        </div>

        {/* Rooms List */}
        <div className="wa-chat-list">
          {CHANNELS.filter(ch => {
            if (sidebarTab === 'dms') return ch.id.startsWith('dm_');
            return !ch.id.startsWith('dm_');
          }).map(ch => {
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
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowMobileChat(false); 
              try {
                if (window.history.state && window.history.state.view === 'chat-channel') {
                  window.history.back();
                }
              } catch (err) {}
            }}
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {onlineStats.onlineCount} online • {onlineStats.totalMembers} {onlineStats.totalMembers === 1 ? 'member' : 'members'}
                    </span>
                    <span style={{ color: '#00a884', background: 'rgba(0,168,132,0.12)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}>🔒 E2EE</span>
                  </>
                )}
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#aebac1', position: 'relative' }}>
            {/* Inline Header Search Bar */}
            {inHeaderSearch ? (
              <div style={{ width: '220px' }} onClick={(e) => e.stopPropagation()}>
                <InputGroup style={{ borderRadius: '20px' }}>
                  <InputGroupAddon align="inline-start">
                    <Search size={14} />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="text"
                    placeholder="Search messages..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    autoFocus
                  />
                  <InputGroupAddon align="inline-end">
                    <button type="button" onClick={() => { setChatSearch(''); setInHeaderSearch(false); }} title="Close search">
                      <X size={14} />
                    </button>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            ) : (
              <span 
                title="Search Messages" 
                onClick={(e) => { e.stopPropagation(); setInHeaderSearch(true); }} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Search size={18} />
              </span>
            )}

            {/* Header Options Menu Button */}
            <DropdownMenu open={showHeaderMenu} onOpenChange={setShowHeaderMenu}>
              <DropdownMenuTrigger showChevron={false} title="Channel Options" style={{ fontSize: '1.2rem', padding: '0.2rem 0.4rem', color: '#aebac1' }}>
                ⋮
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" style={{ width: '190px' }}>
                <DropdownMenuGroup>
                  <DropdownMenuItem icon="☑️" onClick={() => { setIsSelectionMode(true); setShowHeaderMenu(false); }}>
                    Select Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem icon="ℹ️" onClick={() => setShowChannelInfoModal(true)}>
                    Channel Info
                  </DropdownMenuItem>
                  <DropdownMenuItem icon="🔔" onClick={() => showToast('Notifications muted for 8 hours 🔕', 'info')}>
                    Mute Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem icon="🧹" onClick={handleClearHistory}>
                    Clear Messages
                  </DropdownMenuItem>
                  {isGuestUser && (
                    <DropdownMenuItem icon="🔒" onClick={() => { if (onRequireAuth) onRequireAuth(); }}>
                      Log In Account
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
                Only <strong>#general</strong> is open for guest previews. Please log in to unlock PYQ doubt solvers, study groups, placement QAs, and campus trading.
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
                    activeMenuMsgId={activeMenuMsgId}
                    setActiveMenuMsgId={setActiveMenuMsgId}
                    onReact={handleReactMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={(m) => setReplyingToMessage(m)}
                    onReplyPrivately={handleReplyPrivately}
                    onDirectMessageUser={handleDirectMessageUser}
                    onAskMetaAI={handleAskMetaAI}
                    onReportMessage={handleReportMessage}
                    onSelectMessage={handleSelectMessage}
                    isSelected={selectedMsgIds.includes(msg.id)}
                    isSelectionMode={isSelectionMode}
                    onStar={handleStarMessage}
                    onVotePoll={handleVotePoll}
                    onOpenVoterList={(pollObj) => setActiveVoterDrawerPoll(pollObj)}
                    onForward={handleForwardMessage}
                    onCopySuccess={() => showToast('Message copied 📋', 'success')}
                    onRequireAuth={onRequireAuth}
                    onPreviewImage={(url) => setPreviewImageModal(url)}
                  />
                ))
              )}

              {/* Animated WhatsApp Typing Bubble */}
              {isPeerTyping && (
                <div className="wa-msg-row received animate-fade-in" style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', margin: '0.4rem 0' }}>
                  <Bubble variant="secondary" align="start" style={{ padding: '0.45rem 0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.2rem' }}>
                      {typingPeerName} <span style={{ fontSize: '0.68rem', color: '#8696a0', fontWeight: 400 }}>is typing...</span>
                    </div>
                    <div className="wa-typing-indicator-dots">
                      <span className="wa-typing-dot"></span>
                      <span className="wa-typing-dot delay-1"></span>
                      <span className="wa-typing-dot delay-2"></span>
                    </div>
                  </Bubble>
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
                {selectedAttachment && selectedAttachment.type.startsWith('image/') ? (
                  <img src={attachmentPreview} alt="Preview" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    📄
                  </div>
                )}
                <span style={{ fontSize: '0.82rem', color: '#e9edef', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedAttachment ? selectedAttachment.name : 'Attached File'}
                </span>
                <button 
                  type="button"
                  onClick={clearAttachment}
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
                    borderRadius: '16px',
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

              {/* Floating Attachment Menu Popup */}
              {showAttachMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '80px',
                    background: '#233138',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '0.4rem 0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 200,
                    minWidth: '170px'
                  }}
                >
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); if (fileInputRef.current) fileInputRef.current.click(); }}>
                    <span>📷 Photos &amp; Videos</span>
                  </div>
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); if (fileInputRef.current) fileInputRef.current.click(); }}>
                    <span>📄 PYQ Document</span>
                  </div>
                  <div className="wa-dropdown-item" onClick={() => { setShowAttachMenu(false); setShowPollModal(true); }}>
                    <span>📊 Create Poll</span>
                  </div>
                </div>
              )}

              {/* Input pill container */}
              <div className="wa-input-container">
                {/* Emoji Picker Trigger */}
                <span 
                  title="Emojis" 
                  onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
                  style={{ color: '#8696a0', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '8px' }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8696a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </span>

                {/* WhatsApp Message Field */}
                <input
                  type="text"
                  placeholder={isRecordingVoice ? "🎙️ Recording Voice Note..." : "Message"}
                  value={newMessage}
                  onChange={handleInputChange}
                  onFocus={() => setActiveMenuMsgId(null)}
                  className="wa-input-field"
                  disabled={isRecordingVoice}
                />

                {/* Right side icons container */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingRight: '4px' }}>
                  {/* Attachment Menu Paperclip Button */}
                  <button
                    type="button"
                    title="Attach"
                    onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
                    style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', flexShrink: 0, position: 'relative' }}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8696a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>

                  <div className={`wa-dynamic-icon ${newMessage || selectedAttachment ? 'hidden' : ''}`}>
                    <button
                      type="button"
                      title="Pay"
                      onClick={(e) => { e.preventDefault(); showToast('UPI Pay feature coming soon 💸', 'info'); }}
                      style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', flexShrink: 0 }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8696a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3h12"></path>
                        <path d="M6 8h12"></path>
                        <path d="M6 13h8.5l-5 8"></path>
                        <path d="M6 13h3"></path>
                        <path d="M9 13c6.667 0 6.667-10 0-10"></path>
                      </svg>
                    </button>
                  </div>

                  <div className={`wa-dynamic-icon ${newMessage || selectedAttachment ? 'hidden' : ''}`}>
                    <button
                      type="button"
                      title="Camera"
                      onClick={(e) => { e.preventDefault(); if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); } }}
                      style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', flexShrink: 0 }}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8696a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                        <circle cx="12" cy="13" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* WhatsApp Voice Mic or Send Button */}
              {(!newMessage.trim() && !selectedAttachment) ? (
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="wa-send-btn"
                  title="Send Voice Note"
                  style={{ background: isRecordingVoice ? '#f43f5e' : '#00a884' }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={uploading}
                  className="wa-send-btn"
                  title="Send Message"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {/* WhatsApp Interactive Poll Creator Modal & Voter List Drawer */}
      <WhatsAppPollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmitPoll={async ({ question, options, allowMultipleAnswers }) => {
          const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
          const pollObj = {
            id: generateSecureId('poll'),
            question,
            options,
            allowMultipleAnswers,
            votes: [],
            createdById: currentAuthorId,
            createdByName: getSafeAuthorName(user),
            createdAt: new Date().toISOString(),
          };

          const token = localStorage.getItem('ds_ai_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const guestClientId = getGuestClientId();
          if (guestClientId) headers['X-Guest-User-Id'] = guestClientId;

          try {
            const res = await fetch('/api/chat/messages', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                channel: activeChannel,
                content: `📊 Poll: ${question}`,
                poll: pollObj,
                authorName: getSafeAuthorName(user),
                authorId: currentAuthorId
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.message) {
                setMessages(prev => [...prev, data.message]);
              }
            } else {
              const fallbackMsg = {
                id: generateSecureId('poll_msg'),
                channel: activeChannel,
                author: getSafeAuthorName(user),
                authorId: currentAuthorId,
                avatar: user && user.name ? user.name.charAt(0).toUpperCase() : 'G',
                role: user && !user.isGuest ? (user.role === 'admin' ? 'Admin' : (user.program || 'Student')) : 'Guest User',
                poll: pollObj,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                reactions: { '👍': [], '❤️': [], '😂': [], '😮': [], '😢': [], '🙏': [], '💡': [], '🔥': [], '🚀': [] }
              };
              setMessages(prev => [...prev, fallbackMsg]);
            }
          } catch (e) {
            console.error('Failed to post poll message:', e);
          }
        }}

      />

      <WhatsAppVoterListDrawer
        isOpen={Boolean(activeVoterDrawerPoll)}
        onClose={() => setActiveVoterDrawerPoll(null)}
        poll={activeVoterDrawerPoll}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={Boolean(forwardModalMsg)}
        message={forwardModalMsg}
        onClose={() => setForwardModalMsg(null)}
        onForward={(msg, channels) => {
          if (msg && msg._bulk && msg._msgs) {
            // Bulk forward
            const currentAuthorId = user && !user.isGuest ? (user._id || user.id || user.email) : getGuestClientId();
            const now = Date.now();
            const allForwarded = [];
            msg._msgs.forEach((m, mi) => {
              channels.forEach((ch, ci) => {
                allForwarded.push({
                  ...m,
                  id: String(now + mi * 100 + ci),
                  channel: ch,
                  author: getSafeAuthorName(user),
                  authorId: currentAuthorId,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isForwarded: true,
                  replyTo: null
                });
              });
            });
            setMessages(prev => [...prev, ...allForwarded]);
            showToast(`${msg._msgs.length} message(s) forwarded to ${channels.length} channel(s)`, 'success');
            handleExitSelectionMode();
          } else {
            handleDoForward(msg, channels);
          }
          setForwardModalMsg(null);
        }}
      />


      {/* Ask Meta AI Assistant Modal */}
      {metaAiModalMessage && (
        <div className="aurora-modal-overlay" onClick={() => setMetaAiModalMessage(null)} style={{ zIndex: 99999 }}>
          <div className="aurora-modal-card glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.6rem', borderRadius: '16px', background: '#111b21', color: '#e9edef', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✨</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#00a884' }}>Meta AI Assistant Analysis</h3>
              </div>
              <button onClick={() => setMetaAiModalMessage(null)} style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ background: '#182229', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.85rem', color: '#8696a0', marginBottom: '1rem', borderLeft: '3px solid #00a884' }}>
              <div style={{ fontWeight: 700, color: '#e9edef', marginBottom: '0.2rem' }}>Target Message ({metaAiModalMessage.author}):</div>
              "{metaAiModalMessage.content || 'Attachment / Media'}"
            </div>

            <div style={{ fontSize: '0.88rem', color: '#e9edef', lineHeight: 1.6, background: 'rgba(0,168,132,0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,168,132,0.2)' }}>
              🤖 <strong>Smart Insights:</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#aebac1' }}>
                This message in #{activeChannel} asks about: <em>"{metaAiModalMessage.content || 'Media update'}"</em>. 
                <br /><br />
                <strong>Suggested Quick Reply:</strong> "Understood! Thanks for sharing this information with the cohort."
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={() => {
                  setNewMessage(`Replying to ${metaAiModalMessage.author}: Got it!`);
                  setMetaAiModalMessage(null);
                }}
                style={{ padding: '0.5rem 1rem', background: '#00a884', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}
              >
                Use Quick Reply
              </button>
              <button
                onClick={() => setMetaAiModalMessage(null)}
                style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', color: '#e9edef', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Message Modal */}
      {reportModalMessage && (
        <ReportMessageModal
          message={reportModalMessage}
          currentUser={user}
          onClose={() => setReportModalMessage(null)}
          onSubmit={(reason, details) => {
            // Store report in localStorage
            try {
              const existing = JSON.parse(localStorage.getItem('ds_reported_messages') || '[]');
              existing.push({
                messageId: reportModalMessage.id,
                authorId: reportModalMessage.authorId,
                authorName: reportModalMessage.author,
                reportedBy: user?.name || 'Guest',
                reason,
                details,
                timestamp: new Date().toISOString()
              });
              localStorage.setItem('ds_reported_messages', JSON.stringify(existing));
            } catch (e) {}
            showToast('Report submitted to moderators ✅', 'success', 3500);
            setReportModalMessage(null);
          }}
        />
      )}



      {/* Multi-Select Messages Floating Bar */}
      {(isSelectionMode || selectedMsgIds.length > 0) && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(17, 27, 33, 0.95)',
          border: '1px solid rgba(0, 168, 132, 0.4)',
          borderRadius: '30px',
          padding: '0.6rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: '0 12px 35px rgba(0,0,0,0.75), 0 0 15px rgba(0,168,132,0.15)',
          backdropFilter: 'blur(16px)',
          color: '#e9edef',
          maxWidth: '92vw',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Selected Count */}
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#00a884', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ background: 'rgba(0, 168, 132, 0.15)', padding: '0.15rem 0.55rem', borderRadius: '12px' }}>
              {selectedMsgIds.length} selected
            </span>
          </span>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

          {/* Select All / Deselect All Button */}
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              background: selectedMsgIds.length === filteredMessages.length && filteredMessages.length > 0 ? 'rgba(0, 168, 132, 0.2)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '18px',
              color: '#e9edef',
              padding: '0.4rem 0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title="Select or deselect all visible messages"
          >
            <span>{selectedMsgIds.length === filteredMessages.length && filteredMessages.length > 0 ? '✓' : '☑️'}</span>
            <span>{selectedMsgIds.length === filteredMessages.length && filteredMessages.length > 0 ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Bulk Copy Button */}
          <button
            type="button"
            onClick={handleBulkCopy}
            disabled={selectedMsgIds.length === 0}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '18px',
              color: selectedMsgIds.length > 0 ? '#e9edef' : '#667781',
              padding: '0.4rem 0.8rem',
              cursor: selectedMsgIds.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: selectedMsgIds.length > 0 ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
            title="Copy selected messages to clipboard"
          >
            <span>📋</span>
            <span>Bulk Copy</span>
          </button>

          {/* Bulk Forward Button */}
          <button
            type="button"
            onClick={handleBulkForward}
            disabled={selectedMsgIds.length === 0}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '18px',
              color: selectedMsgIds.length > 0 ? '#38bdf8' : '#667781',
              padding: '0.4rem 0.8rem',
              cursor: selectedMsgIds.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: selectedMsgIds.length > 0 ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
            title="Forward selected messages to another channel"
          >
            <span>↪️</span>
            <span>Bulk Forward</span>
          </button>

          {/* Bulk Delete Button */}
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedMsgIds.length === 0}
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '18px',
              color: selectedMsgIds.length > 0 ? '#fb7185' : '#667781',
              padding: '0.4rem 0.8rem',
              cursor: selectedMsgIds.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: selectedMsgIds.length > 0 ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
            title="Delete selected messages"
          >
            <span>🗑️</span>
            <span>Bulk Delete</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

          {/* Close / Exit Selection Mode Button */}
          <button
            type="button"
            onClick={handleExitSelectionMode}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#8696a0',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Exit selection mode"
          >
            ✕
          </button>
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
              {user && !user.isGuest ? 'Access to all student community channels unlocked.' : 'Guest accounts can send messages in #general. Log in to unlock specialized doubt solvers and trade markets.'}
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
            <div style={{ background: '#202c33', borderRadius: '10px', padding: '0.85rem', textAlign: 'left', fontSize: '0.82rem', color: '#aebac1' }}>
              <div>👥 {onlineStats.totalMembers} {onlineStats.totalMembers === 1 ? 'Member' : 'Members'} ({onlineStats.onlineCount} Active Online)</div>
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
        <ImageZoomModal
          imageSrc={previewImageModal}
          onClose={() => setPreviewImageModal(null)}
        />
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

  // Ask Me PYQ AI Tutor Session State
  const [aiSessionPaper, setAiSessionPaper] = useState(null);
  const [aiSessionQuery, setAiSessionQuery] = useState('');
  const [aiSessionLoading, setAiSessionLoading] = useState(false);
  const [aiSessionHistory, setAiSessionHistory] = useState([]);

  const handleRunAiPyqSession = useCallback(async (queryText, mode = 'explain') => {
    if (!queryText || !queryText.trim() || !aiSessionPaper) return;
    const q = queryText.trim();
    
    setAiSessionHistory(prev => [...prev, { role: 'user', text: q }]);
    setAiSessionQuery('');
    setAiSessionLoading(true);

    try {
      const token = localStorage.getItem('ds_ai_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/papers/ask-pyq', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paperId: aiSessionPaper._id,
          courseCode: aiSessionPaper.courseCode,
          userQuery: q,
          mode
        })
      });

      const data = await res.json();
      if (res.ok && data.answer) {
        setAiSessionHistory(prev => [...prev, { role: 'assistant', text: data.answer }]);
      } else {
        setAiSessionHistory(prev => [...prev, { role: 'assistant', text: `⚠️ ${data.error || 'Failed to generate answer. Please try again.'}` }]);
      }
    } catch (err) {
      console.error(err);
      setAiSessionHistory(prev => [...prev, { role: 'assistant', text: `⚠️ Connection error: ${err.message}` }]);
    } finally {
      setAiSessionLoading(false);
    }
  }, [aiSessionPaper]);

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

      // Helper: Call server Gemini Vision OCR endpoint
      const scanWithServerOCR = async (base64Data, filename = '') => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
          const ocrRes = await fetch('/api/ocr/vision', {
            method: 'POST',
            headers,
            body: JSON.stringify({ imageBase64: base64Data })
          });

          if (!ocrRes.ok) {
            const errData = await ocrRes.json().catch(() => ({}));
            // If server reports API key missing (503), attempt filename-based extraction fallback
            if (ocrRes.status === 503 || (errData.error && errData.error.includes('API key'))) {
              console.warn('AI Vision API Key missing on server — using filename fallback parser');
              const nameMatch = filename.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
              const courseCode = nameMatch ? nameMatch[1].toUpperCase() : 'UNKNOWN';
              return {
                success: true,
                validation: { valid: true },
                metadata: {
                  courseCode,
                  courseTitle: filename ? filename.replace(/\.[^/.]+$/, "") : 'Scanned Paper',
                  examType: filename.toUpperCase().includes('TEE') ? 'TEE' : (filename.toUpperCase().includes('CAT') ? 'CAT-1' : 'MTE'),
                  year: '2024-25',
                  semester: 1,
                  fullText: ''
                }
              };
            }
            throw new Error(errData.error || `OCR scan failed (${ocrRes.status})`);
          }

          return await ocrRes.json();
        } catch (fetchErr) {
          if (fetchErr.message && fetchErr.message.includes('API key')) {
            const nameMatch = filename.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
            const courseCode = nameMatch ? nameMatch[1].toUpperCase() : 'UNKNOWN';
            return {
              success: true,
              validation: { valid: true },
              metadata: {
                courseCode,
                courseTitle: filename ? filename.replace(/\.[^/.]+$/, "") : 'Scanned Paper',
                examType: 'MTE',
                year: '2024-25',
                semester: 1,
                fullText: ''
              }
            };
          }
          throw fetchErr;
        }
      };

      // 1. Process Images — scan with server Gemini Vision OCR
      if (imageFiles.length > 0) {
        setSuccess(`🔍 Scanning ${imageFiles.length} image(s) with AI Vision OCR...`);
        const imageDatas = [];
        let fullTextCombined = '';
        let detectedMeta = {};

        for (const file of imageFiles) {
          const base64Data = await compressImage(file);
          imageDatas.push(base64Data);

          try {
            const ocrResult = await scanWithServerOCR(base64Data, file.name);

            // Check deterministic content validation from server
            if (ocrResult.validation && !ocrResult.validation.valid) {
              throw new Error(ocrResult.validation.reason);
            }

            if (ocrResult.metadata) {
              const m = ocrResult.metadata;
              if (m.fullText) fullTextCombined += m.fullText + '\n';
              // Use first valid detection for metadata
              if (!detectedMeta.courseCode && m.courseCode && m.courseCode !== 'UNKNOWN') {
                detectedMeta = { ...detectedMeta, ...m };
              }
            }
          } catch (ocrErr) {
            throw new Error(ocrErr.message || 'AI Vision OCR scan failed. Please try again.');
          }
        }

        // Validate that we got a valid course code
        if (!detectedMeta.courseCode || detectedMeta.courseCode === 'UNKNOWN') {
          // Attempt filename extraction
          const nameCodeMatch = imageFiles[0]?.name?.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
          if (nameCodeMatch) {
            detectedMeta.courseCode = nameCodeMatch[1].toUpperCase();
          } else {
            throw new Error('Could not detect a valid course code from the image. Please ensure the exam paper header with the course code (e.g. CSE2001, MAT3002) is clearly visible.');
          }
        }

        if (!detectedMeta.examType || detectedMeta.examType === 'UNKNOWN') {
          // Try to detect from extracted text using parsePaperText as fallback
          const parsed = parsePaperText(fullTextCombined, papers);
          detectedMeta.examType = parsed.examType || 'MTE';
        }

        uploadTasks.push({
          type: 'images',
          fileName: `${(detectedMeta.courseCode || 'paper').toLowerCase()}_scanned_${Date.now()}.pdf`,
          courseCode: detectedMeta.courseCode,
          courseTitle: detectedMeta.courseTitle || 'Scanned Question Paper',
          examType: detectedMeta.examType,
          year: detectedMeta.year && detectedMeta.year !== 'UNKNOWN' ? detectedMeta.year : '2024-25',
          month: detectedMeta.month || null,
          semester: detectedMeta.semester && detectedMeta.semester !== 0 ? detectedMeta.semester : '1',
          fullText: fullTextCombined,
          compileFileData: async () => {
            return await convertImagesToPDF(imageDatas);
          }
        });
      }

      // 2. Process PDFs — extract text with PDF.js, then scan sparse pages with server OCR
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        setSuccess(`🔍 Analyzing PDF ${i + 1} of ${pdfFiles.length}: ${file.name}...`);

        if (file.size > 3.3 * 1024 * 1024) {
          throw new Error(`PDF file "${file.name}" is too large (maximum 3.3MB). Please compress the PDF first.`);
        }

        const arrayBuffer = await readAsArrayBuffer(file);
        let fullTextCombined = '';
        let detectedMeta = {};

        // Try PDF.js text extraction first (fast, no API call)
        try {
          const extractedText = await extractTextFromPDF(arrayBuffer);
          if (extractedText) {
            fullTextCombined = extractedText;
          }
        } catch (pdfReadErr) {
          console.warn('Failed to extract text from PDF:', pdfReadErr);
        }

        // If PDF text extraction got enough text, parse it locally
        const pdfTextSufficient = fullTextCombined.trim().length > 200 && /\b[A-Z]{3,4}\d{3,4}\b/i.test(fullTextCombined);

        if (pdfTextSufficient) {
          // Use local regex parsing — no Gemini API call needed
          const parsed = parsePaperText(fullTextCombined, papers);
          detectedMeta = parsed;
        } else {
          // Sparse or no embedded text — scan first page with Gemini Vision OCR
          setSuccess(`🤖 AI scanning PDF ${i + 1}: ${file.name}...`);
          try {
            const pdfBase64 = await readAsDataURL(file);
            const ocrResult = await scanWithServerOCR(pdfBase64, file.name);

            if (ocrResult.validation && !ocrResult.validation.valid) {
              throw new Error(ocrResult.validation.reason);
            }

            if (ocrResult.metadata) {
              detectedMeta = ocrResult.metadata;
              if (detectedMeta.fullText) {
                fullTextCombined = detectedMeta.fullText;
              }
            }
          } catch (ocrErr) {
            throw new Error(ocrErr.message || 'AI Vision OCR scan failed for PDF.');
          }
        }

        // Validate course code
        let courseCodeVal = detectedMeta.courseCode;
        if (!courseCodeVal || courseCodeVal === 'UNKNOWN') {
          const nameCodeMatch = file.name.match(/\b([A-Z]{3,4}\d{3,4})\b/i);
          courseCodeVal = nameCodeMatch ? nameCodeMatch[1].toUpperCase() : null;
        }

        if (!courseCodeVal) {
          throw new Error(`Could not detect a course code from "${file.name}". Please ensure the paper header is visible or rename the file with the course code (e.g. CSE2001_MTE.pdf).`);
        }

        const examTypeVal = detectedMeta.examType && detectedMeta.examType !== 'UNKNOWN' ? detectedMeta.examType : null;
        if (!examTypeVal) {
          throw new Error(`Could not detect the exam type for "${file.name}". Please ensure the paper header showing MTE/TEE/CAT is visible.`);
        }

        uploadTasks.push({
          type: 'pdf',
          fileName: file.name,
          courseCode: courseCodeVal,
          courseTitle: detectedMeta.courseTitle || file.name.replace(/\.[^/.]+$/, ""),
          examType: examTypeVal,
          year: detectedMeta.year && detectedMeta.year !== 'UNKNOWN' ? detectedMeta.year : '2024-25',
          month: detectedMeta.month || null,
          semester: detectedMeta.semester && detectedMeta.semester !== 0 ? detectedMeta.semester : '1',
          fullText: fullTextCombined,
          compileFileData: async () => {
            return await readAsDataURL(file);
          }
        });
      }

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
                      onOpenAskAi={(p) => {
                        setAiSessionPaper(p);
                        setAiSessionHistory([]);
                        setAiSessionQuery('');
                      }}
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
                    <button 
                      className="btn-primary" 
                      style={{ marginTop: '1rem', background: '#38bdf8', color: '#0f172a' }}
                      onClick={() => {
                        setActiveSubTab('chats');
                        handleChannelSelect('pyq-doubts');
                      }}
                    >
                      Request in #pyq-doubt-solver
                    </button>
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
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f8fafc',
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
        <MarketplacePage 
          user={user} 
          onRequireAuth={onRequireAuth} 
          onBackToApp={onBackToApp} 
        />
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

      {/* ── ASK ME PYQ AI TUTOR SESSION MODAL ── */}
      {aiSessionPaper && (
        <div className="aurora-modal-overlay" onClick={() => setAiSessionPaper(null)} style={{ zIndex: 99999, backdropFilter: 'blur(16px)', background: 'rgba(5, 8, 18, 0.85)' }}>
          <div 
            className="ai-pyq-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'linear-gradient(180deg, #0b1120 0%, #070a14 100%)', 
              border: '1px solid rgba(16, 185, 129, 0.28)',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 40px rgba(16, 185, 129, 0.12)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.75rem', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4M8 16h0M16 16h0" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                      Ask Me PYQ: {aiSessionPaper.courseCode}
                    </h3>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', textTransform: 'uppercase' }}>
                      AI TUTOR ACTIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                    {aiSessionPaper.courseTitle} • {aiSessionPaper.examType} ({aiSessionPaper.year || 'PYQ'})
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setAiSessionPaper(null)}
                style={{ 
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                  color: '#f87171', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Action Chips Bar */}
            <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(15, 23, 42, 0.75)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '0.6rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[
                { label: 'Step-by-Step Solutions', query: 'Provide a complete step-by-step answer key for all questions in this paper.', mode: 'solutions', icon: '💡' },
                { label: 'Practice Mock Quiz', query: 'Generate a 5-question practice quiz based on key concepts in this paper.', mode: 'quiz', icon: '📝' },
                { label: 'High-Weightage Topics', query: 'List the top 5 high-weightage topics and recurring question patterns in this exam.', mode: 'topics', icon: '🎯' },
                { label: 'Explain Q1 in Detail', query: 'Explain Question 1 and provide a detailed solution with formulas.', mode: 'explain', icon: '❓' }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRunAiPyqSession(chip.query, chip.mode)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {aiSessionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '1rem', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  </div>
                  <h4 style={{ color: '#f1f5f9', margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 800 }}>Welcome to Ask Me PYQ AI Tutor!</h4>
                  <p style={{ fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6, color: '#94a3b8' }}>
                    Ask any question about this <strong style={{ color: '#34d399' }}>{aiSessionPaper.courseCode}</strong> paper, request step-by-step solutions, or click one of the quick study chips above!
                  </p>

                  {/* Math Symbols Skeleton Badges */}
                  <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: '0.4rem' }}>
                      Math & Science Engine:
                    </span>
                    {[
                      { label: 'x', sub: 'Variables' },
                      { label: 'e', sub: 'Exponentials' },
                      { label: '∫', sub: 'Integrals' },
                      { label: '∑', sub: 'Series' },
                      { label: 'π', sub: 'Constants' }
                    ].map((symbol, sIdx) => (
                      <span key={sIdx} style={{ padding: '0.35rem 0.75rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#a7f3d0', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>{symbol.label}</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'sans-serif' }}>{symbol.sub}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                aiSessionHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                      padding: '1.1rem 1.35rem',
                      borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(15, 23, 42, 0.85)',
                      color: '#f8fafc',
                      fontSize: '0.92rem',
                      lineHeight: 1.65,
                      border: msg.role === 'assistant' ? '1px solid rgba(16, 185, 129, 0.25)' : 'none',
                      boxShadow: msg.role === 'user' ? '0 6px 20px rgba(16, 185, 129, 0.3)' : '0 8px 30px rgba(0, 0, 0, 0.35)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '0.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: msg.role === 'user' ? '#d1fae5' : '#34d399' }}>
                      {msg.role === 'user' ? (
                        <>👤 <span>You</span></>
                      ) : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg> <span>AI PYQ Tutor</span></>
                      )}
                    </div>
                    {msg.text}
                  </div>
                ))
              )}

              {aiSessionLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.35rem', borderRadius: '20px 20px 20px 4px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span className="aurora-spinner" style={{ width: '20px', height: '20px', borderTopColor: '#10b981' }} />
                  <span>AI Tutor is formulating step-by-step solution...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleRunAiPyqSession(aiSessionQuery, 'explain'); }} 
              style={{ padding: '1rem 1.5rem', background: '#070a12', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              {/* Formula Quick Symbols Toolbar */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: '0.2rem' }}>
                  Quick Symbols:
                </span>
                {[
                  { label: 'x', val: 'x' },
                  { label: 'e^x', val: 'e^x' },
                  { label: '∫', val: '∫' },
                  { label: '∑', val: '∑' },
                  { label: 'd/dx', val: 'd/dx' },
                  { label: 'π', val: 'π' }
                ].map((sym, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setAiSessionQuery(prev => prev + ' ' + sym.val)}
                    style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#60a5fa', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={`Ask anything about ${aiSessionPaper.courseCode} (e.g. Explain Q2, Give answer key)...`}
                  value={aiSessionQuery}
                  onChange={(e) => setAiSessionQuery(e.target.value)}
                  style={{ flex: 1, padding: '0.85rem 1.2rem', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.92rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={aiSessionLoading || !aiSessionQuery.trim()}
                  style={{ padding: '0.85rem 1.5rem', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.18)', color: '#f8fafc', fontWeight: 800, cursor: 'pointer', opacity: aiSessionLoading || !aiSessionQuery.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' }}
                >
                  <span>Send</span>
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CommunityPage);
