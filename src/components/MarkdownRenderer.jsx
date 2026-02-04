import React from 'react';

// Simple markdown to HTML converter without external dependencies
const MarkdownRenderer = ({ content }) => {
  const convertMarkdownToHTML = (markdown) => {
    if (!markdown) return '';
    
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-4">$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>')
      
      // Lists
      .replace(/^• (.*$)/gim, '<li class="ml-4 mb-1 text-gray-700 dark:text-gray-300">• $1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1 text-gray-700 dark:text-gray-300">• $1</li>')
      
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1 text-gray-700 dark:text-gray-300 list-decimal">$1</li>')
      
      // Medical emojis and special formatting
      .replace(/🔬/g, '<span class="text-blue-600">🔬</span>')
      .replace(/📊/g, '<span class="text-green-600">📊</span>')
      .replace(/🏥/g, '<span class="text-red-500">🏥</span>')
      .replace(/🤖/g, '<span class="text-purple-600">🤖</span>')
      .replace(/⚠️/g, '<span class="text-yellow-500">⚠️</span>')
      .replace(/✅/g, '<span class="text-green-500">✅</span>')
      .replace(/🔴/g, '<span class="text-red-500">🔴</span>')
      .replace(/🟡/g, '<span class="text-yellow-500">🟡</span>')
      .replace(/🟢/g, '<span class="text-green-500">🟢</span>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-3 text-gray-700 dark:text-gray-300">')
      .replace(/\n/g, '<br/>');
  };

  const htmlContent = convertMarkdownToHTML(content);
  
  return (
    <div 
      className="markdown-content text-gray-700 dark:text-gray-300 leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: `<p class="mb-3 text-gray-700 dark:text-gray-300">${htmlContent}</p>` 
      }}
    />
  );
};

export default MarkdownRenderer;