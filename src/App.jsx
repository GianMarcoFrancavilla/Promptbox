import React, { useState, useEffect } from 'react';

export default function AIPromptGenerator() {
  const [userInput, setUserInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  
  // Monetization states
  const [dailyUsage, setDailyUsage] = useState(0);
  const [lastResetDate, setLastResetDate] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [stripeKey, setStripeKey] = useState('');
  const [showStripeInput, setShowStripeInput] = useState(false);

  const FREE_DAILY_LIMIT = 5;
  const PREMIUM_PRICE = 4.99;

  useEffect(() => {
    const savedKey = localStorage.getItem('groqApiKey');
    const savedDailyUsage = localStorage.getItem('dailyUsage');
    const savedLastReset = localStorage.getItem('lastResetDate');
    const savedPremium = localStorage.getItem('isPremium');
    const savedStripe = localStorage.getItem('stripeKey');
    
    if (savedKey) setApiKey(savedKey);
    if (savedStripe) setStripeKey(savedStripe);
    if (savedPremium === 'true') setIsPremium(true);
    
    const today = new Date().toDateString();
    if (savedLastReset !== today) {
      setDailyUsage(0);
      setLastResetDate(today);
      localStorage.setItem('dailyUsage', '0');
      localStorage.setItem('lastResetDate', today);
    } else {
      setDailyUsage(parseInt(savedDailyUsage) || 0);
      setLastResetDate(savedLastReset);
    }
  }, []);

  const canUsePrompt = () => {
    if (isPremium) return true;
    return dailyUsage < FREE_DAILY_LIMIT;
  };

  const getRemainingPrompts = () => {
    if (isPremium) return '∞';
    return Math.max(0, FREE_DAILY_LIMIT - dailyUsage);
  };

  const generatePromptWithGroq = async () => {
    if (!userInput.trim()) {
      setError('Per favore, descrivi cosa ti serve');
      return;
    }

    if (!apiKey) {
      setError('Inserisci la tua API Key di Groq (gratuita)');
      setShowApiInput(true);
      return;
    }

    if (!canUsePrompt()) {
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedPrompt('');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Sei un esperto nella creazione di prompt per AI. L'utente ha bisogno di: "${userInput}"

Crea un prompt professionale, dettagliato e strutturato che possa essere utilizzato con qualsiasi AI (ChatGPT, Claude, ecc.) per ottenere il miglior risultato possibile.

Il prompt deve:
- Essere chiaro e specifico
- Includere il ruolo/expertise richiesto
- Definire il formato della risposta desiderato
- Includere requisiti e vincoli se necessario
- Essere pronto all'uso (copia-incolla)

Rispondi SOLO con il prompt finale, senza introduzioni o spiegazioni.`
          }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      
      if (response.ok && data.choices && data.choices[0] && data.choices[0].message) {
        const prompt = data.choices[0].message.content.trim();
        setGeneratedPrompt(prompt);
        
        const newUsage = dailyUsage + 1;
        setDailyUsage(newUsage);
        localStorage.setItem('dailyUsage', newUsage.toString());
        
        const newEntry = {
          id: Date.now(),
          input: userInput,
          prompt: prompt,
          date: new Date().toISOString()
        };
        const updatedHistory = [newEntry, ...history].slice(0, 20);
        setHistory(updatedHistory);
      } else if (data.error) {
        setError(`Errore API: ${data.error.message || 'Verifica la tua API Key'}`);
      } else {
        setError('Errore nella generazione. Riprova.');
      }
    } catch (err) {
      setError('Errore di connessione. Verifica la tua API Key.');
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generatePromptWithGroq();
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('groqApiKey', apiKey);
      setShowApiInput(false);
      setError('');
    }
  };

  const saveStripeKey = () => {
    if (stripeKey.trim()) {
      localStorage.setItem('stripeKey', stripeKey);
      setShowStripeInput(false);
    }
  };

  const handleUpgradeToPremium = async () => {
    if (!stripeKey) {
      setShowStripeInput(true);
      setError('Per favore, configura prima Stripe per accettare pagamenti');
      return;
    }

    const confirmPayment = window.confirm(
      `🚀 UPGRADE A PREMIUM\n\n` +
      `💰 Prezzo: €${PREMIUM_PRICE}/mese\n` +
      `✅ Prompt illimitati\n` +
      `✅ Nessuna pubblicità\n` +
      `✅ Priorità supporto\n\n` +
      `Verrai reindirizzato a Stripe per completare il pagamento.\n\n` +
      `(In questo demo, clicca OK per simulare il pagamento)`
    );

    if (confirmPayment) {
      setIsPremium(true);
      localStorage.setItem('isPremium', 'true');
      setShowPaywall(false);
      alert('🎉 Pagamento completato! Ora hai accesso illimitato!');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (item) => {
    setUserInput(item.input);
    setGeneratedPrompt(item.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (window.confirm('Vuoi cancellare tutta la cronologia?')) {
      setHistory([]);
    }
  };

  const suggestions = [
    'Email di vendita per corso online',
    'Post LinkedIn B2B tech',
    'Script video YouTube',
    'Piano marketing startup',
    'Strategia Instagram fitness'
  ];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: isPremium 
        ? 'linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #db2777 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
      margin: 0,
      position: 'relative'
    }}>
      {showPaywall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            borderRadius: '24px',
            padding: 'clamp(30px, 5vw, 50px)',
            maxWidth: '500px',
            width: '100%',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🚀</div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                fontWeight: '900',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '12px'
              }}>
                Hai raggiunto il limite!
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 'clamp(1rem, 3vw, 1.15rem)',
                lineHeight: '1.5'
              }}>
                Hai usato tutti i tuoi {FREE_DAILY_LIMIT} prompt gratuiti di oggi
              </p>
            </div>

            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '2px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem' }}>👑</span>
                <div>
                  <h3 style={{ color: '#fbbf24', fontWeight: '800', fontSize: '1.5rem', margin: 0 }}>
                    Premium
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                    Solo €{PREMIUM_PRICE}/mese
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: '∞', text: 'Prompt illimitati' },
                  { icon: '⚡', text: 'Generazione ultra veloce' },
                  { icon: '💾', text: 'Cronologia completa' },
                  { icon: '🎯', text: 'Priorità supporto' },
                  { icon: '🚫', text: 'Zero pubblicità' }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}>
                    <span style={{
                      fontSize: '1.5rem',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(251, 191, 36, 0.2)',
                      borderRadius: '8px'
                    }}>
                      {item.icon}
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleUpgradeToPremium}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>👑</span>
                Passa a Premium - €{PREMIUM_PRICE}/mese
              </button>

              <button
                onClick={() => setShowPaywall(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Torna domani (reset a mezzanotte)
              </button>
            </div>

            <p style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.875rem',
              marginTop: '20px'
            }}>
              💳 Pagamenti sicuri con Stripe • Cancella quando vuoi
            </p>
          </div>
        </div>
      )}

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            marginBottom: '15px'
          }}>
            {isPremium ? '👑' : '🤖'}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 6vw, 3.5rem)',
            fontWeight: '900',
            background: isPremium 
              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)'
              : 'linear-gradient(135deg, #60a5fa 0%, #c084fc 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            padding: '0 10px'
          }}>
            AI Prompt Generator {isPremium && 'Premium'}
          </h1>
          <p style={{
            fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '100%',
            margin: '0 auto 20px',
            lineHeight: '1.5',
            padding: '0 15px'
          }}>
            Powered by Groq AI • Ultra veloce {isPremium ? '• Illimitato' : '• 5 prompt/giorno gratis'}
          </p>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'clamp(12px, 3vw, 20px)',
            padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 32px)',
            background: isPremium 
              ? 'rgba(251, 191, 36, 0.1)'
              : 'rgba(96, 165, 250, 0.1)',
            borderRadius: 'clamp(12px, 3vw, 16px)',
            border: isPremium 
              ? '1px solid rgba(251, 191, 36, 0.3)'
              : '1px solid rgba(96, 165, 250, 0.2)',
            marginBottom: '20px',
            maxWidth: '90%',
            margin: '0 auto 20px'
          }}>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <div style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', marginBottom: '4px' }}>
                {isPremium ? '👑' : '⚡'}
              </div>
              <div style={{ color: 'white', fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>
                {isPremium ? 'Premium' : 'Free'}
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <div style={{ 
                fontSize: 'clamp(1rem, 3vw, 1.5rem)', 
                fontWeight: 'bold', 
                color: isPremium ? '#fbbf24' : '#60a5fa',
                marginBottom: '4px' 
              }}>
                {getRemainingPrompts()}
              </div>
              <div style={{ color: 'white', fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>
                {isPremium ? 'Illimitati' : 'Rimasti oggi'}
              </div>
            </div>
            {!isPremium && (
              <div style={{ textAlign: 'center', minWidth: '60px' }}>
                <div style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', marginBottom: '4px' }}>🔄</div>
                <div style={{ color: 'white', fontSize: 'clamp(0.7rem, 2vw, 0.875rem)' }}>Reset 00:00</div>
              </div>
            )}
          </div>

          {!isPremium && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              padding: 'clamp(15px, 3vw, 20px)',
              maxWidth: '95%',
              margin: '0 auto 20px',
              textAlign: 'center'
            }}>
              <p style={{ 
                color: 'white', 
                fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)', 
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                ⭐ Vuoi prompt illimitati? Passa a Premium!
              </p>
              <button
                onClick={() => setShowPaywall(true)}
                style={{
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(18px, 4vw, 24px)',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: 'clamp(10px, 2.5vw, 12px)',
                  fontWeight: '700',
                  fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>👑</span> Upgrade - Solo €{PREMIUM_PRICE}/mese
              </button>
            </div>
          )}

          {!stripeKey && (
            <div style={{
              background: 'rgba(96, 165, 250, 0.1)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              padding: 'clamp(15px, 3vw, 20px)',
              maxWidth: '95%',
              margin: '0 auto 20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>💳</span>
                <h3 style={{ color: '#60a5fa', fontWeight: '700', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', margin: 0 }}>
                  Configura Pagamenti (Admin)
                </h3>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)', marginBottom: '12px' }}>
                Per accettare pagamenti Premium vai su stripe.com
              </p>
              <button
                onClick={() => setShowStripeInput(!showStripeInput)}
                style={{
                  padding: 'clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)',
                  background: '#60a5fa',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  fontWeight: '600',
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                  cursor: 'pointer'
                }}
              >
                Configura Stripe
              </button>
            </div>
          )}

          {showStripeInput && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: 'clamp(16px, 3vw, 24px)',
              padding: 'clamp(20px, 4vw, 30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '20px',
              maxWidth: '95%',
              margin: '0 auto 20px'
            }}>
              <label style={{ color: 'white', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                💳 Stripe Publishable Key
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="password"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="pk_test_..."
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={saveStripeKey}
                  style={{
                    padding: '14px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Salva Configurazione
                </button>
              </div>
            </div>
          )}

          {!apiKey && (
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              padding: 'clamp(15px, 3vw, 20px)',
              maxWidth: '95%',
              margin: '0 auto',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>🔑</span>
                <h3 style={{ color: '#fbbf24', fontWeight: '700', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)', margin: 0 }}>
                  Setup Groq API (Gratuito)
                </h3>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)', marginBottom: '16px', lineHeight: '1.5' }}>
                Vai su console.groq.com e crea una API key gratuita
              </p>
              <button
                onClick={() => setShowApiInput(!showApiInput)}
                style={{
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(18px, 4vw, 24px)',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: 'clamp(10px, 2.5vw, 12px)',
                  fontWeight: '700',
                  fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '250px'
                }}
              >
                {showApiInput ? '✓ Inserisci API Key' : '🚀 Inizia Gratis'}
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: history.length > 0 ? 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' : '1fr',
          gap: 'clamp(15px, 3vw, 30px)',
          alignItems: 'start'
        }}>
          <div style={{ minWidth: 0, width: '100%', order: 1 }}>
            {showApiInput && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'clamp(16px, 3vw, 24px)',
                padding: 'clamp(20px, 4vw, 30px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '20px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <label style={{ color: 'white', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                  🔑 Groq API Key
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={saveApiKey}
                    style={{
                      padding: '14px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      width: '100%'
                    }}
                  >
                    Salva
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: 'clamp(16px, 3vw, 24px)',
              padding: 'clamp(20px, 4vw, 30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              marginBottom: 'clamp(15px, 3vw, 25px)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <label style={{
                display: 'block',
                color: 'white',
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                fontWeight: '700',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>💭</span>
                Cosa vuoi creare?
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Es: Email di vendita per un corso online..."
                style={{
                  width: '100%',
                  minHeight: 'clamp(100px, 20vh, 180px)',
                  maxHeight: '40vh',
                  padding: 'clamp(14px, 3vw, 18px)',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 'clamp(12px, 2.5vw, 16px)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontFamily: 'inherit',
                  marginBottom: 'clamp(14px, 3vw, 18px)',
                  boxSizing: 'border-box'
                }}
              />

              {!userInput && (
                <div style={{ marginBottom: '18px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', marginBottom: '10px' }}>
                    💡 Prova con:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setUserInput(suggestion)}
                        style={{
                          padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: 'clamp(16px, 3vw, 20px)',
                          color: 'white',
                          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'clamp(10px, 2.5vw, 12px)',
                  color: '#fca5a5',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
                }}>
                  <span style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>⚠️</span>
                  <span style={{ flex: 1, wordBreak: 'break-word' }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !userInput.trim()}
                style={{
                  width: '100%',
                  padding: 'clamp(14px, 3vw, 18px)',
                  background: isGenerating 
                    ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                    : isPremium
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  color: isPremium && !isGenerating ? '#1f2937' : 'white',
                  border: 'none',
                  borderRadius: 'clamp(12px, 2.5vw, 16px)',
                  fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
                  fontWeight: '700',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'clamp(8px, 2vw, 12px)',
                  opacity: (!userInput.trim() && !isGenerating) ? 0.5 : 1,
                  boxSizing: 'border-box'
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: 'clamp(18px, 4vw, 24px)',
                      height: 'clamp(18px, 4vw, 24px)',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span>Generazione...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>
                      {isPremium ? '👑' : '✨'}
                    </span>
                    <span>Genera Prompt con Groq AI</span>
                  </>
                )}
              </button>
            </form>

            {generatedPrompt && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.98)',
                borderRadius: 'clamp(16px, 3vw, 24px)',
                padding: 'clamp(20px, 4vw, 30px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'clamp(18px, 3vw, 24px)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <h2 style={{
                    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                    fontWeight: '800',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(8px, 2vw, 12px)',
                    margin: 0
                  }}>
                    <span style={{
                      width: 'clamp(36px, 8vw, 48px)',
                      height: 'clamp(36px, 8vw, 48px)',
                      background: isPremium 
                        ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      borderRadius: 'clamp(10px, 2.5vw, 14px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(1.25rem, 4vw, 1.5rem)'
                    }}>
                      {isPremium ? '👑' : '🎯'}
                    </span>
                    Il Tuo Prompt {isPremium && 'Premium'}
                  </h2>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: 'clamp(10px, 2.5vw, 14px) clamp(18px, 4vw, 28px)',
                      background: copied 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : isPremium
                        ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: (isPremium && !copied) ? '#1f2937' : 'white',
                      border: 'none',
                      borderRadius: 'clamp(10px, 2.5vw, 14px)',
                      fontWeight: '700',
                      fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>{copied ? '✓' : '📋'}</span>
                    {copied ? 'Copiato!' : 'Copia'}
                  </button>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  padding: 'clamp(18px, 4vw, 30px)',
                  borderRadius: 'clamp(14px, 3vw, 20px)',
                  border: '2px solid #e5e7eb',
                  maxHeight: '60vh',
                  overflowY: 'auto'
                }}>
                  <pre style={{
                    fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                    lineHeight: '1.7',
                    color: '#1f2937',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    margin: 0
                  }}>
                    {generatedPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: 'clamp(16px, 3vw, 24px)',
              padding: 'clamp(20px, 4vw, 30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'sticky',
              top: '20px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              minWidth: 0,
              order: 2
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                gap: '10px'
              }}>
                <h3 style={{
                  color: 'white',
                  fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0
                }}>
                  <span style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>📚</span>
                  Cronologia
                </h3>
                <button
                  onClick={clearHistory}
                  style={{
                    padding: 'clamp(6px, 2vw, 8px) clamp(10px, 2.5vw, 12px)',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'clamp(6px, 2vw, 8px)',
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Cancella
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map(item => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 'clamp(12px, 2.5vw, 16px)',
                      padding: 'clamp(12px, 3vw, 16px)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <p style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      color: 'white',
                      fontWeight: '600',
                      marginBottom: '6px',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {item.input}
                    </p>
                    <p style={{
                      fontSize: 'clamp(0.7rem, 2vw, 0.75rem)',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      {new Date(item.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          div[style*="grid"] {
            grid-template-columns: 1fr !important;
          }
          
          div[style*="sticky"] {
            position: relative !important;
            top: 0 !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}