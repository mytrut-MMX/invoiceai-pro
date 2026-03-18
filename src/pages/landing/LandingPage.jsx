import React from 'react';

export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.6', margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#0F172A', 
        color: 'white', 
        padding: '1rem 0',
        zIndex: 1000,
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0EA5E9' }}>InvoiceSaga</div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#features" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
            <a href="#pricing" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</a>
            <a href="/signin" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>Sign In</a>
            <a href="/signup" style={{ 
              backgroundColor: '#0EA5E9', 
              color: 'white', 
              padding: '0.5rem 1.5rem', 
              borderRadius: '6px', 
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>Get Started</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ backgroundColor: '#0F172A', color: 'white', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            The simplest way to invoice clients and get paid faster
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#CBD5E1', 
            marginBottom: '3rem', 
            maxWidth: '600px', 
            margin: '0 auto 3rem auto'
          }}>
            Perfect for freelancers, small businesses, and agencies. Create professional invoices, automate payments, and focus on what you do best.
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
              transition: 'background-color 0.2s',
              boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.39)'
            }}>
              Start Free Trial
            </a>
            <a href="#demo" style={{ 
              backgroundColor: 'transparent', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '8px', 
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              border: '2px solid #334155',
              transition: 'border-color 0.2s'
            }}>
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ backgroundColor: '#F8FAFC', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '3rem',
            color: '#0F172A'
          }}>
            Everything you need to get paid
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              { emoji: '📄', title: 'Creare facturi', desc: 'Create professional invoices in seconds with customizable templates' },
              { emoji: '📧', title: 'Trimitere automată pe email', desc: 'Automatically send invoices and reminders to your clients' },
              { emoji: '📊', title: 'Tracking plăți', desc: 'Track payment status and get notified when clients pay' },
              { emoji: '🔄', title: 'Recurring invoices', desc: 'Set up automatic recurring billing for subscription clients' },
              { emoji: '📈', title: 'Rapoarte & analytics', desc: 'Get insights into your business with detailed reports and analytics' },
              { emoji: '💳', title: 'Multiple payment options', desc: 'Accept payments via card, bank transfer, and popular payment gateways' }
            ].map((feature, index) => (
              <div key={index} style={{ 
                backgroundColor: 'white', 
                padding: '2rem', 
                borderRadius: '12px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.emoji}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0F172A' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#64748B' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ backgroundColor: 'white', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '3rem',
            color: '#0F172A'
          }}>
            How it works
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '3rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {[
              { step: '01', title: 'Create Invoice', desc: 'Add client details and invoice items in our simple interface' },
              { step: '02', title: 'Send & Track', desc: 'Send via email and track when clients view your invoices' },
              { step: '03', title: 'Get Paid', desc: 'Receive payments directly and get notified instantly' }
            ].map((step, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  backgroundColor: '#0EA5E9', 
                  color: 'white', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1.5rem auto'
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0F172A' }}>
                  {step.title}
                </h3>
                <p style={{ color: '#64748B' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" style={{ backgroundColor: '#F8FAFC', padding: '6rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '3rem',
            color: '#0F172A'
          }}>
            Simple, transparent pricing
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              {
                plan: 'Free',
                price: '$0',
                period: 'forever',
                features: ['Up to 5 invoices/month', 'Basic templates', 'Email support'],
                cta: 'Start Free',
                popular: false
              },
              {
                plan: 'Pro',
                price: '$19',
                period: 'per month',
                features: ['Unlimited invoices', 'Advanced templates', 'Recurring billing', 'Priority support', 'Analytics & reports'],
                cta: 'Start Free Trial',
                popular: true
              }
            ].map((pricing, index) => (
              <div key={index} style={{ 
                backgroundColor: 'white', 
                padding: '2.5rem', 
                borderRadius: '12px',
                boxShadow: pricing.popular ? '0 10px 25px -5px rgba(14, 165, 233, 0.25)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: pricing.popular ? '2px solid #0EA5E9' : 'none',
                position: 'relative',
                textAlign: 'center'
              }}>
                {pricing.popular && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-12px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    backgroundColor: '#0EA5E9',
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#0F172A' }}>
                  {pricing.plan}
                </h3>
                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 'bold', color: '#0F172A' }}>{pricing.price}</span>
                  <span style={{ color: '#64748B' }}>/{pricing.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
                  {pricing.features.map((feature, idx) => (
                    <li key={idx} style={{ 
                      padding: '0.5rem 0', 
                      color: '#64748B',
                      borderBottom: idx !== pricing.features.length - 1 ? '1px solid #E2E8F0' : 'none'
                    }}>
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
                <a href="/signup" style={{ 
                  display: 'block',
                  backgroundColor: pricing.popular ? '#0EA5E9' : '#F1F5F9', 
                  color: pricing.popular ? 'white' : '#0F172A', 
                  padding: '1rem 2rem', 
                  borderRadius: '8px', 
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}>
                  {pricing.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section style={{ backgroundColor: '#0F172A', color: 'white', padding: '5rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Ready to get paid faster?
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#CBD5E1', marginBottom: '2rem' }}>
            Join thousands of freelancers and businesses already using InvoiceSaga
          </p>
          <a href="/signup" style={{ 
            backgroundColor: '#0EA5E9', 
            color: 'white', 
            padding: '1rem 2.5rem', 
            borderRadius: '8px', 
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '1.1rem',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.39)'
          }}>
            Start Your Free Trial
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#1E293B', color: '#CBD5E1', padding: '3rem 0 2rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '2rem',
            marginBottom: '2rem'
          }}>