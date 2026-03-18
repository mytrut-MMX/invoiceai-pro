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
          padding: '0 2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#0EA5E9' }}>
            📋 InvoiceSaga
          </div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <a href="#features" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>Features</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>Pricing</a>
            <a href="/login" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>Login</a>
            <a 
              href="/signup" 
              style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                padding: '0.75rem 1.5rem', 
                textDecoration: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              Start Free
            </a>
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
            lineHeight: '1.1',
            margin: '0 0 1.5rem 0'
          }}>
            The simplest way to invoice clients and get paid faster
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#94a3b8', 
            marginBottom: '3rem', 
            maxWidth: '600px', 
            margin: '0 auto 3rem auto' 
          }}>
            Create professional invoices, automate follow-ups, and track payments effortlessly. Perfect for freelancers, small businesses, and agencies.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a 
              href="/signup" 
              style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                padding: '1rem 2rem', 
                textDecoration: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.2s'
              }}
            >
              Start Free Today
            </a>
            <a 
              href="#demo" 
              style={{ 
                backgroundColor: 'transparent', 
                color: 'white', 
                padding: '1rem 2rem', 
                textDecoration: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: '600',
                fontSize: '1.1rem',
                border: '2px solid #334155',
                transition: 'all 0.2s'
              }}
            >
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ backgroundColor: '#F8FAFC', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
              Everything you need to manage invoices
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Powerful features designed to streamline your invoicing process and accelerate payments
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Creare facturi
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Create professional invoices in seconds with customizable templates and automatic calculations
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Trimitere automată pe email
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Send invoices automatically and set up smart reminders for overdue payments
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Tracking plăți
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Monitor payment status in real-time and get notified when clients pay
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Recurring invoices
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Set up automatic recurring invoices for subscription clients and regular services
              </p>
            </div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Rapoarte & analytics
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Get detailed insights into your revenue, outstanding payments, and business performance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ backgroundColor: 'white', padding: '6rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
              How it works
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '3rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: '0 auto 1.5rem auto' 
              }}>
                1
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Create your invoice
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Add client details, line items, and customize your invoice template in minutes
              </p>
            </div>
            <div>
              <div style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: '0 auto 1.5rem auto' 
              }}>
                2
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Send automatically
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Send invoices via email instantly or schedule them for later delivery
              </p>
            </div>
            <div>
              <div style={{ 
                backgroundColor: '#0EA5E9', 
                color: 'white', 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                margin: '0 auto 1.5rem auto' 
              }}>
                3
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Get paid faster
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                Track payments in real-time and get automatic reminders for overdue invoices
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" style={{ backgroundColor: '#F8FAFC', padding: '6rem 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', margin: 0 }}>
              Start free, upgrade when you need more
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2.5rem', 
              borderRadius: '1rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                Free
              </h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                $0
              </div>
              <p style={{ color: '#64748b', marginBottom: '2rem', margin: '0 0 2rem 0' }}>
                Perfect for getting started
              </p>
              <ul style={{ textAlign: 'left', marginBottom: '2rem', paddingLeft: '1rem', margin: '0 0 2rem 0' }}>
                <li style={{ marginBottom: '0.5rem' }}>Up to 5 invoices/month</li>
                <li style={{ marginBottom: