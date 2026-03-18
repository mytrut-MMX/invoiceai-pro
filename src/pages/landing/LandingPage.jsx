import React from 'react';

const LandingPage = () => {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.6', margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#0F172A', 
        borderBottom: '1px solid #334155',
        zIndex: 1000,
        padding: '1rem 0'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              backgroundColor: '#0EA5E9', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>📋</div>
            <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>InvoiceSaga</span>
          </div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#features" style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: '0.95rem' }}>Features</a>
            <a href="#pricing" style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: '0.95rem' }}>Pricing</a>
            <a href="/signin" style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: '0.95rem' }}>Sign In</a>
            <a 
              href="/signup" 
              style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                padding: '0.75rem 1.5rem', 
                borderRadius: '6px', 
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        backgroundColor: '#0F172A', 
        color: 'white', 
        padding: '5rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 'bold', 
            margin: '0 0 1.5rem 0',
            lineHeight: '1.1'
          }}>
            The simplest way to invoice clients and get paid faster
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#CBD5E1', 
            margin: '0 0 3rem 0',
            maxWidth: '600px',
            margin: '0 auto 3rem auto'
          }}>
            Stop chasing payments. Create professional invoices, automate follow-ups, and track everything in one place. Perfect for freelancers, agencies, and small businesses.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="/signup" 
              style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                padding: '1rem 2rem', 
                borderRadius: '8px', 
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}
            >
              Start Free Trial
            </a>
            <a 
              href="#demo" 
              style={{ 
                border: '2px solid #0EA5E9',
                color: '#0EA5E9', 
                padding: '1rem 2rem', 
                borderRadius: '8px', 
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: '600',
                backgroundColor: 'transparent'
              }}
            >
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ 
        backgroundColor: '#F8FAFC', 
        padding: '5rem 2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#0F172A', 
              margin: '0 0 1rem 0'
            }}>
              Everything you need to get paid
            </h2>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#64748B',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Powerful invoicing features designed for modern businesses
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '2rem'
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Creare facturi
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Create professional invoices in seconds with customizable templates and automatic calculations
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Trimitere automată pe email
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Automatically send invoices and payment reminders to your clients via email
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👀</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Tracking plăți
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Track payment status in real-time and know exactly when invoices are paid
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Recurring invoices
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Set up recurring invoices for subscription clients and never miss a payment
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Rapoarte & analytics
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Get insights into your business with detailed reports and analytics dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ 
        backgroundColor: 'white', 
        padding: '5rem 2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#0F172A', 
              margin: '0 0 1rem 0'
            }}>
              How it works
            </h2>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#64748B',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '3rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center' }}>
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
              }}>1</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Create Your Invoice
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Choose a template, add your client details, and itemize your services or products
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
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
              }}>2</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Send & Track
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Send invoices automatically via email and track when they're opened and viewed
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
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
              }}>3</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0F172A', margin: '0 0 1rem 0' }}>
                Get Paid Faster
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
                Receive payments online and get notified instantly when invoices are paid
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" style={{ 
        backgroundColor: '#F8FAFC', 
        padding: '5rem 2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#0F172A', 
              margin: '0 0 1rem 0'
            }}>
              Simple, transparent pricing
            </h2>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#64748B',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Start free, upgrade when you need more
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2.5rem 2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0