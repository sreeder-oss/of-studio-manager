import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, DollarSign, TrendingUp, FileText, Receipt, FileBox, Camera, Plus, Trash2, Upload, X } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useContacts } from '@/hooks/useContacts';
import { useEstimates } from '@/hooks/useEstimates';
import { useInvoices } from '@/hooks/useInvoices';
import { useReceipts } from '@/hooks/useReceipts';
import { useDocuments, useSaveDocument, useDeleteDocument, uploadDocumentFile } from '@/hooks/useDocuments';
import { usePhotos, useSavePhoto, useDeletePhoto, uploadProjectPhoto } from '@/hooks/usePhotos';
import { useAuth } from '@/contexts/AuthContext';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { toast } from 'sonner';
import { SignedImage, SignedLink } from '@/components/SignedAsset';

type Tab = 'overview' | 'estimates' | 'receipts' | 'documents' | 'photos';

const statusStyles: Record<string, string> = {
  Bidding: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Active: 'bg-primary/10 text-primary border-primary/20',
  Complete: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Archived: 'bg-muted text-muted-foreground border-border',
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: contacts = [] } = useContacts();
  const { data: allEstimates = [] } = useEstimates();
  const { data: allInvoices = [] } = useInvoices();
  const { data: allReceipts = [] } = useReceipts();
  const { data: projectDocs = [] } = useDocuments(id);
  const { data: projectPhotos = [] } = usePhotos(id);
  const saveDocument = useSaveDocument();
  const deleteDocMut = useDeleteDocument();
  const savePhoto = useSavePhoto();
  const deletePhotoMut = useDeletePhoto();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [docLabel, setDocLabel] = useState('');
  const [docType, setDocType] = useState('Other');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoPhase, setPhotoPhase] = useState('During');
  const docFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  const project = projects.find(p => p.id === id);
  const contact = contacts.find(c => c.id === project?.contact_id);

  useAIPageContext(project ? {
    kind: 'project', id: project.id, name: project.name,
    status: project.status, address: project.address,
    contact_name: contact?.name ?? null,
    contract_value: project.contract_value,
  } : null);

  const estimates = allEstimates.filter(e => e.project_id === id);
  const invoices = allInvoices.filter(i => i.project_id === id);
  const receipts = allReceipts.filter(r => r.project_id === id);

  if (!project) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <button onClick={() => navigate('/projects')} className="text-primary text-xs mt-2 hover:underline">Back to Projects</button>
      </div>
    );
  }

  const contractValue = Number(project.contract_value || 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalExpenses = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const margin = contractValue > 0 ? ((contractValue - totalExpenses) / contractValue * 100) : 0;

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !docLabel.trim()) { toast.error('Enter a label first'); return; }
    setUploadingDoc(true);
    try {
      const url = await uploadDocumentFile(user.id, file);
      await saveDocument.mutateAsync({ label: docLabel.trim(), type: docType, file_url: url, project_id: id });
      setDocLabel(''); setDocType('Other');
      toast.success('Document uploaded');
    } catch { toast.error('Upload failed'); }
    setUploadingDoc(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProjectPhoto(user.id, file);
      await savePhoto.mutateAsync({ project_id: id!, image_url: url, caption: photoCaption || null, phase: photoPhase });
      setPhotoCaption('');
      toast.success('Photo uploaded');
    } catch { toast.error('Upload failed'); }
    setUploadingPhoto(false);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> },
    { key: 'estimates', label: 'Estimates', icon: <FileText size={14} /> },
    { key: 'receipts', label: 'Receipts', icon: <Receipt size={14} /> },
    { key: 'documents', label: 'Docs', icon: <FileBox size={14} /> },
    { key: 'photos', label: 'Photos', icon: <Camera size={14} /> },
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
        <ChevronLeft size={14} /> All Projects
      </button>

      {/* Project Header */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-serif text-foreground text-xl">{project.name}</h2>
            {contact && <p className="text-muted-foreground text-xs mt-0.5">{contact.name}</p>}
          </div>
          <span className={`text-[8px] px-2 py-0.5 rounded border uppercase font-bold tracking-widest ${statusStyles[project.status || 'Bidding']}`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-4 flex-wrap text-[10px] text-muted-foreground">
          {project.address && <span className="flex items-center gap-1"><MapPin size={12} /> {project.address}</span>}
          {project.start_date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(project.start_date).toLocaleDateString()}</span>}
          {contractValue > 0 && <span className="flex items-center gap-1 text-primary font-bold"><DollarSign size={12} /> {contractValue.toLocaleString()}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar bg-card border border-border rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Contract Value</p>
              <p className="font-serif text-foreground text-xl mt-1">${contractValue.toLocaleString()}</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Invoiced</p>
              <p className="font-serif text-foreground text-xl mt-1">${totalInvoiced.toLocaleString()}</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Expenses</p>
              <p className="font-serif text-foreground text-xl mt-1">${totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Margin</p>
              <p className={`font-serif text-xl mt-1 ${margin >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {contractValue > 0 ? `${margin.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
          {/* Margin bar */}
          {contractValue > 0 && (
            <div className="bg-card p-4 rounded-xl border border-border">
              <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-2">
                <span>Expenses vs Contract</span>
                <span>${(contractValue - totalExpenses).toLocaleString()} remaining</span>
              </div>
              <div className="h-3 bg-accent rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${totalExpenses > contractValue ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min((totalExpenses / contractValue) * 100, 100)}%` }} />
              </div>
            </div>
          )}
          {project.notes && (
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="text-foreground text-sm">{project.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'estimates' && (
        <div className="space-y-2">
          {estimates.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-[11px]">No estimates for this project yet.</p>
              <button onClick={() => navigate('/estimates/new')} className="text-primary text-[10px] mt-2 font-bold uppercase tracking-widest hover:underline">Create Estimate</button>
            </div>
          ) : estimates.map(e => (
            <div key={e.id} onClick={() => navigate(`/estimates/${e.id}`)}
              className="bg-card p-3.5 rounded-xl border border-border hover:border-primary/20 cursor-pointer flex justify-between items-center">
              <div>
                <p className="text-foreground text-sm font-semibold">{contacts.find(c => c.id === e.contact_id)?.name || 'Estimate'}</p>
                <p className="text-[10px] text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-foreground font-bold">${Number(e.total || 0).toLocaleString()}</p>
                <span className="text-[8px] text-muted-foreground uppercase font-bold">{e.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="space-y-2">
          {receipts.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-[11px]">No receipts for this project yet.</p>
            </div>
          ) : receipts.map(r => (
            <div key={r.id} className="bg-card p-3 rounded-xl border border-border flex items-center gap-3">
              {r.image_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold truncate">{r.vendor}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.receipt_date).toLocaleDateString()} • {r.category}</p>
              </div>
              <p className="font-serif text-foreground font-bold">${Number(r.amount).toFixed(2)}</p>
            </div>
          ))}
          <p className="text-right text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Total: ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-3">
          <div className="bg-card p-3 rounded-xl border border-border space-y-2">
            <div className="flex gap-2">
              <input type="text" placeholder="Document label..." value={docLabel} onChange={e => setDocLabel(e.target.value)}
                className="flex-1 bg-accent border border-border rounded-lg p-2 text-xs text-foreground outline-none" />
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="bg-accent border border-border rounded-lg p-2 text-xs text-foreground outline-none">
                {['Contract', 'Change Order', 'Permit', 'Photo Release', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => { if (!docLabel.trim()) { toast.error('Enter a label'); return; } docFileRef.current?.click(); }}
              disabled={uploadingDoc}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all disabled:opacity-50">
              <Upload size={14} /> {uploadingDoc ? 'Uploading...' : 'Upload Document'}
            </button>
            <input ref={docFileRef} type="file" className="hidden" onChange={handleDocUpload} />
          </div>

          {projectDocs.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-[11px]">No documents yet.</p>
            </div>
          ) : projectDocs.map(doc => (
            <div key={doc.id} className="bg-card p-3 rounded-xl border border-border flex items-center gap-3">
              <FileBox size={16} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold truncate">{doc.label}</p>
                <p className="text-[10px] text-muted-foreground">{doc.type} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-[9px] font-bold uppercase tracking-widest hover:underline">View</a>}
                <button onClick={() => { deleteDocMut.mutateAsync(doc.id); toast.success('Deleted'); }} className="text-destructive/50 hover:text-destructive"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-3">
          <div className="bg-card p-3 rounded-xl border border-border space-y-2">
            <div className="flex gap-2">
              <input type="text" placeholder="Caption (optional)..." value={photoCaption} onChange={e => setPhotoCaption(e.target.value)}
                className="flex-1 bg-accent border border-border rounded-lg p-2 text-xs text-foreground outline-none" />
              <select value={photoPhase} onChange={e => setPhotoPhase(e.target.value)}
                className="bg-accent border border-border rounded-lg p-2 text-xs text-foreground outline-none">
                {['Before', 'During', 'After'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => photoFileRef.current?.click()} disabled={uploadingPhoto}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all disabled:opacity-50">
              <Camera size={14} /> {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
            </button>
            <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {projectPhotos.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-[11px]">No photos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {projectPhotos.map(photo => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden border border-border group">
                  {photo.image_url && <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-32 object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="flex-1">
                      {photo.caption && <p className="text-foreground text-[10px] font-semibold">{photo.caption}</p>}
                      <span className="text-[8px] text-muted-foreground uppercase font-bold">{photo.phase}</span>
                    </div>
                    <button onClick={() => { deletePhotoMut.mutateAsync(photo.id); toast.success('Deleted'); }}
                      className="text-destructive p-1"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
