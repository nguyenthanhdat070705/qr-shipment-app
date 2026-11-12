import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserRole, getWarehouseFilter } from '@/config/roles.config';

/** Resolve warehouse restrictions using the verified identity and server-side account record. */
export async function inventoryWarehouseFilter(supabase: SupabaseClient, email: string): Promise<string | null> {
  if (getUserRole(email) !== 'warehouse') return null;
  const { data, error } = await supabase.from('dim_account').select('ho_ten').eq('email', email).maybeSingle();
  if (error) throw new Error('Không thể xác định kho của tài khoản.');
  return getWarehouseFilter(email, data?.ho_ten || '');
}

export function warehouseMatches(name: string, filter: string | null): boolean {
  if (filter === null) return true;
  if (filter === 'UNASSIGNED_WAREHOUSE') return false;
  const normalize = (value: string) => value.trim().toLocaleLowerCase('vi-VN').replace(/^kho\s+/i, '');
  return normalize(name) === normalize(filter);
}
