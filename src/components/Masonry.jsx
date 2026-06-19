import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import './Masonry.css';

const useMedia = (queries, values, defaultValue) => {
  const [value, setValue] = useState(() => {
    return values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;
  });

  useEffect(() => {
    const handler = () => {
      setValue(values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue);
    };
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries, values, defaultValue]);

  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      requestAnimationFrame(() => {
        setSize({ width, height });
      });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
};

const preloadImages = async urls => {
  const dimensions = {};
  await Promise.all(
    urls.map(
      src =>
        new Promise(resolve => {
          if (!src) return resolve();
          const img = new Image();
          img.src = src;
          img.onload = () => {
            dimensions[src] = { width: img.naturalWidth, height: img.naturalHeight };
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
        })
    )
  );
  return dimensions;
};

const Masonry = ({
  items,
  renderItem,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:768px)'],
    [5, 4, 3],
    1
  );

  const [containerRef, { width }] = useMeasure();
  const [prevItems, setPrevItems] = useState(items);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({});
  const hasMounted = useRef(false);
  const ctxRef = useRef(null);
  const isHoverable = useRef(window.matchMedia('(hover: hover)').matches);

  if (items !== prevItems) {
    setPrevItems(items);
    setImagesReady(false);
    setImageDimensions({});
  }

  // Preload images on items change
  useEffect(() => {
    let active = true;
    preloadImages(items.map(i => i.img).filter(Boolean)).then((dims) => {
      if (active) {
        setImageDimensions(dims || {});
        setImagesReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [items]);

  // Clean up GSAP Context ONLY on component unmount
  useEffect(() => {
    ctxRef.current = gsap.context(() => {}, containerRef);
    return () => {
      if (ctxRef.current) ctxRef.current.revert();
    };
  }, [containerRef]);

  // Compute layout & dynamic height in a single pass
  const { grid, maxHeight } = useMemo(() => {
    if (!width) return { grid: [], maxHeight: 0 };

    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;

    const calculatedGrid = items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      
      const dims = imageDimensions[child.img];
      const aspect = dims && dims.width && dims.height ? (dims.width / dims.height) : null;
      
      // Calculate image portion height matching natural aspect ratio
      const hasImage = !!child.img;
      const imgHeight = hasImage
        ? (aspect ? (columnWidth / aspect) : (columnWidth / 1.3))
        : 120; // fallback height for no-image placeholder card
      
      const height = imgHeight + 200; // estimated text details height
      const y = colHeights[col];

      colHeights[col] += height;

      return { ...child, x, y, w: columnWidth, h: height, imgHeight };
    });

    return { grid: calculatedGrid, maxHeight: Math.max(...colHeights) };
  }, [columns, items, width, imageDimensions]);

  const getInitialPosition = useCallback(item => {
    const container = containerRef.current;
    if (!container) return { x: item.x, y: item.y };

    let direction = animateFrom;
    if (animateFrom === 'random') {
      const directions = ['top', 'bottom', 'left', 'right'];
      direction = directions[Math.floor(Math.random() * directions.length)];
    }

    switch (direction) {
      case 'top': return { x: item.x, y: -200 };
      case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
      case 'left': return { x: -200, y: item.y };
      case 'right': return { x: window.innerWidth + 200, y: item.y };
      case 'center': return { x: width / 2 - item.w / 2, y: maxHeight / 2 - item.h / 2 };
      default: return { x: item.x, y: item.y + 100 };
    }
  }, [animateFrom, width, maxHeight, containerRef]);

  // Perform animations scoped inside the layout effect
  useLayoutEffect(() => {
    if (!imagesReady || !grid.length || !ctxRef.current) return;

    ctxRef.current.add(() => {
      grid.forEach((item, index) => {
        const selector = `[data-key="${item.id}"]`;
        const animationProps = {
          x: item.x,
          y: item.y,
          width: item.w,
          height: item.h
        };

        if (!hasMounted.current) {
          const initialPos = getInitialPosition(item);
          const initialState = {
            opacity: 0,
            x: initialPos.x,
            y: initialPos.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: 'blur(10px)' })
          };

          gsap.fromTo(selector, initialState, {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: 'blur(0px)' }),
            duration: 0.8,
            ease: 'power3.out',
            delay: index * stagger
          });
        } else {
          // Smooth layout transitions on resize/updates
          gsap.to(selector, {
            ...animationProps,
            duration: duration,
            ease: ease,
            overwrite: 'auto'
          });
        }
      });

      hasMounted.current = true;
    });
  }, [grid, imagesReady, stagger, getInitialPosition, blurToFocus, duration, ease]);

  const handleMouseEnter = (e, item) => {
    if (!ctxRef.current || !isHoverable.current) return;
    const element = e.currentTarget;
    const selector = `[data-key="${item.id}"]`;

    ctxRef.current.add(() => {
      if (scaleOnHover) {
        gsap.to(selector, {
          scale: hoverScale,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      if (colorShiftOnHover) {
        const overlay = element.querySelector('.color-overlay');
        if (overlay) {
          gsap.to(overlay, {
            opacity: 0.3,
            duration: 0.3,
            overwrite: 'auto'
          });
        }
      }
    });
  };

  const handleMouseLeave = (e, item) => {
    if (!ctxRef.current || !isHoverable.current) return;
    const element = e.currentTarget;
    const selector = `[data-key="${item.id}"]`;

    ctxRef.current.add(() => {
      if (scaleOnHover) {
        gsap.to(selector, {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      if (colorShiftOnHover) {
        const overlay = element.querySelector('.color-overlay');
        if (overlay) {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.3,
            overwrite: 'auto'
          });
        }
      }
    });
  };

  return (
    <div ref={containerRef} className="list" style={{ height: `${maxHeight}px` }}>
      {grid.map(item => (
        <div
          key={item.id}
          data-key={item.id}
          className="item-wrapper"
          onMouseEnter={e => handleMouseEnter(e, item)}
          onMouseLeave={e => handleMouseLeave(e, item)}
        >
          {renderItem ? renderItem(item) : (
            <div 
              className="item-img" 
              style={{ backgroundImage: `url(${item.img})` }}
              onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default Masonry;

