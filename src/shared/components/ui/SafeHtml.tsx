import React from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
  tag?: keyof React.JSX.IntrinsicElements;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className, tag: Tag = 'div' }) => {
  const sanitizedHtml = DOMPurify.sanitize(html);
  
  return (
    <Tag 
      className={className} 
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
    />
  );
};
