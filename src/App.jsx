import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tuagmpinrqjyzuaoxepz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1YWdtcGlucnFqeXp1YW94ZXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTc2NjgsImV4cCI6MjA3ODE3MzY2OH0.I3Pyn7h_UNfKgqE_oc2Z1zpzciaXMAyIjjeEq7zG3xk';
const GROQ_API_KEY = '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';

// 🔗 STRIPE CONFIGURATION
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/bJe4gB7Nm5dtfnQ2qDf7i00';
const STRIPE_SUCCESS_URL = `${window.location.origin}`;
const STRIPE_CANCEL_URL = `${window.location.origin}`;

const FREE_MONTHLY_LIMIT = 5;
const PREMIUM_PRICE = 4.99;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AIPromptGeneratorPro() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  // ✅ CARICAMENTO INIZIALE E VERIFICA SCADENZE
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (user) {
            await checkAndUpdatePremiumStatus(user);
          }
        }
      } catch (error) {
        console.log('Nessun utente loggato');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ✅ VERIFICA E AGGIORNA STATO PREMIUM
  const checkAndUpdatePremiumStatus = async (user) => {
    if (user.is_premium && user.premium_expires_at) {
      const now = new Date();
      const expiryDate = new Date(user.premium_expires_at);
      
      if (now > expiryDate) {
        const { data: updatedUser } = await supabase
          .from('users')
          .update({ 
            is_premium: false,
            premium_expires_at: null,
            premium_since: null
          })
          .eq('id', user.id)
          .select()
          .single();
        
        setCurrentUser(updatedUser);
        return;
      }
    }
    setCurrentUser(user);
  };

  // ✅ CONTROLLO AUTOMATICO LIMITI MENSILI
  useEffect(() => {
    if (currentUser) {
      checkAndResetMonthlyUsage();
    }
  }, [currentUser]);

  const checkAndResetMonthlyUsage = async () => {
    if (!currentUser) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    
    if (currentUser.last_reset_month !== currentMonth) {
      try {
        const { data: updated, error } = await supabase
          .from('users')
          .update({
            monthly_usage: 0,
            last_reset_month: currentMonth
          })
          .eq('id', currentUser.id)
          .select()
          .single();
          
        if (!error && updated) {
          setCurrentUser(updated);
        }
      } catch (e) {
        console.error('Errore reset mensile');
      }
    }
  };

  // ✅ CREAZIONE PROFILO UTENTE
  const createUserProfile = async (user) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          is_premium: false,
          monthly_usage: 0,
          last_reset_month: `${new Date().getFullYear()}-${new Date().getMonth()}`,
          premium_expires_at: null,
          premium_since: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentUser(data);
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  // ✅ REGISTRAZIONE
  const handleRegister = async () => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Inserisci email e password');
      return;
    }

    if (password.length < 6) {
      setAuthError('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}` }
      });

      if (error) throw error;

      if (data.user) {
        await createUserProfile(data.user);
        setAuthError('✅ Registrazione completata! Ora puoi accedere.');
      }
    } catch (error) {
      setAuthError(error.message || 'Errore durante la registrazione');
    }
  };

  // ✅ LOGIN
  const handleLogin = async () => {
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (data.user) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (user) {
          await checkAndUpdatePremiumStatus(user);
        } else {
          await createUserProfile(data.user);
        }
      }
    } catch (error) {
      setAuthError(error.message || 'Errore durante il login');
    }
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setGeneratedPrompt('');
      setUserInput('');
      setEmail('');
      setPassword('');
    } catch (e) {
      console.error('Errore logout');
    }
  };

  // ✅ VERIFICA DISPONIBILITÀ PROMPT
  const canUsePrompt = () => {
    if (!currentUser) return false;
    if (currentUser.is_premium) return true;
    return currentUser.monthly_usage < FREE_MONTHLY_LIMIT;
  };

  // ✅ CALCOLO PROMPT RIMANENTI
  const getRemainingPrompts = () => {
    if (!currentUser) return 0;
    if (currentUser.is_premium) return '∞';
    return Math.max(0, FREE_MONTHLY_LIMIT - currentUser.monthly_usage);
  };

  // ✅ CALCOLO GIORNI RIMANENTI PREMIUM
  const getPremiumDaysRemaining = () => {
    if (!currentUser?.is_premium || !currentUser.premium_expires_at) return 0;
    
    const now = new Date();
    const expiryDate = new Date(currentUser.premium_expires_at);
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // ✅ GENERAZIONE PROMPT AI
  const generatePrompt = async () => {
    if (!userInput.trim()) {
      setError('Descrivi cosa ti serve');
      return;
    }
    if (!canUsePrompt()) {
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Sei un esperto nella creazione di prompt per AI. L'utente ha bisogno di: "${userInput}". Crea un prompt professionale e strutturato. Rispondi SOLO con il prompt finale.`
          }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message) {
        const prompt = data.choices[0].message.content.trim();
        setGeneratedPrompt(prompt);
        const newUsage = currentUser.monthly_usage + 1;
        
        const { data: updated } = await supabase
          .from('users')
          .update({ monthly_usage: newUsage })
          .eq('id', currentUser.id)
          .select()
          .single();
          
        if (updated) setCurrentUser(updated);
      } else {
        setError('Errore API: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (err) {
      setError('Errore connessione: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 💳 SISTEMA PAGAMENTO AUTOMATICO
  const handleUpgrade = () => {
    const stripeWindow = window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener,noreferrer');
    
    if (stripeWindow) {
      startPaymentVerification();
      setShowPaywall(false);
    } else {
      alert('❌ Popup bloccato! Abilita i popup per questo sito.');
    }
  };

  // ✅ VERIFICA AUTOMATICA PAGAMENTO
  const startPaymentVerification = () => {
    let checks = 0;
    const maxChecks = 30;
    
    const checkInterval = setInterval(async () => {
      checks++;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (user?.is_premium) {
            clearInterval(checkInterval);
            setCurrentUser(user);
            alert('🎉 Pagamento confermato! Premium attivato per 1 mese.');
            return;
          }
        }
        
        if (checks >= maxChecks) {
          clearInterval(checkInterval);
          alert('⏰ Tempo scaduto. Se hai pagato, ricarica la pagina.');
        }
      } catch (error) {
        console.error('Errore verifica pagamento:', error);
      }
    }, 10000);
  };

  // ✅ ATTIVAZIONE MANUALE PREMIUM (per testing)
  const activatePremiumManually = async () => {
    try {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      const { data: updated, error } = await supabase
        .from('users')
        .update({
          is_premium: true,
          premium_expires_at: expiryDate.toISOString(),
          premium_since: new Date().toISOString()
        })
        .eq('id', currentUser.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setCurrentUser(updated);
      alert(`🎉 Premium attivato! Valido fino al ${expiryDate.toLocaleDateString('it-IT')}`);
    } catch (e) {
      alert('❌ Errore attivazione. Contatta il supporto.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🎯 RENDER CONDIZIONALE
  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <AuthScreen 
      authMode={authMode} 
      setAuthMode={setAuthMode}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      authError={authError}
      handleLogin={handleLogin}
      handleRegister={handleRegister}
    />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      minWidth: '100vw',
      background: currentUser.is_premium 
        ? 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 50%,#db2777 100%)' 
        : 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)',
      padding: 'clamp(12px, 3vw, 16px)',
      boxSizing: 'border-box',
      margin: 0
    }}>
      
      {/* MODAL PAYWALL */}
      {showPaywall && <PaywallModal onUpgrade={handleUpgrade} onClose={() => setShowPaywall(false)} />}
      
      {/* MAIN APP */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout}
          premiumDays={getPremiumDaysRemaining()}
        />
        
        <UsageStats 
          currentUser={currentUser}
          remainingPrompts={getRemainingPrompts()}
          premiumDays={getPremiumDaysRemaining()}
          onUpgrade={() => setShowPaywall(true)}
          onActivatePremium={activatePremiumManually}
        />
        
        <PromptInput 
          userInput={userInput}
          setUserInput={setUserInput}
          error={error}
          isGenerating={isGenerating}
          currentUser={currentUser}
          onGenerate={generatePrompt}
        />
        
        {generatedPrompt && (
          <GeneratedPrompt 
            prompt={generatedPrompt} 
            copied={copied}
            currentUser={currentUser}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </div>
  );
}

// 🎨 COMPONENTI SEPARATI

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh', minWidth: '100vw',
    background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: 0
  }}>
    <div style={{ color: 'white', fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontWeight: '700' }}>
      ⚡ Caricamento...
    </div>
  </div>
);

const AuthScreen = ({ authMode, setAuthMode, email, setEmail, password, setPassword, authError, handleLogin, handleRegister }) => (
  <div style={{
    minHeight: '100vh', minWidth: '100vw',
    background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: 'clamp(10px, 3vw, 20px)', boxSizing: 'border-box'
  }}>
    <div style={{
      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
      borderRadius: 'clamp(16px, 4vw, 24px)', padding: 'clamp(20px, 5vw, 40px)',
      maxWidth: '450px', width: '100%', border: '1px solid rgba(255,255,255,0.1)',
      boxSizing: 'border-box', margin: 'auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 5vw, 30px)' }}>
        <div style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 'clamp(10px, 3vw, 15px)' }}>🤖</div>
        <h1 style={{
          fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontWeight: '900',
          background: 'linear-gradient(135deg,#60a5fa 0%,#c084fc 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 'clamp(8px, 2vw, 10px)', lineHeight: '1.2'
        }}>
          AI Prompt Generator
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)', margin: 0 }}>
          Powered by Groq AI
        </p>
      </div>
      
      <div style={{
        display: 'flex', gap: 'clamp(6px, 2vw, 8px)', marginBottom: 'clamp(16px, 4vw, 20px)',
        background: 'rgba(255,255,255,0.05)', borderRadius: 'clamp(10px, 2vw, 12px)', padding: 'clamp(4px, 1vw, 5px)'
      }}>
        <AuthTab active={authMode === 'login'} onClick={() => setAuthMode('login')}>Login</AuthTab>
        <AuthTab active={authMode === 'register'} onClick={() => setAuthMode('register')}>Registrati</AuthTab>
      </div>
      
      <AuthForm 
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        authError={authError}
        onSubmit={authMode === 'login' ? handleLogin : handleRegister}
        buttonText={authMode === 'login' ? '🚀 Accedi' : '✨ Crea Account'}
      />
    </div>
  </div>
);

const AuthTab = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: 'clamp(8px, 2.5vw, 10px)',
    background: active ? 'rgba(96,165,250,0.3)' : 'transparent',
    border: 'none', borderRadius: 'clamp(6px, 1.5vw, 8px)',
    color: 'white', fontWeight: '600', fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
    cursor: 'pointer', transition: 'all 0.2s ease'
  }}>
    {children}
  </button>
);

const AuthForm = ({ email, setEmail, password, setPassword, authError, onSubmit, buttonText }) => (
  <div>
    <FormField label="📧 Email" value={email} onChange={setEmail} type="email" placeholder="tua@email.com" />
    <FormField label="🔒 Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
    
    {authError && (
      <div style={{
        padding: 'clamp(8px, 2vw, 10px)', background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'clamp(8px, 2vw, 10px)',
        color: '#fca5a5', marginBottom: 'clamp(12px, 3vw, 16px)',
        fontSize: 'clamp(0.7rem, 2vw, 0.75rem)'
      }}>
        ⚠️ {authError}
      </div>
    )}
    
    <button onClick={onSubmit} style={{
      width: '100%', padding: 'clamp(12px, 3vw, 14px)',
      background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
      color: 'white', border: 'none', borderRadius: 'clamp(10px, 2vw, 12px)',
      fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)', fontWeight: '700',
      cursor: 'pointer', transition: 'all 0.2s ease'
    }}>
      {buttonText}
    </button>
  </div>
);

const FormField = ({ label, value, onChange, type, placeholder }) => (
  <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
    <label style={{
      color: 'white', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', fontWeight: '600',
      display: 'block', marginBottom: 'clamp(6px, 1.5vw, 8px)'
    }}>
      {label}
    </label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && document.querySelector('button')?.click()}
      placeholder={placeholder}
      style={{
        width: '100%', padding: 'clamp(10px, 2.5vw, 12px)',
        borderRadius: 'clamp(10px, 2vw, 12px)', border: '2px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.95)', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
        outline: 'none', boxSizing: 'border-box'
      }}
    />
  </div>
);

const PaywallModal = ({ onUpgrade, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'clamp(12px, 3vw, 16px)', boxSizing: 'border-box'
  }}>
    <div style={{
      background: 'linear-gradient(135deg,#1f2937 0%,#111827 100%)',
      borderRadius: 'clamp(14px, 3vw, 20px)', padding: 'clamp(20px, 5vw, 30px)',
      maxWidth: '500px', width: '100%', border: '2px solid rgba(255,255,255,0.1)',
      boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'clamp(16px, 4vw, 24px)' }}>
        <div style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', marginBottom: 'clamp(12px, 3vw, 15px)' }}>🚀</div>
        <h2 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900',
          background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 'clamp(10px, 2.5vw, 12px)', lineHeight: '1.2'
        }}>
          Limite Raggiunto!
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', margin: 0
        }}>
          Hai usato i tuoi {FREE_MONTHLY_LIMIT} prompt mensili
        </p>
      </div>
      
      <div style={{
        background: 'rgba(251,191,36,0.1)', border: '2px solid rgba(251,191,36,0.3)',
        borderRadius: 'clamp(10px, 2.5vw, 16px)', padding: 'clamp(14px, 3vw, 20px)',
        marginBottom: 'clamp(14px, 3vw, 20px)'
      }}>
        <h3 style={{
          color: '#fbbf24', fontWeight: '800', fontSize: 'clamp(1rem, 3vw, 1.25rem)',
          marginBottom: 'clamp(12px, 2.5vw, 15px)'
        }}>
          👑 Premium - €{PREMIUM_PRICE}/mese
        </h3>
        {['∞ Prompt illimitati per 30 giorni', '⚡ Priorità assoluta', '💾 Cronologia salvata', '🎯 Supporto dedicato'].map((item,i) => (
          <div key={i} style={{
            color: 'white', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)',
            marginBottom: 'clamp(8px, 1.5vw, 10px)'
          }}>
            ✓ {item}
          </div>
        ))}
      </div>
      
      <button onClick={onUpgrade} style={{
        width: '100%', padding: 'clamp(12px, 3vw, 16px)',
        background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)',
        color: '#1f2937', border: 'none', borderRadius: 'clamp(10px, 2.5vw, 14px)',
        fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', fontWeight: '800',
        cursor: 'pointer', marginBottom: 'clamp(10px, 2vw, 12px)'
      }}>
        💳 Acquista Premium (30 giorni)
      </button>
      
      <button onClick={onClose} style={{
        width: '100%', padding: 'clamp(10px, 2.5vw, 12px)',
        background: 'transparent', color: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'clamp(8px, 2vw, 10px)',
        fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', fontWeight: '600', cursor: 'pointer'
      }}>
        Chiudi
      </button>
    </div>
  </div>
);

const Header = ({ currentUser, onLogout, premiumDays }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 'clamp(16px, 4vw, 24px)', flexWrap: 'wrap', gap: 'clamp(10px, 2.5vw, 12px)'
  }}>
    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
      <h1 style={{
        fontSize: 'clamp(1.25rem, 4vw, 2.25rem)', fontWeight: '900',
        background: currentUser.is_premium 
          ? 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)' 
          : 'linear-gradient(135deg,#60a5fa 0%,#c084fc 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 'clamp(4px, 1vw, 5px)', lineHeight: '1.2', wordBreak: 'break-word'
      }}>
        {currentUser.is_premium ? '👑' : '🤖'} AI Prompt Generator
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
        margin: 0, wordBreak: 'break-all'
      }}>
        {currentUser.email} • {currentUser.is_premium ? `Premium (${premiumDays} giorni rimanenti)` : 'Free'}
      </p>
    </div>
    
    <button onClick={onLogout} style={{
      padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3vw, 20px)',
      background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
      border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'clamp(8px, 2vw, 10px)',
      fontWeight: '600', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
      cursor: 'pointer', whiteSpace: 'nowrap'
    }}>
      🚪 Logout
    </button>
  </div>
);

const UsageStats = ({ currentUser, remainingPrompts, premiumDays, onUpgrade, onActivatePremium }) => (
  <div style={{
    display: 'flex', gap: 'clamp(10px, 2.5vw, 12px)', justifyContent: 'center',
    marginBottom: 'clamp(16px, 4vw, 24px)', flexWrap: 'wrap'
  }}>
    <div style={{
      background: currentUser.is_premium 
        ? 'rgba(251,191,36,0.1)' 
        : 'rgba(96,165,250,0.1)',
      border: currentUser.is_premium 
        ? '1px solid rgba(251,191,36,0.3)' 
        : '1px solid rgba(96,165,250,0.2)',
      borderRadius: 'clamp(10px, 2.5vw, 14px)', padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 28px)',
      textAlign: 'center', minWidth: '120px'
    }}>
      <div style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', marginBottom: 'clamp(6px, 1.5vw, 8px)' }}>
        {currentUser.is_premium ? '👑' : '⚡'}
      </div>
      <div style={{
        color: 'white', fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 'bold'
      }}>
        {currentUser.is_premium ? premiumDays + ' giorni' : remainingPrompts}
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.65rem, 2vw, 0.75rem)'
      }}>
        {currentUser.is_premium ? 'Rimanenti' : 'Rimasti/mese'}
      </div>
    </div>
    
    {!currentUser.is_premium && (
      <button onClick={onUpgrade} style={{
        background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)',
        color: '#1f2937', border: 'none', borderRadius: 'clamp(10px, 2.5vw, 14px)',
        padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 28px)', fontWeight: '700',
        fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 8px)', minWidth: '140px'
      }}>
        <span style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>👑</span>
        <span>Upgrade Premium</span>
      </button>
    )}
  </div>
);

const PromptInput = ({ userInput, setUserInput, error, isGenerating, currentUser, onGenerate }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
    borderRadius: 'clamp(14px, 3vw, 20px)', padding: 'clamp(14px, 3vw, 30px)',
    border: '1px solid rgba(255,255,255,0.1)', marginBottom: 'clamp(16px, 4vw, 24px)'
  }}>
    <label style={{
      display: 'block', color: 'white', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
      fontWeight: '700', marginBottom: 'clamp(12px, 3vw, 16px)'
    }}>
      💭 Cosa vuoi creare?
    </label>
    
    <textarea 
      value={userInput} 
      onChange={(e) => setUserInput(e.target.value)}
      placeholder="Es: Email di vendita per corso online..." 
      style={{
        width: '100%', minHeight: 'clamp(120px, 30vw, 180px)',
        padding: 'clamp(14px, 3vw, 16px)', fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
        border: '2px solid rgba(255,255,255,0.2)', borderRadius: 'clamp(12px, 2.5vw, 14px)',
        background: 'rgba(255,255,255,0.95)', resize: 'vertical',
        marginBottom: 'clamp(14px, 3vw, 16px)', boxSizing: 'border-box'
      }}
    />
    
    {error && (
      <div style={{
        padding: 'clamp(12px, 2.5vw, 14px)', background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'clamp(10px, 2vw, 12px)',
        color: '#fca5a5', marginBottom: 'clamp(14px, 3vw, 16px)',
        fontSize: 'clamp(0.75rem, 2vw, 0.85rem)'
      }}>
        ⚠️ {error}
      </div>
    )}
    
    <button 
      onClick={onGenerate} 
      disabled={isGenerating || !userInput.trim()}
      style={{
        width: '100%', padding: 'clamp(14px, 3vw, 16px)',
        background: isGenerating 
          ? 'linear-gradient(135deg,#6b7280 0%,#4b5563 100%)' 
          : currentUser.is_premium 
            ? 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)' 
            : 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
        color: (currentUser.is_premium && !isGenerating) ? '#1f2937' : 'white',
        border: 'none', borderRadius: 'clamp(12px, 2.5vw, 14px)',
        fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', fontWeight: '700',
        cursor: isGenerating ? 'not-allowed' : 'pointer',
        opacity: (!userInput.trim() && !isGenerating) ? 0.5 : 1, transition: 'all 0.2s ease'
      }}
    >
      {isGenerating ? '⚡ Generazione...' : `${currentUser.is_premium ? '👑' : '✨'} Genera Prompt`}
    </button>
  </div>
);

const GeneratedPrompt = ({ prompt, copied, currentUser, onCopy }) => (
  <div style={{
    background: 'rgba(255,255,255,0.98)', borderRadius: 'clamp(14px, 3vw, 20px)',
    padding: 'clamp(16px, 4vw, 24px)', marginBottom: 'clamp(16px, 4vw, 24px)'
  }}>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 'clamp(16px, 3vw, 20px)', flexWrap: 'wrap', gap: 'clamp(10px, 2vw, 12px)'
    }}>
      <h2 style={{
        fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: '800',
        color: '#1f2937', margin: 0
      }}>
        🎯 Il Tuo Prompt
      </h2>
      
      <button 
        onClick={onCopy}
        style={{
          padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
          background: copied 
            ? 'linear-gradient(135deg,#10b981 0%,#059669 100%)' 
            : currentUser.is_premium 
              ? 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)' 
              : 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
          color: (currentUser.is_premium && !copied) ? '#1f2937' : 'white',
          border: 'none', borderRadius: 'clamp(10px, 2vw, 12px)',
          fontWeight: '700', fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)',
          cursor: 'pointer', whiteSpace: 'nowrap'
        }}
      >
        {copied ? '✓ Copiato!' : '📋 Copia'}
      </button>
    </div>
    
    <div style={{
      background: 'linear-gradient(135deg,#f9fafb 0%,#f3f4f6 100%)',
      padding: 'clamp(14px, 3vw, 24px)', borderRadius: 'clamp(12px, 2.5vw, 16px)',
      border: '2px solid #e5e7eb', maxHeight: '60vh', overflowY: 'auto'
    }}>
      <pre style={{
        fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)', lineHeight: '1.6',
        color: '#1f2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        fontFamily: 'ui-monospace, monospace', margin: 0
      }}>
        {prompt}
      </pre>
    </div>
  </div>
);
