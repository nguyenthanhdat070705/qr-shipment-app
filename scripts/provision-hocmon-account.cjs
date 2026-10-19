// Run only after the authorized warehouse rename SQL has completed.
// Settings file is temporary and contains url, serviceKey and accountPassword.
// No existing password, stock row, or transaction is changed by this script.
const fs = require('node:fs/promises');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const settingsPath = process.argv[2];
  if (!settingsPath) throw new Error('Provide a temporary settings file path');
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    if (settings.url !== 'https://zspazvdyrrkdosqigomk.supabase.co' || !settings.accountPassword) {
      throw new Error('Missing credentials for the authorized project');
    }
    const admin = createClient(settings.url, settings.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const assignments = [
      { email: 'kho1@blackstone.com.vn', code: 'KHO-01', name: 'Kho Nguyễn Văn Linh (Kho 1)' },
      { email: 'kho4@blackstone.com.vn', code: '1O-39', name: 'Kho Nguyễn Văn Linh (Kho 4)' },
      { email: 'kho5@blackstone.com.vn', code: 'KHO-05', name: 'Kho Hóc Môn' },
    ];
    const { data: warehouses, error: warehouseError } = await admin.from('dim_kho')
      .select('id,ma_kho,ten_kho,is_active').in('ma_kho', assignments.map(a => a.code));
    if (warehouseError) throw new Error(warehouseError.message);
    for (const assignment of assignments) {
      const matches = warehouses.filter(w => w.ma_kho === assignment.code);
      if (matches.length !== 1 || matches[0].ten_kho !== assignment.name || !matches[0].is_active) {
        throw new Error(`Warehouse identity mismatch for ${assignment.code}`);
      }
      assignment.warehouse = matches[0];
    }
    const users = [];
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(error.message);
      users.push(...data.users);
      if (data.users.length < 100) break;
      if (page === 100) throw new Error('User pagination limit reached');
    }
    const { data: profiles, error: profileError } = await admin.from('dim_account')
      .select('id,email,ho_ten,role').in('email', assignments.map(a => a.email));
    if (profileError) throw new Error(profileError.message);
    // Validate every existing identity before making any Auth changes.
    for (const assignment of assignments) {
      const user = users.find(u => u.email?.toLowerCase() === assignment.email);
      const profile = profiles.find(p => p.email === assignment.email);
      if (assignment.code !== 'KHO-05' && (!user || !profile)) {
        throw new Error(`Existing identity is missing for ${assignment.email}`);
      }
      if (profile && (profile.ho_ten !== assignment.name || profile.role !== 'warehouse')) {
        throw new Error(`Profile mismatch for ${assignment.email}`);
      }
      if (assignment.code === 'KHO-05' && user?.app_metadata?.warehouse_id
          && user.app_metadata.warehouse_id !== assignment.warehouse.id) {
        throw new Error('kho5 already belongs to another warehouse');
      }
    }
    const result = [];
    for (const assignment of assignments) {
      let user = users.find(u => u.email?.toLowerCase() === assignment.email);
      let created = false;
      if (!user) {
        const response = await admin.auth.admin.createUser({
          email: assignment.email, password: settings.accountPassword, email_confirm: true,
          user_metadata: { name: assignment.name, full_name: assignment.name },
          app_metadata: { role: 'warehouse', warehouse_id: assignment.warehouse.id },
        });
        if (response.error || !response.data.user) throw new Error(response.error?.message || 'No user created');
        user = response.data.user;
        created = true;
      } else {
        const { error } = await admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, name: assignment.name, full_name: assignment.name },
          app_metadata: { ...user.app_metadata, role: 'warehouse', warehouse_id: assignment.warehouse.id },
        });
        if (error) throw new Error(error.message);
      }
      if (!profiles.some(p => p.email === assignment.email)) {
        const { error } = await admin.from('dim_account').insert({
          id: user.id, email: assignment.email, ho_ten: assignment.name,
          phong_ban: 'Kho vận', chuc_vu: 'Nhân viên kho', role: 'warehouse', is_active: true,
        });
        if (error) throw new Error(error.message);
      }
      result.push({ email: assignment.email, warehouse: assignment.name, warehouse_id: assignment.warehouse.id, created });
    }
    console.log(JSON.stringify({ success: true, accounts: result }));
  } finally {
    await fs.unlink(settingsPath).catch(() => {});
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
