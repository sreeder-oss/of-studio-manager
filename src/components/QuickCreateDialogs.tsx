import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSaveContact, type DbContact } from '@/hooks/useContacts';
import { useSaveProject, type DbProject } from '@/hooks/useProjects';
import { toast } from 'sonner';

const inputCls = 'w-full bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary';
const labelCls = 'text-[9px] font-bold uppercase tracking-widest text-muted-foreground';
const btnPrimary = 'bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50';
const btnGhost = 'px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground';

export const QuickContactDialog: React.FC<{
  open: boolean; onOpenChange: (o: boolean) => void; initialName?: string; onCreated: (c: DbContact) => void;
}> = ({ open, onOpenChange, initialName = '', onCreated }) => {
  const save = useSaveContact();
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '' });
  useEffect(() => { if (open) setF({ name: initialName, email: '', phone: '', address: '' }); }, [open, initialName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) { toast.error('Name is required'); return; }
    const email = f.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { toast.error('Enter a valid email'); return; }
    try {
      const row = await save.mutateAsync({ name, email: email || null, phone: f.phone.trim() || null, address: f.address.trim() || null, type: 'Client', status: 'Lead Pending' });
      toast.success('Contact added');
      onCreated(row);
      onOpenChange(false);
    } catch { /* global toast */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif">Add Contact</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {(['name', 'email', 'phone', 'address'] as const).map(k => (
            <div key={k} className="space-y-1">
              <label className={labelCls}>{k}{k === 'name' ? ' *' : ''}</label>
              <input className={inputCls} autoFocus={k === 'name'} type={k === 'email' ? 'email' : 'text'}
                value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <DialogFooter className="gap-2">
            <button type="button" className={btnGhost} onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Contact'}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const QuickProjectDialog: React.FC<{
  open: boolean; onOpenChange: (o: boolean) => void; contacts: DbContact[]; defaultContactId?: string; onCreated: (p: DbProject) => void;
}> = ({ open, onOpenChange, contacts, defaultContactId = '', onCreated }) => {
  const save = useSaveProject();
  const [f, setF] = useState({ name: '', address: '', contact_id: '' });
  useEffect(() => { if (open) setF({ name: '', address: '', contact_id: defaultContactId }); }, [open, defaultContactId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) { toast.error('Project name is required'); return; }
    try {
      const row = await save.mutateAsync({ name, address: f.address.trim() || null, contact_id: f.contact_id || null, status: 'Bidding' });
      toast.success('Project added');
      onCreated(row);
      onOpenChange(false);
    } catch { /* global toast */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-serif">Add Project</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><label className={labelCls}>Name *</label>
            <input autoFocus className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1"><label className={labelCls}>Address</label>
            <input className={inputCls} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} /></div>
          <div className="space-y-1"><label className={labelCls}>Client</label>
            <select className={inputCls} value={f.contact_id} onChange={e => setF({ ...f, contact_id: e.target.value })}>
              <option value="">No client</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <DialogFooter className="gap-2">
            <button type="button" className={btnGhost} onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Project'}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
