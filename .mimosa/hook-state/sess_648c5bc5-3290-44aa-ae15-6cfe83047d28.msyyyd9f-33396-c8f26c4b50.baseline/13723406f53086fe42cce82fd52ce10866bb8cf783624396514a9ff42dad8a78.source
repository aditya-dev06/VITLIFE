import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Trash2, 
  Flag, 
  X, 
  Filter, 
  ExternalLink,
  MapPin,
  Tag,
  Clock,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import { useTheme } from './theme-provider';
import './MarketplacePage.css';

const CATEGORIES = [
  'All Items',
  'Electronics & Tech',
  'Textbooks & PYQs',
  'Bicycles & Mobility',
  'Lab Coats & Aprons',
  'Hostel & Room Essentials',
  'Snacks & Food',
  'Sports & Fitness'
];

const SAMPLE_IMAGE_PRESETS = [
  { label: 'Calculator', url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80' },
  { label: 'Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Lab Coat', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80' },
  { label: 'Textbook', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80' },
  { label: 'Mattress', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80' },
  { label: 'Monitor', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80' },
  { label: 'Snacks & Food', url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&auto=format&fit=crop&q=80' }
];

const INITIAL_SEED_ITEMS = [
  {
    id: "m7",
    title: "Maggi 12-Pack Family Pack + Cup Noodles Combo",
    category: "Snacks & Food",
    price: 140,
    condition: "Like New",
    description: "Unopened sealed Maggi 12-pack instant noodles + 2 Cup Noodles (Masala). Perfect late night study session hostel snack.",
    sellerName: "Siddharth Jain",
    sellerReg: "24BCSE1089",
    hostelLocation: "Boys Hostel Block 2 - Room 108",
    contactPhone: "+919812345678",
    imageUrl: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T21:00:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m1",
    title: "Casio FX-991EX ClassWiz Scientific Calculator",
    category: "Electronics & Tech",
    price: 850,
    condition: "Like New",
    description: "Essential for Calculus, Physics & Linear Algebra exams. Barely used, battery included with original protective slipcover.",
    sellerName: "Aarav Sharma",
    sellerReg: "23BCSE1042",
    hostelLocation: "Boys Hostel Block 2 - Room 412",
    contactPhone: "+919876543210",
    imageUrl: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T18:00:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m2",
    title: "Hero Sprint 21-Speed Gear Bicycle (Red/Black)",
    category: "Bicycles & Mobility",
    price: 3200,
    condition: "Good Condition",
    description: "Smooth gear shifting, rear luggage carrier installed, dual disc brakes. Perfect for riding from Block 6 to Academic Block.",
    sellerName: "Rohan Verma",
    sellerReg: "22BCE1098",
    hostelLocation: "Boys Hostel Block 5 - Room 204",
    contactPhone: "+919123456789",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T16:30:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m3",
    title: "White Lab Coat (Size L) + Safety Goggles",
    category: "Lab Coats & Aprons",
    price: 250,
    condition: "Like New",
    description: "Clean, ironed white lab coat required for Chemistry & Physics lab sessions. Includes clear safety goggles.",
    sellerName: "Ananya Patel",
    sellerReg: "24BCSE1150",
    hostelLocation: "Girls Hostel Block 1 - Room 308",
    contactPhone: "+919988776655",
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T14:15:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m4",
    title: "Data Structures & Algorithms in C++ (4th Edition - Mark Allen Weiss)",
    category: "Textbooks & PYQs",
    price: 450,
    condition: "Good Condition",
    description: "Standard reference textbook for CSE 2nd year DSA course. Contains highlighted key algorithms and handwritten notes.",
    sellerName: "Aditya Kumar",
    sellerReg: "23BCE2041",
    hostelLocation: "Boys Hostel Block 3 - Room 115",
    contactPhone: "+919811223344",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T12:00:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m5",
    title: "Single Bed Orthopedic Mattress + Soft Pillow (Coirfit 4 inch)",
    category: "Hostel & Room Essentials",
    price: 1200,
    condition: "Like New",
    description: "Super comfortable 4-inch foam mattress used for 1 semester. No stains, smoke-free room, includes washable cotton mattress cover.",
    sellerName: "Vikram Singh",
    sellerReg: "22BCE1540",
    hostelLocation: "Boys Hostel Block 1 - Room 502",
    contactPhone: "+919765432109",
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-03T10:45:00.000Z",
    isVerified: true,
    reportsCount: 0
  },
  {
    id: "m6",
    title: "Dell 24-inch FHD IPS Monitor (1080p 75Hz HDMI/VGA)",
    category: "Electronics & Tech",
    price: 4800,
    condition: "Like New",
    description: "Great secondary display for coding, web dev, and movie nights. Includes HDMI cable and power adapter. Zero dead pixels.",
    sellerName: "Priyesh Mehta",
    sellerReg: "23BCE1002",
    hostelLocation: "Boys Hostel Block 4 - Room 310",
    contactPhone: "+919543210987",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-08-02T19:20:00.000Z",
    isVerified: true,
    reportsCount: 0
  }
];

export default function MarketplacePage({ user, onRequireAuth, onBackToApp }) {
  const { theme } = useTheme();
  const [items, setItems] = useState(INITIAL_SEED_ITEMS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showSafetyBanner, setShowSafetyBanner] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // In-App Chat Direct Messaging State
  const [activeChatSellerItem, setActiveChatSellerItem] = useState(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics & Tech',
    price: '',
    condition: 'Like New',
    description: '',
    hostelLocation: user?.hostelBlock ? `${user.hostelBlock} - Room ${user.roomNo || ''}` : '',
    contactPhone: user?.phone || '',
    imageUrl: SAMPLE_IMAGE_PRESETS[0].url
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'

  const handleOpenInAppChat = (item) => {
    if (!user || user.isGuest) {
      showToast('🔒 Please log in or sign up with your VIT email to message sellers.', 'error');
      onRequireAuth && onRequireAuth();
      return;
    }
    setActiveChatSellerItem(item);
    setChatMessageText(`Hi ${item.sellerName.split(' ')[0]}! Is "${item.title}" still available for ₹${item.price}? I am interested in buying from ${item.hostelLocation}.`);
  };

  const handleSendInAppChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessageText.trim()) return;
    if (!user || user.isGuest) {
      showToast('🔒 Please log in to send messages.', 'error');
      onRequireAuth && onRequireAuth();
      return;
    }

    setIsSendingChatMessage(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      const itemRefText = `🛒 [Item Inquiry: ${activeChatSellerItem.title} | ₹${activeChatSellerItem.price}]\nSeller: ${activeChatSellerItem.sellerName} (${activeChatSellerItem.hostelLocation})\n\n${chatMessageText}`;

      const userReg = user.regNo || user.email?.split('@')[0] || 'Unknown';
      const sellerReg = activeChatSellerItem.sellerReg || activeChatSellerItem.sellerEmail?.split('@')[0] || activeChatSellerItem.sellerName.replace(/\s+/g, '');
      const dmChannelId = 'dm_' + [userReg, sellerReg].sort().join('_');

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          channel: dmChannelId,
          content: itemRefText,
          authorName: user.name || user.email?.split('@')[0] || 'VITian',
          authorRole: user.role || 'Student',
          marketplaceItem: {
            id: activeChatSellerItem.id,
            title: activeChatSellerItem.title,
            price: activeChatSellerItem.price,
            imageUrl: activeChatSellerItem.imageUrl,
            sellerName: activeChatSellerItem.sellerName,
            hostelLocation: activeChatSellerItem.hostelLocation
          }
        })
      });

      const data = await res.json();
      if (res.ok && (data.success !== false)) {
        showToast(`💬 Direct inquiry sent privately to ${activeChatSellerItem.sellerName}! Check your DM channels in Community.`);
        setActiveChatSellerItem(null);
        setChatMessageText('');
      } else {
        showToast(data.error || 'Failed to send message.', 'error');
      }
    } catch (err) {
      console.error('Failed to send in-app message:', err);
      showToast(`💬 Message sent to ${activeChatSellerItem.sellerName}!`);
      setActiveChatSellerItem(null);
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10MB.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      const body = new FormData();
      body.append('image', file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        showToast('Image uploaded successfully! 📸');
      } else {
        // Local base64 fallback reader
        const reader = new FileReader();
        reader.onload = (evt) => {
          setFormData(prev => ({ ...prev, imageUrl: evt.target.result }));
          showToast('Image attached locally! 📸');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFormData(prev => ({ ...prev, imageUrl: evt.target.result }));
        showToast('Image attached locally! 📸');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // Fetch Items in background
  const fetchItems = async () => {
    try {
      const res = await fetch('/api/marketplace/items');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to load marketplace items:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category Filter
      if (selectedCategory !== 'All Items' && item.category !== selectedCategory) {
        return false;
      }
      // Condition Filter
      if (selectedCondition !== 'All' && item.condition !== selectedCondition) {
        return false;
      }
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const sellerMatch = item.sellerName.toLowerCase().includes(q);
        const locMatch = item.hostelLocation.toLowerCase().includes(q);
        return titleMatch || descMatch || sellerMatch || locMatch;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [items, selectedCategory, selectedCondition, searchQuery, sortBy]);

  // Handle Post Item Submission
  const handleSubmitItem = async (e) => {
    e.preventDefault();
    if (!user || user.isGuest) {
      showToast('🔒 Please log in or sign up with your VIT email to list an item for sale.', 'error');
      onRequireAuth && onRequireAuth();
      return;
    }
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      showToast('Title must be at least 3 characters.', 'error');
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      showToast('Description must be at least 10 characters long.', 'error');
      return;
    }
    if (!formData.hostelLocation.trim()) {
      showToast('Please enter your Hostel Block & Room Number.', 'error');
      return;
    }
    if (!formData.contactPhone.trim()) {
      showToast('Please enter a valid contact phone number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('ds_ai_token');
      const res = await fetch('/api/marketplace/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('🎉 Your item was listed successfully!');
        setShowPostModal(false);
        setFormData({
          title: '',
          category: 'Electronics & Tech',
          price: '',
          condition: 'Like New',
          description: '',
          hostelLocation: '',
          contactPhone: '',
          imageUrl: SAMPLE_IMAGE_PRESETS[0].url
        });
        fetchItems();
      } else {
        showToast(data.error || 'Failed to list item', 'error');
      }
    } catch (err) {
      showToast('Network error while creating listing.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Listing
  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const token = localStorage.getItem('ds_ai_token');
      const res = await fetch(`/api/marketplace/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Listing removed successfully.');
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        showToast(data.error || 'Could not delete item', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting item.', 'error');
    }
  };

  // Handle Report Listing
  const handleReportItem = async (id) => {
    try {
      const res = await fetch(`/api/marketplace/items/${id}/report`, { method: 'POST' });
      if (res.ok) {
        showToast('Listing reported to campus security team.');
      }
    } catch (err) {
      showToast('Failed to report listing.', 'error');
    }
  };

  return (
    <div className={`marketplace-container ${theme === 'light' ? 'theme-light' : ''}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '80px',
              right: '24px',
              zIndex: 999999,
              padding: '0.8rem 1.25rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
              color: '#ffffff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <div className="marketplace-hero">
        <div className="marketplace-hero-top">
          <div className="marketplace-hero-brand">
            <div className="marketplace-badge">
              <Sparkles size={13} /> Official Student Resell Hub
            </div>
            <h1 className="marketplace-title">VIT Bhopal Buy & Sell</h1>
            <p className="marketplace-subtitle">
              Peer-to-peer campus marketplace to buy, sell, and trade textbooks, bicycles, mattresses, lab coats, and tech gear safely inside hostel campus.
            </p>
          </div>

          <div className="marketplace-hero-actions">
            <div className="marketplace-hero-actions-top">
              <button 
                className="btn-post-listing"
                onClick={() => {
                  if (!user) {
                    onRequireAuth && onRequireAuth();
                  } else {
                    setShowPostModal(true);
                  }
                }}
              >
                <Plus size={18} /> Post New Listing
              </button>
              <button 
                className="btn-safety-toggle"
                onClick={() => setShowSafetyBanner(prev => !prev)}
              >
                <ShieldAlert size={16} style={{ color: '#10b981' }} /> 
                {showSafetyBanner ? 'Hide Safety Rules' : 'Safety Rules'}
              </button>
            </div>
            <div className="marketplace-hero-actions-bottom">
              <button 
                className={`btn-snack-shortcut ${selectedCategory === 'Snacks & Food' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(prev => prev === 'Snacks & Food' ? 'All Items' : 'Snacks & Food')}
              >
                <UtensilsCrossed size={16} /> Snacks & Food 🍿
              </button>
            </div>
          </div>
        </div>

        {/* Safety Protocol Banner */}
        {showSafetyBanner && (
          <div className="marketplace-safety-banner">
            <div className="safety-header">
              <CheckCircle2 size={16} /> Campus Trade Verification & Safety Protocol
            </div>
            <div className="safety-grid">
              <div className="safety-item">
                <MapPin size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#10b981' }} />
                <span><strong>In-Person Inspection:</strong> Meet sellers inside campus public areas (Abhivyakti / Canteen / Academic Block).</span>
              </div>
              <div className="safety-item">
                <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#ec4899' }} />
                <span><strong>Zero Advance Payment:</strong> Never pay money via UPI before physically testing the item.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#38bdf8' }} />
                <span><strong>Verified VIT Students:</strong> Every listing is posted by authenticated VIT Bhopal students.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Filter Bar */}
      <div className="marketplace-controls">
        <div className="marketplace-controls-row">
          <div className="marketplace-search-box">
            <Search className="marketplace-search-icon" size={17} />
            <input 
              type="text"
              className="marketplace-search-input"
              placeholder="Search textbooks, bicycles, calculators, lab coats, monitors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="marketplace-filter-selects">
            <select 
              className="marketplace-select"
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
            >
              <option value="All">All Conditions</option>
              <option value="Like New">Like New</option>
              <option value="Good Condition">Good Condition</option>
              <option value="Fair">Fair</option>
            </select>

            <select 
              className="marketplace-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Latest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="marketplace-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item Card Grid */}
      {loading ? (
        <div className="marketplace-grid">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="marketplace-card" style={{ height: '340px', background: 'rgba(255,255,255,0.03)', opacity: 0.5 }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>No Listings Found</h3>
          <p style={{ color: 'hsl(var(--text-muted))', maxWidth: '400px', margin: 0 }}>
            No marketplace items match your search or filter selection. Be the first to list an item for fellow VITians!
          </p>
          <button 
            className="btn-post-listing" 
            style={{ marginTop: '0.5rem' }}
            onClick={() => user ? setShowPostModal(true) : onRequireAuth && onRequireAuth()}
          >
            <Plus size={16} /> Post First Listing
          </button>
        </div>
      ) : (
        <div className="marketplace-grid">
          {filteredItems.map(item => {
            const isOwner = user && (user.email === item.sellerEmail || user.role === 'admin');
            const formattedPhone = item.contactPhone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hi ${item.sellerName}, I am interested in buying your "${item.title}" listed on VIT Life Marketplace for ₹${item.price}. Is it still available?`)}`;

            return (
              <motion.div 
                key={item.id} 
                className="marketplace-card"
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="card-image-wrap">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="card-image" 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'; }}
                  />
                  <span className={`card-badge-condition ${
                    item.condition === 'Like New' ? 'condition-like-new' :
                    item.condition === 'Good Condition' ? 'condition-good' : 'condition-fair'
                  }`}>
                    {item.condition}
                  </span>
                  <div className="card-badge-price">₹{item.price}</div>
                </div>

                <div className="card-body">
                  <div>
                    <div className="card-category">{item.category}</div>
                    <h3 className="card-title">{item.title}</h3>
                    <p className="card-description">{item.description}</p>
                  </div>

                  <div className="card-seller-info">
                    <div className="seller-row">
                      <span className="seller-name">{item.sellerName}</span>
                      <span className="verified-tag"><CheckCircle2 size={12} /> VIT Verified</span>
                    </div>
                    <div className="seller-location">📍 {item.hostelLocation}</div>
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn-inapp-chat"
                      onClick={() => handleOpenInAppChat(item)}
                      title="Send In-App Message to Seller"
                    >
                      <MessageSquare size={15} style={{ color: '#ec4899' }} /> In-App Chat
                    </button>

                    <a 
                      href={whatsappUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-whatsapp"
                      title="Chat on WhatsApp"
                    >
                      WhatsApp
                    </a>

                    <a 
                      href={`tel:${item.contactPhone}`}
                      className="btn-call"
                      title="Call Seller"
                    >
                      <Phone size={15} />
                    </a>

                    <button 
                      className="btn-icon-action"
                      onClick={() => handleReportItem(item.id)}
                      title="Report Suspicious Item"
                    >
                      <Flag size={15} />
                    </button>

                    {isOwner && (
                      <button 
                        className="btn-icon-action"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Delete Listing"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Post New Listing Modal */}
      {showPostModal && (
        <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">List Item for Sale</h3>
              <button className="modal-close-btn" onClick={() => setShowPostModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Item Title *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g., Casio FX-991EX Calculator / Hero Sprint Bicycle"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select 
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.filter(c => c !== 'All Items').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input 
                    type="number"
                    className="form-input"
                    placeholder="e.g., 450"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Item Condition *</label>
                  <select 
                    className="form-select"
                    value={formData.condition}
                    onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                  >
                    <option value="Like New">Like New</option>
                    <option value="Good Condition">Good Condition</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hostel Block & Room *</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g., Block 2 - Room 412"
                    value={formData.hostelLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, hostelLocation: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone / WhatsApp *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="+919876543210"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Item Description *</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe item condition, inclusions, reason for selling..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              {/* Product Photo Upload / URL Section */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label">Item Photo *</label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={`mode-toggle-btn ${imageInputMode === 'upload' ? 'active' : ''}`}
                      onClick={() => setImageInputMode('upload')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: imageInputMode === 'upload' ? 'rgba(236,72,153,0.2)' : 'transparent',
                        color: imageInputMode === 'upload' ? '#ec4899' : 'hsl(var(--text-muted))',
                        border: imageInputMode === 'upload' ? '1px solid #ec4899' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      📁 Upload File
                    </button>
                    <button
                      type="button"
                      className={`mode-toggle-btn ${imageInputMode === 'url' ? 'active' : ''}`}
                      onClick={() => setImageInputMode('url')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: imageInputMode === 'url' ? 'rgba(236,72,153,0.2)' : 'transparent',
                        color: imageInputMode === 'url' ? '#ec4899' : 'hsl(var(--text-muted))',
                        border: imageInputMode === 'url' ? '1px solid #ec4899' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      🔗 Photo URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div className="file-upload-box">
                    <input
                      type="file"
                      id="marketplace-file-input"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="marketplace-file-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '2px dashed rgba(236,72,153,0.4)',
                        background: 'rgba(236,72,153,0.04)',
                        cursor: 'pointer',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>📸</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                        {uploadingImage ? 'Uploading Image...' : 'Click to Upload Image from Device'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                        Supports PNG, JPG, WEBP (Max 10MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="https://..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {SAMPLE_IMAGE_PRESETS.map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: preset.url }))}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'hsl(var(--text-muted))',
                            cursor: 'pointer'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo Preview Thumbnail */}
                {formData.imageUrl && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid hsla(var(--border-glass))' }}>
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>Photo Attached</div>
                      <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formData.imageUrl}</div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn-submit-item"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Listing Item...' : 'Publish Item Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-App Direct Message Modal */}
      {activeChatSellerItem && (
        <div className="modal-overlay" onClick={() => setActiveChatSellerItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💬 Message Seller
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveChatSellerItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0.85rem', background: 'rgba(236, 72, 153, 0.06)', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <img 
                src={activeChatSellerItem.imageUrl} 
                alt={activeChatSellerItem.title} 
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} 
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeChatSellerItem.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ec4899', fontWeight: 700 }}>
                  ₹{activeChatSellerItem.price.toLocaleString()} • Seller: {activeChatSellerItem.sellerName}
                </div>
              </div>
            </div>

            <form onSubmit={handleSendInAppChatMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Your Message to Seller</label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  value={chatMessageText}
                  onChange={(e) => setChatMessageText(e.target.value)}
                  placeholder="Ask about item condition, negotiation, or pickup location..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveChatSellerItem(null)}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid hsla(var(--border-glass))',
                    color: 'hsl(var(--text-primary))',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingChatMessage}
                  style={{
                    flex: 2,
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ec4899, #d946ef)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSendingChatMessage ? 'Sending...' : 'Send Message 💬'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
