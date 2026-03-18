import React from 'react';

const LandingPage = () => {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.6', color: '#1e293b' }}>
      {/* Header */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e2e8f0', 
        zIndex: 50,
        padding: '1rem 0'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: '#0EA5E9', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>IS</div>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0F172A' }}>InvoiceSaga</span>
          </div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#features" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>Features</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>Pricing</a>
            <a href="#how-it-works" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>How it Works</a>
            <a href="/signup" style={{ 
              backgroundColor: '#0EA5E9', 
              color: 'white', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '6px', 
              textDecoration: 'none', 
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}>Start Free</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ backgroundColor: '#0F172A', color: 'white', padding: '5rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1.5rem', 
            lineHeight: '1.1',
            margin: '0 0 1.5rem 0'
          }}>
            The simplest way to invoice clients and get paid faster
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#cbd5e1', 
            marginBottom: '3rem', 
            maxWidth: '600px', 
            margin: '0 auto 3rem auto' 
          }}>
            Creează facturi profesionale în secunde, automatizează procesul de plată și urmărește cash flow-ul tău cu InvoiceSaga.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{ 
              backgroundColor: '#0EA5E9', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontWeight: '600', 
              fontSize: '1.1rem',
              display: 'inline-block'
            }}>
              Începe gratuit
            </a>
            <button style={{ 
              backgroundColor: 'transparent', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '8px', 
              border: '2px solid #475569', 
              fontWeight: '600', 
              fontSize: '1.1rem',
              cursor: 'pointer'
            }}>
              Vizionează demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ backgroundColor: '#F8FAFC', padding: '5rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
              Totul ce ai nevoie pentru facturare
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>
              Simplifică procesul de facturare cu instrumentele noastre puternice
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              { emoji: '📄', title: 'Creare facturi', desc: 'Creează facturi profesionale în câteva click-uri cu șabloane personalizabile' },
              { emoji: '📧', title: 'Trimitere automată pe email', desc: 'Trimite automat facturile și reminder-urile către clienți' },
              { emoji: '📊', title: 'Tracking plăți', desc: 'Urmărește statusul plăților și vezi care facturi sunt în întârziere' },
              { emoji: '🔄', title: 'Recurring invoices', desc: 'Automatizează facturarea recurentă pentru abonamente și servicii regulate' },
              { emoji: '📈', title: 'Rapoarte & analytics', desc: 'Analizează veniturile cu rapoarte detaliate și dashboard-uri intuitive' },
              { emoji: '💼', title: 'Management clienți', desc: 'Organizează informațiile clienților și istoricul tranzacțiilor' }
            ].map((feature, index) => (
              <div key={index} style={{ 
                backgroundColor: 'white', 
                padding: '2rem', 
                borderRadius: '12px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
                textAlign: 'center' 
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.emoji}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 0.75rem 0' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#64748b', margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" style={{ backgroundColor: 'white', padding: '5rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
              Cum funcționează
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>
              Trei pași simpli pentru a-ți digitaliza procesul de facturare
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '3rem' 
          }}>
            {[
              { step: '1', title: 'Creează contul', desc: 'Înregistrează-te gratuit și configurează profilul companiei tale' },
              { step: '2', title: 'Adaugă clienți', desc: 'Importă sau adaugă manual informațiile clienților tăi' },
              { step: '3', title: 'Trimite facturi', desc: 'Generează și trimite facturi profesionale în câteva secunde' }
            ].map((step, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  backgroundColor: '#0EA5E9', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1.5rem auto', 
                  color: 'white', 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold' 
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 0.75rem 0' }}>
                  {step.title}
                </h3>
                <p style={{ color: '#64748b', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" style={{ backgroundColor: '#F8FAFC', padding: '5rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
              Prețuri simple și transparente
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>
              Începe gratuit, upgradeaza când ești gata
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2.5rem', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
              textAlign: 'center',
              border: '2px solid transparent'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>Free</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0F172A', marginBottom: '1rem' }}>
                0€<span style={{ fontSize: '1rem', color: '#64748b' }}>/lună</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Până la 5 facturi/lună</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• 2 clienți</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Șabloane de bază</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Support email</li>
              </ul>
              <button style={{ 
                backgroundColor: 'transparent', 
                color: '#0EA5E9', 
                padding: '0.75rem 2rem', 
                borderRadius: '8px', 
                border: '2px solid #0EA5E9', 
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}>
                Începe gratuit
              </button>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '2.5rem', 
              borderRadius: '12px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
              textAlign: 'center',
              border: '2px solid #0EA5E9',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '-12px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                padding: '0.5rem 1rem', 
                borderRadius: '20px', 
                fontSize: '0.875rem', 
                fontWeight: '600' 
              }}>
                Recomandat
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>Pro</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0F172A', marginBottom: '1rem' }}>
                29€<span style={{ fontSize: '1rem', color: '#64748b' }}>/lună</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Facturi nelimitate</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Clienți nelimitați</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Toate șabloanele</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Recurring invoices</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Rapoarte avansate</li>
                <li style={{ padding: '0.5rem 0', color: '#64748b' }}>• Support prioritar</li>