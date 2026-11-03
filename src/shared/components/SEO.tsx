import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description }) => {
  return (
    <Helmet>
      <title>{title} | بویا</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${title} | بویا`} />
      <meta property="og:description" content={description} />
    </Helmet>
  );
};
