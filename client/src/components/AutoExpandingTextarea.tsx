import React, { useEffect, useRef } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

export const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({ value, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      style={{
        ...props.style,
        overflow: 'hidden',
        resize: 'none',
        minHeight: props.style?.height || '44px',
        transition: 'height 0.1s ease-out',
      }}
    />
  );
};
