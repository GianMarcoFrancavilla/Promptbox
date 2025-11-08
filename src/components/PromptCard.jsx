import React from 'react';

export default function PromptCard({ id, title, text, category, isFavorite, updateFavorites }) {

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    alert('Prompt copiato!');
  };

  const toggleFavorite = () => {
    updateFavorites(id, !isFavorite);
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      padding: '20px',
      marginBottom: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      backgroundColor: '#fff',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'pointer'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.12)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; }}
    >
      <h3 style={{ marginBottom: '6px' }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '12px' }}>Categoria: {category}</p>
      <p style={{ marginBottom: '12px', color: '#333' }}>{text}</p>
      <button onClick={copyToClipboard} style={{
        padding: '6px 12px', marginRight: '8px', borderRadius: '6px',
        border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer'
      }}>📋 Copia</button>
      <button onClick={toggleFavorite} style={{
        padding: '6px 12px', borderRadius: '6px',
        border: 'none', backgroundColor: isFavorite ? '#ffc107' : '#e0e0e0',
        color: isFavorite ? '#000' : '#333', cursor: 'pointer'
      }}>
        {isFavorite ? '⭐ Preferito' : '☆ Aggiungi'}
      </button>
    </div>
  );
}
