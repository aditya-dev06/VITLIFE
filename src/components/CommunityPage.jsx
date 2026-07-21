import { useState, useEffect, useCallback } from 'react';

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

const parsePaperText = (text, existingPapers) => {
  const result = {};
  
  // 1. Extract Course Code (e.g. MAT3002, CSE101)
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

  // 3. Extract Academic Year (e.g., 2024-25)
  const yearMatch = text.match(/\b(202\d)[-/](2\d)\b/);
  if (yearMatch) {
    result.year = `${yearMatch[1]}-${yearMatch[2]}`;
  } else {
    const fullYearMatch = text.match(/\b(202\d)[-/](202\d)\b/);
    if (fullYearMatch) {
      result.year = `${fullYearMatch[1]}-${fullYearMatch[2].substring(2)}`;
    }
  }

  // 4. Extract Semester
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


export default function CommunityPage({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('pyq'); // 'pyq' | 'chats' | 'marketplace'
  const [papers, setPapers] = useState([]);
  const [pendingPapers, setPendingPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [uploadExamType, setUploadExamType] = useState('MTE');
  const [uploadYear, setUploadYear] = useState('24-25');
  const [uploadSemester, setUploadSemester] = useState('1');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' | 'link'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadExamDate, setUploadExamDate] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [detectingText, setDetectingText] = useState(false);



  // PDF Preview Modal State
  const [previewPaper, setPreviewPaper] = useState(null);
  const [selectedCourseCode, setSelectedCourseCode] = useState(null);

  // Pinch-to-zoom / Gesture zoom state for paper preview
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees

  const handleSetPreviewPaper = (paper) => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setRotation(0);
    setPreviewPaper(paper);
  };

  // Derived selected course group
  const selectedCourseGroup = (() => {
    if (!selectedCourseCode) return null;
    const coursePapers = papers.filter(p => (p.courseCode || '').trim().toUpperCase() === selectedCourseCode);
    if (coursePapers.length === 0) return null;
    return {
      courseCode: selectedCourseCode,
      courseTitle: coursePapers[0].courseTitle || selectedCourseCode,
      semester: coursePapers[0].semester,
      papersList: coursePapers
    };
  })();

  const handleAutoDetect = async (file) => {
    setDetectingText(true);
    setError('');
    setSuccess('');
    try {
      const compressedBase64 = await compressImage(file);
      const Tesseract = await loadTesseract();
      const worker = await Tesseract.createWorker('eng');
      const ret = await worker.recognize(compressedBase64);
      await worker.terminate();
      
      const text = ret.data.text;
      const detected = parsePaperText(text, papers);
      
      let filledAny = false;
      if (detected.courseCode) { setCourseCode(detected.courseCode); filledAny = true; }
      if (detected.courseTitle) { setCourseTitle(detected.courseTitle); filledAny = true; }
      if (detected.examType) { setUploadExamType(detected.examType); filledAny = true; }
      if (detected.year) { setUploadYear(detected.year); filledAny = true; }
      if (detected.semester) { setUploadSemester(detected.semester); filledAny = true; }
      
      if (filledAny) {
        setSuccess('✨ Automatically detected paper details from scan!');
      }
    } catch (err) {
      console.warn('Auto-detect failed:', err);
    } finally {
      setDetectingText(false);
    }
  };

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      let queryUrl = '/api/papers';
      if (searchQuery) queryUrl += `?search=${encodeURIComponent(searchQuery)}`;
      
      const token = localStorage.getItem('ds_ai_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(queryUrl, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch papers.');
      
      let list = data.papers || [];
      if (filterExamType) {
        list = list.filter(p => p.examType === filterExamType);
      }
      if (filterYear) {
        list = list.filter(p => p.year === filterYear);
      }
      setPapers(list);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterExamType, filterYear]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPapers();
    if (user && user.role === 'admin') {
      fetchPendingPapers();
    }
  }, [searchQuery, filterExamType, filterYear, fetchPapers, fetchPendingPapers, user]);

  useEffect(() => {
    if (previewPaper || showUploadModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewPaper, showUploadModal]);

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
      
      const fileDataArr = [];
      const fileNameArr = [];
      let fullTextCombined = '';

      // 1. Load OCR worker if images are uploaded
      let Tesseract = null;
      let worker = null;
      const hasImages = selectedFiles.some(f => f.type.startsWith('image/'));
      if (hasImages) {
        Tesseract = await loadTesseract();
        worker = await Tesseract.createWorker('eng');
      }

      // 2. Process each file
      for (const file of selectedFiles) {
        // PDF size check (Vercel payload limit is 4.5MB; base64 adds ~33% overhead)
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          if (file.size > 3.3 * 1024 * 1024) {
            throw new Error(`PDF file "${file.name}" is too large (maximum 3.3MB for direct uploads). Please compress the PDF or use another file.`);
          }
        }

        let base64Data;
        let finalFileName = file.name;

        if (file.type.startsWith('image/')) {
          // Compress image client-side to fit within Vercel body limits
          base64Data = await compressImage(file);
          const lastDotIdx = file.name.lastIndexOf('.');
          const baseName = lastDotIdx !== -1 ? file.name.substring(0, lastDotIdx) : 'image';
          finalFileName = `${baseName}.jpg`;

          // Run OCR to extract full text and metadata
          if (worker) {
            try {
              const ret = await worker.recognize(base64Data);
              if (ret.data && ret.data.text) {
                fullTextCombined += ret.data.text + '\n';
              }
            } catch (ocrErr) {
              console.warn('OCR page scan failed:', ocrErr);
            }
          }
        } else {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
          });
          reader.readAsDataURL(file);
          base64Data = await base64Promise;
        }

        fileDataArr.push(base64Data);
        fileNameArr.push(finalFileName);
      }

      if (worker) {
        await worker.terminate();
      }

      // 3. Parse combined text to extract metadata
      const detected = parsePaperText(fullTextCombined, papers);
      const courseCodeVal = detected.courseCode || 'UNKNOWN';
      const courseTitleVal = detected.courseTitle || 'Scanned Question Paper';
      const examTypeVal = detected.examType || 'MTE';
      const yearVal = detected.year || '2024-25';
      const semesterVal = detected.semester || '1';

      const payload = {
        courseCode: courseCodeVal,
        courseTitle: courseTitleVal,
        examType: examTypeVal,
        year: yearVal,
        semester: semesterVal,
        fileData: fileDataArr.length === 1 ? fileDataArr[0] : fileDataArr,
        fileName: fileNameArr.length === 1 ? fileNameArr[0] : fileNameArr,
        fullText: fullTextCombined
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/papers', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit paper.');

      // Clear files, close modal, and display success toast for 2 seconds
      setSelectedFiles([]);
      setShowUploadModal(false);
      setSuccess(`Paper for ${courseCodeVal} is in process!`);
      
      // Auto-clear success message after 2 seconds
      setTimeout(() => {
        setSuccess('');
      }, 2000);

      // Refresh listings
      fetchPapers();
      if (user && user.role === 'admin') {
        fetchPendingPapers();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleApprovePaper = async (id) => {
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
  };

  const handleDeletePaper = async (id) => {
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
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.3, 5));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(prev - 0.3, 0.8);
      if (next <= 1) setZoomOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomReset = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - zoomOffset.x, y: e.clientY - zoomOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setZoomOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - zoomOffset.x, y: touch.clientY - zoomOffset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setZoomOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomScale > 1) {
      handleZoomReset();
    } else {
      setZoomScale(2.2);
    }
  };

  const handleWheel = (e) => {
    const delta = e.deltaY * -0.005;
    setZoomScale(prev => {
      const next = Math.min(Math.max(prev + delta, 0.8), 5);
      if (next <= 1) setZoomOffset({ x: 0, y: 0 });
      return next;
    });
  };

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
          className={`community-tab-btn ${activeSubTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('marketplace')}
        >
          🛍️ Buy & Sell
        </button>
      </div>

      {activeSubTab === 'pyq' && (
        <div className="pyq-workspace animate-fade-in">
          {/* Top Info Banner */}
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
                
                <div className="paper-files-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedCourseGroup.papersList.map(paper => {
                    // Premium dynamic badges
                    const getBadgeProps = (type) => {
                      const t = (type || '').toUpperCase();
                      if (t.includes('MTE')) {
                        return { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.08))', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#f59e0b' };
                      }
                      if (t.includes('TEE') || t.includes('FAT')) {
                        return { bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(109, 40, 217, 0.08))', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#a78bfa' };
                      }
                      return { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(4, 120, 87, 0.08))', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981' };
                    };
                    const badge = getBadgeProps(paper.examType);

                    return (
                      <div 
                        key={paper._id} 
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
                            <span style={{ padding: '0.2rem 0.65rem', fontSize: '0.68rem', borderRadius: '6px', background: badge.bg, border: badge.border, color: badge.color, fontWeight: '700', letterSpacing: '0.02em' }}>
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
                            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--primary))', fontWeight: '700', background: 'hsla(var(--primary) / 0.08)', border: '1px solid hsla(var(--primary) / 0.2)', padding: '0.15rem 0.55rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              📅 {paper.examDate ? new Date(paper.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date: N/A'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            👤 Contributed by {paper.uploadedBy || 'Community'}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          {(() => {
                            const urls = getPaperUrls(paper.url);
                            if (urls.length > 1) {
                              return (
                                <button
                                  className="paper-btn download"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewPaper(paper);
                                  }}
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
                                    cursor: 'pointer',
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
                                  📖 View Pages ({urls.length})
                                </button>
                              );
                            } else {
                              return (
                                <a
                                  href={urls[0] || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="paper-btn download"
                                  onClick={(e) => e.stopPropagation()}
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
                                  📖 Open Paper
                                </a>
                              );
                            }
                          })()}
                          {user && user.role === 'admin' && (
                            <button
                              className="paper-btn delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePaper(paper._id);
                              }}
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
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Otherwise show filters, moderation queue, and courses grid */
            <>
              {/* Search and Filters Bento Grid */}
              <div className="pyq-filters-container">
                <div className="pyq-search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search course code (e.g. MAT3002) or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="pyq-filter-dropdowns">
                  <select
                    value={filterExamType}
                    onChange={(e) => setFilterExamType(e.target.value)}
                    className="pyq-filter-select"
                  >
                    <option value="">All Exam Types</option>
                    {EXAM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="pyq-filter-select"
                  >
                    <option value="">All Years</option>
                    {ACADEMIC_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Moderation Queue */}
              {user && user.role === 'admin' && pendingPapers.length > 0 && (
                <div className="moderation-panel">
                  <h3>🛡️ Pending Paper Submissions ({pendingPapers.length})</h3>
                  <div className="moderation-grid">
                    {pendingPapers.map(paper => (
                      <div key={paper._id} className="moderation-card">
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
                          {paper.examDate && (
                            <span style={{ display: 'block', color: 'hsl(var(--primary))', fontSize: '0.75rem', marginTop: '0.15rem', fontWeight: 600 }}>
                              📅 Exam Date: {new Date(paper.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </p>
                        <div className="moderation-actions">
                          <button
                            onClick={() => setPreviewPaper(paper)}
                            className="mod-action-btn view"
                            style={{ cursor: 'pointer' }}
                          >
                            🔍 View Doc
                          </button>
                          <button onClick={() => handleApprovePaper(paper._id)} className="mod-action-btn approve">
                            ✅ Approve
                          </button>
                          <button onClick={() => handleDeletePaper(paper._id)} className="mod-action-btn reject">
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Papers List */}
              <div className="pyq-list-section">
                <h3>Available Question Papers ({papers.length})</h3>
                {loading ? (
                  <div className="pyq-loading-state">
                    <div className="aurora-spinner" />
                    <p>Loading papers...</p>
                  </div>
                ) : papers.length === 0 ? (
                  <div className="pyq-empty-state">
                    <span>📂</span>
                    <p>No papers found matching the selected criteria.</p>
                    <p className="subtitle">Be the first to share one!</p>
                  </div>
                ) : (() => {
                  const grouped = papers.reduce((acc, paper) => {
                    const code = (paper.courseCode || '').trim().toUpperCase();
                    if (!code) return acc;
                    if (!acc[code]) {
                      acc[code] = {
                        courseCode: code,
                        courseTitle: paper.courseTitle || code,
                        department: paper.department,
                        semester: paper.semester,
                        papersList: []
                      };
                    }
                    acc[code].papersList.push(paper);
                    return acc;
                  }, {});
                  const courseGroups = Object.values(grouped);

                  return (
                    <div className="pyq-papers-grid">
                      {courseGroups.map(group => (
                        <div
                          key={group.courseCode}
                          className="pyq-paper-card"
                          onClick={() => setSelectedCourseCode(group.courseCode)}
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
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'chats' && (
        <div className="community-locked-section animate-fade-in">
          <div className="locked-card">
            <span className="locked-icon">🔒</span>
            <h2>Student Chats & Forums</h2>
            <p>Connect with peers, create study circles, and discuss syllabus updates. Coming soon in the next major portal release.</p>
            <div className="locked-tag">BETA STAGE</div>
          </div>
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
              
              {/* Scan and Upload Loader overlay */}
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



      {/* ── PDF PREVIEW MODAL ── */}
      {previewPaper && (
        <div className="aurora-modal-overlay" onClick={() => handleSetPreviewPaper(null)} style={{ padding: 0, zIndex: 99999 }}>
          <div className="aurora-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', borderRadius: '0px', border: 'none', background: '#0b0f19', position: 'relative' }}>
            
            {/* Absolute Red Close Button on Top Right with text-shadow for extreme visibility */}
            <button
              className="aurora-modal-close"
              onClick={() => handleSetPreviewPaper(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                zIndex: 100000,
                fontSize: '2.5rem',
                color: '#ef4444',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                margin: 0
              }}
            >
              ×
            </button>

            {/* Float-in Translucent Bottom Control Dock */}
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '0.6rem 1.25rem',
              borderRadius: '30px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
            }}>
              {(() => {
                const urls = getPaperUrls(previewPaper.url);
                if (urls.length > 1) {
                  return urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      download={`paper_page_${idx + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="paper-btn download"
                      style={{ margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: '600' }}
                    >
                      📥 Page {idx + 1}
                    </a>
                  ));
                } else if (urls.length === 1) {
                  const singleUrl = urls[0];
                  return (
                    <>
                      <a
                        href={singleUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="paper-btn download"
                        style={{ margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: '600' }}
                      >
                        📥 Download
                      </a>
                      <a
                        href={singleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="paper-btn preview"
                        style={{ margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: '600' }}
                      >
                        ↗️ Open Tab
                      </a>
                    </>
                  );
                }
                return null;
              })()}

              {/* Conditional Zoom & Rotate buttons for image preview */}
              {isImageUrl(previewPaper.url) && (
                <>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />
                  <button
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                    title="Rotate Paper 90 degrees"
                  >
                    🔄 Rotate
                  </button>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />
                  <button onClick={handleZoomOut} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }} title="Zoom Out">➖</button>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '700', minWidth: '38px', textAlign: 'center' }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button onClick={handleZoomIn} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }} title="Zoom In">➕</button>
                  <button onClick={handleZoomReset} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold' }} title="Reset Zoom">Reset</button>
                </>
              )}
            </div>
            
            <div className="pdf-preview-body" style={{ flex: 1, background: '#0b0f19', overflow: 'hidden', width: '100vw', height: '100vh' }}>
              {isImageUrl(previewPaper.url) ? (
                (() => {
                  const isLandscape = window.innerWidth > window.innerHeight;
                  const isHorizontalLayout = isLandscape || rotation === 90 || rotation === 270;
                  const imageUrls = getPaperUrls(previewPaper.url);
                  return (
                    <div
                      className="preview-media-viewport"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onDoubleClick={handleDoubleClick}
                      onWheel={handleWheel}
                      style={{
                        height: '100%',
                        width: '100%',
                        overflowX: 'hidden',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: '2rem',
                        cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        touchAction: zoomScale === 1 ? 'pan-y' : 'none',
                        padding: '2rem 1rem 8rem 1rem'
                      }}
                    >
                      {imageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: isHorizontalLayout ? '100%' : 'auto', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <img
                            src={url}
                            alt={`Page ${idx + 1}`}
                            style={{
                              transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                              transformOrigin: 'center top',
                              transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                              width: isHorizontalLayout ? '100%' : 'auto',
                              height: 'auto',
                              maxWidth: '100%',
                              maxHeight: isHorizontalLayout ? 'none' : '85vh',
                              objectFit: 'contain',
                              userSelect: 'none',
                              pointerEvents: 'none',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          />
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: '0.50rem', fontWeight: 600 }}>Page {idx + 1} of {imageUrls.length}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <iframe
                  title="Paper Preview"
                  src={getPaperUrls(previewPaper.url)[0] || ''}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
