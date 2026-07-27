import { useState, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Building2,
  Mail,
  Phone,
  Check,
  Copy,
  X,
} from 'lucide-react';
import { FACULTY_DIRECTORY } from '../data/facultyDirectory';
import { SkeletonGrid, FacultyCardSkeleton } from './SkeletonLoader';
import { InputGroup, InputGroupInput, InputGroupAddon } from './ui/InputGroup';
import './FacultyDirectory.css';

const FacultyDirectory = memo(function FacultyDirectory() {
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const filteredFaculty = useMemo(() => {
    let list = FACULTY_DIRECTORY;

    if (selectedSchool !== 'ALL') {
      if (selectedSchool === 'LEADERSHIP') {
        list = list.filter(
          (f) =>
            f.role &&
            (f.role.includes('Dean') ||
              f.role.includes('Programme Chair') ||
              f.role.includes('Division Head') ||
              f.role.includes('Coordinator'))
        );
      } else {
        list = list.filter((f) => f.school && f.school.includes(selectedSchool));
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.cabinNo && f.cabinNo.toLowerCase().includes(q)) ||
          (f.roomNo && f.roomNo.toLowerCase().includes(q)) ||
          (f.empId && f.empId.toLowerCase().includes(q)) ||
          (f.phone && f.phone.includes(q)) ||
          (f.email && f.email.toLowerCase().includes(q)) ||
          (f.role && f.role.toLowerCase().includes(q)) ||
          (f.school && f.school.toLowerCase().includes(q))
      );
    }

    return list;
  }, [search, selectedSchool]);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="faculty-container">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="faculty-header"
      >
        <div className="faculty-header-title">
          <div className="faculty-header-icon">
            <Building2 size={24} className="text-cyan-400" />
          </div>
          <div>
            <h1>Faculty &amp; Cabin Finder</h1>
            <p>Search faculty cabins, phone numbers, and official email addresses across VIT Bhopal</p>
          </div>
        </div>
      </motion.div>

      {/* Controls & Search Bar */}
      <div className="faculty-controls">
        <div className="faculty-search-wrapper">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search size={18} />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search by faculty name, cabin, room no, phone no, or EMP ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search faculty directory"
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <button onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={16} />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {/* Filter Pills */}
        <div className="faculty-filters">
          <button
            className={`filter-pill ${selectedSchool === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedSchool('ALL')}
          >
            All Faculty ({FACULTY_DIRECTORY.length})
          </button>
          <button
            className={`filter-pill ${selectedSchool === 'SCOPE' ? 'active' : ''}`}
            onClick={() => setSelectedSchool('SCOPE')}
          >
            SCOPE
          </button>
          <button
            className={`filter-pill ${selectedSchool === 'SCAI' ? 'active' : ''}`}
            onClick={() => setSelectedSchool('SCAI')}
          >
            SCAI
          </button>
          <button
            className={`filter-pill ${selectedSchool === 'LEADERSHIP' ? 'active' : ''}`}
            onClick={() => setSelectedSchool('LEADERSHIP')}
          >
            Deans &amp; Leadership
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="results-count-bar">
        <span>
          Showing <strong>{filteredFaculty.length}</strong> active faculty entries
        </span>
        {search && (
          <button className="clear-search-link" onClick={() => setSearch('')}>
            Clear Search
          </button>
        )}
      </div>

      {/* Faculty Cards Grid */}
      {filteredFaculty.length > 0 ? (
        <div className="faculty-grid">
          {filteredFaculty.map((f, idx) => {
            const cardKey = `fac-${f.sNo}-${f.cabinNo}`;
            const isLeadership =
              f.role &&
              (f.role.includes('Dean') ||
                f.role.includes('Programme Chair') ||
                f.role.includes('Division Head'));

            return (
              <motion.div
                key={cardKey}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.25) }}
                className={`faculty-card ${isLeadership ? 'leadership-card' : ''}`}
              >
                <div className="faculty-card-header">
                  <div className="faculty-avatar">
                    {f.name.startsWith('Dr.') ? '👨‍🏫' : '👩‍🏫'}
                  </div>
                  <div className="faculty-meta">
                    <h3 className="faculty-name">{f.name}</h3>
                    <p className="faculty-role">{f.role || 'Faculty Member'}</p>
                  </div>
                </div>

                <div className="faculty-details">
                  <div className="detail-item location-item">
                    <Building2 size={15} className="detail-icon" />
                    <span className="location-tag">
                      <strong>{f.building && f.building.includes('AB1') ? 'Block AB1' : 'Block AB2'}</strong>
                      {f.roomNo && f.roomNo !== 'N/A' && f.roomNo !== 'AB2' ? (
                        <> • <strong>Room {f.roomNo.startsWith('AB') ? f.roomNo : `AB${f.roomNo}`}</strong></>
                      ) : (
                        <> • <strong className="opacity-60">Room N/A</strong></>
                      )}
                      {f.cabinNo && f.cabinNo !== 'N/A' && f.cabinNo !== 'AB2' && f.cabinNo !== 'AB2 Block' ? (
                        <> • <span>Cabin {f.cabinNo}</span></>
                      ) : (
                        <> • <span className="opacity-60">Cabin N/A</span></>
                      )}
                    </span>
                  </div>

                  <div className="detail-row">
                    {f.empId && <span className="emp-pill">EMP #{f.empId}</span>}
                    {f.school && (
                      <span className={`school-pill ${f.school.toLowerCase().includes('scope') ? 'scope' : f.school.toLowerCase().includes('sasl') ? 'sasl' : 'scai'}`}>
                        {f.school}
                      </span>
                    )}
                    <span className="building-pill">{f.building || 'Academic Block'}</span>
                  </div>

                  {/* Phone & Email Action Box */}
                  <div className="contact-actions-grid">
                    {f.phone ? (
                      <div className="contact-action-box">
                        <Phone size={14} className="contact-icon text-cyan-400" />
                        <a href={`tel:${f.phone}`} className="contact-link" title="Click to call">
                          {f.phone}
                        </a>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(f.phone, `${cardKey}-phone`)}
                          title="Copy phone number"
                        >
                          {copiedId === `${cardKey}-phone` ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="contact-action-box disabled">
                        <Phone size={14} className="contact-icon opacity-40" />
                        <span className="contact-text opacity-40">Phone N/A</span>
                      </div>
                    )}

                    {f.email ? (
                      <div className="contact-action-box">
                        <Mail size={14} className="contact-icon text-purple-400" />
                        <a href={`mailto:${f.email}`} className="contact-link" title="Click to email">
                          {f.email}
                        </a>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopy(f.email, `${cardKey}-email`)}
                          title="Copy email address"
                        >
                          {copiedId === `${cardKey}-email` ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="no-results-box">
          <Building2 size={48} className="no-results-icon" />
          <h3>No faculty or cabins matched "{search}"</h3>
          <p>Try searching by faculty name, room number, cabin, or phone number.</p>
          <button className="reset-btn" onClick={() => { setSearch(''); setSelectedSchool('ALL'); }}>
            Reset Search
          </button>
        </div>
      )}
    </div>
  );
});

export default FacultyDirectory;
