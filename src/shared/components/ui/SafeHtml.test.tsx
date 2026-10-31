/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SafeHtml } from './SafeHtml';
import React from 'react';

describe('SafeHtml', () => {
  it('renders sanitized HTML correctly', () => {
    const dirty = '<p>Hello <script>alert("xss")</script>World</p>';
    render(<SafeHtml html={dirty} />);
    
    const element = screen.getByText(/Hello/i);
    expect(element).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('applies custom className', () => {
    render(<SafeHtml html="<span>Test</span>" className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('uses specified tag', () => {
    render(<SafeHtml html="Test" tag="article" className="test-article" />);
    const article = document.querySelector('article.test-article');
    expect(article).toBeInTheDocument();
  });
});
