import { useState, useMemo } from 'react';
import { Search, X, Flame, Laugh, BookOpen, PartyPopper, Zap, Code2, Cat, Coffee } from 'lucide-react';

const GIF_CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'funny', label: 'Funny', icon: Laugh },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'celebrate', label: 'Celebrate', icon: PartyPopper },
  { id: 'hype', label: 'Hype', icon: Zap },
  { id: 'code', label: 'Coding', icon: Code2 },
  { id: 'cats', label: 'Cats', icon: Cat },
  { id: 'chill', label: 'Chill', icon: Coffee },
];

const CURATED_GIFS = [
  // Trending / Hype
  { id: 't1', category: 'trending', tags: ['hype', 'yes', 'celebrate'], title: 'Hype Dance', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', preview: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif' },
  { id: 't2', category: 'trending', tags: ['fire', 'lit', 'hype'], title: 'Elmo Fire', url: 'https://media.giphy.com/media/P7JmDW75B5fO1OoJB6/giphy.gif', preview: 'https://media.giphy.com/media/P7JmDW75B5fO1OoJB6/200w.gif' },
  { id: 't3', category: 'trending', tags: ['mindblown', 'wow', 'shocked'], title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif' },
  { id: 't4', category: 'trending', tags: ['popcorn', 'watching', 'drama'], title: 'Eating Popcorn', url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif', preview: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/200w.gif' },

  // Funny
  { id: 'f1', category: 'funny', tags: ['laugh', 'lol', 'funny', 'haha'], title: 'Minion Laugh', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', preview: 'https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif' },
  { id: 'f2', category: 'funny', tags: ['cat', 'confused', 'funny'], title: 'Confused Cat', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', preview: 'https://media.giphy.com/media/unQ3IJU2RG7DO/200w.gif' },
  { id: 'f3', category: 'funny', tags: ['facepalm', 'no', 'crying'], title: 'Facepalm', url: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif', preview: 'https://media.giphy.com/media/3og0INyCmHlNylks9O/200w.gif' },
  { id: 'f4', category: 'funny', tags: ['awkward', 'homer', 'bushes'], title: 'Homer Disappears', url: 'https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif', preview: 'https://media.giphy.com/media/jUwpNzg9IcyrK/200w.gif' },

  // Study / Exam
  { id: 's1', category: 'study', tags: ['study', 'reading', 'exam', 'fat', 'cat'], title: 'Typing Fast', url: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0Z/giphy.gif', preview: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0Z/200w.gif' },
  { id: 's2', category: 'study', tags: ['study', 'tired', 'sleepy', 'books'], title: 'Overwhelmed Study', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', preview: 'https://media.giphy.com/media/13HgwGsXF0aiGY/200w.gif' },
  { id: 's3', category: 'study', tags: ['math', 'confused', 'calculate'], title: 'Math Lady Confusion', url: 'https://media.giphy.com/media/DHqth0hVQoIzS/giphy.gif', preview: 'https://media.giphy.com/media/DHqth0hVQoIzS/200w.gif' },
  { id: 's4', category: 'study', tags: ['exam', 'done', 'stress'], title: 'Exam Stress', url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', preview: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/200w.gif' },

  // Celebrate
  { id: 'c1', category: 'celebrate', tags: ['celebrate', 'party', 'congrats', 'win'], title: 'Party Confetti', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', preview: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif' },
  { id: 'c2', category: 'celebrate', tags: ['dance', 'happy', 'party'], title: 'Happy Dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', preview: 'https://media.giphy.com/media/blSTtZehjAZ8I/200w.gif' },
  { id: 'c3', category: 'celebrate', tags: ['cheers', 'champagne', 'leo'], title: 'Leo Cheers', url: 'https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif', preview: 'https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/200w.gif' },

  // Coding
  { id: 'cd1', category: 'code', tags: ['code', 'developer', 'hacker', 'matrix'], title: 'Hacker Fast Typing', url: 'https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif', preview: 'https://media.giphy.com/media/YQitE4YNQNahy/200w.gif' },
  { id: 'cd2', category: 'code', tags: ['code', 'bug', 'working', 'magic'], title: 'It Works Why', url: 'https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif', preview: 'https://media.giphy.com/media/ZVik7pBtu9dNS/200w.gif' },
  { id: 'cd3', category: 'code', tags: ['code', 'git', 'push', 'coffee'], title: 'Coffee & Code', url: 'https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif', preview: 'https://media.giphy.com/media/du3J3cXyzhj75IOgvA/200w.gif' },

  // Cats
  { id: 'ct1', category: 'cats', tags: ['cat', 'cute', 'typing', 'bongo'], title: 'Bongo Cat', url: 'https://media.giphy.com/media/ule4akeEDWA0/giphy.gif', preview: 'https://media.giphy.com/media/ule4akeEDWA0/200w.gif' },
  { id: 'ct2', category: 'cats', tags: ['cat', 'vibing', 'headbob'], title: 'Vibing Cat', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif', preview: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/200w.gif' },

  // Chill / Coffee
  { id: 'ch1', category: 'chill', tags: ['chill', 'coffee', 'fine', 'this is fine'], title: 'This is Fine', url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif', preview: 'https://media.giphy.com/media/NTur7XlVDUdqM/200w.gif' },
  { id: 'ch2', category: 'chill', tags: ['chill', 'relax', 'sloth'], title: 'Sloth Chill', url: 'https://media.giphy.com/media/26xBI73gWquCBBCDe/giphy.gif', preview: 'https://media.giphy.com/media/26xBI73gWquCBBCDe/200w.gif' }
];

export function WhatsAppGifPicker({ isOpen, onClose, onSelectGif }) {
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGifs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return CURATED_GIFS.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return CURATED_GIFS.filter(g => g.category === selectedCategory);
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: '72px',
        left: '12px',
        right: '12px',
        maxWidth: '420px',
        height: '380px',
        background: '#202c33',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 300,
        overflow: 'hidden'
      }}
    >
      {/* Header with Search & Close */}
      <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', color: '#8696a0' }} />
          <input
            type="text"
            placeholder="Search GIFs & reactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: '#111b21',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              color: '#e9edef',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Categories Bar (hidden during search) */}
      {!searchQuery && (
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          padding: '0.5rem 0.75rem',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          scrollbarWidth: 'none'
        }}>
          {GIF_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '14px',
                  background: isSelected ? '#00a884' : 'rgba(255, 255, 255, 0.06)',
                  color: isSelected ? '#ffffff' : '#aebac1',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* GIF Grid */}
      <div style={{
        flex: 1,
        padding: '0.65rem',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem',
        alignContent: 'start'
      }}>
        {filteredGifs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: '#8696a0', fontSize: '0.85rem' }}>
            No GIFs found for "{searchQuery}". Try a different keyword!
          </div>
        ) : (
          filteredGifs.map(gif => (
            <div
              key={gif.id}
              onClick={() => {
                onSelectGif(gif.url);
                onClose();
              }}
              style={{
                position: 'relative',
                height: '110px',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#111b21',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <img
                src={gif.preview || gif.url}
                alt={gif.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{
                position: 'absolute',
                bottom: '4px',
                left: '6px',
                background: 'rgba(0, 0, 0, 0.75)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: '#fff',
                fontWeight: 700
              }}>
                GIF
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
