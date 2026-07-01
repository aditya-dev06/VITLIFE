import { useState, useEffect, useCallback } from 'react';

const EXAM_TYPES = ['MTE', 'TEE', 'CAT-1', 'CAT-2', 'FAT'];
const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26'];

const isImageUrl = (url) => {
  if (!url) return false;
  const imageRegex = /\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i;
  return imageRegex.test(url) || url.includes('/image/upload/');
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadExamDate, setUploadExamDate] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);



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

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      let queryUrl = '/api/papers';
      if (searchQuery) queryUrl += `?search=${encodeURIComponent(searchQuery)}`;
      
      const res = await fetch(queryUrl);
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

    if (!courseCode || !courseTitle) {
      setError('Please fill in all required fields.');
      return;
    }

    setUploadLoading(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      const payload = {
        courseCode,
        courseTitle,
        examType: uploadExamType,
        year: uploadYear,
        semester: uploadSemester,
        examDate: uploadExamDate || null
      };

      if (uploadMethod === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload.');
        }

        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
        reader.readAsDataURL(selectedFile);
        const base64Data = await base64Promise;

        payload.fileData = base64Data;
        payload.fileName = selectedFile.name;
      } else {
        if (!uploadUrl) {
          throw new Error('Please enter a document URL.');
        }
        payload.url = uploadUrl;
      }

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

      setSuccess(data.message);
      setCourseCode('');
      setCourseTitle('');
      setUploadUrl('');
      setSelectedFile(null);
      setUploadExamDate('');
      setShowUploadModal(false);
      
      // Refresh listings
      fetchPapers();
      if (user.role === 'admin') {
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
                          <a
                            href={paper.url}
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
                            📖 Open PDF
                          </a>
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
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="mod-action-btn view">
                            🔍 View Doc
                          </a>
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
        <div className="aurora-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="aurora-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="aurora-modal-header">
              <h3>Share Exam Paper</h3>
              <button className="aurora-modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="aurora-form">
              <div className="floating-field active">
                <input
                  type="text"
                  required
                  placeholder="e.g. MAT3002"
                  value={courseCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCourseCode(val);
                    if (val) {
                      const cleanCode = val.trim().toUpperCase();
                      const match = papers.find(p => p.courseCode && p.courseCode.trim().toUpperCase() === cleanCode);
                      if (match && match.courseTitle) {
                        setCourseTitle(match.courseTitle);
                      }
                    }
                  }}
                  style={{ textTransform: 'uppercase' }}
                />
                <label className="floating-label">Course Code</label>
              </div>

              <div className="floating-field active">
                <input
                  type="text"
                  required
                  placeholder="e.g. Applied Linear Algebra"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                />
                <label className="floating-label">Course Title</label>
              </div>

              <div className="floating-field active">
                <select value={uploadExamType} onChange={(e) => setUploadExamType(e.target.value)} className="aurora-select">
                  {EXAM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <label className="floating-label" style={{ top: '-10px', fontSize: '0.75rem' }}>Exam Type</label>
              </div>

              <div className="floating-field active" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <select value={uploadYear} onChange={(e) => setUploadYear(e.target.value)} className="aurora-select">
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <label className="floating-label" style={{ top: '-10px', fontSize: '0.75rem' }}>Academic Year</label>
                </div>
                <div>
                  <select value={uploadSemester} onChange={(e) => setUploadSemester(e.target.value)} className="aurora-select">
                    {[1,2,3,4,5,6,7,8,9,10].map(s => (
                      <option key={s} value={s.toString()}>Semester {s}</option>
                    ))}
                  </select>
                  <label className="floating-label" style={{ top: '-10px', fontSize: '0.75rem' }}>Semester</label>
                </div>
              </div>

              {/* Exam Date Field */}
              <div className="floating-field active" style={{ marginTop: '1.25rem' }}>
                <input
                  type="date"
                  placeholder="Select Exam Date"
                  value={uploadExamDate}
                  onChange={(e) => setUploadExamDate(e.target.value)}
                />
                <label className="floating-label" style={{ top: '-10px', fontSize: '0.75rem' }}>Date of Exam (Optional)</label>
              </div>

              {/* Upload Method Selector Tab */}
              <div style={{ display: 'flex', gap: '0.25rem', margin: '1.5rem 0 1rem 0', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadMethod('file')}
                  style={{
                    flex: 1, padding: '0.4rem 0', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: '700', transition: 'all 0.2s',
                    background: uploadMethod === 'file' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                    color: uploadMethod === 'file' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                  }}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('link')}
                  style={{
                    flex: 1, padding: '0.4rem 0', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: '700', transition: 'all 0.2s',
                    background: uploadMethod === 'link' ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                    color: uploadMethod === 'link' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                  }}
                >
                  🔗 Link URL
                </button>
              </div>

              {uploadMethod === 'file' ? (
                <div className="floating-field active" style={{ border: '1px dashed hsla(var(--border-glass))', padding: '1.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', textAlign: 'center' }}>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="paper-file-upload-input"
                  />
                  <label htmlFor="paper-file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                    <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>📤</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'hsl(var(--primary))' }}>
                      {selectedFile ? selectedFile.name : 'Select File from Gallery/Device'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'block', marginTop: '0.2rem' }}>
                      Supports PDF and Images
                    </span>
                  </label>
                </div>
              ) : (
                <div className="floating-field active">
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                  />
                  <label className="floating-label">PDF / Document URL</label>
                  <p className="aurora-form-hint">Host your file on Google Drive, OneDrive, or similar and paste the public link.</p>
                </div>
              )}

              <button type="submit" className="aurora-submit-btn" disabled={uploadLoading} style={{ marginTop: '1.5rem' }}>
                {uploadLoading ? <span className="aurora-spinner" /> : 'Submit Paper'}
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
              <a
                href={previewPaper.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="paper-btn download"
                style={{ margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: '600' }}
              >
                📥 Download
              </a>
              <a
                href={previewPaper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="paper-btn preview"
                style={{ margin: 0, padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: '600' }}
              >
                ↗️ Open Tab
              </a>

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
                        overflowY: isHorizontalLayout ? 'auto' : 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: isHorizontalLayout ? 'flex-start' : 'center',
                        alignItems: 'center',
                        cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        touchAction: isHorizontalLayout && zoomScale === 1 ? 'pan-y' : 'none',
                        padding: isHorizontalLayout ? '1rem 0 5rem 0' : '0'
                      }}
                    >
                      <img
                        src={previewPaper.url}
                        alt={`${previewPaper.courseCode} — ${previewPaper.courseTitle}`}
                        style={{
                          transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                          transformOrigin: isHorizontalLayout ? 'center top' : 'center center',
                          transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                          width: isHorizontalLayout ? '100%' : 'auto',
                          height: 'auto',
                          maxWidth: '100%',
                          maxHeight: isHorizontalLayout ? 'none' : '100%',
                          objectFit: 'contain',
                          userSelect: 'none',
                          pointerEvents: 'none'
                        }}
                      />
                    </div>
                  );
                })()
              ) : (
                <iframe
                  title="Paper Preview"
                  src={previewPaper.url}
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
