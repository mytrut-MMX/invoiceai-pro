import { supabase } from './supabase.js';

export async function listPaymentTerms() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from('payment_terms')
    .select('*')
    .order('sort_order')
    .order('name');
  return { data: data || [], error };
}

export async function getDefaultPaymentTerm() {
  const { data: terms, error } = await listPaymentTerms();
  if (error) return { data: null, error };
  const userDefault = terms.find(t => t.is_default && t.user_id);
  if (userDefault) return { data: userDefault, error: null };
  const systemDefault = terms.find(t => t.is_default && t.is_system);
  return { data: systemDefault || null, error: null };
}

export async function createPaymentTerm({ name, type, days }) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };
  const { data, error } = await supabase
    .from('payment_terms')
    .insert({ user_id: user.id, name, type, days: days ?? null, is_system: false })
    .select()
    .single();
  return { data, error };
}

export async function updatePaymentTerm(id, patch) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase
    .from('payment_terms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deletePaymentTerm(id) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: term } = await supabase
    .from('payment_terms')
    .select('is_system')
    .eq('id', id)
    .single();
  if (term?.is_system) return { error: { message: 'Cannot delete system payment terms' } };
  const { error } = await supabase.from('payment_terms').delete().eq('id', id);
  return { error };
}

export async function setDefaultPaymentTerm(id) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'Not authenticated' } };
  const { error: clearError } = await supabase
    .from('payment_terms')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_default', true);
  if (clearError) return { error: clearError };
  const { error } = await supabase
    .from('payment_terms')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}

/**
 * Pure: compute invoice due date from an issue date and a payment term.
 * Parses dates as UTC to avoid timezone drift.
 * @param {Date|string} issueDate  ISO date string or Date object
 * @param {{ type: string, days?: number }} term
 * @returns {Date}
 */
export function computeDueDate(issueDate, term) {
  const iso = issueDate instanceof Date
    ? issueDate.toISOString().slice(0, 10)
    : String(issueDate).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);

  switch (term.type) {
    case 'net':
    case 'custom':
      return new Date(Date.UTC(y, m - 1, d + (term.days || 0)));
    case 'eom':
      // Day 0 of next month = last day of current month
      return new Date(Date.UTC(y, m, 0));
    case 'due_on_receipt':
    default:
      return new Date(Date.UTC(y, m - 1, d));
  }
}
