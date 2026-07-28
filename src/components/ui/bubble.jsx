import React from 'react';
import './bubble.css';

export function Bubble({
  variant = 'default',
  align = 'start',
  className = '',
  children,
  style,
  ...props
}) {
  const variantClass = `variant-${variant}`;
  const alignClass = `align-${align}`;

  return (
    <div
      className={`ui-bubble-root ${variantClass} ${alignClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function BubbleContent({
  render,
  className = '',
  children,
  style,
  ...props
}) {
  if (render) {
    if (React.isValidElement(render)) {
      return React.cloneElement(render, {
        className: `ui-bubble-content ${className} ${render.props.className || ''}`,
        style: { ...style, ...render.props.style },
        children: children || render.props.children,
        ...props
      });
    }
    if (typeof render === 'function') {
      return render({
        className: `ui-bubble-content ${className}`,
        children,
        style,
        ...props
      });
    }
  }

  return (
    <div className={`ui-bubble-content ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function BubbleReactions({
  side = 'bottom',
  align = 'end',
  className = '',
  role,
  'aria-label': ariaLabel,
  children,
  style,
  ...props
}) {
  const sideClass = `side-${side}`;
  const alignClass = `align-${align}`;

  return (
    <div
      className={`ui-bubble-reactions ${sideClass} ${alignClass} ${className}`}
      role={role}
      aria-label={ariaLabel}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function BubbleGroup({
  className = '',
  children,
  style,
  ...props
}) {
  return (
    <div className={`ui-bubble-group ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
