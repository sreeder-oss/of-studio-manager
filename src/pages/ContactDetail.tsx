import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { Contact } from '@/types';
import { getContacts, saveContact, deleteContact } from '@/services/storage';
import { PRIVACY_NOTICE } from '@/lib/legal';

const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(() => {
    return getContacts().find(c => c.id === id) || null;
  });

  if (!contact) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Contact not found.</p>
        <button onClick={() => navigate('/contacts')} className="text-primary text-xs mt-2 hover:underline">Back to Contacts</button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Delete this contact?')) {
      deleteContact(contact.id);
      navigate('/contacts');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      active: 'bg-primary/10 text-primary border-primary/20',
      estimate: 'bg-warning/10 text-warning border-warning/20',
      pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      inactive: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.inactive}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const styles: Record<string, string> = {
      client: 'bg-primary/5 text-primary',
      lead: 'bg-amber-500/10 text-amber-400',
      vendor: 'bg-blue-500/10 text-blue-400',
    };
    return (
      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${styles[category] || ''}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate('/contacts')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
        <ChevronRight size={14} className="rotate-180" /> All Contacts
      </button>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-xl border border-primary/20">
              {contact.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-foreground text-lg">{contact.name}</h2>
              <div className="flex gap-1.5 mt-1">
                <CategoryBadge category={contact.category} />
                <StatusBadge status={contact.status} />
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/contacts', { state: { editId: contact.id } })} className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">
            Edit
          </button>
        </div>

        <div className="space-y-3 mt-5">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 bg-accent rounded-xl hover:bg-accent/80 transition-all group">
              <Phone size={16} className="text-primary" />
              <span className="text-foreground text-sm group-hover:text-primary transition-colors">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-3 bg-accent rounded-xl hover:bg-accent/80 transition-all group">
              <Mail size={16} className="text-primary" />
              <span className="text-foreground text-sm group-hover:text-primary transition-colors">{contact.email}</span>
            </a>
          )}
          {contact.address && (
            <div className="flex items-center gap-3 p-3 bg-accent rounded-xl">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-foreground text-sm">{contact.address}</span>
            </div>
          )}
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Notes</p>
            <p className="text-foreground text-sm leading-relaxed">{contact.notes}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-[9px] text-muted-foreground">Added {new Date(contact.createdAt).toLocaleDateString()}</p>
          <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3 bg-card/50 rounded-xl border border-border">
        <ShieldCheck size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[9px] text-muted-foreground leading-relaxed">{PRIVACY_NOTICE}</p>
      </div>
    </div>
  );
};

export default ContactDetail;
