import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  ImagePlus,
  Link2,
  Maximize2,
  Star,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { uploadUrl } from "../lib/api";
import type { Idea } from "../lib/types";
import { cn } from "../lib/utils";
import { useMutations } from "../hooks/data";
import { toast } from "../stores/toast";
import { Button, TextInput } from "./ui/primitives";
import { useEscape } from "./ui/overlay";

export function ImagePanel({ idea }: { idea: Idea }) {
  const { upload, deleteImage, setCover } = useMutations();
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      upload.mutate(
        { id: idea.id, files },
        {
          onSuccess: (res) => {
            if (res.errors.length) toast.error(res.errors[0]);
            else toast.success(`Added ${res.added.length} image${res.added.length > 1 ? "s" : ""}`);
          },
        },
      );
    },
    [idea.id, upload],
  );

  // Paste images from clipboard while the panel is mounted.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        doUpload(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [doUpload]);

  const addUrl = () => {
    if (!url.trim()) return;
    upload.mutate(
      { id: idea.id, files: [], url: url.trim() },
      {
        onSuccess: (res) => {
          if (res.errors.length) toast.error(res.errors[0]);
          else {
            toast.success("Image added from URL");
            setUrl("");
          }
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          doUpload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "ring-focus flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
          dragOver ? "border-primary bg-primary/10" : "border-line/25 hover:border-primary/40 hover:bg-fg/[0.03]",
        )}
      >
        <ImagePlus className="text-muted" size={20} />
        <p className="text-sm font-medium">Drag & drop, paste, or click to upload</p>
        <p className="text-xs text-muted">jpg · png · webp — you can also paste an image or URL</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            doUpload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            placeholder="Paste an image URL…"
            className="pl-9"
          />
        </div>
        <Button variant="glass" onClick={addUrl} disabled={!url.trim()}>
          Add
        </Button>
      </div>

      {/* gallery */}
      {idea.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {idea.images.map((f, i) => (
            <motion.div
              layout
              key={f}
              className="group relative aspect-square overflow-hidden rounded-xl border border-line/10"
            >
              <img src={uploadUrl(f, true)} alt="" loading="lazy" className="h-full w-full object-cover" />
              {idea.cover === f && (
                <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-md bg-primary text-primary-fg">
                  <Star size={11} fill="currentColor" />
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <IconBtn label="View" onClick={() => setLightbox(i)}>
                  <Maximize2 size={14} />
                </IconBtn>
                <IconBtn label="Set cover" onClick={() => setCover.mutate({ id: idea.id, filename: f })}>
                  <Star size={14} />
                </IconBtn>
                <IconBtn label="Delete" danger onClick={() => deleteImage.mutate({ id: idea.id, filename: f })}>
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox
            images={idea.images}
            index={lightbox}
            onIndex={setLightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "ring-focus grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/30",
        danger && "hover:bg-rose-500/80",
      )}
    >
      {children}
    </button>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  useEscape(true, onClose);
  useEffect(() => setZoom(1), [index]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, images.length, onIndex]);

  const file = images[index];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-lg"
      onClick={onClose}
      onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)))}
    >
      <button className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <NavBtn side="left" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length); }} />
          <NavBtn side="right" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length); }} />
        </>
      )}
      <motion.img
        key={file}
        src={uploadUrl(file)}
        alt=""
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: zoom, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] max-w-[90vw] rounded-2xl object-contain shadow-float"
        style={{ cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
      />
      <a
        href={uploadUrl(file)}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 right-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
      >
        <Download size={15} /> Download
      </a>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
        {index + 1} / {images.length} · scroll to zoom
      </div>
    </motion.div>
  );
}

function NavBtn({ side, onClick }: { side: "left" | "right"; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20",
        side === "left" ? "left-5" : "right-5",
      )}
    >
      {side === "left" ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}
