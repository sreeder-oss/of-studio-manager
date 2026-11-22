import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin, ShieldCheck, Trash2, Send, FileText, UserCheck, ArrowRight } from 'lucide-react';
import { useContact, useSaveContact, useDeleteContact } from '@/hooks/useContacts';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';
import { PRIVACY_NOTICE } from '@/lib/legal';
import { toast } from 'sonner';

const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const saveContact = useSaveContact();
  const deleteContactMut = useDeleteContact();
  const [isOutreachOpen, setIsOutreachOpen] = useState(false);

  useAIPageContext(contact ? {
    kind: 'contact', id: contact.id, name: contact.name,
    email: contact.email, phone: contact.phone, type: contact.type,
  } : null);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;

  if (!contact) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Contact not found.</p>
        <button onClick={() => navigate('/contacts')} className="text-primary text-xs mt-2 hover:underline">Back to Contacts</button>
      </div>
    );
  }

  const isPotential = contact.type === 'Lead';

  const handleDelete = async () => {
    if (confirm('Delete this contact?')) {
      await deleteContactMut.mutateAsync(contact.id);
      toast.success('Contact deleted');
      navigate('/contacts');
    }
  };

  const handlePromoteToClient = async () => {
    try {
      await saveContact.mutateAsync({
        ...contact,
        type: 'Client',
        status: 'Active',
        notes: contact.notes ? `${contact.notes}\n[Promoted to Client on ${new Date().toLocaleDateString()}]` : '[Promoted to Client]',
      });
      toast.success(`${contact.name} converted to Client! Opening Estimate...`);
      navigate(`/estimates/new?contactId=${contact.id}`);
    } catch {
      toast.error('Failed to convert contact');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Active: 'bg-primary/10 text-primary border-primary/20',
      Estimate: 'bg-warning/10 text-warning border-warning/20',
      Pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Inactive: 'bg-muted text-muted-foreground border-border',
    };
    return <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.Inactive}`}>{status}</span>;
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const isPot = category === 'Lead';
    const label = isPot ? 'Potential Client' : category;
    const styles: Record<string, string> = {
      Client: 'bg-primary/10 text-primary border border-primary/20',
      Lead: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      Vendor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };
    return <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${styles[category] || ''}`}>{label}</span>;
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate('/contacts')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
        <ChevronRight size={14} className="rotate-180" /> All Contacts
      </button>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center font-serif text-2xl border ${
              isPotential
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {contact.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-foreground text-xl">{contact.name}</h2>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <CategoryBadge category={contact.type || 'Client'} />
                <StatusBadge status={contact.status || 'Active'} />
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPotential ? (
              <>
                <button
                  onClick={() => setIsOutreachOpen(true)}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-glow flex items-center gap-1.5 transition-all hover:bg-primary/90"
                >
                  <Mail size={14} />
                  <span>Email Info</span>
                </button>
                <button
                  onClick={handlePromoteToClient}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all hover:bg-emerald-500/25"
                  title="Promote to active Client and open New Estimate"
                >
                  <UserCheck size={14} />
                  <span>Make Estimate</span>
                </button>
              </>
            ) : contact.type === 'Client' ? (
              <button
                onClick={() => navigate(`/estimates/new?contactId=${contact.id}`)}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-glow flex items-center gap-1.5 transition-all hover:bg-primary/90"
              >
                <FileText size={14} />
                <span>New Estimate</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="space-y-2.5 mt-5">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 bg-accent rounded-xl hover:bg-accent/80 transition-all group">
              <Phone size={16} className="text-primary" />
              <span className="text-foreground text-sm group-hover:text-primary transition-colors">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <div className="flex items-center justify-between p-3 bg-accent rounded-xl">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 hover:text-primary transition-colors group flex-1">
                <Mail size={16} className="text-primary" />
                <span className="text-foreground text-sm group-hover:text-primary transition-colors truncate">{contact.email}</span>
              </a>
              <button
                onClick={() => setIsOutreachOpen(true)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
              >
                Draft Outreach <ArrowRight size={12} />
              </button>
            </div>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Notes & Outreach Log</p>
            <p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap font-mono bg-accent/30 p-2.5 rounded-lg border border-border/50">
              {contact.notes}
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-[9px] text-muted-foreground">Added {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'N/A'}</p>
          <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
            Delete Contact
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3 bg-card/50 rounded-xl border border-border">
        <ShieldCheck size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[9px] text-muted-foreground leading-relaxed">{PRIVACY_NOTICE}</p>
      </div>

      {/* Outreach Email Modal */}
      <OutreachEmailModal
        contact={contact}
        isOpen={isOutreachOpen}
        onClose={() => setIsOutreachOpen(false)}
      />
    </div>
  );
};

export default ContactDetail;
