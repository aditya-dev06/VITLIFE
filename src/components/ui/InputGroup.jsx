import { forwardRef } from 'react';
import './InputGroup.css';

/**
 * InputGroup — wraps an input with leading/trailing addons (icons, text, buttons)
 *
 * Usage:
 *   <InputGroup>
 *     <InputGroupAddon><Search size={16} /></InputGroupAddon>
 *     <InputGroupInput placeholder="Search..." value={v} onChange={...} />
 *     <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
 *   </InputGroup>
 */

export const InputGroup = forwardRef(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={`input-group ${className}`} {...props}>
    {children}
  </div>
));
InputGroup.displayName = 'InputGroup';

export const InputGroupInput = forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`input-group__input ${className}`} {...props} />
));
InputGroupInput.displayName = 'InputGroupInput';

/**
 * @param {'inline-start'|'inline-end'} align - defaults to 'inline-start'
 */
export const InputGroupAddon = forwardRef(
  ({ className = '', align = 'inline-start', children, ...props }, ref) => (
    <span
      ref={ref}
      className={`input-group__addon input-group__addon--${align} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
);
InputGroupAddon.displayName = 'InputGroupAddon';
