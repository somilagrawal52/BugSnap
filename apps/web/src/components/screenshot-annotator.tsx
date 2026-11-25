'use client';
import { useEffect, useRef, useState } from 'react';
import { Highlighter, Square, Undo2, RotateCcw, Check, X } from 'lucide-react';
import { MAX_IMAGE_BYTES } from '@bugsnap/shared';

type Tool = 'highlight' | 'redact';

export function ScreenshotAnnotator({
  src,
  onSave,
  onCancel,
}: {
  src: string;
  onSave: (file: File) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>('highlight');
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const paintBase = () => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const maxW = 1440;
    const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setCanUndo(false);
  };

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      baseImageRef.current = img;
      paintBase();
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [...historyRef.current.slice(-19), snapshot];
    setCanUndo(true);
    drawingRef.current = true;
    const pt = toCanvasPoint(e);
    lastPointRef.current = pt;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const scaleFactor = Math.max(1, canvas.width / 420);
    ctx.strokeStyle = tool === 'redact' ? '#18181b' : '#e11d48';
    ctx.lineWidth = (tool === 'redact' ? 18 : 4) * scaleFactor;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
  };

  const moveStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const prev = lastPointRef.current;
    if (!canvas || !ctx || !prev) return;
    const pt = toCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 0);
  };

  const apply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError('');
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not save edited screenshot.');
          setSaving(false);
          return;
        }
        if (blob.size > MAX_IMAGE_BYTES) {
          canvas.toBlob(
            (webpBlob) => {
              if (!webpBlob || webpBlob.size > MAX_IMAGE_BYTES) {
                setError('Edited image exceeds 5 MB limit.');
                setSaving(false);
                return;
              }
              onSave(new File([webpBlob], 'screenshot.webp', { type: 'image/webp' }));
              setSaving(false);
            },
            'image/webp',
            0.88,
          );
          return;
        }
        onSave(new File([blob], 'screenshot.png', { type: 'image/png' }));
        setSaving(false);
      },
      'image/png',
    );
  };

  return (
    <div className="annotator-box">
      <div className="annotator-toolbar">
        <button
          type="button"
          className={`annotator-tool ${tool === 'highlight' ? 'active' : ''}`}
          onClick={() => setTool('highlight')}
          title="Highlight bug"
        >
          <Highlighter size={14} />
          Mark
        </button>
        <button
          type="button"
          className={`annotator-tool ${tool === 'redact' ? 'active' : ''}`}
          onClick={() => setTool('redact')}
          title="Redact sensitive text"
        >
          <Square size={14} />
          Redact
        </button>
        <button
          type="button"
          className="annotator-tool"
          onClick={undo}
          disabled={!canUndo}
          title="Undo stroke"
        >
          <Undo2 size={14} />
          Undo
        </button>
        <button
          type="button"
          className="annotator-tool"
          onClick={paintBase}
          disabled={!canUndo}
          title="Reset edits"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="annotator-canvas"
        aria-label="Screenshot annotation canvas"
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
      {error && <p className="field-error">{error}</p>}
      <div className="annotator-actions">
        <button type="button" className="button button-outline button-sm" onClick={onCancel}>
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          className="button button-primary button-sm"
          disabled={saving}
          onClick={apply}
        >
          <Check size={14} />
          {saving ? 'Applying…' : 'Apply edits'}
        </button>
      </div>
    </div>
  );
}
