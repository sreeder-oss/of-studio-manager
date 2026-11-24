import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Check,
  Download,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { getPhotoUrl, uploadProjectPhoto, usePhotos, useSavePhoto } from '@/hooks/usePhotos';
import { BeforeAfterSlider } from '@/components/visualizer/BeforeAfterSlider';
import {
  buildConceptCardPng,
  compileFinishPrompt,
  dataUrlToFile,
  FINISH_SYSTEMS,
  generateFinishVisualization,
  getVisualizerOpenRouterKey,
  OF_SAMPLE_PRESETS,
  resizeImageFileToDataUrl,
  SURFACE_SHEENS,
  SURFACE_TARGETS,
  TEXTURE_DEPTHS,
  TROWEL_MOVEMENTS,
  urlToResizedDataUrl,
  type FinishSystem,
  type OfsSamplePreset,
  type SurfaceSheen,
  type SurfaceTarget,
  type TextureDepth,
  type TrowelMovement,
} from '@/lib/finishVisualizer';

interface WalkThroughShot {
  id: string;
  label: string;
  dataUrl: string;
  savedToProjectId?: string;
}

interface RenderIteration {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  system: FinishSystem;
  surfaceTarget: SurfaceTarget;
  sheen: SurfaceSheen;
  movement: TrowelMovement;
  texture: TextureDepth;
  modelUsed: string;
  createdAt: string;
}

const PillRow = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div className="space-y-1.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
      {label}
    </span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
            value === opt
              ? 'bg-primary/15 border-primary/50 text-primary'
              : 'bg-background border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const Visualizer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();

  const initialProjectId = searchParams.get('projectId') || '';
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const { data: projectPhotos = [] } = usePhotos(selectedProjectId || undefined);
  const savePhoto = useSavePhoto();

  // Walk-through photos captured/uploaded in this session
  const [shots, setShots] = useState<WalkThroughShot[]>([
    {
      id: 'sample-fireplace',
      label: 'Example: Limestone Fireplace',
      dataUrl: '/samples/fireplace-limestone.jpg',
    },
    {
      id: 'sample-hood',
      label: 'Example: Range Hood',
      dataUrl: '/samples/hood-charcoal.jpg',
    },
  ]);
  const [activeShotId, setActiveShotId] = useState<string>('sample-fireplace');

  // Optional Client Inspiration / Sample Board photo
  const [inspirationUrl, setInspirationUrl] = useState<string | null>(null);
  const [inspirationLabel, setInspirationLabel] = useState<string | null>(null);

  // Craftsmanship variables (preset buttons)
  const [surfaceTarget, setSurfaceTarget] = useState<SurfaceTarget>('Fireplace');
  const [finishSystem, setFinishSystem] = useState<FinishSystem>('Biolime');
  const [movement, setMovement] = useState<TrowelMovement>('Medium');
  const [sheen, setSheen] = useState<SurfaceSheen>('Dead Flat Matte');
  const [texture, setTexture] = useState<TextureDepth>('Light Trowel');
  const [refinementNote, setRefinementNote] = useState('');

  // Generation & saving state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingRaw, setIsSavingRaw] = useState(false);
  const [isSavingRender, setIsSavingRender] = useState(false);
  const [iterations, setIterations] = useState<RenderIteration[]>([]);
  const [activeIterationId, setActiveIterationId] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const roomCameraRef = useRef<HTMLInputElement>(null);
  const roomUploadRef = useRef<HTMLInputElement>(null);
  const inspCameraRef = useRef<HTMLInputElement>(null);
  const inspUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pid = searchParams.get('projectId') || '';
    if (pid) setSelectedProjectId(pid);
  }, [searchParams]);

  const activeShot = useMemo(
    () => shots.find((s) => s.id === activeShotId) || shots[0],
    [shots, activeShotId],
  );

  const activeIteration = useMemo(
    () => iterations.find((it) => it.id === activeIterationId) || null,
    [iterations, activeIterationId],
  );

  const compiledPrompt = useMemo(
    () =>
      compileFinishPrompt({
        surfaceTarget,
        finishSystem,
        movement,
        sheen,
        texture,
        hasInspirationImage: Boolean(inspirationUrl),
        refinementNote,
      }),
    [surfaceTarget, finishSystem, movement, sheen, texture, inspirationUrl, refinementNote],
  );

  const hasOpenRouterKey = Boolean(getVisualizerOpenRouterKey());

  const handleRoomFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: WalkThroughShot[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const dataUrl = await resizeImageFileToDataUrl(file, 1400);
        added.push({
          id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: file.name.replace(/\.[^.]+$/, '') || 'Site Walk Photo',
          dataUrl,
        });
      } catch {
        toast.error(`Could not read ${file.name}`);
      }
    }
    if (added.length > 0) {
      setShots((prev) => [...added, ...prev]);
      setActiveShotId(added[0].id);
      setActiveIterationId(null);
      toast.success(`Added ${added.length} walk-through ${added.length === 1 ? 'photo' : 'photos'}`);
    }
  };

  const handleLoadProjectPhoto = async (photoPath: string, caption: string | null) => {
    try {
      const signedUrl = await getPhotoUrl(photoPath);
      const dataUrl = await urlToResizedDataUrl(signedUrl, 1400);
      const shot: WalkThroughShot = {
        id: `proj-${Date.now()}`,
        label: caption || 'Project Photo',
        dataUrl,
        savedToProjectId: selectedProjectId,
      };
      setShots((prev) => [shot, ...prev]);
      setActiveShotId(shot.id);
      setActiveIterationId(null);
      toast.success('Loaded project photo into Visualizer');
    } catch {
      toast.error('Could not load project photo');
    }
  };

  const handleInspirationFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 1100);
      setInspirationUrl(dataUrl);
      setInspirationLabel(file.name.replace(/\.[^.]+$/, '') || 'Client Inspiration');
      toast.success('Client inspiration photo attached');
    } catch {
      toast.error('Could not read inspiration photo');
    }
  };

  const handleSelectOfSample = (preset: OfsSamplePreset) => {
    setInspirationUrl(preset.imagePath);
    setInspirationLabel(`${preset.label} (${preset.subtitle})`);
    setFinishSystem(preset.defaultSystem);
    setSheen(preset.defaultSheen);
    setMovement(preset.defaultMovement);
    setTexture(preset.defaultTexture);
    toast.success(`Loaded OF sample: ${preset.label}`);
  };

  const handleSaveRawShotToProject = async () => {
    if (!activeShot || !selectedProjectId || !user || isSavingRaw) {
      if (!selectedProjectId) toast.error('Pick a Project first to organize this walk-through photo.');
      return;
    }
    setIsSavingRaw(true);
    try {
      const file = dataUrlToFile(activeShot.dataUrl, `walkthrough-${Date.now()}.jpg`);
      const path = await uploadProjectPhoto(user.id, file);
      await savePhoto.mutateAsync({
        project_id: selectedProjectId,
        image_url: path,
        caption: `Site Walk (${surfaceTarget}) — ${activeShot.label}`,
        phase: 'Before',
      });
      setShots((prev) =>
        prev.map((s) => (s.id === activeShot.id ? { ...s, savedToProjectId: selectedProjectId } : s)),
      );
      toast.success('Raw walk-through photo saved to Project → Photos (Before)');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save photo to project');
    } finally {
      setIsSavingRaw(false);
    }
  };

  const handleGenerate = async (isRefinement = false) => {
    if (!activeShot || isGenerating) return;
    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const roomDataUrl = activeShot.dataUrl.startsWith('data:')
        ? activeShot.dataUrl
        : await urlToResizedDataUrl(activeShot.dataUrl, 1400);

      let inspDataUrl: string | null = null;
      if (inspirationUrl) {
        inspDataUrl = inspirationUrl.startsWith('data:')
          ? inspirationUrl
          : await urlToResizedDataUrl(inspirationUrl, 1100);
      }

      const { imageDataUrl, modelUsed } = await generateFinishVisualization({
        roomImageDataUrl: roomDataUrl,
        inspirationImageDataUrl: inspDataUrl,
        prompt: compiledPrompt,
        signal: controller.signal,
      });

      const iter: RenderIteration = {
        id: `render-${Date.now()}`,
        beforeUrl: roomDataUrl,
        afterUrl: imageDataUrl,
        system: finishSystem,
        surfaceTarget,
        sheen,
        movement,
        texture,
        modelUsed,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setIterations((prev) => [iter, ...prev]);
      setActiveIterationId(iter.id);
      if (isRefinement) setRefinementNote('');
      toast.success(`Rendered ${finishSystem} preview!`);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.info('Generation cancelled');
      } else {
        toast.error(err instanceof Error ? err.message : 'Visualization failed', { duration: 6000 });
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleSaveRenderToProject = async () => {
    if (!activeIteration || !selectedProjectId || !user || isSavingRender) {
      if (!selectedProjectId) toast.error('Select a Project first to save this Before/After concept.');
      return;
    }
    setIsSavingRender(true);
    try {
      const recipeCaption = `${activeIteration.system} • ${activeIteration.surfaceTarget} • ${activeIteration.sheen} • ${activeIteration.movement} Movement`;
      const beforeFile = dataUrlToFile(activeIteration.beforeUrl, `before-${Date.now()}.jpg`);
      const afterFile = dataUrlToFile(activeIteration.afterUrl, `after-${Date.now()}.jpg`);
      const [beforePath, afterPath] = await Promise.all([
        uploadProjectPhoto(user.id, beforeFile),
        uploadProjectPhoto(user.id, afterFile),
      ]);

      await savePhoto.mutateAsync({
        project_id: selectedProjectId,
        image_url: beforePath,
        caption: `Visualizer Before (${activeIteration.surfaceTarget})`,
        phase: 'Before',
      });
      await savePhoto.mutateAsync({
        project_id: selectedProjectId,
        image_url: afterPath,
        caption: `Visualizer Concept: ${recipeCaption}`,
        phase: 'After',
      });
      toast.success('Saved Before & After concept to Project → Photos!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save concept to Project');
    } finally {
      setIsSavingRender(false);
    }
  };

  const handleDownloadConceptCard = async () => {
    if (!activeIteration) return;
    try {
      const proj = projects.find((p) => p.id === selectedProjectId);
      const blob = await buildConceptCardPng({
        beforeUrl: activeIteration.beforeUrl,
        afterUrl: activeIteration.afterUrl,
        title: proj ? `${proj.name} — ${activeIteration.surfaceTarget}` : `${activeIteration.surfaceTarget} Finish Concept`,
        recipeLine: `${activeIteration.system}  •  ${activeIteration.sheen}  •  ${activeIteration.movement} Movement  •  ${activeIteration.texture}`,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OF-Finish-Concept-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded Before/After Concept Card');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to build concept card');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif text-foreground tracking-tight flex items-center gap-2">
            <Wand2 size={22} className="text-primary" />
            AI Finish Visualizer
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Capture early site-walk photos, attach a client inspiration or OF sample board, and preview hand-troweled mineral plaster.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProjectId}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedProjectId(v);
              setSearchParams(v ? { projectId: v } : {}, { replace: true });
            }}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary max-w-[240px]"
          >
            <option value="">Link to Project (optional)...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {selectedProjectId && (
            <button
              type="button"
              onClick={() => navigate(`/estimates/new?projectId=${selectedProjectId}`)}
              className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-accent flex items-center gap-1.5"
            >
              <FileText size={13} className="text-primary" /> New Estimate
            </button>
          )}
        </div>
      </header>

      {!hasOpenRouterKey && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-xs">
          <span className="text-amber-200">
            <strong>OpenRouter key needed for AI renders:</strong> You can still capture &amp; organize site-walk photos into Projects right now; add your <code className="font-mono">sk-or-</code> key in Settings when ready to generate previews.
          </span>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold hover:bg-amber-500/30"
          >
            Open Settings
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left/Main Column: Capture + Before/After Stage + Filmstrip */}
        <div className="lg:col-span-7 space-y-4">
          {/* Site Walk Photo Capture Strip */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Camera size={13} /> 1. Real Space (Walk-Through Photo)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={roomCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { handleRoomFiles(e.target.files); e.target.value = ''; }}
                />
                <input
                  ref={roomUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleRoomFiles(e.target.files); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => roomCameraRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5"
                >
                  <Camera size={13} /> Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => roomUploadRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-accent border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-accent/80"
                >
                  <Upload size={13} /> Upload
                </button>
                {selectedProjectId && activeShot && !activeShot.id.startsWith('sample-') && (
                  <button
                    type="button"
                    disabled={isSavingRaw}
                    onClick={handleSaveRawShotToProject}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    title="Organize this raw site-walk photo into Project → Photos"
                  >
                    {isSavingRaw ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : activeShot.savedToProjectId === selectedProjectId ? (
                      <Check size={12} />
                    ) : (
                      <FolderPlus size={12} />
                    )}
                    {activeShot.savedToProjectId === selectedProjectId ? 'Saved to Project' : 'Save Raw Photo'}
                  </button>
                )}
              </div>
            </div>

            {/* Shot Picker Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {shots.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setActiveShotId(s.id); setActiveIterationId(null); }}
                  className={`relative shrink-0 w-24 rounded-lg overflow-hidden border cursor-pointer transition-all group ${
                    s.id === activeShot?.id ? 'border-primary ring-1 ring-primary' : 'border-border opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={s.dataUrl} alt={s.label} className="w-full h-16 object-cover" />
                  <div className="px-1.5 py-1 bg-background/90 text-[9px] truncate font-medium text-foreground">
                    {s.label}
                  </div>
                  {shots.length > 1 && !s.id.startsWith('sample-') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShots((prev) => prev.filter((x) => x.id !== s.id));
                      }}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Existing Project Photos Quick Load */}
            {selectedProjectId && projectPhotos.length > 0 && (
              <div className="pt-1 border-t border-border/60 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">From Project Photos:</span>
                {projectPhotos.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => p.image_url && handleLoadProjectPhoto(p.image_url, p.caption)}
                    className="text-[10px] px-2 py-1 rounded bg-background border border-border text-foreground hover:border-primary/50 truncate max-w-[140px]"
                  >
                    {p.caption || `${p.phase || 'Site'} photo`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Before/After Interactive Stage */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            {activeShot && (
              <BeforeAfterSlider
                beforeUrl={activeIteration?.beforeUrl || activeShot.dataUrl}
                afterUrl={activeIteration?.afterUrl || null}
                caption={
                  activeIteration
                    ? `${activeIteration.system} • ${activeIteration.surfaceTarget} • ${activeIteration.sheen} • ${activeIteration.movement} Movement • ${activeIteration.texture}`
                    : `Selected Space: ${activeShot.label}`
                }
              />
            )}

            {/* 1-Line Refine Box & Export Actions (when a render exists) */}
            {activeIteration && (
              <div className="pt-2 border-t border-border/60 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refinementNote}
                    onChange={(e) => setRefinementNote(e.target.value)}
                    placeholder="Refine this render (e.g. warmer cream tone, flatter matte, keep wood trim untouched)..."
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    disabled={isGenerating || !refinementNote.trim()}
                    onClick={() => handleGenerate(true)}
                    className="px-3 py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RefreshCw size={12} /> Refine
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadConceptCard}
                    className="px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-accent text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download size={13} /> Download Before/After Card
                  </button>
                  <button
                    type="button"
                    disabled={isSavingRender}
                    onClick={handleSaveRenderToProject}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingRender ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Save Concept to Project
                  </button>
                </div>
              </div>
            )}

            {/* Iteration Filmstrip */}
            {iterations.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                  Session Renders ({iterations.length})
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {iterations.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setActiveIterationId(it.id)}
                      className={`shrink-0 w-24 rounded-lg overflow-hidden border text-left transition-all ${
                        it.id === activeIteration?.id
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-border opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={it.afterUrl} alt={it.system} className="w-full h-14 object-cover" />
                      <div className="px-1.5 py-1 bg-background text-[9px] truncate font-semibold text-foreground">
                        {it.system} · {it.createdAt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Client Inspiration + Craftsmanship Variables */}
        <div className="lg:col-span-5 space-y-4">
          {/* 2. Optional Client Inspiration / OF Sample Board */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Palette size={13} /> 2. Client Inspiration / Sample (Optional)
              </span>
              {inspirationUrl && (
                <button
                  type="button"
                  onClick={() => { setInspirationUrl(null); setInspirationLabel(null); }}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={inspCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { handleInspirationFile(e.target.files); e.target.value = ''; }}
              />
              <input
                ref={inspUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleInspirationFile(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => inspCameraRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg bg-background border border-border text-xs font-semibold text-foreground hover:border-primary/40 flex items-center justify-center gap-1.5"
              >
                <Camera size={13} /> Snap Sample
              </button>
              <button
                type="button"
                onClick={() => inspUploadRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg bg-background border border-border text-xs font-semibold text-foreground hover:border-primary/40 flex items-center justify-center gap-1.5"
              >
                <ImageIcon size={13} /> Client Photo
              </button>
            </div>

            {inspirationUrl && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2">
                <img src={inspirationUrl} alt="Inspiration" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">{inspirationLabel || 'Inspiration Photo'}</div>
                  <div className="text-[10px] text-muted-foreground">Used for color warmth, mottling &amp; plaster character</div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground block">
                Or tap one of Shawn&apos;s real OF work / sample boards:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {OF_SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectOfSample(preset)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                      inspirationUrl === preset.imagePath
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-background border-border hover:border-border/80'
                    }`}
                  >
                    <img src={preset.imagePath} alt={preset.label} className="w-9 h-9 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">{preset.label}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{preset.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Craftsmanship Variables */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Layers size={13} /> 3. Craftsmanship Variables
            </span>

            <PillRow
              label="Target Surface (Strict Preservation)"
              options={SURFACE_TARGETS}
              value={surfaceTarget}
              onChange={setSurfaceTarget}
            />

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Finish System
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FINISH_SYSTEMS.map((sys) => (
                  <button
                    key={sys.id}
                    type="button"
                    title={sys.desc}
                    onClick={() => setFinishSystem(sys.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      finishSystem === sys.id
                        ? 'bg-primary/15 border-primary/50 text-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sys.id}
                  </button>
                ))}
              </div>
            </div>

            <PillRow
              label="Trowel Movement"
              options={TROWEL_MOVEMENTS}
              value={movement}
              onChange={setMovement}
            />

            <PillRow
              label="Surface Sheen"
              options={SURFACE_SHEENS}
              value={sheen}
              onChange={setSheen}
            />

            <PillRow
              label="Texture Depth"
              options={TEXTURE_DEPTHS}
              value={texture}
              onChange={setTexture}
            />

            <div>
              <button
                type="button"
                onClick={() => setShowPromptPreview((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                {showPromptPreview ? 'Hide compiled craftsman prompt' : 'Inspect compiled craftsman prompt'}
              </button>
              {showPromptPreview && (
                <pre className="mt-2 p-2.5 rounded-lg bg-background border border-border text-[10px] text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {compiledPrompt}
                </pre>
              )}
            </div>

            <button
              type="button"
              disabled={!activeShot || isGenerating}
              onClick={() => handleGenerate(false)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-glow disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Rendering {finishSystem}…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Generate Finish Preview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
